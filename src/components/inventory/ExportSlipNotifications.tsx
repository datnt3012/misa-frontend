import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bell, Package, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { exportSlipsApi, type ExportSlip } from "@/api/exportSlips.api";

interface ExportSlipNotification {
  id: string;
  type: 'created' | 'status_changed';
  export_slip_id: string;
  export_slip_code: string;
  order_number: string;
  customer_name: string;
  status: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface ExportSlipNotificationsProps {
  onNotificationClick?: (exportSlipId: string) => void;
}

export const ExportSlipNotifications: React.FC<ExportSlipNotificationsProps> = ({
  onNotificationClick
}) => {
  const [notifications, setNotifications] = useState<ExportSlipNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const { toast } = useToast();

  // Mock notifications for demo - in real app, this would come from API
  useEffect(() => {
    const mockNotifications: ExportSlipNotification[] = [
      {
        id: '1',
        type: 'created',
        export_slip_id: 'slip-001',
        export_slip_code: 'XK-2024-001',
        order_number: 'DH-2024-001',
        customer_name: 'Công ty ABC',
        status: 'pending',
        message: 'Phiếu xuất kho mới được tạo và chờ xử lý',
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        is_read: false
      },
      {
        id: '2',
        type: 'status_changed',
        export_slip_id: 'slip-002',
        export_slip_code: 'XK-2024-002',
        order_number: 'DH-2024-002',
        customer_name: 'Công ty XYZ',
        status: 'picked',
        message: 'Phiếu xuất kho đã được chuyển sang trạng thái "Đã lấy hàng"',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        is_read: false
      },
      {
        id: '3',
        type: 'status_changed',
        export_slip_id: 'slip-003',
        export_slip_code: 'XK-2024-003',
        order_number: 'DH-2024-003',
        customer_name: 'Công ty DEF',
        status: 'exported',
        message: 'Phiếu xuất kho đã hoàn tất - hàng đã rời khỏi kho',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
        is_read: true
      }
    ];
    
    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => !n.is_read).length);
  }, []);

  const getNotificationIcon = (type: string, status: string) => {
    if (type === 'created') {
      return <Package className="w-4 h-4 text-blue-600" />;
    }
    
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'picked':
        return <Package className="w-4 h-4 text-blue-600" />;
      case 'exported':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="text-orange-600">Chờ</Badge>;
      case 'picked':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Đã lấy hàng</Badge>;
      case 'exported':
        return <Badge variant="default" className="bg-green-100 text-green-800">Đã xuất kho</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Vừa xong';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} phút trước`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} giờ trước`;
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  };

  const handleNotificationClick = (notification: ExportSlipNotification) => {
    // Mark as read
    setNotifications(prev => 
      prev.map(n => 
        n.id === notification.id ? { ...n, is_read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    
    onNotificationClick?.(notification.export_slip_id);
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, is_read: true }))
    );
    setUnreadCount(0);
    toast({
      title: "Thành công",
      description: "Đã đánh dấu tất cả thông báo là đã đọc",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Thông báo phiếu xuất kho
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="bg-red-600">
              {unreadCount} mới
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Theo dõi trạng thái và cập nhật phiếu xuất kho
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {unreadCount > 0 && (
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm"
              onClick={markAllAsRead}
            >
              Đánh dấu tất cả đã đọc
            </Button>
          </div>
        )}

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có thông báo nào</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                  !notification.is_read ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getNotificationIcon(notification.type, notification.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">
                        {notification.export_slip_code}
                      </p>
                      {getStatusBadge(notification.status)}
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Đơn hàng: {notification.order_number} - {notification.customer_name}
                      </span>
                      <span>{formatDateTime(notification.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Notification Rules Info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Quy tắc thông báo</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Tạo phiếu:</strong> Gửi thông báo đến Quản lý kho</li>
            <li>• <strong>Đổi trạng thái:</strong> Gửi thông báo đến Thủ kho và người tạo phiếu</li>
            <li>• <strong>Trạng thái "Chờ":</strong> Chưa ảnh hưởng tồn kho</li>
            <li>• <strong>Trạng thái "Đã lấy hàng":</strong> Bắt đầu trừ tồn kho</li>
            <li>• <strong>Trạng thái "Đã xuất kho":</strong> Hoàn tất quy trình</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
