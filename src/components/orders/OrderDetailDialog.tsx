import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AddressFormSeparate } from "@/components/common/AddressFormSeparate";
// Tag management is not available in this dialog
import { orderApi, Order, OrderItem } from "@/api/order.api";
import { customerApi } from "@/api/customer.api";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { PaymentDialog } from '@/components/PaymentDialog';

interface OrderDetailDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderUpdated?: () => void;
}

export const OrderDetailDialog: React.FC<OrderDetailDialogProps> = ({
  order,
  open,
  onOpenChange,
  onOrderUpdated,
}) => {
  const [orderDetails, setOrderDetails] = useState<Order | null>(null);
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingFields, setEditingFields] = useState<{[key: string]: boolean}>({});
  const [editValues, setEditValues] = useState<{[key: string]: any}>({});
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  // Tags are display-only here
  const { toast } = useToast();

  useEffect(() => {
    if (open && order) {
      loadOrderDetails();
    }
  }, [open, order]);

  const loadOrderDetails = async () => {
    if (!order?.id) {
      console.log('No order ID provided');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Loading order details for ID:', order.id);
      const orderData = await orderApi.getOrder(order.id);
      console.log('Order data loaded:', orderData);
      setOrderDetails(orderData);
      // Always fetch fresh customer info for authoritative address
      if (orderData.customer_id) {
        try {
          const customer = await customerApi.getCustomer(orderData.customer_id);
          setCustomerDetails(customer);
        } catch (e) {
          console.warn('Could not load customer details', e);
          setCustomerDetails(null);
        }
      } else {
        setCustomerDetails(null);
      }
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


  const handleUpdateStatusDirect = async (newStatus: string) => {
    if (!orderDetails) return;
    
    setLoading(true);
    try {
      await orderApi.updateOrder(orderDetails.id, {
        status: newStatus as any
      });
      
      // Refresh order details from API
      const updatedOrder = await orderApi.getOrder(orderDetails.id);
      setOrderDetails(updatedOrder);
      
      // Notify parent component to refresh order list
      if (onOrderUpdated) {
        onOrderUpdated();
      }
      
      toast({
        title: "Thành công",
        description: "Đã cập nhật trạng thái đơn hàng",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể cập nhật trạng thái"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Removed tag update logic

  const startEditing = (field: string, currentValue: any, addressInfo?: any) => {
    setEditingFields(prev => ({ ...prev, [field]: true }));
    setEditValues(prev => ({ 
      ...prev, 
      [field]: currentValue,
      ...(addressInfo && { [`${field}_addressInfo`]: addressInfo })
    }));
  };

  const cancelEditing = (field: string) => {
    setEditingFields(prev => ({ ...prev, [field]: false }));
    setEditValues(prev => {
      const newValues = { ...prev };
      delete newValues[field];
      delete newValues[`${field}_addressInfo`];
      return newValues;
    });
  };

  const saveField = async (field: string) => {
    if (!orderDetails) return;
    
    setLoading(true);
    try {
      const updateData: any = {};
      const value = editValues[field];
      const addressInfo = editValues[`${field}_addressInfo`];
      
      // Translate UI snake_case to API camelCase for updates
      // Only allow editing receiver fields if they are empty originally
      const original = orderDetails as any;
      if ((field === 'receiverName' && original.receiverName) ||
          (field === 'receiverPhone' && original.receiverPhone) ||
          (field === 'receiverAddress' && (original.receiverAddress || original.addressInfo))) {
        setLoading(false);
        toast({
          title: 'Không thể cập nhật',
          description: 'Chỉ cho phép cập nhật thông tin người nhận khi đơn chưa có dữ liệu.',
          variant: 'destructive',
        });
        return;
      }
      // Map UI field names to BE expectations (camelCase per BE)
      if (field === 'receiverName' || field === 'receiverPhone' || field === 'receiverAddress') {
        updateData[field] = value;
      } else {
        updateData[field] = value;
      }
      // Add addressInfo if it exists (align with BE expects snake_case *_address_info)
      if (addressInfo) {
        const normalizedInfo = {
          provinceCode: addressInfo.provinceCode || undefined,
          districtCode: addressInfo.districtCode || undefined,
          wardCode: addressInfo.wardCode || undefined,
        };
        if (field === 'receiverAddress') {
          updateData['addressInfo'] = normalizedInfo; // BE expects addressInfo for receiver
        }
      }
      
      await orderApi.updateOrder(orderDetails.id, updateData);
      
      // Refresh order details from API
      const updatedOrder = await orderApi.getOrder(orderDetails.id);
      setOrderDetails(updatedOrder);
      
      setEditingFields(prev => ({ ...prev, [field]: false }));
      setEditValues(prev => {
        const newValues = { ...prev };
        delete newValues[field];
        return newValues;
      });
      
      // Notify parent component to refresh order list
      if (onOrderUpdated) {
        onOrderUpdated();
      }
      
      toast({
        title: "Thành công",
        description: "Đã cập nhật thông tin đơn hàng",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể cập nhật thông tin"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | string | undefined | null) => {
    const numAmount = Number(amount) || 0;
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0
    }).format(numAmount);
  };

  const renderEditableAddressField = (field: string, label: string, value: any, addressInfo?: any) => {
    const isEditing = editingFields[field];
    const editValue = editValues[field] ?? value;
    const editAddressInfo = editValues[`${field}_addressInfo`] ?? addressInfo;

    const formatFullAddress = (addr: string, ai: any) => {
      const wardName = ai?.ward?.name || ai?.wardName;
      const districtName = ai?.district?.name || ai?.districtName;
      const provinceName = ai?.province?.name || ai?.provinceName;
      const parts: string[] = [];
      if (addr) parts.push(addr);
      if (wardName) parts.push(wardName);
      if (districtName) parts.push(districtName);
      if (provinceName) parts.push(provinceName);
      return parts.join(', ');
    };

    return (
      <div>
        <label className="text-sm font-medium text-muted-foreground">{label}:</label>
        <div className="mt-1">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <AddressFormSeparate
                  key={`${field}-${(editAddressInfo?.provinceCode || editAddressInfo?.province?.code || '')}-${(editAddressInfo?.districtCode || editAddressInfo?.district?.code || '')}-${(editAddressInfo?.wardCode || editAddressInfo?.ward?.code || '')}`}
                  value={{
                    address: editValue || '',
                    provinceCode: (editAddressInfo?.provinceCode || editAddressInfo?.province?.code || '')?.toString(),
                    districtCode: (editAddressInfo?.districtCode || editAddressInfo?.district?.code || '')?.toString(),
                    wardCode: (editAddressInfo?.wardCode || editAddressInfo?.ward?.code || '')?.toString(),
                    provinceName: editAddressInfo?.provinceName || editAddressInfo?.province?.name || '',
                    districtName: editAddressInfo?.districtName || editAddressInfo?.district?.name || '',
                    wardName: editAddressInfo?.wardName || editAddressInfo?.ward?.name || ''
                  }}
                  onChange={(data) => {
                    setEditValues(prev => ({
                      ...prev,
                      [field]: data.address,
                      [`${field}_addressInfo`]: {
                        provinceCode: data.provinceCode,
                        districtCode: data.districtCode,
                        wardCode: data.wardCode
                      }
                    }));
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveField(field)} disabled={loading}>
                  Lưu
                </Button>
                <Button size="sm" variant="outline" onClick={() => cancelEditing(field)}>
                  Hủy
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-base break-words whitespace-normal min-w-0" style={{wordBreak: 'break-all', overflowWrap: 'break-word'}}>
                {formatFullAddress(value, addressInfo) || 'Chưa có thông tin'}
              </div>
              <Button size="sm" variant="outline" onClick={() => startEditing(field, value, addressInfo)}>
                Sửa
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEditableField = (field: string, label: string, value: any, type: 'text' | 'textarea' = 'text') => {
    const isEditing = editingFields[field];
    const editValue = editValues[field] ?? value;

    return (
      <div>
        <label className="text-sm font-medium text-muted-foreground">{label}:</label>
        <div className="mt-1">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                {type === 'textarea' ? (
                  <Textarea
                    value={editValue || ''}
                    onChange={(e) => setEditValues(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full"
                    rows={2}
                  />
                ) : (
                  <Input
                    value={editValue || ''}
                    onChange={(e) => setEditValues(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full"
                  />
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveField(field)} disabled={loading}>
                  Lưu
                </Button>
                <Button size="sm" variant="outline" onClick={() => cancelEditing(field)}>
                  Hủy
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-base break-words whitespace-normal min-w-0" style={{wordBreak: 'break-all', overflowWrap: 'break-word'}}>{value || 'Chưa có thông tin'}</div>
              <Button size="sm" variant="outline" onClick={() => startEditing(field, value)}>
                Sửa
              </Button>
            </div>
          )}
        </div>
      </div>
    );
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

  // Calculate payment status based on paid amount vs total amount
  const calculatePaymentStatus = (paidAmount: number, totalAmount: number): string => {
    if (paidAmount <= 0) return 'unpaid';
    if (paidAmount >= totalAmount) return 'paid';
    return 'partially_paid';
  };

  // Convert tags from string array to OrderTag objects for display
  const getTagsForDisplay = () => {
    if (!orderDetails?.tags || !Array.isArray(orderDetails.tags)) return [];
    
    const predefinedTags = [
      { id: 'returning_customer', name: 'Khách hàng quay lại', color: '#3B82F6' },
      { id: 'priority', name: 'Ưu tiên', color: '#EF4444' },
      { id: 'reconciled', name: 'Đã đối soát', color: '#10B981' },
      { id: 'error', name: 'Lỗi', color: '#F59E0B' },
      { id: 'unreconciled', name: 'Chưa đối soát', color: '#6B7280' },
      { id: 'new_customer', name: 'Khách mới', color: '#8B5CF6' },
    ];
    
    return orderDetails.tags.map(tagName => {
      const predefinedTag = predefinedTags.find(t => t.name === tagName);
      return predefinedTag || { id: tagName, name: tagName, color: '#6B7280' };
    });
  };
  
  // Only show non-reconciliation tags in this dialog
  const getOtherTags = () => getTagsForDisplay().filter((t: any) => t.name !== 'Đã đối soát' && t.name !== 'Chưa đối soát');

  if (!orderDetails) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl w-[90vw] max-h-[90vh] overflow-y-auto">
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


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết đơn hàng #{orderDetails.order_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {renderEditableField('customer_name', 'Họ tên', orderDetails.customer_name)}
              {renderEditableField('customer_phone', 'Điện thoại', orderDetails.customer_phone)}
              
               <div>
                 <label className="text-sm font-medium text-muted-foreground">Nhãn khách hàng:</label>
                 <div className="flex gap-2 flex-wrap mt-1">
                   {getOtherTags().length > 0 ? (
                     getOtherTags().map((tag: any) => (
                       <Badge 
                         key={tag.id} 
                         style={{ backgroundColor: tag.color, color: 'white' }}
                       >
                         {tag.name}
                       </Badge>
                     ))
                   ) : (
                     <Badge variant="secondary">Không có nhãn khác</Badge>
                   )}
                 </div>
               </div>

              {renderEditableField('notes', 'Ghi chú', orderDetails.notes, 'textarea')}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Mã khách hàng:</label>
                <div className="text-base">{orderDetails.customer?.code || orderDetails.customer_code || 'Chưa có mã'}</div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Email:</label>
                <div className="text-base">{orderDetails.customer?.email || 'Chưa có email'}</div>
              </div>
            </div>
          </div>

          {/* Shipping Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚚</span>
              <h3 className="text-lg font-semibold">Vận chuyển</h3>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {renderEditableField('receiverName', 'Tên người nhận hàng', (orderDetails as any).receiverName || customerDetails?.name)}
              {renderEditableField('receiverPhone', 'SĐT người nhận hàng', (orderDetails as any).receiverPhone)}
            </div>
            <div className="mt-4">
              {renderEditableAddressField(
                'receiverAddress',
                'Địa chỉ giao hàng',
                (orderDetails as any).receiverAddress || customerDetails?.address,
                (orderDetails as any).addressInfo || (orderDetails as any).receiverAddressInfo || customerDetails?.addressInfo
              )}
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
                {orderDetails.items && orderDetails.items.length > 0 ? (
                  orderDetails.items.map((item: OrderItem, index: number) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{item.product_code || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{item.product_name || 'N/A'}</div>
                          <div className="text-xs text-blue-600">ID: {item.product_id || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">-</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.total_price)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Không có sản phẩm nào trong đơn hàng
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span>Tổng</span>
                  <span className="font-medium">{orderDetails.items?.reduce((sum: number, item: OrderItem) => sum + item.quantity, 0)}</span>
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
               <div className="flex justify-between items-center">
                 <span className="text-sm text-muted-foreground">Trạng thái xử lý:</span>
                <Select 
                  value={(orderDetails as any).order_status || orderDetails.status || 'pending'}
                   onValueChange={(newStatus) => handleUpdateStatusDirect(newStatus)}
                 >
                   <SelectTrigger className="w-auto h-auto p-0 border-none bg-transparent hover:bg-transparent focus:bg-transparent">
                     <div className="cursor-pointer">
                      {getStatusBadge((orderDetails as any).order_status || orderDetails.status)}
                     </div>
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="pending">Chờ xử lý</SelectItem>
                     <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                     <SelectItem value="processing">Đang xử lý</SelectItem>
                     <SelectItem value="picked">Đã lấy hàng</SelectItem>
                     <SelectItem value="shipped">Đã giao</SelectItem>
                     <SelectItem value="delivered">Đã nhận</SelectItem>
                     <SelectItem value="cancelled">Đã hủy</SelectItem>
                     <SelectItem value="completed">Đã hoàn thành</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Trạng thái thanh toán:</span>
                {getPaymentStatusBadge(
                  (orderDetails as any).payment_status || 
                  calculatePaymentStatus(
                    orderDetails.initial_payment || orderDetails.paid_amount || 0,
                    orderDetails.total_amount || 0
                  )
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Loại đơn hàng:</span>
                <span>{orderDetails.order_type === 'sale' ? 'Bán hàng' : 'Trả hàng'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Người tạo đơn:</span>
                <span>{(orderDetails as any).profiles?.full_name || 'Hệ thống'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Số đơn hàng:</span>
                <span className="font-mono">{orderDetails.order_number || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Ngày tạo:</span>
                <span>{orderDetails.created_at ? new Date(orderDetails.created_at).toLocaleDateString('vi-VN') : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Tổng tiền:</span>
                <span className="font-medium">{formatCurrency(orderDetails.total_amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Đã thanh toán:</span>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">{formatCurrency(orderDetails.initial_payment || orderDetails.paid_amount)}</span>
                  <Button size="sm" variant="outline" onClick={() => setShowPaymentDialog(true)}>
                    Thêm thanh toán
                  </Button>
                </div>
              </div>
              {/* Reconciliation tags are not shown in this dialog */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Số hợp đồng:</span>
                <div className="flex items-center gap-2">
                  {editingFields['contract_number'] ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValues['contract_number'] ?? (orderDetails.contract_number || '')}
                        onChange={(e) => setEditValues(prev => ({ ...prev, contract_number: e.target.value }))}
                        className="w-40"
                        placeholder="Nhập số hợp đồng"
                      />
                      <Button size="sm" onClick={() => saveField('contract_number')} disabled={loading}>
                        Lưu
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => cancelEditing('contract_number')}>
                        Hủy
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{orderDetails.contract_number || 'Chưa có'}</span>
                      <Button size="sm" variant="outline" onClick={() => startEditing('contract_number', orderDetails.contract_number || '')}>
                        Sửa
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Số PO:</span>
                <div className="flex items-center gap-2">
                  {editingFields['purchase_order_number'] ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValues['purchase_order_number'] ?? (orderDetails.purchase_order_number || '')}
                        onChange={(e) => setEditValues(prev => ({ ...prev, purchase_order_number: e.target.value }))}
                        className="w-40"
                        placeholder="Nhập số PO"
                      />
                      <Button size="sm" onClick={() => saveField('purchase_order_number')} disabled={loading}>
                        Lưu
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => cancelEditing('purchase_order_number')}>
                        Hủy
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{orderDetails.purchase_order_number || 'Chưa có'}</span>
                      <Button size="sm" variant="outline" onClick={() => startEditing('purchase_order_number', orderDetails.purchase_order_number || '')}>
                        Sửa
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
           </div>
         </div>
       </DialogContent>

      {/* Tags manager intentionally removed in this dialog */}
      
      {/* Payment Dialog */}
      {orderDetails && (
        <PaymentDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          order={orderDetails}
          onUpdate={() => {
            // Refresh order details when payment is updated
            loadOrderDetails();
            if (onOrderUpdated) {
              onOrderUpdated();
            }
          }}
        />
      )}
     </Dialog>
   );
 };

