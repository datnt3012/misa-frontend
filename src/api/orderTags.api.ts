import { API_ENDPOINTS } from '@/config/api';
import { api } from '@/lib/api';

export interface OrderTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  type?: string; // 'order' | 'customer' | 'product' | 'warehouse_receipt'
  created_at?: string;
  updated_at?: string;
  raw_name?: string;
  display_name?: string;
  is_default?: boolean;
  is_deleted?: boolean;
  deleted_at?: string | null;
}

export interface CreateOrderTagRequest {
  name: string;
  color: string;
  description?: string;
  type?: string; // 'order' | 'customer' | 'product' | 'warehouse_receipt', default: 'order'
}

export interface UpdateOrderTagRequest {
  name?: string;
  color?: string;
  description?: string;
  type?: string; // 'order' | 'customer' | 'product' | 'warehouse_receipt'
}

const normalizeTag = (tag: any): OrderTag => {
  if (!tag) {
    throw new Error('Invalid tag object received from API');
  }

  const translations = tag.translations || tag.translation || {};
  const viTranslation = translations.vi?.name ?? translations.vi?.label ?? translations.vi ?? tag.name_vi;
  const displayName = tag.displayName || viTranslation || tag.localizedName || tag.localized_name;

  return {
    id: tag.id ?? tag.uuid ?? tag._id ?? '',
    name: displayName || tag.name || 'Không tên',
    color: tag.color || '#64748b',
    description: tag.description || tag.note || undefined,
    type: tag.type || 'order', // Default to 'order' if not specified
    created_at: tag.created_at ?? tag.createdAt,
    updated_at: tag.updated_at ?? tag.updatedAt,
    raw_name: tag.name ?? tag.rawName ?? tag.raw_name,
    display_name: displayName,
    is_default: tag.isDefault ?? tag.is_default ?? false,
    is_deleted: Boolean(tag.deleted_at ?? tag.deletedAt ?? tag.isDeleted ?? tag.is_deleted),
    deleted_at: tag.deleted_at ?? tag.deletedAt ?? null,
  };
};

const extractRows = (response: any): any[] => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.rows)) return response.rows;
  if (Array.isArray(response?.data?.rows)) return response.data.rows;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

export const orderTagsApi = {
  getAllTags: async (options?: { includeDeleted?: boolean; type?: string }): Promise<OrderTag[]> => {
    const params = new URLSearchParams();
    if (options?.includeDeleted) {
      params.append('includeDeleted', 'true');
    }
    if (options?.type) {
      params.append('type', options.type);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get<any>(`${API_ENDPOINTS.TAGS.LIST}${query}`);
    return extractRows(response?.data ?? response).map(normalizeTag);
  },

  getTagById: async (id: string): Promise<OrderTag> => {
    const response = await api.get<any>(API_ENDPOINTS.TAGS.DETAIL(id));
    return normalizeTag(response?.data ?? response);
  },

  createTag: async (payload: CreateOrderTagRequest): Promise<OrderTag> => {
    // Ensure type is set, default to 'order' if not provided
    const payloadWithType = {
      ...payload,
      type: payload.type || 'order',
    };
    const response = await api.post<any>(API_ENDPOINTS.TAGS.CREATE, payloadWithType);
    return normalizeTag(response?.data ?? response);
  },

  updateTag: async (id: string, payload: UpdateOrderTagRequest): Promise<OrderTag> => {
    const response = await api.patch<any>(API_ENDPOINTS.TAGS.UPDATE(id), payload);
    return normalizeTag(response?.data ?? response);
  },

  deleteTag: async (id: string): Promise<void> => {
    await api.delete(API_ENDPOINTS.TAGS.DELETE(id));
  },

  restoreTag: async (id: string): Promise<OrderTag> => {
    const response = await api.patch<any>(API_ENDPOINTS.TAGS.RESTORE(id), {});
    return normalizeTag(response?.data ?? response);
  },

  syncTagsFromOrders: async (): Promise<{ message?: string }> => {
    return api.post(API_ENDPOINTS.TAGS.SYNC_FROM_ORDERS, {});
  },

  updateOrderTags: async (orderId: string, tagIds: string[]): Promise<string[]> => {
    const response = await api.put<any>(API_ENDPOINTS.ORDER_TAGS.ASSIGN(orderId), { tagIds });
    const data = response?.data ?? response;
    if (Array.isArray(data?.tags)) {
      return data.tags;
    }
    if (Array.isArray(data)) {
      return data;
    }
    return Array.isArray(response) ? response : [];
  },
};
