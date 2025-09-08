import React, { useState, useEffect, createContext, useContext } from 'react';
import { login, logout } from '@/@core/services/auth.api';

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
          console.log('User session restored from localStorage');
          return;
        } else {
          // Session expired, remove it
          localStorage.removeItem('user-session');
          console.log('Session expired, removed from localStorage');
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
        console.log('Admin session restored from localStorage');
        return;
      } catch (error) {
        console.error('Error parsing admin session:', error);
        localStorage.removeItem('admin-session');
      }
    }

    // No valid session found
    setLoading(false);
    console.log('No valid session found');

    return () => {
      mounted = false;
    };
  }, []);

  // User role is now included in the user object from API
  // No need for separate fetchUserRole function

  const signIn = async (emailOrUsername: string, password: string) => {
    try {
      // First clear any existing invalid sessions
      await logout();

      // check username + password, if username = admin và password = 123456 thì thông báo thành công vào truy cập được vào trang admin
      if (emailOrUsername === 'admin' && password === '123456') {
        // Tạo mock user cho admin
        const mockUser: User = {
          id: 'admin-user-id',
          email: 'admin@system.local',
          firstName: 'Admin',
          lastName: 'User',
          roleId: 'admin-role-id',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Tạo mock session
        const mockSession: Session = {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: mockUser
        };

        // Set user và session
        setUser(mockUser);
        setSession(mockSession);
        setUserRole('admin');

        // Lưu vào localStorage để duy trì session
        localStorage.setItem('admin-session', JSON.stringify({
          user: mockUser,
          session: mockSession,
          userRole: mockUser.roleId
        }));

        console.log('Admin login successful');
        return { error: null };
      }

      const response = await login(emailOrUsername, password);

      const result = response.data;

      // Check if HTTP request was successful (status 200-299)
      if (response.status < 200 || response.status >= 300) {
        const errorMessage = result?.error || response.error || `HTTP Error: ${response.status}`;
        console.error('HTTP request failed:', errorMessage);
        return { error: { message: errorMessage } };
      }

      // Check if request manager marked it as successful
      if (response.success === false) {
        const errorMessage = result?.error || response.error || 'Request failed';
        console.error('Request manager marked as failed:', errorMessage);
        return { error: { message: errorMessage } };
      }

      // Check if server response indicates failure
      // API returns { statusCode, message, data } format
      if (result && result.statusCode && result.statusCode !== 200) {
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

      // Handle API response format: { statusCode, message, data: { access_token, refresh_token, user } }
      if (result && result.data && result.data.user) {
        console.log('API response has user data. Creating session from API response.');

        // Create session from API response
        const sessionData = {
          access_token: result.data.access_token,
          refresh_token: result.data.refresh_token,
          expires_in: 3600, // Default 1 hour
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: result.data.user
        };

        // Update user state directly from API response
        setUser(result.data.user);
        setSession(sessionData);

        // Store session in localStorage for persistence
        localStorage.setItem('user-session', JSON.stringify({
          user: result.data.user,
          session: sessionData,
          userRole: result.data.user.roleId // Use roleId as userRole
        }));

        console.log('User state updated and stored in localStorage');

      } else {
        return { error: { message: 'Unexpected response format from server' } };
      }

      return { error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { error: { message: error.message || 'Đăng nhập thất bại' } };
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
    // Clear all session data
    localStorage.removeItem('user-session');
    localStorage.removeItem('admin-session');
    setUser(null);
    setSession(null);
    setUserRole(null);

    // Call logout API if needed
    try {
      await logout();
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with local logout even if API fails
    }
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
