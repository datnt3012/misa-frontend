import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from "react";
import { notificationApi, type Notification } from "@/api/notification.api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
interface LoadNotificationsOptions {
  page?: number;
  append?: boolean;
  silent?: boolean;
}
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  hasMore: boolean;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loadNotifications: (options?: LoadNotificationsOptions) => Promise<void>;
  loadMore: () => Promise<void>;
  createNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
const POLLING_INTERVAL = Number(import.meta.env.VITE_NOTIFICATIONS_POLL_INTERVAL || 15000);
const NOTIFICATION_PAGE_SIZE = 5;
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const mergeNotifications = useCallback((incoming: Notification[], options?: { append?: boolean }) => {
    setNotifications(prev => {
      if (options?.append) {
        const existingIds = new Set(prev.map(n => n.id));
        const combined = [...prev];
        incoming.forEach(notification => {
          if (!existingIds.has(notification.id)) {
            combined.push(notification);
          } else {
            combined.splice(
              combined.findIndex(n => n.id === notification.id),
              1,
              notification
            );
          }
        });
        return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      const map = new Map<string, Notification>();
      prev.forEach(notification => {
        map.set(notification.id, notification);
      });
      incoming.forEach(notification => {
        map.set(notification.id, notification);
      });
      return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
  }, []);
  const loadNotifications = useCallback(async (options: LoadNotificationsOptions = {}) => {
    const { page: targetPage = 1, append = false, silent = false } = options;
    if (!user?.id) return;
    if (append && !hasMore) return;
    if (!silent) setIsLoading(true);
    try {
      const response = await notificationApi.getNotifications({
        limit: NOTIFICATION_PAGE_SIZE,
        page: targetPage,
        userId: user.id,
      });
      setCurrentPage(targetPage);
      const more = response.page * response.limit < response.total;
      setHasMore(more);
      mergeNotifications(response.notifications, { append: targetPage > 1 || append });
    } catch (error: any) {
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [user, hasMore, mergeNotifications]);
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await loadNotifications({ page: currentPage + 1, append: true });
  }, [currentPage, hasMore, isLoading, loadNotifications]);
  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      toast({
        title: "Không thể cập nhật thông báo",
        description: "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    }
  }, [toast]);
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    try {
      await notificationApi.markAllAsRead({ userId: user.id });
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          isRead: true
        }))
      );
    } catch (error) {
      toast({
        title: "Không thể cập nhật thông báo",
        description: "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    }
  }, [toast, user]);
  const createNotification = useCallback(async (notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>) => {
    const data = await notificationApi.createNotification({
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      relatedOrderId: notification.relatedOrderId
    });
    if (data) {
      setNotifications(prev => [data, ...prev]);
    }
  }, []);
  const unreadCount = notifications.filter(n => !n.isRead).length;
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setCurrentPage(1);
      setHasMore(true);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }
    loadNotifications();
    pollingRef.current = setInterval(() => {
      loadNotifications({ page: 1, silent: true });
    }, POLLING_INTERVAL);
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [user, loadNotifications]);
  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      hasMore,
      isLoading,
      markAsRead,
      markAllAsRead,
      loadNotifications,
      loadMore,
      createNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};