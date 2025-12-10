import React, { useState, useEffect, createContext, useContext } from 'react';
import { authApi } from '@/api/auth.api';

// Custom types instead of Supabase types
interface User {
  id: string;
  email: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
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
  refreshUser: () => Promise<void>;
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

      const response = await authApi.login({ username: emailOrUsername, password });

      // Handle both API response format and direct response
      // api.post() already unwraps response.data, so response should be the data directly
      const result = (response as any).data || response;
      

      // Check if HTTP request was successful (status 200-299)
      // Note: api.post() already unwraps, so we don't have direct access to status
      // We check the result structure instead
      if ((response as any).status && (response as any).status < 200 || (response as any).status >= 300) {
        // Try to get error message from response data first
        let errorMessage = result?.message || result?.error || (response as any).error || `HTTP Error: ${(response as any).status}`;
        console.error('HTTP request failed:', errorMessage);
        return { error: { message: errorMessage } };
      }

      // Check if request manager marked it as successful
      // Only check if success property exists and is explicitly false
      if ((response as any).hasOwnProperty && (response as any).hasOwnProperty('success') && (response as any).success === false) {
        const errorMessage = result?.error || (response as any).error || 'Request failed';
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
        // Handle different user data structures
        let userData = result.user;
        if (result.user.data) {
          userData = result.user.data;
        }

        // Normalize user data to ensure consistent structure
        const normalizedUser: User = {
          id: userData.id || userData.user_id || '',
          email: userData.email || '',
          username: userData.username || userData.user_name || undefined,
          firstName: userData.firstName || userData.first_name || undefined,
          lastName: userData.lastName || userData.last_name || undefined,
          phoneNumber: userData.phoneNumber || userData.phone_number || undefined,
          address: userData.address || undefined,
          roleId: userData.roleId || userData.role_id || '',
          isActive: Boolean(userData.isActive ?? userData.is_active ?? true),
          createdAt: userData.createdAt || userData.created_at || '',
          updatedAt: userData.updatedAt || userData.updated_at || '',
        };

        // Create session from API response
        const sessionData = {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          expires_in: 3600, // Default 1 hour
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: normalizedUser
        };

        // Update user state directly from API response
        setUser(normalizedUser);
        setSession(sessionData);
        // Set role name from role object if available, otherwise use roleId
        const roleName = (userData as any).role?.name || userData.roleId;
        setUserRole(roleName);

        // Store tokens directly in localStorage for axios interceptor
        localStorage.setItem('access_token', result.access_token);
        localStorage.setItem('refresh_token', result.refresh_token);

        // Store session in localStorage for persistence
        localStorage.setItem('user-session', JSON.stringify({
          user: normalizedUser,
          session: sessionData,
          userRole: roleName // Store role name instead of roleId
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
        if (Array.isArray(error.response.data.message)) {
          errorMessage = error.response.data.message.join('\n');
        } else {
          errorMessage = error.response.data.message;
        }
      } else if (error.response?.data?.error) {
        // Backend returned error field
        if (Array.isArray(error.response.data.error)) {
          errorMessage = error.response.data.error.join('\n');
        } else {
          errorMessage = error.response.data.error;
        }
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
    try {
      const response = await authApi.forgotPassword({ email });
      return { error: null, ...response };
    } catch (error: any) {
      let errorMessage = 'Có lỗi xảy ra khi gửi email khôi phục';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      return { error: { message: errorMessage } };
    }
  };

  const refreshUser = async () => {
    try {
      // api.get() returns response.data directly, but backend might wrap it differently
      const response = await authApi.getMe();
      
      // Handle different response structures from backend
      // Backend might return: { data: {...} }, { code: 200, data: {...} }, or direct user object
      let userData: any;
      
      // Case 1: Response has nested data property
      if (response && typeof response === 'object' && 'data' in response) {
        userData = (response as any).data;
      }
      // Case 2: Response has code and data (structured response)
      else if (response && typeof response === 'object' && 'code' in response && 'data' in response) {
        userData = (response as any).data;
      }
      // Case 3: Response is the user object directly (most common after api.get unwraps)
      else if (response && typeof response === 'object' && ('id' in response || 'email' in response)) {
        userData = response;
      }
      // Case 4: Fallback - use response as-is
      else {
        userData = response;
      }
      
      // If userData is still not an object, log warning
      if (!userData || typeof userData !== 'object') {
        console.warn('Unexpected response format from /auth/me:', response);
        return;
      }
      
      // Normalize user data to ensure consistent structure
      // Try multiple possible field names for username
      const normalizedUser: User = {
        id: userData.id || userData.user_id || userData.sub || '',
        email: userData.email || '',
        // Try multiple possible field names for username
        username: userData.username || userData.user_name || userData.userName || userData.user?.username || undefined,
        firstName: userData.firstName || userData.first_name || userData.firstName || undefined,
        lastName: userData.lastName || userData.last_name || userData.lastName || undefined,
        phoneNumber: userData.phoneNumber || userData.phone_number || userData.phone || undefined,
        address: userData.address || undefined,
        roleId: userData.roleId || userData.role_id || userData.role?.id || '',
        isActive: Boolean(userData.isActive ?? userData.is_active ?? true),
        createdAt: userData.createdAt || userData.created_at || '',
        updatedAt: userData.updatedAt || userData.updated_at || '',
      };
      
      // Debug log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 refreshUser - Response from API:', response);
        console.log('🔄 refreshUser - Extracted userData:', userData);
        console.log('🔄 refreshUser - Username in userData:', userData?.username || userData?.user_name);
        console.log('✅ refreshUser - Normalized user:', normalizedUser);
        console.log('✅ refreshUser - Username in normalized:', normalizedUser.username);
      }
      
      // Update user state
      setUser(normalizedUser);
      
      // Get role name from role object if available
      const roleName = userData?.role?.name || userData?.roleId || userData?.role_id || normalizedUser.roleId;
      setUserRole(roleName);
      
      // Update session if exists
      if (session) {
        const updatedSession = { ...session, user: normalizedUser };
        setSession(updatedSession);
        
        // Update localStorage with normalized user data
        localStorage.setItem('user-session', JSON.stringify({
          user: normalizedUser,
          session: updatedSession,
          userRole: roleName
        }));
      } else {
        // Even if no session exists, update localStorage to persist user data
        const sessionData = {
          access_token: localStorage.getItem('access_token') || '',
          refresh_token: localStorage.getItem('refresh_token') || '',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: normalizedUser
        };
        localStorage.setItem('user-session', JSON.stringify({
          user: normalizedUser,
          session: sessionData,
          userRole: roleName
        }));
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
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
    refreshUser,
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
