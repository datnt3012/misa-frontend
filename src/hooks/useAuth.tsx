import React, { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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

    // Kiểm tra session admin trong localStorage
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

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        console.log('Auth state change:', event, session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Fetch user role when user changes
        if (session?.user) {
          setTimeout(() => {
            if (mounted) {
              fetchUserRole(session.user.id);
            }
          }, 0);
        } else {
          setUserRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;

      if (error) {
        console.error('Error getting session:', error);
        // Clear any invalid session data
        localStorage.removeItem('supabase.auth.token');
        setSession(null);
        setUser(null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }

      setLoading(false);

      if (session?.user && mounted) {
        setTimeout(() => {
          if (mounted) {
            fetchUserRole(session.user.id);
          }
        }, 0);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user role:', error);
        return;
      }

      setUserRole(data?.role || null);
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const signIn = async (emailOrUsername: string, password: string) => {
    try {
      // First clear any existing invalid sessions
      await supabase.auth.signOut();

      // check username + password, if username = admin và password = 123456 thì thông báo thành công vào truy cập được vào trang admin
      if (emailOrUsername === 'admin' && password === '123456') {
        // Tạo mock user cho admin
        const mockUser: User = {
          id: 'admin-user-id',
          email: 'admin@system.local',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          aud: 'authenticated',
          role: 'authenticated',
          email_confirmed_at: new Date().toISOString(),
          phone: null,
          phone_confirmed_at: null,
          last_sign_in_at: new Date().toISOString(),
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: { full_name: 'Admin User', username: 'admin' },
          identities: [],
          factors: []
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
          userRole: 'admin'
        }));

        console.log('Admin login successful');
        return { error: null };
      }

      // Nếu không phải admin, thử đăng nhập bình thường
      const response = await fetch(`https://elogncohkxrriqmvapqo.supabase.co/functions/v1/login-with-username`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsb2duY29oa3hycmlxbXZhcHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjk3NjgsImV4cCI6MjA2OTk0NTc2OH0.h3o8GRyynnnQZJhCmlGdQPyfo_pyg5f-kvbOS6RkNh8',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsb2duY29oa3hycmlxbXZhcHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjk3NjgsImV4cCI6MjA2OTk0NTc2OH0.h3o8GRyynnnQZJhCmlGdQPyfo_pyg5f-kvbOS6RkNh8'
        },
        body: JSON.stringify({
          emailOrUsername,
          password,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        return { error: { message: result.error } };
      }

      // Set the session in Supabase client
      if (result.session) {
        const { error: sessionError } = await supabase.auth.setSession(result.session);
        if (sessionError) {
          console.error('Error setting session:', sessionError);
          return { error: { message: 'Failed to establish session' } };
        }
      }

      return { error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { error: { message: error.message || 'Đăng nhập thất bại' } };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName || email,
        },
      },
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    });
    return { error };
  };

  const signOut = async () => {
    // Xóa session admin nếu có
    localStorage.removeItem('admin-session');
    setUser(null);
    setSession(null);
    setUserRole(null);

    // Đăng xuất Supabase
    await supabase.auth.signOut();
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
