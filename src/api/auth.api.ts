import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  ForgotPasswordRequest, 
  ResetPasswordRequest,
  User,
  CreateUserRequest,
  UpdateUserRequest,
  ResetUserPasswordRequest
} from '@/types/auth';

// Authentication API
export const authApi = {
  // Login
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    return api.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials);
  },

  // Register
  register: async (userData: RegisterRequest): Promise<LoginResponse> => {
    return api.post<LoginResponse>(API_ENDPOINTS.AUTH.REGISTER, userData);
  },

  // Logout
  logout: async (): Promise<void> => {
    // Only call logout API if we have a token
    const token = localStorage.getItem('access_token');
    if (token) {
      return api.post<void>(API_ENDPOINTS.AUTH.LOGOUT);
    } else {
      return Promise.resolve();
    }
  },

  // Refresh token
  refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
    return api.post<LoginResponse>(API_ENDPOINTS.AUTH.REFRESH, { refresh_token: refreshToken });
  },

  // Get user profile
  getProfile: async (): Promise<User> => {
    // Use /auth/me instead of /auth/profile since /auth/profile doesn't exist
    return api.get<User>(API_ENDPOINTS.AUTH.ME);
  },

  // Get current user info (preferred method)
  getMe: async (): Promise<User> => {
    return api.get<User>(API_ENDPOINTS.AUTH.ME);
  },

  // Update current user profile
  updateProfile: async (userData: Partial<UpdateUserRequest>): Promise<User> => {
    // Get current user info first, then update via users API
    try {
      const response = await api.get<any>(API_ENDPOINTS.AUTH.ME);
      
      // Handle different response structures
      let currentUser;
      if (response.data) {
        currentUser = response.data;
      } else if (response.id) {
        currentUser = response;
      } else {
        currentUser = response;
      }
      
      const userId = currentUser.id || currentUser.user_id || currentUser.sub;
      
      if (!userId) {
        throw new Error('User ID not found in response');
      }
      
      return api.patch<User>(API_ENDPOINTS.USERS.UPDATE(userId), userData);
    } catch (error: any) {
      throw new Error('Unable to update profile: ' + (error.message || 'Unknown error'));
    }
  },

  // Forgot password
  forgotPassword: async (data: ForgotPasswordRequest): Promise<{ message: string }> => {
    return api.post<{ message: string }>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, data);
  },

  // Reset password
  resetPassword: async (data: ResetPasswordRequest): Promise<{ message: string }> => {
    return api.post<{ message: string }>(API_ENDPOINTS.AUTH.RESET_PASSWORD, data);
  },

  // User management (for admin/owner)
  createUser: async (userData: CreateUserRequest): Promise<User> => {
    return api.post<User>(API_ENDPOINTS.USERS.CREATE, userData);
  },

  getUsers: async (): Promise<User[]> => {
    return api.get<User[]>(API_ENDPOINTS.USERS.LIST);
  },

  updateUser: async (userId: string, userData: UpdateUserRequest): Promise<User> => {
    return api.put<User>(API_ENDPOINTS.USERS.UPDATE(userId), userData);
  },

  deleteUser: async (userId: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(API_ENDPOINTS.USERS.DELETE(userId));
  },

  resetUserPassword: async (data: ResetUserPasswordRequest): Promise<{ message: string }> => {
    return api.post<{ message: string }>('/users/reset-password', data);
  },

  getUserRoles: async (): Promise<{ role: string; description: string }[]> => {
    return api.get<{ role: string; description: string }[]>(API_ENDPOINTS.USERS.ROLES);
  }
};
