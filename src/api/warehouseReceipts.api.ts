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
  items?: WarehouseReceiptItem[];
}

export const warehouseReceiptsApi = {
  getReceipts: async (params?: { page?: number; limit?: number; search?: string; warehouse_id?: string; status?: string }): Promise<{ receipts: WarehouseReceipt[]; total: number; page: number; limit: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.search) queryParams.append('search', params.search);
    if (params?.warehouse_id) queryParams.append('warehouse_id', params.warehouse_id);
    if (params?.status) queryParams.append('status', params.status);

    const url = queryParams.toString()
      ? `${API_ENDPOINTS.WAREHOUSE_RECEIPTS.LIST}?${queryParams.toString()}`
      : API_ENDPOINTS.WAREHOUSE_RECEIPTS.LIST;

    const response = await api.get<any>(url);
    const data = response?.data || response;

    const normalize = (row: any): WarehouseReceipt => ({
      id: row.id,
      code: row.code ?? row.slip_number ?? '',
      warehouse_id: row.warehouseId ?? row.warehouse_id ?? '',
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

    if (data && Array.isArray(data.rows)) {
      return {
        receipts: data.rows.map(normalize),
        total: Number(data.count ?? data.rows.length ?? 0),
        page: Number(data.page ?? params?.page ?? 1),
        limit: Number(data.limit ?? params?.limit ?? data.rows.length ?? 0),
      };
    }

    return {
      receipts: (response?.receipts || []).map(normalize),
      total: Number(response?.total ?? 0),
      page: Number(response?.page ?? params?.page ?? 1),
      limit: Number(response?.limit ?? params?.limit ?? 0),
    };
  },
};


