import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

export interface ExportSlipItem {
  id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  requested_quantity: number;
  actual_quantity: number;
  remaining_quantity: number;
  unit_price: number;
}

export interface ExportSlip {
  id: string;
  code: string; // slip number
  order_id: string;
  status: string;
  notes?: string;
  approval_notes?: string;
  created_at: string;
  approved_at?: string;
  created_by: string;
  approved_by?: string;
  export_slip_items?: ExportSlipItem[];
  order?: {
    order_number: string;
    customer_name: string;
    customer_address?: string;
    customer_phone?: string;
    total_amount: number;
    order_items?: Array<{
      product_name: string;
      product_code: string;
      quantity: number;
      unit_price: number;
      total_price?: number;
    }>;
  };
}

const normalizeItem = (it: any): ExportSlipItem => ({
  id: it.id,
  product_id: it.productId ?? it.product_id,
  product_name: it.productName ?? it.product_name,
  product_code: it.productCode ?? it.product_code,
  requested_quantity: Number(it.requestedQuantity ?? it.requested_quantity ?? 0),
  actual_quantity: Number(it.actualQuantity ?? it.actual_quantity ?? 0),
  remaining_quantity: Number(it.remainingQuantity ?? it.remaining_quantity ?? 0),
  unit_price: Number(it.unitPrice ?? it.unit_price ?? 0),
});

const normalize = (row: any): ExportSlip => ({
  id: row.id,
  code: row.code ?? row.slip_number ?? '',
  order_id: row.orderId ?? row.order_id ?? '',
  status: row.status ?? 'pending',
  notes: row.description ?? row.notes ?? undefined,
  approval_notes: row.approval_notes ?? row.approvalNotes ?? undefined,
  created_at: row.createdAt ?? row.created_at ?? '',
  approved_at: row.approved_at ?? row.approvedAt ?? undefined,
  created_by: row.created_by ?? row.createdBy ?? '',
  approved_by: row.approved_by ?? row.approvedBy ?? undefined,
  export_slip_items: Array.isArray(row.details)
    ? row.details.map((detail: any) => ({
        id: detail.id,
        product_id: detail.productId ?? detail.product_id,
        product_name: detail.product?.name ?? detail.product_name ?? '',
        product_code: detail.product?.code ?? detail.product_code ?? '',
        requested_quantity: Number(detail.quantity ?? 0),
        actual_quantity: Number(detail.quantity ?? 0), // Same as requested for now
        remaining_quantity: 0, // Not available in warehouse receipts
        unit_price: Number(detail.unitPrice ?? detail.unit_price ?? 0),
      }))
    : Array.isArray(row.export_slip_items)
      ? row.export_slip_items.map(normalizeItem)
      : undefined,
  order: row.order ? {
    order_number: row.order.order_number ?? row.order.orderNumber ?? '',
    customer_name: row.order.customer_name ?? row.order.customerName ?? '',
    customer_address: row.order.customer_address ?? row.order.customerAddress ?? undefined,
    customer_phone: row.order.customer_phone ?? row.order.customerPhone ?? undefined,
    total_amount: Number(row.totalAmount ?? row.total_amount ?? 0),
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

export interface CreateExportSlipRequest {
  order_id: string;
  notes?: string;
  items: Array<{
    product_id: string;
    product_name: string;
    product_code: string;
    requested_quantity: number;
    unit_price: number;
  }>;
}

export const exportSlipsApi = {
  // Create new export slip
  createSlip: async (data: CreateExportSlipRequest): Promise<ExportSlip> => {
    const slipData = {
      orderId: data.order_id,
      type: 'export',
      status: 'pending',
      description: data.notes || 'Export slip',
      details: data.items.map(item => ({
        productId: item.product_id,
        productName: item.product_name,
        productCode: item.product_code,
        quantity: item.requested_quantity,
        unitPrice: item.unit_price.toString(),
        totalPrice: (item.requested_quantity * item.unit_price).toString()
      }))
    };

    const response = await api.post<any>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.CREATE, slipData);
    return normalize(response.data || response);
  },

  getSlips: async (params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<{ slips: ExportSlip[]; total: number; page: number; limit: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('keyword', params.search);
    queryParams.append('type', 'export'); // Filter for export type only
    
    const url = `${API_ENDPOINTS.WAREHOUSE_RECEIPTS.LIST}?${queryParams.toString()}`;
    const response = await api.get<any>(url);
    const data = response?.data || response;
    if (data && Array.isArray(data.rows)) {
      return {
        slips: data.rows.map(normalize),
        total: Number(data.count ?? data.rows.length ?? 0),
        page: Number(data.page ?? params?.page ?? 1),
        limit: Number(data.limit ?? params?.limit ?? data.rows.length ?? 0),
      };
    }
    const slips = (response?.slips || []).map(normalize);
    return {
      slips,
      total: Number(response?.total ?? slips.length ?? 0),
      page: Number(response?.page ?? params?.page ?? 1),
      limit: Number(response?.limit ?? params?.limit ?? slips.length ?? 0),
    };
  },

  approveSlip: async (id: string, approval_notes?: string): Promise<{ message: string }> => {
    // Update status to approved
    return api.patch<{ message: string }>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.UPDATE(id), { 
      status: 'approved',
      description: approval_notes ? `${approval_notes}` : undefined
    });
  },

  completeSlip: async (id: string, export_notes?: string): Promise<{ message: string }> => {
    // Update status to completed
    return api.patch<{ message: string }>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.UPDATE(id), { 
      status: 'completed',
      description: export_notes ? `${export_notes}` : undefined
    });
  },
};


