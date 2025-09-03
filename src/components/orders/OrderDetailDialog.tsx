import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OrderDetailDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OrderDetailDialog: React.FC<OrderDetailDialogProps> = ({
  order,
  open,
  onOpenChange,
}) => {
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && order) {
      loadOrderDetails();
    }
  }, [open, order]);

  const loadOrderDetails = async () => {
    if (!order?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (
            name,
            phone,
            address,
            customer_code
          ),
          order_items (
            id,
            product_code,
            product_name,
            quantity,
            unit_price,
            total_price
          ),
          order_tag_assignments (
            order_tags (
              id,
              name,
              color
            )
          )
        `)
        .eq('id', order.id)
        .single();

      if (error) throw error;
      setOrderDetails(data);
    } catch (error) {
      console.error('Error loading order details:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải chi tiết đơn hàng",
        variant: "destructive",
      });
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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      'pending': { label: 'Chờ xử lý', variant: 'secondary' },
      'confirmed': { label: 'Đã xác nhận', variant: 'default' },
      'processing': { label: 'Đang xử lý', variant: 'default' },
      'picked': { label: 'Đã lấy hàng', variant: 'default' },
      'handover': { label: 'Bàn giao ĐVVC', variant: 'default' },
      'delivered': { label: 'Đã giao hàng', variant: 'default' },
      'completed': { label: 'Hoàn thành', variant: 'default' },
      'cancelled': { label: 'Đã hủy', variant: 'destructive' },
    };
    
    const statusInfo = statusMap[status] || { label: status, variant: 'secondary' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      'unpaid': { label: 'Chưa thanh toán', variant: 'destructive' },
      'partially_paid': { label: 'Thanh toán một phần', variant: 'secondary' },
      'paid': { label: 'Đã thanh toán', variant: 'default' },
      'refunded': { label: 'Đã hoàn tiền', variant: 'outline' },
    };
    
    const statusInfo = statusMap[status] || { label: status, variant: 'secondary' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (!orderDetails) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn hàng</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            {loading ? "Đang tải..." : "Không có dữ liệu"}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const tags = orderDetails.order_tag_assignments?.map((assignment: any) => assignment.order_tags) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết đơn hàng #{orderDetails.order_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Họ tên:</label>
                <div className="text-base font-medium">{orderDetails.customer_name}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Điện thoại:</label>
                <div className="text-base">{orderDetails.customer_phone || '-'}</div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Nhãn khách hàng:</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {tags.length > 0 ? (
                    tags.map((tag: any) => (
                      <Badge 
                        key={tag.id} 
                        style={{ backgroundColor: tag.color, color: 'white' }}
                      >
                        {tag.name}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="destructive">Chưa đối soát</Badge>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Ghi chú:</label>
                <div className="text-base">{orderDetails.notes || '-'}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Mã khách hàng:</label>
                <div className="text-base">{orderDetails.customers?.customer_code || '-'}</div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Email:</label>
                <div className="text-base">{orderDetails.vat_invoice_email || '-'}</div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Ghi chú nội bộ:</label>
                <div className="text-base">-</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Shipping Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚚</span>
              <h3 className="text-lg font-semibold">Vận chuyển</h3>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tên người nhận hàng:</label>
                <div className="text-base font-medium">{orderDetails.customer_name}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">SĐT người nhận hàng:</label>
                <div className="text-base">{orderDetails.customer_phone || '-'}</div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Địa chỉ:</label>
              <div className="text-base text-blue-600 underline cursor-pointer">
                {orderDetails.customer_address || orderDetails.customers?.address || '-'}
              </div>
            </div>
          </div>

          <Separator />

          {/* Products */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">📦</span>
              <h3 className="text-lg font-semibold">Sản phẩm</h3>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Tên SP</TableHead>
                  <TableHead className="text-center">KL</TableHead>
                  <TableHead className="text-center">SL</TableHead>
                  <TableHead className="text-right">Giá</TableHead>
                  <TableHead className="text-right">Tổng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderDetails.order_items?.map((item: any, index: number) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{item.product_code}</div>
                        <div className="text-sm text-muted-foreground">{item.product_name}</div>
                        <div className="text-xs text-blue-600">Ghi chú:</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.total_price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span>Tổng</span>
                  <span className="font-medium">{orderDetails.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Tổng tiền:</span>
                  <span>{formatCurrency(orderDetails.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Order Status and Info */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Trạng thái xử lý:</span>
                {getStatusBadge(orderDetails.order_status || orderDetails.status)}
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Trạng thái thanh toán:</span>
                {getPaymentStatusBadge(orderDetails.payment_status || 'unpaid')}
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Người tạo đơn:</span>
                <span>{orderDetails.profiles?.full_name || 'Hệ thống'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Ngày tạo:</span>
                <span>{new Date(orderDetails.created_at).toLocaleDateString('vi-VN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Tổng tiền:</span>
                <span className="font-medium">{formatCurrency(orderDetails.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Đã thanh toán:</span>
                <span className="text-green-600">{formatCurrency(orderDetails.paid_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Còn nợ:</span>
                <span className="text-red-600">{formatCurrency(orderDetails.debt_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};