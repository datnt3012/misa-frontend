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
  warehouse_id?: string;
  warehouse_name?: string;
  status: 'pending' | 'approved' | 'rejected' | 'picked' | 'exported' | 'cancelled'; // Status values including approved/rejected
  notes?: string;
  approval_notes?: string;
  export_notes?: string;
  created_at: string;
  approved_at?: string;
  picked_at?: string;
  exported_at?: string;
  created_by: string;
  approved_by?: string;
  picked_by?: string;
  exported_by?: string;
  export_slip_items?: ExportSlipItem[];
  order?: {
    order_number: string;
    contract_code: string;
    customer_name: string;
    customer_address?: string;
    customer_phone?: string;
    customer_addressInfo?: {
      provinceCode?: string;
      districtCode?: string;
      wardCode?: string;
      province?: { code?: string; name?: string; };
      district?: { code?: string; name?: string; };
      ward?: { code?: string; name?: string; };
      provinceName?: string;
      districtName?: string;
      wardName?: string;
    };
    total_amount: number;
    order_items?: Array<{
      product_name: string;
      product_code: string;
      quantity: number;
      unit_price: number;
      total_price?: number;
    }>;
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
const normalizeItem = (it: any): ExportSlipItem => {
  // Thử nhiều cách để lấy product_id
  const productId = it.productId 
    ?? it.product_id 
    ?? it.product?.id 
    ?? '';
  
  if (!productId) {
    console.warn('Export slip item missing product_id:', it);
  }
  
  return {
    id: it.id || '',
    product_id: productId,
    product_name: it.productName ?? it.product_name ?? it.product?.name ?? '',
    product_code: it.productCode ?? it.product_code ?? it.product?.code ?? '',
    requested_quantity: Number(it.requestedQuantity ?? it.requested_quantity ?? 0),
    actual_quantity: Number(it.actualQuantity ?? it.actual_quantity ?? 0),
    remaining_quantity: Number(it.remainingQuantity ?? it.remaining_quantity ?? 0),
    unit_price: Number(it.unitPrice ?? it.unit_price ?? 0),
  };
};
const normalize = (row: any): ExportSlip => {
  return {
    id: row.id || '',
    code: row.code ?? row.slip_number ?? '',
    order_id: row.orderId ?? row.order_id ?? '',
    warehouse_id: row.warehouseId ?? row.warehouse_id ?? row.warehouse?.id ?? undefined,
    warehouse_name: row.warehouse?.name ?? row.warehouseName ?? row.warehouse_name ?? undefined,
    status: row.status ?? 'pending',
    notes: row.description ?? row.notes ?? undefined,
    approval_notes: row.approval_notes ?? row.approvalNotes ?? undefined,
    export_notes: row.export_notes ?? row.exportNotes ?? undefined,
    created_at: row.createdAt ?? row.created_at ?? '',
    approved_at: row.approved_at ?? row.approvedAt ?? undefined,
    picked_at: row.picked_at ?? row.pickedAt ?? undefined,
    exported_at: row.exported_at ?? row.exportedAt ?? undefined,
    created_by: row.created_by ?? row.createdBy ?? '',
    approved_by: row.approved_by ?? row.approvedBy ?? undefined,
    picked_by: row.picked_by ?? row.pickedBy ?? undefined,
    exported_by: row.exported_by ?? row.exportedBy ?? undefined,
    export_slip_items: Array.isArray(row.details)
      ? row.details.map((detail: any) => {
          // Thử nhiều cách để lấy product_id
          const productId = detail.productId 
            ?? detail.product_id 
            ?? detail.product?.id 
            ?? detail.productId 
            ?? '';
          
          if (!productId) {
            console.warn('Export slip detail missing product_id:', detail);
          }
          
          return {
            id: detail.id || '',
            product_id: productId,
            product_name: detail.product?.name ?? detail.product_name ?? '',
            product_code: detail.product?.code ?? detail.product_code ?? '',
            requested_quantity: Number(detail.quantity ?? 0),
            actual_quantity: Number(detail.quantity ?? 0), // Same as requested for now
            remaining_quantity: 0, // Not available in warehouse receipts
            unit_price: Number(detail.unitPrice ?? detail.unit_price ?? 0),
          };
        })
      : Array.isArray(row.export_slip_items)
        ? row.export_slip_items.map(normalizeItem)
        : [],
    order: row.order ? {
      order_number: row.order.order_number ?? row.order.orderNumber ?? '',
      contract_code: row.order.contract_code ?? row.order.contractCode ?? '',
      customer_name: row.order.customer_name ?? row.order.customerName ?? row.order.customer?.name ?? '',
      customer_address: row.order.customer_address ?? row.order.customerAddress ?? row.order.customer?.address ?? undefined,
      customer_phone: row.order.customer_phone ?? row.order.customerPhone ?? row.order.customer?.phone ?? undefined,
      customer_addressInfo: (() => {
        const ai = row.order.customer_addressInfo || row.order.customerAddressInfo || row.order.customer?.addressInfo || row.order.customer?.address_info;
        if (!ai) return undefined;
        return {
          provinceCode: ai.provinceCode ?? ai.province_code ?? ai.province?.code,
          districtCode: ai.districtCode ?? ai.district_code ?? ai.district?.code,
          wardCode: ai.wardCode ?? ai.ward_code ?? ai.ward?.code,
          province: ai.province,
          district: ai.district,
          ward: ai.ward,
          provinceName: ai.province?.name ?? ai.provinceName,
          districtName: ai.district?.name ?? ai.districtName,
          wardName: ai.ward?.name ?? ai.wardName,
        };
      })(),
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
    creator_profile: row.creator_profile ?? row.creatorProfile ?? undefined,
    approver_profile: row.approver_profile ?? row.approverProfile ?? undefined,
    picker_profile: row.picker_profile ?? row.pickerProfile ?? undefined,
    exporter_profile: row.exporter_profile ?? row.exporterProfile ?? undefined,
  };
};
export interface CreateExportSlipRequest {
  order_id: string;
  warehouse_id: string;
  supplier_id: string;
  code: string;
  notes?: string;
  items: Array<{
    product_id: string;
    requested_quantity: number;
    unit_price: number;
    warehouse_id?: string;
  }>;
}
export const exportSlipsApi = {
  // Create new export slip
  createSlip: async (data: CreateExportSlipRequest): Promise<ExportSlip> => {
    const slipData = {
      warehouseId: data.warehouse_id,
      supplierId: data.supplier_id,
      orderId: data.order_id,
      code: data.code,
      type: 'export',
      status: 'pending',
      description: data.notes || 'Export slip',
      details: data.items.map(item => ({
        productId: item.product_id,
        quantity: item.requested_quantity,
        unitPrice: item.unit_price.toString(),
        warehouseId: item.warehouse_id || data.warehouse_id // Use item warehouse_id if available, fallback to main warehouse_id
      }))
    };
    const response = await api.post<any>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.CREATE, slipData);
    return normalize(response.data || response);
  },
  getSlips: async (params?: { page?: number; limit?: number; status?: string; search?: string; orderId?: string }): Promise<{ slips: ExportSlip[]; total: number; page: number; limit: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('keyword', params.search);
    if (params?.orderId) queryParams.append('orderId', params.orderId);
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
  // Get a single export slip by ID
  getSlip: async (id: string): Promise<ExportSlip> => {
    const response = await api.get<any>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.UPDATE(id));
    const data = response?.data || response;
    return normalize(data);
  },
  getSlipByOrderId: async (orderId: string): Promise<ExportSlip | null> => {
    try {
      // Try to get all export slips with pagination
      let page = 1;
      let foundSlip = null;
      while (!foundSlip) {
        const response = await exportSlipsApi.getSlips({ page, limit: 100 });
        foundSlip = response.slips.find(slip => slip.order_id === orderId);
        if (foundSlip) {
          break;
        }
        // If we got fewer slips than requested, we've reached the end
        if (response.slips.length < 100) {
          break;
        }
        page++;
        // Safety check to prevent infinite loop
        if (page > 10) {
          break;
        }
      }
      return foundSlip || null;
    } catch (error) {
      return null;
    }
  },
  approveSlip: async (id: string, approval_notes?: string): Promise<{ message: string }> => {
    // Update status to approved
    return api.patch<{ message: string }>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.APPROVE(id), { 
      approvalNotes: approval_notes
    });
  },
  rejectSlip: async (id: string, notes?: string): Promise<{ message: string }> => {
    // Update status to rejected
    return api.patch<{ message: string }>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.UPDATE(id), { 
      status: 'rejected',
      description: notes
    });
  },
  completeSlip: async (id: string, export_notes?: string): Promise<{ message: string }> => {
    // Update status to completed
    return api.patch<{ message: string }>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.UPDATE(id), { 
      status: 'completed',
      description: export_notes
    });
  },
  // Mark as picked (thủ kho xác nhận đã lấy hàng)
  markAsPicked: async (id: string, export_notes?: string): Promise<{ message: string }> => {
    return api.patch<{ message: string }>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.UPDATE(id), { 
      status: 'picked',
      description: export_notes
    });
  },
  // Mark as exported (hàng đã rời khỏi kho)
  markAsExported: async (id: string, export_notes?: string): Promise<{ message: string }> => {
    return api.patch<{ message: string }>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.UPDATE(id), { 
      status: 'exported',
      description: export_notes
    });
  },
  // Direct transition from pending to exported (Admin/Giám đốc only)
  directExport: async (id: string, export_notes?: string): Promise<{ message: string }> => {
    return api.patch<{ message: string }>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.UPDATE(id), { 
      status: 'exported',
      description: export_notes
    });
  },
  // Mark as cancelled (hủy lấy hàng)
  markAsCancelled: async (id: string, notes?: string): Promise<{ message: string }> => {
    return api.patch<{ message: string }>(API_ENDPOINTS.WAREHOUSE_RECEIPTS.UPDATE(id), { 
      status: 'cancelled',
      description: notes
    });
  },
};