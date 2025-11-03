import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
// // import { supabase } from "@/integrations/supabase/client"; // Removed - using API instead // Removed - using API instead
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { paymentsApi } from "@/api/payments.api";
import { getErrorMessage } from "@/lib/error-utils";
import { DollarSign, Clock, Upload, X, FileText, Image } from "lucide-react";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onUpdate: () => void;
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  open,
  onOpenChange,
  order,
  onUpdate
}) => {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [bankAccount, setBankAccount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [bankAccounts, setBankAccounts] = useState<string[]>([
    'MB Bank',
    'TP Bank', 
    'Vietcombank',
    'Techcombank',
    'VietinBank',
    'BIDV',
    'Sacombank'
  ]);
  const { toast } = useToast();
  const { user } = useAuth();

  const totalAmount = Number(order?.total_amount || order?.tongTien) || 0;
  const paidAmount = Number(order?.initial_payment || order?.paid_amount) || 0;
  const debtAmount = Math.max(0, totalAmount - paidAmount);

  useEffect(() => {
    if (open && order?.id) {
      loadPaymentHistory();
    }
  }, [open, order?.id]);

  const loadPaymentHistory = async () => {
    try {
      const payments = await paymentsApi.getPaymentsByOrder(order.id);
      setPaymentHistory(payments);
    } catch (error: any) {
      toast({
        title: "Thông báo",
        description: "Tính năng thanh toán chưa được hỗ trợ bởi backend",
        variant: "default",
      });
    }
  };

  const handleAddPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) === 0) {
      toast({
        title: "Thông báo",
        description: "Vui lòng nhập số tiền thanh toán",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(paymentAmount);
      
      // Update order's initialPayment instead of creating payment record
      const { orderApi } = await import('@/api/order.api');
      const currentInitialPayment = order.initial_payment || 0;
      const newInitialPayment = currentInitialPayment + amount;
      
      await orderApi.updateOrder(order.id, {
        initialPayment: newInitialPayment
      });

      toast({
        title: "Thành công",
        description: amount >= 0 
          ? `Đã cập nhật thanh toán: ${formatCurrency(newInitialPayment)}`
          : `Đã điều chỉnh thanh toán: ${formatCurrency(newInitialPayment)}`,
      });

      onUpdate();
      loadPaymentHistory(); // Refresh payment history
      
      // Reset form
      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentMethod('cash');
      setBankAccount('');
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể thêm thanh toán"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPaymentMethodText = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'tiền mặt',
      bank_transfer: 'chuyển khoản',
      card: 'thẻ',
      other: 'khác'
    };
    return methods[method] || method;
  };

  const newPaidAmount = paidAmount + parseFloat(paymentAmount || '0');
  const newDebtAmount = totalAmount - newPaidAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm Thanh Toán</DialogTitle>
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
            <h4 className="font-medium">Thêm thanh toán mới</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment-amount">Số tiền thanh toán</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
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
            
            {/* Bank Account Selection for Bank Transfer */}
            {paymentMethod === 'bank_transfer' && (
              <div>
                <Label htmlFor="bank-account">Tài khoản ngân hàng</Label>
                <Select value={bankAccount} onValueChange={setBankAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn tài khoản ngân hàng" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((bank) => (
                      <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="payment-notes">Ghi chú thanh toán</Label>
              <Textarea
                id="payment-notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Ghi chú về khoản thanh toán này..."
              />
            </div>

            {/* File Upload */}
            <div>
              <Label>Tải lên hóa đơn/chứng từ</Label>
              <div className="mt-2">
                <Input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => {
                    if (e.target.files) {
                      setUploadedFiles(Array.from(e.target.files));
                    }
                  }}
                  className="hidden"
                  id="payment-files"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById('payment-files')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Chọn file (ảnh, PDF, Word)
                </Button>
                
                {/* Show uploaded files */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          {file.type.startsWith('image/') ? (
                            <Image className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                          <span className="text-sm">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(file.size / 1024 / 1024).toFixed(1)} MB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUploadedFiles(files => files.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* New Payment Summary */}
            {paymentAmount && parseFloat(paymentAmount) !== 0 && (
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

          {/* Payment History */}
          {paymentHistory.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Lịch sử thanh toán
                </h4>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ngày</TableHead>
                        <TableHead>Số tiền</TableHead>
                        <TableHead>Phương thức</TableHead>
                        <TableHead>Người tạo</TableHead>
                        <TableHead>Ghi chú</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentHistory.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {new Date(payment.payment_date).toLocaleDateString('vi-VN')}
                          </TableCell>
                          <TableCell>
                            <span className={payment.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(payment.amount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getPaymentMethodText(payment.payment_method)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {payment.creator_profile?.full_name || 'Không xác định'}
                          </TableCell>
                          <TableCell>{payment.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Hủy
          </Button>
          <Button onClick={handleAddPayment} disabled={loading}>
            {loading ? "Đang xử lý..." : "Thêm thanh toán"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

