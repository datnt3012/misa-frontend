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
import { 
  Trash2, Plus, ShoppingCart, ShoppingBag, X, Check, 
  Building2, User, Package, MapPin, Calculator, FileText,
  CreditCard, Wallet, AlertCircle, History, Edit2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { orderApi } from "@/api/order.api";
import { productApi } from "@/api/product.api";
import { customerApi, Customer } from "@/api/customer.api";
import { supplierApi, Supplier } from "@/api/supplier.api";
import { warehouseApi } from "@/api/warehouse.api";
import { getErrorMessage } from "@/lib/error-utils";
import { formatCurrency } from "../../utils/formatters";
import { 
  ORDER_STATUSES, 
  ORDER_STATUS_LABELS_VI, 
  PURCHASE_ORDER_STATUSES, 
  PURCHASE_ORDER_STATUS_LABELS_VI,
  getOrderStatusConfig 
} from "@/constants/order-status.constants";
import { AddressFormSeparate } from "@/components/common/AddressFormSeparate";
import BankSelector from "@/components/orders/BankSelector";

interface OrderEditFormProps {
  orderId: string;
  onOrderUpdated: () => void;
  onCancel: () => void;
}

export const OrderEditForm: React.FC<OrderEditFormProps> = ({ orderId, onOrderUpdated, onCancel }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [shippingAddressVersion, setShippingAddressVersion] = useState(0);

  useEffect(() => {
    loadData();
  }, [orderId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [orderRes, customersRes, suppliersRes, productsRes, warehousesRes] = await Promise.all([
        orderApi.getOrder(orderId),
        customerApi.getCustomers({ page: 1, limit: 1000 }),
        supplierApi.getSuppliers({ page: 1, limit: 1000 }),
        productApi.getProducts({ page: 1, limit: 1000 }),
        warehouseApi.getWarehouses({ page: 1, limit: 1000 })
      ]);
      
      const mappedOrder = {
        ...orderRes,
        items: orderRes.items.map((it: any) => ({
          ...it,
          id: it.id || `item-${Math.random()}`,
        })),
        expenses: orderRes.expenses || []
      };
      
      setOrder(mappedOrder);
      setCustomers(customersRes.customers || []);
      setSuppliers(suppliersRes.suppliers || []);
      setProducts(productsRes.products || []);
      setWarehouses(warehousesRes.warehouses || []);
      setShippingAddressVersion(v => v + 1);
    } catch (error) {
      toast({ title: "Lỗi", description: getErrorMessage(error, "Không thể tải dữ liệu"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setOrder((prev: any) => ({
      ...prev,
      items: [...prev.items, {
        id: `item-${Date.now()}`,
        product_id: "",
        product_code: "",
        product_name: "",
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        vat_percentage: 0
      }]
    }));
  };

  const removeItem = (idx: number) => {
    setOrder((prev: any) => ({
      ...prev,
      items: prev.items.filter((_: any, i: number) => i !== idx)
    }));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setOrder((prev: any) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      if (field === 'product_id') {
        const p = products.find(prod => prod.id === value);
        if (p) {
          items[idx].product_code = p.code;
          items[idx].product_name = p.name;
          items[idx].unit_price = p.price;
          items[idx].manufacturer = p.manufacturer;
        }
      }
      items[idx].total_price = items[idx].quantity * items[idx].unit_price;
      return { ...prev, items };
    });
  };

  const calculateTotals = () => {
    if (!order) return { subtotal: 0, totalVat: 0, expensesTotal: 0, grandTotal: 0, debt: 0 };
    const subtotal = order.items.reduce((sum: number, it: any) => sum + it.total_price, 0);
    const totalVat = order.items.reduce((sum: number, it: any) => sum + (it.total_price * (it.vat_percentage / 100)), 0);
    const expensesTotal = order.expenses.reduce((sum: number, exp: any) => sum + (Number(exp.amount) || 0), 0);
    const grandTotal = subtotal + totalVat + expensesTotal;
    const paidAmount = order.totalPaidAmount || 0;
    const debt = Math.max(0, grandTotal - paidAmount);
    return { subtotal, totalVat, expensesTotal, grandTotal, debt };
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const { grandTotal } = calculateTotals();
      await orderApi.updateOrder(orderId, {
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        customer_email: order.customer_email,
        taxCode: order.taxCode,
        companyName: order.companyName,
        companyAddress: order.companyAddress,
        contract_code: order.contract_code,
        purchase_order_number: order.purchase_order_number,
        receiver_name: order.receiverName,
        receiver_phone: order.receiverPhone,
        receiver_address: order.receiverAddress,
        note: order.notes || order.note,
        status: typeof order.status === 'object' ? order.status?.code : order.status,
        paymentDeadline: order.paymentDeadline,
        details: order.items.map((it: any) => ({
          productId: it.product_id || it.productId,
          quantity: it.quantity,
          unitPrice: it.unit_price || it.unitPrice,
          vatPercentage: it.vat_percentage ?? it.vatPercentage ?? 0,
        })),
        expenses: order.expenses.map((e: any) => ({ name: e.name, amount: e.amount }))
      });
      toast({ title: "Thành công", description: "Đã cập nhật đơn hàng" });
      onOrderUpdated();
    } catch (error) {
      toast({ title: "Lỗi", description: getErrorMessage(error, "Cập nhật thất bại"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const { subtotal, totalVat, expensesTotal, grandTotal, debt } = calculateTotals();
  const isPurchase = order.type === 'purchase';

  return (
    <div className="animate-in fade-in duration-500 pb-20 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          
          {/* Partner & Company Info */}
          <Card className="shadow-premium border-none">
            <CardHeader className="pb-3 border-b flex flex-row items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm font-bold uppercase tracking-tight text-slate-500">
                {isPurchase ? 'Thông tin nhà cung cấp' : 'Thông tin khách hàng'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Tên đối tác</Label>
                    <Input value={order.customer_name} onChange={e => setOrder((p:any)=>({...p, customer_name: e.target.value}))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Số điện thoại</Label>
                    <Input value={order.customer_phone} onChange={e => setOrder((p:any)=>({...p, customer_phone: e.target.value}))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Email</Label>
                    <Input value={order.customer_email} onChange={e => setOrder((p:any)=>({...p, customer_email: e.target.value}))} />
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Mã số thuế</Label>
                    <Input value={order.taxCode} onChange={e => setOrder((p:any)=>({...p, taxCode: e.target.value}))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Tên công ty (VAT)</Label>
                    <Input value={order.companyName} onChange={e => setOrder((p:any)=>({...p, companyName: e.target.value}))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Địa chỉ công ty</Label>
                    <Input value={order.companyAddress} onChange={e => setOrder((p:any)=>({...p, companyAddress: e.target.value}))} />
                  </div>
               </div>
            </CardContent>
          </Card>

          {/* Shipping Info */}
          {!isPurchase && (
            <Card className="shadow-premium border-none">
              <CardHeader className="pb-3 border-b flex flex-row items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600" />
                <CardTitle className="text-sm font-bold uppercase tracking-tight text-slate-500">Vận chuyển</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <Label className="text-xs font-bold text-slate-500 uppercase">Người nhận</Label>
                   <Input value={order.receiverName} onChange={e => setOrder((p:any)=>({...p, receiverName: e.target.value}))} />
                 </div>
                 <div className="space-y-2">
                   <Label className="text-xs font-bold text-slate-500 uppercase">SĐT người nhận</Label>
                   <Input value={order.receiverPhone} onChange={e => setOrder((p:any)=>({...p, receiverPhone: e.target.value}))} />
                 </div>
                 <div className="md:col-span-2 space-y-2">
                   <Label className="text-xs font-bold text-slate-500 uppercase">Địa chỉ giao hàng</Label>
                   <Input value={order.receiverAddress} onChange={e => setOrder((p:any)=>({...p, receiverAddress: e.target.value}))} />
                 </div>
              </CardContent>
            </Card>
          )}

          {/* Product List */}
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
                   {order.items.map((item: any, idx: number) => (
                     <TableRow key={item.id} className="group">
                        <TableCell className="text-center text-slate-400">{idx + 1}</TableCell>
                        <TableCell>
                           <Combobox
                             options={products.map(p => ({ label: `[${p.code}] ${p.name}`, value: p.id }))}
                             value={item.product_id || item.productId}
                             onValueChange={v => updateItem(idx, 'product_id', Array.isArray(v) ? v[0] : v)}
                             className="border-none shadow-none p-0 h-auto font-medium"
                           />
                           <div className="text-[10px] text-slate-400 mt-1">{item.manufacturer || item.product?.manufacturer}</div>
                        </TableCell>
                        <TableCell>
                           <NumberInput value={item.quantity} onChange={v => updateItem(idx, 'quantity', v)} className="h-8 text-center" />
                        </TableCell>
                        <TableCell>
                           <CurrencyInput value={item.unit_price || item.unitPrice} onChange={v => updateItem(idx, 'unit_price', v)} className="h-8 text-right border-none" />
                        </TableCell>
                        <TableCell>
                           <NumberInput value={item.vat_percentage ?? item.vatPercentage ?? 0} onChange={v => updateItem(idx, 'vat_percentage', v)} className="h-8 text-center" />
                        </TableCell>
                        <TableCell className="text-right pr-6 font-bold">
                           {formatCurrency(item.total_price * (1 + ((item.vat_percentage ?? 0)/100)))}
                        </TableCell>
                        <TableCell>
                           <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="w-3.5 h-3.5" />
                           </Button>
                        </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="sticky top-4 shadow-xl border-none overflow-hidden">
             <div className="h-1 bg-amber-500" />
             <CardHeader className="p-4 pb-2">
               <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Điều chỉnh đơn hàng</CardTitle>
             </CardHeader>
             <CardContent className="p-4 pt-0 space-y-6">
                <div className="space-y-1">
                   <div className="text-xs text-slate-500 font-medium">Tổng giá trị hiện tại</div>
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
                   <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Chi phí khác:</span>
                      <span className="font-bold">{formatCurrency(expensesTotal)}</span>
                   </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                   <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Còn nợ</div>
                   <div className="text-2xl font-bold text-red-600">{formatCurrency(debt)}</div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400">Trạng thái đơn hàng</Label>
                      <Select value={typeof order.status === 'object' ? order.status?.code : order.status} onValueChange={v => setOrder((p:any)=>({...p, status: v}))}>
                        <SelectTrigger className="h-10 font-bold border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(isPurchase ? PURCHASE_ORDER_STATUSES : ORDER_STATUSES).map(s => (
                            <SelectItem key={s} value={s}>
                              {(isPurchase ? PURCHASE_ORDER_STATUS_LABELS_VI : ORDER_STATUS_LABELS_VI)[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-2">
                   <Button onClick={handleSubmit} disabled={saving} className="w-full h-11 bg-slate-900 text-white font-bold hover:scale-[1.02] transition-transform">
                      {saving ? "Đang lưu..." : "Cập nhật đơn hàng"}
                   </Button>
                   <Button variant="outline" onClick={onCancel} disabled={saving} className="w-full h-11 border-slate-200">
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
                   <Input value={order.contract_code} onChange={e => setOrder((p:any)=>({...p, contract_code: e.target.value}))} className="h-8 text-[11px]" />
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-bold uppercase">Số PO</Label>
                   <Input value={order.purchase_order_number} onChange={e => setOrder((p:any)=>({...p, purchase_order_number: e.target.value}))} className="h-8 text-[11px]" />
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-bold uppercase">Hạn thanh toán</Label>
                   <Input type="date" value={order.paymentDeadline ? new Date(order.paymentDeadline).toISOString().split('T')[0] : ''} onChange={e => setOrder((p:any)=>({...p, paymentDeadline: e.target.value}))} className="h-8 text-[11px]" />
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-bold uppercase">Ghi chú</Label>
                   <Textarea placeholder="..." value={order.notes || order.note} onChange={e => setOrder((p:any)=>({...p, note: e.target.value}))} className="min-h-[80px] text-[11px]" />
                </div>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
