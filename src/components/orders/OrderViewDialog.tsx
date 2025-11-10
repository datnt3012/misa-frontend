import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, DollarSign, User, Package, FileText, Building2, Mail, Phone, MapPin } from "lucide-react";
import { orderApi, Order } from "@/api/order.api";
import { paymentsApi, Payment } from "@/api/payments.api";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface OrderViewDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StatusHistoryItem {
  id: string;
  old_status?: string;
  new_status?: string;
  old_paid_amount?: number;
  new_paid_amount?: number;
  notes?: string;
  changed_by?: string;
  changed_at: string;
  user_profile?: {
    full_name: string;
  };
}

export const OrderViewDialog: React.FC<OrderViewDialogProps> = ({
  order,
  open,
  onOpenChange,
}) => {
  const [orderDetails, setOrderDetails] = useState<Order | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [activityHistory, setActivityHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && order) {
      loadOrderDetails();
      loadPaymentHistory();
      loadActivityHistory();
    }
  }, [open, order]);

  const loadOrderDetails = async () => {
    if (!order?.id) {
      return;
    }
    
    setLoading(true);
    try {
      const orderData = await orderApi.getOrder(order.id);
      setOrderDetails(orderData);
    } catch (error) {
      console.error('Error loading order details:', error);
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể tải chi tiết đơn hàng"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'Tiền mặt',
      bank_transfer: 'Chuyển khoản',
      card: 'Thẻ',
      other: 'Khác',
    };
    return methods[method] || method;
  };

  const loadPaymentHistory = async () => {
    if (!order?.id) {
      return;
    }
    
    try {
      const payments = await paymentsApi.getPaymentsByOrder(order.id);
      // Sort by payment date, most recent first
      payments.sort((a, b) => 
        new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      );
      setPaymentHistory(payments);
    } catch (error) {
      console.error('Error loading payment history:', error);
      setPaymentHistory([]);
    }
  };

  const loadActivityHistory = async () => {
    if (!order?.id || !orderDetails) {
      return;
    }
    
    try {
      // Create activity history from order data and payment history
      const activities: StatusHistoryItem[] = [];
      
      // Add order creation activity
      activities.push({
        id: 'creation',
        new_status: orderDetails.status,
        notes: `Đơn hàng ${orderDetails.order_number} được tạo`,
        changed_at: orderDetails.created_at,
        user_profile: orderDetails.creator_info ? {
          full_name: `${orderDetails.creator_info.firstName || ''} ${orderDetails.creator_info.lastName || ''}`.trim() || 'Hệ thống'
        } : { full_name: 'Hệ thống' }
      });

      // Add payment activities
      paymentHistory.forEach((payment, index) => {
        activities.push({
          id: `payment-${payment.id}`,
          new_status: orderDetails.status,
          notes: `Thanh toán ${formatCurrency(payment.amount)} bằng ${getPaymentMethodLabel(payment.payment_method)}${payment.notes ? ` - ${payment.notes}` : ''}`,
          changed_at: payment.payment_date,
          new_paid_amount: payment.amount,
          user_profile: payment.creator_profile || { full_name: 'Hệ thống' }
        });
      });

      // Add status change if updated
      if (orderDetails.updated_at && orderDetails.updated_at !== orderDetails.created_at) {
        // Only add if it's not too close to creation time (within 1 second)
        const timeDiff = new Date(orderDetails.updated_at).getTime() - new Date(orderDetails.created_at).getTime();
        if (timeDiff > 1000) {
          activities.push({
            id: 'update',
            new_status: orderDetails.status,
            notes: `Đơn hàng được cập nhật`,
            changed_at: orderDetails.updated_at,
            user_profile: { full_name: 'Hệ thống' }
          });
        }
      }

      // Add completion if completed
      if (orderDetails.completed_at) {
        activities.push({
          id: 'completion',
          new_status: 'completed',
          notes: `Đơn hàng hoàn thành`,
          changed_at: orderDetails.completed_at,
          user_profile: { full_name: 'Hệ thống' }
        });
      }

      // Sort by date, most recent first
      activities.sort((a, b) => 
        new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
      );
      
      setActivityHistory(activities);
    } catch (error) {
      console.error('Error loading activity history:', error);
      setActivityHistory([]);
    }
  };

  // Reload activity history when orderDetails or paymentHistory changes
  useEffect(() => {
    if (orderDetails) {
      loadActivityHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderDetails, paymentHistory]);

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: vi });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      processing: { label: 'Đang xử lý', variant: 'secondary' },
      shipped: { label: 'Đã xuất kho', variant: 'default' },
      completed: { label: 'Hoàn thành', variant: 'default' },
      cancelled: { label: 'Đã hủy', variant: 'destructive' },
      pending: { label: 'Chờ xử lý', variant: 'secondary' },
      confirmed: { label: 'Đã xác nhận', variant: 'default' },
      delivered: { label: 'Đã giao', variant: 'default' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getUserInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading && !orderDetails) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn hàng</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            Đang tải...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!orderDetails) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn hàng</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            Không có dữ liệu
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const totalAmount = orderDetails.total_amount || 0;
  const paidAmount = orderDetails.paid_amount || 0;
  const debtAmount = orderDetails.debt_amount || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle className="flex items-center justify-between">
            <span>Chi tiết đơn hàng</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Order Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Thông tin đơn hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Mã đơn hàng:</label>
                    <div className="text-base font-semibold">{orderDetails.order_number}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Trạng thái:</label>
                    <div>{getStatusBadge(orderDetails.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Ngày tạo:</label>
                    <div className="text-base">{formatDateTime(orderDetails.created_at)}</div>
                  </div>
                  {orderDetails.completed_at && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Ngày hoàn thành:</label>
                      <div className="text-base">{formatDateTime(orderDetails.completed_at)}</div>
                    </div>
                  )}
                  {orderDetails.contract_number && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Số hợp đồng:</label>
                      <div className="text-base">{orderDetails.contract_number}</div>
                    </div>
                  )}
                  {orderDetails.purchase_order_number && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Số PO:</label>
                      <div className="text-base">{orderDetails.purchase_order_number}</div>
                    </div>
                  )}
                  {orderDetails.notes && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Ghi chú:</label>
                      <div className="text-base">{orderDetails.notes}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Thông tin khách hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tên khách hàng:</label>
                    <div className="text-base font-semibold">{orderDetails.customer_name}</div>
                  </div>
                  {orderDetails.customer_code && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Mã khách hàng:</label>
                      <div className="text-base">{orderDetails.customer_code}</div>
                    </div>
                  )}
                  {orderDetails.customer_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Điện thoại:</label>
                        <div className="text-base">{orderDetails.customer_phone}</div>
                      </div>
                    </div>
                  )}
                  {orderDetails.customer_address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                      <div className="flex-1">
                        <label className="text-sm font-medium text-muted-foreground">Địa chỉ:</label>
                        <div className="text-base">{orderDetails.customer_address}</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* VAT Company Information */}
            {(orderDetails.taxCode || orderDetails.companyName || orderDetails.vatEmail || orderDetails.companyPhone || orderDetails.companyAddress) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Thông tin VAT
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {orderDetails.taxCode && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Mã số thuế:</label>
                        <div className="text-base">{orderDetails.taxCode}</div>
                      </div>
                    )}
                    {orderDetails.companyName && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Tên công ty:</label>
                        <div className="text-base">{orderDetails.companyName}</div>
                      </div>
                    )}
                    {orderDetails.companyPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Điện thoại công ty:</label>
                          <div className="text-base">{orderDetails.companyPhone}</div>
                        </div>
                      </div>
                    )}
                    {orderDetails.vatEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Email nhận hóa đơn VAT:</label>
                          <div className="text-base">{orderDetails.vatEmail}</div>
                        </div>
                      </div>
                    )}
                    {orderDetails.companyAddress && (
                      <div className="md:col-span-2 flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                        <div className="flex-1">
                          <label className="text-sm font-medium text-muted-foreground">Địa chỉ công ty:</label>
                          <div className="text-base">{orderDetails.companyAddress}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Receiver Information */}
            {(orderDetails.receiverName || orderDetails.receiverPhone || orderDetails.receiverAddress) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Thông tin người nhận</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {orderDetails.receiverName && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Tên người nhận:</label>
                        <div className="text-base">{orderDetails.receiverName}</div>
                      </div>
                    )}
                    {orderDetails.receiverPhone && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Điện thoại:</label>
                        <div className="text-base">{orderDetails.receiverPhone}</div>
                      </div>
                    )}
                    {orderDetails.receiverAddress && (
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-muted-foreground">Địa chỉ giao hàng:</label>
                        <div className="text-base">{orderDetails.receiverAddress}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Products */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Sản phẩm
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Tên SP</TableHead>
                      <TableHead className="text-center">SL</TableHead>
                      <TableHead className="text-right">Giá</TableHead>
                      <TableHead className="text-right">Tổng</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderDetails.items && orderDetails.items.length > 0 ? (
                      orderDetails.items.map((item, index) => (
                        <TableRow key={item.id || index}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{item.product_code || 'N/A'}</div>
                              <div className="text-sm text-muted-foreground">{item.product_name || 'N/A'}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.total_price)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Không có sản phẩm nào trong đơn hàng
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="mt-4 flex justify-end">
                  <div className="w-96 space-y-2">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Tổng tiền:</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span>Đã thanh toán:</span>
                      <span className="text-green-600">{formatCurrency(paidAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Còn nợ:</span>
                      <span className={debtAmount > 0 ? "text-red-600" : "text-green-600"}>
                        {formatCurrency(debtAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Lịch sử thanh toán
                </CardTitle>
                <CardDescription>
                  Tổng đã thanh toán: <span className="font-semibold text-green-600">{formatCurrency(paidAmount)}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paymentHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Chưa có lịch sử thanh toán
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paymentHistory.map((payment) => (
                      <div key={payment.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{getPaymentMethodLabel(payment.payment_method)}</Badge>
                            <span className="text-lg font-semibold text-green-600">
                              {formatCurrency(payment.amount)}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDateTime(payment.payment_date)}
                          </div>
                        </div>
                        {payment.notes && (
                          <div className="text-sm text-muted-foreground mt-2">
                            {payment.notes}
                          </div>
                        )}
                        {payment.creator_profile && (
                          <div className="text-xs text-muted-foreground mt-2">
                            Người tạo: {payment.creator_profile.full_name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Lịch sử hoạt động
                </CardTitle>
                <CardDescription>
                  Theo dõi các thay đổi của đơn hàng
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activityHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Chưa có lịch sử hoạt động
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activityHistory.map((item, index) => (
                      <div key={item.id} className="relative">
                        {index < activityHistory.length - 1 && (
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
                              {item.new_status && item.id !== 'payment' && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">Trạng thái:</span>
                                  {getStatusBadge(item.new_status)}
                                </div>
                              )}
                              
                              {item.new_paid_amount && item.id?.startsWith('payment') && (
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-600">
                                    {formatCurrency(item.new_paid_amount)}
                                  </span>
                                </div>
                              )}
                              
                              {item.notes && (
                                <div className="bg-gray-50 rounded-md p-3">
                                  <p className="text-sm text-gray-700">{item.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {index < activityHistory.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

