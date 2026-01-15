import React, { useState, useEffect, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Package, Plus, CheckCircle, Clock, Bell } from "lucide-react";
import { orderApi, type Order, type OrderItem } from "@/api/order.api";
import { exportSlipsApi, type CreateExportSlipRequest } from "@/api/exportSlips.api";
import { warehouseApi, type Warehouse } from "@/api/warehouse.api";
import { stockLevelsApi } from "@/api/stockLevels.api";
import { supplierApi, type Supplier } from "@/api/supplier.api";
import { Loading } from "@/components/ui/loading";
interface OrderSpecificExportSlipCreationProps {
  orderId: string;
  onExportSlipCreated?: () => void;
}
interface SelectedOrderItem {
  warehouse_id: string;
  id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  requested_quantity: number; // SL đơn hàng (không thay đổi)
  export_quantity: number; // SL xuất kho (có thể thay đổi)
  exported_quantity: number; // Tổng SL đã xuất từ các phiếu xuất kho của đơn này
  current_stock?: number; // Tồn kho hiện tại tại kho đã chọn
  unit_price: number;
  selected: boolean;
  manufacturer: string;
}
export const OrderSpecificExportSlipCreation: React.FC<OrderSpecificExportSlipCreationProps> = ({ 
  orderId,
  onExportSlipCreated 
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [slipCode, setSlipCode] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<SelectedOrderItem[]>([]);
  const [exportedQuantityByProduct, setExportedQuantityByProduct] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  // Permission checks
  const canCreateExportSlip = hasPermission('WAREHOUSE_RECEIPTS_CREATE');
  useEffect(() => {
    loadOrder();
    loadWarehouses();
    loadSuppliers();
    generateSlipCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);
  const generateSlipCode = () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const code = `XK${dateStr}${timeStr}`.slice(0, 20);
    setSlipCode(code);
  };
  const loadOrder = async () => {
    try {
      setOrderLoading(true);
      const orderData = await orderApi.getOrderIncludeDeleted(orderId);
      setOrder(orderData);

      // Lấy thông tin tất cả các phiếu xuất kho đã tạo từ đơn hàng này (nếu có)
      let exportedQuantityByProduct: Record<string, number> = {};
      try {
        // Lấy tất cả các phiếu xuất kho của đơn hàng này
        let page = 1;
        const allSlips: Awaited<ReturnType<typeof exportSlipsApi.getSlips>>['slips'] = [];
        
        while (true) {
          const response = await exportSlipsApi.getSlips({ page, limit: 1000, orderId: orderId });
          const slipsForOrder = response.slips.filter(slip => slip.order_id === orderId);
          allSlips.push(...slipsForOrder);
          
          // Nếu không còn phiếu nào hoặc đã lấy hết
          if (response.slips.length < 100 || page > 10) {
            break;
          }
          page++;
        }
        
        // Tính tổng số lượng đã xuất từ tất cả các phiếu (loại trừ phiếu có trạng thái 'cancelled')
        allSlips.forEach(slip => {
          // Bỏ qua các phiếu xuất kho có trạng thái 'cancelled'
          if (slip.status === 'cancelled') {
            return;
          }
          
          if (slip.export_slip_items && Array.isArray(slip.export_slip_items)) {
            slip.export_slip_items.forEach(slipItem => {
              // Kiểm tra product_id hợp lệ (không rỗng và không undefined)
              const productId = slipItem.product_id;
              if (!productId || productId.trim() === '') {
                console.warn('Export slip item missing product_id:', {
                  slipItem,
                  rawItem: slipItem,
                  product_id: slipItem.product_id,
                  productId: (slipItem as any).productId
                });
                return; // Bỏ qua item không có product_id
              }
              const current = exportedQuantityByProduct[productId] || 0;
              // Dùng requested_quantity để tính tổng số lượng đã xuất
              exportedQuantityByProduct[productId] = current + (slipItem.requested_quantity || 0);
            });
          }
        });
        
        console.log('All slips:', allSlips);
        console.log('Calculated exportedQuantityByProduct:', exportedQuantityByProduct);
      } catch (e) {
        // Nếu có lỗi khi lấy phiếu xuất kho thì bỏ qua, không chặn luồng tạo phiếu
        console.error("Failed to load export slips for order", e);
      }

      // Lưu exportedQuantityByProduct vào state để dùng trong render
      setExportedQuantityByProduct(exportedQuantityByProduct);

      // Initialize selected items
      setSelectedItems(
        (orderData.items || []).map(item => ({
          id: item.id,
          warehouse_id: item.warehouse_id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          requested_quantity: item.quantity, // SL đơn hàng (không thay đổi)
          export_quantity: item.quantity, // SL xuất kho (mặc định bằng SL đơn hàng)
          exported_quantity: exportedQuantityByProduct[item.product_id] || 0,
          current_stock: undefined,
          unit_price: item.unit_price,
          selected: true,
          manufacturer: item.manufacturer
        }))
      );
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể tải thông tin đơn hàng",
        variant: "destructive",
      });
    } finally {
      setOrderLoading(false);
    }
  };
  const loadWarehouses = async () => {
    try {
      const response = await warehouseApi.getWarehouses({ page: 1, limit: 100 });
      setWarehouses(response.warehouses || []);
      // Set first warehouse as default if none selected
      if (response.warehouses && response.warehouses.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(response.warehouses[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách kho",
        variant: "destructive",
      });
    }
  };
  const loadSuppliers = async () => {
    try {
      const response = await supplierApi.getSuppliers({ page: 1, limit: 100 });
      setSuppliers(response.suppliers || []);
      // Set first supplier as default if none selected
      if (response.suppliers && response.suppliers.length > 0 && !selectedSupplier) {
        setSelectedSupplier(response.suppliers[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách nhà cung cấp",
        variant: "destructive",
      });
    }
  };
  const handleItemSelectionChange = (itemId: string, selected: boolean) => {
    setSelectedItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, selected } : item
      )
    );
  };
  const handleQuantityChange = (itemId: string, quantity: number) => {
    setSelectedItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, export_quantity: Math.max(1, quantity) } : item
      )
    );
  };
  const fetchStockLevel = async (index: number, productId: string, warehouseId: string) => {
    if (!productId || !warehouseId) return;
    try {
      const stockLevels = await stockLevelsApi.getStockLevels({
        productId,
        warehouseId,
        limit: 1
      });
      const currentStock = stockLevels.stockLevels.length > 0 ? stockLevels.stockLevels[0].quantity : 0;
      setSelectedItems(prev => {
        const items = [...prev];
        if (items[index]) {
          items[index] = { ...items[index], current_stock: currentStock };
        }
        return items;
      });
    } catch (error) {
      setSelectedItems(prev => {
        const items = [...prev];
        if (items[index]) {
          items[index] = { ...items[index], current_stock: 0 };
        }
        return items;
      });
    }
  };
  const updateItemWarehouse = (index: number, warehouseId: string) => {
    const item = selectedItems[index];
    setSelectedItems(prev => {
      const items = [...prev];
      if (items[index]) {
        items[index] = { ...items[index], warehouse_id: warehouseId };
      }
      return items;
    });
    if (item?.product_id && warehouseId) {
      void fetchStockLevel(index, item.product_id, warehouseId);
    }
  };
  const handleCreateExportSlip = async () => {
    if (!order) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy thông tin đơn hàng",
        variant: "destructive",
      });
      return;
    }
    // Chỉ lấy các sản phẩm đã được chọn và có số lượng > 0
    const selectedExportItems = selectedItems.filter(item => item.selected && item.export_quantity > 0);
    if (selectedExportItems.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ít nhất một sản phẩm với số lượng > 0 để xuất kho",
        variant: "destructive",
      });
      return;
    }
    if (!selectedWarehouse) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn kho xuất hàng",
        variant: "destructive",
      });
      return;
    }
    if (!selectedSupplier) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn nhà cung cấp",
        variant: "destructive",
      });
      return;
    }
    if (!slipCode || slipCode.length < 3 || slipCode.length > 20) {
      toast({
        title: "Lỗi",
        description: "Mã phiếu xuất kho phải từ 3-20 ký tự",
        variant: "destructive",
      });
      return;
    }
    try {
      setLoading(true);
      const createRequest: CreateExportSlipRequest = {
        order_id: order.id,
        warehouse_id: selectedWarehouse,
        supplier_id: selectedSupplier,
        code: slipCode,
        notes: notes.trim() || undefined,
        items: selectedExportItems.map(item => ({
          product_id: item.product_id,
          requested_quantity: item.export_quantity,
          unit_price: item.unit_price
        }))
      };
      const result = await exportSlipsApi.createSlip(createRequest);
      toast({
        title: "Thành công",
        description: `Đã tạo phiếu xuất kho ${result.code} cho đơn hàng ${order.order_number}. Thông báo đã được gửi đến Quản lý kho.`,
      });
      onExportSlipCreated?.();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Không thể tạo phiếu xuất kho";
      // Check if error is about order already having an export slip
      if (errorMessage.includes('đã có phiếu xuất kho') || errorMessage.includes('already has') || errorMessage.includes('export slip')) {
        toast({
          title: "Lỗi",
          description: "Đơn hàng này đã có phiếu xuất kho. Mỗi đơn hàng chỉ có thể có một phiếu xuất kho.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Lỗi",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0
    }).format(amount);
  };
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Mới</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Chờ xử lý</Badge>;
      case 'picking':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Đang lấy hàng</Badge>;
      case 'picked':
        return <Badge variant="default" className="bg-cyan-100 text-cyan-800">Đã lấy hàng</Badge>;
      case 'delivered':
        return <Badge variant="default" className="bg-green-100 text-green-800">Đã giao hàng</Badge>;
      case 'delivery_failed':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 text-[10px] px-1.5 py-0.5">Giao hàng thất bại</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800 border border-green-200">Hoàn thành</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Đã hủy</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  const totalSelectedItems = selectedItems.filter(item => item.selected).length;
  const totalSelectedValue = selectedItems
    .filter(item => item.selected)
    .reduce((sum, item) => sum + (item.export_quantity * item.unit_price), 0);
  if (!canCreateExportSlip) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Tạo phiếu xuất kho
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Bạn không có quyền tạo phiếu xuất kho
          </div>
        </CardContent>
      </Card>
    );
  }
  if (orderLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Tạo phiếu xuất kho
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loading message="Đang tải thông tin đơn hàng..." />
          </div>
        </CardContent>
      </Card>
    );
  }
  if (!order) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Tạo phiếu xuất kho
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Không tìm thấy thông tin đơn hàng
          </div>
        </CardContent>
      </Card>
    );
  }
  function handleWarehouseChange(id: string, value: any) {
    throw new Error("Function not implemented.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Tạo phiếu xuất kho từ đơn hàng
        </CardTitle>
        <CardDescription>
          <div className="space-y-1">Đơn hàng: {order.order_number} - {order.customer_name}</div>
          <div className="space-y-1">Hợp đồng: {order.contract_code || 'Không có'}</div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Allocation status */}
        <div className="p-4 sticky -top-8 z-10 bg-white -mx-6 -mt-6 mb-6 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3">Trạng thái phân bổ</h4>
          <div>
            {
              order.order_items?.map(item => {
                // Lấy trực tiếp từ exportedQuantityByProduct đã tính từ API
                const exportedQuantity = exportedQuantityByProduct[item.product_id] || 0;
                const remainingQuantity = item.quantity - exportedQuantity;
                
                return (
                  <div key={item.id}  className="grid grid-cols-2 gap-4 w-full bg-gray-50 p-5 rounded-md items-center">
                    <div className="">
                      <div className="font-medium">{item.product_code} - <b>{item.product_name}</b></div>
                    </div>
                    <div className="text-right grid grid-cols-2 gap-4 justify-self-end">
                      <div className="text-medium text-muted-foreground">{exportedQuantity}/{item.quantity}</div>
                      {
                        remainingQuantity > 0 ? 
                          (<Badge variant="default" className="bg-yellow-100 text-yellow-800 w-fit">
                            Còn {remainingQuantity}
                          </Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-100 text-green-800 w-fit">
                              Đủ
                            </Badge>
                          )
                      }
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
        {/* Order Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Thông tin đơn hàng</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="font-medium">Mã đơn hàng:</Label>
              <p className="text-blue-600 font-semibold">{order.order_number}</p>
            </div>
            <div>
              <Label className="font-medium">Khách hàng:</Label>
              <p>{order.customer_name}</p>
            </div>
            <div>
              <Label className="font-medium">Trạng thái:</Label>
              <div>{getStatusBadge(order.status)}</div>
            </div>
            <div>
              <Label className="font-medium">Tổng giá trị:</Label>
              <p className="text-green-600 font-semibold">{formatCurrency(order.total_amount)}</p>
            </div>
            <div>
              <Label className="font-medium">Ngày tạo:</Label>
              <p>{formatDateTime(order.created_at)}</p>
            </div>
            <div>
              <Label className="font-medium">Ghi chú:</Label>
              <p>{order.notes || 'Không có ghi chú'}</p>
            </div>
          </div>
        </div>
        {/* Slip Code */}
        <div>
          <Label htmlFor="slip-code">Mã phiếu xuất kho <span className="text-red-500">*</span></Label>
          <Input
            id="slip-code"
            value={slipCode}
            onChange={(e) => setSlipCode(e.target.value)}
            placeholder="Nhập mã phiếu xuất kho (3-20 ký tự)"
            maxLength={20}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Mã phiếu phải từ 3-20 ký tự
          </p>
        </div>
        {/* Items Selection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Chọn sản phẩm xuất kho</h4>
            <div className="text-sm text-muted-foreground">
              Đã chọn: {totalSelectedItems} sản phẩm - Tổng: {formatCurrency(totalSelectedValue)}
            </div>
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.length > 0 && selectedItems.every(item => item.selected)}
                      onCheckedChange={(checked) => {
                        setSelectedItems(prev => 
                          prev.map(item => ({ ...item, selected: !!checked }))
                        );
                      }}
                    />
                  </TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Kho hàng</TableHead>
                  <TableHead>Hãng sản xuất</TableHead>
                  <TableHead className="text-center">SL đơn hàng</TableHead>
                  <TableHead className="text-center">SL xuất kho</TableHead>
                  <TableHead className="text-center">Đơn giá</TableHead>
                  <TableHead className="text-center">Thành tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-center">
                {selectedItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={(checked) => 
                          handleItemSelectionChange(item.id, !!checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium text-center">
                      <div className="space-y-1">
                        <div className="font-medium">{item.product_code}</div>
                        <div className="text-sm text-muted-foreground">{item.product_name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-left">
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
                        {item.current_stock !== undefined && (
                          <div className="text-xs mt-1">
                            {item.current_stock === 0 ? (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                                Hết hàng tại kho này
                              </Badge>
                            ) : (
                              <span className="text-gray-600">
                                Tồn kho: {item.current_stock}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-blue-600 font-medium">
                      {item.manufacturer}
                    </TableCell>
                    <TableCell className="text-center text-blue-600 font-medium">
                      {item.requested_quantity}
                    </TableCell>
                    <TableCell className="flex justify-center">
                      <NumberInput
                        min={1}
                        value={item.export_quantity}
                        onChange={(value) => 
                          handleQuantityChange(item.id, value)
                        }
                        className="w-20 text-right"
                        disabled={!item.selected}
                      />
                    </TableCell>
                    <TableCell className="text-center">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-center font-medium">
                      {formatCurrency(item.export_quantity * item.unit_price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        {/* Notes */}
        <div>
          <Label htmlFor="export-notes">Ghi chú phiếu xuất kho</Label>
          <Textarea
            id="export-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Nhập ghi chú cho phiếu xuất kho..."
            rows={3}
          />
        </div>
        {/* Status Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">Trạng thái phiếu xuất kho</h4>
              <div className="text-sm text-blue-800 mt-2 space-y-1">
                <p><strong>Chờ:</strong> Phiếu được tạo, chưa ảnh hưởng tồn kho</p>
                <p><strong>Đã lấy hàng:</strong> Thủ kho xác nhận</p>
                <p><strong>Đã xuất kho:</strong> Hàng đã rời khỏi kho, bắt đầu trừ tồn kho và hoàn tất quy trình</p>
              </div>
            </div>
          </div>
        </div>
        {/* Notification Info */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Bell className="w-4 h-4 text-green-600 mt-0.5" />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">Thông báo tự động:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Khi tạo phiếu → Gửi thông báo đến Quản lý kho</li>
                <li>Khi đổi trạng thái → Gửi thông báo đến Thủ kho và người tạo phiếu</li>
              </ul>
            </div>
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            onClick={handleCreateExportSlip}
            disabled={loading || totalSelectedItems === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Đang tạo...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Tạo phiếu xuất kho
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
