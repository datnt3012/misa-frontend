import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import { mockNotifications } from '@/lib/api-fallback';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  relatedOrderId?: string;
  isRead: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateNotificationRequest {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  relatedOrderId?: string;
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeNotification = (data: any): Notification => {
  if (!data) {
    return {
      id: generateId(),
      userId: '',
      title: 'Thông báo',
      message: '',
      type: 'info',
      isRead: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const typeValue = (data.type || data.notification_type || 'info').toLowerCase();
  const normalizedType: Notification['type'] = ['success', 'warning', 'error'].includes(typeValue)
    ? (typeValue as Notification['type'])
    : 'info';

  return {
    id: data.id || data.notification_id || generateId(),
    userId: data.userId || data.user_id || data.user?.id || '',
    title: data.title || data.subject || 'Thông báo',
    message: data.message || data.content || '',
    type: normalizedType,
    relatedOrderId: data.relatedOrderId || data.related_order_id || data.order_id || undefined,
    isRead: Boolean(data.isRead ?? data.is_read ?? data.read ?? false),
    isDeleted: Boolean(data.isDeleted ?? data.is_deleted ?? false),
    createdAt: data.createdAt || data.created_at || new Date().toISOString(),
    updatedAt: data.updatedAt || data.updated_at || data.createdAt || data.created_at || new Date().toISOString(),
    deletedAt: data.deletedAt || data.deleted_at || undefined,
  };
};

const normalizeListResponse = (response: any): { notifications: Notification[]; total: number; page: number; limit: number } => {
  const raw =
    response?.notifications ??
    response?.data?.rows ??
    response?.data?.items ??
    response?.data?.list ??
    response?.data ??
    response?.items ??
    response?.results ??
    response ??
    [];

  const notificationsArray = Array.isArray(raw) ? raw : [];
  const normalized = notificationsArray.map(normalizeNotification);

  const total =
    response?.total ??
    response?.data?.total ??
    response?.data?.count ??
    normalized.length;
  const page =
    response?.page ??
    response?.data?.page ??
    response?.pagination?.page ??
    response?.data?.currentPage ??
    1;
  const limit =
    response?.limit ??
    response?.data?.limit ??
    response?.pagination?.limit ??
    response?.data?.pageSize ??
    (normalized.length || 50);

  return {
    notifications: normalized,
    total,
    page,
    limit,
  };
};

export const notificationApi = {
  // Get notifications from backend, normalize response structure
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    unread_only?: boolean;
    userId?: string;
  }): Promise<{ notifications: Notification[]; total: number; page: number; limit: number }> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.unread_only) queryParams.append('unread_only', 'true');
      if (params?.userId) queryParams.append('userId', params.userId);

      const url = queryParams.toString()
        ? `${API_ENDPOINTS.NOTIFICATIONS.LIST}?${queryParams.toString()}`
        : API_ENDPOINTS.NOTIFICATIONS.LIST;

      const response = await api.get<any>(url);
      return normalizeListResponse(response);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Fall back to mock data but still normalized, so UI stays consistent
      return normalizeListResponse({
        notifications: mockNotifications,
        total: mockNotifications.length,
        page: 1,
        limit: 50,
      });
    }
  },

  // Mark notification as read
  markAsRead: async (id: string): Promise<void> => {
    await api.patch<{ message: string }>(API_ENDPOINTS.NOTIFICATIONS.DETAIL(id), { isRead: true });
  },

  // Mark all notifications as read
  markAllAsRead: async (params?: { userId?: string }): Promise<void> => {
    const queryParams = new URLSearchParams();
    if (params?.userId) queryParams.append('userId', params.userId);

    const url = queryParams.toString()
      ? `${API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ}?${queryParams.toString()}`
      : API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ;

    await api.post<{ message: string }>(url);
  },

  // Create notification
  createNotification: async (data: CreateNotificationRequest): Promise<Notification> => {
    try {
      const payload = {
        user_id: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        related_order_id: data.relatedOrderId,
      };

      const response = await api.post<any>(API_ENDPOINTS.NOTIFICATIONS.LIST, payload);
      return normalizeNotification(response);
    } catch (error) {
      console.warn('Create notification API not available, using mock response');
      return normalizeNotification({
        id: Date.now().toString(),
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        relatedOrderId: data.relatedOrderId,
        createdAt: new Date().toISOString(),
      });
    }
  },
};
