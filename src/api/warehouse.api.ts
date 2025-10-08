import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import { Warehouse } from '@/types/warehouse';

export interface CreateWarehouseRequest {
  code?: string;
  name: string;
  address: string;
  description?: string;
}

export interface UpdateWarehouseRequest {
  code?: string;
  name?: string;
  address?: string;
  description?: string;
}

export const warehouseApi = {
  // Get all warehouses
  getWarehouses: async (params?: { page?: number; limit?: number; search?: string }): Promise<{ warehouses: Warehouse[]; total: number; page: number; limit: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.search) queryParams.append('search', params.search);

    const url = queryParams.toString()
      ? `${API_ENDPOINTS.WAREHOUSES.LIST}?${queryParams.toString()}`
      : API_ENDPOINTS.WAREHOUSES.LIST;

    const response = await api.get<any>(url);
    const data = response?.data || response;

    const normalize = (row: any): Warehouse => ({
      id: row.id,
      code: row.code,
      name: row.name,
      address: row.address ?? '',
      description: row.description ?? undefined,
      isDeleted: row.isDeleted ?? false,
      createdAt: row.createdAt ?? row.created_at ?? '',
      updatedAt: row.updatedAt ?? row.updated_at ?? '',
      deletedAt: row.deletedAt ?? row.deleted_at ?? undefined,
      stockLevels: row.stockLevels ?? undefined,
      warehouseReceipts: row.warehouseReceipts ?? undefined,
    });

    if (data && Array.isArray(data.rows)) {
      return {
        warehouses: data.rows.map(normalize),
        total: Number(data.count ?? data.rows.length ?? 0),
        page: Number(data.page ?? params?.page ?? 1),
        limit: Number(data.limit ?? params?.limit ?? data.rows.length ?? 0),
      };
    }

    return {
      warehouses: (response?.warehouses || []).map(normalize),
      total: Number(response?.total ?? 0),
      page: Number(response?.page ?? params?.page ?? 1),
      limit: Number(response?.limit ?? params?.limit ?? 0),
    };
  },

  // Create warehouse
  createWarehouse: async (data: CreateWarehouseRequest): Promise<Warehouse> => {
    return api.post<Warehouse>(API_ENDPOINTS.WAREHOUSES.CREATE, data);
  },

  // Update warehouse
  updateWarehouse: async (id: string, data: UpdateWarehouseRequest): Promise<Warehouse> => {
    return api.patch<Warehouse>(API_ENDPOINTS.WAREHOUSES.UPDATE(id), data);
  },

  // Delete warehouse
  deleteWarehouse: async (id: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(API_ENDPOINTS.WAREHOUSES.DELETE(id));
  }
};
