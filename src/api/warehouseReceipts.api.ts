import { api } from '@/lib/api';
import apiClient from '@/lib/api';
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

export interface WarehouseReceiptItemDetail {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  vatTotalPrice: number;
  purchasePrice: number;
  salePrice: number;
  vatPercentage: string;
  product: {
    id: string;
    code: string;
    name: string;
    description?: string;
    category?: string;
    sku?: string;
    unit?: string;
    price?: string;
    costPrice?: number;
    barcode?: string;
    manufacturer?: string;
    lowStockThreshold?: number;
    isForeignCurrency?: boolean;
    exchangeRate?: number | null;
    isActive?: boolean;
    isDeleted?: boolean;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
  };
  originalCostPrice: number;
  // Backward compatibility - snake_case versions
  product_id?: string;
  unit_price?: number;
  total_price?: number;
  vat_total_price?: number;
  po_number?: string;
  notes?: string;
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
  warehouseId: string;
  warehouse?: {
    id: string;
    code: string;
    name: string;
    address?: string;
    description?: string;
    organizationCode?: string;
    addressDetail?: string;
    isActive?: boolean;
    isDeleted?: boolean;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
  };
  warehouseName?: string;
  newWarehouseId?: string; // Kho đích cho loại moving
  // Backward compatibility
  new_warehouse_id?: string;
  movingReceiptId?: string; // ID của phiếu gốc (dùng để nhóm phiếu chuyển đi và chuyển đến)
  moving_receipt_id?: string;
  status: string; // draft | completed | approved | pending | rejected | picked | exported | cancelled
  notes: string;
  description?: string;
  approvalNotes?: string;
  exportNotes?: string;
  createdAt: string;
  completedAt?: string;
  approvedAt?: string;
  pickedAt?: string;
  exportedAt?: string;
  createdBy: string | {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  createdByName?: string;
  // Backward compatibility
  created_by_name?: string;
  updatedAt?: string;
  approvedBy?: string | {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  pickedBy?: string;
  exportedBy?: string;
  supplierId?: string;
  // Backward compatibility
  supplier_id?: string;
  supplier?: {
    id: string;
    code?: string;
    name: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
  };
  supplierName?: string;
  supplierContact?: string;
  orderId?: string;
  type: string;   // import | export | moving
  // Both details and items - items is from normalized response
  details?: WarehouseReceiptItemDetail[];
  items?: WarehouseReceiptItemDetail[];
  // Export slip items
  exportSlipItems?: any[];
  export_slip_items?: any[];
  totalAmount?: number | string;
  // Backward compatibility - snake_case versions from normalize function
  total_amount?: number | string;
  created_at?: string;
  completed_at?: string;
  updated_at?: string;
  approved_by?: string | {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  created_by?: string | {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  supplier_name?: string;
  supplier_contact?: string;
  warehouse_id?: string;
  order_id?: string;
  approval_notes?: string;
  isForeignCurrency?: boolean;
  // Backward compatibility
  is_foreign_currency?: boolean;
  exchangeRate?: number | null;
  // Backward compatibility
  exchange_rate?: number | null;
  order?: {
    id?: string;
    code?: string;
    orderNumber?: string;
    order_number?: string;
    contractCode?: string;
    contract_code?: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    vatTotalAmount?: number | string;
    // Customer object from backend
    customer?: {
      id?: string;
      code?: string;
      name?: string;
      phoneNumber?: string;
      email?: string;
      address?: string;
    };
    // Backward compatibility
    customer_name?: string;
    customer_phone?: string;
    customer_address?: string;
    receiver_address?: string;
    customer_addressInfo?: any;
    receiver_addressInfo?: any;
    vat_total_amount?: number | string;
    total_amount?: number | string;
    // CamelCase version
    totalAmount?: number | string;
    order_items?: Array<{
      id: string;
      product_code: string;
      product_name: string;
      quantity: number;
      unit_price: number;
    }>;
  };
  customer?: {
    id: string;
    code: string;
    name: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
  };
  creator_profile?: {
    full_name: string;
  };
  approver_profile?: {
    full_name: string;
  };
  picker_profile?: {
    full_name: string;
  };
  exporter_profile?: {
    full_name: string;
  };
}

export interface CreateWarehouseReceiptRequest {
  warehouseId: string;
  supplierId?: string; // Required for import/export, optional for moving
  code?: string; // Tùy chọn (tự sinh nếu không có)
  description?: string;
  status?: string;
  orderId?: string; // Order ID if created from order
  type: string; // 'import' | 'export' | 'moving'
  newWarehouseId?: string; // Bắt buộc cho loại moving (kho đích)
  details: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    vatPercentage?: number;
    warehouseId?: string;
  }>;
  isDeleted?: boolean;
  isForeignCurrency?: boolean;
  exchangeRate?: number | null;
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

const normalize = (row: any): WarehouseReceipt => ({
  // Primary camelCase fields (matching backend response)
  id: row.id,
  code: row.code ?? row.slip_number ?? '',
  warehouseId: row.warehouseId ?? row.warehouse_id ?? row.warehouse?.id ?? '',
  warehouse_id: row.warehouseId ?? row.warehouse_id ?? row.warehouse?.id ?? '', // Backward compat
  // Full warehouse object from backend
  warehouse: row.warehouse ? {
    id: row.warehouse.id,
    code: row.warehouse.code ?? '',
    name: row.warehouse.name ?? '',
    address: row.warehouse.address,
    description: row.warehouse.description,
    organizationCode: row.warehouse.organizationCode,
    addressDetail: row.warehouse.addressDetail,
    isActive: row.warehouse.isActive,
    isDeleted: row.warehouse.isDeleted,
    createdAt: row.warehouse.createdAt,
    updatedAt: row.warehouse.updatedAt,
    deletedAt: row.warehouse.deletedAt
  } : undefined,
  newWarehouseId: row.newWarehouseId ?? row.new_warehouse_id ?? undefined,
  new_warehouse_id: row.newWarehouseId ?? row.new_warehouse_id ?? undefined, // Backward compat
  movingReceiptId: row.movingReceiptId ?? row.moving_receipt_id ?? undefined,
  moving_receipt_id: row.movingReceiptId ?? row.moving_receipt_id ?? undefined, // Backward compat
  status: row.status ?? 'draft',
  notes: row.description ?? row.notes ?? undefined,
  description: row.description ?? undefined,
  createdAt: row.createdAt ?? row.created_at ?? '',
  created_at: row.createdAt ?? row.created_at ?? '', // Backward compat
  completedAt: row.completedAt ?? row.completed_at ?? undefined,
  completed_at: row.completedAt ?? row.completed_at ?? undefined, // Backward compat
  updatedAt: row.updatedAt ?? row.updated_at ?? '',
  updated_at: row.updatedAt ?? row.updated_at ?? '', // Backward compat
  createdBy: row.createdBy ?? row.created_by ?? '',
  created_by: row.createdBy ?? row.created_by ?? '', // Backward compat
  createdByName: row.createdByName ?? row.created_by_name ?? row.creator?.name ?? row.creator?.full_name ?? undefined,
  created_by_name: row.createdByName ?? row.created_by_name ?? row.creator?.name ?? row.creator?.full_name ?? undefined, // Backward compat
  approvedBy: row.approvedBy ?? row.approved_by ?? '',
  approved_by: row.approvedBy ?? row.approved_by ?? '', // Backward compat
  supplierId: row.supplierId ?? row.supplier_id ?? undefined,
  supplier_id: row.supplierId ?? row.supplier_id ?? undefined, // Backward compat
  // Full customer object from backend
  customer: row.customer ? {
    id: row.customer.id,
    code: row.customer.code ?? '',
    name: row.customer.name ?? '',
    phoneNumber: row.customer.phoneNumber,
    email: row.customer.email,
    address: row.customer.address
  } : undefined,
  supplierName: row.supplier?.name ?? row.supplier_name ?? row?.customer?.name ?? undefined,
  supplier_name: row.supplier?.name ?? row.supplier_name ?? row?.customer?.name ?? undefined, // Backward compat
  supplierContact: row.supplier?.phoneNumber ?? row.supplier_contact ?? undefined,
  supplier_contact: row.supplier?.phoneNumber ?? row.supplier_contact ?? undefined, // Backward compat
  orderId: row.orderId ?? row.order_id ?? undefined,
  order_id: row.orderId ?? row.order_id ?? undefined, // Backward compat
  type: row.type ?? 'import',
  totalAmount: row.totalAmount ?? row.total_amount ?? 0,
  total_amount: row.totalAmount ?? row.total_amount ?? 0, // Backward compat
  isForeignCurrency: row.isForeignCurrency ?? row.is_foreign_currency ?? false,
  is_foreign_currency: row.isForeignCurrency ?? row.is_foreign_currency ?? false, // Backward compat
  exchangeRate: row.exchangeRate ?? row.exchange_rate ?? null,
  exchange_rate: row.exchangeRate ?? row.exchange_rate ?? null, // Backward compat
  // Items
  details: row.details, // Keep original camelCase from backend
  items: row.details ?? row.items, // For backward compat
  // Export slip items - add both camelCase and snake_case
  exportSlipItems: row.exportSlipItems ?? row.export_slip_items,
  export_slip_items: row.exportSlipItems ?? row.export_slip_items, // Backward compat
  order: row.order ? {
    id: row.order.id,
    code: row.order.code,
    order_number: row.order.order_number ?? row.order.orderNumber ?? row.order.code ?? '',
    orderNumber: row.order.orderNumber ?? row.order.order_number ?? row.order.code ?? '',
    contract_code: row.order.contract_code ?? row.order.contractCode ?? '',
    contractCode: row.order.contractCode ?? row.order.contract_code ?? '',
    customerId: row.order.customerId ?? row.order.customer_id,
    customer_name: row.order.customer_name ?? row.order.customerName ?? row.order.customer?.name ?? row.order.companyName ?? row.order.company_name ?? '',
    customerName: row.order.customerName ?? row.order.customer_name ?? row.order.customer?.name ?? row.order.companyName ?? row.order.company_name ?? '',
    customer_address: row.order.customer_address ?? row.order.customerAddress ?? row.order.customer?.address ?? row.order.companyAddress ?? row.order.company_address ?? undefined,
    customerPhone: row.order.customerPhone ?? row.order.customer_phone ?? row.order.customer?.phoneNumber ?? row.order.receiverPhone ?? row.order.receiver_phone ?? undefined,
    customer_phone: row.order.customer_phone ?? row.order.customerPhone ?? row.order.customer?.phone ?? row.order.receiverPhone ?? row.order.receiver_phone ?? undefined,
    customer_addressInfo: (() => {
      const ai = row.order.customer_addressInfo || row.order.customerAddressInfo || row.order.customer?.addressInfo || row.order.customer?.address_info;
      if (!ai) return undefined;
      return {
        provinceCode: ai.provinceCode ?? ai.province_code ?? ai.province?.code,
        districtCode: ai.districtCode ?? ai.district_code ?? ai.district?.code ?? null,
        wardCode: ai.wardCode ?? ai.ward_code ?? ai.ward?.code,
        province: ai.province,
        district: ai.district,
        ward: ai.ward,
        provinceName: ai.province?.name ?? ai.provinceName,
        districtName: ai.district?.name ?? ai.districtName,
        wardName: ai.ward?.name ?? ai.wardName,
      };
    })(),
    receiver_address: row.order.receiver_address ?? row.order.receiverAddress ?? row.order.receiver?.address ?? undefined,
    receiver_addressInfo: (() => {
      const ai = row.order.receiver_addressInfo || row.order.receiverAddressInfo || row.order.receiver?.addressInfo || row.order.receiver?.address_info || row.order.address_info || row.order.addressInfo;
      if (!ai) return undefined;
      return {
        provinceCode: ai.provinceCode ?? ai.province_code ?? ai.province?.code,
        districtCode: ai.districtCode ?? ai.district_code ?? ai.district?.code ?? null,
        wardCode: ai.wardCode ?? ai.ward_code ?? ai.ward?.code,
        province: ai.province,
        district: ai.district,
        ward: ai.ward,
        provinceName: ai.province?.name ?? ai.provinceName,
        districtName: ai.district?.name ?? ai.districtName,
        wardName: ai.ward?.name ?? ai.wardName,
      };
    })(),
    // Include customer object from order
    customer: row.order.customer ? {
      id: row.order.customer.id,
      code: row.order.customer.code ?? '',
      name: row.order.customer.name ?? '',
      phoneNumber: row.order.customer.phoneNumber ?? row.order.customer.phone,
      email: row.order.customer.email,
      address: row.order.customer.address
    } : undefined,
    total_amount: Number(row.order.total_amount ?? row.order.totalAmount ?? row.totalAmount ?? row.total_amount ?? 0),
    order_items: Array.isArray(row.order.order_items)
      ? row.order.order_items.map((oi: any) => ({
          product_name: oi.product_name ?? oi.productName,
          product_code: oi.product_code ?? oi.productCode,
          quantity: Number(oi.quantity ?? 0),
          unit_price: Number(oi.unit_price ?? oi.unitPrice ?? 0),
          total_price: Number(oi.total_price ?? oi.totalPrice ?? oi.quantity * (oi.unit_price ?? oi.unitPrice ?? 0)),
        }))
      : undefined,
  } : undefined,
});

export const warehouseReceiptsApi = {
  // Create new warehouse receipt
  createReceipt: async (data: CreateWarehouseReceiptRequest, timeout?: number): Promise<WarehouseReceipt> => {
    const config = timeout ? { timeout } : undefined;
    const response = await api.post<any>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.CREATE, data, config);
    const receiptData = response?.data || response;
    
    return normalize(receiptData);
  },

  // Get a single receipt by ID
  getReceipt: async (id: string): Promise<WarehouseReceipt> => {
    const response = await api.get<any>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.UPDATE(id));
    const data = response?.data || response;
    
    return normalize(data);
  },

  getReceipts: async (params?: { page?: number; limit?: number; sortBy?: string; sortOrder?: string; orderId?: string; startDate?: string; endDate?: string; completedStartDate?: string; completedEndDate?: string; warehouseId?: string; categories?: string; manufacturers?: string; search?: string; warehouse_id?: string; status?: string; type?: 'import' | 'export' | string }): Promise<{ receipts: WarehouseReceipt[]; total: number; page: number; limit: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('keyword', params.search);
    if (params?.orderId) queryParams.append('orderId', params.orderId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.completedStartDate) queryParams.append('completedStartDate', params.completedStartDate);
    if (params?.completedEndDate) queryParams.append('completedEndDate', params.completedEndDate);
    if (params?.warehouseId) queryParams.append('warehouseId', params.warehouseId);
    if (params?.categories) queryParams.append('categories', params.categories);
    if (params?.manufacturers) queryParams.append('manufacturers', params.manufacturers);
    if (params?.type) queryParams.append('type', params.type);

    const url = queryParams.toString()
      ? `${API_ENDPOINTS.WAREHOUSE_RECEIPTS.LIST}?${queryParams.toString()}`
      : API_ENDPOINTS.WAREHOUSE_RECEIPTS.LIST;

    const response = await api.get<any>(url);
    const data = response?.data || response;

    const filterByType = (receipts: WarehouseReceipt[]) => {
      if (params?.type) {
        // Support comma-separated types (e.g., 'stock_transfer_out,stock_transfer_in')
        const types = params.type.split(',').map(t => t.trim().toLowerCase());
        return receipts.filter((receipt) => 
          types.includes((receipt.type || '').toLowerCase())
        );
      }
      return receipts;
    };

    if (data && Array.isArray(data.rows)) {
      const rows = data.rows.map(normalize);
      const filteredRows = filterByType(rows);
      return {
        receipts: filteredRows,
        total: Number(data.count ?? data.total ?? filteredRows.length ?? 0),
        page: Number(data.page ?? params?.page ?? 1),
        limit: Number(data.limit ?? params?.limit ?? rows.length ?? 0),
      };
    }

    const fallbackReceipts = (response?.receipts || []).map(normalize);
    const filteredFallback = filterByType(fallbackReceipts);
    return {
      receipts: filteredFallback,
      total: Number(response?.total ?? response?.count ?? filteredFallback.length ?? 0),
      page: Number(response?.page ?? params?.page ?? 1),
      limit: Number(response?.limit ?? params?.limit ?? fallbackReceipts.length ?? 0),
    };
  },

  // Approve warehouse receipt
  approveReceipt: async (id: string): Promise<WarehouseReceipt> => {
    const response = await api.post<any>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.APPROVE(id));
    const receiptData = response?.data || response;
    
    return normalize(receiptData);
  },

  // Reject warehouse receipt
  rejectReceipt: async (id: string, reason?: string): Promise<WarehouseReceipt> => {
    const response = await api.post<any>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.REJECT(id), {
      reason: reason || ''
    });
    const receiptData = response?.data || response;
    
    return normalize(receiptData);
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

  // Update warehouse receipt (for status updates, notes, etc.)
  updateReceipt: async (id: string, data: { status?: string; description?: string; notes?: string }): Promise<WarehouseReceipt> => {
    const response = await api.patch<any>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.UPDATE(id), data);
    const receiptData = response?.data || response;
    
    return normalize(receiptData);
  },

  // Helper function to extract filename from Content-Disposition header (RFC 5987)
  getFilenameFromContentDisposition: (cd: string | null): string | null => {
    if (!cd) return null;
    
    // Ưu tiên filename*="UTF-8''..." (có dấu ngoặc kép)
    const utf8QuotedMatch = cd.match(/filename\*=\"UTF-8''(.*?)\"/i);
    if (utf8QuotedMatch && utf8QuotedMatch[1]) {
      return decodeURIComponent(utf8QuotedMatch[1]);
    }
    
    // Thử filename*=UTF-8''... (không có dấu ngoặc kép)
    const utf8Match = cd.match(/filename\*=UTF-8''(.*?)(?:;|$)/i);
    if (utf8Match && utf8Match[1]) {
      return decodeURIComponent(utf8Match[1]);
    }
    
    // Fallback filename="..."
    const asciiMatch = cd.match(/filename=\"(.*?)\"/i);
    if (asciiMatch && asciiMatch[1]) {
      return asciiMatch[1];
    }
    
    return null;
  },

  // Export warehouse receipt (PDF or XLSX)
  exportReceipt: async (id: string, type: 'pdf' | 'xlsx'): Promise<{ blob: Blob; filename: string }> => {
    const response = await apiClient.get(API_ENDPOINTS.WAREHOUSE_RECEIPTS.EXPORT(id, type), {
      responseType: 'blob',
    });
    const blob = response.data;
    // Extract filename from Content-Disposition header
    const contentDisposition = response.headers['content-disposition'];
    let filename = `warehouse-receipt-${id}.${type}`;
    const parsedFilename = warehouseReceiptsApi.getFilenameFromContentDisposition(contentDisposition);
    if (parsedFilename) {
      filename = parsedFilename;
    }
    return { blob, filename };
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
    type?: 'import' | 'export';
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
    if (params?.type) queryParams.append('type', params.type);
    
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
        // Use total and totalPages from API response, not from filtered jobs length
        const apiTotal = payload.data.pagination?.total || payload.data.rows.length;
        const apiLimit = payload.data.pagination?.limit || params?.limit || 10;
        const apiTotalPages = payload.data.pagination?.totalPages || Math.ceil(apiTotal / apiLimit);
        return {
          jobs,
          total: apiTotal,
          page: payload.data.pagination?.page || params?.page || 1,
          limit: apiLimit,
          totalPages: apiTotalPages
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
        // Use total and totalPages from API response, not from filtered jobs length
        const apiTotal = payload.pagination?.total || payload.rows.length;
        const apiLimit = payload.pagination?.limit || params?.limit || 10;
        const apiTotalPages = payload.pagination?.totalPages || Math.ceil(apiTotal / apiLimit);
        return {
          jobs,
          total: apiTotal,
          page: payload.pagination?.page || params?.page || 1,
          limit: apiLimit,
          totalPages: apiTotalPages
        };
      } catch (error) {
        throw error;
      }
    }
    
    // Handle paginated response
    if (payload && typeof payload === 'object' && 'jobs' in payload) {
      const allJobs = (payload.jobs || []).map(normalizeImportJobResponse);
      const jobs = filterJobsByType(allJobs);
      // Use total and totalPages from API response, not from filtered jobs length
      const apiTotal = payload.total || 0;
      const apiLimit = payload.limit || params?.limit || 10;
      const apiTotalPages = payload.totalPages || Math.ceil(apiTotal / apiLimit);
      return {
        jobs,
        total: apiTotal,
        page: payload.page || params?.page || 1,
        limit: apiLimit,
        totalPages: apiTotalPages
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
    
    // For non-paginated response, use the array length as total
    const apiTotal = jobArray.length;
    const apiLimit = params?.limit || jobArray.length || 1;
    const apiTotalPages = Math.ceil(apiTotal / apiLimit);
    
    return {
      jobs,
      total: apiTotal,
      page: params?.page || 1,
      limit: apiLimit,
      totalPages: apiTotalPages
    };
  },
};


