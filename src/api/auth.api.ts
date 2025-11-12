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
      const meResponse = await api.get<any>(API_ENDPOINTS.AUTH.ME);
      
      // Handle different response structures from /auth/me
      // api.get() already unwraps response.data, so we need to check for nested structure
      let currentUser: any;
      if (meResponse && typeof meResponse === 'object') {
        // Case 1: Response has nested data property
        if ('data' in meResponse) {
          currentUser = meResponse.data;
        }
        // Case 2: Response has code and data (structured response)
        else if ('code' in meResponse && 'data' in meResponse) {
          currentUser = meResponse.data;
        }
        // Case 3: Response is the user object directly (most common)
        else if ('id' in meResponse || 'email' in meResponse) {
          currentUser = meResponse;
        }
        // Case 4: Fallback
        else {
          currentUser = meResponse;
        }
      } else {
        currentUser = meResponse;
      }
      
      const userId = currentUser?.id || currentUser?.user_id || currentUser?.sub;
      
      if (!userId) {
        throw new Error('User ID not found in response');
      }
      
      // Update user via users API
      // The response from updateUser should include the updated username
      const updateResponse = await api.patch<any>(API_ENDPOINTS.USERS.UPDATE(userId), userData);
      
      // Handle different response structures from update API
      // api.patch() already unwraps response.data
      let updatedUser: any;
      if (updateResponse && typeof updateResponse === 'object') {
        // Case 1: Response has nested data property
        if ('data' in updateResponse) {
          updatedUser = updateResponse.data;
        }
        // Case 2: Response has code and data (structured response)
        else if ('code' in updateResponse && 'data' in updateResponse) {
          updatedUser = updateResponse.data;
        }
        // Case 3: Response is the user object directly (most common)
        else if ('id' in updateResponse || 'email' in updateResponse) {
          updatedUser = updateResponse;
        }
        // Case 4: Fallback
        else {
          updatedUser = updateResponse;
        }
      } else {
        updatedUser = updateResponse;
      }
      
      // Normalize the response to ensure username is included
      return {
        id: updatedUser.id || userId,
        email: updatedUser.email || currentUser.email || '',
        username: updatedUser.username || updatedUser.user_name || userData.username || currentUser.username || currentUser.user_name || undefined,
        firstName: updatedUser.firstName || updatedUser.first_name || userData.firstName || currentUser.firstName || currentUser.first_name || undefined,
        lastName: updatedUser.lastName || updatedUser.last_name || userData.lastName || currentUser.lastName || currentUser.last_name || undefined,
        phoneNumber: updatedUser.phoneNumber || updatedUser.phone_number || userData.phoneNumber || currentUser.phoneNumber || currentUser.phone_number || undefined,
        address: updatedUser.address || userData.address || currentUser.address || undefined,
        roleId: updatedUser.roleId || updatedUser.role_id || currentUser.roleId || currentUser.role_id || '',
        isActive: Boolean(updatedUser.isActive ?? updatedUser.is_active ?? currentUser.isActive ?? currentUser.is_active ?? true),
        createdAt: updatedUser.createdAt || updatedUser.created_at || currentUser.createdAt || currentUser.created_at || '',
        updatedAt: updatedUser.updatedAt || updatedUser.updated_at || currentUser.updatedAt || currentUser.updated_at || '',
      } as User;
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
