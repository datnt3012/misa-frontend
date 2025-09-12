import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import { createApiFallback, mockNotifications } from '@/lib/api-fallback';

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
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  related_order_id?: string;
}

export const notificationApi = {
  // Get notifications
  getNotifications: createApiFallback(
    async (params?: {
      page?: number;
      limit?: number;
      unread_only?: boolean;
    }): Promise<{ notifications: Notification[]; total: number; page: number; limit: number }> => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.unread_only) queryParams.append('unread_only', 'true');

      const url = queryParams.toString() 
        ? `${API_ENDPOINTS.NOTIFICATIONS.LIST}?${queryParams.toString()}`
        : API_ENDPOINTS.NOTIFICATIONS.LIST;

      return api.get<{ notifications: Notification[]; total: number; page: number; limit: number }>(url);
    },
    {
      notifications: mockNotifications,
      total: mockNotifications.length,
      page: 1,
      limit: 50
    },
    'Notifications API not available, using mock data'
  ),

  // Mark notification as read
  markAsRead: createApiFallback(
    async (id: string): Promise<{ message: string }> => {
      return api.patch<{ message: string }>(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
    },
    { message: 'Notification marked as read (mock)' },
    'Mark as read API not available'
  ),

  // Mark all notifications as read
  markAllAsRead: createApiFallback(
    async (): Promise<{ message: string }> => {
      return api.post<{ message: string }>(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
    },
    { message: 'All notifications marked as read (mock)' },
    'Mark all as read API not available'
  ),

  // Create notification
  createNotification: async (data: CreateNotificationRequest): Promise<Notification> => {
    try {
      return await api.post<Notification>('/notifications', data);
    } catch (error) {
      console.warn('Create notification API not available, using mock response');
      return {
        id: Date.now().toString(),
        user_id: data.user_id,
        title: data.title,
        message: data.message,
        type: data.type,
        related_order_id: data.related_order_id,
        created_at: new Date().toISOString()
      };
    }
  }
};
