// Authentication types
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type UserRole = 
  | 'owner_director'
  | 'admin'
  | 'chief_accountant'
  | 'accountant'
  | 'inventory'
  | 'sales'
  | 'shipper';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  expires_in: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  full_name?: string;
  role?: UserRole;
}

export interface ResetUserPasswordRequest {
  user_id: string;
  new_password: string;
}
