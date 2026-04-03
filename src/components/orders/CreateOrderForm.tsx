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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, ShoppingCart, ShoppingBag, Search, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { customerApi, VatInfo, Customer } from "@/api/customer.api";
import { Supplier, supplierApi } from "@/api/supplier.api";
import { productApi } from "@/api/product.api";
import { warehouseApi } from "@/api/warehouse.api";
import { orderApi } from "@/api/order.api";
import { getErrorMessage } from "@/lib/error-utils";
import { AddressFormSeparate } from "@/components/common/AddressFormSeparate";
import BankSelector from "./BankSelector";
import { LoadingWrapper } from "@/components/LoadingWrapper";

interface CreateOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated: () => void;
  orderId?: string;
  orderData?: any;
}
interface OrderItem {
  id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  vat_percentage: number;
  vat_total_price: number;
  vat_amount: number;
  warehouse_id: string;
  serial_manage?: boolean;
  warranty_months?: number;
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
  vat_company_addressInfo: {
    provinceCode: string;
    districtCode: string;
    wardCode: string;
  };
  vat_invoice_email: string;
  vat_percentage?: number;
  vat_total_price?: number;
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
  contract_code: "",
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
  vat_percentage: undefined as number | undefined,
  vat_total_price: undefined as number | undefined,
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
const CreateOrderForm: React.FC<CreateOrderFormProps> = ({ open, onOpenChange, onOrderCreated, orderId, orderData }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [banks, setBanks] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [newOrder, setNewOrder] = useState<OrderFormState>(() => createInitialOrderState());
  const [orderType, setOrderType] = useState<'sale' | 'purchase'>('sale');
  const [shippingAddressVersion, setShippingAddressVersion] = useState(0);
  const [serialNumbers, setSerialNumbers] = useState<Record<number, string[]>>({});
  const [serialText, setSerialText] = useState<Record<number,string>>({});
  const customerCardRef = useRef<HTMLDivElement>(null);
  const vatCardRef = useRef<HTMLDivElement>(null);
  const shippingCardRef = useRef<HTMLDivElement>(null);
  const productsCardRef = useRef<HTMLDivElement>(null);
  const paymentCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      // If editing, always fetch fresh data from API when orderId is available
      if (orderId) {
        const fetchOrderDetails = async () => {
          try {
            const freshOrderData = await orderApi.getOrder(orderId);
            // Populate form with fresh order data
            populateFormWithOrderData(freshOrderData);
          } catch (error) {
            console.error('Error fetching order details:', error);
            // Fallback to orderData if API call fails
            if (orderData) {
              populateFormWithOrderData(orderData);
            }
          }
        };
        fetchOrderDetails();
      } else if (orderData) {
        // If editing with orderData but no orderId, use orderData directly
        const orderTypeValue = orderData.type || orderData.order_type || 'sale';
        setOrderType(orderTypeValue);
        
        // Map order data to form state
        const formData: OrderFormState = {
          customer_id: orderData.customer_id || orderData.customer?.id || '',
          customer_name: orderData.customer_name || orderData.customer?.name || '',
          customer_code: orderData.customer_code || orderData.customer?.code || '',
          customer_phone: orderData.customer_phone || orderData.customer?.phone || '',
          customer_email: orderData.customer_email || orderData.customer?.email || '',
          order_type: orderTypeValue,
          notes: orderData.notes || orderData.note || '',
          contract_code: orderData.contract_code || '',
          purchase_order_number: orderData.purchase_order_number || '',
          vat_tax_code: orderData.taxCode || '',
          vat_company_name: orderData.companyName || '',
          vat_company_address: orderData.companyAddress || '',
          vat_company_phone: orderData.companyPhone || '',
          vat_company_addressInfo: {
            provinceCode: '',
            districtCode: '',
            wardCode: ''
          },
          vat_invoice_email: orderData.vatEmail || '',
          vat_percentage: undefined,
          vat_total_price: undefined,
          shipping_recipient_name: orderData.receiverName || '',
          shipping_recipient_phone: orderData.receiverPhone || '',
          shipping_address: orderData.receiverAddress || '',
          shipping_addressInfo: {
            provinceCode: orderData.addressInfo?.provinceCode || '',
            districtCode: orderData.addressInfo?.districtCode || '',
            wardCode: orderData.addressInfo?.wardCode || '',
            provinceName: orderData.addressInfo?.province?.name || '',
            districtName: orderData.addressInfo?.district?.name || '',
            wardName: orderData.addressInfo?.ward?.name || '',
          },
          initial_payment: orderData.initial_payment || 0,
          initial_payment_method: orderData.payment_method || 'cash',
          initial_payment_bank: '',
          order_warehouse_id: '',
          items: (orderData.items || orderData.order_items || []).map((item: any) => ({
            id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            product_id: item.product_id || item.productId || '',
            product_code: item.product_code || item.productCode || '',
            product_name: item.product_name || item.productName || '',
            quantity: item.quantity || 1,
            unit_price: item.unit_price || item.unitPrice || 0,
            total_price: item.total_price || (item.quantity * item.unit_price) || 0,
            vat_percentage: item.vat_percentage || item.vatPercentage || 0,
            vat_total_price: item.vat_total_price || 0,
            vat_amount: item.vat_amount || 0,
            warehouse_id: '',
            serial_manage: Array.isArray(item.serials) && item.serials.length > 0,
            warranty_months: item.warranty_months ?? item.warrantyMonths ?? 
              (Array.isArray(item.serials) && item.serials.length > 0 
                ? item.serials[0]?.warrantyMonths ?? item.serials[0]?.warranty_months ?? 0
                : 0),
          })),


          expenses: (orderData.expenses || []).map((exp: any) => ({
            name: exp.name || '',
            amount: exp.amount || 0,
            note: exp.note || ''
          })),
          paymentDeadline: orderData.paymentDeadline || ''
        };
        
        setNewOrder(formData);
        setShippingAddressVersion((v) => v + 1);
        
        // Load serial numbers from order items
        const serials: Record<number, string[]> = {};
        (orderData.items || orderData.order_items || []).forEach((item: any, index: number) => {
          if (item.serials && item.serials.length > 0) {
            serials[index] = item.serials.map((s: any) => {
              if (typeof s === 'string') return s;
              if (s && typeof s === 'object' && s.serial_number) return s.serial_number;
              return String(s);
            });
          }
        });
        setSerialNumbers(serials);
        setSerialText(Object.fromEntries(Object.entries(serials).map(([k,v]) => [k, v.join(', ')])));
      } else {
        // Creating new order
        setNewOrder(createInitialOrderState());
        setOrderType('sale');
        setShippingAddressVersion((v) => v + 1);
        setSerialNumbers({});
        setSerialText({});
      }
      
      // Reset additional serial dialog state removed, no extra reset needed

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
    } else {
      setSerialNumbers({});
    }
  }, [open, searchParams, orderId, orderData]);
  useEffect(() => {
    loadData();
  }, []);

  const populateFormWithOrderData = async (orderData: any) => {
    const orderTypeValue = orderData.type || orderData.order_type || 'sale';
    setOrderType(orderTypeValue);
    
    // Map products for order items and preserve serial flag from existing data
    const itemsWithSerialRequired = (orderData.items || orderData.order_items || []).map((item: any) => {
      const productId = item.product_id || item.productId || '';
      const existingSerials = Array.isArray(item.serials) ? item.serials : [];
      return {
        id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        product_id: productId,
        product_code: item.product_code || item.productCode || '',
        product_name: item.product_name || item.productName || '',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || item.unitPrice || 0,
        total_price: item.total_price || (item.quantity * item.unit_price) || 0,
        vat_percentage: item.vat_percentage || item.vatPercentage || 0,
        vat_total_price: item.vat_total_price || 0,
        vat_amount: item.vat_amount || 0,
        warehouse_id: '',
        warranty_months: item.warranty_months ?? item.warrantyMonths ?? (existingSerials.length > 0 ? existingSerials[0]?.warrantyMonths ?? existingSerials[0]?.warranty_months ?? 0 : 0),
        serial_manage: existingSerials.length > 0,
      };
    });
    
    // Map order data to form state
    const formData: OrderFormState = {
      customer_id: orderData.customer_id || orderData.customer?.id || '',
      customer_name: orderData.customer_name || orderData.customer?.name || '',
      customer_code: orderData.customer_code || orderData.customer?.code || '',
      customer_phone: orderData.customer_phone || orderData.customer?.phone || '',
      customer_email: orderData.customer_email || orderData.customer?.email || '',
      order_type: orderTypeValue,
      notes: orderData.notes || orderData.note || '',
      contract_code: orderData.contract_code || '',
      purchase_order_number: orderData.purchase_order_number || '',
      vat_tax_code: orderData.taxCode || '',
      vat_company_name: orderData.companyName || '',
      vat_company_address: orderData.companyAddress || '',
      vat_company_phone: orderData.companyPhone || '',
      vat_company_addressInfo: {
        provinceCode: '',
        districtCode: '',
        wardCode: ''
      },
      vat_invoice_email: orderData.vatEmail || '',
      vat_percentage: undefined,
      vat_total_price: undefined,
      shipping_recipient_name: orderData.receiverName || '',
      shipping_recipient_phone: orderData.receiverPhone || '',
      shipping_address: orderData.receiverAddress || '',
      shipping_addressInfo: {
        provinceCode: orderData.addressInfo?.provinceCode || '',
        districtCode: orderData.addressInfo?.districtCode || '',
        wardCode: orderData.addressInfo?.wardCode || '',
        provinceName: orderData.addressInfo?.province?.name || '',
        districtName: orderData.addressInfo?.district?.name || '',
        wardName: orderData.addressInfo?.ward?.name || '',
      },
      initial_payment: orderData.initial_payment || 0,
      initial_payment_method: orderData.payment_method || 'cash',
      initial_payment_bank: '',
      order_warehouse_id: '',
      items: itemsWithSerialRequired,
      expenses: (orderData.expenses || []).map((exp: any) => ({
        name: exp.name || '',
        amount: exp.amount || 0,
        note: exp.note || ''
      })),
      paymentDeadline: orderData.paymentDeadline || ''
    };
    
    setNewOrder(formData);
    setShippingAddressVersion((v) => v + 1);
    
    // Load serial numbers from order items
    const serials: Record<number, string[]> = {};
    (orderData.items || orderData.order_items || []).forEach((item: any, index: number) => {
      if (item.serials && item.serials.length > 0) {
        // Handle both string[] and object[] formats
        serials[index] = item.serials.map((s: any) => {
          if (typeof s === 'string') return s;
          if (s && typeof s === 'object' && s.serial_number) return s.serial_number;
          return String(s);
        });
      }
    });
    setSerialNumbers(serials);
  };

  const loadData = async () => {
    try {
      const [customersRes, suppliersRes, productsRes, warehousesRes, banksRes] = await Promise.all([
        customerApi.getCustomers({ page: 1, limit: 1000 }),
        supplierApi.getSuppliers({ page: 1, limit: 1000 }),
        productApi.getProducts({ page: 1, limit: 1000 }),
        warehouseApi.getWarehouses({ page: 1, limit: 1000 }),
        orderApi.getBanks()
      ]);
      setCustomers(customersRes.customers || []);
      setSuppliers(suppliersRes.suppliers || []);
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
    try {
      setLoading(true);
      // Build customer data from order form
      const customerData: any = {
        name: newOrder.customer_name.trim(),
        phoneNumber: newOrder.customer_phone?.trim() || undefined,
        address: newOrder.shipping_address?.trim() || undefined,
        addressInfo: newOrder.shipping_addressInfo?.provinceCode ? {
          provinceCode: newOrder.shipping_addressInfo.provinceCode || undefined,
          districtCode: newOrder.shipping_addressInfo.districtCode ?? null,
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
        vat_percentage: 0,
        vat_total_price: 0,
        vat_amount: 0,
        warehouse_id: prev.order_warehouse_id || (warehouses.length === 1 ? warehouses[0].id : ""),
        serial_manage: false,
        warranty_months: 0,
      }]
    }));
  };
  const removeItem = (index: number) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    setSerialNumbers(prev => {
      const newSerialNumbers: Record<number, string[]> = {};
      Object.keys(prev).forEach(key => {
        const numKey = parseInt(key);
        if (numKey < index) {
          newSerialNumbers[numKey] = prev[numKey];
        } else if (numKey > index) {
          newSerialNumbers[numKey - 1] = prev[numKey];
        }
      });
      return newSerialNumbers;
    });
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
      setNewOrder(prev => {
        const items = [...prev.items];
        return { ...prev, items };
      });
    } catch (error) {
      setNewOrder(prev => {
        const items = [...prev.items];
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
    const itemsSubtotal = newOrder.items.reduce((sum, item) => sum + (item.vat_percentage ? (item.total_price + (item.total_price * item.vat_percentage / 100)) : item.total_price), 0);
    const expensesTotal = newOrder.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const subtotal = itemsSubtotal + expensesTotal;
    const debt = subtotal - (newOrder.initial_payment || 0);
    return { subtotal, debt };
  };
  const handleSubmit = async () => {
    setLoading(true);
    // Track if a new customer was created in this submission attempt
    let newlyCreatedCustomer: Customer | undefined;
    try {
      let customerId = newOrder.customer_id;
      let selectedCustomer: Customer | undefined;
      const isEditing = Boolean(orderId);

      // Handle customer/supplier creation/selection (for both sale and purchase orders)
      if (newOrder.customer_id === "__new__") {
        if (orderType === 'purchase') {
          // Create new supplier from form data
          const supplierData: any = {
            name: newOrder.customer_name.trim(),
            phoneNumber: newOrder.customer_phone?.trim() || undefined,
            email: newOrder.customer_email?.trim() || undefined,
            address: newOrder.shipping_address?.trim() || undefined,
            addressInfo: newOrder.shipping_addressInfo?.provinceCode ? {
              provinceCode: newOrder.shipping_addressInfo.provinceCode || undefined,
              districtCode: newOrder.shipping_addressInfo.districtCode
                ? newOrder.shipping_addressInfo.districtCode
                : null,
              wardCode: newOrder.shipping_addressInfo.wardCode || undefined,
            } : undefined,
          };
          try {
            // Create supplier and wait for response
            const newSupplier = await supplierApi.createSupplier(supplierData);
            // Validate that supplier was created successfully
            if (!newSupplier || !newSupplier.id) {
              throw new Error("Không thể tạo nhà cung cấp mới. Phản hồi từ server không hợp lệ.");
            }
            customerId = newSupplier.id;
            selectedCustomer = undefined;
            newlyCreatedCustomer = undefined;
            // Reload suppliers list
            const suppliersRes = await supplierApi.getSuppliers({ page: 1, limit: 1000 });
            setSuppliers(suppliersRes.suppliers || []);
            toast({
              title: "Thành công",
              description: `Đã tạo nhà cung cấp mới: ${newSupplier.name}`,
            });
          } catch (supplierError: any) {
            toast({
              title: "Lỗi",
              description: getErrorMessage(supplierError, "Không thể tạo nhà cung cấp mới"),
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        } else {
          // Create new customer from form data (for sale orders)
          const customerData: any = {
            name: newOrder.customer_name.trim(),
            phoneNumber: newOrder.customer_phone?.trim() || undefined,
            email: newOrder.customer_email?.trim() || undefined,
            address: newOrder.shipping_address?.trim() || undefined,
            addressInfo: newOrder.shipping_addressInfo?.provinceCode ? {
              provinceCode: newOrder.shipping_addressInfo.provinceCode || undefined,
              districtCode: newOrder.shipping_addressInfo.districtCode ?? null,
              wardCode: newOrder.shipping_addressInfo.wardCode || undefined,
            } : undefined,
          };
          // Add VAT info if available (only for sale orders)
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
            newlyCreatedCustomer = newCustomer; // Track that we created a new customer
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
        }
      } else {
        // Get existing customer/supplier details
        if (orderType === 'sale') {
          selectedCustomer = customers.find(c => c.id === newOrder.customer_id);
        } else {
          // For purchase orders, get supplier details
          const selectedSupplier = suppliers.find(s => s.id === newOrder.customer_id);
          // Map supplier to customer-like object for order creation
          if (selectedSupplier) {
            selectedCustomer = {
              id: selectedSupplier.id,
              name: selectedSupplier.name,
              customer_code: selectedSupplier.code,
              phoneNumber: selectedSupplier.contact_phone,
              email: selectedSupplier.email,
              address: selectedSupplier.address,
              addressInfo: selectedSupplier.addressInfo,
            } as Customer;
          }
        }
        customerId = newOrder.customer_id;
      }
      // Validate customerId before creating order
      if (!customerId || customerId === "__new__" || customerId.trim() === "") {
        toast({
          title: "Lỗi",
          description: orderType === 'sale'
            ? "Không thể xác định ID khách hàng. Vui lòng thử lại."
            : "Không thể xác định ID nhà cung cấp. Vui lòng thử lại.",
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
      
      // Prepare order data for create or update
      const orderPayloadRaw = {
        customerId: customerId,
        customerName: newOrder.customer_name || selectedCustomer?.name || "",
        customerPhone: newOrder.customer_phone || selectedCustomer?.phoneNumber || undefined,
        customerEmail: newOrder.customer_email || selectedCustomer?.email || undefined,
        customerAddress: selectedCustomer?.address || undefined,
        customerAddressInfo: customerAddressInfo,
        // code: newOrder.contract_code || undefined,
        contractCode: newOrder.contract_code || undefined,
        purchaseOrderNumber: newOrder.purchase_order_number || undefined,
        note: newOrder.notes || undefined,
        status: 'new' as const,
        orderType: orderType, // Use the orderType state
        type: orderType, // Add type parameter for backend
        // VAT Information - removed VAT rate from UI, backend will handle
        vatRate: undefined,
        taxCode: orderVatInfo?.taxCode,
        companyName: orderVatInfo?.companyName,
        companyAddress: orderVatInfo?.companyAddress,
        vatEmail: orderVatInfo?.vatEmail,
        companyPhone: orderVatInfo?.companyPhone,
        // Receiver Information - only for sale orders
        receiverName: orderType === 'sale' ? (newOrder.shipping_recipient_name || undefined) : undefined,
        receiverPhone: orderType === 'sale' ? (newOrder.shipping_recipient_phone || undefined) : undefined,
        receiverAddress: orderType === 'sale' ? (newOrder.shipping_address || undefined) : undefined,
        addressInfo: orderType === 'sale' ? (() => {
          const addrInfo = newOrder.shipping_addressInfo;
          // Ensure codes are strings for validation
          const provinceCodeStr = addrInfo?.provinceCode !== undefined && addrInfo?.provinceCode !== null
            ? String(addrInfo.provinceCode)
            : undefined;
          const wardCodeStr = addrInfo?.wardCode !== undefined && addrInfo?.wardCode !== null
            ? String(addrInfo.wardCode)
            : undefined;
          // districtCode: check for null (V2) or valid string
          const hasProvinceCode = provinceCodeStr !== undefined && provinceCodeStr.trim() !== "";
          const hasDistrictCode = addrInfo?.districtCode !== undefined && addrInfo?.districtCode !== null && typeof addrInfo.districtCode === 'string' && addrInfo.districtCode.trim() !== "";
          const hasWardCode = wardCodeStr !== undefined && wardCodeStr.trim() !== "";
          // Send addressInfo if we have any valid address codes or if we have receiverAddress
          if (hasProvinceCode || hasDistrictCode || hasWardCode || (newOrder.shipping_address && newOrder.shipping_address.trim() !== "")) {
            return {
              provinceCode: hasProvinceCode ? provinceCodeStr : undefined,
              districtCode: hasDistrictCode ? addrInfo.districtCode : null,
              wardCode: hasWardCode ? wardCodeStr : undefined
            };
          }
          return undefined;
        })() : undefined,
        // Payment
        paymentMethod: newOrder.initial_payment_method || "cash",
        initialPayment: newOrder.initial_payment || 0,
        totalAmount: subtotal,
        bank: newOrder.initial_payment_method === "bank_transfer" && newOrder.initial_payment_bank
          ? newOrder.initial_payment_bank
          : undefined,
        paymentDeadline: newOrder.paymentDeadline || undefined,
        // Order details
        details: newOrder.items.map((it, index) => {
          const currentSerials = serialNumbers[index] || [];
          let serialsToSend: string[] | undefined;
          if (it.serial_manage || currentSerials.length > 0) {
            serialsToSend = currentSerials;
          }

          return {
            productId: it.product_id,
            vatPercentage: it.vat_percentage || 0,
            quantity: it.quantity,
            unitPrice: it.unit_price,
            ...(serialsToSend !== undefined && { serials: serialsToSend }),
            ...(it.warranty_months !== undefined && { warrantyMonths: it.warranty_months }),
          };
        }),
        // Additional expenses
        expenses: newOrder.expenses
          .filter(exp => (exp.name && exp.name.trim().length > 0) || exp.amount)
          .map(exp => ({
            name: exp.name.trim(),
            amount: exp.amount || 0,
            note: exp.note && exp.note.trim().length > 0 ? exp.note.trim() : undefined,
          })),
      };
      
      // Helper function to remove undefined/null/empty string values from object
      const removeEmptyFields = (obj: any): any => {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
              // Keep arrays as-is (they may be empty but valid)
              cleaned[key] = value;
            } else if (typeof value === 'object' && value !== null) {
              // Recursively clean nested objects
              const cleanedNested = removeEmptyFields(value);
              if (Object.keys(cleanedNested).length > 0) {
                cleaned[key] = cleanedNested;
              }
            } else {
              cleaned[key] = value;
            }
          }
        }
        return cleaned;
      };
      
      // For update, only include fields that have values
      const orderPayload = isEditing ? removeEmptyFields(orderPayloadRaw) : orderPayloadRaw;
      
      // Call create or update API based on mode
      let orderData;
      if (isEditing && orderId) {
        // Update existing order
        orderData = await orderApi.updateOrder(orderId, orderPayload);
      } else {
        // Create new order
        orderData = await orderApi.createOrder(orderPayload);
      }
      
      // Items are included in order payload; adjust if BE requires separate calls
      // TODO: initial payment can be handled via payments API if available
      // Get order code from response
      const orderCode = orderData.order_number ||
        orderData.id ||
        'thành công';
      // Update VAT info for customer if needed (only for sale orders)
      if (
        orderType === 'sale' &&
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
        description: isEditing ? `Đã cập nhật đơn hàng ${orderCode}` : `Đã tạo đơn hàng ${orderCode}`,
      });
      setNewOrder(createInitialOrderState());
      setOrderType('sale');
      setShippingAddressVersion((v) => v + 1);
      setSerialNumbers({});
      setSerialText({});
      onOrderCreated();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, orderId ? "Không thể cập nhật đơn hàng" : "Không thể tạo đơn hàng"),
        variant: "destructive",
      });
      // If a new customer was created but order creation failed,
      // select the newly created customer in the combobox
      if (newlyCreatedCustomer) {
        const vatInfoFromNewCustomer = buildVatInfoFromCustomer(newlyCreatedCustomer);
        const shippingInfoFromNewCustomer = buildShippingInfoFromCustomer(newlyCreatedCustomer);
        setNewOrder(prev => ({
          ...prev,
          customer_id: newlyCreatedCustomer.id,
          customer_name: newlyCreatedCustomer.name || prev.customer_name,
          customer_code: newlyCreatedCustomer.customer_code || "",
          customer_phone: newlyCreatedCustomer.phoneNumber || prev.customer_phone,
          customer_email: newlyCreatedCustomer.email || prev.customer_email,
          ...vatInfoFromNewCustomer,
          ...shippingInfoFromNewCustomer,
        }));
        setShippingAddressVersion((v) => v + 1);
      }
    } finally {
      setLoading(false);
    }
  };
  const { subtotal, debt } = calculateTotals();
  // Show loading wrapper for the entire dialog
  return (
    <LoadingWrapper
      isLoading={false}
      error={null}
      onRetry={() => {
        loadData();
      }}
      loadingMessage={orderId ? "Đang tải dữ liệu chỉnh sửa đơn hàng..." : "Đang tải dữ liệu tạo đơn hàng..."}
    >
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{orderId ? 'Chỉnh sửa đơn hàng' : 'Tạo đơn hàng mới'}</DialogTitle>
            <DialogDescription>
              {orderId ? 'Cập nhật thông tin chi tiết cho đơn hàng' : 'Nhập thông tin chi tiết cho đơn hàng mới'}
            </DialogDescription>
          </DialogHeader>
          {/* Order Type Tabs - Only show when creating new order */}
          {!orderId && (
            <Tabs value={orderType} onValueChange={(value) => {
              setOrderType(value as 'sale' | 'purchase');
              setNewOrder(createInitialOrderState());
              setShippingAddressVersion(v => v + 1);
              setSerialNumbers({});
            }} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sale" className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Bán hàng
                </TabsTrigger>
                <TabsTrigger value="purchase" className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Mua hàng
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <div className="space-y-6">
            {/* Customer/Supplier Information */}
            <Card ref={customerCardRef}>
              <CardHeader>
                <CardTitle>{orderType === 'sale' ? 'Thông tin khách hàng' : 'Thông tin nhà cung cấp'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer">{orderType === 'sale' ? 'Khách hàng' : 'Nhà cung cấp'}</Label>
                    <Combobox
                      options={[
                        { label: orderType === 'sale' ? "Chọn khách hàng cũ" : "Chọn nhà cung cấp cũ", value: "__new__" },
                        ...(orderType === 'sale' ? customers.map(customer => ({
                          label: `${customer.name} (${customer.customer_code})`,
                          value: customer.id
                        })) : suppliers.map(supplier => ({
                          label: `${supplier.name} (${supplier.code})`,
                          value: supplier.id
                        })))
                      ]}
                      value={newOrder.customer_id}
                      onValueChange={(value) => {
                        // Handle "Create new customer" option - just set the value, don't create yet
                        const stringValue = Array.isArray(value) ? value[0] : value;
                        if (stringValue === "__new__") {
                          setNewOrder(prev => ({
                            ...prev,
                            customer_id: "__new__",
                          }));
                          return;
                        }

                        // Handle existing customer/supplier selection
                        if (orderType === 'sale') {
                          const customer = customers.find(c => c.id === stringValue);
                          const vatInfo = buildVatInfoFromCustomer(customer);
                          const shippingInfo = buildShippingInfoFromCustomer(customer);

                          setNewOrder(prev => {
                            const newState = {
                              ...prev,
                              customer_id: stringValue || "",
                              customer_name: customer?.name || "",
                              customer_code: customer?.customer_code || "",
                              customer_phone: customer?.phoneNumber || "",
                              customer_email: customer?.email || "",
                              ...vatInfo,
                              ...shippingInfo,
                            };

                            // Only trigger AddressFormSeparate re-mount if province changed (for sale orders)
                            const currentProvinceCode = prev.shipping_addressInfo?.provinceCode;
                            const newProvinceCode = shippingInfo.shipping_addressInfo?.provinceCode;

                            if (currentProvinceCode !== newProvinceCode) {
                              setShippingAddressVersion(v => v + 1);
                            }

                            return newState;
                          });
                        } else {
                          // Purchase order - auto-fill supplier information
                          const supplier = suppliers.find(s => s.id === stringValue);

                          setNewOrder(prev => ({
                            ...prev,
                            customer_id: stringValue || "",
                            customer_name: supplier?.name || "",
                            customer_code: supplier?.code || "",
                            customer_phone: supplier?.contact_phone || "",
                            customer_email: supplier?.email || "",
                          }));
                        }
                      }}
                      placeholder={orderType === 'sale' ? "Chọn khách hàng hoặc nhập mới" : "Chọn nhà cung cấp hoặc nhập mới"}
                      searchPlaceholder={orderType === 'sale' ? "Tìm khách hàng..." : "Tìm nhà cung cấp..."}
                      emptyMessage={orderType === 'sale' ? "Không có khách hàng nào" : "Không có nhà cung cấp nào"}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer_name">{orderType === 'sale' ? 'Tên khách hàng' : 'Tên nhà cung cấp'} <span className="text-red-500">*</span></Label>
                    <Input
                      id="customer_name"
                      value={newOrder.customer_name}
                      onChange={(e) => setNewOrder(prev => ({ ...prev, customer_name: e.target.value }))}
                      placeholder={orderType === 'sale' ? 'Nhập tên khách hàng' : 'Nhập tên nhà cung cấp'}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer_phone">Số điện thoại <span className="text-red-500">*</span></Label>
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
                      placeholder={orderType === 'sale' ? 'Nhập email khách hàng' : 'Nhập email nhà cung cấp'}
                    />
                  </div>
                </div>
                {/* Address input for suppliers in purchase orders when not selecting existing supplier */}
                {orderType === 'purchase' && newOrder.customer_id === "__new__" && (
                  <div className="space-y-4">
                    <Label>Địa chỉ nhà cung cấp</Label>
                    <AddressFormSeparate
                      value={{
                        address: newOrder.shipping_address || '',
                        provinceCode: newOrder.shipping_addressInfo?.provinceCode || '',
                        districtCode: newOrder.shipping_addressInfo?.districtCode || '',
                        wardCode: newOrder.shipping_addressInfo?.wardCode || '',
                        provinceName: newOrder.shipping_addressInfo?.provinceName || '',
                        districtName: newOrder.shipping_addressInfo?.districtName || '',
                        wardName: newOrder.shipping_addressInfo?.wardName || '',
                      }}
                      onChange={(data) => {
                        setNewOrder(prev => ({
                          ...prev,
                          shipping_address: data.address || '',
                          shipping_addressInfo: {
                            provinceCode: data.provinceCode || '',
                            districtCode: data.districtCode || '',
                            wardCode: data.wardCode || '',
                            provinceName: data.provinceName || '',
                            districtName: data.districtName || '',
                            wardName: data.wardName || '',
                          },
                        }));
                      }}
                    />
                  </div>
                )}
                {/* Removed customer address input. Shipping address will auto-fill from selected customer. */}
              </CardContent>
            </Card>
            {/* Contract Infomation */}
            <Card>
              <CardHeader>
                <CardTitle>Thông tin hợp đồng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contract_code">Mã hợp đồng</Label>
                    <Input
                      id="contract_code"
                      value={newOrder.contract_code}
                      onChange={(e) => setNewOrder(prev => ({ ...prev, contract_code: e.target.value }))}
                      placeholder="Nhập mã hợp đồng"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* VAT Information - Only show for sale orders */}
            {orderType === 'sale' && (
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
            )}
            {/* Shipping Information - Only show for sale orders */}
            {orderType === 'sale' && (
              <Card ref={shippingCardRef}>
                <CardHeader>
                  <CardTitle>Thông tin vận chuyển</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shipping_recipient_name">Người nhận hàng <span className="text-red-500">*</span></Label>
                      <Input
                        id="shipping_recipient_name"
                        value={newOrder.shipping_recipient_name}
                        onChange={(e) => setNewOrder(prev => ({ ...prev, shipping_recipient_name: e.target.value }))}
                        placeholder="Nhập tên người nhận"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shipping_recipient_phone">Số điện thoại <span className="text-red-500">*</span></Label>
                      <Input
                        id="shipping_recipient_phone"
                        value={newOrder.shipping_recipient_phone}
                        onChange={(e) => setNewOrder(prev => ({ ...prev, shipping_recipient_phone: e.target.value }))}
                        placeholder="Nhập số điện thoại"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Địa chỉ nhận hàng <span className="text-red-500">*</span></Label>
                    <AddressFormSeparate
                      key={shippingAddressVersion}
                      required={true}
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
            )}
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
                <Table className="border border-border/30 rounded-lg overflow-hidden">
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b-2 border-slate-200">
                      <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                        <div className="text-center">Sản phẩm <span className="text-red-500">*</span></div>
                      </TableHead>
                      <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                        <div className="text-center">Thuế suất</div>
                      </TableHead>
                      <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                        <div className="text-center">Số lượng <span className="text-red-500">*</span></div>
                      </TableHead>
                      <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                        <div className="text-center">Đơn giá <span className="text-red-500">*</span></div>
                      </TableHead>
                      <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                        <div className="text-center">Tiền thuế GTGT</div>
                      </TableHead>
                      <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                        <div className="text-center">Thành tiền chưa có thuế GTGT</div>
                      </TableHead>
                      <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                        <div className="text-center">Thành tiền có thuế GTGT</div>
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newOrder.items.map((item, index) => (
                      <>
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
                          <div className="mt-1">
                            <label className="inline-flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={Boolean(item.serial_manage)}
                                onChange={(e) => {
                                  updateItem(index, 'serial_manage', e.target.checked);
                                                          if (!e.target.checked) {
                                  setSerialNumbers(prev => {
                                    const clone = { ...prev };
                                    delete clone[index];
                                    return clone;
                                  });
                                  setSerialText(prev => {
                                    const clone = { ...prev };
                                    delete clone[index];
                                    return clone;
                                  });
                                }
                              }}
                                className="h-4 w-4"
                              />
                              <span>Quản lý serial</span>
                            </label>
                          </div>
                        </TableCell>
                        <TableCell className="border-r border-slate-100 align-top pt-4 text-center">
                          <div className="inline-block">
                            <NumberInput
                              value={item.vat_percentage}
                              onChange={(value) => updateItem(index, "vat_percentage", value)}
                              min={0}
                              max={100}
                              allowDecimal={true}
                              className="w-20 text-center"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="border-r border-slate-100 align-top pt-4 text-center">
                          <div className="inline-block">
                            <NumberInput
                              value={item.quantity}
                              onChange={(value) => updateItem(index, "quantity", value)}
                              min={1}
                              className="w-20 text-center"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="border-r border-slate-100 align-top pt-4 text-center">
                          <div className="inline-block">
                            <CurrencyInput
                              value={item.unit_price}
                              onChange={(value) => updateItem(index, "unit_price", value)}
                              className="w-32 text-center"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="border-r border-slate-100 align-top pt-7 text-center">
                          {(item.total_price * item.vat_percentage / 100).toLocaleString("vi-VN")}
                        </TableCell>
                        <TableCell className="border-r border-slate-100 align-top pt-7 text-center">
                          {item.total_price.toLocaleString("vi-VN")}
                        </TableCell>
                        <TableCell className="border-r border-slate-100 align-top pt-7 text-center">
                          {(item.total_price + (item.total_price * item.vat_percentage / 100)).toLocaleString("vi-VN")}
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
                      {item.serial_manage && (
                        <TableRow className="bg-slate-50">
                          <TableCell colSpan={8} className="p-3">
                            <div className="space-y-2">
                              <Label className="mb-1 block font-medium">Mã serial</Label>
                              <Textarea
                                value={serialText[index] ?? (serialNumbers[index] || []).join(', ')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const t = e.currentTarget as HTMLTextAreaElement;
                                    const text = t.value;
                                    const cursorPos = t.selectionStart;
                                    const next = `${text.slice(0, cursorPos)},${text.slice(cursorPos)}`;
                                    setSerialText(prev => ({ ...prev, [index]: next }));
                                    const serialList = next
                                      .split(',')
                                      .map(s => s.trim())
                                      .filter(s => s);
                                    setSerialNumbers(prev => ({ ...prev, [index]: serialList }));
                                    setTimeout(() => {
                                      t.selectionStart = t.selectionEnd = cursorPos + 1;
                                    }, 0);
                                  }
                                }}
                                onChange={(e) => {
                                  const text = e.target.value;
                                  setSerialText(prev => ({ ...prev, [index]: text }));
                                  const serials = text
                                    .split(',')
                                    .map(s => s.trim())
                                    .filter(s => s);
                                  setSerialNumbers(prev => ({ ...prev, [index]: serials }));
                                }}
                                rows={3}
                                placeholder="Nhập mã serial, ngăn cách bằng dấu phẩy, nhấn Enter để chèn dấu phẩy"
                                className="w-full"
                              />
                              <div className="text-sm">
                                <span className={((serialNumbers[index] || []).length === item.quantity) ? 'text-emerald-600' : 'text-rose-500'}>
                                  {((serialNumbers[index] || []).length === item.quantity) ? (
                                    <CheckCircle className="w-4 h-4 inline mr-2" />
                                  ) : (
                                    <AlertCircle className="w-4 h-4 inline mr-2" />
                                  )}
                                  {(serialNumbers[index] || []).length}/{item.quantity} Serial
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Label className="font-medium whitespace-nowrap"><b>Bảo hành</b></Label>
                                <NumberInput
                                  value={item.warranty_months ?? 0}
                                  onChange={(value) => updateItem(index, 'warranty_months', Number(value) || 0)}
                                  min={0}
                                  className="w-20"
                                />
                                <span>tháng (tính từ ngày giao hàng)</span>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
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
                                className="w-32 text-center"
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
                    <Label htmlFor="initial_payment_method">Phương thức thanh toán</Label>
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
                {loading ? (orderId ? "Đang cập nhật..." : "Đang tạo...") : (orderId ? "Cập nhật đơn hàng" : "Tạo đơn hàng")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </LoadingWrapper>
  );
};
export default CreateOrderForm;