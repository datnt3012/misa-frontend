import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { NumberInput } from "@/components/ui/number-input";
import { AddressFormSeparate } from "@/components/common/AddressFormSeparate";
import { Trash2, Plus, Edit2, X, Check } from "lucide-react";
// Tag management is not available in this dialog
import { orderApi, Order, OrderItem } from "@/api/order.api";
import { customerApi } from "@/api/customer.api";
import { productApi } from "@/api/product.api";
import { orderTagsApi, OrderTag } from "@/api/orderTags.api";
import { warehouseApi } from "@/api/warehouse.api";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { PaymentDialog } from '@/components/PaymentDialog';
import { LoadingWrapper } from '@/components/LoadingWrapper';
import { getOrderStatusConfig, ORDER_STATUSES, ORDER_STATUS_LABELS_VI } from "@/constants/order-status.constants";

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
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [editingItems, setEditingItems] = useState<{[key: string]: Partial<OrderItem>}>({});
  const [availableTags, setAvailableTags] = useState<OrderTag[]>([]);
  const [editingExpenses, setEditingExpenses] = useState<Array<{ name: string; amount: number; note?: string }>>([]);
  const [isEditingExpenses, setIsEditingExpenses] = useState(false);
  const [pendingNewItems, setPendingNewItems] = useState<Partial<OrderItem>[]>([]);
  // Tags are display-only here
  const { toast } = useToast();

  useEffect(() => {
    if (open && order) {
      // Clear pending items when opening dialog for a new order
      setPendingNewItems([]);
      loadOrderDetails();
      loadTags();
      loadWarehouses();
    }
  }, [open, order]);

  const loadProducts = async (orderData?: any) => {
    try {
      // Use provided orderData or fall back to state
      const currentOrderData = orderData || orderDetails;

      // Determine warehouse from existing order items
      let warehouseFilter = undefined;
      if (currentOrderData?.items && currentOrderData.items.length > 0) {
        // Get warehouse_id from the first item (assuming all items are from the same warehouse)
        const firstItem = currentOrderData.items[0];
        if (firstItem.warehouse_id) {
          warehouseFilter = firstItem.warehouse_id;
        }
      }

      const response = await productApi.getProducts({
        page: 1,
        limit: 1000,
        warehouse: warehouseFilter,
        hasStock: true
      });
      setProducts(response.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadTags = async () => {
    try {
      // Only load tags with type 'order'
      const tags = await orderTagsApi.getAllTags({ type: 'order' });
      setAvailableTags(tags);
    } catch (error) {
      // Fallback to empty array if API fails
      setAvailableTags([]);
    }
  };

  const loadWarehouses = async () => {
    try {
      const response = await warehouseApi.getWarehouses({ page: 1, limit: 100 });
      setWarehouses(response.warehouses || []);
    } catch (error) {
      // Fallback to empty array if API fails
      setWarehouses([]);
    }
  };

  const loadOrderDetails = async () => {
    if (!order?.id) {
      return;
    }
    setLoading(true);
    try {
      const orderData = await orderApi.getOrder(order.id);
      setOrderDetails(orderData);
      // Initialize editing expenses from order data
      setEditingExpenses(orderData.expenses || []);
      setIsEditingExpenses(false);
      // Always fetch fresh customer info for authoritative address
      if (orderData.customer_id) {
        try {
          const customer = await customerApi.getCustomer(orderData.customer_id);
          setCustomerDetails(customer);
        } catch (e) {
          setCustomerDetails(null);
        }
      } else {
        setCustomerDetails(null);
      }
      // Load products after order details are loaded (to get warehouse info)
      await loadProducts(orderData);
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
      } else if (field === 'taxCode') {
        updateData['taxCode'] = value;
      } else if (field === 'vatEmail') {
        updateData['vatEmail'] = value;
      } else if (field === 'companyName') {
        updateData['companyName'] = value;
      } else if (field === 'companyPhone') {
        updateData['companyPhone'] = value;
      } else if (field === 'companyAddress') {
        updateData['companyAddress'] = value;
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
    const config = getOrderStatusConfig(status);
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
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

  // Helper function to get display name for tag
  const getTagDisplayName = (tag: OrderTag) => {
    return tag.display_name || tag.name || tag.raw_name || tag.id;
  };

  // Convert tags from string array to OrderTag objects for display
  const getTagsForDisplay = () => {
    if (!orderDetails?.tags || !Array.isArray(orderDetails.tags)) return [];
    return orderDetails.tags.map(tagName => {
      // Try to find tag by id, name, display_name, or raw_name
      const tag = availableTags.find(t =>
        t.id === tagName ||
        t.name === tagName ||
        t.display_name === tagName ||
        t.raw_name === tagName
      );
      // If tag found, return it; otherwise create a default tag object
      return tag || {
        id: tagName,
        name: tagName,
        color: '#6B7280',
        display_name: tagName,
        raw_name: tagName
      };
    });
  };

  // Show all tags in this dialog, with reconciliation tags first
  const getOtherTags = () => {
    const allTags = getTagsForDisplay();
    const reconciliationTags = allTags.filter((t: any) => t.name === 'Đã đối soát' || t.name === 'Chưa đối soát');
    const otherTags = allTags.filter((t: any) => t.name !== 'Đã đối soát' && t.name !== 'Chưa đối soát');
    return [...reconciliationTags, ...otherTags];
  };

  // Product editing functions
  const startEditingItem = (itemId: string, item: OrderItem) => {
    setEditingItems(prev => ({
      ...prev,
      [itemId]: {
        product_id: item.product_id,
        product_name: item.product_name,
        product_code: item.product_code,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }
    }));
  };

  const cancelEditingItem = (itemId: string) => {
    setEditingItems(prev => {
      const newItems = { ...prev };
      delete newItems[itemId];
      return newItems;
    });
  };

  const updateEditingItem = (itemId: string, field: keyof OrderItem, value: any) => {
    setEditingItems(prev => {
      const current = prev[itemId] || {};
      const updated = { ...current, [field]: value };
      // Auto-calculate total_price when quantity or unit_price changes
      if (field === 'quantity' || field === 'unit_price') {
        const quantity = field === 'quantity' ? Number(value) : (updated.quantity || 0);
        const unitPrice = field === 'unit_price' ? Number(value) : (updated.unit_price || 0);
        updated.total_price = quantity * unitPrice;
      }
      // Auto-fill product info when product_id changes
      if (field === 'product_id') {
        const product = products.find(p => p.id === value);
        if (product) {
          updated.product_id = product.id;
          updated.product_name = product.name;
          updated.product_code = product.code;
          updated.unit_price = product.price || updated.unit_price || 0;
          updated.total_price = (updated.quantity || 0) * (product.price || 0);
        }
      }
      return { ...prev, [itemId]: updated };
    });
  };

  const saveItem = async (itemId: string) => {
    if (!orderDetails) return;
    const editedItem = editingItems[itemId];
    if (!editedItem) return;
    setLoading(true);
    try {
      // Sử dụng updateOrderItem với format data đúng (camelCase)
      await orderApi.updateOrderItem(orderDetails.id, itemId, {
        productId: editedItem.product_id || '',
        productName: editedItem.product_name || '',
        productCode: editedItem.product_code || '',
        quantity: editedItem.quantity || 0,
        unitPrice: editedItem.unit_price || 0
      });
      
      // Refresh order details
      const updatedOrder = await orderApi.getOrder(orderDetails.id);
      setOrderDetails(updatedOrder);
      // Clear editing state
      cancelEditingItem(itemId);
      if (onOrderUpdated) {
        onOrderUpdated();
      }
      toast({
        title: "Thành công",
        description: "Đã cập nhật sản phẩm",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể cập nhật sản phẩm"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!orderDetails) return;
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi đơn hàng?')) {
      return;
    }
    setLoading(true);
    try {
      await orderApi.deleteOrderItem(orderDetails.id, itemId);
      // Refresh order details
      const updatedOrder = await orderApi.getOrder(orderDetails.id);
      setOrderDetails(updatedOrder);
      if (onOrderUpdated) {
        onOrderUpdated();
      }
      toast({
        title: "Thành công",
        description: "Đã xóa sản phẩm",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể xóa sản phẩm"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addNewItem = () => {
    if (!orderDetails) return;
    if (products.length === 0) {
      toast({
        title: "Lỗi",
        description: "Không có sản phẩm nào để thêm",
        variant: "destructive",
      });
      return;
    }
    if (warehouses.length === 0) {
      toast({
        title: "Lỗi",
        description: "Không có kho hàng nào để thêm sản phẩm",
        variant: "destructive",
      });
      return;
    }
    const newItemId = `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const defaultWarehouse = warehouses[0]; // Use first warehouse as default
    const newItem = {
      id: newItemId,
      product_id: "",
      product_code: "",
      product_name: "",
      warehouse_id: defaultWarehouse.id,
      quantity: 1,
      unit_price: 0,
      total_price: 0
    };
    setPendingNewItems(prev => [...prev, newItem]);
  };

  const handlePendingNewItemChange = (itemId: string, field: keyof OrderItem, value: any) => {
    setPendingNewItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item;

        const updated = { ...item, [field]: value };

        // Auto-fill product info when product_id changes
        if (field === 'product_id') {
          const product = products.find(p => p.id === value);
          if (product) {
            updated.product_id = product.id;
            updated.product_name = product.name;
            updated.product_code = product.code;
            updated.unit_price = product.price || 0;
            updated.total_price = (updated.quantity || 0) * (product.price || 0);
          }
        }

        // Auto-calculate total_price when quantity or unit_price changes
        if (field === 'quantity' || field === 'unit_price') {
          const quantity = field === 'quantity' ? Number(value) : (updated.quantity || 0);
          const unitPrice = field === 'unit_price' ? Number(value) : (updated.unit_price || 0);
          updated.total_price = quantity * unitPrice;
        }

        return updated;
      })
    );
  };

  const cancelPendingNewItem = (itemId: string) => {
    setPendingNewItems(prev => prev.filter(item => item.id !== itemId));
  };

  const saveAllPendingItems = async () => {
    if (!orderDetails || pendingNewItems.length === 0) return;

    // Validate all items
    const invalidItems = pendingNewItems.filter(item =>
      !item.product_id || !item.product_name || !item.quantity || item.quantity <= 0
    );

    if (invalidItems.length > 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin cho tất cả sản phẩm",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Save all items sequentially
      for (const pendingItem of pendingNewItems) {
        await orderApi.addOrderItem(orderDetails.id, {
          productId: pendingItem.product_id,
          productName: pendingItem.product_name,
          productCode: pendingItem.product_code,
          warehouseId: pendingItem.warehouse_id!,
          quantity: pendingItem.quantity,
          unitPrice: pendingItem.unit_price
        });
      }

      // Refresh order details
      const updatedOrder = await orderApi.getOrder(orderDetails.id);
      setOrderDetails(updatedOrder);

      // Clear all pending items
      setPendingNewItems([]);

      if (onOrderUpdated) {
        onOrderUpdated();
      }

      toast({
        title: "Thành công",
        description: `Đã thêm ${pendingNewItems.length} sản phẩm`,
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể thêm sản phẩm"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading wrapper for the entire dialog
  return (
    <LoadingWrapper
      isLoading={loading || !orderDetails}
      error={null}
      onRetry={() => {
        loadOrderDetails();
      }}
      loadingMessage="Đang tải chi tiết đơn hàng..."
    >
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa đơn hàng #{orderDetails?.order_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Customer Information */}
            <div className="space-y-4">
              {renderEditableField('customer_name', 'Họ tên', customerDetails?.name || orderDetails?.customer_name || '')}
              {renderEditableField('customer_phone', 'Điện thoại', orderDetails?.customer_phone || '')}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Mã khách hàng:</label>
                <div className="text-base">{orderDetails?.customer?.code || orderDetails?.customer_code || 'Chưa có mã'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email:</label>
                <div className="text-base">{orderDetails?.customer?.email || 'Chưa có email'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nhãn khách hàng:</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {getOtherTags().length > 0 ? (
                    getOtherTags().map((tag: any) => (
                      <Badge
                        key={tag.id}
                        style={{ backgroundColor: tag.color, color: 'white' }}
                      >
                        {getTagDisplayName(tag)}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="secondary">Không có nhãn khác</Badge>
                  )}
                </div>
              </div>
              {renderEditableField('notes', 'Ghi chú', orderDetails?.notes, 'textarea')}
            </div>

            {/* Shipping Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚚</span>
                <h3 className="text-lg font-semibold">Vận chuyển</h3>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {renderEditableField('receiverName', 'Tên người nhận hàng', (orderDetails as any)?.receiverName || customerDetails?.name)}
                {renderEditableField('receiverPhone', 'SĐT người nhận hàng', (orderDetails as any)?.receiverPhone)}
              </div>
              <div className="mt-4">
                {renderEditableAddressField(
                  'receiverAddress',
                  'Địa chỉ giao hàng',
                  (orderDetails as any)?.receiverAddress || customerDetails?.address,
                  (orderDetails as any)?.addressInfo || (orderDetails as any)?.receiverAddressInfo
                )}
              </div>
            </div>

            <Separator />

            {/* VAT Company Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧾</span>
                <h3 className="text-lg font-semibold">Thông tin VAT</h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {renderEditableField('taxCode', 'Mã số thuế', orderDetails?.taxCode || (orderDetails as any)?.vat_tax_code)}
                {renderEditableField('vatEmail', 'Email nhận hóa đơn VAT', orderDetails?.vatEmail || (orderDetails as any)?.vat_invoice_email)}
                {renderEditableField('companyName', 'Tên công ty', orderDetails?.companyName || (orderDetails as any)?.vat_company_name)}
                {renderEditableField('companyPhone', 'Điện thoại công ty', orderDetails?.companyPhone || (orderDetails as any)?.vat_company_phone)}
                <div className="lg:col-span-2">
                  {renderEditableField('companyAddress', 'Địa chỉ công ty', orderDetails?.companyAddress || (orderDetails as any)?.vat_company_address)}
                </div>
              </div>
            </div>

            <Separator />

            {/* Products */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📦</span>
                  <h3 className="text-lg font-semibold">Sản phẩm</h3>
                </div>
                <div className="flex gap-2">
                  {pendingNewItems.length > 0 && (
                    <Button
                      size="sm"
                      onClick={saveAllPendingItems}
                      disabled={loading || pendingNewItems.some(item => !item.product_id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Lưu tất cả ({pendingNewItems.length})
                    </Button>
                  )}
                  <Button size="sm" onClick={addNewItem} disabled={loading}>
                    <Plus className="w-4 h-4 mr-1" />
                    Thêm sản phẩm
                  </Button>
                </div>
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
                    <TableHead className="w-24">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderDetails?.items && orderDetails.items.length > 0 ? (
                    <>
                      {orderDetails.items.map((item: OrderItem, index: number) => {
                        const isEditing = !!editingItems[item.id || ''];
                        const editedItem = editingItems[item.id || ''] || item;
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Select
                                  value={editedItem.product_id || ''}
                                  onValueChange={(value) => updateEditingItem(item.id || '', 'product_id', value)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Chọn sản phẩm" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products.map((product) => {
                                      const isProductAlreadyUsed = orderDetails.items.some(
                                        (existingItem: OrderItem) =>
                                          existingItem.product_id === product.id && existingItem.id !== item.id
                                      );
                                      return (
                                        <SelectItem
                                          key={product.id}
                                          value={product.id}
                                          disabled={isProductAlreadyUsed}
                                        >
                                          {product.code} - {product.name}
                                          {isProductAlreadyUsed && ' (đã có)'}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="space-y-1">
                                  <div className="font-medium">{item.product_code || 'N/A'}</div>
                                  <div className="text-sm text-muted-foreground">{item.product_name || 'N/A'}</div>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">-</TableCell>
                            <TableCell className="text-center">
                              {isEditing ? (
                                <NumberInput
                                  min={1}
                                  value={editedItem.quantity || 0}
                                  onChange={(value) => updateEditingItem(item.id || '', 'quantity', value)}
                                  className="w-20 text-center"
                                />
                              ) : (
                                item.quantity
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <CurrencyInput
                                  value={editedItem.unit_price || 0}
                                  onChange={(value) => updateEditingItem(item.id || '', 'unit_price', value)}
                                  className="w-24 text-right"
                                />
                              ) : (
                                formatCurrency(item.unit_price)
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(isEditing ? editedItem.total_price : item.total_price)}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => saveItem(item.id || '')}
                                    disabled={loading}
                                  >
                                    <Check className="w-4 h-4 text-green-600" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => cancelEditingItem(item.id || '')}
                                  >
                                    <X className="w-4 h-4 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEditingItem(item.id || '', item)}
                                    disabled={loading}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteItem(item.id || '')}
                                    disabled={loading}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      {/* Pending new item rows */}
                      {pendingNewItems.map((pendingItem, index) => (
                        <TableRow key={pendingItem.id} className="bg-blue-50/50 border-t-2 border-blue-200">
                          <TableCell className="font-medium text-blue-600">{(orderDetails.items?.length || 0) + index + 1}</TableCell>
                          <TableCell>
                            <Select
                              value={pendingItem.product_id || ''}
                              onValueChange={(value) => handlePendingNewItemChange(pendingItem.id!, 'product_id', value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Chọn sản phẩm" />
                              </SelectTrigger>
                              <SelectContent>
                                {products
                                  .filter(product =>
                                    !orderDetails.items.some(
                                      (existingItem: OrderItem) => existingItem.product_id === product.id
                                    ) &&
                                    !pendingNewItems.some(
                                      (otherPending: any) => otherPending.id !== pendingItem.id && otherPending.product_id === product.id
                                    )
                                  )
                                  .map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.code} - {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center">-</TableCell>
                          <TableCell className="text-center">
                            <NumberInput
                              min={1}
                              value={pendingItem.quantity || 1}
                              onChange={(value) => handlePendingNewItemChange(pendingItem.id!, 'quantity', value)}
                              className="w-20 text-center"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <CurrencyInput
                              value={pendingItem.unit_price || 0}
                              onChange={(value) => handlePendingNewItemChange(pendingItem.id!, 'unit_price', value)}
                              className="w-24 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(pendingItem.total_price || 0)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => cancelPendingNewItem(pendingItem.id!)}
                              disabled={loading}
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Không có sản phẩm nào trong đơn hàng
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-end">
                <div className="w-96 space-y-3">
                  {/* Summary Section */}
                  <div className="space-y-2">
                    {(() => {
                      // Calculate totals including pending items
                      const existingItems = orderDetails?.items || [];
                      const allItems = [...existingItems, ...pendingNewItems];

                      const totalQuantity = allItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
                      const totalProductAmount = allItems.reduce((sum: number, item: any) => sum + ((item.total_price || 0)), 0);

                      const expensesTotal = (orderDetails?.expenses || []).reduce(
                        (sum: number, exp: any) => sum + (Number(exp.amount) || 0),
                        0
                      );

                      const grandTotal = totalProductAmount + expensesTotal;

                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Tổng số lượng:</span>
                            <span className="font-medium">{totalQuantity}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tổng tiền sản phẩm:</span>
                            <span>{formatCurrency(totalProductAmount)}</span>
                          </div>
                          {expensesTotal > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Chi phí:</span>
                              <span>{formatCurrency(expensesTotal)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span>Tổng tiền:</span>
                            <span className="text-xl">{formatCurrency(grandTotal)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Expenses */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💰</span>
                  <h3 className="text-lg font-semibold">Chi phí</h3>
                </div>
                {!isEditingExpenses && (
                  <Button size="sm" variant="outline" onClick={() => setIsEditingExpenses(true)}>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Sửa chi phí
                  </Button>
                )}
              </div>
              {isEditingExpenses ? (
                <div className="space-y-4">
                  <Table className="border border-border/30 rounded-lg overflow-hidden">
                    <TableHeader>
                      <TableRow className="bg-slate-50 border-b-2 border-slate-200">
                        <TableHead className="border-r border-slate-200 font-semibold text-slate-700">Tên chi phí</TableHead>
                        <TableHead className="border-r border-slate-200 font-semibold text-slate-700">Số tiền</TableHead>
                        <TableHead className="border-r border-slate-200 font-semibold text-slate-700">Ghi chú</TableHead>
                        <TableHead className="font-semibold text-slate-700"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editingExpenses.map((expense, index) => (
                        <TableRow key={index} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <TableCell className="border-r border-slate-100 align-top pt-4">
                            <Input
                              value={expense.name}
                              onChange={(e) => {
                                const updated = [...editingExpenses];
                                updated[index] = { ...updated[index], name: e.target.value };
                                setEditingExpenses(updated);
                              }}
                              placeholder="Ví dụ: Phí vận chuyển"
                            />
                          </TableCell>
                          <TableCell className="border-r border-slate-100 align-top pt-4">
                            <CurrencyInput
                              value={expense.amount}
                              onChange={(value) => {
                                const updated = [...editingExpenses];
                                updated[index] = { ...updated[index], amount: value };
                                setEditingExpenses(updated);
                              }}
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell className="border-r border-slate-100 align-top pt-4">
                            <Input
                              value={expense.note || ""}
                              onChange={(e) => {
                                const updated = [...editingExpenses];
                                updated[index] = { ...updated[index], note: e.target.value };
                                setEditingExpenses(updated);
                              }}
                              placeholder="Ghi chú (không bắt buộc)"
                            />
                          </TableCell>
                          <TableCell className="align-top pt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const updated = editingExpenses.filter((_, i) => i !== index);
                                setEditingExpenses(updated);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-between items-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingExpenses([...editingExpenses, { name: "", amount: 0, note: "" }]);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Thêm chi phí
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingExpenses(orderDetails?.expenses || []);
                          setIsEditingExpenses(false);
                        }}
                      >
                        Hủy
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (!orderDetails) return;
                          setLoading(true);
                          try {
                            const filteredExpenses = editingExpenses
                              .filter(exp => (exp.name && exp.name.trim().length > 0) || exp.amount)
                              .map(exp => ({
                                name: exp.name.trim(),
                                amount: exp.amount || 0,
                                note: exp.note && exp.note.trim().length > 0 ? exp.note.trim() : undefined,
                              }));
                            await orderApi.updateOrder(orderDetails.id, {
                              expenses: filteredExpenses,
                            });
                            const updatedOrder = await orderApi.getOrder(orderDetails.id);
                            setOrderDetails(updatedOrder);
                            setEditingExpenses(updatedOrder.expenses || []);
                            setIsEditingExpenses(false);
                            if (onOrderUpdated) {
                              onOrderUpdated();
                            }
                            toast({
                              title: "Thành công",
                              description: "Đã cập nhật chi phí",
                            });
                          } catch (error) {
                            toast({
                              title: "Lỗi",
                              description: getErrorMessage(error, "Không thể cập nhật chi phí"),
                              variant: "destructive",
                            });
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                      >
                        Lưu
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-right">
                    Tổng chi phí:{" "}
                    <span className="font-semibold text-blue-600">
                      {editingExpenses
                        .reduce((sum, exp) => sum + (exp.amount || 0), 0)
                        .toLocaleString("vi-VN")}{" "}
                      đ
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  {orderDetails?.expenses && orderDetails.expenses.length > 0 ? (
                    <Table className="border border-border/30 rounded-lg overflow-hidden">
                      <TableHeader>
                        <TableRow className="bg-slate-50 border-b-2 border-slate-200">
                          <TableHead className="border-r border-slate-200 font-semibold text-slate-700">#</TableHead>
                          <TableHead className="border-r border-slate-200 font-semibold text-slate-700">Tên chi phí</TableHead>
                          <TableHead className="border-r border-slate-200 font-semibold text-slate-700 text-right">Số tiền</TableHead>
                          <TableHead className="font-semibold text-slate-700">Ghi chú</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderDetails.expenses.map((expense: any, index: number) => (
                          <TableRow key={index} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <TableCell className="border-r border-slate-100 font-medium">{index + 1}</TableCell>
                            <TableCell className="border-r border-slate-100">{expense.name}</TableCell>
                            <TableCell className="border-r border-slate-100 text-right">
                              {formatCurrency(Number(expense.amount) || 0)}
                            </TableCell>
                            <TableCell>{expense.note || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-sm text-muted-foreground py-4">
                      Chưa có chi phí nào
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Order Status and Info */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-muted-foreground">Trạng thái xử lý:</span>
                  <Select
                    value={(orderDetails as any)?.order_status || orderDetails?.status || 'pending'}
                     onValueChange={(newStatus) => handleUpdateStatusDirect(newStatus)}
                  >
                     <SelectTrigger className="w-auto h-auto p-0 border-none bg-transparent hover:bg-transparent focus:bg-transparent">
                       <div className="cursor-pointer">
                        {getStatusBadge((orderDetails as any)?.order_status || orderDetails?.status)}
                       </div>
                     </SelectTrigger>
                     <SelectContent>
                       {ORDER_STATUSES.map((status) => (
                         <SelectItem key={status} value={status}>
                           {ORDER_STATUS_LABELS_VI[status]}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                  </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Trạng thái thanh toán:</span>
                  {getPaymentStatusBadge(
                    (orderDetails as any)?.payment_status ||
                    calculatePaymentStatus(
                      orderDetails?.paid_amount || orderDetails?.initial_payment || 0,
                      orderDetails?.total_amount || 0
                    )
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Loại đơn hàng:</span>
                  <span>{orderDetails?.order_type === 'sale' ? 'Bán hàng' : 'Trả hàng'}</span>
                </div>
                {orderDetails?.vat_type && orderDetails.vat_type !== 'none' && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Loại VAT:</span>
                    <Badge variant="outline" className="text-xs">
                      {orderDetails.vat_type === 'total' ? 'Tính trên tổng' :
                       orderDetails.vat_type === 'per_line' ? 'Tính theo dòng' :
                       'Không có'}
                    </Badge>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Người tạo đơn:</span>
                  <span>{(orderDetails as any)?.profiles?.full_name || 'Hệ thống'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Số đơn hàng:</span>
                  <span className="font-mono">{orderDetails?.order_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Ngày tạo:</span>
                  <span>{orderDetails?.created_at ? new Date(orderDetails.created_at).toLocaleDateString('vi-VN') : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tổng tiền:</span>
                  <span className="font-medium">{formatCurrency(orderDetails?.total_amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Hạn thanh toán:</span>
                  <div className="flex items-center gap-2">
                    {editingFields['paymentDeadline'] ? (
                      <>
                        <Input
                          type="date"
                          value={
                            editValues['paymentDeadline'] ??
                            (orderDetails?.paymentDeadline && /^\d{4}-\d{2}-\d{2}$/.test(orderDetails.paymentDeadline)
                              ? orderDetails.paymentDeadline
                              : orderDetails?.paymentDeadline
                              ? new Date(orderDetails.paymentDeadline).toISOString().slice(0, 10)
                              : '')
                          }
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              paymentDeadline: e.target.value,
                            }))
                          }
                          className="w-40"
                        />
                        <Button size="sm" onClick={() => saveField('paymentDeadline')} disabled={loading}>
                          Lưu
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancelEditing('paymentDeadline')}
                        >
                          Hủy
                        </Button>
                      </>
                    ) : (
                      <>
                        <span>
                          {orderDetails?.paymentDeadline
                            ? new Date(orderDetails.paymentDeadline).toLocaleDateString('vi-VN')
                            : 'Chưa đặt'}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            startEditing(
                              'paymentDeadline',
                              orderDetails?.paymentDeadline &&
                              /^\d{4}-\d{2}-\d{2}$/.test(orderDetails.paymentDeadline)
                                ? orderDetails.paymentDeadline
                                : orderDetails?.paymentDeadline
                                ? new Date(orderDetails.paymentDeadline).toISOString().slice(0, 10)
                                : ''
                            )
                          }
                        >
                          Sửa
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Đã thanh toán:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">{formatCurrency(orderDetails?.paid_amount || orderDetails?.initial_payment)}</span>
                    <Button size="sm" variant="outline" onClick={() => setShowPaymentDialog(true)}>
                      Thanh toán
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
                          value={editValues['contract_number'] ?? (orderDetails?.contract_number || '')}
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
                        <span className="font-mono">{orderDetails?.contract_number || 'Chưa có'}</span>
                        <Button size="sm" variant="outline" onClick={() => startEditing('contract_number', orderDetails?.contract_number || '')}>
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
                          value={editValues['purchase_order_number'] ?? (orderDetails?.purchase_order_number || '')}
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
                        <span className="font-mono">{orderDetails?.purchase_order_number || 'Chưa có'}</span>
                        <Button size="sm" variant="outline" onClick={() => startEditing('purchase_order_number', orderDetails?.purchase_order_number || '')}>
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
    </LoadingWrapper>
  );
};