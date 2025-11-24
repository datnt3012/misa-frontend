import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

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
};


