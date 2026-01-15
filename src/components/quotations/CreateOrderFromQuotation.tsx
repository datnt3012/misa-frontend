import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { quotationApi, Quotation } from "@/api/quotation.api";
import { orderApi } from "@/api/order.api";
import { warehouseApi } from "@/api/warehouse.api";
import { customerApi, type Customer } from "@/api/customer.api";
import { getErrorMessage } from "@/lib/error-utils";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import AddressFormSeparate from "../common/AddressFormSeparate";
import { Trash2, Plus } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";


interface CreateOrderFromQuotationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: Quotation | null;
  onOrderCreated?: () => void;
}

interface OrderFormState {
  vat_tax_code: string;
  vat_invoice_email: string;
  vat_company_name: string;
  vat_company_phone: string;
  vat_company_address: string;
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
  totalAmount: number;
  details: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
  expenses: {
    name: string;
    amount: number;
    note?: string;
  }[];
  notes: string;
}

// Helper functions to build VAT and shipping info from customer
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
    provinceCode:
      customer?.addressInfo?.provinceCode ?? customer?.addressInfo?.province?.code ?? "",
    districtCode:
      customer?.addressInfo?.districtCode ?? customer?.addressInfo?.district?.code ?? "",
    wardCode:
      customer?.addressInfo?.wardCode ?? customer?.addressInfo?.ward?.code ?? "",
    provinceName:
      customer?.addressInfo?.provinceName ?? customer?.addressInfo?.province?.name ?? "",
    districtName:
      customer?.addressInfo?.districtName ?? customer?.addressInfo?.district?.name ?? "",
    wardName:
      customer?.addressInfo?.wardName ?? customer?.addressInfo?.ward?.name ?? "",
  },
});

const CreateOrderFromQuotation: React.FC<CreateOrderFromQuotationProps> = ({
  open,
  onOpenChange,
  quotation,
  onOrderCreated
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const vatCardRef = useRef<HTMLDivElement>(null);
  const shippingCardRef = useRef<HTMLDivElement>(null);
  const productsCardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<Array<{
    product_id: string;
    product_name: string;
    product_code: string;
    quantity: number;
    unit_price: number;
    warehouse_id: string;
  }>>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [initialPayment, setInitialPayment] = useState(0);
  const [notes, setNotes] = useState("");
  const [orderData, setOrderData] = useState<OrderFormState>({
    vat_tax_code: "",
    vat_invoice_email: "",
    vat_company_name: "",
    vat_company_phone: "",
    vat_company_address: "",
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
    totalAmount: 0,
    details: [],
    expenses: [],
    notes: "",
  });
  const [shippingAddressVersion, setShippingAddressVersion] = useState(0);
  const [customer, setCustomer] = useState<Customer | null>(null);

  // Load customer information when quotation changes
  useEffect(() => {
    const loadCustomer = async () => {
      if (quotation?.customer_id) {
        try {
          // Fetch full customer data from API to get VAT and address info
          const customerData = await customerApi.getCustomer(quotation.customer_id);
          setCustomer(customerData);
          
          // Auto-fill VAT and shipping info from customer
          const vatInfo = buildVatInfoFromCustomer(customerData);
          const shippingInfo = buildShippingInfoFromCustomer(customerData);
          
          setOrderData(prev => ({
            ...prev,
            ...vatInfo,
            ...shippingInfo,
          }));
          
          // Update shipping address version to trigger AddressFormSeparate re-render
          setShippingAddressVersion((v) => v + 1);
        } catch (error) {
          console.error("Failed to load customer:", error);
          // Don't show error toast, just silently fail
        }
      }
    };
    
    if (open && quotation) {
      loadCustomer();
    }
  }, [open, quotation?.customer_id]);

  useEffect(() => {
    if (open && quotation) {
      loadWarehouses();
      // Initialize order items from quotation details
      if (quotation.details && quotation.details.length > 0) {
        setOrderItems(
          quotation.details.map(detail => ({
            product_id: detail.product_id,
            product_name: detail.product_name || "",
            product_code: detail.product_code || "",
            quantity: detail.quantity,
            unit_price: detail.price,
            warehouse_id: warehouses.length === 1 ? warehouses[0].id : ""
          }))
        );
      }
      setNotes(quotation.note || "");
    }
  }, [open, quotation]);
  const loadWarehouses = async () => {
    try {
      const warehousesRes = await warehouseApi.getWarehouses({ page: 1, limit: 1000 });
      setWarehouses(warehousesRes.warehouses || []);
      // Auto-select warehouse if only one available
      if (warehousesRes.warehouses?.length === 1 && orderItems.length > 0) {
        setOrderItems(prev => prev.map(item => ({
          ...item,
          warehouse_id: warehousesRes.warehouses[0].id
        })));
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể tải danh sách kho"),
        variant: "destructive",
      });
    }
  };
  const updateItemWarehouse = (index: number, warehouseId: string) => {
    setOrderItems(prev => {
      const items = [...prev];
      items[index].warehouse_id = warehouseId;
      return items;
    });
  };
  const calculateTotalAmount = () => {
    return orderItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };
  const addExpense = () => {
    setOrderData(prev => ({
      ...prev,
      expenses: [...prev.expenses, { name: "", amount: 0, note: "" }]
    }));
  };
  const removeExpense = (index: number) => {
    setOrderData(prev => ({
      ...prev,
      expenses: prev.expenses.filter((_, i) => i !== index)
    }));
  };
  const updateExpense = (index: number, field: "name" | "amount" | "note", value: any) => {
    setOrderData(prev => {
      const expenses = [...prev.expenses];
      expenses[index] = { ...expenses[index], [field]: value };
      return { ...prev, expenses };
    });
  };
  const handleSubmit = async () => {
    if (!quotation) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy báo giá",
        variant: "destructive",
      });
      return;
    }
    if (orderItems.length === 0) {
      toast({
        title: "Lỗi",
        description: "Không có sản phẩm để tạo đơn hàng",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      const totalAmount = calculateTotalAmount();
      const expensesTotal = orderData.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const finalTotalAmount = totalAmount + expensesTotal;
      
      const orderRequest = {
        customerId: quotation.customer_id,
        customerName: quotation.customer_name,
        customerPhone: quotation.customer_phone,
        contractCode: quotation.contract_code,
        note: notes || `Tạo từ báo giá ${quotation.code}`,
        status: 'new',
        orderType: 'sale',
        paymentMethod: paymentMethod,
        initialPayment: initialPayment || 0,
        totalAmount: finalTotalAmount,
        // VAT Information
        taxCode: orderData.vat_tax_code || undefined,
        companyName: orderData.vat_company_name || undefined,
        companyAddress: orderData.vat_company_address || undefined,
        vatEmail: orderData.vat_invoice_email || undefined,
        companyPhone: orderData.vat_company_phone || undefined,
        // Shipping Information
        receiverName: orderData.shipping_recipient_name || undefined,
        receiverPhone: orderData.shipping_recipient_phone || undefined,
        receiverAddress: orderData.shipping_address || undefined,
        addressInfo: orderData.shipping_addressInfo?.provinceCode ? {
          provinceCode: orderData.shipping_addressInfo.provinceCode || undefined,
          districtCode: orderData.shipping_addressInfo.districtCode || undefined,
          wardCode: orderData.shipping_addressInfo.wardCode || undefined,
        } : undefined,
        // Order details
        details: orderItems.map(item => ({
          productId: item.product_id,
          warehouseId: item.warehouse_id,
          quantity: item.quantity,
          unitPrice: item.unit_price
        })),
        // Expenses
        expenses: orderData.expenses.length > 0 ? orderData.expenses.filter(exp => exp.name && exp.amount > 0) : undefined,
        sourceQuotationId: quotation.id || undefined,
      };
      const createdOrder = await orderApi.createOrder(orderRequest);
      toast({
        title: "Thành công",
        description: `Đã tạo đơn hàng ${createdOrder.order_number} từ báo giá ${quotation.code}`,
      });
      onOrderCreated?.();
      onOpenChange(false);
      // Navigate to orders page
      navigate('/orders');
    } catch (error) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể tạo đơn hàng từ báo giá"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  if (!quotation) return null;
  const totalAmount = calculateTotalAmount();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        {/* Sticky Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle>Tạo đơn hàng từ báo giá</DialogTitle>
            <DialogDescription>
              Tạo đơn hàng từ báo giá {quotation.code} - Khách hàng: {quotation.customer_name}
            </DialogDescription>
          </DialogHeader>
        </div>
        
        {/* Sticky Quotation Info */}
        <div className="flex-shrink-0 px-6 py-4 border-b bg-muted">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Mã báo giá</Label>
              <div className="font-medium">{quotation.code}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Mã hợp đồng</Label>
              <div className="font-medium">{quotation.contract_code}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Khách hàng</Label>
              <div className="font-medium">{quotation.customer_name}</div>
            </div>
          </div>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
          {/* VAT Info */}
          <Card ref={vatCardRef}>
            <CardHeader>
              <CardTitle>Thông tin VAT</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vat_tax_code">Mã số thuế</Label>
                  <Input
                    id="vat_tax_code"
                    value={orderData.vat_tax_code}
                    onChange={(e) => setOrderData(prev => ({ ...prev, vat_tax_code: e.target.value }))}
                    placeholder="Nhập mã số thuế"
                  />
                </div>
                <div>
                  <Label htmlFor="vat_invoice_email">Email nhận hóa đơn VAT</Label>
                  <Input
                    id="vat_invoice_email"
                    type="email"
                    value={orderData.vat_invoice_email}
                    onChange={(e) => setOrderData(prev => ({ ...prev, vat_invoice_email: e.target.value }))}
                    placeholder="email@domain.com"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="vat_company_name">Tên công ty</Label>
                <Input
                  id="vat_company_name"
                  value={orderData.vat_company_name}
                  onChange={(e) => setOrderData(prev => ({ ...prev, vat_company_name: e.target.value }))}
                  placeholder="Nhập tên công ty"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Điện thoại công ty</Label>
                  <Input
                    value={orderData.vat_company_phone}
                    onChange={(e) => setOrderData(prev => ({ ...prev, vat_company_phone: e.target.value }))}
                    placeholder="Nhập số điện thoại công ty"
                  />
                </div>
                <div>
                  <Label>Địa chỉ công ty</Label>
                  <Input
                    value={orderData.vat_company_address}
                    onChange={(e) => setOrderData(prev => ({ ...prev, vat_company_address: e.target.value }))}
                    placeholder="Nhập địa chỉ công ty"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Shipping Info */}
          <Card ref={shippingCardRef}>
            <CardHeader>
              <CardTitle>Thông tin vận chuyển</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shipping_recipient_name">Người nhận hàng</Label>
                  <Input
                    id="shipping_recipient_name"
                    value={orderData.shipping_recipient_name}
                    onChange={(e) => setOrderData(prev => ({ ...prev, shipping_recipient_name: e.target.value }))}
                    placeholder="Nhập tên người nhận"
                  />
                </div>
                <div>
                  <Label htmlFor="shipping_recipient_phone">Số điện thoại</Label>
                  <Input
                    id="shipping_recipient_phone"
                    value={orderData.shipping_recipient_phone}
                    onChange={(e) => setOrderData(prev => ({ ...prev, shipping_recipient_phone: e.target.value }))}
                    placeholder="Nhập số điện thoại"
                  />
                </div>
              </div>
              <div>
                <Label>Địa chỉ nhận hàng</Label>
                <AddressFormSeparate
                  key={shippingAddressVersion}
                  value={{
                    address: orderData.shipping_address,
                    provinceCode: orderData.shipping_addressInfo?.provinceCode,
                    districtCode: orderData.shipping_addressInfo?.districtCode,
                    wardCode: orderData.shipping_addressInfo?.wardCode,
                    provinceName: orderData.shipping_addressInfo?.provinceName,
                    districtName: orderData.shipping_addressInfo?.districtName,
                    wardName: orderData.shipping_addressInfo?.wardName,
                  }}
                  onChange={(data) => {
                    setOrderData(prev => ({
                      ...prev,
                      shipping_address: data.address,
                      shipping_addressInfo: {
                        provinceCode: data.provinceCode || "",
                        districtCode: data.districtCode || "",
                        wardCode: data.wardCode || "",
                        provinceName: data.provinceName || "",
                        districtName: data.districtName || "",
                        wardName: data.wardName || "",
                      }
                    }));
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card ref={productsCardRef}>
            <CardHeader>
              <CardTitle>Chi tiết sản phẩm</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead>Số lượng</TableHead>
                        <TableHead>Đơn Giá</TableHead>
                        <TableHead>Thành tiền</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.product_name}</div>
                              <div className="text-xs text-muted-foreground">{item.product_code}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-center">
                            {new Intl.NumberFormat('vi-VN').format(item.unit_price)}
                          </TableCell>
                          <TableCell className="text-center">
                            {new Intl.NumberFormat('vi-VN').format(item.unit_price * item.quantity)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end">
                  <div className="text-lg font-semibold">
                    Tổng tiền: {new Intl.NumberFormat('vi-VN').format(totalAmount)}
                  </div>
                </div>
              </div>
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
              {orderData.expenses.length === 0 ? (
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
                      {orderData.expenses.map((expense, index) => (
                        <TableRow key={index} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <TableCell className="border-r border-slate-100 align-top pt-4">
                            <Input
                              value={expense.name}
                              onChange={(e) => updateExpense(index, "name", e.target.value)}
                              placeholder="Ví dụ: Phí vận chuyển"
                            />
                          </TableCell>
                          <TableCell className="border-r border-slate-100 align-top pt-4">
                            <CurrencyInput
                              value={expense.amount}
                              onChange={(value) => updateExpense(index, "amount", value)}
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell className="border-r border-slate-100 align-top pt-4">
                            <Input
                              value={expense.note || ""}
                              onChange={(e) => updateExpense(index, "note", e.target.value)}
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
                      Tổng chi phí:{" "}
                      <span className="font-semibold text-blue-600">
                        {orderData.expenses
                          .reduce((sum, exp) => sum + (exp.amount || 0), 0)
                          .toLocaleString("vi-VN")}{" "}
                        đ
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú cho đơn hàng"
              rows={3}
            />
          </div>
          </div>
        </div>
        
        {/* Sticky Actions */}
        <div className="flex-shrink-0 px-6 py-4 border-t bg-background">
          <div className="flex justify-end gap-2">
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
export default CreateOrderFromQuotation;
