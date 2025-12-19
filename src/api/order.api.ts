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
  vat_rate?: number;
  vat_amount?: number;
  created_at: string;
}
export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_code?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
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
  status: 'new' | 'pending' | 'picking' | 'picked' | 'delivered' | 'delivery_failed' | 'completed' | 'cancelled';
  order_type: 'sale' | 'return';
  total_amount: number;
  // Aggregated summary fields from backend (already include expenses)
  totalAmount?: number;
  totalPaidAmount?: number;
  remainingDebt?: number;
  totalExpenses?: number;
  initial_payment?: number;
  payment_method?: string;
  paid_amount: number;
  debt_amount: number;
  debt_date?: string;
  paymentDeadline?: string;
  notes?: string;
  vat_type?: string;
  vat_rate?: number;
  vat_amount?: number;
  contract_number?: string;
  contract_url?: string;
  purchase_order_number?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  items?: OrderItem[];
  customer?: {
    id: string;
    code?: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    addressInfo?: any;
  };
  creator_info?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  creator?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    phoneNumber?: string | null;
    avatarUrl?: string | null;
  };
  tags?: string[];
  order_items?: OrderItem[];
  addressInfo?: {
    provinceCode?: string;
    districtCode?: string;
    wardCode?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    province?: { code?: string; name?: string; };
    district?: { code?: string; name?: string; };
    ward?: { code?: string; name?: string; };
  };
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  payment_status?: string;
  // Completion timestamp when order reached completed/delivered status
  completed_at?: string;
  // VAT company information
  taxCode?: string;
  companyName?: string;
  companyAddress?: string;
  vatEmail?: string;
  companyPhone?: string;
  expenses?: Array<{ name: string; amount: number; note?: string | null }>;
}
export interface CreateOrderRequest {
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerAddressInfo?: {
    provinceCode?: string;
    districtCode?: string;
    wardCode?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  };
  code?: string;
  note?: string;
  status?: string;
  orderType?: string;
  // VAT Information
  vatRate?: number; // VAT rate (optional, nếu không có sẽ lấy từ customer)
  taxCode?: string;
  companyName?: string;
  companyAddress?: string;
  vatEmail?: string;
  companyPhone?: string;
  // Receiver Information
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  addressInfo?: {
    provinceCode?: string;
    districtCode?: string;
    wardCode?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  };
  // Payment
  paymentMethod: string;
  initialPayment?: number;
  totalAmount: number;
  bank?: string; // Bank ID or code when payment method is bank_transfer
  paymentDeadline?: string; // YYYY-MM-DD
  // Order details
  details: {
    productId: string;
    warehouseId: string;
    quantity: number;
    unitPrice: number;
  }[];
  // Additional expenses
  expenses?: {
    name: string;
    amount: number;
    note?: string;
  }[];
  // Optional fields
  description?: string;
  tags?: string[];
  isDeleted?: boolean;
  contractNumber?: string;
  purchaseOrderNumber?: string;
}
export interface UpdateOrderRequest {
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_addressInfo?: {
    provinceCode?: string;
    districtCode?: string;
    wardCode?: string;
  };
  receiver_address?: string;
  receiver_addressInfo?: {
    provinceCode?: string;
    districtCode?: string;
    wardCode?: string;
  };
  status?: 'new' | 'pending' | 'picking' | 'picked' | 'delivered' | 'delivery_failed' | 'completed' | 'cancelled';
  order_type?: 'sale' | 'return';
  initialPayment?: number;
  paid_amount?: number;
  debt_amount?: number;
  debt_date?: string;
  note?: string;
  contract_number?: string;
  purchase_order_number?: string;
  tags?: string[];
  // VAT company information
  taxCode?: string;
  companyName?: string;
  companyAddress?: string;
  vatEmail?: string;
  companyPhone?: string;
  // Replace full expenses array when updating
  expenses?: {
    name: string;
    amount: number;
    note?: string;
  }[];
  paymentDeadline?: string; // YYYY-MM-DD
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
    customerId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    completedStartDate?: string;
    completedEndDate?: string;
    start_date?: string;
    end_date?: string;
    minTotalAmount?: number;
    maxTotalAmount?: number;
    categories?: string | string[];
    paymentMethods?: string | string[];
    region?: 'north' | 'central' | 'south';
    includeDeleted?: boolean;
    productIds?: string | string[];
  }): Promise<{
    orders: Order[]; 
    total: number; 
    page: number; 
    limit: number;
    summary?: {
      totalAmount: number;
      totalInitialPayment: number;
      totalDebt: number;
      totalExpenses: number;
    };
  }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.customer_id) queryParams.append('customerId', params.customer_id);
    if (params?.customerId) queryParams.append('customerId', params.customerId);
    if (params?.search) queryParams.append('keyword', params.search);
    // Backend DTO expects camelCase: startDate, endDate
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    // Completed date range (deliveredAt/completedAt) if supported by backend
    if (params?.completedStartDate) queryParams.append('completedStartDate', params.completedStartDate);
    if (params?.completedEndDate) queryParams.append('completedEndDate', params.completedEndDate);
    // Legacy support for snake_case
    if (params?.start_date && !params?.startDate) queryParams.append('startDate', params.start_date);
    if (params?.end_date && !params?.endDate) queryParams.append('endDate', params.end_date);
    if (params?.minTotalAmount !== undefined) queryParams.append('minTotalAmount', params.minTotalAmount.toString());
    if (params?.maxTotalAmount !== undefined) queryParams.append('maxTotalAmount', params.maxTotalAmount.toString());
    // Categories filter: support CSV or array syntax per backend
    if (params?.categories) {
      if (Array.isArray(params.categories)) {
        params.categories.forEach((id) => queryParams.append('categories[]', String(id)));
      } else if (typeof params.categories === 'string') {
        if (params.categories.includes(',')) {
          queryParams.append('categories', params.categories);
        } else {
          queryParams.append('categories', params.categories);
        }
      }
    }
    // Payment methods filter: support CSV or array syntax per backend
    if (params?.paymentMethods) {
      if (Array.isArray(params.paymentMethods)) {
        params.paymentMethods.forEach((m) => queryParams.append('paymentMethods[]', String(m)));
      } else if (typeof params.paymentMethods === 'string') {
        if (params.paymentMethods.includes(',')) {
          queryParams.append('paymentMethods', params.paymentMethods);
        } else {
          queryParams.append('paymentMethods', params.paymentMethods);
        }
      }
    }
    // Region filter
    if (params?.region) {
      queryParams.append('region', params.region);
    }
    // Product IDs filter: support CSV or array syntax per backend
    if (params?.productIds) {
      if (Array.isArray(params.productIds)) {
        params.productIds.forEach((id) => queryParams.append('productIds[]', String(id)));
      } else if (typeof params.productIds === 'string') {
        if (params.productIds.includes(',')) {
          queryParams.append('productIds', params.productIds);
        } else {
          queryParams.append('productIds', params.productIds);
        }
      }
    }
    if (params?.includeDeleted) queryParams.append('includeDeleted', 'true');
    const url = queryParams.toString() 
      ? `${API_ENDPOINTS.ORDERS.LIST}?${queryParams.toString()}`
      : API_ENDPOINTS.ORDERS.LIST;
    const response = await api.get<any>(url);
    // Handle different response structures:
    // Structure 1: { code: 200, data: { rows: [], summary: {} } }
    // Structure 2: { rows: [], summary: {} }
    const data = response?.data || response;
    const normalizeItem = (it: any) => ({
      id: it.id,
      order_id: it.order_id ?? it.orderId ?? '',
      product_id: it.product?.id ?? it.productId ?? it.product_id ?? '',
      product_name: it.product?.name ?? it.productName ?? it.product_name ?? '',
      product_code: it.product?.code ?? it.productCode ?? it.product_code ?? '',
      // category helpers for dashboard aggregations
      category_id: it.product?.categoryId ?? it.categoryId ?? it.category_id ?? undefined,
      category_name: (typeof it.product?.category === 'string' ? it.product?.category : it.product?.category?.name) ?? it.categoryName ?? it.category_name ?? undefined,
      quantity: Number(it.quantity ?? 0),
      unit_price: Number(it.unitPrice ?? it.unit_price ?? 0),
      total_price: Number(it.totalPrice ?? it.total_price ?? 0),
      vat_rate: (() => {
        const vatRateValue = it.vat_rate ?? it.vatRate;
        if (vatRateValue === undefined || vatRateValue === null || vatRateValue === '') {
          return undefined;
        }
        const numValue = typeof vatRateValue === 'string' ? parseFloat(vatRateValue) : Number(vatRateValue);
        return isNaN(numValue) ? undefined : numValue;
      })(),
      vat_amount: (() => {
        const vatAmountValue = it.vat_amount ?? it.vatAmount;
        if (vatAmountValue === undefined || vatAmountValue === null || vatAmountValue === '') {
          return undefined;
        }
        const numValue = typeof vatAmountValue === 'string' ? parseFloat(vatAmountValue) : Number(vatAmountValue);
        return isNaN(numValue) ? undefined : numValue;
      })(),
      created_at: it.created_at ?? it.createdAt ?? '',
    });
    const normalizeOrder = (row: any): Order => ({
      id: row.id,
      order_number: row.order_number ?? row.orderNumber ?? row.code ?? '',
      customer_id: row.customer?.id ?? row.customer_id ?? row.customerId ?? '',
      customer_name: row.customer?.name ?? row.customer_name ?? '',
      customer_code: row.customer?.code ?? row.customer_code ?? row.customerCode ?? undefined,
      customer_phone: row.customer?.phoneNumber ?? row.customer?.phone ?? row.customer_phone ?? '',
      customer_address: row.customer?.address ?? row.customer_address ?? '',
      // receiver fields (kept as extra props on the returned object)
      ...(row.receiverName || row.receiver_name ? { receiverName: row.receiverName ?? row.receiver_name } : {} as any),
      ...(row.receiverPhone || row.receiver_phone ? { receiverPhone: row.receiverPhone ?? row.receiver_phone } : {} as any),
      ...(row.receiverAddress || row.receiver_address ? { receiverAddress: row.receiverAddress ?? row.receiver_address } : {} as any),
      ...(row.addressInfo || row.receiver_address_info ? { addressInfo: ((): any => {
        const ai = row.addressInfo ?? row.receiver_address_info;
        if (!ai) return undefined;
        return {
          provinceCode: (ai.provinceCode ?? ai.province_code ?? ai.province?.code) ? String(ai.provinceCode ?? ai.province_code ?? ai.province?.code) : undefined,
          districtCode: (ai.districtCode ?? ai.district_code ?? ai.district?.code) ? String(ai.districtCode ?? ai.district_code ?? ai.district?.code) : undefined,
          wardCode: (ai.wardCode ?? ai.ward_code ?? ai.ward?.code) ? String(ai.wardCode ?? ai.ward_code ?? ai.ward?.code) : undefined,
          province: ai.province,
          district: ai.district,
          ward: ai.ward,
          provinceName: ai.province?.name,
          districtName: ai.district?.name,
          wardName: ai.ward?.name,
        };
      })() } : {} as any),
      customer_addressInfo: (() => {
        const ai = row.customer_address_info || row.customerAddressInfo || row.customer?.addressInfo || row.customer?.address_info || row.addressInfo;
        if (!ai) return undefined;
        return {
          provinceCode: (ai.provinceCode ?? ai.province_code ?? ai.province?.code) ? String(ai.provinceCode ?? ai.province_code ?? ai.province?.code) : undefined,
          districtCode: (ai.districtCode ?? ai.district_code ?? ai.district?.code) ? String(ai.districtCode ?? ai.district_code ?? ai.district?.code) : undefined,
          wardCode: (ai.wardCode ?? ai.ward_code ?? ai.ward?.code) ? String(ai.wardCode ?? ai.ward_code ?? ai.ward?.code) : undefined,
          province: ai.province,
          district: ai.district,
          ward: ai.ward,
          provinceName: ai.province?.name ?? ai.provinceName,
          districtName: ai.district?.name ?? ai.districtName,
          wardName: ai.ward?.name ?? ai.wardName,
        };
      })(),
      status: row.status ?? 'new',
      order_type: row.order_type ?? row.type ?? 'sale',
      total_amount: Number(row.total_amount ?? row.totalAmount ?? 0),
      totalAmount: Number(row.totalAmount ?? row.total_amount ?? 0),
      totalPaidAmount: Number(row.totalPaidAmount ?? row.total_paid_amount ?? row.paid_amount ?? row.paidAmount ?? 0),
      remainingDebt: Number(row.remainingDebt ?? row.remaining_debt ?? row.debt_amount ?? row.debtAmount ?? 0),
      totalExpenses: Number(row.totalExpenses ?? row.total_expenses ?? 0),
      initial_payment: Number(row.initial_payment ?? row.initialPayment ?? 0) || undefined,
      payment_method: row.payment_method ?? row.paymentMethod ?? undefined,
      paid_amount: Number(row.paid_amount ?? row.paidAmount ?? 0),
      debt_amount: Number(row.debt_amount ?? row.debtAmount ?? 0),
      notes: row.notes ?? row.note ?? row.description ?? '',
      vat_type: row.vat_type ?? row.vatType ?? undefined,
      vat_rate: (() => {
        const vatRateValue = row.vat_rate ?? row.vatRate;
        if (vatRateValue === undefined || vatRateValue === null || vatRateValue === '') {
          return undefined;
        }
        const numValue = typeof vatRateValue === 'string' ? parseFloat(vatRateValue) : Number(vatRateValue);
        return isNaN(numValue) ? undefined : numValue;
      })(),
      vat_amount: (() => {
        const vatAmountValue = row.vat_amount ?? row.vatAmount;
        if (vatAmountValue === undefined || vatAmountValue === null || vatAmountValue === '') {
          return undefined;
        }
        const numValue = typeof vatAmountValue === 'string' ? parseFloat(vatAmountValue) : Number(vatAmountValue);
        return isNaN(numValue) ? undefined : numValue;
      })(),
      contract_number: row.contract_number ?? row.contractNumber ?? undefined,
      purchase_order_number: row.purchase_order_number ?? row.purchaseOrderNumber ?? undefined,
      paymentDeadline: row.paymentDeadline ?? row.payment_deadline ?? undefined,
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
      completed_at: row.completed_at ?? row.completedAt ?? row.delivered_at ?? row.deliveredAt ?? undefined,
      // VAT company information
      taxCode: row.taxCode ?? row.tax_code ?? row.vat_tax_code ?? undefined,
      companyName: row.companyName ?? row.company_name ?? row.vat_company_name ?? undefined,
      companyAddress: row.companyAddress ?? row.company_address ?? row.vat_company_address ?? undefined,
      vatEmail: row.vatEmail ?? row.vat_email ?? row.vat_invoice_email ?? undefined,
      companyPhone: row.companyPhone ?? row.company_phone ?? row.vat_company_phone ?? undefined,
      expenses: Array.isArray(row.expenses)
        ? row.expenses.map((exp: any) => ({
            name: String(exp.name ?? "").trim(),
            amount: Number(exp.amount ?? 0),
            note: exp.note ?? null,
          }))
        : undefined,
      items: Array.isArray(row.details)
        ? row.details.map(normalizeItem)
        : Array.isArray(row.items)
          ? row.items.map(normalizeItem)
          : Array.isArray(row.order_items)
            ? row.order_items.map(normalizeItem)
            : [],
      customer: row.customer ? {
        id: row.customer.id,
        code: row.customer.code,
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
        summary: data.summary ? {
          totalAmount: Number(data.summary.totalAmount || 0),
          totalInitialPayment: Number(data.summary.totalInitialPayment || 0),
          totalDebt: Number(data.summary.totalDebt || 0),
          totalExpenses: Number(data.summary.totalExpenses || 0),
        } : undefined,
      };
    }
    const orders = (response?.orders || []).map(normalizeOrder);
    return {
      orders,
      total: Number(response?.total ?? orders.length ?? 0),
      summary: data?.summary ? {
        totalAmount: Number(data.summary.totalAmount || 0),
        totalInitialPayment: Number(data.summary.totalInitialPayment || 0),
        totalDebt: Number(data.summary.totalDebt || 0),
        totalExpenses: Number(data.summary.totalExpenses || 0),
      } : undefined,
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
      category_id: it.product?.categoryId ?? it.categoryId ?? it.category_id ?? undefined,
      category_name: (typeof it.product?.category === 'string' ? it.product?.category : it.product?.category?.name) ?? it.categoryName ?? it.category_name ?? undefined,
      quantity: Number(it.quantity ?? 0),
      unit_price: Number(it.unitPrice ?? it.unit_price ?? 0),
      total_price: Number(it.totalPrice ?? it.total_price ?? 0),
      vat_rate: (() => {
        const vatRateValue = it.vat_rate ?? it.vatRate;
        if (vatRateValue === undefined || vatRateValue === null || vatRateValue === '') {
          return undefined;
        }
        const numValue = typeof vatRateValue === 'string' ? parseFloat(vatRateValue) : Number(vatRateValue);
        return isNaN(numValue) ? undefined : numValue;
      })(),
      vat_amount: (() => {
        const vatAmountValue = it.vat_amount ?? it.vatAmount;
        if (vatAmountValue === undefined || vatAmountValue === null || vatAmountValue === '') {
          return undefined;
        }
        const numValue = typeof vatAmountValue === 'string' ? parseFloat(vatAmountValue) : Number(vatAmountValue);
        return isNaN(numValue) ? undefined : numValue;
      })(),
      created_at: it.created_at ?? it.createdAt ?? '',
    });
    const normalizeOrder = (row: any): Order => ({
      id: row.id,
      order_number: row.order_number ?? row.orderNumber ?? row.code ?? '',
      customer_id: row.customer?.id ?? row.customer_id ?? row.customerId ?? '',
      customer_name: row.customer?.name ?? row.customer_name ?? '',
      customer_code: row.customer?.code ?? row.customer_code ?? row.customerCode ?? undefined,
      customer_phone: row.customer?.phoneNumber ?? row.customer?.phone ?? row.customer_phone ?? '',
      customer_address: row.customer?.address ?? row.customer_address ?? '',
      ...(row.receiverName || row.receiver_name ? { receiverName: row.receiverName ?? row.receiver_name } : {} as any),
      ...(row.receiverPhone || row.receiver_phone ? { receiverPhone: row.receiverPhone ?? row.receiver_phone } : {} as any),
      ...(row.receiverAddress || row.receiver_address ? { receiverAddress: row.receiverAddress ?? row.receiver_address } : {} as any),
      ...(row.addressInfo || row.receiver_address_info ? { addressInfo: ((): any => {
        const ai = row.addressInfo ?? row.receiver_address_info;
        if (!ai) return undefined;
        return {
          provinceCode: (ai.provinceCode ?? ai.province_code ?? ai.province?.code) ? String(ai.provinceCode ?? ai.province_code ?? ai.province?.code) : undefined,
          districtCode: (ai.districtCode ?? ai.district_code ?? ai.district?.code) ? String(ai.districtCode ?? ai.district_code ?? ai.district?.code) : undefined,
          wardCode: (ai.wardCode ?? ai.ward_code ?? ai.ward?.code) ? String(ai.wardCode ?? ai.ward_code ?? ai.ward?.code) : undefined,
          province: ai.province,
          district: ai.district,
          ward: ai.ward,
          provinceName: ai.province?.name,
          districtName: ai.district?.name,
          wardName: ai.ward?.name,
        };
      })() } : {} as any),
      customer_addressInfo: (() => {
        const ai = row.customer_address_info || row.customerAddressInfo || row.customer?.addressInfo || row.customer?.address_info || row.addressInfo;
        if (!ai) return undefined;
        return {
          provinceCode: (ai.provinceCode ?? ai.province_code ?? ai.province?.code) ? String(ai.provinceCode ?? ai.province_code ?? ai.province?.code) : undefined,
          districtCode: (ai.districtCode ?? ai.district_code ?? ai.district?.code) ? String(ai.districtCode ?? ai.district_code ?? ai.district?.code) : undefined,
          wardCode: (ai.wardCode ?? ai.ward_code ?? ai.ward?.code) ? String(ai.wardCode ?? ai.ward_code ?? ai.ward?.code) : undefined,
          province: ai.province,
          district: ai.district,
          ward: ai.ward,
          provinceName: ai.province?.name ?? ai.provinceName,
          districtName: ai.district?.name ?? ai.districtName,
          wardName: ai.ward?.name ?? ai.wardName,
        };
      })(),
      status: row.status ?? 'new',
      order_type: row.order_type ?? row.type ?? 'sale',
      total_amount: Number(row.total_amount ?? row.totalAmount ?? 0),
      totalAmount: Number(row.totalAmount ?? row.total_amount ?? 0),
      totalPaidAmount: Number(row.totalPaidAmount ?? row.total_paid_amount ?? row.paid_amount ?? row.paidAmount ?? 0),
      remainingDebt: Number(row.remainingDebt ?? row.remaining_debt ?? row.debt_amount ?? row.debtAmount ?? 0),
      totalExpenses: Number(row.totalExpenses ?? row.total_expenses ?? 0),
      initial_payment: Number(row.initial_payment ?? row.initialPayment ?? 0) || undefined,
      payment_method: row.payment_method ?? row.paymentMethod ?? undefined,
      paid_amount: Number(row.paid_amount ?? row.paidAmount ?? 0),
      debt_amount: Number(row.debt_amount ?? row.debtAmount ?? 0),
      notes: row.notes ?? row.note ?? row.description ?? '',
      vat_type: row.vat_type ?? row.vatType ?? undefined,
      vat_rate: (() => {
        const vatRateValue = row.vat_rate ?? row.vatRate;
        if (vatRateValue === undefined || vatRateValue === null || vatRateValue === '') {
          return undefined;
        }
        const numValue = typeof vatRateValue === 'string' ? parseFloat(vatRateValue) : Number(vatRateValue);
        return isNaN(numValue) ? undefined : numValue;
      })(),
      vat_amount: (() => {
        const vatAmountValue = row.vat_amount ?? row.vatAmount;
        if (vatAmountValue === undefined || vatAmountValue === null || vatAmountValue === '') {
          return undefined;
        }
        const numValue = typeof vatAmountValue === 'string' ? parseFloat(vatAmountValue) : Number(vatAmountValue);
        return isNaN(numValue) ? undefined : numValue;
      })(),
      contract_number: row.contract_number ?? row.contractNumber ?? undefined,
      purchase_order_number: row.purchase_order_number ?? row.purchaseOrderNumber ?? undefined,
      paymentDeadline: row.paymentDeadline ?? row.payment_deadline ?? undefined,
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
      completed_at: row.completed_at ?? row.completedAt ?? row.delivered_at ?? row.deliveredAt ?? undefined,
      // VAT company information
      taxCode: row.taxCode ?? row.tax_code ?? row.vat_tax_code ?? undefined,
      companyName: row.companyName ?? row.company_name ?? row.vat_company_name ?? undefined,
      companyAddress: row.companyAddress ?? row.company_address ?? row.vat_company_address ?? undefined,
      vatEmail: row.vatEmail ?? row.vat_email ?? row.vat_invoice_email ?? undefined,
      companyPhone: row.companyPhone ?? row.company_phone ?? row.vat_company_phone ?? undefined,
      expenses: Array.isArray(row.expenses)
        ? row.expenses.map((exp: any) => ({
            name: String(exp.name ?? "").trim(),
            amount: Number(exp.amount ?? 0),
            note: exp.note ?? null,
          }))
        : undefined,
      items: Array.isArray(row.details)
        ? row.details.map(normalizeItem)
        : Array.isArray(row.items)
          ? row.items.map(normalizeItem)
          : Array.isArray(row.order_items)
            ? row.order_items.map(normalizeItem)
            : [],
      customer: row.customer ? {
        id: row.customer.id,
        code: row.customer.code,
        name: row.customer.name,
        email: row.customer.email,
        phone: row.customer.phoneNumber ?? row.customer.phone,
      } : undefined,
    });
    const normalizedOrder = normalizeOrder(data);
    return normalizedOrder;
  },
  // Create order
  createOrder: async (data: CreateOrderRequest): Promise<Order> => {
    const response = await api.post<any>(API_ENDPOINTS.ORDERS.CREATE, data);
    // Normalize the response to ensure consistent field mapping
    const normalizeItem = (it: any) => ({
      id: it.id,
      order_id: it.order_id ?? it.orderId ?? '',
      product_id: it.product?.id ?? it.productId ?? it.product_id ?? '',
      product_name: it.product?.name ?? it.productName ?? it.product_name ?? '',
      product_code: it.product?.code ?? it.productCode ?? it.product_code ?? '',
      category_id: it.product?.categoryId ?? it.categoryId ?? it.category_id ?? undefined,
      category_name: (typeof it.product?.category === 'string' ? it.product?.category : it.product?.category?.name) ?? it.categoryName ?? it.category_name ?? undefined,
      quantity: Number(it.quantity ?? 0),
      unit_price: Number(it.unitPrice ?? it.unit_price ?? 0),
      total_price: Number(it.totalPrice ?? it.total_price ?? 0),
      vat_rate: (() => {
        const vatRateValue = it.vat_rate ?? it.vatRate;
        if (vatRateValue === undefined || vatRateValue === null || vatRateValue === '') {
          return undefined;
        }
        const numValue = typeof vatRateValue === 'string' ? parseFloat(vatRateValue) : Number(vatRateValue);
        return isNaN(numValue) ? undefined : numValue;
      })(),
      vat_amount: (() => {
        const vatAmountValue = it.vat_amount ?? it.vatAmount;
        if (vatAmountValue === undefined || vatAmountValue === null || vatAmountValue === '') {
          return undefined;
        }
        const numValue = typeof vatAmountValue === 'string' ? parseFloat(vatAmountValue) : Number(vatAmountValue);
        return isNaN(numValue) ? undefined : numValue;
      })(),
      created_at: it.created_at ?? it.createdAt ?? '',
    });
    const normalizeOrder = (row: any): Order => ({
      id: row.id,
      order_number: row.order_number ?? row.orderNumber ?? row.code ?? row.number ?? '',
      customer_id: row.customer?.id ?? row.customer_id ?? row.customerId ?? '',
      customer_name: row.customer?.name ?? row.customer_name ?? '',
      customer_code: row.customer?.code ?? row.customer_code ?? row.customerCode ?? undefined,
      customer_phone: row.customer?.phoneNumber ?? row.customer?.phone ?? row.customer_phone ?? '',
      customer_address: row.customer?.address ?? row.customer_address ?? '',
      customer_addressInfo: (() => {
        const ai = row.customer_address_info || row.customerAddressInfo || row.customer?.addressInfo || row.customer?.address_info || row.addressInfo;
        if (!ai) return undefined;
        return {
          provinceCode: (ai.provinceCode ?? ai.province_code ?? ai.province?.code) ? String(ai.provinceCode ?? ai.province_code ?? ai.province?.code) : undefined,
          districtCode: (ai.districtCode ?? ai.district_code ?? ai.district?.code) ? String(ai.districtCode ?? ai.district_code ?? ai.district?.code) : undefined,
          wardCode: (ai.wardCode ?? ai.ward_code ?? ai.ward?.code) ? String(ai.wardCode ?? ai.ward_code ?? ai.ward?.code) : undefined,
          province: ai.province,
          district: ai.district,
          ward: ai.ward,
          provinceName: ai.province?.name ?? ai.provinceName,
          districtName: ai.district?.name ?? ai.districtName,
          wardName: ai.ward?.name ?? ai.wardName,
        };
      })(),
      status: row.status ?? 'new',
      order_type: row.order_type ?? row.type ?? 'sale',
      total_amount: Number(row.total_amount ?? row.totalAmount ?? 0),
      initial_payment: Number(row.initial_payment ?? row.initialPayment ?? 0) || undefined,
      paid_amount: Number(row.paid_amount ?? row.paidAmount ?? 0),
      debt_amount: Number(row.debt_amount ?? row.debtAmount ?? 0),
      notes: row.notes ?? row.note ?? row.description ?? '',
      contract_number: row.contract_number ?? row.contractNumber ?? undefined,
      purchase_order_number: row.purchase_order_number ?? row.purchaseOrderNumber ?? undefined,
      paymentDeadline: row.paymentDeadline ?? row.payment_deadline ?? undefined,
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
        code: row.customer.code,
        name: row.customer.name,
        email: row.customer.email,
        phone: row.customer.phoneNumber ?? row.customer.phone,
      } : undefined,
      expenses: Array.isArray(row.expenses)
        ? row.expenses.map((exp: any) => ({
            name: String(exp.name ?? "").trim(),
            amount: Number(exp.amount ?? 0),
            note: exp.note ?? null,
          }))
        : undefined,
    } as Order);
    return normalizeOrder(response);
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
  // Update order status (requires ORDERS_UPDATE_STATUS permission)
  updateOrderStatus: async (id: string, status: string): Promise<Order> => {
    try {
      const response = await api.patch<Order>(API_ENDPOINTS.ORDERS.STATUS(id), { status });
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
  // Get order by ID including soft deleted orders
  getOrderIncludeDeleted: async (id: string): Promise<Order> => {
    const response = await api.get<any>(`${API_ENDPOINTS.ORDERS.LIST}/${id}?includeDeleted=true`);
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
      vat_rate: (() => {
        const vatRateValue = it.vat_rate ?? it.vatRate;
        if (vatRateValue === undefined || vatRateValue === null || vatRateValue === '') {
          return undefined;
        }
        const numValue = typeof vatRateValue === 'string' ? parseFloat(vatRateValue) : Number(vatRateValue);
        return isNaN(numValue) ? undefined : numValue;
      })(),
      vat_amount: (() => {
        const vatAmountValue = it.vat_amount ?? it.vatAmount;
        if (vatAmountValue === undefined || vatAmountValue === null || vatAmountValue === '') {
          return undefined;
        }
        const numValue = typeof vatAmountValue === 'string' ? parseFloat(vatAmountValue) : Number(vatAmountValue);
        return isNaN(numValue) ? undefined : numValue;
      })(),
      created_at: it.created_at ?? it.createdAt ?? '',
    });
    const normalizeOrder = (row: any): Order => ({
      id: row.id,
      order_number: row.order_number ?? row.orderNumber ?? row.code ?? '',
      customer_id: row.customerId ?? row.customer_id ?? '',
      customer_name: row.customer_name ?? row.customerName ?? row.customer?.name ?? '',
      customer_code: row.customer_code ?? row.customerCode ?? row.customer?.code ?? '',
      customer_phone: row.customer_phone ?? row.customerPhone ?? row.customer?.phoneNumber ?? '',
      customer_email: row.customer_email ?? row.customerEmail ?? row.customer?.email ?? '',
      customer_address: row.customer_address ?? row.customerAddress ?? row.customer?.address ?? '',
      customer_addressInfo: (() => {
        const ai = row.customer_address_info || row.customerAddressInfo || row.customer?.addressInfo || row.customer?.address_info || row.addressInfo;
        if (!ai) return undefined;
        return {
          provinceCode: (ai.provinceCode ?? ai.province_code ?? ai.province?.code) ? String(ai.provinceCode ?? ai.province_code ?? ai.province?.code) : undefined,
          districtCode: (ai.districtCode ?? ai.district_code ?? ai.district?.code) ? String(ai.districtCode ?? ai.district_code ?? ai.district?.code) : undefined,
          wardCode: (ai.wardCode ?? ai.ward_code ?? ai.ward?.code) ? String(ai.wardCode ?? ai.ward_code ?? ai.ward?.code) : undefined,
          province: ai.province,
          district: ai.district,
          ward: ai.ward,
          provinceName: ai.province?.name,
          districtName: ai.district?.name,
          wardName: ai.ward?.name,
        };
      })(),
      status: row.status ?? 'new',
      order_type: row.order_type ?? row.type ?? 'sale',
      total_amount: Number(row.total_amount ?? row.totalAmount ?? 0),
      initial_payment: Number(row.initial_payment ?? row.initialPayment ?? 0),
      payment_method: row.payment_method ?? row.paymentMethod ?? 'cash',
      paid_amount: Number(row.paid_amount ?? row.paidAmount ?? 0),
      debt_amount: Number(row.debt_amount ?? row.debtAmount ?? 0),
      notes: row.notes ?? row.note ?? '',
      created_at: row.created_at ?? row.createdAt ?? '',
      updated_at: row.updated_at ?? row.updatedAt ?? '',
      deleted_at: row.deleted_at ?? row.deletedAt ?? undefined,
      completed_at: row.completed_at ?? row.completedAt ?? row.delivered_at ?? row.deliveredAt ?? undefined,
      created_by: row.created_by ?? row.createdBy ?? '',
      items: Array.isArray(row.details)
        ? row.details.map(normalizeItem)
        : Array.isArray(row.items)
          ? row.items.map(normalizeItem)
          : Array.isArray(row.order_items)
            ? row.order_items.map(normalizeItem)
            : [],
      order_items: Array.isArray(row.details) ? row.details.map(normalizeItem) : Array.isArray(row.order_items) ? row.order_items.map(normalizeItem) : [],
      customer: row.customer ? {
        id: row.customer.id,
        code: row.customer.code,
        name: row.customer.name,
        phone: row.customer.phoneNumber,
        email: row.customer.email,
        address: row.customer.address,
        addressInfo: row.customer.addressInfo,
      } : undefined,
      creator: row.creator ? {
        id: row.creator.id,
        email: row.creator.email,
        firstName: row.creator.firstName,
        lastName: row.creator.lastName,
        phoneNumber: row.creator.phoneNumber,
        avatarUrl: row.creator.avatarUrl,
      } : undefined,
      tags: row.tags ?? [],
      receiverName: row.receiverName ?? row.receiver_name,
      receiverPhone: row.receiverPhone ?? row.receiver_phone,
      receiverAddress: row.receiverAddress ?? row.receiver_address,
      addressInfo: row.addressInfo ?? row.address_info,
      expenses: Array.isArray(row.expenses)
        ? row.expenses.map((exp: any) => ({
            name: String(exp.name ?? "").trim(),
            amount: Number(exp.amount ?? 0),
            note: exp.note ?? null,
          }))
        : undefined,
      paymentDeadline: row.paymentDeadline ?? row.payment_deadline ?? undefined,
    });
    return normalizeOrder(data);
  },
  // Add item to order
  addOrderItem: async (orderId: string, data: CreateOrderItemRequest): Promise<OrderItem> => {
    return api.post<OrderItem>(API_ENDPOINTS.ORDERS.ITEMS(orderId), {
      ...data,
      order_id: orderId
    });
  },
  // Update order item
  updateOrderItem: async (orderId: string, itemId: string, data: Partial<CreateOrderItemRequest>): Promise<OrderItem> => {
    // Use /orders/{orderId}/details/{itemId} endpoint with camelCase body
    return api.patch<OrderItem>(API_ENDPOINTS.ORDERS.DETAILS(orderId, itemId), {
      productId: data.product_id,
      quantity: data.quantity,
      unitPrice: data.unit_price
    });
  },
  // Delete order item
  deleteOrderItem: async (orderId: string, itemId: string): Promise<{ message: string }> => {
    // Use /orders/{orderId}/details/{itemId} endpoint
    return api.delete<{ message: string }>(API_ENDPOINTS.ORDERS.DETAILS(orderId, itemId));
  },
  // Get order history
  getOrderHistory: async (orderId: string): Promise<{
    id: string;
    order_id?: string;
    old_status?: string;
    new_status?: string;
    old_paid_amount?: number;
    new_paid_amount?: number;
    notes?: string;
    changed_by?: string;
    changed_at: string;
    user_profile?: {
      full_name: string;
    };
    export_slip?: {
      slip_number: string;
      status: string;
    };
  }[]> => {
    try {
      // Use the new History API endpoint: GET /history/entity/order/:orderId
      const response = await api.get<any>(API_ENDPOINTS.HISTORY.ENTITY('order', orderId));
      // Extract data from response (handle JsonDTORsp format)
      let historyItems: any[] = [];
      const responseData = response?.data || response;
      // Backend returns JsonDTORsp with structure: { code, data, message }
      // data can be an array or an object with { count, rows, page, limit, totalPage }
      if (responseData?.data) {
        if (Array.isArray(responseData.data)) {
          historyItems = responseData.data;
        } else if (responseData.data?.rows && Array.isArray(responseData.data.rows)) {
          historyItems = responseData.data.rows;
        } else if (responseData.data?.data && Array.isArray(responseData.data.data)) {
          historyItems = responseData.data.data;
        }
      } else if (Array.isArray(responseData)) {
        historyItems = responseData;
      } else if (responseData?.rows && Array.isArray(responseData.rows)) {
        historyItems = responseData.rows;
      }
      // Transform History entity format to frontend format
      const transformedHistory = historyItems.map((item: any) => {
        // History entity has: id, entityType, entityId, action, title, message, oldValue, newValue, metadata, userId, createdAt, user
        const transformed: any = {
          id: item.id,
          order_id: item.entityId || item.entity_id || orderId,
          changed_at: item.createdAt || item.created_at || new Date().toISOString(),
          notes: item.message || item.title || '',
          changed_by: item.userId || item.user_id || null,
          user_profile: item.user ? {
            full_name: item.user.firstName && item.user.lastName 
              ? `${item.user.firstName} ${item.user.lastName}`.trim()
              : item.user.fullName || item.user.email || 'Hệ thống'
          } : { full_name: 'Hệ thống' }
        };
        // Map action and values based on HistoryAction type
        const action = item.action?.toLowerCase() || '';
        if (action === 'status_changed') {
          // Extract status from oldValue and newValue
          transformed.old_status = item.oldValue?.status || item.oldValue?.oldStatus || null;
          transformed.new_status = item.newValue?.status || item.newValue?.newStatus || null;
        } else if (action === 'payment_added') {
          // Extract payment amount from newValue
          transformed.new_paid_amount = item.newValue?.amount || item.newValue?.paymentAmount || null;
          transformed.old_paid_amount = item.oldValue?.amount || item.oldValue?.paymentAmount || null;
        } else if (action === 'created') {
          // For created action, new_status is the initial status
          transformed.new_status = item.newValue?.status || item.metadata?.status || null;
        } else if (action === 'updated') {
          // For updated action, check if status changed
          if (item.oldValue?.status !== item.newValue?.status) {
            transformed.old_status = item.oldValue?.status || null;
            transformed.new_status = item.newValue?.status || null;
          }
        }
        // Extract export slip info from metadata if available
        if (item.metadata?.exportSlip || item.metadata?.export_slip) {
          const exportSlip = item.metadata.exportSlip || item.metadata.export_slip;
          transformed.export_slip = {
            slip_number: exportSlip.slipNumber || exportSlip.slip_number || '',
            status: exportSlip.status || ''
          };
        }
        return transformed;
      });
      // Sort by date, most recent first
      transformedHistory.sort((a, b) => 
        new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
      );
      return transformedHistory;
    } catch (error: any) {
      // Return empty array if API doesn't exist or fails (will trigger fallback)
      return [];
    }
  },
  // Get banks list (for payment selection)
  getBanks: async (): Promise<Array<{ id: string; name: string; code?: string }>> => {
    try {
      const response = await api.get<any>(API_ENDPOINTS.BANKS.LIST);
      const data = response?.data || response;
      // Handle different response structures
      let banks = [];
      if (Array.isArray(data)) {
        banks = data;
      } else if (data?.rows && Array.isArray(data.rows)) {
        banks = data.rows;
      } else if (data?.data && Array.isArray(data.data)) {
        banks = data.data;
      }
      return banks.map((bank: any) => ({
        id: bank.id,
        name: bank.bankName,
        code: bank.accountNumber,
      }));
    } catch (error) {
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  },
  // Get all bank accounts (for management)
  getAllBanks: async (params?: { includeDeleted?: boolean }): Promise<{
    banks: Array<{
      id: string;
      accountNumber: string;
      bankName: string;
      createdAt: string;
      updatedAt: string;
      deletedAt?: string;
    }>;
    total: number;
  }> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.includeDeleted) queryParams.append('includeDeleted', 'true');
      const url = queryParams.toString()
        ? `${API_ENDPOINTS.BANKS.LIST}?${queryParams.toString()}`
        : API_ENDPOINTS.BANKS.LIST;
      const response = await api.get<any>(url);
      const data = response?.data || response;
      if (Array.isArray(data)) {
        return {
          banks: data.map((bank: any) => ({
            id: bank.id,
            accountNumber: bank.accountNumber,
            bankName: bank.bankName,
            createdAt: bank.createdAt,
            updatedAt: bank.updatedAt,
            deletedAt: bank.deletedAt,
          })),
          total: data.length,
        };
      } else if (data?.rows && Array.isArray(data.rows)) {
        return {
          banks: data.rows.map((bank: any) => ({
            id: bank.id,
            accountNumber: bank.accountNumber,
            bankName: bank.bankName,
            createdAt: bank.createdAt,
            updatedAt: bank.updatedAt,
            deletedAt: bank.deletedAt,
          })),
          total: data.count || data.rows.length,
        };
      }
      return { banks: [], total: 0 };
    } catch (error) {
      return { banks: [], total: 0 };
    }
  },
  // Create bank account
  createBank: async (data: { accountNumber: string; bankName: string }): Promise<{
    id: string;
    accountNumber: string;
    bankName: string;
    createdAt: string;
    updatedAt: string;
  }> => {
    const response = await api.post<any>(API_ENDPOINTS.BANKS.CREATE, data);
    const bankData = response?.data || response;
    return {
      id: bankData.id,
      accountNumber: bankData.accountNumber,
      bankName: bankData.bankName,
      createdAt: bankData.createdAt,
      updatedAt: bankData.updatedAt,
    };
  },
  // Update bank account
  updateBank: async (id: string, data: { accountNumber?: string; bankName?: string }): Promise<{
    id: string;
    accountNumber: string;
    bankName: string;
    createdAt: string;
    updatedAt: string;
  }> => {
    const response = await api.patch<any>(API_ENDPOINTS.BANKS.UPDATE(id), data);
    const bankData = response?.data || response;
    return {
      id: bankData.id,
      accountNumber: bankData.accountNumber,
      bankName: bankData.bankName,
      createdAt: bankData.createdAt,
      updatedAt: bankData.updatedAt,
    };
  },
  // Delete bank account (soft delete)
  deleteBank: async (id: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(API_ENDPOINTS.BANKS.DELETE(id));
  },
  // Restore bank account
  restoreBank: async (id: string): Promise<{
    id: string;
    accountNumber: string;
    bankName: string;
    createdAt: string;
    updatedAt: string;
  }> => {
    const response = await api.post<any>(API_ENDPOINTS.BANKS.RESTORE(id));
    const bankData = response?.data || response;
    return {
      id: bankData.id,
      accountNumber: bankData.accountNumber,
      bankName: bankData.bankName,
      createdAt: bankData.createdAt,
      updatedAt: bankData.updatedAt,
    };
  },
  // Preview bulk payment distribution
  previewBulkPayment: async (data: {
    orderIds: string[];
    totalAmount: number;
  }): Promise<{
    orders: Array<{
      orderId: string;
      orderCode: string;
      totalAmount: number;
      totalPaid: number;
      willPay: number;
      remainingDebt: number;
      percentage: number;
    }>;
    totalBulkAmount: number;
    totalRemainingDebt: number;
  }> => {
    const response = await api.post<any>(`${API_ENDPOINTS.ORDERS.LIST}/bulk-payment-preview`, data);
    const responseData = response?.data || response;
    if (responseData) {
      return {
        orders: responseData.orders || [],
        totalBulkAmount: responseData.totalBulkAmount || data.totalAmount,
        totalRemainingDebt: responseData.totalRemainingDebt || 0,
      };
    }
    throw new Error('Invalid bulk payment preview response structure');
  },
};