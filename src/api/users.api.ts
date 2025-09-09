import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  avatarUrl?: string;
  isActive: boolean;
  isDeleted: boolean;
  roleId: string;
  role?: {
    id: string;
    name: string;
    description?: string;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  roleId: string;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface UserRole {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
}

export const usersApi = {
  // Get all users
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    roleId?: string;
  }): Promise<{ users: User[]; total: number; page: number; limit: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.roleId) queryParams.append('roleId', params.roleId);

    const url = queryParams.toString() 
      ? `${API_ENDPOINTS.USERS.LIST}?${queryParams.toString()}`
      : API_ENDPOINTS.USERS.LIST;

    const response = await api.get<any>(url);
    const data = response?.data || response;
    
    console.log('Raw users API response:', response);
    console.log('Processed data:', data);

    const normalize = (row: any): User => ({
      id: row.id,
      email: row.email ?? '',
      firstName: row.firstName ?? row.first_name,
      lastName: row.lastName ?? row.last_name,
      phoneNumber: row.phoneNumber ?? row.phone_number,
      address: row.address,
      avatarUrl: row.avatarUrl ?? row.avatar_url,
      isActive: Boolean(row.isActive ?? row.is_active),
      isDeleted: Boolean(row.isDeleted ?? row.is_deleted),
      roleId: row.roleId ?? row.role_id ?? '',
      role: row.role ? {
        id: row.role.id,
        name: row.role.name,
        description: row.role.description,
      } : undefined,
      createdAt: row.createdAt ?? row.created_at ?? '',
      updatedAt: row.updatedAt ?? row.updated_at ?? '',
      deletedAt: row.deletedAt ?? row.deleted_at,
    });

    if (data && Array.isArray(data.rows)) {
      return {
        users: data.rows.map(normalize),
        total: Number(data.count ?? data.rows.length ?? 0),
        page: Number(data.page ?? params?.page ?? 1),
        limit: Number(data.limit ?? params?.limit ?? data.rows.length ?? 0),
      };
    }

    const users = (response?.users || []).map(normalize);
    return {
      users,
      total: Number(response?.total ?? users.length ?? 0),
      page: Number(response?.page ?? params?.page ?? 1),
      limit: Number(response?.limit ?? params?.limit ?? users.length ?? 0),
    };
  },

  // Get user roles
  getUserRoles: async (): Promise<UserRole[]> => {
    const response = await api.get<any>(API_ENDPOINTS.ROLES.LIST);
    const data = response?.data || response;
    
    console.log('Raw roles API response:', response);
    console.log('Processed roles data:', data);

    const normalize = (row: any): UserRole => ({
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: row.permissions || [],
    });

    if (data && Array.isArray(data.rows)) {
      return data.rows.map(normalize);
    }

    return (data || []).map(normalize);
  },

  // Create user
  createUser: async (userData: CreateUserRequest): Promise<User> => {
    const response = await api.post<any>(API_ENDPOINTS.USERS.CREATE, userData);
    const data = response?.data || response;

    return {
      id: data.id,
      email: data.email ?? '',
      firstName: data.firstName ?? data.first_name,
      lastName: data.lastName ?? data.last_name,
      phoneNumber: data.phoneNumber ?? data.phone_number,
      address: data.address,
      avatarUrl: data.avatarUrl ?? data.avatar_url,
      isActive: Boolean(data.isActive ?? data.is_active),
      isDeleted: Boolean(data.isDeleted ?? data.is_deleted),
      roleId: data.roleId ?? data.role_id ?? '',
      role: data.role ? {
        id: data.role.id,
        name: data.role.name,
        description: data.role.description,
      } : undefined,
      createdAt: data.createdAt ?? data.created_at ?? '',
      updatedAt: data.updatedAt ?? data.updated_at ?? '',
      deletedAt: data.deletedAt ?? data.deleted_at,
    };
  },

  // Update user
  updateUser: async (id: string, userData: UpdateUserRequest): Promise<User> => {
    const response = await api.patch<any>(API_ENDPOINTS.USERS.UPDATE(id), userData);
    const data = response?.data || response;

    return {
      id: data.id,
      email: data.email ?? '',
      firstName: data.firstName ?? data.first_name,
      lastName: data.lastName ?? data.last_name,
      phoneNumber: data.phoneNumber ?? data.phone_number,
      address: data.address,
      avatarUrl: data.avatarUrl ?? data.avatar_url,
      isActive: Boolean(data.isActive ?? data.is_active),
      isDeleted: Boolean(data.isDeleted ?? data.is_deleted),
      roleId: data.roleId ?? data.role_id ?? '',
      role: data.role ? {
        id: data.role.id,
        name: data.role.name,
        description: data.role.description,
      } : undefined,
      createdAt: data.createdAt ?? data.created_at ?? '',
      updatedAt: data.updatedAt ?? data.updated_at ?? '',
      deletedAt: data.deletedAt ?? data.deleted_at,
    };
  },

  // Delete user
  deleteUser: async (id: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(API_ENDPOINTS.USERS.DELETE(id));
  },
};
