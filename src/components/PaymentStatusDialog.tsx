import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// // import { supabase } from "@/integrations/supabase/client"; // Removed - using API instead // Removed - using API instead
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { DollarSign, AlertTriangle } from "lucide-react";
import { DocumentUpload } from "@/components/documents/DocumentUpload";

interface PaymentStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onUpdate: () => void;
}

export const PaymentStatusDialog: React.FC<PaymentStatusDialogProps> = ({
  open,
  onOpenChange,
  order,
  onUpdate
}) => {
  const [newStatus, setNewStatus] = useState(order?.status || '');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const totalAmount = Number(order?.total_amount || order?.tongTien) || 0;
  const paidAmount = Number(order?.paid_amount || order?.initial_payment) || 0;
  const debtAmount = Math.max(0, totalAmount - paidAmount);

  const handleUpdate = async () => {
    if (!paymentAmount || paymentAmount === 0 && newStatus === order?.status) {
      toast({
        title: "Thông báo",
        description: "Vui lòng nhập số tiền thanh toán hoặc thay đổi trạng thái",
        variant: "destructive",
      });
      return;
    }

    try {
      // Validate completion rules
      if (newStatus === 'completed') {
        const newPaidAmount = paidAmount + (paymentAmount || 0);
        if (newPaidAmount < totalAmount) {
          toast({
            title: "Không thể hoàn thành",
            description: "Đơn hàng chỉ có thể hoàn thành khi đã thanh toán đủ số tiền",
            variant: "destructive",
          });
          return;
        }
      }

      // Add payment if amount is provided
      if (paymentAmount && paymentAmount !== 0) {
        const amount = paymentAmount;
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            order_id: order.id,
            amount: amount,
            payment_method: paymentMethod,
            payment_date: new Date().toISOString().split('T')[0],
            notes: paymentNotes,
            created_by: user?.id
          });

        if (paymentError) throw paymentError;
      }

      // Update order status if changed
      if (newStatus !== order.status) {
        const { error: statusError } = await supabase
          .from('orders')
          .update({ status: newStatus })
          .eq('id', order.id);

        if (statusError) throw statusError;
      }

      // Add status history entry when there's meaningful changes
      if (statusNotes || paymentAmount || newStatus !== order.status) {
        const currentPaidAmount = paymentAmount || 0;
        const { error: historyError } = await supabase
          .from('order_status_history')
          .insert({
            order_id: order.id,
            old_status: order.status,
            new_status: newStatus,
            old_paid_amount: paidAmount,
            new_paid_amount: paidAmount + currentPaidAmount,
            notes: statusNotes || (currentPaidAmount > 0 ? `Thanh toán ${formatCurrency(currentPaidAmount)} qua ${paymentMethod}` : ''),
            changed_by: user?.id
          });

        if (historyError) throw historyError;
      }

      // Send email notifications
      try {
        await supabase.functions.invoke('send-order-emails', {
          body: {
            orderId: order.id,
            orderNumber: order.order_number,
            customerName: order.customer_name,
            oldStatus: order.status,
            newStatus: newStatus,
            message: `Đơn hàng đã được cập nhật. ${paymentAmount && paymentAmount > 0 ? `Thanh toán ${formatCurrency(paymentAmount)} qua ${paymentMethod}.` : ''} ${statusNotes || ''}`,
            changeType: 'status'
          }
        });
      } catch (emailError) {
        console.error('Error sending email notifications:', emailError);
        // Don't fail the main operation if email fails
      }

      const paymentAmt = paymentAmount || 0;
      toast({
        title: "Thành công",
        description: paymentAmt !== 0 
          ? (paymentAmt > 0 
              ? `Đã cập nhật đơn hàng và ghi nhận doanh thu ${formatCurrency(paymentAmt)}`
              : `Đã cập nhật đơn hàng và điều chỉnh doanh thu ${formatCurrency(paymentAmt)}`)
          : "Đã cập nhật đơn hàng",
      });

      onUpdate();
      onOpenChange(false);
      
      // Reset form
      setPaymentAmount('');
      setPaymentNotes('');
      setStatusNotes('');
      setNewStatus(order?.status || '');
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast({
        title: "Lỗi", 
        description: error.message || "Không thể cập nhật đơn hàng",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0
    }).format(amount);
  };

  const newPaidAmount = paidAmount + (paymentAmount || 0);
  const newDebtAmount = totalAmount - newPaidAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cập Nhật Thanh Toán & Trạng Thái</DialogTitle>
          <DialogDescription>
            Đơn hàng {order?.order_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Payment Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Thông tin thanh toán hiện tại
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Tổng tiền:</span>
                <span className="font-medium">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Đã thanh toán:</span>
                <span className="font-medium text-green-600">{formatCurrency(paidAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Còn nợ:</span>
                <span className={`font-medium ${debtAmount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {formatCurrency(debtAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Add Payment */}
          <div className="space-y-4">
            <h4 className="font-medium">Thêm thanh toán</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment-amount">Số tiền thanh toán</Label>
                <CurrencyInput
                  id="payment-amount"
                  value={paymentAmount}
                  onChange={(value) => setPaymentAmount(value)}
                  placeholder="Nhập số tiền (cho phép số âm để điều chỉnh)"
                />
              </div>
              <div>
                <Label htmlFor="payment-method">Phương thức</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Tiền mặt</SelectItem>
                    <SelectItem value="bank_transfer">Chuyển khoản</SelectItem>
                    <SelectItem value="card">Thẻ</SelectItem>
                    <SelectItem value="other">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="payment-notes">Ghi chú thanh toán</Label>
              <Textarea
                id="payment-notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Ghi chú về khoản thanh toán này..."
              />
            </div>

            {/* New Payment Summary */}
            {paymentAmount && paymentAmount !== 0 && (
              <Card className="bg-blue-50">
                <CardContent className="pt-4">
                  <h5 className="font-medium mb-2">Sau khi thanh toán:</h5>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Đã thanh toán:</span>
                      <span className="font-medium text-green-600">{formatCurrency(newPaidAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Còn nợ:</span>
                      <span className={`font-medium ${newDebtAmount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {formatCurrency(newDebtAmount)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          {/* Update Status */}
          <div className="space-y-4">
            <h4 className="font-medium">Cập nhật trạng thái</h4>
            <div>
              <Label htmlFor="new-status">Trạng thái mới</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="processing">Đang Xử Lý</SelectItem>
                  <SelectItem value="shipped">Đã Xuất Kho</SelectItem>
                  <SelectItem value="completed">Hoàn Thành</SelectItem>
                  <SelectItem value="cancelled">Đã Hủy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Completion Warning */}
            {newStatus === 'completed' && newDebtAmount > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Không thể hoàn thành đơn hàng khi còn nợ {formatCurrency(newDebtAmount)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <Label htmlFor="status-notes">Ghi chú thay đổi</Label>
              <Textarea
                id="status-notes"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Ghi chú về việc thay đổi trạng thái..."
              />
            </div>

            <Separator />

            {/* Document Upload */}
            <div className="space-y-4">
              <h4 className="font-medium">Tài liệu đính kèm</h4>
              <DocumentUpload
                orderId={order?.id}
                documentType="status_update"
                label="Tải lên tài liệu liên quan"
                onDocumentUploaded={(doc) => {}}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleUpdate}>
            Cập nhật
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

