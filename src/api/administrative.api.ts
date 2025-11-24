import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

export interface AdministrativeUnit {
  id?: string;
  code: string;
  name: string;
  level: string;
  parentCode?: string;
  divisionType?: string;
  type?: string;
  codename?: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface CreateAdministrativeUnitRequest {
  name: string;
  code: string;
  level: string;
  parentCode?: string;
  type?: string;
}

export interface UpdateAdministrativeUnitRequest {
  name?: string;
  code?: string;
  level?: string;
  parentCode?: string;
  type?: string;
}

export const administrativeApi = {
  // Get all administrative units
  getAdministrativeUnits: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    keyword?: string;
    noPaging?: boolean;
    level?: string | number;
    code?: string;
    parentCode?: string;
    type?: string;
    includeDeleted?: boolean;
    isDeleted?: boolean;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ administrativeUnits: AdministrativeUnit[]; total: number; page: number; limit: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.keyword) queryParams.append('keyword', params.keyword);
    if (params?.noPaging) queryParams.append('noPaging', params.noPaging.toString());
    if (params?.level !== undefined) queryParams.append('level', params.level.toString());
    if (params?.code) queryParams.append('code', params.code);
    if (params?.parentCode) queryParams.append('parentCode', params.parentCode);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.includeDeleted !== undefined) queryParams.append('includeDeleted', params.includeDeleted.toString());
    if (params?.isDeleted !== undefined) queryParams.append('isDeleted', params.isDeleted.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = queryParams.toString() 
      ? `${API_ENDPOINTS.ADMINISTRATIVE?.LIST || '/administrative'}?${queryParams.toString()}`
      : (API_ENDPOINTS.ADMINISTRATIVE?.LIST || '/administrative');

    const response = await api.get<any>(url);
    const data = response?.data || response;

    const normalize = (row: any): AdministrativeUnit => {
      const levelValue = row.level ?? row.level_id ?? row.levelNo ?? row.Level;
      const parentCodeValue = row.parentCode ?? row.parent_code ?? row.parent ?? row.parentId ?? row.parent_id ?? null;
      return {
        id: row.id,
        code: row.code ?? row.orgCode ?? row.administrativeUnitCode ?? row.code_id,
        name: row.name ?? row.orgName ?? row.administrativeUnitName,
        level: String(levelValue ?? ''),
        parentCode: parentCodeValue ?? undefined,
        divisionType: row.divisionType ?? row.division_type ?? undefined,
        type: row.type ?? row.orgType ?? undefined,
        codename: row.codename ?? row.code_name ?? undefined,
        isDeleted: row.isDeleted ?? row.is_deleted ?? false,
        createdAt: row.createdAt ?? row.created_at,
        updatedAt: row.updatedAt ?? row.updated_at,
        deletedAt: row.deletedAt ?? row.deleted_at,
      };
    };

    // Handle API response format: { code: 200, data: { rows: [], count: number, page: number, limit: number, totalPage: number }, message: string }
    const responseData = data?.data || data;
    
    if (responseData && Array.isArray(responseData.rows)) {
      return {
        administrativeUnits: responseData.rows.map(normalize),
        total: Number(responseData.count ?? responseData.rows.length ?? 0),
        page: Number(responseData.page ?? params?.page ?? 1),
        limit: Number(responseData.limit ?? params?.limit ?? responseData.rows.length ?? 0),
      };
    }

    // Fallback for other response formats
    if (data && Array.isArray(data.rows)) {
      return {
        administrativeUnits: data.rows.map(normalize),
        total: Number(data.count ?? data.rows.length ?? 0),
        page: Number(data.page ?? params?.page ?? 1),
        limit: Number(data.limit ?? params?.limit ?? data.rows.length ?? 0),
      };
    }

    return {
      administrativeUnits: (response?.administrativeUnits || []).map(normalize),
      total: Number(response?.total ?? 0),
      page: Number(response?.page ?? params?.page ?? 1),
      limit: Number(response?.limit ?? params?.limit ?? 0),
    };
  },

  // Get administrative unit by code
  getAdministrativeUnit: async (code: string): Promise<AdministrativeUnit> => {
    return api.get<AdministrativeUnit>(`${API_ENDPOINTS.ADMINISTRATIVE?.LIST || '/administrative'}/${code}`);
  },

  // Create administrative unit (not supported - data managed externally)
  createAdministrativeUnit: async (data: CreateAdministrativeUnitRequest): Promise<AdministrativeUnit> => {
    return api.post<AdministrativeUnit>(API_ENDPOINTS.ADMINISTRATIVE?.CREATE || '/administrative', data);
  },

  // Update administrative unit (not supported - data managed externally)
  updateAdministrativeUnit: async (code: string, data: UpdateAdministrativeUnitRequest): Promise<AdministrativeUnit> => {
    return api.patch<AdministrativeUnit>(`${API_ENDPOINTS.ADMINISTRATIVE?.UPDATE?.(code) || `/administrative/${code}`}`, data);
  },

  // Delete administrative unit (not supported - data managed externally)
  deleteAdministrativeUnit: async (code: string, hard: boolean = false): Promise<{ message: string }> => {
    const url = `${API_ENDPOINTS.ADMINISTRATIVE?.DELETE?.(code) || `/administrative/${code}`}${hard ? '?hard=true' : '?hard=false'}`;
    return api.delete<{ message: string }>(url);
  },

};

