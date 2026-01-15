import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
export interface AddressAdministrativeUnitRef {
  code: string;
  name: string;
  parentCode?: string | null;
  level?: string;
  type?: string | null;
}
export interface AddressInfo {
  wardName: string;
  districtName: string;
  provinceName: string;
  id?: string;
  entityType?: string;
  entityId?: string;
  provinceCode?: string;
  districtCode?: string;
  wardCode?: string;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  // nested relations from backend
  province?: AddressAdministrativeUnitRef | null;
  district?: AddressAdministrativeUnitRef | null;
  ward?: AddressAdministrativeUnitRef | null;
}
export interface VatInfo {
  taxCode?: string;
  companyName?: string;
  companyAddress?: string;
  vatEmail?: string;
  companyPhone?: string;
}
export interface Customer {
  id: string;
  code?: string;
  customer_code?: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  address?: string; // Địa chỉ chi tiết
  addressInfo?: AddressInfo; // Thông tin địa chỉ (có thể bao gồm quan hệ nested)
  administrativeUnitId?: string; // ID của đơn vị hành chính
  administrativeUnitName?: string; // Tên đơn vị hành chính
  vatRate?: number; // VAT rate mặc định (%)
  vatInfo?: VatInfo;
  userId?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  user?: any;
}
export interface CreateCustomerRequest {
  name: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  vatRate?: number; // VAT rate mặc định (%)
  vatInfo?: VatInfo;
  addressInfo?: {
    provinceCode?: string;
    districtCode?: string;
    wardCode?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  };
}
export interface UpdateCustomerRequest {
  name?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  vatRate?: number; // VAT rate mặc định (%)
  vatInfo?: VatInfo;
  addressInfo?: {
    provinceCode?: string;
    districtCode?: string;
    wardCode?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  };
}
export const customerApi = {
  // Get all customers
  getCustomers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ customers: Customer[]; total: number; page: number; limit: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    const url = queryParams.toString() 
      ? `${API_ENDPOINTS.CUSTOMERS.LIST}?${queryParams.toString()}`
      : API_ENDPOINTS.CUSTOMERS.LIST;
    const response = await api.get<any>(url);
    const data = response?.data || response;
    const normalize = (row: any): Customer => normalizeCustomer(row);
    if (data && Array.isArray(data.rows)) {
      return {
        customers: data.rows.map(normalize),
        total: Number(data.count ?? data.rows.length ?? 0),
        page: Number(data.page ?? params?.page ?? 1),
        limit: Number(data.limit ?? params?.limit ?? data.rows.length ?? 0),
      };
    }
    return {
      customers: (response?.customers || []).map(normalize),
      total: Number(response?.total ?? 0),
      page: Number(response?.page ?? params?.page ?? 1),
      limit: Number(response?.limit ?? params?.limit ?? 0),
    };
  },
  // Get customer by ID (normalized)
  getCustomer: async (id: string): Promise<Customer> => {
    const res = await api.get<any>(`${API_ENDPOINTS.CUSTOMERS.LIST}/${id}`);
    const row = (res?.data ?? res) as any;
    const normalized = normalizeCustomer(row);
    return normalized;
  },
  // Create customer
  createCustomer: async (data: CreateCustomerRequest): Promise<Customer> => {
    const res = await api.post<any>(API_ENDPOINTS.CUSTOMERS.CREATE, data);
    // Handle different response structures
    let row: any;
    if (res?.data) {
      // If response has data property, check if it's the customer object or wrapped
      row = res.data?.data || res.data?.customer || res.data;
    } else {
      row = res;
    }
    // Reuse normalize from list
    const normalized = normalizeCustomer(row);
    if (!normalized.id) {
      throw new Error('Không thể lấy ID khách hàng từ phản hồi của server');
    }
    return normalized;
  },
  // Update customer
  updateCustomer: async (id: string, data: UpdateCustomerRequest): Promise<Customer> => {
    return api.patch<Customer>(API_ENDPOINTS.CUSTOMERS.UPDATE(id), data);
  },
  // Delete customer
  deleteCustomer: async (id: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(API_ENDPOINTS.CUSTOMERS.DELETE(id));
  }
};
const normalizeVatInfo = (info: any): VatInfo | undefined => {
  if (!info) return undefined;
  const clean = (value: any) => {
    if (value === undefined || value === null) return undefined;
    const str = typeof value === 'string' ? value.trim() : String(value);
    return str.length ? str : undefined;
  };
  const normalized: VatInfo = {
    taxCode: clean(info.taxCode ?? info.tax_code),
    companyName: clean(info.companyName ?? info.company_name),
    companyAddress: clean(info.companyAddress ?? info.company_address),
    vatEmail: clean(info.vatEmail ?? info.vat_email),
    companyPhone: clean(info.companyPhone ?? info.company_phone),
  };
  const hasValue = Object.values(normalized).some(Boolean);
  return hasValue ? normalized : undefined;
};
const normalizeCustomer = (row: any): Customer => {
  const addressInfoMapper = () => {
    const ai = row?.addressInfo ?? row?.address_info;
    if (!ai) return null as any;
    return {
      id: ai.id,
      entityType: ai.entityType,
      entityId: ai.entityId,
      provinceCode: ai.provinceCode ?? ai.province_code ?? ai.province?.code,
      districtCode: ai.districtCode ?? ai.district_code ?? ai.district?.code,
      wardCode: ai.wardCode ?? ai.ward_code ?? ai.ward?.code,
      isDeleted: ai.isDeleted ?? false,
      createdAt: ai.createdAt ?? ai.created_at ?? '',
      updatedAt: ai.updatedAt ?? ai.updated_at ?? '',
      deletedAt: ai.deletedAt ?? ai.deleted_at ?? null,
      province: ai.province
        ? {
            code: ai.province.code,
            name: ai.province.name,
            parentCode: ai.province.parentCode ?? ai.province.parent_code ?? null,
            level: String(ai.province.level ?? ''),
            type: ai.province.type,
            isDeleted: ai.province.isDeleted ?? false,
            createdAt: ai.province.createdAt ?? ai.province.created_at ?? '',
            updatedAt: ai.province.updatedAt ?? ai.province.updated_at ?? '',
            deletedAt: ai.province.deletedAt ?? ai.province.deleted_at ?? null,
          }
        : undefined,
      district: ai.district
        ? {
            code: ai.district.code,
            name: ai.district.name,
            parentCode: ai.district.parentCode ?? ai.district.parent_code ?? null,
            level: String(ai.district.level ?? ''),
            type: ai.district.type,
            isDeleted: ai.district.isDeleted ?? false,
            createdAt: ai.district.createdAt ?? ai.district.created_at ?? '',
            updatedAt: ai.district.updatedAt ?? ai.district.updated_at ?? '',
            deletedAt: ai.district.deletedAt ?? ai.district.deleted_at ?? null,
          }
        : undefined,
      ward: ai.ward
        ? {
            code: ai.ward.code,
            name: ai.ward.name,
            parentCode: ai.ward.parentCode ?? ai.ward.parent_code ?? null,
            level: String(ai.ward.level ?? ''),
            type: ai.ward.type,
            isDeleted: ai.ward.isDeleted ?? false,
            createdAt: ai.ward.createdAt ?? ai.ward.created_at ?? '',
            updatedAt: ai.ward.updatedAt ?? ai.ward.updated_at ?? '',
            deletedAt: ai.ward.deletedAt ?? ai.ward.deleted_at ?? null,
          }
        : undefined,
    } as any;
  };
  const normalizeVatRate = () => {
    const vatRateValue = row?.vatRate ?? row?.vat_rate;
    if (vatRateValue === undefined || vatRateValue === null || vatRateValue === '') {
      return undefined;
    }
    const numValue =
      typeof vatRateValue === 'string' ? parseFloat(vatRateValue) : Number(vatRateValue);
    return isNaN(numValue) ? undefined : numValue;
  };
  // Extract ID - try multiple possible fields
  const customerId = row.id ?? row.customer_id ?? row.customerId;
  if (!customerId) {
    throw new Error('Không thể lấy ID khách hàng từ phản hồi của server');
  }
  return {
    id: String(customerId),
    code: row.code ?? null,
    customer_code: row.code ?? row.customer_code ?? row.customerCode ?? null,
    name: row.name ?? '',
    email: row.email ?? null,
    phoneNumber: row.phoneNumber ?? row.phone ?? null,
    address: row.address ?? null,
    addressInfo: addressInfoMapper(),
    administrativeUnitId: row.administrativeUnitId ?? row.administrative_unit_id ?? null,
    administrativeUnitName: row.administrativeUnitName ?? row.administrative_unit_name ?? null,
    vatRate: normalizeVatRate(),
    vatInfo: normalizeVatInfo(row.vatInfo ?? row.vat_info),
    userId: row.userId ?? null,
    isDeleted: row.isDeleted ?? false,
    createdAt: row.createdAt ?? row.created_at ?? '',
    updatedAt: row.updatedAt ?? row.updated_at ?? '',
    deletedAt: row.deletedAt ?? row.deleted_at ?? null,
    user: row.user ?? null,
  };
};