import React, { useState, useEffect, createContext, useContext } from "react";
import { notificationApi, type Notification } from "@/api/notification.api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Notification interface is now imported from API

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loadNotifications: () => Promise<void>;
  createNotification: (notification: Omit<Notification, 'id' | 'created_at'>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const loadNotifications = async () => {
    console.log("Loading notifications...");
    const response = await notificationApi.getNotifications({ limit: 50 });
    console.log("Notifications data:", response);
    setNotifications(response.notifications || []);
  };

  const markAsRead = async (id: string) => {
    await notificationApi.markAsRead(id);
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const markAllAsRead = async () => {
    await notificationApi.markAllAsRead();
    setNotifications(prev =>
      prev.map(notification => ({
        ...notification,
        isRead: true
      }))
    );
  };

  const createNotification = async (notification: Omit<Notification, 'id' | 'created_at'>) => {
    const data = await notificationApi.createNotification({
      user_id: notification.user_id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      related_order_id: notification.related_order_id
    });

    if (data) {
      setNotifications(prev => [data, ...prev]);
    }
    
    // Show toast for new notification
    toast({
      title: notification.title,
      description: notification.message,
      variant: notification.type === 'error' ? 'destructive' : 'default',
    });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    // Only load notifications if user is logged in
    if (user) {
      loadNotifications();
    } else {
      // Clear notifications when user logs out
      setNotifications([]);
    }

    // TODO: Implement real-time notifications with WebSocket or polling
    // For now, we'll just load notifications once
    // In the future, you can implement WebSocket connection or polling here
  }, [user]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      loadNotifications,
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
