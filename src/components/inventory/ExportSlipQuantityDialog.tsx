import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package, AlertTriangle, Upload } from "lucide-react";
import { DocumentUpload } from "@/components/documents/DocumentUpload";

interface ExportSlipItem {
  id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  requested_quantity: number;
  actual_quantity: number;
  remaining_quantity: number;
  unit_price: number;
}

interface ExportSlipQuantityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportSlipId: string;
  items: ExportSlipItem[];
  orderInfo?: {
    order_number: string;
    customer_name: string;
    customer_phone?: string;
    total_amount: number;
  };
  onUpdate: () => void;
}

export const ExportSlipQuantityDialog: React.FC<ExportSlipQuantityDialogProps> = ({
  open,
  onOpenChange,
  exportSlipId,
  items,
  orderInfo,
  onUpdate
}) => {
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (items) {
      const initialQuantities: { [key: string]: number } = {};
      items.forEach(item => {
        initialQuantities[item.id] = item.actual_quantity;
      });
      setQuantities(initialQuantities);
    }
  }, [items]);

  const handleQuantityChange = (itemId: string, value: number, maxQuantity: number) => {
    const actualValue = Math.max(0, Math.min(value, maxQuantity));
    setQuantities(prev => ({
      ...prev,
      [itemId]: actualValue
    }));
  };

  const handleConfirmExport = async () => {
    setLoading(true);
    try {
      // Update each export slip item with actual quantities
      for (const item of items) {
        const actualQuantity = quantities[item.id] || 0;
        const remainingQuantity = item.requested_quantity - actualQuantity;

        const { error } = await supabase
          .from('export_slip_items')
          .update({
            actual_quantity: actualQuantity,
            remaining_quantity: remainingQuantity
          })
          .eq('id', item.id);

        if (error) throw error;
      }

      // Check if export is complete (all items fully exported)
      const totalRequested = items.reduce((sum, item) => sum + item.requested_quantity, 0);
      const totalActual = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
      const isCompleteExport = totalActual === totalRequested && totalActual > 0;

      // Update export slip status
      const newStatus = isCompleteExport ? 'completed' : 'partial_export';
      
      const { error: slipError } = await supabase
        .from('export_slips')
        .update({
          status: newStatus,
          approved_at: new Date().toISOString()
        })
        .eq('id', exportSlipId);

      if (slipError) throw slipError;

      toast({
        title: "Thành công",
        description: isCompleteExport 
          ? "Đã xuất kho hoàn tất tất cả sản phẩm"
          : "Đã xuất kho một phần. Còn lại sẽ được xuất trong lần tiếp theo",
      });

      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating export quantities:', error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật số lượng xuất kho",
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

  const getTotalValue = () => {
    return items.reduce((total, item) => {
      const actualQty = quantities[item.id] || 0;
      return total + (actualQty * item.unit_price);
    }, 0);
  };

  const hasPartialExport = items.some(item => {
    const actualQty = quantities[item.id] || 0;
    return actualQty > 0 && actualQty < item.requested_quantity;
  });

  const hasCompleteExport = items.every(item => {
    const actualQty = quantities[item.id] || 0;
    return actualQty === item.requested_quantity;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Xác Nhận Số Lượng Xuất Kho
          </DialogTitle>
          <DialogDescription>
            Nhập số lượng thực tế xuất kho cho từng sản phẩm
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Information Section */}
          {orderInfo && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Thông tin đơn hàng</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Mã đơn hàng:</span>
                  <span className="ml-2 text-blue-600 font-semibold">{orderInfo.order_number}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Khách hàng:</span>
                  <span className="ml-2 font-semibold">{orderInfo.customer_name}</span>
                </div>
                {orderInfo.customer_phone && (
                  <div>
                    <span className="font-medium text-gray-600">Số điện thoại:</span>
                    <span className="ml-2">{orderInfo.customer_phone}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-600">Tổng giá trị đơn hàng:</span>
                  <span className="ml-2 text-green-600 font-semibold">{formatCurrency(orderInfo.total_amount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Export Summary Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-3">Tóm tắt phiếu xuất kho</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Tổng số lượng yêu cầu:</span>
                <span className="ml-2 text-blue-600 font-semibold">
                  {items.reduce((sum, item) => sum + item.requested_quantity, 0)} sản phẩm
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Tổng số lượng thực xuất:</span>
                <span className="ml-2 text-green-600 font-semibold">
                  {Object.values(quantities).reduce((sum, qty) => sum + qty, 0)} sản phẩm
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Tổng số lượng còn lại:</span>
                <span className="ml-2 text-orange-600 font-semibold">
                  {items.reduce((sum, item) => {
                    const actualQty = quantities[item.id] || 0;
                    return sum + (item.requested_quantity - actualQty);
                  }, 0)} sản phẩm
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Trạng thái:</span>
                <span className="ml-2 font-semibold">
                  {hasCompleteExport ? (
                    <span className="text-green-600">Xuất kho hoàn tất</span>
                  ) : hasPartialExport ? (
                    <span className="text-yellow-600">Xuất kho một phần</span>
                  ) : (
                    <span className="text-gray-600">Chưa xuất kho</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {hasPartialExport && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                Xuất kho một phần - Hàng còn lại sẽ được xuất trong lần tiếp theo
              </span>
            </div>
          )}

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Mã SP</TableHead>
                  <TableHead className="text-right">SL Yêu cầu</TableHead>
                  <TableHead className="text-right">SL Thực xuất</TableHead>
                  <TableHead className="text-right">SL Còn lại</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-right">Thành tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const actualQty = quantities[item.id] || 0;
                  const remainingQty = item.requested_quantity - actualQty;
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell>{item.product_code}</TableCell>
                      <TableCell className="text-right font-medium text-blue-600">
                        {item.requested_quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          max={item.requested_quantity}
                          value={actualQty}
                          onChange={(e) => handleQuantityChange(
                            item.id, 
                            parseInt(e.target.value) || 0,
                            item.requested_quantity
                          )}
                          className="w-20 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium text-orange-600">
                        {remainingQty}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(actualQty * item.unit_price)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-md">
            <div className="text-sm text-gray-600">
              Tổng giá trị xuất kho:
            </div>
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(getTotalValue())}
            </div>
          </div>

          <Separator />
          
          {/* Document Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <Label className="font-medium">Upload phiếu xuất kho đã ký</Label>
            </div>
            <DocumentUpload
              orderId={exportSlipId}
              documentType="export_slip_signed"
              label="Chọn file phiếu xuất kho đã ký"
              onDocumentUploaded={(doc) => {
                toast({
                  title: "Thành công",
                  description: "Đã tải lên phiếu xuất kho đã ký",
                });
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button 
            onClick={handleConfirmExport}
            disabled={loading}
            className={hasCompleteExport ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"}
          >
            {loading ? "Đang xử lý..." : hasCompleteExport ? "Xuất kho hoàn tất" : "Xuất kho một phần"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};