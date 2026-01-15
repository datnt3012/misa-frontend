import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

export interface QuotationDetail {
  id: string;
  quotation_id: string;
  product_id: string;
  product_name?: string;
  product_code?: string;
  price: number;
  quantity: number;
  note?: string;
  product?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface Quotation {
  id: string;
  code: string;
  contract_code: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  note?: string;
  status: string;
  type: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  details?: QuotationDetail[];
  customer?: {
    id: string;
    name: string;
    phoneNumber?: string;
    phone?: string;
  };
  creator?: {
    id: string;
    username: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
}

export interface CreateQuotationRequest {
  customerId: string;
  contractCode?: string;
  note?: string;
  status?: string;
  type?: string;
  details: {
    productId: string;
    price: number;
    quantity: number;
    note?: string;
  }[];
}

export interface UpdateQuotationRequest {
  customerId?: string;
  contractCode?: string;
  note?: string;
  status?: string;
  type?: string;
  details?: {
    productId: string;
    price: number;
    quantity: number;
    note?: string;
  }[];
}

export interface QueryQuotationParams {
  page?: number;
  limit?: number;
  code?: string;
  customerId?: string;
  status?: string;
  type?: string;
  createdBy?: string;
  startDate?: string;
  endDate?: string;
}

export const quotationApi = {
  // Get all quotations
  getQuotations: async (params?: QueryQuotationParams): Promise<{ 
    quotations: Quotation[]; 
    total: number; 
    page: number; 
    limit: number;
  }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.code) queryParams.append('code', params.code);
    if (params?.customerId) queryParams.append('customerId', params.customerId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.createdBy) queryParams.append('createdBy', params.createdBy);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const url = queryParams.toString() 
      ? `${API_ENDPOINTS.QUOTATIONS.LIST}?${queryParams.toString()}`
      : API_ENDPOINTS.QUOTATIONS.LIST;

    const response = await api.get<any>(url);
    const data = response?.data || response;

    const normalizeDetail = (it: any): QuotationDetail => ({
      id: it.id,
      quotation_id: it.quotation_id ?? it.quotationId ?? '',
      product_id: it.product?.id ?? it.productId ?? it.product_id ?? '',
      product_name: it.product?.name ?? it.productName ?? it.product_name ?? '',
      product_code: it.product?.code ?? it.productCode ?? it.product_code ?? '',
      price: Number(it.price ?? 0),
      quantity: Number(it.quantity ?? 0),
      note: it.note ?? undefined,
      product: it.product ? {
        id: it.product.id,
        name: it.product.name,
        code: it.product.code,
      } : undefined,
    });

    const normalizeQuotation = (row: any): Quotation => ({
      id: row.id,
      code: row.code ?? '',
      contract_code: row.contract_code ?? row.contractCode ?? '',
      customer_id: row.customer?.id ?? row.customer_id ?? row.customerId ?? '',
      customer_name: row.customer?.name ?? row.customer_name ?? '',
      customer_phone: row.customer?.phoneNumber ?? row.customer?.phone ?? row.customer_phone ?? '',
      note: row.note ?? undefined,
      status: row.status ?? '',
      type: row.type ?? '',
      created_by: row.creator?.id ?? row.created_by ?? row.createdBy ?? '',
      created_at: row.created_at ?? row.createdAt ?? '',
      updated_at: row.updated_at ?? row.updatedAt ?? '',
      deleted_at: row.deleted_at ?? row.deletedAt ?? undefined,
      details: Array.isArray(row.details)
        ? row.details.map(normalizeDetail)
        : Array.isArray(row.quotation_details)
          ? row.quotation_details.map(normalizeDetail)
          : [],
      customer: row.customer ? {
        id: row.customer.id,
        name: row.customer.name,
        phoneNumber: row.customer.phoneNumber ?? row.customer.phone,
        phone: row.customer.phoneNumber ?? row.customer.phone,
      } : undefined,
      creator: row.creator ? {
        id: row.creator.id,
        username: row.creator.username,
        email: row.creator.email,
        firstName: row.creator.firstName,
        lastName: row.creator.lastName,
      } : undefined,
    });

    if (data && Array.isArray(data.rows)) {
      return {
        quotations: data.rows.map(normalizeQuotation),
        total: Number(data.count ?? data.rows.length ?? 0),
        page: Number(data.page ?? params?.page ?? 1),
        limit: Number(data.limit ?? params?.limit ?? data.rows.length ?? 0),
      };
    }

    const quotations = (response?.quotations || []).map(normalizeQuotation);
    return {
      quotations,
      total: Number(response?.total ?? quotations.length ?? 0),
      page: Number(response?.page ?? params?.page ?? 1),
      limit: Number(response?.limit ?? params?.limit ?? quotations.length ?? 0),
    };
  },

  // Get quotation by ID
  getQuotation: async (id: string): Promise<Quotation> => {
    const response = await api.get<any>(`${API_ENDPOINTS.QUOTATIONS.LIST}/${id}`);
    const data = response?.data || response;

    const normalizeDetail = (it: any): QuotationDetail => ({
      id: it.id,
      quotation_id: it.quotation_id ?? it.quotationId ?? '',
      product_id: it.product?.id ?? it.productId ?? it.product_id ?? '',
      product_name: it.product?.name ?? it.productName ?? it.product_name ?? '',
      product_code: it.product?.code ?? it.productCode ?? it.product_code ?? '',
      price: Number(it.price ?? 0),
      quantity: Number(it.quantity ?? 0),
      note: it.note ?? undefined,
      product: it.product ? {
        id: it.product.id,
        name: it.product.name,
        code: it.product.code,
      } : undefined,
    });

    const normalizeQuotation = (row: any): Quotation => ({
      id: row.id,
      code: row.code ?? '',
      contract_code: row.contract_code ?? row.contractCode ?? '',
      customer_id: row.customer?.id ?? row.customer_id ?? row.customerId ?? '',
      customer_name: row.customer?.name ?? row.customer_name ?? '',
      customer_phone: row.customer?.phoneNumber ?? row.customer?.phone ?? row.customer_phone ?? '',
      note: row.note ?? undefined,
      status: row.status ?? '',
      type: row.type ?? '',
      created_by: row.creator?.id ?? row.created_by ?? row.createdBy ?? '',
      created_at: row.created_at ?? row.createdAt ?? '',
      updated_at: row.updated_at ?? row.updatedAt ?? '',
      deleted_at: row.deleted_at ?? row.deletedAt ?? undefined,
      details: Array.isArray(row.details)
        ? row.details.map(normalizeDetail)
        : Array.isArray(row.quotation_details)
          ? row.quotation_details.map(normalizeDetail)
          : [],
      customer: row.customer ? {
        id: row.customer.id,
        name: row.customer.name,
        phoneNumber: row.customer.phoneNumber ?? row.customer.phone,
        phone: row.customer.phoneNumber ?? row.customer.phone,
      } : undefined,
      creator: row.creator ? {
        id: row.creator.id,
        username: row.creator.username,
        email: row.creator.email,
        firstName: row.creator.firstName,
        lastName: row.creator.lastName,
      } : undefined,
    });

    return normalizeQuotation(data);
  },

  // Create quotation
  createQuotation: async (data: CreateQuotationRequest): Promise<Quotation> => {
    const response = await api.post<any>(API_ENDPOINTS.QUOTATIONS.CREATE, data);
    const dataResponse = response?.data || response;

    const normalizeDetail = (it: any): QuotationDetail => ({
      id: it.id,
      quotation_id: it.quotation_id ?? it.quotationId ?? '',
      product_id: it.product?.id ?? it.productId ?? it.product_id ?? '',
      product_name: it.product?.name ?? it.productName ?? it.product_name ?? '',
      product_code: it.product?.code ?? it.productCode ?? it.product_code ?? '',
      price: Number(it.price ?? 0),
      quantity: Number(it.quantity ?? 0),
      note: it.note ?? undefined,
      product: it.product ? {
        id: it.product.id,
        name: it.product.name,
        code: it.product.code,
      } : undefined,
    });

    const normalizeQuotation = (row: any): Quotation => ({
      id: row.id,
      code: row.code ?? '',
      contract_code: row.contract_code ?? row.contractCode ?? '',
      customer_id: row.customer?.id ?? row.customer_id ?? row.customerId ?? '',
      customer_name: row.customer?.name ?? row.customer_name ?? '',
      customer_phone: row.customer?.phoneNumber ?? row.customer?.phone ?? row.customer_phone ?? '',
      note: row.note ?? undefined,
      status: row.status ?? '',
      type: row.type ?? '',
      created_by: row.creator?.id ?? row.created_by ?? row.createdBy ?? '',
      created_at: row.created_at ?? row.createdAt ?? '',
      updated_at: row.updated_at ?? row.updatedAt ?? '',
      details: Array.isArray(row.details)
        ? row.details.map(normalizeDetail)
        : Array.isArray(row.quotation_details)
          ? row.quotation_details.map(normalizeDetail)
          : [],
      customer: row.customer ? {
        id: row.customer.id,
        name: row.customer.name,
        phoneNumber: row.customer.phoneNumber ?? row.customer.phone,
        phone: row.customer.phoneNumber ?? row.customer.phone,
      } : undefined,
      creator: row.creator ? {
        id: row.creator.id,
        username: row.creator.username,
        email: row.creator.email,
        firstName: row.creator.firstName,
        lastName: row.creator.lastName,
      } : undefined,
    });

    return normalizeQuotation(dataResponse);
  },

  // Update quotation
  updateQuotation: async (id: string, data: UpdateQuotationRequest): Promise<Quotation> => {
    const response = await api.patch<any>(API_ENDPOINTS.QUOTATIONS.UPDATE(id), data);
    const dataResponse = response?.data || response;

    const normalizeDetail = (it: any): QuotationDetail => ({
      id: it.id,
      quotation_id: it.quotation_id ?? it.quotationId ?? '',
      product_id: it.product?.id ?? it.productId ?? it.product_id ?? '',
      product_name: it.product?.name ?? it.productName ?? it.product_name ?? '',
      product_code: it.product?.code ?? it.productCode ?? it.product_code ?? '',
      price: Number(it.price ?? 0),
      quantity: Number(it.quantity ?? 0),
      note: it.note ?? undefined,
      product: it.product ? {
        id: it.product.id,
        name: it.product.name,
        code: it.product.code,
      } : undefined,
    });

    const normalizeQuotation = (row: any): Quotation => ({
      id: row.id,
      code: row.code ?? '',
      contract_code: row.contract_code ?? row.contractCode ?? '',
      customer_id: row.customer?.id ?? row.customer_id ?? row.customerId ?? '',
      customer_name: row.customer?.name ?? row.customer_name ?? '',
      customer_phone: row.customer?.phoneNumber ?? row.customer?.phone ?? row.customer_phone ?? '',
      note: row.note ?? undefined,
      status: row.status ?? '',
      type: row.type ?? '',
      created_by: row.creator?.id ?? row.created_by ?? row.createdBy ?? '',
      created_at: row.created_at ?? row.createdAt ?? '',
      updated_at: row.updated_at ?? row.updatedAt ?? '',
      details: Array.isArray(row.details)
        ? row.details.map(normalizeDetail)
        : Array.isArray(row.quotation_details)
          ? row.quotation_details.map(normalizeDetail)
          : [],
      customer: row.customer ? {
        id: row.customer.id,
        name: row.customer.name,
        phoneNumber: row.customer.phoneNumber ?? row.customer.phone,
        phone: row.customer.phoneNumber ?? row.customer.phone,
      } : undefined,
      creator: row.creator ? {
        id: row.creator.id,
        username: row.creator.username,
        email: row.creator.email,
        firstName: row.creator.firstName,
        lastName: row.creator.lastName,
      } : undefined,
    });

    return normalizeQuotation(dataResponse);
  },

  // Update order status (requires ORDERS_UPDATE_STATUS permission)
  updateQuotationStatus: async (id: string, status: string): Promise<Quotation> => {
    try {
      const response = await api.patch<Quotation>(API_ENDPOINTS.QUOTATIONS.STATUS(id), { status });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete quotation
  deleteQuotation: async (id: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(API_ENDPOINTS.QUOTATIONS.DELETE(id));
  },
};

