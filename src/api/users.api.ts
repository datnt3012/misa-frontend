import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

// Convert backend permission codes to frontend format
const convertBackendPermissionToFrontend = (backendCode: string): string => {
  // Use the actual permission code from backend API
  // Convert from format like "SETTINGS_READ" to "settings.view"
  return backendCode.toLowerCase().replace(/_/g, '.');
};

// Convert frontend permission format to backend format
const convertFrontendPermissionToBackend = (frontendCode: string): string => {
  // Convert from format like "settings.view" to "SETTINGS_READ"
  // This should match the actual permission codes from backend API
  return frontendCode.toUpperCase().replace(/\./g, '_');
};

export interface User {
  id: string;
  email?: string;
  username: string;
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
    name: string; // Original English
    description?: string; // Original English
    nameTranslated: string; // Translated Vietnamese
    descriptionTranslated: string; // Translated Vietnamese
    permissions?: string[];
  };
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateUserRequest {
  email?: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  roleId: string;
}

export interface UpdateUserRequest {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  roleId?: string;
  isActive?: boolean;
  password?: string;
}

export interface UserRole {
  id: string;
  name: string; // Original English
  code?: string;
  description?: string; // Original English
  nameTranslated: string; // Translated Vietnamese
  descriptionTranslated: string; // Translated Vietnamese
  permissions?: string[];
}

export interface Permission {
  id: string;
  name: string; // Translated Vietnamese
  code: string;
  description: string; // Original English
  resource: string; // Original English
  action: string;
  nameEn: string; // Original English
  translatedName: string; // Translated Vietnamese
  resourceLabelTranslated: string; // Translated Vietnamese
  descriptionTranslated: string; // Translated Vietnamese
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface EmailPreferences {
  receive_order_notifications: boolean;
  receive_status_updates: boolean;
  receive_payment_updates: boolean;
}

export const usersApi = {
  // Get all users
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    keyword?: string; // Backend uses 'keyword' instead of 'search'
    roleId?: string;
    includeDeleted?: boolean; // Include soft deleted users
    isDeleted?: boolean; // Filter by deleted status
    isActive?: boolean; // Filter by active status
  }): Promise<{ users: User[]; total: number; page: number; limit: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    // Use keyword if provided, otherwise fallback to search
    if (params?.keyword) queryParams.append('keyword', params.keyword);
    else if (params?.search) queryParams.append('keyword', params.search);
    if (params?.roleId) queryParams.append('roleId', params.roleId);
    if (params?.includeDeleted !== undefined) queryParams.append('includeDeleted', params.includeDeleted.toString());
    if (params?.isDeleted !== undefined) queryParams.append('isDeleted', params.isDeleted.toString());
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

    const url = queryParams.toString() 
      ? `${API_ENDPOINTS.USERS.LIST}?${queryParams.toString()}`
      : API_ENDPOINTS.USERS.LIST;

    const response = await api.get<any>(url);
    const data = response?.data || response;
    

    const normalize = (row: any): User => ({
      id: row.id,
      email: row.email ?? undefined,
      username: row.username ?? row.user_name ?? '',
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
        nameTranslated: row.role.nameTranslated,
        descriptionTranslated: row.role.descriptionTranslated,
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

  // Get user by ID
  getUserById: async (userId: string): Promise<User> => {
    const response = await api.get<any>(`${API_ENDPOINTS.USERS.LIST}/${userId}`);
    const data = response?.data || response;
    
    const normalize = (row: any): User => ({
      id: row.id,
      email: row.email ?? undefined,
      username: row.username ?? row.user_name ?? '',
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
        nameTranslated: row.role.nameTranslated,
        descriptionTranslated: row.role.descriptionTranslated,
        permissions: row.role.permissions || [], // Include permissions if available
      } : undefined,
      createdAt: row.createdAt ?? row.created_at ?? '',
      updatedAt: row.updatedAt ?? row.updated_at ?? '',
      deletedAt: row.deletedAt ?? row.deleted_at,
    });

    return normalize(data);
  },

  getUserByEmail: async (email: string): Promise<User> => {
    const response = await api.get<any>(`${API_ENDPOINTS.USERS.LIST}/email/${email}`);
    const data = response?.data || response;

    const normalize = (row: any): User => ({
      id: row.id,
      email: row.email ?? undefined,
      username: row.username ?? row.user_name ?? '',
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
        nameTranslated: row.role.nameTranslated,
        descriptionTranslated: row.role.descriptionTranslated,
      } : undefined,
      createdAt: row.createdAt ?? row.created_at ?? '',
      updatedAt: row.updatedAt ?? row.updated_at ?? '',
      deletedAt: row.deletedAt ?? row.deleted_at,
    });

    return normalize(data);
  },

  // Get user roles
  getUserRoles: async (): Promise<UserRole[]> => {
    // Use noPaging=true to get all roles
    const response = await api.get<any>(`${API_ENDPOINTS.ROLES.LIST}?noPaging=true`);
    const data = response?.data || response;
    
    const normalize = (row: any): UserRole => {
      
      // Convert backend permissions format to frontend format
      let permissions: string[] = [];
      if (row.permissions && Array.isArray(row.permissions)) {
        permissions = row.permissions.map((perm: any) => {
          // Use the actual permission code from backend
          if (typeof perm === 'string') {
            return perm;
          } else if (perm.code) {
            return perm.code;
          }
          return perm;
        }).filter(Boolean);
      }
      
      
      return {
        id: row.id,
        name: row.name,
        code: row.code,
        description: row.description,
        nameTranslated: row.nameTranslated,
        descriptionTranslated: row.descriptionTranslated,
        permissions: permissions,
      };
    };

    if (data && Array.isArray(data.rows)) {
      return data.rows.map(normalize);
    }

    if (Array.isArray(data)) {
      return data.map(normalize);
    }

    return [];
  },

  // Create user
  createUser: async (userData: CreateUserRequest): Promise<User> => {
    const response = await api.post<any>(API_ENDPOINTS.USERS.CREATE, userData);
    const data = response?.data || response;

    return {
      id: data.id,
      email: data.email ?? undefined,
      username: data.username ?? data.user_name ?? '',
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
        nameTranslated: data.role.nameTranslated,
        descriptionTranslated: data.role.descriptionTranslated,
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
      email: data.email ?? undefined,
      username: data.username ?? data.user_name ?? '',
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
        nameTranslated: data.role.nameTranslated,
        descriptionTranslated: data.role.descriptionTranslated,
      } : undefined,
      createdAt: data.createdAt ?? data.created_at ?? '',
      updatedAt: data.updatedAt ?? data.updated_at ?? '',
      deletedAt: data.deletedAt ?? data.deleted_at,
    };
  },

  // Delete user
  deleteUser: async (id: string, hard: boolean = false): Promise<{ message: string }> => {
    const url = hard 
      ? `${API_ENDPOINTS.USERS.DELETE(id)}?hard=true`
      : API_ENDPOINTS.USERS.DELETE(id);
    return api.delete<{ message: string }>(url);
  },

  // Restore user
  restoreUser: async (id: string): Promise<User> => {
    const response = await api.post<any>(`${API_ENDPOINTS.USERS.LIST}/${id}/restore`);
    const data = response?.data || response;
    return {
      id: data.id,
      email: data.email ?? undefined,
      username: data.username ?? data.user_name ?? '',
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
        nameTranslated: data.role.nameTranslated,
        descriptionTranslated: data.role.descriptionTranslated,
      } : undefined,
      createdAt: data.createdAt ?? data.created_at ?? '',
      updatedAt: data.updatedAt ?? data.updated_at ?? '',
      deletedAt: data.deletedAt ?? data.deleted_at,
    };
  },

  // Role management
  createRole: async (roleData: { name: string; description?: string; permissions: string[] }): Promise<UserRole> => {
    // Convert frontend permissions to backend format
    const permissionCodes = roleData.permissions.map(convertFrontendPermissionToBackend);
    
    // Generate a code from name (simple approach)
    const code = roleData.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    
    const response = await api.post<any>(API_ENDPOINTS.ROLES.LIST, {
      name: roleData.name,
      code: code,
      description: roleData.description || ''
    });
    const data = response?.data || response;

    return {
      id: data.id,
      name: data.name,
      code: data.code,
      description: data.description,
      nameTranslated: data.nameTranslated,
      descriptionTranslated: data.descriptionTranslated,
      permissions: roleData.permissions, // Return frontend format
    };
  },

  updateRole: async (id: string, roleData: { name?: string; description?: string; permissions?: string[] }): Promise<UserRole> => {
    const backendData: any = {};
    if (typeof roleData.name === 'string' && roleData.name.trim().length > 0) {
      backendData.name = roleData.name;
    }
    if (typeof roleData.description === 'string') {
      backendData.description = roleData.description;
    }
    // Note: Permissions are managed separately, not in role update
    
    const response = await api.patch<any>(`${API_ENDPOINTS.ROLES.LIST}/${id}`, backendData);
    const data = response?.data || response;

    return {
      id: data.id,
      name: data.name,
      code: data.code,
      description: data.description,
      nameTranslated: data.nameTranslated,
      descriptionTranslated: data.descriptionTranslated,
      permissions: roleData.permissions || [], // Return frontend format
    };
  },

  deleteRole: async (id: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`${API_ENDPOINTS.ROLES.LIST}/${id}`);
  },

  // Assign permissions to role
  assignPermissionsToRole: async (roleId: string, permissions: string[]): Promise<{ message: string }> => {
    const permissionCodes = permissions.map(convertFrontendPermissionToBackend);
    return api.post<{ message: string }>(`${API_ENDPOINTS.ROLES.LIST}/${roleId}/permissions`, {
      permissionCodes: permissionCodes
    });
  },

  // Get all available permissions
  getPermissions: async (): Promise<Permission[]> => {
    // Try with a large limit to get all permissions
    const response = await api.get<any>(`/permissions?limit=1000&noPaging=true`);
    const data = response?.data || response;
    
    // Handle different response structures
    if (Array.isArray(data)) {
      return data;
    } else if (data?.rows && Array.isArray(data.rows)) {
      return data.rows;
    } else if (data?.data && Array.isArray(data.data)) {
      return data.data;
    }
    
    return [];
  },

  // Get email preferences
  getEmailPreferences: async (): Promise<EmailPreferences> => {
    const response = await api.get<any>(`${API_ENDPOINTS.USERS.GET_PREFERENCES}?type=email`);
    const data = response?.data || response;
    
    // Backend returns: { success: true, message: "...", data: { email: { ... } } }
    if (data?.data?.email) {
      return {
        receive_order_notifications: !!data.data.email.receive_order_notifications,
        receive_status_updates: !!data.data.email.receive_status_updates,
        receive_payment_updates: !!data.data.email.receive_payment_updates,
      };
    }
    
    // Fallback: if response structure is different
    if (data?.email) {
      return {
        receive_order_notifications: !!data.email.receive_order_notifications,
        receive_status_updates: !!data.email.receive_status_updates,
        receive_payment_updates: !!data.email.receive_payment_updates,
      };
    }
    
    // Default values if no preferences found
    return {
      receive_order_notifications: false,
      receive_status_updates: false,
      receive_payment_updates: false,
    };
  },

  // Update email preferences
  updateEmailPreferences: async (emailPreferences: EmailPreferences): Promise<{ message: string }> => {
    return api.patch<{ message: string }>(API_ENDPOINTS.USERS.UPDATE_EMAIL_PREFERENCES, emailPreferences);
  },
};
