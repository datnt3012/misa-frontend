import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { customerApi, VatInfo, Customer } from "@/api/customer.api";
import { productApi } from "@/api/product.api";
import { warehouseApi } from "@/api/warehouse.api";
import { orderApi } from "@/api/order.api";
import { stockLevelsApi } from "@/api/stockLevels.api";
import { getErrorMessage } from "@/lib/error-utils";
import { AddressFormSeparate } from "@/components/common/AddressFormSeparate";
import BankSelector from "./BankSelector";
import { LoadingWrapper } from "@/components/LoadingWrapper";
interface CreateOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated: () => void;
}
interface OrderItem {
  id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  vat_rate: number;
  vat_amount: number;
  warehouse_id: string;
  current_stock?: number;
}
interface OrderFormState {
  customer_id: string;
  customer_name: string;
  customer_code: string;
  customer_phone: string;
  customer_email: string;
  order_type: string;
  notes: string;
  contract_number: string;
  purchase_order_number: string;
  vat_tax_code: string;
  vat_company_name: string;
  vat_company_address: string;
  vat_company_phone: string;
  vat_company_addressInfo: {
    provinceCode: string;
    districtCode: string;
    wardCode: string;
  };
  vat_invoice_email: string;
  vat_rate?: number;
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
const hasCustomerVatInfo = (info?: VatInfo | null) => {
  if (!info) return false;
  return Object.values(info).some((value) => Boolean(sanitizeVatField(value)));
};
const createInitialOrderState = (): OrderFormState => ({
  // Default to special value "__new__" so that a brand new customer
  // will be created if the user doesn't change the dropdown
  customer_id: "__new__",
  customer_name: "",
  customer_code: "",
  customer_phone: "",
  customer_email: "",
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
  vat_rate: undefined as number | undefined, // VAT rate (sẽ lấy từ customer nếu không có)
  // Shipping Information (auto-fill from selected customer)
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
const CreateOrderForm: React.FC<CreateOrderFormProps> = ({ open, onOpenChange, onOrderCreated }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [banks, setBanks] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [newOrder, setNewOrder] = useState<OrderFormState>(() => createInitialOrderState());
  const [shippingAddressVersion, setShippingAddressVersion] = useState(0);
  const customerCardRef = useRef<HTMLDivElement>(null);
  const vatCardRef = useRef<HTMLDivElement>(null);
  const shippingCardRef = useRef<HTMLDivElement>(null);
  const productsCardRef = useRef<HTMLDivElement>(null);
  const paymentCardRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (open) {
      setNewOrder(createInitialOrderState());
      setShippingAddressVersion((v) => v + 1);
      
      // Scroll to section based on tab param
      const tab = searchParams.get('tab');
      if (tab) {
        setTimeout(() => {
          const refs: Record<string, React.RefObject<HTMLDivElement>> = {
            customer: customerCardRef,
            vat: vatCardRef,
            shipping: shippingCardRef,
            products: productsCardRef,
            payment: paymentCardRef,
          };
          const ref = refs[tab];
          if (ref?.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    }
  }, [open, searchParams]);
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    try {
      const [customersRes, productsRes, warehousesRes, banksRes] = await Promise.all([
        customerApi.getCustomers({ page: 1, limit: 1000 }),
        productApi.getProducts({ page: 1, limit: 1000 }),
        warehouseApi.getWarehouses({ page: 1, limit: 1000 }),
        orderApi.getBanks()
      ]);
      setCustomers(customersRes.customers || []);
      setProducts(productsRes.products || []);
      setWarehouses(warehousesRes.warehouses || []);
      setBanks(banksRes || []);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể tải dữ liệu",
        variant: "destructive",
      });
    }
  };
  const handleCreateNewCustomer = async () => {
    // Validate required fields
    if (!newOrder.customer_name || !newOrder.customer_name.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên khách hàng",
        variant: "destructive",
      });
      return;
    }
    try {
      setLoading(true);
      // Build customer data from order form
      const customerData: any = {
        name: newOrder.customer_name.trim(),
        phoneNumber: newOrder.customer_phone?.trim() || undefined,
        address: newOrder.shipping_address?.trim() || undefined,
        addressInfo: newOrder.shipping_addressInfo?.provinceCode ? {
          provinceCode: newOrder.shipping_addressInfo.provinceCode || undefined,
          districtCode: newOrder.shipping_addressInfo.districtCode || undefined,
          wardCode: newOrder.shipping_addressInfo.wardCode || undefined,
        } : undefined,
      };
      // Add VAT info if available
      const vatInfo = extractVatInfoFromOrder(newOrder);
      if (vatInfo) {
        customerData.vatInfo = vatInfo;
      }
      // Create customer
      const newCustomer = await customerApi.createCustomer(customerData);
      // Reload customers list
      const customersRes = await customerApi.getCustomers({ page: 1, limit: 1000 });
      setCustomers(customersRes.customers || []);
      // Auto-select the newly created customer
      const vatInfoFromNewCustomer = buildVatInfoFromCustomer(newCustomer);
      const shippingInfoFromNewCustomer = buildShippingInfoFromCustomer(newCustomer);
      setNewOrder(prev => ({
        ...prev,
        customer_id: newCustomer.id,
        customer_name: newCustomer.name || prev.customer_name,
        customer_code: newCustomer.customer_code || "",
        customer_phone: newCustomer.phoneNumber || prev.customer_phone,
        ...vatInfoFromNewCustomer,
        ...shippingInfoFromNewCustomer,
      }));
      setShippingAddressVersion((v) => v + 1);
      toast({
        title: "Thành công",
        description: `Đã tạo khách hàng mới: ${newCustomer.name}`,
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể tạo khách hàng mới"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const addItem = () => {
    const newItemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
        vat_rate: 0,
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
      // Auto-calculate when product, quantity, or unit_price changes
      if (field === 'product_id' || field === 'quantity' || field === 'unit_price') {
        if (field === 'product_id') {
          const product = products.find(p => p.id === value);
          if (product) {
            items[index].product_code = product.code;
            items[index].product_name = product.name;
            items[index].unit_price = product.price;
            // Gắn kho theo kho của đơn nếu có
            if (prev.order_warehouse_id) {
              items[index].warehouse_id = prev.order_warehouse_id;
            } else if (!items[index].warehouse_id && warehouses.length === 1) {
              items[index].warehouse_id = warehouses[0].id;
            }
          }
        }
        const subtotal = items[index].quantity * items[index].unit_price;
        items[index].total_price = subtotal;
      }
      // Fetch stock level when product changes (kho lấy từ kho đơn hàng)
      if (field === 'product_id') {
        fetchStockLevel(index, items[index].product_id, items[index].warehouse_id);
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
      setNewOrder(prev => {
        const items = [...prev.items];
        items[index].current_stock = currentStock;
        return { ...prev, items };
      });
    } catch (error) {
      setNewOrder(prev => {
        const items = [...prev.items];
        items[index].current_stock = 0;
        return { ...prev, items };
      });
    }
  };
  const addExpense = () => {
    setNewOrder(prev => ({
      ...prev,
      expenses: [...prev.expenses, { name: "", amount: 0, note: "" }]
    }));
  };
  const removeExpense = (index: number) => {
    setNewOrder(prev => ({
      ...prev,
      expenses: prev.expenses.filter((_, i) => i !== index)
    }));
  };
  const updateExpense = (index: number, field: "name" | "amount" | "note", value: any) => {
    setNewOrder(prev => {
      const expenses = [...prev.expenses];
      expenses[index] = { ...expenses[index], [field]: value };
      return { ...prev, expenses };
    });
  };
  const calculateTotals = () => {
    const itemsSubtotal = newOrder.items.reduce((sum, item) => sum + item.total_price, 0);
    const expensesTotal = newOrder.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const subtotal = itemsSubtotal + expensesTotal;
    const debt = subtotal - (newOrder.initial_payment || 0);
    return { subtotal, debt };
  };
  const handleSubmit = async () => {
    if (!newOrder.customer_id || newOrder.customer_id === "__new__") {
      // Validate required fields for new customer
      if (!newOrder.customer_name || !newOrder.customer_name.trim()) {
        toast({
          title: "Lỗi",
          description: "Vui lòng nhập tên khách hàng",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Validate for existing customer
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
    const { subtotal } = calculateTotals();
    if (subtotal < 0) {
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
    // Validate bank selection for bank transfer
    if (paymentMethod === "bank_transfer" && !newOrder.initial_payment_bank) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ngân hàng khi thanh toán bằng chuyển khoản",
        variant: "destructive",
      });
      return;
    }
    // Validate warehouse selection for order
    if (!newOrder.order_warehouse_id) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn kho xuất hàng cho đơn",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      // If "Khách hàng mới" is selected, create the customer first
      let customerId = newOrder.customer_id;
      let selectedCustomer: Customer | undefined;
      if (newOrder.customer_id === "__new__") {
        // Create new customer from form data
        const customerData: any = {
          name: newOrder.customer_name.trim(),
          phoneNumber: newOrder.customer_phone?.trim() || undefined,
          email: newOrder.customer_email?.trim() || undefined,
          address: newOrder.shipping_address?.trim() || undefined,
          addressInfo: newOrder.shipping_addressInfo?.provinceCode ? {
            provinceCode: newOrder.shipping_addressInfo.provinceCode || undefined,
            districtCode: newOrder.shipping_addressInfo.districtCode || undefined,
            wardCode: newOrder.shipping_addressInfo.wardCode || undefined,
          } : undefined,
        };
        // Add VAT info if available
        const vatInfo = extractVatInfoFromOrder(newOrder);
        if (vatInfo) {
          customerData.vatInfo = vatInfo;
        }
        try {
          // Create customer and wait for response
          const newCustomer = await customerApi.createCustomer(customerData);
          // Validate that customer was created successfully
          if (!newCustomer || !newCustomer.id) {
            throw new Error("Không thể tạo khách hàng mới. Phản hồi từ server không hợp lệ.");
          }
          customerId = newCustomer.id;
          selectedCustomer = newCustomer;
          // Reload customers list
          const customersRes = await customerApi.getCustomers({ page: 1, limit: 1000 });
          setCustomers(customersRes.customers || []);
          toast({
            title: "Thành công",
            description: `Đã tạo khách hàng mới: ${newCustomer.name}`,
          });
        } catch (customerError: any) {
          toast({
            title: "Lỗi",
            description: getErrorMessage(customerError, "Không thể tạo khách hàng mới"),
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      } else {
        // Get existing customer details
        selectedCustomer = customers.find(c => c.id === newOrder.customer_id);
        customerId = newOrder.customer_id;
      }
      // Validate customerId before creating order
      if (!customerId || customerId === "__new__" || customerId.trim() === "") {
        toast({
          title: "Lỗi",
          description: "Không thể xác định ID khách hàng. Vui lòng thử lại.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      const { subtotal } = calculateTotals();
      // Prepare customer address info if available
      const customerAddressInfo = selectedCustomer?.addressInfo ? {
        provinceCode: selectedCustomer.addressInfo.provinceCode || selectedCustomer.addressInfo.province?.code,
        districtCode: selectedCustomer.addressInfo.districtCode || selectedCustomer.addressInfo.district?.code,
        wardCode: selectedCustomer.addressInfo.wardCode || selectedCustomer.addressInfo.ward?.code,
        postalCode: selectedCustomer.addressInfo.postalCode,
        latitude: selectedCustomer.addressInfo.latitude,
        longitude: selectedCustomer.addressInfo.longitude,
      } : undefined;
      const orderVatInfo = extractVatInfoFromOrder(newOrder);
      // Create order via backend API
      // customerId should be valid at this point (validated above)
      const orderData = await orderApi.createOrder({
        customerId: customerId,
        customerName: newOrder.customer_name || selectedCustomer?.name || "",
        customerPhone: newOrder.customer_phone || selectedCustomer?.phoneNumber || undefined,
        customerEmail: newOrder.customer_email || selectedCustomer?.email || undefined,
        customerAddress: selectedCustomer?.address || undefined,
        customerAddressInfo: customerAddressInfo,
        code: newOrder.contract_number || undefined,
        contractNumber: newOrder.contract_number || undefined,
        purchaseOrderNumber: newOrder.purchase_order_number || undefined,
        note: newOrder.notes || undefined,
        status: 'new',
        orderType: newOrder.order_type || 'sale',
        // VAT Information - removed VAT rate from UI, backend will handle
        vatRate: undefined,
        taxCode: orderVatInfo?.taxCode,
        companyName: orderVatInfo?.companyName,
        companyAddress: orderVatInfo?.companyAddress,
        vatEmail: orderVatInfo?.vatEmail,
        companyPhone: orderVatInfo?.companyPhone,
        // Receiver Information
        receiverName: newOrder.shipping_recipient_name || undefined,
        receiverPhone: newOrder.shipping_recipient_phone || undefined,
        receiverAddress: newOrder.shipping_address || undefined,
        addressInfo: (() => {
          const addrInfo = newOrder.shipping_addressInfo;
          // Send addressInfo if we have at least one valid code (not empty string)
          const hasProvinceCode = addrInfo?.provinceCode && addrInfo.provinceCode.trim() !== "";
          const hasDistrictCode = addrInfo?.districtCode && addrInfo.districtCode.trim() !== "";
          const hasWardCode = addrInfo?.wardCode && addrInfo.wardCode.trim() !== "";
          // Send addressInfo if we have any valid address codes or if we have receiverAddress
          if (hasProvinceCode || hasDistrictCode || hasWardCode || (newOrder.shipping_address && newOrder.shipping_address.trim() !== "")) {
            return {
              provinceCode: hasProvinceCode ? addrInfo.provinceCode : undefined,
              districtCode: hasDistrictCode ? addrInfo.districtCode : undefined,
              wardCode: hasWardCode ? addrInfo.wardCode : undefined
            };
          }
          return undefined;
        })(),
        // Payment
        paymentMethod: newOrder.initial_payment_method || "cash",
        initialPayment: newOrder.initial_payment || 0,
        totalAmount: subtotal,
        bank: newOrder.initial_payment_method === "bank_transfer" && newOrder.initial_payment_bank 
          ? newOrder.initial_payment_bank 
          : undefined,
        paymentDeadline: newOrder.paymentDeadline || undefined,
        // Order details
        details: newOrder.items.map(it => ({
          productId: it.product_id,
          warehouseId: it.warehouse_id,
          quantity: it.quantity,
          unitPrice: it.unit_price,
        })),
        // Additional expenses
        expenses: newOrder.expenses
          .filter(exp => (exp.name && exp.name.trim().length > 0) || exp.amount)
          .map(exp => ({
            name: exp.name.trim(),
            amount: exp.amount || 0,
            note: exp.note && exp.note.trim().length > 0 ? exp.note.trim() : undefined,
          })),
      });
      // Items are included in order payload; adjust if BE requires separate calls
      // TODO: initial payment can be handled via payments API if available
      // Get order code from response
      const orderCode = orderData.order_number || 
                       orderData.id || 
                       'thành công';
      if (
        selectedCustomer?.id &&
        orderVatInfo &&
        !hasCustomerVatInfo(selectedCustomer.vatInfo)
      ) {
        try {
          const updatedCustomer = await customerApi.updateCustomer(selectedCustomer.id, {
            vatInfo: orderVatInfo,
          });
          setCustomers((prev) =>
            prev.map((cust) =>
              cust.id === updatedCustomer.id
                ? { ...cust, vatInfo: updatedCustomer.vatInfo ?? orderVatInfo }
                : cust
            )
          );
        } catch (vatError) {
        }
      }
      toast({
        title: "Thành công",
        description: `Đã tạo đơn hàng ${orderCode}`,
      });
      setNewOrder(createInitialOrderState());
      setShippingAddressVersion((v) => v + 1);
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
  const { subtotal, debt } = calculateTotals();
  // Show loading wrapper for the entire dialog
  return (
    <LoadingWrapper
      isLoading={loading}
      error={null}
      onRetry={() => {
        loadData();
      }}
      loadingMessage="Đang tải dữ liệu tạo đơn hàng..."
    >
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
                  <Label htmlFor="customer">Khách hàng <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={[
                      { label: "+ Khách hàng mới", value: "__new__" },
                      ...customers.map(customer => ({
                        label: `${customer.name} (${customer.customer_code})`,
                        value: customer.id
                      }))
                    ]}
                    value={newOrder.customer_id}
                    onValueChange={(value) => {
                      // Handle "Create new customer" option - just set the value, don't create yet
                      if (value === "__new__") {
                        setNewOrder(prev => ({
                          ...prev,
                          customer_id: "__new__",
                        }));
                        return;
                      }
                      // Handle existing customer selection
                      const customer = customers.find(c => c.id === value);
                      const vatInfo = buildVatInfoFromCustomer(customer);
                      const shippingInfo = buildShippingInfoFromCustomer(customer);
                      setNewOrder(prev => ({
                        ...prev,
                        customer_id: value,
                        customer_name: customer?.name || "",
                        customer_code: customer?.customer_code || "",
                        customer_phone: customer?.phoneNumber || "",
                        customer_email: customer?.email || "",
                        ...vatInfo,
                        ...shippingInfo,
                      }));
                      setShippingAddressVersion((v) => v + 1);
                    }}
                    placeholder="Chọn khách hàng hoặc nhập mới"
                    searchPlaceholder="Tìm khách hàng..."
                    emptyMessage="Không có khách hàng nào"
                  />
                </div>
                <div>
                  <Label htmlFor="customer_name">Tên khách hàng <span className="text-red-500">*</span></Label>
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
                <div>
                  <Label htmlFor="customer_email">Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={newOrder.customer_email}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, customer_email: e.target.value }))}
                    placeholder="Nhập email khách hàng"
                  />
                </div>
              </div>
              {/* Removed customer address input. Shipping address will auto-fill from selected customer. */}
            </CardContent>
          </Card>
          {/* VAT Information */}
          <Card ref={vatCardRef}>
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
                  key={shippingAddressVersion}
                  value={{
                    address: newOrder.shipping_address,
                    provinceCode: newOrder.shipping_addressInfo?.provinceCode,
                    districtCode: newOrder.shipping_addressInfo?.districtCode,
                    wardCode: newOrder.shipping_addressInfo?.wardCode,
                    provinceName: newOrder.shipping_addressInfo?.provinceName,
                    districtName: newOrder.shipping_addressInfo?.districtName,
                    wardName: newOrder.shipping_addressInfo?.wardName,
                  }}
                  onChange={(data) => {
                    setNewOrder(prev => ({
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
              <CardTitle className="flex justify-between items-center">
                <span>Sản phẩm</span>
                <Button onClick={addItem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm sản phẩm
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs">
                <Label>
                  Kho xuất hàng <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  options={warehouses.map(warehouse => ({
                    label: `${warehouse.name} (${warehouse.code})`,
                    value: warehouse.id
                  }))}
                  value={newOrder.order_warehouse_id}
                  onValueChange={(value) => {
                    setNewOrder((prev) => {
                      const updatedItems = prev.items.map((it) => ({
                        ...it,
                        warehouse_id: value,
                      }));
                      // Gọi lại API tồn kho cho từng sản phẩm với kho mới
                      updatedItems.forEach((it, index) => {
                        if (it.product_id) {
                          fetchStockLevel(index, it.product_id, value);
                        }
                      });
                      return {
                        ...prev,
                        order_warehouse_id: value,
                        items: updatedItems,
                      };
                    });
                  }}
                  placeholder="Chọn kho xuất hàng"
                  searchPlaceholder="Tìm kho..."
                  emptyMessage="Không có kho nào"
                />
              </div>
              <Table className="border border-border/30 rounded-lg overflow-hidden">
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b-2 border-slate-200">
                    <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                      Sản phẩm <span className="text-red-500">*</span>
                    </TableHead>
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
                  {newOrder.items.map((item, index) => (
                    <TableRow
                      key={item.id}
                      className="border-b border-slate-100 hover:bg-slate-50/50 h-20"
                    >
                      <TableCell className="border-r border-slate-100 align-top pt-4 max-w-[300px]">
                        <Combobox
                          key={`product-select-${item.id}`}
                          options={products
                            .filter(product => {
                              // Loại bỏ sản phẩm đã được chọn trong các item khác
                              const isAlreadySelected = newOrder.items.some((otherItem, otherIndex) =>
                                otherItem.product_id === product.id && otherIndex !== index
                              );
                              return !isAlreadySelected;
                            })
                            .map(product => ({
                              label: `${product.name} (${product.code})`,
                              value: product.id
                            }))}
                          value={item.product_id}
                          onValueChange={(value) => updateItem(index, "product_id", value)}
                          placeholder="Chọn sản phẩm"
                          searchPlaceholder="Tìm sản phẩm..."
                          emptyMessage="Không có sản phẩm nào"
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell className="border-r border-slate-100 align-top pt-4">
                        <div className="space-y-1">
                          <NumberInput
                            value={item.quantity}
                            onChange={(value) => updateItem(index, "quantity", value)}
                            min={1}
                            className="w-20"
                          />
                          {item.current_stock !== undefined && (
                            <div className="text-xs">
                              <span
                                className={`${
                                  item.quantity > item.current_stock
                                    ? "text-red-600"
                                    : "text-gray-600"
                                }`}
                              >
                                Tồn kho: {item.current_stock}
                              </span>
                              {item.quantity > item.current_stock && (
                                <span className="text-red-500 ml-1">⚠️</span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="border-r border-slate-100 align-top pt-4">
                        <CurrencyInput
                          value={item.unit_price}
                          onChange={(value) => updateItem(index, "unit_price", value)}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell className="border-r border-slate-100 align-top pt-7">
                        {item.total_price.toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell className="align-top pt-4">
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
              {newOrder.expenses.length === 0 ? (
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
                      {newOrder.expenses.map((expense, index) => (
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
                        {newOrder.expenses
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
          {/* Payment & Summary */}
          <Card ref={paymentCardRef}>
            <CardHeader>
              <CardTitle>Thanh toán và Tổng kết</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="initial_payment">Thanh toán ban đầu</Label>
                  <CurrencyInput
                    id="initial_payment"
                    value={newOrder.initial_payment}
                    onChange={(value) => setNewOrder(prev => ({ ...prev, initial_payment: value }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="initial_payment_method">Phương thức thanh toán <span className="text-red-500">*</span></Label>
                  <Select value={newOrder.initial_payment_method} onValueChange={(value) => setNewOrder(prev => ({
                    ...prev,
                    initial_payment_method: value,
                    // Reset bank when payment method is not bank_transfer
                    initial_payment_bank: value === "bank_transfer" ? prev.initial_payment_bank : ""
                  }))}>
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
                    <Label htmlFor="initial_payment_bank">Ngân hàng <span className="text-red-500">*</span></Label>
                    <BankSelector
                      value={newOrder.initial_payment_bank}
                      onValueChange={(value) => setNewOrder(prev => ({ ...prev, initial_payment_bank: value }))}
                      placeholder="Chọn ngân hàng"
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="payment_deadline">Hạn thanh toán</Label>
                  <Input
                    id="payment_deadline"
                    type="date"
                    value={newOrder.paymentDeadline}
                    onChange={(e) =>
                      setNewOrder((prev) => ({ ...prev, paymentDeadline: e.target.value }))
                    }
                  />
                </div>
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
              {/* Order Summary */}
              {(() => {
                const { subtotal, debt } = calculateTotals();
                return (
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Tổng tiền:</span>
                      <span>{subtotal.toLocaleString('vi-VN')} đ</span>
                    </div>
                    {newOrder.initial_payment > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Còn nợ:</span>
                        <span className="font-medium text-orange-600">{debt.toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}
                  </div>
                );
              })()}
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
      </LoadingWrapper>
  );
};
export default CreateOrderForm;