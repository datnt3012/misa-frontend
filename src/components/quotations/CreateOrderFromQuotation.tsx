import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { quotationApi, Quotation } from "@/api/quotation.api";
import { orderApi } from "@/api/order.api";
import { warehouseApi } from "@/api/warehouse.api";
import { getErrorMessage } from "@/lib/error-utils";
import { useNavigate } from "react-router-dom";
interface CreateOrderFromQuotationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: Quotation | null;
  onOrderCreated?: () => void;
}
const CreateOrderFromQuotation: React.FC<CreateOrderFromQuotationProps> = ({
  open,
  onOpenChange,
  quotation,
  onOrderCreated
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<Array<{
    product_id: string;
    product_name: string;
    product_code: string;
    quantity: number;
    unit_price: number;
    warehouse_id: string;
  }>>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [initialPayment, setInitialPayment] = useState(0);
  const [notes, setNotes] = useState("");
  useEffect(() => {
    if (open && quotation) {
      loadWarehouses();
      // Initialize order items from quotation details
      if (quotation.details && quotation.details.length > 0) {
        setOrderItems(
          quotation.details.map(detail => ({
            product_id: detail.product_id,
            product_name: detail.product_name || "",
            product_code: detail.product_code || "",
            quantity: detail.quantity,
            unit_price: detail.price,
            warehouse_id: warehouses.length === 1 ? warehouses[0].id : ""
          }))
        );
      }
      setNotes(quotation.note || "");
    }
  }, [open, quotation]);
  const loadWarehouses = async () => {
    try {
      const warehousesRes = await warehouseApi.getWarehouses({ page: 1, limit: 1000 });
      setWarehouses(warehousesRes.warehouses || []);
      // Auto-select warehouse if only one available
      if (warehousesRes.warehouses?.length === 1 && orderItems.length > 0) {
        setOrderItems(prev => prev.map(item => ({
          ...item,
          warehouse_id: warehousesRes.warehouses[0].id
        })));
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể tải danh sách kho"),
        variant: "destructive",
      });
    }
  };
  const updateItemWarehouse = (index: number, warehouseId: string) => {
    setOrderItems(prev => {
      const items = [...prev];
      items[index].warehouse_id = warehouseId;
      return items;
    });
  };
  const calculateTotalAmount = () => {
    return orderItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };
  const handleSubmit = async () => {
    if (!quotation) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy báo giá",
        variant: "destructive",
      });
      return;
    }
    if (orderItems.length === 0) {
      toast({
        title: "Lỗi",
        description: "Không có sản phẩm để tạo đơn hàng",
        variant: "destructive",
      });
      return;
    }
    // Validate all items have warehouse
    const invalidItems = orderItems.filter(item => !item.warehouse_id);
    if (invalidItems.length > 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn kho cho tất cả sản phẩm",
        variant: "destructive",
      });
      return;
    }
    try {
      setLoading(true);
      const totalAmount = calculateTotalAmount();
      const orderData = {
        customerId: quotation.customer_id,
        customerName: quotation.customer_name,
        customerPhone: quotation.customer_phone,
        note: notes || `Tạo từ báo giá ${quotation.code}`,
        status: 'new',
        orderType: 'sale',
        paymentMethod: paymentMethod,
        initialPayment: initialPayment || 0,
        totalAmount: totalAmount,
        details: orderItems.map(item => ({
          productId: item.product_id,
          warehouseId: item.warehouse_id,
          quantity: item.quantity,
          unitPrice: item.unit_price
        }))
      };
      const createdOrder = await orderApi.createOrder(orderData);
      toast({
        title: "Thành công",
        description: `Đã tạo đơn hàng ${createdOrder.order_number} từ báo giá ${quotation.code}`,
      });
      onOrderCreated?.();
      onOpenChange(false);
      // Navigate to orders page
      navigate('/orders');
    } catch (error) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể tạo đơn hàng từ báo giá"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  if (!quotation) return null;
  const totalAmount = calculateTotalAmount();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo đơn hàng từ báo giá</DialogTitle>
          <DialogDescription>
            Tạo đơn hàng từ báo giá {quotation.code} - Khách hàng: {quotation.customer_name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Quotation Info */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Mã báo giá</Label>
                <div className="font-medium">{quotation.code}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Khách hàng</Label>
                <div className="font-medium">{quotation.customer_name}</div>
              </div>
            </div>
          </div>
          {/* Order Items */}
          <div className="space-y-2">
            <Label>Chi tiết sản phẩm</Label>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Giá</TableHead>
                    <TableHead>Số lượng</TableHead>
                    <TableHead>Thành tiền</TableHead>
                    <TableHead>Kho</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-xs text-muted-foreground">{item.product_code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('vi-VN').format(item.unit_price)}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('vi-VN').format(item.unit_price * item.quantity)}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <Combobox
                          options={warehouses.map(warehouse => ({
                            label: `${warehouse.name} (${warehouse.code})`,
                            value: warehouse.id
                          }))}
                          value={item.warehouse_id}
                          onValueChange={(value) => updateItemWarehouse(index, value)}
                          placeholder="Chọn kho"
                          searchPlaceholder="Tìm kho..."
                          emptyMessage="Không có kho nào"
                          className="w-full"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end">
              <div className="text-lg font-semibold">
                Tổng tiền: {new Intl.NumberFormat('vi-VN').format(totalAmount)}
              </div>
            </div>
          </div>
          {/* Payment Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Phương thức thanh toán</Label>
              <Combobox
                options={[
                  { label: "Tiền mặt", value: "cash" },
                  { label: "Chuyển khoản", value: "bank_transfer" },
                  { label: "Thẻ tín dụng", value: "credit_card" }
                ]}
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                placeholder="Chọn phương thức thanh toán"
                searchPlaceholder="Tìm phương thức..."
                emptyMessage="Không có phương thức thanh toán nào"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="initialPayment">Thanh toán trước</Label>
              <Input
                id="initialPayment"
                type="number"
                value={initialPayment}
                onChange={(e) => setInitialPayment(Number(e.target.value) || 0)}
                min={0}
                max={totalAmount}
              />
            </div>
          </div>
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú cho đơn hàng"
              rows={3}
            />
          </div>
          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Đang tạo..." : "Tạo đơn hàng"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default CreateOrderFromQuotation;
