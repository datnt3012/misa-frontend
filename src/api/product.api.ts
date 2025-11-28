import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  price: number;
  costPrice: number;
  lowStockThreshold?: number;
  manufacturer?: string;
  barcode?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ProductWithStock extends Product {
  current_stock: number;
  location?: string;
  updated_at?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  warehouse_code?: string;
}

export interface CreateProductRequest {
  code?: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  price?: number;
  costPrice?: number;
  lowStockThreshold?: number;
  manufacturer?: string;
  barcode?: string;
}

export interface UpdateProductRequest {
  code?: string;
  name?: string;
  description?: string;
  category?: string;
  unit?: string;
  price?: number;
  costPrice?: number;
  lowStockThreshold?: number;
  manufacturer?: string;
  barcode?: string;
}

export interface ProductImportRequest {
  file: File;
  warehouse_id?: string;
}

export interface ProductImportError {
  row?: number;
  code?: string;
  reason: string;
}

export interface ProductImportResponse {
  code?: number;
  message?: string;
  data?: {
    totalRows?: number;
    imported?: number;
    failed?: number;
    errors?: ProductImportError[];
  };
  // Direct fields (for unwrapped response)
  totalRows?: number;
  imported?: number;
  failed?: number;
  success?: number;
  errors?: ProductImportError[];
}

// Helper function to normalize product data from API response
const normalizeProduct = (row: any): Product => {
  const price = parseFloat(row.price ?? '0');
  const costPrice = parseFloat(row.costPrice ?? row.cost_price ?? '0');
  
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
    category: row.category ?? undefined,
    unit: row.unit ?? 'piece',
    price: price,
    costPrice: costPrice,
    lowStockThreshold: row.lowStockThreshold ?? row.low_stock_threshold ?? undefined,
    manufacturer: row.manufacturer ?? undefined,
    barcode: row.barcode ?? undefined,
    isDeleted: row.isDeleted ?? false,
    createdAt: row.createdAt ?? row.created_at ?? '',
    updatedAt: row.updatedAt ?? row.updated_at ?? '',
    deletedAt: row.deletedAt ?? row.deleted_at ?? undefined,
  };
};

export const productApi = {
  // Get all products
  getProducts: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    warehouse_id?: string;
  }): Promise<{ products: Product[]; total: number; page: number; limit: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.warehouse_id) queryParams.append('warehouse_id', params.warehouse_id);

    const url = queryParams.toString() 
      ? `${API_ENDPOINTS.PRODUCTS.LIST}?${queryParams.toString()}`
      : API_ENDPOINTS.PRODUCTS.LIST;

    // Backend returns { code, message, data: { count, rows, page, limit, totalPage } }
    const response = await api.get<any>(url);
    const data = response?.data || response; // support both shapes

    if (data && Array.isArray(data.rows)) {
      return {
        products: data.rows.map(normalizeProduct),
        total: Number(data.count ?? data.rows.length ?? 0),
        page: Number(data.page ?? params?.page ?? 1),
        limit: Number(data.limit ?? params?.limit ?? data.rows.length ?? 0),
      };
    }

    // Fallback if API already returns expected shape
    return {
      products: (response?.products || []).map(normalizeProduct),
      total: Number(response?.total ?? 0),
      page: Number(response?.page ?? params?.page ?? 1),
      limit: Number(response?.limit ?? params?.limit ?? 0),
    };
  },

  // Get product by ID
  getProduct: async (id: string): Promise<Product> => {
    const response = await api.get<any>(`${API_ENDPOINTS.PRODUCTS.LIST}/${id}`);
    const data = response?.data || response;
    return normalizeProduct(data);
  },

  // Create product
  createProduct: async (data: CreateProductRequest): Promise<Product> => {
    const response = await api.post<any>(API_ENDPOINTS.PRODUCTS.CREATE, data);
    const responseData = response?.data || response;
    return normalizeProduct(responseData);
  },

  // Update product
  updateProduct: async (id: string, data: UpdateProductRequest): Promise<Product> => {
    const response = await api.patch<any>(API_ENDPOINTS.PRODUCTS.UPDATE(id), data);
    const responseData = response?.data || response;
    return normalizeProduct(responseData);
  },

  // Delete product
  deleteProduct: async (id: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(API_ENDPOINTS.PRODUCTS.DELETE(id));
  },

  // Import products from Excel
  importProducts: async (data: ProductImportRequest): Promise<ProductImportResponse> => {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.warehouse_id) {
      formData.append('warehouse_id', data.warehouse_id);
    }

    try {
      const response = await api.upload<any>(
        API_ENDPOINTS.PRODUCTS.IMPORT,
        formData
      );
      // Normalize response - handle both wrapped { code, data, message } and direct format
      return response;
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data) {
        // Return the error response data (which contains errors array)
        return error.response.data as ProductImportResponse;
      }
      throw error;
    }
  },

  // Export products to Excel
  exportProducts: async (params?: {
    warehouse_id?: string;
    category?: string;
  }): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    if (params?.warehouse_id) queryParams.append('warehouse_id', params.warehouse_id);
    if (params?.category) queryParams.append('category', params.category);

    const url = queryParams.toString() 
      ? `${API_ENDPOINTS.PRODUCTS.EXPORT}?${queryParams.toString()}`
      : API_ENDPOINTS.PRODUCTS.EXPORT;

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3274/api/v0'}${url}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  },

  // Download import template from backend
  downloadImportTemplate: async (): Promise<{ blob: Blob; filename: string }> => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3274/api/v0'}${API_ENDPOINTS.PRODUCTS.IMPORT_TEMPLATE}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download template');
    }

    // Extract filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'product-import-template.xlsx';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    const blob = await response.blob();
    return { blob, filename };
  }
};
