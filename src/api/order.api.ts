import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  status: 'draft' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  order_type: 'sale' | 'return';
  total_amount: number;
  paid_amount: number;
  debt_amount: number;
  debt_date?: string;
  notes?: string;
  contract_number?: string;
  contract_url?: string;
  purchase_order_number?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  creator_info?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  tags?: string[];
}

export interface CreateOrderRequest {
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  order_type: 'sale' | 'return';
  notes?: string;
  contract_number?: string;
  purchase_order_number?: string;
  // VAT Information
  vat_tax_code?: string;
  vat_company_name?: string;
  vat_company_address?: string;
  vat_invoice_email?: string;
  // Shipping Information
  shipping_recipient_name?: string;
  shipping_recipient_phone?: string;
  shipping_address?: string;
  // Payment Information
  initial_payment?: number;
  initial_payment_method?: string;
  initial_payment_bank?: string;
  // Tags
  tags?: string[];
  items: {
    product_id: string;
    product_name: string;
    product_code: string;
    quantity: number;
    unit_price: number;
  }[];
}

export interface UpdateOrderRequest {
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  status?: 'draft' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  order_type?: 'sale' | 'return';
  paid_amount?: number;
  debt_amount?: number;
  debt_date?: string;
  notes?: string;
  contract_number?: string;
  purchase_order_number?: string;
  tags?: string[];
}

export interface CreateOrderItemRequest {
  product_id: string;
  product_name: string;
  product_code: string;
  quantity: number;
  unit_price: number;
}

export const orderApi = {
  // Get all orders
  getOrders: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    customer_id?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{ orders: Order[]; total: number; page: number; limit: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.customer_id) queryParams.append('customer_id', params.customer_id);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    const url = queryParams.toString() 
      ? `${API_ENDPOINTS.ORDERS.LIST}?${queryParams.toString()}`
      : API_ENDPOINTS.ORDERS.LIST;

    const response = await api.get<any>(url);
    const data = response?.data || response;
    
    // Debug: Log raw response to see tags structure
    if (data && data.rows && data.rows.length > 0) {
      console.log('🔍 Raw order API response (first order):', {
        order_id: data.rows[0].id,
        tags: data.rows[0].tags,
        tag_names: data.rows[0].tags || [],
        all_keys: Object.keys(data.rows[0])
      });
    }

    const normalizeItem = (it: any) => ({
      id: it.id,
      order_id: it.order_id ?? it.orderId ?? '',
      product_id: it.product?.id ?? it.productId ?? it.product_id ?? '',
      product_name: it.product?.name ?? it.productName ?? it.product_name ?? '',
      product_code: it.product?.code ?? it.productCode ?? it.product_code ?? '',
      quantity: Number(it.quantity ?? 0),
      unit_price: Number(it.unitPrice ?? it.unit_price ?? 0),
      total_price: Number(it.totalPrice ?? it.total_price ?? 0),
      created_at: it.created_at ?? it.createdAt ?? '',
    });

    const normalizeOrder = (row: any): Order => ({
      id: row.id,
      order_number: row.order_number ?? row.orderNumber ?? row.code ?? '',
      customer_id: row.customer?.id ?? row.customer_id ?? row.customerId ?? '',
      customer_name: row.customer?.name ?? row.customer_name ?? '',
      customer_phone: row.customer?.phoneNumber ?? row.customer?.phone ?? row.customer_phone ?? '',
      customer_address: row.customer?.address ?? row.customer_address ?? '',
      status: row.status ?? 'draft',
      order_type: row.order_type ?? row.type ?? 'sale',
      total_amount: Number(row.total_amount ?? row.totalAmount ?? 0),
      paid_amount: Number(row.paid_amount ?? row.paidAmount ?? 0),
      debt_amount: Number(row.debt_amount ?? row.debtAmount ?? 0),
      notes: row.notes ?? row.note ?? row.description ?? '',
      contract_number: row.contract_number ?? row.contractNumber ?? undefined,
      purchase_order_number: row.purchase_order_number ?? row.purchaseOrderNumber ?? undefined,
      created_by: row.creator?.id ?? row.created_by ?? row.createdBy ?? '',
      creator_info: row.creator ? {
        id: row.creator.id,
        email: row.creator.email,
        firstName: row.creator.firstName,
        lastName: row.creator.lastName,
      } : undefined,
      tags: Array.isArray(row.tags) ? row.tags : undefined,
      created_at: row.created_at ?? row.createdAt ?? '',
      updated_at: row.updated_at ?? row.updatedAt ?? '',
      items: Array.isArray(row.details)
        ? row.details.map(normalizeItem)
        : Array.isArray(row.items)
          ? row.items.map(normalizeItem)
          : Array.isArray(row.order_items)
            ? row.order_items.map(normalizeItem)
            : [],
      customer: row.customer ? {
        id: row.customer.id,
        name: row.customer.name,
        email: row.customer.email,
        phone: row.customer.phoneNumber ?? row.customer.phone,
      } : undefined,
    } as Order);

    if (data && Array.isArray(data.rows)) {
      return {
        orders: data.rows.map(normalizeOrder),
        total: Number(data.count ?? data.rows.length ?? 0),
        page: Number(data.page ?? params?.page ?? 1),
        limit: Number(data.limit ?? params?.limit ?? data.rows.length ?? 0),
      };
    }

    const orders = (response?.orders || []).map(normalizeOrder);
    return {
      orders,
      total: Number(response?.total ?? orders.length ?? 0),
      page: Number(response?.page ?? params?.page ?? 1),
      limit: Number(response?.limit ?? params?.limit ?? orders.length ?? 0),
    };
  },

  // Get order by ID
  getOrder: async (id: string): Promise<Order> => {
    const response = await api.get<any>(`${API_ENDPOINTS.ORDERS.LIST}/${id}`);
    const data = response?.data || response;

    const normalizeItem = (it: any) => ({
      id: it.id,
      order_id: it.order_id ?? it.orderId ?? '',
      product_id: it.product?.id ?? it.productId ?? it.product_id ?? '',
      product_name: it.product?.name ?? it.productName ?? it.product_name ?? '',
      product_code: it.product?.code ?? it.productCode ?? it.product_code ?? '',
      quantity: Number(it.quantity ?? 0),
      unit_price: Number(it.unitPrice ?? it.unit_price ?? 0),
      total_price: Number(it.totalPrice ?? it.total_price ?? 0),
      created_at: it.created_at ?? it.createdAt ?? '',
    });

    const normalizeOrder = (row: any): Order => ({
      id: row.id,
      order_number: row.order_number ?? row.orderNumber ?? row.code ?? '',
      customer_id: row.customer?.id ?? row.customer_id ?? row.customerId ?? '',
      customer_name: row.customer?.name ?? row.customer_name ?? '',
      customer_phone: row.customer?.phoneNumber ?? row.customer?.phone ?? row.customer_phone ?? '',
      customer_address: row.customer?.address ?? row.customer_address ?? '',
      status: row.status ?? 'draft',
      order_type: row.order_type ?? row.type ?? 'sale',
      total_amount: Number(row.total_amount ?? row.totalAmount ?? 0),
      paid_amount: Number(row.paid_amount ?? row.paidAmount ?? 0),
      debt_amount: Number(row.debt_amount ?? row.debtAmount ?? 0),
      notes: row.notes ?? row.note ?? row.description ?? '',
      contract_number: row.contract_number ?? row.contractNumber ?? undefined,
      purchase_order_number: row.purchase_order_number ?? row.purchaseOrderNumber ?? undefined,
      created_by: row.creator?.id ?? row.created_by ?? row.createdBy ?? '',
      creator_info: row.creator ? {
        id: row.creator.id,
        email: row.creator.email,
        firstName: row.creator.firstName,
        lastName: row.creator.lastName,
      } : undefined,
      tags: Array.isArray(row.tags) ? row.tags : undefined,
      created_at: row.created_at ?? row.createdAt ?? '',
      updated_at: row.updated_at ?? row.updatedAt ?? '',
      items: Array.isArray(row.details)
        ? row.details.map(normalizeItem)
        : Array.isArray(row.items)
          ? row.items.map(normalizeItem)
          : Array.isArray(row.order_items)
            ? row.order_items.map(normalizeItem)
            : [],
      customer: row.customer ? {
        id: row.customer.id,
        name: row.customer.name,
        email: row.customer.email,
        phone: row.customer.phoneNumber ?? row.customer.phone,
      } : undefined,
    });

    return normalizeOrder(data);
  },

  // Create order
  createOrder: async (data: CreateOrderRequest): Promise<Order> => {
    return api.post<Order>(API_ENDPOINTS.ORDERS.CREATE, data);
  },

  // Update order
  updateOrder: async (id: string, data: UpdateOrderRequest): Promise<Order> => {
    try {
      const response = await api.patch<Order>(API_ENDPOINTS.ORDERS.UPDATE(id), data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete order
  deleteOrder: async (id: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(API_ENDPOINTS.ORDERS.DELETE(id));
  },

  // Get order items
  getOrderItems: async (orderId: string): Promise<OrderItem[]> => {
    return api.get<OrderItem[]>(API_ENDPOINTS.ORDERS.ITEMS(orderId));
  },

  // Add item to order
  addOrderItem: async (orderId: string, data: CreateOrderItemRequest): Promise<OrderItem> => {
    return api.post<OrderItem>(API_ENDPOINTS.ORDERS.ITEMS(orderId), data);
  },

  // Update order item
  updateOrderItem: async (orderId: string, itemId: string, data: Partial<CreateOrderItemRequest>): Promise<OrderItem> => {
    return api.patch<OrderItem>(`${API_ENDPOINTS.ORDERS.ITEMS(orderId)}/${itemId}`, data);
  },

  // Delete order item
  deleteOrderItem: async (orderId: string, itemId: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`${API_ENDPOINTS.ORDERS.ITEMS(orderId)}/${itemId}`);
  }
};
