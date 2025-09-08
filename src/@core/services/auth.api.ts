import { http } from '@/@core/utils/requestUtils';

const AUTH_API_URL = `${import.meta.env.VITE_API_URL}/auth`;

// Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  statusCode: number;
  message: string;
  data: {
    access_token: string;
    refresh_token: string;
    user: {
      id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      roleId: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    };
  };
  // Legacy fields for backward compatibility
  success?: boolean;
  session?: any;
  user?: any;
  error?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

export function login(emailOrUsername: string, password: string) {
  // Validate input
  if (!emailOrUsername || !password) {
    return Promise.reject(new Error('Email/username and password are required'));
  }

  if (password.length < 6) {
    return Promise.reject(new Error('Password must be at least 6 characters'));
  }

  return http.post<LoginResponse>(`${AUTH_API_URL}/login`, { 
    email: emailOrUsername, 
    password 
  });
}

export function refreshToken(refreshToken: string) {
  // Validate input
  if (!refreshToken) {
    return Promise.reject(new Error('Refresh token is required'));
  }

  return http.post<RefreshTokenResponse>(`${AUTH_API_URL}/refresh`, { refreshToken });
}

export function logout() {
  return http.post(`${AUTH_API_URL}/logout`);
}
