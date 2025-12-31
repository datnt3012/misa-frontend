import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

export type WarehouseReceiptImportJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface WarehouseReceiptImportError {
  row?: number;
  code?: string;
  reason: string;
}

export interface WarehouseReceiptImportJobSnapshot {
  jobId: string;
  status: WarehouseReceiptImportJobStatus;
  totalRows: number;
  processedRows: number;
  imported: number;
  failed: number;
  percent: number;
  errors: WarehouseReceiptImportError[];
  fileName?: string;
  createdAt?: string;
  updatedAt?: string;
  cancelRequested?: boolean;
  type?: 'import' | 'export'; // Phân biệt phiếu nhập/xuất kho
  result?: {
    totalRows: number;
    imported: number;
    failed: number;
    errors: WarehouseReceiptImportError[];
  };
  message?: string;
}

export interface WarehouseReceiptImportRequest {
  file: File;
  type?: 'import' | 'export'; // Phân biệt phiếu nhập/xuất kho
}

export interface WarehouseReceiptItem {
  id: string;
  product_id: string;
  product?: {
    id: string;
    code: string;
    name: string;
    description?: string;
    category?: string;
    unit?: string;
    price?: string;
  };
  quantity: number;
  unit_price: number;
  total_price: number;
  po_number?: string;
  notes?: string;
}

export interface WarehouseReceipt {
  id: string;
  code: string; // slip number
  warehouse_id: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_contact?: string;
  description?: string;
  status: string; // draft | completed | approved
  type: string;   // import
  total_amount: number;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  created_by?: string;
  created_by_name?: string;
  approved_by?: string;
  approved_by_name?: string;
  items?: WarehouseReceiptItem[];
}

export interface CreateWarehouseReceiptRequest {
  warehouseId: string;
  supplierId: string; // Required by backend
  code: string;
  description?: string;
  status?: string;
  type: string;
  details: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  isDeleted?: boolean;
}

// Helper function to normalize import job response
const normalizeImportJobResponse = (job: any): WarehouseReceiptImportJobSnapshot => {
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
    fileName: job.fileName ?? job.file_name,
    createdAt: job.createdAt ?? job.created_at,
    updatedAt: job.updatedAt ?? job.updated_at,
    cancelRequested: job.cancelRequested ?? job.cancel_requested ?? false,
    type: job.type ?? undefined, // Phân biệt phiếu nhập/xuất kho
    result: job.result,
    message: job.message,
  };
};

export const warehouseReceiptsApi = {
  // Create new warehouse receipt
  createReceipt: async (data: CreateWarehouseReceiptRequest): Promise<WarehouseReceipt> => {
    const response = await api.post<any>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.CREATE, data);
    const receiptData = response?.data || response;
    
    return {
      id: receiptData.id,
      code: receiptData.code,
      warehouse_id: receiptData.warehouseId,
      supplier_id: receiptData.supplierId,
      description: receiptData.description,
      status: receiptData.status || 'pending',
      type: receiptData.type,
      total_amount: Number(receiptData.totalAmount || 0),
      created_at: receiptData.createdAt || receiptData.created_at,
      updated_at: receiptData.updatedAt || receiptData.updated_at,
      items: receiptData.details?.map((detail: any) => ({
        id: detail.id,
        product_id: detail.productId,
        quantity: Number(detail.quantity),
        unit_price: Number(detail.unitPrice),
        total_price: Number(detail.totalPrice || detail.quantity * detail.unitPrice),
      })) || []
    };
  },

  getReceipts: async (params?: { page?: number; limit?: number; search?: string; warehouse_id?: string; status?: string; type?: 'import' | 'export' | string }): Promise<{ receipts: WarehouseReceipt[]; total: number; page: number; limit: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.search) queryParams.append('search', params.search);
    if (params?.warehouse_id) queryParams.append('warehouse_id', params.warehouse_id);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.type) queryParams.append('type', params.type);

    const url = queryParams.toString()
      ? `${API_ENDPOINTS.WAREHOUSE_RECEIPTS.LIST}?${queryParams.toString()}`
      : API_ENDPOINTS.WAREHOUSE_RECEIPTS.LIST;

    const response = await api.get<any>(url);
    const data = response?.data || response;

    const normalize = (row: any): WarehouseReceipt => ({
      id: row.id,
      code: row.code ?? row.slip_number ?? '',
      warehouse_id: row.warehouseId ?? row.warehouse_id ?? row.warehouse?.id ?? '',
      supplier_id: row.supplierId ?? row.supplier_id ?? undefined,
      supplier_name: row.supplier?.name ?? row.supplier_name ?? undefined,
      supplier_contact: row.supplier?.phoneNumber ?? row.supplier_contact ?? undefined,
      description: row.description ?? undefined,
      status: row.status ?? 'draft',
      type: row.type ?? 'import',
      total_amount: Number(row.totalAmount ?? row.total_amount ?? 0),
      created_at: row.created_at ?? row.createdAt ?? '',
      updated_at: row.updated_at ?? row.updatedAt ?? '',
      approved_at: row.approved_at ?? row.approvedAt ?? undefined,
      created_by: row.created_by ?? row.createdBy ?? undefined,
      created_by_name: row.created_by_name ?? row.createdByName ?? row.creator?.name ?? row.creator?.full_name ?? undefined,
      approved_by: row.approved_by ?? row.approvedBy ?? undefined,
      approved_by_name: row.approved_by_name ?? row.approvedByName ?? row.approver?.name ?? row.approver?.full_name ?? undefined,
      items: Array.isArray(row.details)
        ? row.details.map((detail: any) => ({
            id: detail.id,
            product_id: detail.product?.id ?? detail.productId ?? detail.product_id,
            product: detail.product ? {
              id: detail.product.id,
              code: detail.product.code,
              name: detail.product.name,
              description: detail.product.description,
              category: detail.product.category,
              unit: detail.product.unit,
              price: detail.product.price
            } : undefined,
            quantity: Number(detail.quantity ?? 0),
            unit_price: Number(detail.unitPrice ?? detail.unit_price ?? 0),
            total_price: Number(detail.totalPrice ?? detail.total_price ?? 0),
            po_number: detail.poNumber ?? detail.po_number ?? undefined,
            notes: detail.notes ?? undefined,
          }))
        : Array.isArray(row.items)
        ? row.items.map((it: any) => ({
            id: it.id,
            product_id: it.productId ?? it.product_id,
            product: it.product ? {
              id: it.product.id,
              code: it.product.code,
              name: it.product.name,
              description: it.product.description,
              category: it.product.category,
              unit: it.product.unit,
              price: it.product.price
            } : undefined,
            quantity: Number(it.quantity ?? 0),
            unit_price: Number(it.unitPrice ?? it.unit_price ?? 0),
            total_price: Number(it.totalPrice ?? it.total_price ?? 0),
            po_number: it.poNumber ?? it.po_number ?? undefined,
            notes: it.notes ?? undefined,
          }))
        : undefined,
    });

    const filterByType = (receipts: WarehouseReceipt[]) => {
      if (params?.type) {
        return receipts.filter((receipt) => (receipt.type || '').toLowerCase() === params.type?.toLowerCase());
      }
      return receipts;
    };

    if (data && Array.isArray(data.rows)) {
      const rows = data.rows.map(normalize);
      const filteredRows = filterByType(rows);
      return {
        receipts: filteredRows,
        total: params?.type ? filteredRows.length : Number(data.count ?? rows.length ?? 0),
        page: Number(data.page ?? params?.page ?? 1),
        limit: Number(data.limit ?? params?.limit ?? rows.length ?? 0),
      };
    }

    const fallbackReceipts = (response?.receipts || []).map(normalize);
    const filteredFallback = filterByType(fallbackReceipts);
    return {
      receipts: filteredFallback,
      total: params?.type ? filteredFallback.length : Number(response?.total ?? fallbackReceipts.length ?? 0),
      page: Number(response?.page ?? params?.page ?? 1),
      limit: Number(response?.limit ?? params?.limit ?? fallbackReceipts.length ?? 0),
    };
  },

  // Approve warehouse receipt
  approveReceipt: async (id: string): Promise<WarehouseReceipt> => {
    const response = await api.patch<any>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.UPDATE(id), {
      status: 'approved'
    });
    const receiptData = response?.data || response;
    
    return {
      id: receiptData.id,
      code: receiptData.code,
      warehouse_id: receiptData.warehouseId,
      supplier_id: receiptData.supplierId,
      description: receiptData.description,
      status: receiptData.status || 'approved',
      type: receiptData.type,
      total_amount: Number(receiptData.totalAmount || 0),
      created_at: receiptData.createdAt || receiptData.created_at,
      updated_at: receiptData.updatedAt || receiptData.updated_at,
      items: receiptData.details?.map((detail: any) => ({
        id: detail.id,
        product_id: detail.productId,
        quantity: Number(detail.quantity),
        unit_price: Number(detail.unitPrice),
        total_price: Number(detail.totalPrice || detail.quantity * detail.unitPrice),
      })) || []
    };
  },

  // Reject warehouse receipt
  rejectReceipt: async (id: string): Promise<WarehouseReceipt> => {
    const response = await api.patch<any>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.UPDATE(id), {
      status: 'rejected'
    });
    const receiptData = response?.data || response;
    
    return {
      id: receiptData.id,
      code: receiptData.code,
      warehouse_id: receiptData.warehouseId,
      supplier_id: receiptData.supplierId,
      description: receiptData.description,
      status: receiptData.status || 'rejected',
      type: receiptData.type,
      total_amount: Number(receiptData.totalAmount || 0),
      created_at: receiptData.createdAt || receiptData.created_at,
      updated_at: receiptData.updatedAt || receiptData.updated_at,
      items: receiptData.details?.map((detail: any) => ({
        id: detail.id,
        product_id: detail.productId,
        quantity: Number(detail.quantity),
        unit_price: Number(detail.unitPrice),
        total_price: Number(detail.totalPrice || detail.quantity * detail.unitPrice),
      })) || []
    };
  },

  // Delete warehouse receipt
  deleteReceipt: async (id: string, hard: boolean = false): Promise<{ message: string }> => {
    const url = hard 
      ? `${API_ENDPOINTS.WAREHOUSE_RECEIPTS.DELETE(id)}?hard=true`
      : API_ENDPOINTS.WAREHOUSE_RECEIPTS.DELETE(id);
    
    const response = await api.delete<any>(url);
    return {
      message: response?.message || (hard ? 'Phiếu nhập kho đã được xóa vĩnh viễn' : 'Phiếu nhập kho đã được xóa')
    };
  },

  // Download import template (Deprecated - Use downloadImportTemplate or downloadExportTemplate instead)
  downloadImportTemplate: async (): Promise<{ blob: Blob; filename: string }> => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3274/api/v0'}${API_ENDPOINTS.WAREHOUSE_RECEIPTS.IMPORT_TEMPLATE}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to download template');
    }
    // Extract filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'warehouse-receipt-import-template.xlsx';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }
    const blob = await response.blob();
    return { blob, filename };
  },

  // Download import template for import receipts (phiếu nhập)
  downloadImportReceiptTemplate: async (): Promise<{ blob: Blob; filename: string }> => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3274/api/v0'}${API_ENDPOINTS.WAREHOUSE_RECEIPTS.IMPORT_IMPORT_TEMPLATE}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to download import receipt template');
    }
    // Extract filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'warehouse-receipt-import-template.xlsx';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }
    const blob = await response.blob();
    return { blob, filename };
  },

  // Download import template for export receipts (phiếu xuất)
  downloadExportReceiptTemplate: async (): Promise<{ blob: Blob; filename: string }> => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3274/api/v0'}${API_ENDPOINTS.WAREHOUSE_RECEIPTS.IMPORT_EXPORT_TEMPLATE}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to download export receipt template');
    }
    // Extract filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'warehouse-receipt-export-template.xlsx';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }
    const blob = await response.blob();
    return { blob, filename };
  },

  // Import warehouse receipts from Excel (Deprecated - Use importImportExcel or importExportExcel instead)
  importExcel: async (file: File): Promise<{
    code: number;
    message: string;
    data: {
      totalRows: number;
      imported: number;
      failed: number;
      errors: Array<{
        row: number;
        code?: string;
        reason: string;
      }>;
    };
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.upload<any>(
      API_ENDPOINTS.WAREHOUSE_RECEIPTS.IMPORT_EXCEL,
      formData
    );
    
    // Normalize response - handle both wrapped { code, data, message } and direct format
    const responseData = response?.data || response;
    
    // If response has code, data, message structure
    if (responseData.code && responseData.data) {
      return {
        code: responseData.code,
        message: responseData.message || 'Import thành công',
        data: {
          totalRows: responseData.data.totalRows || 0,
          imported: responseData.data.imported || 0,
          failed: responseData.data.failed || 0,
          errors: responseData.data.errors || [],
        },
      };
    }
    
    // If response is direct format
    return {
      code: 201,
      message: responseData.message || 'Import thành công',
      data: {
        totalRows: responseData.totalRows || 0,
        imported: responseData.imported || 0,
        failed: responseData.failed || 0,
        errors: responseData.errors || [],
      },
    };
  },

  // Import import receipts from Excel (synchronous) - Chỉ import phiếu nhập
  importImportExcel: async (file: File): Promise<{
    code: number;
    message: string;
    data: {
      totalRows: number;
      imported: number;
      failed: number;
      errors: Array<{
        row: number;
        code?: string;
        reason: string;
      }>;
    };
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.upload<any>(
      API_ENDPOINTS.WAREHOUSE_RECEIPTS.IMPORT_IMPORT,
      formData
    );
    
    // Normalize response - handle both wrapped { code, data, message } and direct format
    const responseData = response?.data || response;
    
    // If response has code, data, message structure
    if (responseData.code && responseData.data) {
      return {
        code: responseData.code,
        message: responseData.message || 'Import phiếu nhập thành công',
        data: {
          totalRows: responseData.data.totalRows || 0,
          imported: responseData.data.imported || 0,
          failed: responseData.data.failed || 0,
          errors: responseData.data.errors || [],
        },
      };
    }
    
    // If response is direct format
    return {
      code: 201,
      message: responseData.message || 'Import phiếu nhập thành công',
      data: {
        totalRows: responseData.totalRows || 0,
        imported: responseData.imported || 0,
        failed: responseData.failed || 0,
        errors: responseData.errors || [],
      },
    };
  },

  // Import export receipts from Excel (synchronous) - Chỉ import phiếu xuất
  importExportExcel: async (file: File): Promise<{
    code: number;
    message: string;
    data: {
      totalRows: number;
      imported: number;
      failed: number;
      errors: Array<{
        row: number;
        code?: string;
        reason: string;
      }>;
    };
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.upload<any>(
      API_ENDPOINTS.WAREHOUSE_RECEIPTS.IMPORT_EXPORT,
      formData
    );
    
    // Normalize response - handle both wrapped { code, data, message } and direct format
    const responseData = response?.data || response;
    
    // If response has code, data, message structure
    if (responseData.code && responseData.data) {
      return {
        code: responseData.code,
        message: responseData.message || 'Import phiếu xuất thành công',
        data: {
          totalRows: responseData.data.totalRows || 0,
          imported: responseData.data.imported || 0,
          failed: responseData.data.failed || 0,
          errors: responseData.data.errors || [],
        },
      };
    }
    
    // If response is direct format
    return {
      code: 201,
      message: responseData.message || 'Import phiếu xuất thành công',
      data: {
        totalRows: responseData.totalRows || 0,
        imported: responseData.imported || 0,
        failed: responseData.failed || 0,
        errors: responseData.errors || [],
      },
    };
  },

  // Import warehouse receipts from Excel asynchronously (background job) - Deprecated, backward compatible
  importExcelAsync: async (data: WarehouseReceiptImportRequest): Promise<WarehouseReceiptImportJobSnapshot> => {
    const formData = new FormData();
    formData.append('file', data.file);
    // Thêm type để phân biệt phiếu nhập/xuất kho
    if (data.type) {
      formData.append('type', data.type);
    }
    
    const response = await api.upload<any>(
      API_ENDPOINTS.WAREHOUSE_RECEIPTS.IMPORT_EXCEL_ASYNC,
      formData
    );
    
    // Handle response structure: { code, data, message } or direct data
    const responseData = response?.data || response;
    const jobData = responseData?.data || responseData;
    
    return normalizeImportJobResponse(jobData);
  },

  // Import import receipts from Excel asynchronously (background job) - Chỉ import phiếu nhập
  importImportExcelAsync: async (file: File): Promise<WarehouseReceiptImportJobSnapshot> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.upload<any>(
      API_ENDPOINTS.WAREHOUSE_RECEIPTS.IMPORT_IMPORT_ASYNC,
      formData
    );
    
    // Handle response structure: { code, data, message } or direct data
    const responseData = response?.data || response;
    const jobData = responseData?.data || responseData;
    
    return normalizeImportJobResponse(jobData);
  },

  // Import export receipts from Excel asynchronously (background job) - Chỉ import phiếu xuất
  importExportExcelAsync: async (file: File): Promise<WarehouseReceiptImportJobSnapshot> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.upload<any>(
      API_ENDPOINTS.WAREHOUSE_RECEIPTS.IMPORT_EXPORT_ASYNC,
      formData
    );
    
    // Handle response structure: { code, data, message } or direct data
    const responseData = response?.data || response;
    const jobData = responseData?.data || responseData;
    
    return normalizeImportJobResponse(jobData);
  },

  // Get import job status
  getImportStatus: async (jobId: string): Promise<WarehouseReceiptImportJobSnapshot> => {
    const response = await api.get<any>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.IMPORT_STATUS(jobId));
    
    // Handle response structure: { code, data, message } or direct data
    const responseData = response?.data || response;
    const jobData = responseData?.data || responseData;
    
    return normalizeImportJobResponse(jobData);
  },

  // Cancel import job
  cancelImportJob: async (jobId: string): Promise<WarehouseReceiptImportJobSnapshot> => {
    const response = await api.delete<any>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.IMPORT_STATUS(jobId));
    
    // Handle response structure: { code, data, message } or direct data
    const responseData = response?.data || response;
    const jobData = responseData?.data || responseData;
    
    // Ensure jobId is present in the response
    if (jobData && typeof jobData === 'object') {
      jobData.jobId = jobData.jobId || jobData.id || jobData.job_id || jobId;
    }
    
    return normalizeImportJobResponse(jobData);
  },

  // List import jobs (optionally only active ones)
  listImportJobs: async (params?: {
    onlyActive?: boolean;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }): Promise<{ 
    jobs: WarehouseReceiptImportJobSnapshot[]; 
    total: number; 
    page: number; 
    limit: number; 
    totalPages: number;
  }> => {
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
    const url = `${API_ENDPOINTS.WAREHOUSE_RECEIPTS.IMPORT_STATUS_LIST}${query}`;
    
    const response = await api.get<any>(url);
    const payload = response?.data ?? response;
    
    // Helper function to filter jobs by type if needed
    const filterJobsByType = (jobs: WarehouseReceiptImportJobSnapshot[]): WarehouseReceiptImportJobSnapshot[] => {
      if (!params?.type) return jobs;
      return jobs.filter(job => {
        // If job has type field, use it
        if (job.type) {
          return job.type === params.type;
        }
        // If no type field, try to infer from fileName
        // Export jobs typically have "export" in fileName, import jobs have "import"
        if (job.fileName) {
          const fileName = job.fileName.toLowerCase();
          if (params.type === 'export' && fileName.includes('export')) {
            return true;
          }
          if (params.type === 'import' && fileName.includes('import')) {
            return true;
          }
        }
        // If we can't determine type, don't include it when filtering by type
        return false;
      });
    };
    
    // Handle paginated response with data.rows structure
    if (payload && typeof payload === 'object' && payload.data && Array.isArray(payload.data.rows)) {
      try {
        const allJobs = (payload.data.rows || []).map(normalizeImportJobResponse);
        const jobs = filterJobsByType(allJobs);
        return {
          jobs,
          total: params?.type ? jobs.length : (payload.data.pagination?.total || payload.data.rows.length),
          page: payload.data.pagination?.page || params?.page || 1,
          limit: payload.data.pagination?.limit || params?.limit || 10,
          totalPages: params?.type ? Math.ceil(jobs.length / (payload.data.pagination?.limit || params?.limit || 10)) : (payload.data.pagination?.totalPages || Math.ceil((payload.data.pagination?.total || payload.data.rows.length) / (payload.data.pagination?.limit || params?.limit || 10)))
        };
      } catch (error) {
        throw error;
      }
    }
    
    // Handle direct rows structure (API returns rows directly at root)
    if (payload && typeof payload === 'object' && Array.isArray(payload.rows)) {
      try {
        const allJobs = (payload.rows || []).map(normalizeImportJobResponse);
        const jobs = filterJobsByType(allJobs);
        return {
          jobs,
          total: params?.type ? jobs.length : (payload.pagination?.total || payload.rows.length),
          page: payload.pagination?.page || params?.page || 1,
          limit: payload.pagination?.limit || params?.limit || 10,
          totalPages: params?.type ? Math.ceil(jobs.length / (payload.pagination?.limit || params?.limit || 10)) : (payload.pagination?.totalPages || Math.ceil((payload.pagination?.total || payload.rows.length) / (payload.pagination?.limit || params?.limit || 10)))
        };
      } catch (error) {
        throw error;
      }
    }
    
    // Handle paginated response
    if (payload && typeof payload === 'object' && 'jobs' in payload) {
      const allJobs = (payload.jobs || []).map(normalizeImportJobResponse);
      const jobs = filterJobsByType(allJobs);
      return {
        jobs,
        total: params?.type ? jobs.length : (payload.total || 0),
        page: payload.page || params?.page || 1,
        limit: payload.limit || params?.limit || 10,
        totalPages: params?.type ? Math.ceil(jobs.length / (payload.limit || params?.limit || 10)) : (payload.totalPages || Math.ceil((payload.total || 0) / (payload.limit || params?.limit || 10)))
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
    
    const allJobs = jobArray.map(normalizeImportJobResponse);
    const jobs = filterJobsByType(allJobs);
    
    return {
      jobs,
      total: params?.type ? jobs.length : jobArray.length,
      page: params?.page || 1,
      limit: params?.limit || jobArray.length,
      totalPages: Math.ceil((params?.type ? jobs.length : jobArray.length) / (params?.limit || jobArray.length))
    };
  },
};


