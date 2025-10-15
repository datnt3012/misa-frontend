import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus } from "lucide-react";
// // import { supabase } from "@/integrations/supabase/client"; // Removed - using API instead // Removed - using API instead
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { customerApi } from "@/api/customer.api";
import { productApi } from "@/api/product.api";
import { warehouseApi } from "@/api/warehouse.api";
import { orderApi } from "@/api/order.api";
import { getErrorMessage } from "@/lib/error-utils";
import { AddressFormSeparate } from "@/components/common/AddressFormSeparate";

interface CreateOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated: () => void;
}

interface OrderItem {
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  vat_rate: number;
  vat_amount: number;
  warehouse_id: string;
}

const CreateOrderForm: React.FC<CreateOrderFormProps> = ({ open, onOpenChange, onOrderCreated }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  
  const [newOrder, setNewOrder] = useState({
    customer_id: "",
    customer_name: "",
    customer_code: "",
    customer_phone: "",
    // Removed customer address fields from UI; will derive from selected customer
    order_type: "sale",
    notes: "",
    contract_number: "",
    purchase_order_number: "",
    
    // VAT Information (for invoice)
    vat_tax_code: "",
    vat_company_name: "",
    vat_company_address: "",
    vat_company_phone: "",
    vat_company_addressInfo: {
      provinceCode: "",
      districtCode: "",
      wardCode: ""
    },
    vat_invoice_email: "",
    
    // Shipping Information (auto-fill from selected customer)
    shipping_recipient_name: "",
    shipping_recipient_phone: "",
    shipping_address: "",
    shipping_addressInfo: {
      provinceCode: "",
      districtCode: "",
      wardCode: ""
    },
    
    initial_payment: 0,
    initial_payment_method: "cash",
    initial_payment_bank: "",
    items: [] as OrderItem[]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [customersRes, productsRes, warehousesRes] = await Promise.all([
        customerApi.getCustomers({ page: 1, limit: 1000 }),
        productApi.getProducts({ page: 1, limit: 1000 }),
        warehouseApi.getWarehouses({ page: 1, limit: 1000 })
      ]);

      setCustomers(customersRes.customers || []);
      setProducts(productsRes.products || []);
      setWarehouses(warehousesRes.warehouses || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể tải dữ liệu",
        variant: "destructive",
      });
    }
  };

  const addItem = () => {
    setNewOrder(prev => ({
      ...prev,
      items: [...prev.items, {
        product_id: "",
        product_code: "",
        product_name: "",
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        vat_rate: 0,
        vat_amount: 0,
        warehouse_id: warehouses.length === 1 ? warehouses[0].id : ""
      }]
    }));
  };

  const removeItem = (index: number) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    setNewOrder(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      
      // Auto-calculate when product, quantity, or unit_price changes
      if (field === 'product_id' || field === 'quantity' || field === 'unit_price') {
        if (field === 'product_id') {
          const product = products.find(p => p.id === value);
          if (product) {
            items[index].product_code = product.code;
            items[index].product_name = product.name;
            items[index].unit_price = product.price;
            
            // Auto-fill warehouse if only one warehouse available
            if (warehouses.length === 1 && !items[index].warehouse_id) {
              items[index].warehouse_id = warehouses[0].id;
            }
          }
        }
        
        const subtotal = items[index].quantity * items[index].unit_price;
        items[index].total_price = subtotal;
      }
      
      return { ...prev, items };
    });
  };

  const calculateTotals = () => {
    const subtotal = newOrder.items.reduce((sum, item) => sum + item.total_price, 0);
    const total = subtotal;
    const debt = total - (newOrder.initial_payment || 0);
    
    return { subtotal, total, debt };
  };

  const handleSubmit = async () => {
    if (!newOrder.customer_id) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn khách hàng",
        variant: "destructive",
      });
      return;
    }

    if (!newOrder.customer_name) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên khách hàng",
        variant: "destructive",
      });
      return;
    }

    if (newOrder.items.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng thêm ít nhất một sản phẩm",
        variant: "destructive",
      });
      return;
    }

    // Validate all items have required fields
    const invalidItems = newOrder.items.filter(item => 
      !item.product_id || !item.product_name || !item.product_code || 
      !item.quantity || !item.unit_price || !item.warehouse_id
    );
    if (invalidItems.length > 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin sản phẩm và chọn kho",
        variant: "destructive",
      });
      return;
    }

    const { total } = calculateTotals();
    if (total < 0) {
      toast({
        title: "Lỗi",
        description: "Tổng tiền không được âm",
        variant: "destructive",
      });
      return;
    }

    const paymentMethod = newOrder.initial_payment_method || "cash";
    if (paymentMethod.length < 1 || paymentMethod.length > 20) {
      toast({
        title: "Lỗi",
        description: "Phương thức thanh toán phải có độ dài từ 1-20 ký tự",
        variant: "destructive",
      });
      return;
    }

    // Validate warehouse selection for items
    if (newOrder.items.some(item => !item.warehouse_id)) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn kho cho tất cả sản phẩm",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { subtotal, total } = calculateTotals();
      const paidAmount = newOrder.initial_payment || 0;

      // Create order via backend API
      const orderData = await orderApi.createOrder({
        customerId: newOrder.customer_id || "",
        paymentMethod: newOrder.initial_payment_method || "cash",
        status: 'pending',
        totalAmount: total,
        // Remove unsupported fields per backend API
        details: newOrder.items.map(it => ({
          productId: it.product_id,
          quantity: it.quantity,
          unitPrice: it.unit_price,
          warehouseId: it.warehouse_id,
        })),
      });

      // Items are included in order payload; adjust if BE requires separate calls

      // TODO: initial payment can be handled via payments API if available


      // Get order code from response
      const orderCode = orderData.order_number || 
                       orderData.orderNumber || 
                       orderData.code || 
                       orderData.number || 
                       orderData.id || 
                       'thành công';

      toast({
        title: "Thành công",
        description: `Đã tạo đơn hàng ${orderCode}`,
      });

      onOrderCreated();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể tạo đơn hàng"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, total, debt } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo đơn hàng mới</DialogTitle>
          <DialogDescription>
            Nhập thông tin chi tiết cho đơn hàng mới
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin khách hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer">Khách hàng</Label>
                  <Select 
                    value={newOrder.customer_id} 
                    onValueChange={(value) => {
                      const customer = customers.find(c => c.id === value);
                      setNewOrder(prev => ({
                        ...prev,
                        customer_id: value,
                        customer_name: customer?.name || "",
                        customer_code: customer?.customer_code || "",
                        customer_phone: customer?.phoneNumber || "",
                        // do NOT auto-fill VAT company fields from customer
                        // shipping auto-fill from customer
                        shipping_recipient_name: customer?.name || "",
                        shipping_recipient_phone: customer?.phoneNumber || "",
                        shipping_address: customer?.address || prev.shipping_address || "",
                        shipping_addressInfo: {
                          provinceCode: customer?.addressInfo?.provinceCode || customer?.addressInfo?.province?.code || "",
                          districtCode: customer?.addressInfo?.districtCode || customer?.addressInfo?.district?.code || "",
                          wardCode: customer?.addressInfo?.wardCode || customer?.addressInfo?.ward?.code || "",
                        }
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn khách hàng hoặc nhập mới" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} ({customer.customer_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="customer_name">Tên khách hàng *</Label>
                  <Input
                    id="customer_name"
                    value={newOrder.customer_name}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, customer_name: e.target.value }))}
                    placeholder="Nhập tên khách hàng"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_phone">Số điện thoại</Label>
                  <Input
                    id="customer_phone"
                    value={newOrder.customer_phone}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, customer_phone: e.target.value }))}
                    placeholder="Nhập số điện thoại"
                  />
                </div>
              {/* Removed customer address input. Shipping address will auto-fill from selected customer. */}
              </div>
            </CardContent>
          </Card>

          {/* VAT Information */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin VAT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vat_tax_code">Mã số thuế</Label>
                  <Input
                    id="vat_tax_code"
                    value={newOrder.vat_tax_code}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, vat_tax_code: e.target.value }))}
                    placeholder="Nhập mã số thuế"
                  />
                </div>
                <div>
                  <Label htmlFor="vat_invoice_email">Email nhận hóa đơn VAT</Label>
                  <Input
                    id="vat_invoice_email"
                    type="email"
                    value={newOrder.vat_invoice_email}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, vat_invoice_email: e.target.value }))}
                    placeholder="email@domain.com"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="vat_company_name">Tên công ty</Label>
                <Input
                  id="vat_company_name"
                  value={newOrder.vat_company_name}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, vat_company_name: e.target.value }))}
                  placeholder="Nhập tên công ty"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Điện thoại công ty</Label>
                  <Input
                    value={newOrder.vat_company_phone}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, vat_company_phone: e.target.value }))}
                    placeholder="Nhập số điện thoại công ty"
                  />
                </div>
                <div>
                  <Label>Địa chỉ công ty</Label>
                  <Input
                    value={newOrder.vat_company_address}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, vat_company_address: e.target.value }))}
                    placeholder="Nhập địa chỉ công ty"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Information */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin vận chuyển</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shipping_recipient_name">Người nhận hàng</Label>
                  <Input
                    id="shipping_recipient_name"
                    value={newOrder.shipping_recipient_name}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, shipping_recipient_name: e.target.value }))}
                    placeholder="Nhập tên người nhận"
                  />
                </div>
                <div>
                  <Label htmlFor="shipping_recipient_phone">Số điện thoại</Label>
                  <Input
                    id="shipping_recipient_phone"
                    value={newOrder.shipping_recipient_phone}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, shipping_recipient_phone: e.target.value }))}
                    placeholder="Nhập số điện thoại"
                  />
                </div>
              </div>
              <div>
                <Label>Địa chỉ nhận hàng</Label>
                <AddressFormSeparate
                  key={`${newOrder.shipping_addressInfo?.provinceCode || ''}-${newOrder.shipping_addressInfo?.districtCode || ''}-${newOrder.shipping_addressInfo?.wardCode || ''}-${newOrder.shipping_address || ''}`}
                  value={{
                    address: newOrder.shipping_address,
                    provinceCode: newOrder.shipping_addressInfo?.provinceCode,
                    districtCode: newOrder.shipping_addressInfo?.districtCode,
                    wardCode: newOrder.shipping_addressInfo?.wardCode
                  }}
                  onChange={(data) => {
                    setNewOrder(prev => ({
                      ...prev,
                      shipping_address: data.address,
                      shipping_addressInfo: {
                        provinceCode: data.provinceCode,
                        districtCode: data.districtCode,
                        wardCode: data.wardCode
                      }
                    }));
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
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
            <CardContent>
              <Table className="border border-border/30 rounded-lg overflow-hidden">
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b-2 border-slate-200">
                    <TableHead className="border-r border-slate-200 font-semibold text-slate-700">Sản phẩm</TableHead>
                    <TableHead className="border-r border-slate-200 font-semibold text-slate-700">Kho</TableHead>
                    <TableHead className="border-r border-slate-200 font-semibold text-slate-700">SL</TableHead>
                    <TableHead className="border-r border-slate-200 font-semibold text-slate-700">Đơn giá</TableHead>
                    <TableHead className="border-r border-slate-200 font-semibold text-slate-700">Thành tiền</TableHead>
                    <TableHead className="font-semibold text-slate-700"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newOrder.items.map((item, index) => (
                    <TableRow key={index} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <TableCell className="border-r border-slate-100">
                        <Select 
                          value={item.product_id} 
                          onValueChange={(value) => updateItem(index, 'product_id', value)}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Chọn sản phẩm" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} ({product.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="border-r border-slate-100">
                        <Select 
                          value={item.warehouse_id} 
                          onValueChange={(value) => updateItem(index, 'warehouse_id', value)}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Chọn kho" />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.map((warehouse) => (
                              <SelectItem key={warehouse.id} value={warehouse.id}>
                                {warehouse.name} ({warehouse.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="border-r border-slate-100">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell className="border-r border-slate-100">
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell className="border-r border-slate-100">
                        {item.total_price.toLocaleString('vi-VN')}đ
                      </TableCell>
                      <TableCell>
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
            </CardContent>
          </Card>

          {/* Payment & Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Thanh toán và Tổng kết</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="initial_payment">Thanh toán ban đầu</Label>
                  <Input
                    id="initial_payment"
                    type="number"
                    value={newOrder.initial_payment}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, initial_payment: Number(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="initial_payment_method">Phương thức thanh toán</Label>
                  <Select 
                    value={newOrder.initial_payment_method} 
                    onValueChange={(value) => setNewOrder(prev => ({ ...prev, initial_payment_method: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn phương thức" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Tiền mặt</SelectItem>
                      <SelectItem value="bank_transfer">Chuyển khoản</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newOrder.initial_payment_method === "bank_transfer" && (
                  <div>
                    <Label htmlFor="initial_payment_bank">Ngân hàng</Label>
                    <Select 
                      value={newOrder.initial_payment_bank} 
                      onValueChange={(value) => setNewOrder(prev => ({ ...prev, initial_payment_bank: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn ngân hàng" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vietcombank">Vietcombank</SelectItem>
                        <SelectItem value="techcombank">Techcombank</SelectItem>
                        <SelectItem value="bidv">BIDV</SelectItem>
                        <SelectItem value="agribank">Agribank</SelectItem>
                        <SelectItem value="mbbank">MB Bank</SelectItem>
                        <SelectItem value="vpbank">VPBank</SelectItem>
                        <SelectItem value="acb">ACB</SelectItem>
                        <SelectItem value="sacombank">Sacombank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="notes">Ghi chú</Label>
                <Textarea
                  id="notes"
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Nhập ghi chú"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
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

export default CreateOrderForm;

