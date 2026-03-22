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
import { Package, Plus, CheckCircle, Clock, Bell, Trash2 } from "lucide-react";
import { orderApi, type Order, type OrderItem, type OrderAllocationStatus } from "@/api/order.api";
import { warehouseReceiptsApi, type CreateWarehouseReceiptRequest } from "@/api/warehouseReceipts.api";
import { warehouseApi, type Warehouse } from "@/api/warehouse.api";
import { stockLevelsApi } from "@/api/stockLevels.api";
import { Loading } from "@/components/ui/loading";
import { all } from "axios";
interface OrderSpecificSlipCreationProps {
  orderId: string;
  orderType?: string;
  slipType?: string; // Custom slip type: 'import' | 'export' | 'sale_return' | 'purchase_return'
  onExportSlipCreated?: () => void;
}
interface ExportSlipFormItem {
  product_id: string;
  quantity: number;
  current_stock?: number;
}

interface ExportSlipForm {
  id: string; // Temporary ID for React key
  slipCode: string;
  warehouse_id: string;
  items: ExportSlipFormItem[];
  notes: string;
}
export const OrderSpecificSlipCreation: React.FC<OrderSpecificSlipCreationProps> = ({ 
  orderId,
  orderType,
  slipType,
  onExportSlipCreated 
}) => {
  // Determine if it's a purchase order
  const isPurchaseOrder = orderType == 'purchase';
  // Determine slip type: use slipType if provided, otherwise derive from orderType
  const effectiveSlipType = slipType || (isPurchaseOrder ? 'import' : 'export');
  const isReturnSlip = slipType === 'sale_return' || slipType === 'purchase_return';
  // Determine if we're creating import slips (vs export slips)
  const isImportSlip = effectiveSlipType === 'import' || effectiveSlipType === 'purchase_return';
  
  // Helper for display labels
  const getSlipTypeLabel = (isImport: boolean, isReturn: boolean) => {
    if (isReturn) return isImport ? 'Trả hàng NCC' : 'Hoàn hàng';
    return isImport ? 'Nhập kho' : 'Xuất kho';
  };
  const getSlipTypeLabelLower = (isImport: boolean, isReturn: boolean) => {
    if (isReturn) return isImport ? 'trả hàng NCC' : 'hoàn hàng';
    return isImport ? 'nhập kho' : 'xuất kho';
  };
  const [order, setOrder] = useState<Order | null>(null);
  const [allocationStatus, setAllocationStatus] = useState<OrderAllocationStatus | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [exportSlips, setExportSlips] = useState<ExportSlipForm[]>([]);
  const [exportedQuantityByProduct, setExportedQuantityByProduct] = useState<Record<string, number>>({});
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, slipType]);
  
  const generateSlipCode = () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const prefix = isImportSlip ? 'IMP' : 'EXP';
    const code = `${prefix}${dateStr}${timeStr}`.slice(0, 20);
    return code;
  };
  
  const addExportSlip = () => {
    const newSlip: ExportSlipForm = {
      id: `slip-${Date.now()}-${Math.random()}`,
      slipCode: '',
      warehouse_id: warehouses.length > 0 ? warehouses[0].id : '',
      items: [],
      notes: ''
    };
    setExportSlips(prev => [...prev, newSlip]);
  };
  
  const removeExportSlip = (slipId: string) => {
    setExportSlips(prev => prev.filter(slip => slip.id !== slipId));
  };
  
  const updateExportSlip = (slipId: string, field: keyof ExportSlipForm, value: any) => {
    setExportSlips(prev => prev.map(slip => {
      if (slip.id === slipId) {
        const updatedSlip = { ...slip, [field]: value };
        // If warehouse changed, fetch stock levels for all items
        if (field === 'warehouse_id' && value) {
          updatedSlip.items.forEach((item, itemIndex) => {
            if (item.product_id) {
              setTimeout(() => {
                void fetchStockLevelForSlipItem(slipId, itemIndex, item.product_id, value);
              }, 0);
            }
          });
        }
        return updatedSlip;
      }
      return slip;
    }));
  };
  
  const addItemToSlip = (slipId: string) => {
    setExportSlips(prev => prev.map(slip => {
      if (slip.id === slipId) {
        return {
          ...slip,
          items: [...slip.items, { product_id: '', quantity: 1 }]
        };
      }
      return slip;
    }));
  };
  
  const removeItemFromSlip = (slipId: string, itemIndex: number) => {
    setExportSlips(prev => prev.map(slip => {
      if (slip.id === slipId) {
        return {
          ...slip,
          items: slip.items.filter((_, index) => index !== itemIndex)
        };
      }
      return slip;
    }));
  };
  
  const updateSlipItem = (slipId: string, itemIndex: number, field: keyof ExportSlipFormItem, value: any) => {
    setExportSlips(prev => prev.map(slip => {
      if (slip.id === slipId) {
        const items = [...slip.items];
        items[itemIndex] = { ...items[itemIndex], [field]: value };
        const updatedSlip = { ...slip, items };
        
        // If product_id changed and warehouse is selected, fetch stock level
        if (field === 'product_id' && value && slip.warehouse_id) {
          setTimeout(() => {
            void fetchStockLevelForSlipItem(slipId, itemIndex, value, slip.warehouse_id);
          }, 0);
        }
        
        return updatedSlip;
      }
      return slip;
    }));
  };
  
  const fetchStockLevelForSlipItem = async (slipId: string, itemIndex: number, productId: string, warehouseId: string) => {
    if (!productId || !warehouseId) return;
    try {
      const stockLevels = await stockLevelsApi.getStockLevels({
        productId,
        warehouseId,
        limit: 1
      });
      const currentStock = stockLevels.stockLevels.length > 0 ? stockLevels.stockLevels[0].quantity : 0;
      setExportSlips(prev => prev.map(slip => {
        if (slip.id === slipId) {
          const items = [...slip.items];
          items[itemIndex] = { ...items[itemIndex], current_stock: currentStock };
          return { ...slip, items };
        }
        return slip;
      }));
    } catch (error) {
      setExportSlips(prev => prev.map(slip => {
        if (slip.id === slipId) {
          const items = [...slip.items];
          items[itemIndex] = { ...items[itemIndex], current_stock: 0 };
          return { ...slip, items };
        }
        return slip;
      }));
    }
  };
  const loadOrder = async () => {
    try {
      setOrderLoading(true);
      // Use includeAllocationStatus=true to get allocation data from backend
      const orderData = await orderApi.getOrder(orderId, { includeDeleted: true, includeAllocationStatus: true });
      setOrder(orderData);
      
      // Set allocation status from API response
      if (orderData.allocationStatus) {
        setAllocationStatus(orderData.allocationStatus);
      }
      
      // Build exportedQuantityByProduct from allocationStatus for backward compatibility
      // This is used for display and validation
      let exportedQuantityByProduct: Record<string, number> = {};
      if (orderData.allocationStatus?.allocations) {
        orderData.allocationStatus.allocations.forEach((alloc) => {
          exportedQuantityByProduct[alloc.productId] = alloc.allocatedQuantity;
        });
      }
      setExportedQuantityByProduct(exportedQuantityByProduct);
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
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách kho",
        variant: "destructive",
      });
    }
  };
  const handleCreateAllExportSlips = async () => {
    if (!order) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy thông tin đơn hàng",
        variant: "destructive",
      });
      return;
    }
    
    if (exportSlips.length === 0) {
      toast({
        title: "Lỗi",
        description: isImportSlip ? "Vui lòng thêm ít nhất một phiếu nhập kho" : "Vui lòng thêm ít nhất một phiếu xuất kho",
        variant: "destructive",
      });
      return;
    }
    
    // Validate all slips
    for (const slip of exportSlips) {
      if (!slip.warehouse_id) {
        toast({
          title: "Lỗi",
          description: isImportSlip 
            ? `Vui lòng chọn kho cho phiếu ${getSlipTypeLabelLower(isImportSlip, isReturnSlip)} "${slip.slipCode}"`
            : `Vui lòng chọn kho cho phiếu xuất kho "${slip.slipCode}"`,
          variant: "destructive",
        });
        return;
      }
      
      // Filter items with product_id and quantity > 0
      const validItems = slip.items.filter(item => item.product_id && item.quantity > 0);
      
      if (validItems.length === 0) {
        toast({
          title: "Lỗi",
          description: isImportSlip 
            ? `Vui lòng thêm ít nhất một sản phẩm cho phiếu ${getSlipTypeLabelLower(isImportSlip, isReturnSlip)} "${slip.slipCode}"`
            : `Vui lòng thêm ít nhất một sản phẩm cho phiếu xuất kho "${slip.slipCode}"`,
          variant: "destructive",
        });
        return;
      }
    }
    
    try {
      setLoading(true);
      
      // Get order items to get unit_price
      const orderItemsMap = new Map<string, OrderItem>();
      (order.items || []).forEach(item => {
        orderItemsMap.set(item.product_id, item);
      });
      
      if (isReturnSlip) {
        // Create return slips using warehouseReceiptsApi with new return note types
        const results = await Promise.all(exportSlips.map(async (slip) => {
          const validItems = slip.items.filter(item => item.product_id && item.quantity > 0);
          
          // Map slip type to new API type: sale_return -> sale_return_note, purchase_return -> purchase_return_note
          const apiType = slipType === 'purchase_return' ? 'purchase_return_note' : 'sale_return_note';
          
          // Only include code if user entered it, otherwise let backend generate
          const createRequest: any = {
            warehouseId: slip.warehouse_id,
            orderId: order.id,
            description: slip.notes.trim() || undefined,
            status: 'pending',
            type: apiType,
            details: validItems.map(item => {
              const orderItem = orderItemsMap.get(item.product_id);
              return {
                productId: item.product_id,
                quantity: item.quantity,
                unitPrice: orderItem?.unit_price || 0,
              };
            })
          };
          
          // Add code only if provided
          const code = slip.slipCode?.trim();
          if (code) {
            createRequest.code = code;
          }
          
          return await warehouseReceiptsApi.createReceipt(createRequest);
        }));
        
        toast({
          title: "Thành công",
          description: `Đã tạo ${results.length} phiếu ${getSlipTypeLabelLower(isImportSlip, isReturnSlip)} cho đơn hàng ${order.order_number}.`,
        });
      } else if (isImportSlip) {
        // Create import slips using warehouseReceiptsApi
        // Map slip type to API type: purchase_return -> purchase_return_note
        const apiType = effectiveSlipType === 'purchase_return' ? 'purchase_return_note' : effectiveSlipType;
        
        const results = await Promise.all(exportSlips.map(async (slip) => {
          const validItems = slip.items.filter(item => item.product_id && item.quantity > 0);
          
          // Only include code if user entered it, otherwise let backend generate
          const createRequest: any = {
            warehouseId: slip.warehouse_id,
            supplierId: order.customer_id, // Use customer_id as supplier_id for purchase orders
            orderId: order.id,
            description: slip.notes.trim() || undefined,
            status: 'pending',
            type: apiType,
            details: validItems.map(item => {
              const orderItem = orderItemsMap.get(item.product_id);
              return {
                productId: item.product_id,
                quantity: item.quantity,
                unitPrice: orderItem?.unit_price || 0,
                vatPercentage: orderItem?.vat_percentage || 0,
                warehouseId: slip.warehouse_id,
              };
            })
          };
          
          // Add code only if provided
          const code = slip.slipCode?.trim();
          if (code) {
            createRequest.code = code;
          }
          
          return await warehouseReceiptsApi.createReceipt(createRequest);
        }));
        
        toast({
          title: "Thành công",
          description: `Đã tạo ${results.length} phiếu nhập kho cho đơn hàng ${order.order_number}.`,
        });
      } else {
        // Create export slips using warehouseReceiptsApi
        const results = await Promise.all(exportSlips.map(async (slip) => {
          const validItems = slip.items.filter(item => item.product_id && item.quantity > 0);
          
          // Only include code if user entered it, otherwise let backend generate
          const createRequest: any = {
            orderId: order.id,
            warehouseId: slip.warehouse_id,
            description: slip.notes.trim() || undefined,
            type: 'export',
            status: 'pending',
            details: validItems.map(item => {
              const orderItem = orderItemsMap.get(item.product_id);
              return {
                productId: item.product_id,
                quantity: item.quantity,
                unitPrice: orderItem?.unit_price || 0,
                warehouseId: slip.warehouse_id
              };
            })
          };
          
          // Add code only if provided
          const code = slip.slipCode?.trim();
          if (code) {
            createRequest.code = code;
          }
          
          return await warehouseReceiptsApi.createReceipt(createRequest);
        }));
        
        toast({
          title: "Thành công",
          description: `Đã tạo ${results.length} phiếu xuất kho cho đơn hàng ${order.order_number}. Thông báo đã được gửi đến Quản lý kho.`,
        });
      }
      
      onExportSlipCreated?.();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || (isImportSlip ? "Không thể tạo phiếu nhập kho" : "Không thể tạo phiếu xuất kho");
      toast({
        title: "Lỗi",
        description: errorMessage,
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

  const getAvailableOrderItems = () => {
    if (!order) return [];
    
    // Use allocationStatus from API if available
    if (allocationStatus?.allocations) {
      return (order.items || []).filter(item => {
        const alloc = allocationStatus.allocations.find(a => a.productId === item.product_id);
        if (!alloc) return false;
        
        if (isReturnSlip) {
          const hasExportedOrImported = alloc.allocatedQuantity > 0;
          const hasPartialReturn = alloc.returnedQuantity > 0 && alloc.returnedQuantity < alloc.allocatedQuantity;
          return hasExportedOrImported || hasPartialReturn;
        }
        return alloc.allocatedQuantity < item.quantity;
      });
    }
    
    return (order.items || []).filter(item => {
      const exportedQuantity = exportedQuantityByProduct[item.product_id] || 0;
      if (isReturnSlip) {
        return exportedQuantity > 0;
      }
      return exportedQuantity < item.quantity;
    });
  };
  if (!canCreateExportSlip) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {getSlipTypeLabel(isImportSlip, isReturnSlip)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {isReturnSlip ? `Bạn không có quyền tạo phiếu ${getSlipTypeLabelLower(isImportSlip, isReturnSlip)}` : `Bạn không có quyền tạo phiếu ${getSlipTypeLabelLower(isImportSlip, isReturnSlip)}`}
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
            {getSlipTypeLabel(isImportSlip, isReturnSlip)}
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
            {getSlipTypeLabel(isImportSlip, isReturnSlip)}
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          {`Tạo phiếu ${getSlipTypeLabelLower(isImportSlip, isReturnSlip)} từ đơn hàng`}
        </CardTitle>
        <CardDescription>Đơn hàng: {order.order_number} - {order.customer_name}</CardDescription>
        <CardDescription>Hợp đồng: {order.contract_code || 'Không có'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">{`Trạng thái phiếu ${getSlipTypeLabelLower(isImportSlip, isReturnSlip)}`}</h4>
              <div className="text-sm text-blue-800 mt-2 space-y-1">
                {isImportSlip ? (
                  <>
                    <p><strong>Nháp:</strong> Phiếu được tạo, chưa ảnh hưởng tồn kho</p>
                    <p><strong>Hoàn thành:</strong> Hàng đã nhập vào kho, bắt đầu cộng tồn kho</p>
                  </>
                ) : (
                  <>
                    <p><strong>Chờ:</strong> Phiếu được tạo, chưa ảnh hưởng tồn kho</p>
                    <p><strong>Đã lấy hàng:</strong> Thủ kho xác nhận</p>
                    <p><strong>Đã xuất kho:</strong> Hàng đã rời khỏi kho, bắt đầu trừ tồn kho và hoàn tất quy trình</p>
                  </>
                )}
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
      </CardContent>
      <CardContent className="space-y-6">
        {/* Allocation status */}
        <div className="p-4 sticky -top-8 z-10 bg-white -mx-6 -mt-6 mb-6 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3">Trạng thái phân bổ ({isReturnSlip ? `Đã hoàn / ` : ''} {orderType == 'purchase' ? `Đã nhập` : `Đã xuất`} / Đơn hàng)</h4>
          <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
            {/* Use order.details if available, otherwise fall back to order.items */}
            {((order as any).details || order.items || []).map((item: any) => {
              // Find allocation for this product - check multiple ID fields
              const itemProductId = item.product_id || item.product?.id;
              const alloc = allocationStatus?.allocations?.find(a => 
                a.productId === itemProductId || 
                a.productId === item.product?.id
              );
              const orderQuantity = alloc?.orderQuantity ?? item.quantity ?? 0;
              const allocatedQuantity = alloc?.allocatedQuantity ?? 0;
              const returnedQuantity = alloc?.returnedQuantity ?? 0;
              const remainingQuantity = alloc?.remainingQuantity ?? 0;

              // Debug log
              console.log('Allocation for product:', item.product_id, alloc);
              
              return (
                <div
                  key={item.id || item.productId || itemProductId}
                  className="flex items-center justify-between w-full bg-gray-50 p-5 rounded-md gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate" title={item.product_name || item.productName || item.product?.name}>
                      {item.product_code || item.productCode || item.product?.code} - <b>{item.product_name || item.productName || item.product?.name}</b>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right whitespace-nowrap">
                    {isReturnSlip ? (
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-muted-foreground">
                          {returnedQuantity}/{allocatedQuantity}/{orderQuantity}
                        </div>
                        {(allocatedQuantity - returnedQuantity) > 0 ? (
                          <Badge variant="default" className="bg-yellow-100 text-yellow-800 w-fit">
                            Còn: {allocatedQuantity - returnedQuantity}
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-100 text-green-800 w-fit">
                            Đã hoàn đủ
                          </Badge>
                        )}
                      </div>
                    ) : (
                      // Show normal allocation info: allocatedQuantity/orderQuantity
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-muted-foreground">
                          {allocatedQuantity}/{orderQuantity}
                        </div>
                        {remainingQuantity > 0 ? (
                          <Badge variant="default" className="bg-yellow-100 text-yellow-800 w-fit">
                            Còn {remainingQuantity}
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-100 text-green-800 w-fit">
                            Đủ
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
              <div>{getStatusBadge(typeof order.status === 'object' ? order.status?.code : order.status)}</div>
            </div>
            <div>
              <Label className="font-medium">Tổng giá trị:</Label>
              <p className="text-green-600 font-semibold">{order.totalVat ? formatCurrency(order.totalVatAmount) : formatCurrency(order.totalAmount)}</p>
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
        {/* Export Slips List */}
        <div className="space-y-4">
          {exportSlips.map((slip, slipIndex) => (
              <Card key={slip.id} className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{getSlipTypeLabel(isImportSlip, isReturnSlip)} #{slipIndex + 1}</CardTitle>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeExportSlip(slip.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Xóa phiếu
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Slip Code */}
                  <div>
                    <Label htmlFor={`slip-code-${slip.id}`}>{getSlipTypeLabel(isImportSlip, isReturnSlip)}</Label>
                    <Input
                      id={`slip-code-${slip.id}`}
                      value={slip.slipCode}
                      onChange={(e) => updateExportSlip(slip.id, 'slipCode', e.target.value)}
                      placeholder={`Nhập mã phiếu ${getSlipTypeLabelLower(isImportSlip, isReturnSlip)} (tùy chọn)`}
                      maxLength={20}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {`Để trống để tự động tạo mã phiếu ${getSlipTypeLabelLower(isImportSlip, isReturnSlip)}`}
                    </p>
                  </div>
                  
                  {/* Warehouse */}
                  <div>
                    <Label htmlFor={`warehouse-${slip.id}`}>Kho hàng <span className="text-red-500">*</span></Label>
                    <Combobox
                      options={[
                        { label: "Chọn kho", value: "" },
                        ...warehouses.map((warehouse) => ({
                          label: `${warehouse.name} (${warehouse.code})`,
                          value: warehouse.id
                        }))
                      ]}
                      value={slip.warehouse_id}
                      onValueChange={(value) => updateExportSlip(slip.id, 'warehouse_id', value)}
                      placeholder={isImportSlip ? 'Chọn kho nhập hàng' : 'Chọn kho xuất hàng'}
                      searchPlaceholder="Tìm kho..."
                      emptyMessage="Không có kho nào"
                      className="w-full"
                    />
                  </div>
                  
                  {/* Products */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Label>Sản phẩm <span className="text-red-500">*</span></Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addItemToSlip(slip.id)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Thêm sản phẩm
                      </Button>
                    </div>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Sản phẩm</TableHead>
                            <TableHead className="text-center">Số lượng</TableHead>
                            <TableHead>Thông tin</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {slip.items.map((item, itemIndex) => {
                            const selectedOrderItem = order?.items?.find(oi => oi.product_id === item.product_id);
                            const availableOrderItems = getAvailableOrderItems();
                            // Get products already selected in this slip (excluding current item)
                            const selectedProductIds = slip.items
                              .map((it, idx) => idx !== itemIndex ? it.product_id : null)
                              .filter(id => id) as string[];
                            const availableItems = availableOrderItems.filter(oi => 
                              !selectedProductIds.includes(oi.product_id) || oi.product_id === item.product_id
                            );
                            
                            return (
                              <TableRow key={itemIndex}>
                                <TableCell className="w-[300px] min-w-[200px] max-w-[400px]">
                                  <Combobox
                                    options={[
                                      { label: "Chọn sản phẩm", value: "" },
                                      ...availableItems.map((orderItem) => ({
                                        label: `${orderItem.product_code} - ${orderItem.product_name}`,
                                        value: orderItem.product_id
                                      }))
                                    ]}
                                    value={item.product_id}
                                    onValueChange={(value) => {
                                      updateSlipItem(slip.id, itemIndex, 'product_id', value);
                                    }}
                                    placeholder="Chọn sản phẩm từ đơn hàng"
                                    searchPlaceholder="Tìm sản phẩm..."
                                    emptyMessage="Không có sản phẩm nào"
                                    className="w-full"
                                  />
                                </TableCell>
                                <TableCell className="whitespace-nowrap flex items-center justify-center">
                                  <NumberInput
                                    min={1}
                                    value={item.quantity}
                                    onChange={(value) => updateSlipItem(slip.id, itemIndex, 'quantity', value || 1)}
                                    className="w-20 text-center"
                                    disabled={!item.product_id}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  {selectedOrderItem ? (
                                    <div className="space-y-1">
                                      <div className="text-sm font-medium text-blue-600">
                                        Hãng sản xuất: {selectedOrderItem.manufacturer || 'Không có'}
                                      </div>
                                      {item.current_stock !== undefined && slip.warehouse_id && !isReturnSlip && (
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
                                  ) : (
                                    <span className="text-sm text-muted-foreground">Chưa chọn sản phẩm</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeItemFromSlip(slip.id, itemIndex)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  
                  {/* Notes */}
                  <div>
                    <Label htmlFor={`notes-${slip.id}`}>Ghi chú {!isReturnSlip && (<span className="text-red-500">*</span>)}</Label>
                    <Textarea
                      id={`notes-${slip.id}`}
                      value={slip.notes}
                      onChange={(e) => updateExportSlip(slip.id, 'notes', e.target.value)}
                      placeholder={`Nhập ghi chú cho phiếu ${getSlipTypeLabelLower(isImportSlip, isReturnSlip)}...`}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
          ))}
          
          {/* Add Export Slip Button */}
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={addExportSlip}
          >
            <Plus className="w-4 h-4 mr-2" />
            {`Thêm phiếu ${getSlipTypeLabelLower(isImportSlip, isReturnSlip)}`}
          </Button>
        </div>
        
        {/* Action Buttons */}
        {exportSlips.length > 0 && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              onClick={handleCreateAllExportSlips}
              disabled={loading}
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
                  {`Tạo tất cả phiếu ${getSlipTypeLabelLower(isImportSlip, isReturnSlip)} (${exportSlips.length})`}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
