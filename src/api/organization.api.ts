import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

export interface Organization {
  id?: string;
  code: string;
  name: string;
  level: string;
  parentCode?: string;
  type?: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface CreateOrganizationRequest {
  name: string;
  code: string;
  level: string;
  parentCode?: string;
  type?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  code?: string;
  level?: string;
  parentCode?: string;
  type?: string;
}

export const organizationApi = {
  // Get all organizations
  getOrganizations: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    keyword?: string;
    noPaging?: boolean;
    level?: string;
    parentCode?: string;
    includeDeleted?: boolean;
    isDeleted?: boolean;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ organizations: Organization[]; total: number; page: number; limit: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.keyword) queryParams.append('keyword', params.keyword);
    if (params?.noPaging) queryParams.append('noPaging', params.noPaging.toString());
    if (params?.level) queryParams.append('level', params.level);
    if (params?.parentCode) queryParams.append('parentCode', params.parentCode);
    if (params?.includeDeleted !== undefined) queryParams.append('includeDeleted', params.includeDeleted.toString());
    if (params?.isDeleted !== undefined) queryParams.append('isDeleted', params.isDeleted.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = queryParams.toString() 
      ? `${API_ENDPOINTS.ORGANIZATIONS?.LIST || '/organizations'}?${queryParams.toString()}`
      : (API_ENDPOINTS.ORGANIZATIONS?.LIST || '/organizations');

    const response = await api.get<any>(url);
    const data = response?.data || response;

    const normalize = (row: any): Organization => {
      const levelValue = row.level ?? row.level_id ?? row.levelNo ?? row.Level;
      const parentCodeValue = row.parentCode ?? row.parent_code ?? row.parent ?? row.parentId ?? row.parent_id ?? null;
      return {
        id: row.id,
        code: row.code ?? row.orgCode ?? row.organizationCode ?? row.code_id,
        name: row.name ?? row.orgName ?? row.organizationName,
        level: String(levelValue ?? ''),
        parentCode: parentCodeValue ?? undefined,
        type: row.type ?? row.orgType ?? undefined,
        isDeleted: row.isDeleted ?? row.is_deleted ?? false,
        createdAt: row.createdAt ?? row.created_at,
        updatedAt: row.updatedAt ?? row.updated_at,
        deletedAt: row.deletedAt ?? row.deleted_at,
      };
    };

    if (data && Array.isArray(data.rows)) {
      return {
        organizations: data.rows.map(normalize),
        total: Number(data.count ?? data.rows.length ?? 0),
        page: Number(data.page ?? params?.page ?? 1),
        limit: Number(data.limit ?? params?.limit ?? data.rows.length ?? 0),
      };
    }

    return {
      organizations: (response?.organizations || []).map(normalize),
      total: Number(response?.total ?? 0),
      page: Number(response?.page ?? params?.page ?? 1),
      limit: Number(response?.limit ?? params?.limit ?? 0),
    };
  },

  // Get organization by ID
  getOrganization: async (id: string): Promise<Organization> => {
    return api.get<Organization>(`${API_ENDPOINTS.ORGANIZATIONS?.LIST || '/organizations'}/${id}`);
  },

  // Create organization
  createOrganization: async (data: CreateOrganizationRequest): Promise<Organization> => {
    return api.post<Organization>(API_ENDPOINTS.ORGANIZATIONS?.CREATE || '/organizations', data);
  },

  // Update organization
  updateOrganization: async (id: string, data: UpdateOrganizationRequest): Promise<Organization> => {
    return api.patch<Organization>(`${API_ENDPOINTS.ORGANIZATIONS?.UPDATE?.(id) || `/organizations/${id}`}`, data);
  },

  // Delete organization
  deleteOrganization: async (id: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`${API_ENDPOINTS.ORGANIZATIONS?.DELETE?.(id) || `/organizations/${id}`}`);
  }
};
