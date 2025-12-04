import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { paymentsApi, CreateMultiplePaymentResponse } from "@/api/payments.api";
import { orderApi } from "@/api/order.api";
import { getErrorMessage } from "@/lib/error-utils";
import { DollarSign, Package, X } from "lucide-react";
import { format } from "date-fns";

interface MultiplePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderIds: string[];
  orders: any[]; // All orders from the page
  onUpdate: () => void;
  onRemoveOrder?: (orderId: string) => void; // Callback to remove order from selection
}

export const MultiplePaymentDialog: React.FC<MultiplePaymentDialogProps> = ({
  open,
  onOpenChange,
  orderIds,
  orders,
  onUpdate,
  onRemoveOrder
}) => {
  const [selectedOrders, setSelectedOrders] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [totalDebt, setTotalDebt] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'card' | 'other'>('cash');
  const [bankAccount, setBankAccount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [paymentResult, setPaymentResult] = useState<CreateMultiplePaymentResponse | null>(null);
  const { toast } = useToast();

  // Load selected orders details
  useEffect(() => {
    if (open && orderIds.length > 0) {
      const selected = orders.filter(order => orderIds.includes(order.id));
      setSelectedOrders(selected);
      
      // Calculate total amount of selected orders
      const total = selected.reduce((sum, order) => {
        return sum + (Number(order.total_amount) || 0);
      }, 0);
      setTotalAmount(total);
      
      // Calculate total debt of selected orders
      const debt = selected.reduce((sum, order) => {
        const orderTotal = Number(order.total_amount) || 0;
        const orderPaid = Number(order.initial_payment || order.paid_amount) || 0;
        const orderDebt = Math.max(0, orderTotal - orderPaid);
        return sum + orderDebt;
      }, 0);
      setTotalDebt(debt);
      
      // Set initial payment amount to total debt (can be changed)
      setPaymentAmount(debt);
      
      // Load banks
      loadBanks();
    } else if (open && orderIds.length === 0) {
      // If no orders selected, close dialog
      onOpenChange(false);
    }
  }, [open, orderIds, orders, onOpenChange]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setPaymentResult(null);
      setPaymentAmount(0);
      setPaymentMethod('cash');
      setBankAccount('');
      setPaymentNotes('');
    }
  }, [open]);

  const loadBanks = async () => {
    try {
      const banksList = await orderApi.getBanks();
      setBanks(banksList || []);
    } catch (error) {
      console.error('[MultiplePaymentDialog] Error loading banks:', error);
      setBanks([]);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleRemoveOrder = (orderId: string) => {
    const updatedOrders = selectedOrders.filter(order => order.id !== orderId);
    setSelectedOrders(updatedOrders);
    
    // Recalculate total amount
    const total = updatedOrders.reduce((sum, order) => {
      return sum + (Number(order.total_amount) || 0);
    }, 0);
    setTotalAmount(total);
    
    // Recalculate total debt
    const debt = updatedOrders.reduce((sum, order) => {
      const orderTotal = Number(order.total_amount) || 0;
      const orderPaid = Number(order.initial_payment || order.paid_amount) || 0;
      const orderDebt = Math.max(0, orderTotal - orderPaid);
      return sum + orderDebt;
    }, 0);
    setTotalDebt(debt);
    
    // Update payment amount if it was set to the old total debt or exceeds new total debt
    if (paymentAmount >= totalDebt) {
      setPaymentAmount(Math.max(0, debt));
    }
    
    // Call parent callback to update selected orders
    if (onRemoveOrder) {
      onRemoveOrder(orderId);
    }
    
    // If no orders left, show warning
    if (updatedOrders.length === 0) {
      toast({
        title: "Thông báo",
        description: "Đã bỏ chọn tất cả đơn hàng. Vui lòng đóng dialog và chọn lại.",
        variant: "default",
      });
    }
  };

  const handleSubmit = async () => {
    const currentOrderIds = selectedOrders.map(order => order.id);
    
    if (currentOrderIds.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ít nhất một đơn hàng",
        variant: "destructive",
      });
      return;
    }

    if (!paymentAmount || paymentAmount <= 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập số tiền thanh toán",
        variant: "destructive",
      });
      return;
    }

    // Warning if payment amount exceeds total debt
    if (paymentAmount > totalDebt) {
      const excess = paymentAmount - totalDebt;
      const confirmed = window.confirm(
        `Số tiền thanh toán (${formatCurrency(paymentAmount)}) vượt quá tổng còn nợ (${formatCurrency(totalDebt)}).\n` +
        `Phần thừa: ${formatCurrency(excess)} sẽ được tính là thanh toán thừa.\n\n` +
        `Bạn có chắc chắn muốn tiếp tục?`
      );
      if (!confirmed) {
        return;
      }
    }

    // Validate bank selection for bank transfer
    if (paymentMethod === 'bank_transfer' && !bankAccount) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ngân hàng khi thanh toán bằng chuyển khoản",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await paymentsApi.createMultiplePayments({
        orderIds: currentOrderIds,
        totalAmount: paymentAmount,
        paymentDate: new Date().toISOString(),
        paymentMethod: paymentMethod,
        bank: paymentMethod === 'bank_transfer' && bankAccount ? bankAccount : undefined,
        note: paymentNotes || undefined,
      });

      setPaymentResult(result);
      
      toast({
        title: "Thành công",
        description: `Đã tạo thanh toán gộp cho ${currentOrderIds.length} đơn hàng`,
      });

      // Call onUpdate after a short delay to allow backend to process
      setTimeout(() => {
        onUpdate();
      }, 500);
    } catch (error: any) {
      console.error('[MultiplePaymentDialog] Error creating multiple payments:', error);
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể tạo thanh toán gộp"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodText = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'Tiền mặt',
      bank_transfer: 'Chuyển khoản',
      card: 'Thẻ',
      other: 'Khác'
    };
    return methods[method] || method;
  };

  const getBankName = (bankIdOrName: string | undefined): string => {
    if (!bankIdOrName) return '';
    const bankById = banks.find(b => b.id === bankIdOrName);
    if (bankById) return bankById.name;
    const bankByName = banks.find(b => b.name === bankIdOrName);
    if (bankByName) return bankByName.name;
    return bankIdOrName;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thanh Toán Gộp</DialogTitle>
          <DialogDescription>
            Thanh toán cho {selectedOrders.length} đơn hàng đã chọn
          </DialogDescription>
        </DialogHeader>

        {!paymentResult ? (
          <div className="space-y-6">
            {/* Payment Form */}
            <div className="space-y-4">
              <h4 className="font-medium">Thông tin thanh toán</h4>
              
              <div>
                <Label htmlFor="payment-amount">Số tiền thanh toán <span className="text-red-500">*</span></Label>
                <CurrencyInput
                  id="payment-amount"
                  value={paymentAmount}
                  onChange={(value) => setPaymentAmount(value)}
                  placeholder="Nhập số tiền"
                  className={paymentAmount > totalDebt ? "border-red-500" : ""}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tối đa: {formatCurrency(totalDebt)}
                </p>
                {paymentAmount > totalDebt && (
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    ⚠️ Số tiền vượt quá tổng còn nợ. Phần thừa sẽ được tính là thanh toán thừa.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="payment-method">Phương thức thanh toán <span className="text-red-500">*</span></Label>
                <Select 
                  value={paymentMethod} 
                  onValueChange={(value: 'cash' | 'bank_transfer' | 'card' | 'other') => {
                    setPaymentMethod(value);
                    if (value !== 'bank_transfer') {
                      setBankAccount('');
                    }
                  }}
                >
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

              {/* Bank Account Selection for Bank Transfer */}
              {paymentMethod === 'bank_transfer' && (
                <div>
                  <Label htmlFor="bank-account">Ngân hàng <span className="text-red-500">*</span></Label>
                  <Select value={bankAccount} onValueChange={setBankAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn ngân hàng" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.length > 0 ? (
                        banks.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>Đang tải danh sách ngân hàng...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="payment-notes">Ghi chú</Label>
                <Textarea
                  id="payment-notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Ghi chú về khoản thanh toán gộp..."
                  rows={3}
                />
              </div>
            </div>

            {/* Selected Orders Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Danh sách đơn hàng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã đơn</TableHead>
                        <TableHead className="text-right">Tổng tiền</TableHead>
                        <TableHead className="text-right">Đã trả</TableHead>
                        <TableHead className="text-right">Còn nợ</TableHead>
                        <TableHead className="text-center w-[100px]">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrders.map((order) => {
                        const total = Number(order.total_amount) || 0;
                        const paid = Number(order.initial_payment || order.paid_amount) || 0;
                        const debt = Math.max(0, total - paid);
                        return (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.order_number}</TableCell>
                            <TableCell className="text-right">{formatCurrency(total)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatCurrency(paid)}</TableCell>
                            <TableCell className="text-right text-red-600">{formatCurrency(debt)}</TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveOrder(order.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="border-t bg-muted/50 p-3 space-y-2">
                    <div className="flex justify-between font-medium">
                      <span>Tổng giá trị:</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Tổng còn nợ:</span>
                      <span className="text-red-600">{formatCurrency(totalDebt)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Success Message */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <DollarSign className="w-12 h-12 mx-auto mb-2 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-800 mb-2">Thanh toán gộp thành công!</h3>
                  <p className="text-sm text-green-700">
                    Đã tạo {paymentResult.payments.length} payment records cho {orderIds.length} đơn hàng
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Distribution Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Chi tiết phân bổ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã đơn</TableHead>
                        <TableHead className="text-right">Giá trị đơn</TableHead>
                        <TableHead className="text-center">Tỷ lệ</TableHead>
                        <TableHead className="text-right">Số tiền phân bổ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentResult.distribution.map((item) => (
                        <TableRow key={item.orderId}>
                          <TableCell className="font-medium">{item.orderCode || item.orderId}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.orderTotalAmount)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{item.percentage.toFixed(2)}%</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(item.allocatedAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="border-t bg-muted/50 p-3">
                    <div className="flex justify-between font-medium">
                      <span>Tổng thanh toán:</span>
                      <span>{formatCurrency(paymentResult.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Thông tin thanh toán</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Phương thức:</span>
                  <Badge variant="outline">{getPaymentMethodText(paymentMethod)}</Badge>
                </div>
                {paymentMethod === 'bank_transfer' && paymentResult.payments[0]?.bank && (
                  <div className="flex justify-between">
                    <span>Ngân hàng:</span>
                    <span>{getBankName(paymentResult.payments[0].bank)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Ngày thanh toán:</span>
                  <span>{format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
                </div>
                {paymentNotes && (
                  <div className="flex justify-between">
                    <span>Ghi chú:</span>
                    <span className="text-sm text-muted-foreground">{paymentNotes}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Group Payment ID:</span>
                  <span className="text-xs font-mono text-muted-foreground">{paymentResult.groupPaymentId}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          {!paymentResult ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Hủy
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Đang xử lý..." : "Tạo thanh toán gộp"}
              </Button>
            </>
          ) : (
            <Button onClick={() => {
              setPaymentResult(null);
              onOpenChange(false);
            }}>
              Đóng
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

