import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

export interface Category {
  id: string;
  name: string;
  description?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
}

export const categoriesApi = {
  // Get all categories
  getCategories: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ categories: Category[]; total: number; page: number; limit: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const url = queryParams.toString() 
      ? `${API_ENDPOINTS.CATEGORIES.LIST}?${queryParams.toString()}`
      : API_ENDPOINTS.CATEGORIES.LIST;

    const response = await api.get<any>(url);
    const data = response?.data || response;

    const normalize = (row: any): Category => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      isDeleted: row.isDeleted ?? row.is_deleted ?? false,
      createdAt: row.createdAt ?? row.created_at ?? '',
      updatedAt: row.updatedAt ?? row.updated_at ?? '',
      deletedAt: row.deletedAt ?? row.deleted_at ?? null,
    });

    if (data && Array.isArray(data.rows)) {
      return {
        categories: data.rows.map(normalize),
        total: Number(data.count ?? data.rows.length ?? 0),
        page: Number(data.page ?? 1),
        limit: Number(data.limit ?? 1000),
      };
    }

    return {
      categories: [],
      total: 0,
      page: 1,
      limit: 1000,
    };
  },

  // Get category by ID
  getCategory: async (id: string): Promise<Category> => {
    const response = await api.get<any>(API_ENDPOINTS.CATEGORIES.GET(id));
    const data = response?.data || response;
    
    return {
      id: data.id,
      name: data.name,
      description: data.description ?? undefined,
      isDeleted: data.isDeleted ?? data.is_deleted ?? false,
      createdAt: data.createdAt ?? data.created_at ?? '',
      updatedAt: data.updatedAt ?? data.updated_at ?? '',
      deletedAt: data.deletedAt ?? data.deleted_at ?? null,
    };
  },

  // Create new category
  createCategory: async (categoryData: CreateCategoryRequest): Promise<Category> => {
    const response = await api.post<any>(API_ENDPOINTS.CATEGORIES.CREATE, categoryData);
    const data = response?.data || response;
    
    return {
      id: data.id,
      name: data.name,
      description: data.description ?? undefined,
      isDeleted: data.isDeleted ?? data.is_deleted ?? false,
      createdAt: data.createdAt ?? data.created_at ?? '',
      updatedAt: data.updatedAt ?? data.updated_at ?? '',
      deletedAt: data.deletedAt ?? data.deleted_at ?? null,
    };
  },

  // Update category
  updateCategory: async (id: string, categoryData: UpdateCategoryRequest): Promise<Category> => {
    const response = await api.patch<any>(API_ENDPOINTS.CATEGORIES.UPDATE(id), categoryData);
    const data = response?.data || response;
    
    return {
      id: data.id,
      name: data.name,
      description: data.description ?? undefined,
      isDeleted: data.isDeleted ?? data.is_deleted ?? false,
      createdAt: data.createdAt ?? data.created_at ?? '',
      updatedAt: data.updatedAt ?? data.updated_at ?? '',
      deletedAt: data.deletedAt ?? data.deleted_at ?? null,
    };
  },

  // Delete category
  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(API_ENDPOINTS.CATEGORIES.DELETE(id));
  },
};
