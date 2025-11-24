import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

export interface AddressOrganizationRef {
  code: string;
  name: string;
  parentCode?: string | null;
  level?: string;
  type?: string | null;
}

export interface AddressInfo {
  id?: string;
  entityType?: string;
  entityId?: string;
  provinceCode?: string;
  districtCode?: string;
  wardCode?: string;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  // nested relations from backend
  province?: AddressOrganizationRef | null;
  district?: AddressOrganizationRef | null;
  ward?: AddressOrganizationRef | null;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_phone: string;
  email?: string;
  address?: string;
  addressInfo?: AddressInfo;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSupplierRequest {
  code?: string;
  name: string;
  phoneNumber: string;
  email: string;
  address?: string;
  addressInfo?: {
    provinceCode?: string;
    districtCode?: string;
    wardCode?: string;
  };
  isDeleted?: boolean;
}

export interface UpdateSupplierRequest {
  code?: string;
  name?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  addressInfo?: {
    provinceCode?: string;
    districtCode?: string;
    wardCode?: string;
  };
  isDeleted?: boolean;
}

const normalize = (row: any): Supplier => ({
  id: row.id,
  code: row.code ?? '',
  name: row.name,
  contact_phone: row.contact_phone ?? row.phoneNumber ?? row.phone ?? '',
  email: row.email ?? undefined,
  address: row.address ?? undefined,
  addressInfo: row.addressInfo ?? row.address_info ?? undefined,
  isDeleted: row.isDeleted ?? false,
  createdAt: row.createdAt ?? row.created_at ?? '',
  updatedAt: row.updatedAt ?? row.updated_at ?? '',
});

export const supplierApi = {
  // Get all suppliers
  getSuppliers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ suppliers: Supplier[]; total: number; page: number; limit: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const url = queryParams.toString() 
      ? `${API_ENDPOINTS.SUPPLIERS.LIST}?${queryParams.toString()}`
      : API_ENDPOINTS.SUPPLIERS.LIST;

    const response = await api.get<any>(url);
    const data = response?.data || response;

    if (data && Array.isArray(data.rows)) {
      return {
        suppliers: data.rows.map(normalize),
        total: Number(data.count ?? data.rows.length ?? 0),
        page: Number(data.page ?? params?.page ?? 1),
        limit: Number(data.limit ?? params?.limit ?? data.rows.length ?? 0),
      };
    }

    // Fallback if API already returns expected shape
    return {
      suppliers: (response?.suppliers || []).map(normalize),
      total: Number(response?.total ?? 0),
      page: Number(response?.page ?? params?.page ?? 1),
      limit: Number(response?.limit ?? params?.limit ?? 0),
    };
  },

  // Get supplier by ID
  getSupplier: async (id: string): Promise<Supplier> => {
    return api.get<Supplier>(`${API_ENDPOINTS.SUPPLIERS.LIST}/${id}`);
  },

  // Create supplier
  createSupplier: async (data: CreateSupplierRequest): Promise<Supplier> => {
    const res = await api.post<any>(API_ENDPOINTS.SUPPLIERS.CREATE, data);
    const row = (res?.data ?? res) as any;
    return normalize(row);
  },

  // Update supplier
  updateSupplier: async (id: string, data: UpdateSupplierRequest): Promise<Supplier> => {
    return api.patch<Supplier>(API_ENDPOINTS.SUPPLIERS.UPDATE(id), data);
  },

  // Delete supplier
  deleteSupplier: async (id: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(API_ENDPOINTS.SUPPLIERS.DELETE(id));
  },
};
