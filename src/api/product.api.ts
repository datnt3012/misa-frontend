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
   isForeignCurrency?: boolean;
   exchangeRate?: number;
   originalCostPrice?: number;
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
   isForeignCurrency?: boolean;
   exchangeRate?: number;
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
   isForeignCurrency?: boolean;
   exchangeRate?: number;
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
export type ProductImportJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export interface ProductImportJobSnapshot {
  jobId: string;
  status: ProductImportJobStatus;
  totalRows: number;
  processedRows: number;
  imported: number;
  failed: number;
  percent: number;
  errors: ProductImportError[];
  startedAt?: string;
  completedAt?: string;
  result?: ProductImportResponse;
  message?: string;
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
     isForeignCurrency: row.isForeignCurrency ?? false,
     exchangeRate: row.exchangeRate ? parseFloat(row.exchangeRate) : undefined,
     originalCostPrice: row.originalCostPrice ? parseFloat(row.originalCostPrice) : undefined,
   };
};
const normalizeImportJobResponse = (job: any): ProductImportJobSnapshot => {
  if (!job) {
    throw new Error('Empty import job payload');
  }
  // Handle different possible field names for job ID
  const jobId = job.jobId || job.id || job.job_id;
  if (!jobId) {
    throw new Error('Import job payload is missing jobId (checked jobId, id, job_id)');
  }
  return {
    jobId: jobId,
    status: job.status ?? 'queued',
    totalRows: job.totalRows ?? job.total_rows ?? 0,
    processedRows: job.processedRows ?? job.processed_rows ?? 0,
    imported: job.imported ?? 0,
    failed: job.failed ?? 0,
    percent: job.percent ?? 0,
    errors: job.errors ?? [],
    startedAt: job.startedAt ?? job.createdAt ?? job.created_at,
    completedAt: job.completedAt ?? job.updatedAt ?? job.updated_at,
    result: job.result,
    message: job.message,
  };
};
export const productApi = {
  // Get all products
  getProducts: async (params?: {
    page?: number;
    limit?: number;
    keyword?: string;
    category?: string;
    warehouse?: string;
    hasStock?: boolean;
  }): Promise<{ products: Product[]; total: number; page: number; limit: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.keyword) queryParams.append('keyword', params.keyword);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.warehouse) queryParams.append('warehouse', params.warehouse);
    if (params?.hasStock) queryParams.append('hasStock', params.hasStock.toString());
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
  // Import products asynchronously (background job)
  importProductsAsync: async (data: ProductImportRequest): Promise<ProductImportJobSnapshot> => {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.warehouse_id) {
      formData.append('warehouse_id', data.warehouse_id);
    }
    const response = await api.upload<any>(
      API_ENDPOINTS.PRODUCTS.IMPORT_ASYNC,
      formData
    );
    return normalizeImportJobResponse(response);
  },
  // List import jobs (optionally only active ones)
  listImportJobs: async (params?: {
    onlyActive?: boolean;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }): Promise<{ jobs: ProductImportJobSnapshot[]; total: number; page: number; limit: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.onlyActive === true) {
      queryParams.append('onlyActive', 'true');
    }
    // When onlyActive is false or undefined, don't add the parameter to get all jobs
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const url = `${API_ENDPOINTS.PRODUCTS.IMPORT_STATUS_LIST}${query}`;
    const response = await api.get<any>(url);
    const payload = response?.data ?? response;
    // Handle paginated response with data.rows structure
    if (payload && typeof payload === 'object' && payload.data && Array.isArray(payload.data.rows)) {
      try {
        const jobs = (payload.data.rows || []).map(normalizeImportJobResponse);
        return {
          jobs,
          total: payload.data.pagination?.total || payload.data.rows.length,
          page: payload.data.pagination?.page || params?.page || 1,
          limit: payload.data.pagination?.limit || params?.limit || 10
        };
      } catch (error) {
        throw error;
      }
    }
    // Handle direct rows structure (API returns rows directly at root)
    if (payload && typeof payload === 'object' && Array.isArray(payload.rows)) {
      try {
        const jobs = (payload.rows || []).map(normalizeImportJobResponse);
        return {
          jobs,
          total: payload.pagination?.total || payload.rows.length,
          page: payload.pagination?.page || params?.page || 1,
          limit: payload.pagination?.limit || params?.limit || 10
        };
      } catch (error) {
        throw error;
      }
    }
    // Handle paginated response
    if (payload && typeof payload === 'object' && 'jobs' in payload) {
      return {
        jobs: (payload.jobs || []).map(normalizeImportJobResponse),
        total: payload.total || 0,
        page: payload.page || params?.page || 1,
        limit: payload.limit || params?.limit || 10
      };
    }
    // Handle non-paginated response (backward compatibility)
    const jobArray = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.jobs)
          ? payload.jobs
          : [];
    return {
      jobs: jobArray.map(normalizeImportJobResponse),
      total: jobArray.length,
      page: params?.page || 1,
      limit: params?.limit || jobArray.length
    };
  },
  // Request cancel for import job
  cancelImportJob: async (jobId: string): Promise<ProductImportJobSnapshot> => {
    const response = await api.delete<any>(API_ENDPOINTS.PRODUCTS.IMPORT_STATUS(jobId));
    // Handle case where response might not have jobId - merge with original jobId
    const responseData = response?.data || response;
    if (responseData && typeof responseData === 'object') {
      // Ensure jobId is present in the response
      responseData.jobId = responseData.jobId || responseData.id || responseData.job_id || jobId;
    }
    return normalizeImportJobResponse(responseData);
  },
  // Get import job status
  getImportStatus: async (jobId: string): Promise<ProductImportJobSnapshot> => {
    const response = await api.get<any>(API_ENDPOINTS.PRODUCTS.IMPORT_STATUS(jobId));
    return normalizeImportJobResponse(response);
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
