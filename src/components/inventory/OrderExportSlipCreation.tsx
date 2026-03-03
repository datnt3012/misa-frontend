import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Package, Plus, Search, ShoppingCart, CheckCircle, Clock, Truck, Bell } from "lucide-react";
import { orderApi, type Order, type OrderItem } from "@/api/order.api";
import { exportSlipsApi, type CreateExportSlipRequest } from "@/api/exportSlips.api";
import { Loading } from "@/components/ui/loading";
import { getOrderStatusConfig } from "@/constants/order-status.constants";
import { cn } from "@/lib/utils";
interface OrderExportSlipCreationProps {
  onExportSlipCreated?: () => void;
}
interface SelectedOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  requested_quantity: number;
  unit_price: number;
  selected: boolean;
}
export const OrderExportSlipCreation: React.FC<OrderExportSlipCreationProps> = ({ 
  onExportSlipCreated 
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedOrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [orderSelectionOpen, setOrderSelectionOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  // Permission checks
  const canCreateExportSlip = hasPermission('EXPORT_SLIPS_CREATE');
  useEffect(() => {
    if (orderSelectionOpen) {
      loadOrders();
    }
  }, [orderSelectionOpen, statusFilter]);
  // Reinitialize selectedItems when dialog opens and order is selected (only if items are missing)
  useEffect(() => {
    if (createDialogOpen && selectedOrder && selectedItems.length === 0 && selectedOrder.items && selectedOrder.items.length > 0) {
      setSelectedItems(
        (selectedOrder.items || []).map(item => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          requested_quantity: item.quantity,
          unit_price: item.unit_price,
          selected: true
        }))
      );
    }
  }, [createDialogOpen, selectedOrder]);
  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      const response = await orderApi.getOrders({
        status: statusFilter,
        search: searchTerm || undefined,
        limit: 50,
        includeDeleted: true // Include soft deleted orders
      });
      setOrders(response.orders);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể tải danh sách đơn hàng",
        variant: "destructive",
      });
    } finally {
      setOrdersLoading(false);
    }
  };
  const handleOrderSelect = async (order: Order) => {
    try {
      setOrdersLoading(true);
      // Load full order details to ensure items are included
      const fullOrder = await orderApi.getOrderIncludeDeleted(order.id);
      setSelectedOrder(fullOrder);
      // Initialize selectedItems from the full order
      // Use items or order_items (backward compatibility)
      const orderItems = fullOrder.items || fullOrder.order_items || [];
      const items = orderItems.map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_code: item.product_code,
        requested_quantity: item.quantity,
        unit_price: item.unit_price,
        selected: true
      }));
      setSelectedItems(items);
      setCreateDialogOpen(true);
      setOrderSelectionOpen(false);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể tải chi tiết đơn hàng",
        variant: "destructive",
      });
    } finally {
      setOrdersLoading(false);
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
        item.id === itemId ? { ...item, requested_quantity: Math.max(1, quantity) } : item
      )
    );
  };
  const handleCreateExportSlip = async () => {
    if (!selectedOrder) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn đơn hàng",
        variant: "destructive",
      });
      return;
    }
    const selectedExportItems = selectedItems.filter(item => item.selected);
    if (selectedExportItems.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ít nhất một sản phẩm để xuất kho",
        variant: "destructive",
      });
      return;
    }
    try {
      setLoading(true);
      const createRequest: CreateExportSlipRequest = {
        order_id: selectedOrder.id,
        notes: notes.trim() || undefined,
        items: selectedExportItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          requested_quantity: item.requested_quantity,
          unit_price: item.unit_price
        }))
      };
      const result = await exportSlipsApi.createSlip(createRequest);
      toast({
        title: "Thành công",
        description: `Đã tạo phiếu xuất kho ${result.code} cho đơn hàng ${selectedOrder.order_number}. Thông báo đã được gửi đến Quản lý kho.`,
      });
      // Reset form
      setSelectedOrder(null);
      setSelectedItems([]);
      setNotes('');
      setCreateDialogOpen(false);
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
    const config = getOrderStatusConfig(status);
    // Thu nhỏ chữ cho status "delivery_failed" vì label quá dài
    const isLongLabel = status === 'delivery_failed';
    return (
      <Badge 
        variant={config.variant}
        className={cn(config.className, isLongLabel ? 'text-[10px] px-1.5 py-0.5' : '')}
      >
        {config.label}
      </Badge>
    );
  };
  const totalSelectedItems = selectedItems.filter(item => item.selected).length;
  const totalSelectedValue = selectedItems
    .filter(item => item.selected)
    .reduce((sum, item) => sum + (item.requested_quantity * item.unit_price), 0);
  // Debug: Log to console (can be removed later)
  useEffect(() => {
    if (createDialogOpen && selectedOrder) {
    }
  }, [createDialogOpen, selectedItems, totalSelectedItems, selectedOrder]);
  if (!canCreateExportSlip) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Tạo phiếu xuất kho từ đơn hàng
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
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Tạo phiếu xuất kho từ đơn hàng
          </CardTitle>
          <CardDescription>
            Chọn đơn hàng và tạo phiếu xuất kho với trạng thái "Chờ" (chưa ảnh hưởng tồn kho)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => setOrderSelectionOpen(true)}
              className="flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Chọn đơn hàng
            </Button>
            {selectedOrder && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Đã chọn:</span>
                <Badge variant="outline">{selectedOrder.order_number}</Badge>
                <span className="text-muted-foreground">- {selectedOrder.customer_name}</span>
              </div>
            )}
          </div>
          {selectedOrder && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="font-medium">Mã đơn hàng:</Label>
                  <p className="text-blue-600 font-semibold">{selectedOrder.order_number}</p>
                </div>
                <div>
                  <Label className="font-medium">Khách hàng:</Label>
                  <p>{selectedOrder.customer_name}</p>
                </div>
                <div>
                  <Label className="font-medium">Trạng thái:</Label>
                  <div>{getStatusBadge(typeof selectedOrder.status === 'object' ? selectedOrder.status?.code : selectedOrder.status)}</div>
                </div>
                <div>
                  <Label className="font-medium">Tổng giá trị:</Label>
                  <p className="text-green-600 font-semibold">{formatCurrency(selectedOrder.total_amount)}</p>
                </div>
                <div>
                  <Label className="font-medium">Ngày tạo:</Label>
                  <p>{formatDateTime(selectedOrder.created_at)}</p>
                </div>
                <div>
                  <Label className="font-medium">Ghi chú:</Label>
                  <p>{selectedOrder.notes || 'Không có ghi chú'}</p>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              <p>💡 <strong>Lưu ý:</strong> Phiếu xuất kho được tạo với trạng thái "Chờ" sẽ không ảnh hưởng đến tồn kho cho đến khi được chuyển sang trạng thái "Đã lấy hàng".</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Bell className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Thông báo tự động:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Khi tạo phiếu → Gửi thông báo đến Quản lý kho</li>
                    <li>Khi đổi trạng thái → Gửi thông báo đến Thủ kho và người tạo phiếu</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Order Selection Dialog */}
      <Dialog open={orderSelectionOpen} onOpenChange={setOrderSelectionOpen}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chọn đơn hàng để tạo phiếu xuất kho</DialogTitle>
            <DialogDescription>
              Chọn đơn hàng có trạng thái phù hợp để tạo phiếu xuất kho
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="search-orders">Tìm kiếm đơn hàng</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-orders"
                    placeholder="Tìm theo mã đơn hàng hoặc tên khách hàng..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-48">
                <Label htmlFor="status-filter">Trạng thái</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="processing">Đang xử lý</SelectItem>
                    <SelectItem value="shipped">Đã gửi</SelectItem>
                    <SelectItem value="delivered">Đã giao</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={loadOrders} variant="outline">
                  <Search className="w-4 h-4 mr-2" />
                  Tìm kiếm
                </Button>
              </div>
            </div>
            {/* Orders List */}
            {ordersLoading ? (
              <div className="flex justify-center py-8">
                <Loading message="Đang tải danh sách đơn hàng..." />
              </div>
            ) : (
              <div className="border rounded-md max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã đơn hàng</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Tổng giá trị</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Không tìm thấy đơn hàng nào
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.order_number}</TableCell>
                          <TableCell>{order.customer_name}</TableCell>
                          <TableCell>{getStatusBadge(typeof order.status === 'object' ? order.status?.code : order.status)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(order.total_amount)}
                          </TableCell>
                          <TableCell>{formatDateTime(order.created_at)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleOrderSelect(order)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Chọn
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderSelectionOpen(false)}>
              Hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Create Export Slip Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          // Reset when dialog closes
          setSelectedItems([]);
          setNotes('');
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo phiếu xuất kho</DialogTitle>
            <DialogDescription>
              Đơn hàng: {selectedOrder?.order_number} - {selectedOrder?.customer_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Thông tin đơn hàng</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Mã đơn hàng:</span>
                  <span className="ml-2 text-blue-600 font-semibold">{selectedOrder?.order_number}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Khách hàng:</span>
                  <span className="ml-2 font-semibold">{selectedOrder?.customer_name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Trạng thái:</span>
                  <span className="ml-2">{selectedOrder ? getStatusBadge(typeof selectedOrder.status === 'object' ? selectedOrder.status?.code : selectedOrder.status) : ''}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Tổng giá trị:</span>
                  <span className="ml-2 text-green-600 font-semibold">
                    {selectedOrder ? formatCurrency(selectedOrder.total_amount) : ''}
                  </span>
                </div>
              </div>
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
                      <TableHead>Mã SP</TableHead>
                      <TableHead className="text-right">SL đơn hàng</TableHead>
                      <TableHead className="text-right">SL xuất kho</TableHead>
                      <TableHead className="text-right">Đơn giá</TableHead>
                      <TableHead className="text-right">Thành tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Không có sản phẩm trong đơn hàng này
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedItems.map((item) => (
                        <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={(checked) => 
                              handleItemSelectionChange(item.id, !!checked)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell>{item.product_code}</TableCell>
                        <TableCell className="text-right text-blue-600 font-medium">
                          {item.requested_quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          <NumberInput
                            min={1}
                            max={item.requested_quantity}
                            value={item.requested_quantity}
                            onChange={(value) => 
                              handleQuantityChange(item.id, value)
                            }
                            className="w-20 text-right"
                            disabled={!item.selected}
                          />
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.requested_quantity * item.unit_price)}
                        </TableCell>
                      </TableRow>
                      ))
                    )}
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
                    <p><strong>Đã lấy hàng:</strong> Thủ kho xác nhận, bắt đầu trừ tồn kho</p>
                    <p><strong>Đã xuất kho:</strong> Hàng đã rời khỏi kho, hoàn tất quy trình</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Hủy
            </Button>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};