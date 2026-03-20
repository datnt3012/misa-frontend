import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trash2, Plus, ShoppingCart, ShoppingBag, X, Check,
  Building2, User, Package, MapPin, Calculator, FileText,
  CreditCard, Wallet, AlertCircle, History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { customerApi, VatInfo, Customer } from "@/api/customer.api";
import { Supplier, supplierApi } from "@/api/supplier.api";
import { productApi } from "@/api/product.api";
import { warehouseApi } from "@/api/warehouse.api";
import { orderApi } from "@/api/order.api";
import { getErrorMessage } from "@/lib/error-utils";
import { AddressFormSeparate } from "@/components/common/AddressFormSeparate";
import BankSelector from "@/components/orders/BankSelector";
import { formatCurrency } from "../../utils/formatters";

interface OrderCreateFormProps {
  onOrderCreated: () => void;
  onCancel: () => void;
}

interface OrderItem {
  id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  manufacturer?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  vat_percentage: number;
  vat_total_price: number;
  vat_amount: number;
  warehouse_id: string;
}

interface OrderFormState {
  customer_id: string;
  customer_name: string;
  customer_code: string;
  customer_phone: string;
  customer_email: string;
  order_type: string;
  notes: string;
  contract_code: string;
  purchase_order_number: string;
  vat_tax_code: string;
  vat_company_name: string;
  vat_company_address: string;
  vat_company_phone: string;
  vat_invoice_email: string;
  shipping_recipient_name: string;
  shipping_recipient_phone: string;
  shipping_address: string;
  shipping_addressInfo: {
    provinceCode: string;
    districtCode: string;
    wardCode: string;
    provinceName?: string;
    districtName?: string;
    wardName?: string;
  };
  initial_payment: number;
  initial_payment_method: string;
  initial_payment_bank: string;
  order_warehouse_id: string;
  items: OrderItem[];
  expenses: Array<{ name: string; amount: number; note?: string }>;
  paymentDeadline: string;
}

const sanitizeVatField = (value?: string | null) => {
  if (value === undefined || value === null) return undefined;
  const trimmed = typeof value === "string" ? value.trim() : String(value);
  return trimmed.length ? trimmed : undefined;
};

const extractVatInfoFromOrder = (order: OrderFormState): VatInfo | undefined => {
  const vatInfo: VatInfo = {
    taxCode: sanitizeVatField(order.vat_tax_code),
    companyName: sanitizeVatField(order.vat_company_name),
    companyAddress: sanitizeVatField(order.vat_company_address),
    vatEmail: sanitizeVatField(order.vat_invoice_email),
    companyPhone: sanitizeVatField(order.vat_company_phone),
  };
  return Object.values(vatInfo).some(Boolean) ? vatInfo : undefined;
};

const buildVatInfoFromCustomer = (customer?: Customer) => ({
  vat_tax_code: customer?.vatInfo?.taxCode ?? "",
  vat_company_name: customer?.vatInfo?.companyName ?? "",
  vat_company_address: customer?.vatInfo?.companyAddress ?? "",
  vat_company_phone: customer?.vatInfo?.companyPhone ?? "",
  vat_invoice_email: customer?.vatInfo?.vatEmail ?? "",
});

const buildShippingInfoFromCustomer = (customer?: Customer) => ({
  shipping_recipient_name: customer?.name ?? "",
  shipping_recipient_phone: customer?.phoneNumber ?? "",
  shipping_address: customer?.address ?? "",
  shipping_addressInfo: {
    provinceCode: String(customer?.addressInfo?.provinceCode ?? customer?.addressInfo?.province?.code ?? "") || "",
    districtCode: customer?.addressInfo?.districtCode ?? customer?.addressInfo?.district?.code ?? "",
    wardCode: String(customer?.addressInfo?.wardCode ?? customer?.addressInfo?.ward?.code ?? "") || "",
    provinceName: customer?.addressInfo?.provinceName ?? customer?.addressInfo?.province?.name ?? "",
    districtName: customer?.addressInfo?.districtName ?? customer?.addressInfo?.district?.name ?? "",
    wardName: customer?.addressInfo?.wardName ?? customer?.addressInfo?.ward?.name ?? "",
  },
});

const createInitialOrderState = (): OrderFormState => ({
  customer_id: "__new__",
  customer_name: "",
  customer_code: "",
  customer_phone: "",
  customer_email: "",
  order_type: "sale",
  notes: "",
  contract_code: "",
  purchase_order_number: "",
  vat_tax_code: "",
  vat_company_name: "",
  vat_company_address: "",
  vat_company_phone: "",
  vat_invoice_email: "",
  shipping_recipient_name: "",
  shipping_recipient_phone: "",
  shipping_address: "",
  shipping_addressInfo: {
    provinceCode: "",
    districtCode: "",
    wardCode: "",
    provinceName: "",
    districtName: "",
    wardName: "",
  },
  initial_payment: 0,
  initial_payment_method: "cash",
  initial_payment_bank: "",
  order_warehouse_id: "",
  items: [],
  expenses: [{ name: "Chi phí vận chuyển", amount: 0, note: "" }],
  paymentDeadline: "",
});

export const OrderCreateForm: React.FC<OrderCreateFormProps> = ({ onOrderCreated, onCancel }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [newOrder, setNewOrder] = useState<OrderFormState>(() => createInitialOrderState());
  const [orderType, setOrderType] = useState<'sale' | 'purchase'>('sale');
  const [shippingAddressVersion, setShippingAddressVersion] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [customersRes, suppliersRes, productsRes, warehousesRes] = await Promise.all([
        customerApi.getCustomers({ page: 1, limit: 1000 }),
        supplierApi.getSuppliers({ page: 1, limit: 1000 }),
        productApi.getProducts({ page: 1, limit: 1000 }),
        warehouseApi.getWarehouses({ page: 1, limit: 1000 })
      ]);
      setCustomers(customersRes.customers || []);
      setSuppliers(suppliersRes.suppliers || []);
      setProducts(productsRes.products || []);
      setWarehouses(warehousesRes.warehouses || []);
    } catch (error: any) {
      toast({ title: "Lỗi", description: "Không thể tải dữ liệu ban đầu", variant: "destructive" });
    }
  };

  const addItem = () => {
    const newItemId = `item-${Date.now()}`;
    setNewOrder(prev => ({
      ...prev,
      items: [...prev.items, {
        id: newItemId,
        product_id: "",
        product_code: "",
        product_name: "",
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        vat_percentage: 0,
        vat_total_price: 0,
        vat_amount: 0,
        warehouse_id: prev.order_warehouse_id || (warehouses.length === 1 ? warehouses[0].id : "")
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
      if (field === 'product_id' || field === 'quantity' || field === 'unit_price') {
        if (field === 'product_id') {
          const product = products.find(p => p.id === value);
          if (product) {
            items[index].product_code = product.code;
            items[index].product_name = product.name;
            items[index].unit_price = product.price;
            items[index].manufacturer = product.manufacturer;
          }
        }
        items[index].total_price = items[index].quantity * items[index].unit_price;
      }
      return { ...prev, items };
    });
  };

  const updateExpense = (index: number, field: "name" | "amount", value: any) => {
    setNewOrder(prev => {
      const expenses = [...prev.expenses];
      expenses[index] = { ...expenses[index], [field]: value };
      return { ...prev, expenses };
    });
  };

  const calculateTotals = () => {
    const itemsSubtotal = newOrder.items.reduce((sum, item) => sum + item.total_price, 0);
    const totalVat = newOrder.items.reduce((sum, item) => sum + (item.total_price * (item.vat_percentage / 100)), 0);
    const expensesTotal = newOrder.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const grandTotal = itemsSubtotal + totalVat + expensesTotal;
    const debt = grandTotal - (newOrder.initial_payment || 0);
    return { subtotal: itemsSubtotal, totalVat, expensesTotal, grandTotal, debt };
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let customerId = newOrder.customer_id;
      if (newOrder.customer_id === "__new__") {
        const customerData: any = {
          name: newOrder.customer_name.trim(),
          phoneNumber: newOrder.customer_phone?.trim() || undefined,
          email: newOrder.customer_email?.trim() || undefined,
        };
        const vatInfo = extractVatInfoFromOrder(newOrder);
        if (vatInfo) customerData.vatInfo = vatInfo;
        const newCustomer = await customerApi.createCustomer(customerData);
        customerId = newCustomer.id;
      }

      const { grandTotal } = calculateTotals();
      const orderVatInfo = extractVatInfoFromOrder(newOrder);
      await orderApi.createOrder({
        customerId,
        customerName: newOrder.customer_name,
        customerPhone: newOrder.customer_phone || undefined,
        customerEmail: newOrder.customer_email || undefined,
        contractCode: newOrder.contract_code || undefined,
        purchaseOrderNumber: newOrder.purchase_order_number || undefined,
        note: newOrder.notes || undefined,
        status: 'new',
        orderType: orderType,
        type: orderType,
        taxCode: orderVatInfo?.taxCode,
        companyName: orderVatInfo?.companyName,
        companyAddress: orderVatInfo?.companyAddress,
        vatEmail: orderVatInfo?.vatEmail,
        companyPhone: orderVatInfo?.companyPhone,
        receiverName: orderType === 'sale' ? (newOrder.shipping_recipient_name || undefined) : undefined,
        receiverPhone: orderType === 'sale' ? (newOrder.shipping_recipient_phone || undefined) : undefined,
        receiverAddress: orderType === 'sale' ? (newOrder.shipping_address || undefined) : undefined,
        paymentMethod: newOrder.initial_payment_method,
        initialPayment: newOrder.initial_payment,
        totalAmount: grandTotal,
        bank: newOrder.initial_payment_bank || undefined,
        paymentDeadline: newOrder.paymentDeadline || undefined,
        details: newOrder.items.map(it => ({
          productId: it.product_id,
          vatPercentage: it.vat_percentage || 0,
          quantity: it.quantity,
          unitPrice: it.unit_price,
        })),
        expenses: newOrder.expenses.filter(e => e.amount > 0).map(e => ({ name: e.name, amount: e.amount })),
      });

      toast({ title: "Thành công", description: "Đã tạo đơn hàng mới" });
      onOrderCreated();
    } catch (error: any) {
      toast({ title: "Lỗi", description: getErrorMessage(error, "Không thể tạo đơn hàng"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, totalVat, expensesTotal, grandTotal, debt } = calculateTotals();

  return (
    <div className="animate-in fade-in duration-500 pb-20 space-y-6">
      {/* Type Switcher */}
      <Tabs value={orderType} onValueChange={(v) => {
        setOrderType(v as any);
        setNewOrder(createInitialOrderState());
        setShippingAddressVersion(v => v + 1);
      }} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px] h-11 bg-slate-100 p-1">
          <TabsTrigger value="sale" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <ShoppingCart className="w-4 h-4 mr-2" /> Bán hàng
          </TabsTrigger>
          <TabsTrigger value="purchase" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <ShoppingBag className="w-4 h-4 mr-2" /> Mua hàng
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">

          {/* Customer Selection & Info */}
          <Card className="shadow-premium border-none">
            <CardHeader className="pb-3 border-b flex flex-row items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm font-bold uppercase tracking-tight text-slate-500">
                {orderType === 'sale' ? 'Thông tin khách hàng' : 'Thông tin nhà cung cấp'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Đối tác</Label>
                    <Combobox
                      options={[
                        { label: "+ Thêm mới đối tác", value: "__new__" },
                        ...(orderType === 'sale' ? customers : suppliers).map(c => ({
                          label: `${c.name} (${(c as any).code || ''})`,
                          value: c.id
                        }))
                      ]}
                      value={newOrder.customer_id}
                      onValueChange={(v) => {
                        const id = Array.isArray(v) ? v[0] : v;
                        if (id === "__new__") {
                          setNewOrder(createInitialOrderState());
                        } else {
                          const c = (orderType === 'sale' ? customers : suppliers).find(x => x.id === id);
                          if (c) {
                            setNewOrder(prev => ({
                              ...prev,
                              customer_id: id,
                              customer_name: c.name,
                              customer_phone: (c as any).phoneNumber || (c as any).phone || "",
                              customer_email: c.email || "",
                              ...(orderType === 'sale' ? buildVatInfoFromCustomer(c as Customer) : {}),
                              ...(orderType === 'sale' ? buildShippingInfoFromCustomer(c as Customer) : {}),
                            }));
                            setShippingAddressVersion(v => v + 1);
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Tên đầy đủ <span className="text-red-500">*</span></Label>
                    <Input placeholder="Tên khách hàng/công ty" value={newOrder.customer_name} onChange={e => setNewOrder(p => ({ ...p, customer_name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Email</Label>
                    <Input placeholder="example@gmail.com" value={newOrder.customer_email} onChange={e => setNewOrder(p => ({ ...p, customer_email: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Số điện thoại <span className="text-red-500">*</span></Label>
                    <Input placeholder="09xx xxx xxx" value={newOrder.customer_phone} onChange={e => setNewOrder(p => ({ ...p, customer_phone: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Mã số thuế</Label>
                    <Input placeholder="Mã số thuế doanh nghiệp" value={newOrder.vat_tax_code} onChange={e => setNewOrder(p => ({ ...p, vat_tax_code: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Tên công ty (VAT)</Label>
                    <Input placeholder="Tên đầy đủ trên hóa đơn" value={newOrder.vat_company_name} onChange={e => setNewOrder(p => ({ ...p, vat_company_name: e.target.value }))} />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Địa chỉ công ty</Label>
                  <Input placeholder="Địa chỉ đăng ký kinh doanh" value={newOrder.vat_company_address} onChange={e => setNewOrder(p => ({ ...p, vat_company_address: e.target.value }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Section */}
          {orderType === 'sale' && (
            <Card className="shadow-premium border-none">
              <CardHeader className="pb-3 border-b flex flex-row items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600" />
                <CardTitle className="text-sm font-bold uppercase tracking-tight text-slate-500">Vận chuyển</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Người nhận</Label>
                  <Input value={newOrder.shipping_recipient_name} onChange={e => setNewOrder(p => ({ ...p, shipping_recipient_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">SĐT người nhận</Label>
                  <Input value={newOrder.shipping_recipient_phone} onChange={e => setNewOrder(p => ({ ...p, shipping_recipient_phone: e.target.value }))} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Địa chỉ giao hàng</Label>
                  <AddressFormSeparate
                    key={shippingAddressVersion}
                    value={{
                      address: newOrder.shipping_address,
                      provinceCode: newOrder.shipping_addressInfo.provinceCode,
                      districtCode: newOrder.shipping_addressInfo.districtCode,
                      wardCode: newOrder.shipping_addressInfo.wardCode
                    }}
                    onChange={d => setNewOrder(p => ({
                      ...p,
                      shipping_address: d.address,
                      shipping_addressInfo: {
                        provinceCode: d.provinceCode || "",
                        districtCode: d.districtCode || "",
                        wardCode: d.wardCode || "",
                      }
                    }))}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Product Items */}
          <Card className="shadow-premium border-none overflow-hidden">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-tight text-slate-500 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" /> Sản phẩm
              </CardTitle>
              <Button onClick={addItem} size="sm" variant="outline" className="h-8 border-dashed">
                <Plus className="w-3 h-3 mr-1" /> Thêm dòng
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead>Tên SP</TableHead>
                    <TableHead className="w-24 text-center">SL</TableHead>
                    <TableHead className="w-32 text-right">Giá</TableHead>
                    <TableHead className="w-24 text-center">VAT%</TableHead>
                    <TableHead className="w-32 text-right pr-6">Thành tiền</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newOrder.items.map((item, idx) => (
                    <TableRow key={item.id} className="group">
                      <TableCell className="text-center text-slate-400">{idx + 1}</TableCell>
                      <TableCell>
                        <Combobox
                          options={products.map(p => ({ label: `[${p.code}] ${p.name}`, value: p.id }))}
                          value={item.product_id}
                          onValueChange={v => updateItem(idx, 'product_id', Array.isArray(v) ? v[0] : v)}
                          className="border-none shadow-none focus-visible:ring-0 p-0 h-auto font-medium"
                        />
                        {item.manufacturer && <div className="text-[10px] text-slate-400 mt-1">{item.manufacturer}</div>}
                      </TableCell>
                      <TableCell>
                        <NumberInput value={item.quantity} onChange={v => updateItem(idx, 'quantity', v)} className="h-8 text-center" />
                      </TableCell>
                      <TableCell>
                        <CurrencyInput value={item.unit_price} onChange={v => updateItem(idx, 'unit_price', v)} className="h-8 text-right border-none shadow-none" />
                      </TableCell>
                      <TableCell>
                        <NumberInput value={item.vat_percentage} onChange={v => updateItem(idx, 'vat_percentage', v)} className="h-8 text-center" />
                      </TableCell>
                      <TableCell className="text-right pr-6 font-bold">
                        {formatCurrency(item.total_price * (1 + (item.vat_percentage / 100)))}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {newOrder.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-slate-400 italic">Chưa có sản phẩm nào</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="sticky top-4 shadow-xl border-none overflow-hidden">
            <div className="h-1 bg-blue-600" />
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tổng kết đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-6">
              <div className="space-y-1">
                <div className="text-xs text-slate-500 font-medium">Tổng giá trị đơn hàng</div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(grandTotal)}</div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Tiền hàng:</span>
                  <span className="font-bold">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Thuế (VAT):</span>
                  <span className="font-bold">{formatCurrency(totalVat)}</span>
                </div>

                {/* Expenses Input */}
                <div className="space-y-2 py-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Chi phí thêm</Label>
                    <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setNewOrder(p => ({ ...p, expenses: [...p.expenses, { name: "", amount: 0 }] }))}>
                      <Plus className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {newOrder.expenses.map((exp, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input placeholder="Tên" value={exp.name} onChange={e => updateExpense(i, 'name', e.target.value)} className="h-7 text-[10px] px-2" />
                        <CurrencyInput value={exp.amount} onChange={v => updateExpense(i, 'amount', v)} className="h-7 text-[10px] w-24 text-right px-2" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100 bg-blue-50/30 p-4 -mx-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-blue-600">Thanh toán trước</Label>
                  <CurrencyInput value={newOrder.initial_payment} onChange={v => setNewOrder(p => ({ ...p, initial_payment: v }))} className="h-10 text-lg font-bold bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={newOrder.initial_payment_method} onValueChange={v => setNewOrder(p => ({ ...p, initial_payment_method: v }))}>
                    <SelectTrigger className="h-8 text-[11px] font-medium bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Tiền mặt</SelectItem>
                      <SelectItem value="bank_transfer">Chuyển khoản</SelectItem>
                    </SelectContent>
                  </Select>
                  {newOrder.initial_payment_method === 'bank_transfer' && (
                    <BankSelector value={newOrder.initial_payment_bank} onValueChange={v => setNewOrder(p => ({ ...p, initial_payment_bank: v }))} />
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Còn nợ</div>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(debt)}</div>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2">
                <Button onClick={handleSubmit} disabled={loading} className="w-full h-11 bg-slate-900 text-white font-bold hover:scale-[1.02] transition-transform">
                  {loading ? "Đang xử lý..." : "Xác nhận tạo đơn"}
                </Button>
                <Button variant="outline" onClick={onCancel} disabled={loading} className="w-full h-11 border-slate-200">
                  Hủy bỏ
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-premium border-none">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Thông tin bổ sung</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Mã hợp đồng</Label>
                <Input value={newOrder.contract_code} onChange={e => setNewOrder(p => ({ ...p, contract_code: e.target.value }))} className="h-8 text-[11px]" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Số PO</Label>
                <Input value={newOrder.purchase_order_number} onChange={e => setNewOrder(p => ({ ...p, purchase_order_number: e.target.value }))} className="h-8 text-[11px]" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Hạn thanh toán</Label>
                <Input type="date" value={newOrder.paymentDeadline} onChange={e => setNewOrder(p => ({ ...p, paymentDeadline: e.target.value }))} className="h-8 text-[11px]" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Ghi chú</Label>
                <Textarea placeholder="..." value={newOrder.notes} onChange={e => setNewOrder(p => ({ ...p, notes: e.target.value }))} className="min-h-[80px] text-[11px]" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
