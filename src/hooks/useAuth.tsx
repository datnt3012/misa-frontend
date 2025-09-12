import React, { useState, useEffect, createContext, useContext } from 'react';
import { authApi } from '@/api/auth.api';

// Custom types instead of Supabase types
interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  roleId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  userRole: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Kiểm tra session trong localStorage
    const storedSession = localStorage.getItem('user-session');

    if (storedSession) {
      try {
        const { user: storedUser, session: storedSessionData, userRole: storedRole } = JSON.parse(storedSession);

        // Check if session is still valid (not expired)
        if (storedSessionData && storedSessionData.expires_at > Math.floor(Date.now() / 1000)) {
          setUser(storedUser);
          setSession(storedSessionData);
          setUserRole(storedRole);
          setLoading(false);
          return;
        } else {
          // Session expired, remove it
          localStorage.removeItem('user-session');
        }
      } catch (error) {
        console.error('Error parsing stored session:', error);
        localStorage.removeItem('user-session');
      }
    }

    // Kiểm tra session admin trong localStorage (legacy)
    const adminSession = localStorage.getItem('admin-session');
    if (adminSession) {
      try {
        const { user: adminUser, session: adminSessionData, userRole: adminRole } = JSON.parse(adminSession);
        setUser(adminUser);
        setSession(adminSessionData);
        setUserRole(adminRole);
        setLoading(false);
        return;
      } catch (error) {
        console.error('Error parsing admin session:', error);
        localStorage.removeItem('admin-session');
      }
    }

    // No valid session found
    setLoading(false);

    return () => {
      mounted = false;
    };
  }, []);

  // User role is now included in the user object from API
  // No need for separate fetchUserRole function

  const signIn = async (emailOrUsername: string, password: string) => {
    try {
      // Clear any existing invalid sessions locally (don't call logout API)
      localStorage.removeItem('user-session');
      localStorage.removeItem('admin-session');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setSession(null);
      setUserRole(null);

      // Try real backend authentication first

      const response = await authApi.login({ email: emailOrUsername, password });

      // Handle both API response format and direct response
      const result = response.data || response;
      

      // Check if HTTP request was successful (status 200-299)
      if (response.status < 200 || response.status >= 300) {
        // Try to get error message from response data first
        let errorMessage = result?.message || result?.error || response.error || `HTTP Error: ${response.status}`;
        console.error('HTTP request failed:', errorMessage);
        return { error: { message: errorMessage } };
      }

      // Check if request manager marked it as successful
      // Only check if success property exists and is explicitly false
      if (response.hasOwnProperty('success') && response.success === false) {
        const errorMessage = result?.error || response.error || 'Request failed';
        console.error('Request manager marked as failed:', errorMessage);
        return { error: { message: errorMessage } };
      }

      // Check if server response indicates failure
      // Backend API returns { code, message, data } format
      // Accept both 200 and 201 as success codes
      if (result && result.code && result.code !== 200 && result.code !== 201) {
        const errorMessage = result.message || 'Server returned failure';
        console.error('Server returned failure:', errorMessage);
        return { error: { message: errorMessage } };
      }

      // Also check for legacy statusCode field
      // Accept both 200 and 201 as success codes
      if (result && result.statusCode && result.statusCode !== 200 && result.statusCode !== 201) {
        const errorMessage = result.message || 'Server returned failure';
        console.error('Server returned failure:', errorMessage);
        return { error: { message: errorMessage } };
      }

      // Also check for legacy success field
      if (result && result.success === false) {
        const errorMessage = result.error || 'Server returned failure';
        console.error('Server returned failure:', errorMessage);
        return { error: { message: errorMessage } };
      }

      // Handle API response format: { access_token, refresh_token, user } (directly in result)
      
      // Check if we have the required data directly in result
      if (result && result.access_token && result.user) {

        // Create session from API response
        const sessionData = {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          expires_in: 3600, // Default 1 hour
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: result.user
        };

        // Update user state directly from API response
        setUser(result.user);
        setSession(sessionData);

        // Store tokens directly in localStorage for axios interceptor
        localStorage.setItem('access_token', result.access_token);
        localStorage.setItem('refresh_token', result.refresh_token);

        // Store session in localStorage for persistence
        localStorage.setItem('user-session', JSON.stringify({
          user: result.user,
          session: sessionData,
          userRole: result.user.roleId // Use roleId as userRole
        }));


      } else {
        console.error('Unexpected response format:', result);
        console.error('Missing required fields:', {
          hasResult: !!result,
          hasAccessToken: !!result?.access_token,
          hasUser: !!result?.user
        });
        return { error: { message: 'Unexpected response format from server' } };
      }

      return { error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Try to extract error message from API response
      let errorMessage = 'Đăng nhập thất bại';
      
      if (error.response?.data?.message) {
        // Backend returned structured error response
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        // Backend returned error field
        errorMessage = error.response.data.error;
      } else if (error.message) {
        // Use generic error message
        errorMessage = error.message;
      }
      
      return { error: { message: errorMessage } };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    // TODO: Implement signup API call
    return { error: { message: 'SignUp not implemented yet' } };
  };

  const resetPassword = async (email: string) => {
    // TODO: Implement reset password API call
    return { error: { message: 'Reset password not implemented yet' } };
  };

  const signOut = async () => {
    
    // Call logout API first (but don't block on it)
    try {
      await authApi.logout();
    } catch (error) {
      console.warn('Logout API error (continuing with local logout):', error);
      // Continue with local logout even if API fails
    }

    // Clear all session data regardless of API result
    localStorage.removeItem('user-session');
    localStorage.removeItem('admin-session');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setSession(null);
    setUserRole(null);
    
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    userRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
