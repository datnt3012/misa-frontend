import React, { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  related_order_id?: string;
  read_at?: string;
  created_at: string;
}

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

  const loadNotifications = async () => {
    try {
      console.log("Loading notifications...");
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      console.log("Notifications data:", data);
      console.log("Notifications error:", error);

      if (error) throw error;
      setNotifications((data as Notification[]) || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, read_at: new Date().toISOString() }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .is('read_at', null);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          read_at: notification.read_at || new Date().toISOString()
        }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const createNotification = async (notification: Omit<Notification, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: notification.user_id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          related_order_id: notification.related_order_id
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setNotifications(prev => [data as Notification, ...prev]);
      }
      
      // Show toast for new notification
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default',
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  useEffect(() => {
    loadNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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