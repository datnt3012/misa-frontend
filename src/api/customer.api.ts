import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  userId?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  user?: any;
}

export interface CreateCustomerRequest {
  name: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
}

export const customerApi = {
  // Get all customers
  getCustomers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ customers: Customer[]; total: number; page: number; limit: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const url = queryParams.toString() 
      ? `${API_ENDPOINTS.CUSTOMERS.LIST}?${queryParams.toString()}`
      : API_ENDPOINTS.CUSTOMERS.LIST;

    const response = await api.get<any>(url);
    const data = response?.data || response;

    const normalize = (row: any): Customer => ({
      id: row.id,
      name: row.name,
      email: row.email ?? null,
      phoneNumber: row.phoneNumber ?? row.phone ?? null,
      address: row.address ?? null,
      userId: row.userId ?? null,
      isDeleted: row.isDeleted ?? false,
      createdAt: row.createdAt ?? row.created_at ?? '',
      updatedAt: row.updatedAt ?? row.updated_at ?? '',
      deletedAt: row.deletedAt ?? row.deleted_at ?? null,
      user: row.user ?? null,
    });

    if (data && Array.isArray(data.rows)) {
      return {
        customers: data.rows.map(normalize),
        total: Number(data.count ?? data.rows.length ?? 0),
        page: Number(data.page ?? params?.page ?? 1),
        limit: Number(data.limit ?? params?.limit ?? data.rows.length ?? 0),
      };
    }

    return {
      customers: (response?.customers || []).map(normalize),
      total: Number(response?.total ?? 0),
      page: Number(response?.page ?? params?.page ?? 1),
      limit: Number(response?.limit ?? params?.limit ?? 0),
    };
  },

  // Get customer by ID
  getCustomer: async (id: string): Promise<Customer> => {
    return api.get<Customer>(`${API_ENDPOINTS.CUSTOMERS.LIST}/${id}`);
  },

  // Create customer
  createCustomer: async (data: CreateCustomerRequest): Promise<Customer> => {
    return api.post<Customer>(API_ENDPOINTS.CUSTOMERS.CREATE, data);
  },

  // Update customer
  updateCustomer: async (id: string, data: UpdateCustomerRequest): Promise<Customer> => {
    return api.patch<Customer>(API_ENDPOINTS.CUSTOMERS.UPDATE(id), data);
  },

  // Delete customer
  deleteCustomer: async (id: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(API_ENDPOINTS.CUSTOMERS.DELETE(id));
  }
};
