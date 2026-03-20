import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Clock, Package, Building2, Phone, MapPin, Edit2, User,
  ChevronRight, MoreHorizontal, Plus, Download, CreditCard,
  Tag, Activity, DollarSign, Wallet, FileText
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { orderApi, Order } from "@/api/order.api";
import { paymentsApi, Payment } from "@/api/payments.api";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS_VI,
  PURCHASE_ORDER_STATUSES,
  PURCHASE_ORDER_STATUS_LABELS_VI,
  getOrderStatusConfig
} from "@/constants/order-status.constants";
import { API_CONFIG } from "@/config/api";
import { formatCurrency } from "../../utils/formatters";
import { Separator } from "@/components/ui/separator";

interface OrderViewFormProps {
  orderId: string;
  onEdit?: () => void;
  onBack?: () => void;
}

interface StatusHistoryItem {
  id: string;
  action: string;
  title: string;
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

export const OrderViewForm: React.FC<OrderViewFormProps> = ({ orderId, onEdit, onBack }) => {
  const [orderDetails, setOrderDetails] = useState<Order | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [activityHistory, setActivityHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (orderId) {
      loadData();
    }
  }, [orderId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [orderData, payments, orderHistory] = await Promise.all([
        orderApi.getOrder(orderId),
        paymentsApi.getPaymentsByOrder(orderId),
        orderApi.getOrderHistory(orderId)
      ]);
      setOrderDetails(orderData);
      setPaymentHistory(payments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()));

      const mappedHistory: StatusHistoryItem[] = (orderHistory || []).map((item: any) => ({
        ...item,
        action: item.action || 'update',
        title: item.title || 'Cập nhật đơn hàng'
      }));
      setActivityHistory(mappedHistory);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể tải chi tiết đơn hàng"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!orderDetails) return;
    try {
      await orderApi.updateOrderStatus(orderId, newStatus);
      toast({ title: "Thành công", description: "Đã cập nhật trạng thái đơn hàng" });
      loadData();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể cập nhật trạng thái"),
        variant: "destructive",
      });
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: vi });
  };

  const getStatusBadge = (status: string, isPurchaseOrder: boolean = false) => {
    const config = getOrderStatusConfig(status, isPurchaseOrder);
    return (
      <Badge variant={config.variant as any} className={`${config.className} px-3 py-1 font-semibold`}>
        {config.label}
      </Badge>
    );
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

  const handleViewFile = (filePath: string) => {
    const baseUrl = API_CONFIG.BASE_URL || (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:3274/api/v0";
    const url = filePath.startsWith("http") ? filePath : `${baseUrl}/files/${encodeURIComponent(filePath)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading && !orderDetails) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!orderDetails) return <div className="text-center py-20 text-muted-foreground">Không tìm thấy đơn hàng</div>;

  const isPurchase = (orderDetails as any)?.type === 'purchase';
  const subtotal = orderDetails.items?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;
  const totalVat = orderDetails.items?.reduce((sum, item) => sum + ((item.vat_total_price || item.total_price) - (item.total_price || 0)), 0) || 0;
  const expensesTotal = orderDetails.expenses?.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) || 0;
  const totalAmount = orderDetails.totalVat > 0 ? orderDetails.totalVatAmount : orderDetails.totalAmount || 0;
  const paidAmount = paymentHistory.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const debtAmount = Math.max(0, totalAmount - paidAmount);

  return (
    <div className="animate-in fade-in duration-500 pb-20 space-y-6">
      {/* Header */}
      {/* <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={isPurchase ? onBack : () => window.history.back()} className="gap-2 text-slate-600 hover:text-slate-900">
             Quay lại
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Đơn hàng {orderDetails.order_number}
              <span className="text-slate-400 font-normal text-sm ml-2">
                {formatDateTime(orderDetails.created_at)}
              </span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
             <Edit2 className="w-4 h-4" /> Chỉnh sửa
           </Button>
           <Button variant="outline" size="sm" className="gap-2">
             <Download className="w-4 h-4" /> Xuất file
           </Button>
        </div>
      </div> */}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Sections */}
        <div className="lg:col-span-3 space-y-6">

          {/* Partner & Shipping Info (Image 2 Style) */}
          <div className="grid grid-cols-1 gap-6">
            <Card className="shadow-premium border-none">
              <CardHeader className="pb-3 flex flex-row items-center gap-2 border-b border-slate-50">
                <Building2 className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-sm font-bold uppercase tracking-tight text-slate-500">Khách hàng</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 items-start gap-2">
                    <Label className="text-xs text-muted-foreground pt-1">Tên công ty:</Label>
                    <div className="col-span-2 text-sm font-bold text-slate-900 group relative">
                      {orderDetails.companyName || orderDetails.customer_name}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 items-start gap-2">
                    <Label className="text-xs text-muted-foreground pt-1">Email công ty:</Label>
                    <div className="col-span-2 text-sm text-blue-600 underline">
                      {orderDetails.vatEmail || orderDetails.customer_email || '-'}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 items-start gap-2">
                    <Label className="text-xs text-muted-foreground pt-1">Tên người đặt hàng:</Label>
                    <div className="col-span-2 text-sm font-medium">
                      {orderDetails.customer_name}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 items-start gap-2">
                    <Label className="text-xs text-muted-foreground pt-1">Mã số thuế:</Label>
                    <div className="col-span-2 text-sm font-mono font-medium">
                      {orderDetails.taxCode || '-'}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 items-start gap-2">
                    <Label className="text-xs text-muted-foreground pt-1">Địa chỉ công ty:</Label>
                    <div className="col-span-2 text-sm leading-relaxed">
                      {orderDetails.companyAddress || orderDetails.customer_address || '-'}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 items-start gap-2">
                    <Label className="text-xs text-muted-foreground pt-1">Số điện thoại:</Label>
                    <div className="col-span-2 text-sm font-medium text-blue-600 underline">
                      {orderDetails.customer_phone || '-'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-premium border-none">
              <CardHeader className="pb-3 flex flex-row items-center gap-2 border-b border-slate-50">
                <Package className="w-4 h-4 text-amber-600" />
                <CardTitle className="text-sm font-bold uppercase tracking-tight text-slate-500">Vận chuyển</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                  <div className="grid grid-cols-3 items-start gap-2">
                    <Label className="text-xs text-muted-foreground pt-1">Người nhận:</Label>
                    <div className="col-span-2 text-sm font-bold text-slate-900">{orderDetails.receiverName || '-'}</div>
                  </div>
                  <div className="grid grid-cols-3 items-start gap-2">
                    <Label className="text-xs text-muted-foreground pt-1">SĐT người nhận:</Label>
                    <div className="col-span-2 text-sm font-medium">{orderDetails.receiverPhone || '-'}</div>
                  </div>
                  <div className="grid grid-cols-3 items-start gap-2 md:col-span-2 h-auto">
                    <Label className="text-xs text-muted-foreground pt-1">Địa chỉ:</Label>
                    <div className="col-span-2 text-sm leading-relaxed text-blue-600 underline">
                      {orderDetails.receiverAddress || '-'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Products Table (Image 3 Style) */}
          <Card className="shadow-premium border-none overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-50">
              <CardTitle className="text-sm font-bold uppercase tracking-tight text-slate-500 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                Sản phẩm
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead>Tên SP</TableHead>
                    <TableHead className="w-32">Hãng SX</TableHead>
                    <TableHead className="w-20 text-center">SL</TableHead>
                    <TableHead className="w-32 text-right">Thuế</TableHead>
                    <TableHead className="w-32 text-right">Tổng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderDetails.items?.map((item, idx) => {
                    const itemVat = (item.vat_total_price || item.total_price) - (item.total_price || 0);
                    return (
                      <TableRow key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="text-center text-slate-400 font-medium">{idx + 1}</TableCell>
                        <TableCell className="py-3">
                          <div>
                            <div className="font-bold text-slate-900">[{item.product_code}]</div>
                            <div className="text-sm text-slate-600 leading-snug">{item.product_name}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-500">{item.manufacturer || '-'}</TableCell>
                        <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          <div className="text-slate-900 font-medium">{formatCurrency(itemVat)}</div>
                          <div className="text-[10px] text-slate-400 border border-slate-100 rounded px-1 inline-block mt-0.5 bg-slate-50">
                            {item.vat_percentage ?? 0}% VAT
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900">
                          {formatCurrency(item.vat_total_price || item.total_price)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <tfoot>
                  <TableRow className="bg-slate-50/30">
                    <TableCell colSpan={3} className="pl-6 font-bold text-slate-900">Tổng</TableCell>
                    <TableCell className="text-center font-bold text-slate-900">
                      {orderDetails.items?.reduce((s, i) => s + (i.quantity || 0), 0)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">{formatCurrency(totalVat)}</TableCell>
                    <TableCell className="text-right font-bold text-slate-900">{formatCurrency(subtotal + totalVat)}</TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar (Image 1 Style) */}
        <div className="space-y-6">

          {/* Status Section */}
          <Card className="shadow-premium border-none">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Status</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <Select
                value={typeof orderDetails.status === 'object' ? orderDetails.status?.code : orderDetails.status}
                onValueChange={handleUpdateStatus}
              >
                <SelectTrigger className="w-full h-10 font-semibold border-slate-200 focus:ring-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(isPurchase ? PURCHASE_ORDER_STATUSES : ORDER_STATUSES).map(s => (
                    <SelectItem key={s} value={s}>
                      {(isPurchase ? PURCHASE_ORDER_STATUS_LABELS_VI : ORDER_STATUS_LABELS_VI)[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" size="sm" className="w-full text-xs h-9 justify-start font-medium">
                  <FileText className="w-3.5 h-3.5 mr-2 text-slate-400" /> Tạo phiếu xuất kho
                </Button>
                <Button variant="outline" size="sm" className="w-full text-xs h-9 justify-start font-medium">
                  <Plus className="w-3.5 h-3.5 mr-2 text-slate-400" /> Thêm thanh toán
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment Info Section */}
          <Card className="shadow-premium border-none">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Thông tin thanh toán</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Phương thức</span>
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase">
                  <CreditCard className="w-3 h-3" /> {getPaymentMethodLabel(orderDetails.payment_method || 'cash')}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Trạng thái</span>
                <Badge className={`${debtAmount === 0
                    ? "bg-emerald-50 text-emerald-600"
                    : paidAmount > 0
                      ? "bg-amber-50 text-amber-600"
                      : "bg-red-50 text-red-600"
                  } border-none shadow-none text-[10px] px-2 py-0.5`}>
                  {debtAmount === 0 ? "Đã thanh toán" : paidAmount > 0 ? "Thanh toán một phần" : "Chưa thanh toán"}
                </Badge>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs text-slate-500">Đã thanh toán</span>
                <span className="text-sm font-bold text-emerald-600">{formatCurrency(paidAmount)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-50 pt-2">
                <span className="text-xs text-slate-500">Còn lại</span>
                <span className="text-sm font-bold text-red-500">{formatCurrency(debtAmount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Cost Breakdown Section */}
          <Card className="shadow-premium border-none bg-slate-50/50">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chi phí đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Tạm tính</span>
                <span className="text-xs font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Phí vận chuyển</span>
                <span className="text-xs font-medium">{formatCurrency(0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Thuế (VAT)</span>
                <span className="text-xs font-medium">{formatCurrency(totalVat)}</span>
              </div>

              {/* Other Expenses Sub-list */}
              {(orderDetails.expenses && orderDetails.expenses.length > 0) && (
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-100 pb-1 mb-1">Chi phí khác</div>
                  {orderDetails.expenses.map((exp, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 italic">• {exp.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{formatCurrency(exp.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-1 font-bold">
                    <span className="text-[10px] text-slate-900">Tổng chi phí</span>
                    <span className="text-[10px] text-slate-900">{formatCurrency(expensesTotal)}</span>
                  </div>
                </div>
              )}

              <Separator className="bg-slate-200" />
              <div className="flex justify-between items-end pt-1">
                <span className="text-xs font-bold text-slate-900 uppercase">Tổng cộng</span>
                <span className="text-lg font-black text-slate-900 leading-none">{formatCurrency(totalAmount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Tags Section */}
          <Card className="shadow-premium border-none">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nhãn đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex flex-wrap gap-1.5">
                {(orderDetails.tags && orderDetails.tags.length > 0) ? orderDetails.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 border-none">
                    {tag}
                  </Badge>
                )) : (
                  <span className="text-xs text-slate-400 italic">Không có nhãn</span>
                )}
                <Button variant="outline" size="icon" className="h-6 w-6 rounded-full border-dashed">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activity Log Section */}
          <Card className="shadow-premium border-none">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Activity Log</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-4 pt-2">
                {activityHistory.slice(0, 5).map((log, i) => (
                  <div key={log.id} className="relative pl-5 border-l border-slate-100 pb-1 last:pb-0">
                    <div className="absolute left-[-4.5px] top-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white" />
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-bold text-slate-800 leading-tight">{log.title}</p>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        {log.user_profile?.full_name || 'Hệ thống'} • {formatDateTime(log.changed_at)}
                      </p>
                      {log.notes && <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-1 rounded leading-tight">{log.notes}</p>}
                    </div>
                  </div>
                ))}
                {activityHistory.length > 5 && (
                  <Button variant="link" className="text-[10px] h-auto p-0 text-blue-500">Xem tất cả ({activityHistory.length})</Button>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

