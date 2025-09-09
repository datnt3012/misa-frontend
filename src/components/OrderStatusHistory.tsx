import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// // import { supabase } from "@/integrations/supabase/client"; // Removed - using API instead // Removed - using API instead
import { Clock, DollarSign, User, Package } from "lucide-react";

interface OrderStatusHistoryProps {
  orderId: string;
}

interface StatusHistoryItem {
  id: string;
  old_status: string;
  new_status: string;
  old_paid_amount: number;
  new_paid_amount: number;
  notes: string;
  changed_by: string;
  changed_at: string;
  export_slip_action?: string | null;
  export_slip_id?: string | null;
  user_profile?: {
    full_name: string;
  };
  export_slip?: {
    slip_number: string;
    status: string;
  };
}

export const OrderStatusHistory: React.FC<OrderStatusHistoryProps> = ({ orderId }) => {
  const [history, setHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [orderId]);

  const loadHistory = async () => {
    try {
      // Fetch order status history with export slip info
      const { data: historyData, error: historyError } = await supabase
        .from('order_status_history')
        .select(`
          *,
          export_slip:export_slips (
            slip_number,
            status
          )
        `)
        .eq('order_id', orderId)
        .order('changed_at', { ascending: false });

      if (historyError) throw historyError;

      // Fetch order creation date
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('created_at, created_by, order_number')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Fetch profiles for all unique changed_by users
      const userIds = [...new Set(historyData?.map(h => h.changed_by).filter(Boolean) || [])];
      
      let profilesMap: Record<string, { full_name: string }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        if (!profilesError && profilesData) {
          profilesMap = profilesData.reduce((acc, profile) => {
            acc[profile.id] = { full_name: profile.full_name || 'Không xác định' };
            return acc;
          }, {} as Record<string, { full_name: string }>);
        }
      }

      // Combine history with profile data
      const enrichedHistory = historyData?.map(item => ({
        ...item,
        user_profile: item.changed_by ? profilesMap[item.changed_by] || { full_name: 'Không xác định' } : { full_name: 'Hệ thống' }
      })) || [];

      // Add order creation entry if not already present
      const hasCreationEntry = enrichedHistory.some(item => item.notes?.includes('Đơn hàng được tạo'));
      if (!hasCreationEntry && orderData) {
        const creationEntry = {
          id: 'creation',
          order_id: orderId,
          old_status: null,
          new_status: 'pending',
          old_paid_amount: 0,
          new_paid_amount: 0,
          notes: `Đơn hàng ${orderData.order_number} được tạo`,
          changed_by: orderData.created_by,
          changed_at: orderData.created_at,
          export_slip_action: null,
          export_slip_id: null,
          export_slip: undefined,
          user_profile: orderData.created_by ? profilesMap[orderData.created_by] || { full_name: 'Không xác định' } : { full_name: 'Hệ thống' }
        };
        enrichedHistory.push(creationEntry);
      }

      // Sort by date, most recent first
      enrichedHistory.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());

      setHistory(enrichedHistory);
    } catch (error) {
      console.error('Error loading status history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      processing: { label: 'Đang xử lý', variant: 'secondary' as const },
      shipped: { label: 'Đã xuất kho', variant: 'default' as const },
      completed: { label: 'Hoàn thành', variant: 'default' as const },
      cancelled: { label: 'Đã hủy', variant: 'destructive' as const },
      pending: { label: 'Chờ xử lý', variant: 'secondary' as const },
      confirmed: { label: 'Đã xác nhận', variant: 'default' as const },
      shipping: { label: 'Đang giao', variant: 'default' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getUserInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Lịch sử thay đổi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Đang tải...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Lịch sử thay đổi
        </CardTitle>
        <CardDescription>
          Theo dõi tất cả thay đổi trạng thái và thanh toán của đơn hàng
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có thay đổi nào
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item, index) => (
                <div key={item.id} className="relative">
                  {index < history.length - 1 && (
                    <div className="absolute left-5 top-12 w-0.5 h-full bg-gray-200" />
                  )}
                  
                  <div className="flex gap-4">
                    <Avatar className="w-10 h-10 border-2 border-background">
                      <AvatarFallback className="text-xs">
                        {getUserInitials(item.user_profile?.full_name || 'Unknown')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{item.user_profile?.full_name || 'Hệ thống'}</span>
                        <span>•</span>
                        <span>{formatDateTime(item.changed_at)}</span>
                      </div>
                      
                      <div className="space-y-2">
                        {/* Status change */}
                        {item.old_status !== item.new_status && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Thay đổi trạng thái:</span>
                            {getStatusBadge(item.old_status)}
                            <span>→</span>
                            {getStatusBadge(item.new_status)}
                          </div>
                        )}
                        
                        {/* Payment change */}
                        {item.old_paid_amount !== item.new_paid_amount && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="text-sm">Thanh toán:</span>
                            <span className="text-green-600 font-medium">
                              +{formatCurrency(item.new_paid_amount - item.old_paid_amount)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({formatCurrency(item.old_paid_amount)} → {formatCurrency(item.new_paid_amount)})
                            </span>
                          </div>
                        )}
                        
                        {/* Export slip info */}
                        {item.export_slip_action && item.export_slip && (
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-blue-600" />
                            <span className="text-sm">
                              {item.export_slip_action === 'approved' ? 'Duyệt phiếu xuất:' : 'Hoàn thành xuất:'}
                            </span>
                            <Badge variant="outline">{item.export_slip.slip_number}</Badge>
                          </div>
                        )}
                        
                        {/* Notes */}
                        {item.notes && (
                          <div className="bg-gray-50 rounded-md p-3">
                            <p className="text-sm text-gray-700">{item.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {index < history.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

