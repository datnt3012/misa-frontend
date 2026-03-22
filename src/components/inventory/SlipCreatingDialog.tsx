import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Trash2, ExternalLink, Loader } from 'lucide-react';
import { orderApi, type Order } from '@/api/order.api';
import { customerApi, type Customer } from '@/api/customer.api';
import { warehouseReceiptsApi } from '@/api/warehouseReceipts.api';
import { warehouseApi, type Warehouse } from '@/api/warehouse.api';
import { productApi } from '@/api/product.api';
import { supplierApi, type Supplier } from '@/api/supplier.api';
import { stockLevelsApi } from '@/api/stockLevels.api';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useNavigate } from 'react-router-dom';

interface SlipCreatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slipType: 'import' | 'export';
  orderId?: string;
  onSlipCreated?: () => void;
}

interface SlipFormItem {
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  current_stock?: number;
  vat_percentage?: number;
}

interface SlipExpense {
  name: string;
  amount: number;
  note?: string;
}

interface SlipForm {
  code: string;
  order_id: string;
  warehouse_id: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  contract_code?: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_contact?: string;
  supplier_email?: string;
  supplier_address?: string;
  supplier_addressInfo?: any;
  notes: string;
  items: SlipFormItem[];
  expenses: SlipExpense[];
}

export const SlipCreatingDialog: React.FC<SlipCreatingDialogProps> = ({
  open,
  onOpenChange,
  slipType,
  orderId,
  onSlipCreated
}) => {
  const isImport = slipType === 'import';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [order, setOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedOrderForAllocation, setSelectedOrderForAllocation] = useState<Order | null>(null);
  const [allocatedQuantityByProduct, setAllocatedQuantityByProduct] = useState<Record<string, number>>({});

  const generateSlipCode = () => {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const prefix = isImport ? 'IMP' : 'EXP';
    return `${prefix}${timestamp}${random}`;
  };

  const [form, setForm] = useState<SlipForm>({
    code: '',
    order_id: orderId || '',
    warehouse_id: '',
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    contract_code: '',
    supplier_id: '',
    supplier_name: '',
    supplier_contact: '',
    supplier_email: '',
    supplier_address: '',
    notes: '',
    items: [],
    expenses: [{ name: 'Chi phí vận chuyển', amount: 0, note: '' }]
  });

  // Load initial data
  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open, slipType]);

  // Load order if orderId is provided
  useEffect(() => {
    if (orderId && open) {
      loadOrder(orderId);
    }
  }, [orderId, open]);

  const loadInitialData = async () => {
    setInitialLoading(true);
    try {
      // Filter orders by type based on slipType: import -> purchase, export -> sale
      const orderType = isImport ? 'purchase' : 'sale';
      const [ordersRes, productsRes, warehousesRes, customersRes, suppliersRes] = await Promise.all([
        orderApi.getOrders({ limit: 1000, type: orderType }),
        productApi.getProducts({ limit: 1000 }),
        warehouseApi.getWarehouses(),
        customerApi.getCustomers({ limit: 1000 }),
        supplierApi.getSuppliers({ limit: 1000 })
      ]);

      setOrders(ordersRes.orders || []);
      setProducts(productsRes.products || []);
      setWarehouses(warehousesRes.warehouses || []);
      setCustomers(customersRes.customers || []);
      setSuppliers(suppliersRes.suppliers || []);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadOrder = async (id: string) => {
    try {
      const orderData = await orderApi.getOrder(id, { includeDeleted: true });
      setOrder(orderData);
      
      // For import orders (purchase), populate supplier fields
      // For export orders (sale), populate customer fields
      if (isImport) {
        setForm(prev => ({
          ...prev,
          order_id: id,
          supplier_id: orderData.customer_id || '',
          supplier_name: orderData.customer?.name || orderData.customer_name || '',
          supplier_contact: orderData.customer?.phone || orderData.customer_phone || '',
          supplier_email: orderData.customer?.email || orderData.customer_email || '',
          supplier_address: orderData.customer?.address || orderData.customer_address || ''
        }));
      } else {
        setForm(prev => ({
          ...prev,
          order_id: id,
          customer_id: orderData.customer_id || '',
          customer_name: orderData.customer?.name || orderData.customer_name || '',
          customer_phone: orderData.customer?.phone || orderData.customer_phone || '',
          customer_email: orderData.customer?.email || orderData.customer_email || '',
          contract_code: orderData.contract_code || ''
        }));
      }

      // Load allocated quantities
      await loadAllocatedQuantities(id);
    } catch (error) {
      console.error('Error loading order:', error);
    }
  };

  const loadAllocatedQuantities = async (id: string) => {
    try {
      if (isImport) {
        const response = await warehouseReceiptsApi.getReceipts({
          orderId: id,
          type: 'import',
          limit: 100
        });

        const quantities: Record<string, number> = {};
        response.receipts.forEach(receipt => {
          if (receipt.items) {
            receipt.items.forEach(item => {
              quantities[item.product_id] = (quantities[item.product_id] || 0) + item.quantity;
            });
          }
        });
        setAllocatedQuantityByProduct(quantities);
      } else {
        const response = await warehouseReceiptsApi.getReceipts({ limit: 1000, orderId: id, type: 'export,purchase_return_note' });

        const quantities: Record<string, number> = {};
        response.receipts.forEach(slip => {
          if (slip.status === 'cancelled') return;
          if (slip.export_slip_items) {
            slip.export_slip_items.forEach(item => {
              if (item.product_id) {
                quantities[item.product_id] = (quantities[item.product_id] || 0) + (item.requested_quantity || 0);
              }
            });
          }
        });
        setAllocatedQuantityByProduct(quantities);
      }
    } catch (error) {
      console.error('Error loading allocated quantities:', error);
    }
  };

  const handleOrderChange = async (value: string) => {
    if (!value) {
      setOrder(null);
      setAllocatedQuantityByProduct({});
      setForm(prev => ({
        ...prev,
        order_id: '',
        customer_id: '',
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        contract_code: '',
        items: []
      }));
      setSelectedOrderForAllocation(null);
      return;
    }

    const selectedOrder = orders.find(o => o.id === value);
    if (selectedOrder) {
      await loadOrder(value);
      setSelectedOrderForAllocation(selectedOrder);
    }
  };

  const handleCustomerChange = (value: string) => {
    const customer = customers.find(c => c.id === value);
    setForm(prev => ({
      ...prev,
      customer_id: customer.id || '',
      customer_name: customer?.name || '',
      customer_phone: customer?.phoneNumber || '',
      customer_email: customer?.email || '',
    }));
  };

  const handleSupplierChange = (value: string) => {
    const supplier = suppliers.find(s => s.id === value);
    setForm(prev => ({
      ...prev,
      supplier_id: supplier.id || '',
      supplier_name: supplier?.name || '',
      supplier_contact: supplier?.contact_phone || '',
      supplier_email: supplier?.email || '',
      supplier_address: supplier?.address || '',
    }));
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, {
        product_id: '',
        product_code: '',
        product_name: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        vat_percentage: 10
      }]
    }));
  };

  const removeItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: keyof SlipFormItem, value: any) => {
    setForm(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };

      // Auto-fill product info
      if (field === 'product_id' && value) {
        const product = products.find(p => p.id === value);
        if (product) {
          items[index].product_code = product.code;
          items[index].product_name = product.name;
          items[index].unit_price = product.price || product.costPrice || 0;
          items[index].vat_percentage = 10;
        }
        // Fetch stock level when product changes
        if (value && selectedWarehouse) {
          fetchStockLevel(index, value, selectedWarehouse);
        }
      }

      // Calculate total price with VAT
      if (field === 'quantity' || field === 'unit_price' || field === 'vat_percentage' || field === 'product_id') {
        const vatSubtotal = items[index].quantity * (items[index].unit_price * (items[index].vat_percentage / 100));
        items[index].total_price = (items[index].quantity * items[index].unit_price) + vatSubtotal;
      }

      return { ...prev, items };
    });
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
      setForm(prev => {
        const items = [...prev.items];
        items[index].current_stock = currentStock;
        return { ...prev, items };
      });
    } catch (error) {
      setForm(prev => {
        const items = [...prev.items];
        items[index].current_stock = 0;
        return { ...prev, items };
      });
    }
  };

  const addExpense = () => {
    setForm(prev => ({
      ...prev,
      expenses: [...prev.expenses, { name: '', amount: 0, note: '' }]
    }));
  };

  const removeExpense = (index: number) => {
    setForm(prev => ({
      ...prev,
      expenses: prev.expenses.filter((_, i) => i !== index)
    }));
  };

  const updateExpense = (index: number, field: 'name' | 'amount' | 'note', value: any) => {
    setForm(prev => {
      const expenses = [...prev.expenses];
      expenses[index] = { ...expenses[index], [field]: value };
      return { ...prev, expenses };
    });
  };

  const getAvailableProducts = () => {
    if (selectedOrderForAllocation && selectedOrderForAllocation.items && selectedOrderForAllocation.items.length > 0) {
      const orderProductIds = selectedOrderForAllocation.items.map(item => item.product_id);
      return products.filter(p => orderProductIds.includes(p.id));
    }
    return products;
  };

  const getAvailableProductsForRow = (currentIndex: number) => {
    const selectedProductIds = form.items
      .map((item, index) => index !== currentIndex ? item.product_id : null)
      .filter(id => id);

    if (form.order_id && selectedOrderForAllocation && selectedOrderForAllocation.items) {
      const orderProductIds = selectedOrderForAllocation.items.map(item => item.product_id);
      return products.filter(product =>
        orderProductIds.includes(product.id) && !selectedProductIds.includes(product.id)
      );
    }

    return products.filter(product => !selectedProductIds.includes(product.id));
  };

  const calculateTotals = () => {
    const itemsSubtotal = form.items.reduce((sum, item) => sum + item.total_price, 0);
    const expensesTotal = form.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const subtotal = itemsSubtotal + expensesTotal;
    return { subtotal };
  };

  const handleSubmit = async () => {
    // Validation
    if (!form.notes || !form.notes.trim()) {
      toast({
        title: 'Lỗi',
        description: isImport ? 'Vui lòng nhập mô tả cho phiếu nhập kho' : 'Vui lòng nhập mô tả cho phiếu xuất kho',
        variant: 'destructive'
      });
      return;
    }

    if (form.items.length === 0) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng thêm ít nhất một sản phẩm',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedWarehouse) {
      toast({
        title: 'Lỗi',
        description: isImport ? 'Vui lòng chọn kho nhập' : 'Vui lòng chọn kho xuất',
        variant: 'destructive'
      });
      return;
    }

    const invalidItems = form.items.filter(item =>
      !item.product_id || !item.product_name || !item.product_code || !item.quantity
    );

    if (invalidItems.length > 0) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền đầy đủ thông tin sản phẩm',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Only include code if user entered it, otherwise let backend generate
      const request: any = {
        warehouseId: selectedWarehouse,
        description: form.notes,
        details: form.items.map(item => ({
          productId: item.product_id,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          vatPercentage: item.vat_percentage
        })),
      };

      // Add optional fields only if provided
      const code = form.code?.trim();
      if (code) {
        request.code = code;
      }
      if (form.order_id) {
        request.orderId = form.order_id;
      }

      if (isImport) {
        request.supplierId = form.supplier_id || undefined;
        request.type = 'import';

        await warehouseReceiptsApi.createReceipt(request);
        toast({
          title: 'Thành công',
          description: 'Tạo phiếu nhập kho thành công'
        });
      } else {
        // Export slip request
        request.type = 'export';
        request.status = 'pending';

        await warehouseReceiptsApi.createReceipt(request);
        toast({
          title: 'Thành công',
          description: 'Tạo phiếu xuất kho thành công'
        });
      }

      onSlipCreated?.();
      handleClose();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.response?.data?.message || error.message || 'Không thể tạo phiếu',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({
      code: '',
      order_id: orderId || '',
      warehouse_id: '',
      customer_id: '',
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      contract_code: '',
      supplier_id: '',
      supplier_name: '',
      supplier_contact: '',
      supplier_email: '',
      supplier_address: '',
      notes: '',
      items: [],
      expenses: [{ name: 'Chi phí vận chuyển', amount: 0, note: '' }]
    });
    setOrder(null);
    setSelectedOrderForAllocation(null);
    setSelectedWarehouse('');
    setAllocatedQuantityByProduct({});
    onOpenChange(false);
  };

  if (initialLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-8">
            <Loader className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2">Đang tải...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isImport ? 'Tạo phiếu nhập kho mới' : 'Tạo phiếu xuất kho mới'}
          </DialogTitle>
          <DialogDescription>
            {isImport ? 'Nhập thông tin chi tiết cho phiếu nhập kho mới' : 'Nhập thông tin chi tiết cho phiếu xuất kho mới'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Slip Code */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isImport ? 'Mã phiếu nhập kho' : 'Mã phiếu xuất kho'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={form.code}
                onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value }))}
                placeholder={isImport ? 'Nhập mã phiếu nhập kho (3-20 ký tự)' : 'Nhập mã phiếu xuất kho (3-20 ký tự)'}
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Mã phiếu phải từ 3-20 ký tự
              </p>
            </CardContent>
          </Card>

          {/* Order Selection (Optional) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Cung cấp</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    navigate('/orders');
                  }}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Tạo đơn hàng
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="order-select">Chọn đơn hàng</Label>
                  {form.order_id && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setForm(prev => ({
                          ...prev,
                          order_id: '',
                          customer_id: '',
                          customer_name: '',
                          customer_phone: '',
                          customer_email: '',
                          contract_code: '',
                          items: []
                        }));
                        setSelectedOrderForAllocation(null);
                        setAllocatedQuantityByProduct({});
                        setOrder(null);
                      }}
                      className="h-6 px-2 text-xs"
                    >
                      Xóa lựa chọn
                    </Button>
                  )}
                </div>
                <Combobox
                  options={[
                    { label: 'Chọn đơn hàng (tùy chọn)', value: '' },
                    ...orders.map((order) => ({
                      label: `${order.order_number} - ${order.customer_name || 'Không xác định'}`,
                      value: order.id
                    }))
                  ]}
                  value={form.order_id}
                  onValueChange={handleOrderChange}
                  placeholder="Chọn đơn hàng..."
                  searchPlaceholder="Tìm đơn hàng..."
                  emptyMessage="Không có đơn hàng nào"
                />
              </div>

              {(
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="contract_code">Mã hợp đồng</Label>
                    <Input
                      id="contract_code"
                      value={form.contract_code || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, contract_code: e.target.value }))}
                      placeholder="Nhập mã hợp đồng"
                    />
                  </div>
                  {isImport ? (
                    <div>
                        <Label htmlFor="supplier_id">Nhà cung cấp <span className="text-red-500">*</span></Label>
                        <Combobox
                        options={[
                            { label: 'Chọn nhà cung cấp', value: '' },
                            ...suppliers.map((supplier) => ({
                            label: `${supplier.name}`,
                            value: supplier.id
                            }))
                        ]}
                        value={form.supplier_id || ''}
                        onValueChange={handleSupplierChange}
                        placeholder="Chọn nhà cung cấp"
                        searchPlaceholder="Tìm nhà cung cấp..."
                        emptyMessage="Không có nhà cung cấp nào"
                        />
                    </div>
                    )
                    : 
                    (
                    <div>
                        <Label htmlFor="customer_id">Khách hàng</Label>
                        <Combobox
                        options={[
                            { label: 'Chọn khách hàng', value: '' },
                            ...customers.map((customer) => ({
                            label: `${customer.name} (${customer.customer_code})`,
                            value: customer.id
                            }))
                        ]}
                        value={form.customer_id || ''}
                        onValueChange={handleCustomerChange}
                        placeholder="Chọn khách hàng"
                        searchPlaceholder="Tìm khách hàng..."
                        emptyMessage="Không có khách hàng nào"
                        />
                    </div>
                    )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="customer_name">
                    {isImport ? 'Tên nhà cung cấp' : 'Tên khách hàng'}
                  </Label>
                  <Input
                    id="customer_name"
                    value={isImport ? (form.supplier_name || '') : (form.customer_name || '')}
                    onChange={(e) => setForm(prev => (isImport ? { ...prev, supplier_name: e.target.value } : { ...prev, customer_name: e.target.value }))}
                    placeholder={isImport ? 'Nhập tên nhà cung cấp' : 'Nhập tên khách hàng'}
                  />
                </div>
                <div>
                  <Label htmlFor="customer_phone">Số điện thoại / Liên hệ</Label>
                  <Input
                    id="customer_phone"
                    value={isImport ? (form.supplier_contact || '') : (form.customer_phone || '')}
                    onChange={(e) => setForm(prev => (isImport ? { ...prev, supplier_contact: e.target.value } : { ...prev, customer_phone: e.target.value }))}
                    placeholder="Nhập số điện thoại"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="customer_email">Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={isImport ? (form.supplier_email || '') : (form.customer_email || '')}
                    onChange={(e) => setForm(prev => (isImport ? { ...prev, supplier_email: e.target.value } : { ...prev, customer_email: e.target.value }))}
                    placeholder="Nhập email"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Allocation status - only show when order is selected */}
          {selectedOrderForAllocation && selectedOrderForAllocation.items && selectedOrderForAllocation.items.length > 0 && (
            <div className="p-4 sticky -top-8 z-10 bg-white -mx-6 -mt-6 mb-6 shadow-sm max-h-[220px] overflow-y-auto">
              <h4 className="font-semibold text-gray-900 mb-3">Trạng thái phân bổ</h4>
              <div>
                {selectedOrderForAllocation.items?.map(item => {
                  const allocatedQuantity = allocatedQuantityByProduct[item.product_id] || 0;
                  const remainingQuantity = item.quantity - allocatedQuantity;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between w-full bg-gray-50 p-5 rounded-md mb-2"
                    >
                      <div>
                        <div className="font-medium">
                          {item.product_code} - <b>{item.product_name}</b>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <div className="text-sm text-muted-foreground">
                          {allocatedQuantity}/{item.quantity}
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
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Warehouse Selection */}
          <Card>
            <CardHeader>
              <CardTitle>
                Kho hàng <span className="text-red-500">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Combobox
                options={[
                  { label: 'Chọn kho', value: '' },
                  ...warehouses.map((warehouse) => ({
                    label: `${warehouse.name} (${warehouse.code})`,
                    value: warehouse.id
                  }))
                ]}
                value={selectedWarehouse}
                onValueChange={(value) => setSelectedWarehouse(value as string)}
                placeholder={isImport ? 'Chọn kho nhập hàng' : 'Chọn kho xuất hàng'}
                searchPlaceholder="Tìm kho..."
                emptyMessage="Không có kho nào"
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Sản phẩm</span>
                <Button onClick={addItem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm sản phẩm
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có sản phẩm nào. Click "Thêm sản phẩm" để bắt đầu.
                </div>
              ) : (
                <Table className="border border-border/30 rounded-lg overflow-hidden">
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b-2 border-slate-200">
                      <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                        Sản phẩm <span className="text-red-500">*</span>
                      </TableHead>
                      {!isImport && (<TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                        Thuế suất
                      </TableHead>)}
                      <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                        Số lượng <span className="text-red-500">*</span>
                      </TableHead>
                      <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                        Đơn giá <span className="text-red-500">*</span>
                      </TableHead>
                      <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                        Thành tiền
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.items.map((item, index) => (
                      <TableRow
                        key={index}
                        className="border-b border-slate-100 hover:bg-slate-50/50 h-20"
                      >
                        <TableCell className="border-r border-slate-100 align-top pt-4">
                          <div className="space-y-1 flex justify-center">
                            <Combobox
                              options={getAvailableProductsForRow(index).map((product) => ({
                                label: `${product.name} (${product.code})`,
                                value: product.id
                              }))}
                              value={item.product_id}
                              onValueChange={(value) => updateItem(index, 'product_id', value)}
                              placeholder="Chọn sản phẩm"
                              searchPlaceholder="Tìm sản phẩm..."
                              emptyMessage={getAvailableProductsForRow(index).length === 0 ? 'Không còn sản phẩm nào để chọn' : 'Không có sản phẩm nào'}
                              className="w-[200px] text-center"
                            />
                          </div>
                          <div className="space-y-1 flex justify-center">
                            {item.product_id && item.current_stock !== undefined && selectedWarehouse && (
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
                                {item.quantity > item.current_stock && item.current_stock > 0 && (
                                  <span className="text-red-500 ml-1">⚠️</span>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        {!isImport && (<TableCell className="border-r border-slate-100 align-top pt-4 justify-items-center">
                          <div className="space-y-1 flex justify-center">
                            <NumberInput
                              value={item.vat_percentage ?? 0}
                              onChange={(value) => updateItem(index, 'vat_percentage', value)}
                              min={0}
                              className="w-20 text-center"
                            />
                          </div>
                        </TableCell>)}
                        <TableCell className="border-r border-slate-100 align-top pt-4">
                          <div className="space-y-1 flex justify-center">
                            <NumberInput
                              value={item.quantity}
                              onChange={(value) => updateItem(index, 'quantity', value)}
                              min={1}
                              className="w-20 text-center"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="border-r border-slate-100 align-top pt-4">
                          <div className="space-y-1 flex justify-center">
                            <CurrencyInput
                              value={item.unit_price ?? 0}
                              onChange={(value) => updateItem(index, 'unit_price', value)}
                              className="w-32 text-center"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="border-r border-slate-100 align-top pt-7 text-center">
                          {(item.total_price || 0).toLocaleString('vi-VN')} ₫
                        </TableCell>
                        <TableCell className="align-top pt-4 flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Additional Expenses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Chi phí</span>
                <Button onClick={addExpense} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm chi phí
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {form.expenses.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Chưa có chi phí nào. Nhấn <span className="font-medium">Thêm chi phí</span> để bắt đầu.
                </div>
              ) : (
                <>
                  <Table className="border border-border/30 rounded-lg overflow-hidden">
                    <TableHeader>
                      <TableRow className="bg-slate-50 border-b-2 border-slate-200">
                        <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                          Tên chi phí
                        </TableHead>
                        <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                          Số tiền
                        </TableHead>
                        <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                          Ghi chú
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.expenses.map((expense, index) => (
                        <TableRow key={index} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <TableCell className="border-r border-slate-100 align-top pt-4">
                            <Input
                              value={expense.name}
                              onChange={(e) => updateExpense(index, 'name', e.target.value)}
                              placeholder="Ví dụ: Phí vận chuyển"
                            />
                          </TableCell>
                          <TableCell className="border-r border-slate-100 align-top pt-4 flex justify-center">
                            <CurrencyInput
                              value={expense.amount}
                              onChange={(value) => updateExpense(index, 'amount', value)}
                              className="w-32 text-center"
                            />
                          </TableCell>
                          <TableCell className="border-r border-slate-100 align-top pt-4">
                            <Input
                              value={expense.note || ''}
                              onChange={(e) => updateExpense(index, 'note', e.target.value)}
                              placeholder="Ghi chú (không bắt buộc)"
                            />
                          </TableCell>
                          <TableCell className="align-top pt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeExpense(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-3 flex justify-end">
                    <div className="text-sm font-medium">
                      Tổng chi phí:{' '}
                      <span className="font-semibold text-blue-600">
                        {form.expenses
                          .reduce((sum, exp) => sum + (exp.amount || 0), 0)
                          .toLocaleString('vi-VN')}{' '}
                        ₫
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>
                Mô tả phiếu {isImport ? 'nhập kho' : 'xuất'} <span className="text-red-500">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={isImport ? 'Nhập mô tả chi tiết cho phiếu nhập kho' : 'Nhập mô tả chi tiết cho phiếu xuất kho'}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Summary */}
          {(() => {
            const { subtotal } = calculateTotals();
            return (
              <Card>
                <CardHeader>
                  <CardTitle>Tổng kết</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Tổng tiền:</span>
                    <span>{subtotal.toLocaleString('vi-VN')} ₫</span>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Hủy
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Đang tạo...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {isImport ? 'Tạo phiếu nhập kho' : 'Tạo phiếu xuất kho'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
