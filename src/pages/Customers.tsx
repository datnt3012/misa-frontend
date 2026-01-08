import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useDialogUrl } from "@/hooks/useDialogUrl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Eye,
  ShoppingCart,
  TrendingUp,
  Calendar,
  Edit,
  Trash2,
  Receipt,
} from "lucide-react";
import { PermissionGuard } from "@/components/PermissionGuard";
import { customerApi } from "@/api/customer.api";
import { administrativeApi, AdministrativeUnit } from "@/api/administrative.api";
import { orderApi } from "@/api/order.api";
import { AddressFormSeparate } from "@/components/common/AddressFormSeparate";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { getOrderStatusConfig } from "@/constants/order-status.constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
interface CustomerVatInfo {
  taxCode?: string | null;
  companyName?: string | null;
  companyAddress?: string | null;
  vatEmail?: string | null;
  companyPhone?: string | null;
}
interface Customer {
  id: string;
  code?: string;
  customer_code?: string;
  name: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  vatRate?: number;
  userId?: string;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  user?: any;
  addressInfo?: any;
  provinceCode?: string;
  districtCode?: string;
  wardCode?: string;
  provinceName?: string;
  districtName?: string;
  wardName?: string;
  vatInfo?: CustomerVatInfo;
}
interface CustomerFormVatInfoState {
  taxCode: string;
  companyName: string;
  companyAddress: string;
  vatEmail: string;
  companyPhone: string;
}
interface CustomerFormAddressState {
  administrativeUnitId: string;
  provinceCode: string;
  districtCode: string;
  wardCode: string;
  provinceName: string;
  districtName: string;
  wardName: string;
}
interface CustomerFormState {
  customer_code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  vatRate: number | undefined;
  administrativeUnitId?: string;
  addressInfo: CustomerFormAddressState;
  vatInfo: CustomerFormVatInfoState;
}
const createEmptyAddressInfo = (): CustomerFormAddressState => ({
  administrativeUnitId: "",
  provinceCode: "",
  districtCode: "",
  wardCode: "",
  provinceName: "",
  districtName: "",
  wardName: "",
});
const createEmptyVatInfoState = (): CustomerFormVatInfoState => ({
  taxCode: "",
  companyName: "",
  companyAddress: "",
  vatEmail: "",
  companyPhone: "",
});
const createEmptyCustomerFormState = (): CustomerFormState => ({
  customer_code: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  vatRate: undefined,
  administrativeUnitId: "none",
  addressInfo: createEmptyAddressInfo(),
  vatInfo: createEmptyVatInfoState(),
});
const populateVatInfoState = (info?: CustomerVatInfo | null): CustomerFormVatInfoState => ({
  taxCode: info?.taxCode ?? "",
  companyName: info?.companyName ?? "",
  companyAddress: info?.companyAddress ?? "",
  vatEmail: info?.vatEmail ?? "",
  companyPhone: info?.companyPhone ?? "",
});
const sanitizeVatField = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};
const buildVatInfoPayload = (
  info: CustomerFormVatInfoState
): CustomerVatInfo | undefined => {
  const payload: CustomerVatInfo = {
    taxCode: sanitizeVatField(info.taxCode),
    companyName: sanitizeVatField(info.companyName),
    companyAddress: sanitizeVatField(info.companyAddress),
    vatEmail: sanitizeVatField(info.vatEmail),
    companyPhone: sanitizeVatField(info.companyPhone),
  };
  return Object.values(payload).some(Boolean) ? payload : undefined;
};
const buildAddressInfoState = (info?: any): CustomerFormAddressState => {
  const base = createEmptyAddressInfo();
  if (!info) return base;
  return {
    administrativeUnitId: info.administrativeUnitId ?? base.administrativeUnitId,
    provinceCode: info.provinceCode ?? info.province?.code ?? base.provinceCode,
    districtCode: info.districtCode ?? info.district?.code ?? base.districtCode,
    wardCode: info.wardCode ?? info.ward?.code ?? base.wardCode,
    provinceName: info.provinceName ?? info.province?.name ?? base.provinceName,
    districtName: info.districtName ?? info.district?.name ?? base.districtName,
    wardName: info.wardName ?? info.ward?.name ?? base.wardName,
  };
};
interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  debt_amount: number;
  created_at: string;
  order_type: string;
}
interface CustomerStats {
  total_orders: number;
  total_spent: number;
  current_debt: number;
}
const CustomersContent = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [administrativeUnits, setAdministrativeUnits] = useState<AdministrativeUnit[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [customerStats, setCustomerStats] = useState<CustomerStats>({ total_orders: 0, total_spent: 0, current_debt: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCustomerDetailOpen, setIsCustomerDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();
  const { openDialog, closeDialog, getDialogState } = useDialogUrl('customers');
  const isClosingDialogRef = useRef(false);
  // Format full address with ward/district/province names when available
  const formatAddress = (c: any) => {
    const ai = c?.addressInfo || {};
    const wardNameFromNested = ai?.ward?.name;
    const districtNameFromNested = ai?.district?.name;
    const provinceNameFromNested = ai?.province?.name;
    const parts: string[] = [];
    if (c?.address) parts.push(c.address);
    if (wardNameFromNested || ai.wardName || (c as any).wardName) parts.push(wardNameFromNested || ai.wardName || (c as any).wardName);
    if (districtNameFromNested || ai.districtName || (c as any).districtName) parts.push(districtNameFromNested || ai.districtName || (c as any).districtName);
    if (provinceNameFromNested || ai.provinceName || (c as any).provinceName) parts.push(provinceNameFromNested || ai.provinceName || (c as any).provinceName);
    return parts.filter(Boolean).join(', ');
  };
  // Form states
  const [newCustomer, setNewCustomer] = useState<CustomerFormState>(() => createEmptyCustomerFormState());
  const [editCustomer, setEditCustomer] = useState<CustomerFormState>(() => createEmptyCustomerFormState());
  // Check permissions
  const { hasPermission } = usePermissions();
  const canReadCustomers = hasPermission('CUSTOMERS_READ');
  const canManageCustomers = hasPermission('CUSTOMERS_MANAGE');
  // Load customers data
  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const resp = await customerApi.getCustomers({ page: 1, limit: 1000 });
      setCustomers(resp.customers || []);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể tải danh sách khách hàng",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  // Load provinces data (administrative units = provinces)
  const loadAdministrativeUnits = async () => {
    try {
      // Fetch provinces from API
      const response = await fetch('https://provinces.open-api.vn/api/?depth=1');
      if (!response.ok) throw new Error('API not available');
      const data = await response.json();
      const provincesData = data.map((p: any) => ({
        id: p.code,
        name: p.name,
        code: p.code,
        description: p.name
      }));
      setAdministrativeUnits(provincesData);
    } catch (error) {
      // Fallback data for common provinces
      const fallbackProvinces: AdministrativeUnit[] = [
        { id: 'HN', name: 'Hà Nội', code: 'HN', level: '1' },
        { id: 'HCM', name: 'TP. Hồ Chí Minh', code: 'HCM', level: '1' },
        { id: 'DN', name: 'Đà Nẵng', code: 'DN', level: '1' },
        { id: 'HP', name: 'Hải Phòng', code: 'HP', level: '1' },
        { id: 'CT', name: 'Cần Thơ', code: 'CT', level: '1' }
      ];
      setAdministrativeUnits(fallbackProvinces);
    }
  };
  // Load data when permissions are available
  useEffect(() => {
    loadCustomers();
    loadAdministrativeUnits();
  }, [canReadCustomers]);
  // Read URL and auto-open dialog if present
  useEffect(() => {
    if (isClosingDialogRef.current) {
      return;
    }

    const dialogState = getDialogState();
    if (dialogState.isOpen && dialogState.entityId) {
      const isDetailOpen = isCustomerDetailOpen && selectedCustomer?.id === dialogState.entityId && dialogState.dialogType === 'view';
      const isEditOpen = isEditDialogOpen && editingCustomer?.id === dialogState.entityId && dialogState.dialogType === 'edit';
      
      if (isDetailOpen || isEditOpen) {
        return;
      }

      const customer = customers.find(c => c.id === dialogState.entityId);
      if (customer) {
        if (dialogState.dialogType === 'view') {
          handleViewCustomerDetail(customer);
        } else if (dialogState.dialogType === 'edit') {
          handleEditCustomer(customer);
        }
      }
    } else if (dialogState.isOpen && dialogState.dialogType === 'create') {
      if (!isAddDialogOpen) {
        setIsAddDialogOpen(true);
      }
    }
  }, [getDialogState, customers, isCustomerDetailOpen, isEditDialogOpen, selectedCustomer, editingCustomer, isAddDialogOpen, closeDialog]);
  const fetchCustomerOrders = async (customerId: string) => {
    try {
      // Use backend API to fetch customer orders
      const ordersResponse = await orderApi.getOrders({ page: 1, limit: 1000 });
      const allOrders = ordersResponse.orders || [];
      // Filter orders for this customer
      const customerOrders = allOrders.filter(order => order.customer_id === customerId);
      setCustomerOrders(customerOrders);
      // Calculate customer stats
      const totalOrders = customerOrders.length;
      const totalSpent = customerOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
      const currentDebt = customerOrders.reduce((sum, order) => sum + Number(order.debt_amount || 0), 0);
      setCustomerStats({
        total_orders: totalOrders,
        total_spent: totalSpent,
        current_debt: currentDebt
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể tải lịch sử đơn hàng",
        variant: "destructive",
      });
    }
  };
  const handleAddCustomer = async () => {
    try {
      const vatInfoPayload = buildVatInfoPayload(newCustomer.vatInfo);
      const insertData: any = {
        name: newCustomer.name,
        phoneNumber: newCustomer.phone || null,
        email: newCustomer.email || null,
        address: newCustomer.address || null,
        vatRate: newCustomer.vatRate,
        addressInfo: {
          provinceCode: newCustomer.addressInfo?.provinceCode || null,
          districtCode: newCustomer.addressInfo?.districtCode || null,
          wardCode: newCustomer.addressInfo?.wardCode || null
        }
      };
      if (vatInfoPayload) {
        insertData.vatInfo = vatInfoPayload;
      }
      // Backend will auto-generate customer code
      const data = await customerApi.createCustomer(insertData);
      setCustomers([data, ...customers]);
      setNewCustomer(createEmptyCustomerFormState());
      isClosingDialogRef.current = true;
      closeDialog();
      setIsAddDialogOpen(false);
      setTimeout(() => {
        isClosingDialogRef.current = false;
      }, 100);
      // Clear URL parameters
      setSearchParams({});
      toast({
        title: "Thành công",
        description: `Đã thêm khách hàng ${data.name} với mã ${data.customer_code}`,
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể thêm khách hàng",
        variant: "destructive",
      });
    }
  };
  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditCustomer({
      customer_code: customer.customer_code || "",
      name: customer.name || "",
      phone: customer.phoneNumber || "",
      email: customer.email || "",
      address: customer.address || "",
      vatRate: customer.vatRate,
      administrativeUnitId: customer.administrativeUnitId ?? "none",
      addressInfo: buildAddressInfoState(customer.addressInfo),
      vatInfo: populateVatInfoState(customer.vatInfo),
    });
    openDialog('edit', customer.id);
    setIsEditDialogOpen(true);
  };
  const handleUpdateCustomer = async () => {
    if (!editingCustomer) return;
    try {
      const vatInfoPayload = buildVatInfoPayload(editCustomer.vatInfo);
      const updatePayload: any = {
        name: editCustomer.name,
        phoneNumber: editCustomer.phone || null,
        email: editCustomer.email || null,
        address: editCustomer.address || null,
        vatRate: editCustomer.vatRate,
        addressInfo: {
          provinceCode: editCustomer.addressInfo?.provinceCode || null,
          districtCode: editCustomer.addressInfo?.districtCode || null,
          wardCode: editCustomer.addressInfo?.wardCode || null
        }
      };
      if (vatInfoPayload) {
        updatePayload.vatInfo = vatInfoPayload;
      }
      await customerApi.updateCustomer(editingCustomer.id, updatePayload);
      // Reload customers to get updated data
      await loadCustomers();
      isClosingDialogRef.current = true;
      closeDialog();
      setIsEditDialogOpen(false);
      setTimeout(() => {
        isClosingDialogRef.current = false;
      }, 100);
      setEditingCustomer(null);
      setEditCustomer(createEmptyCustomerFormState());
      // Clear URL parameters
      setSearchParams({});
      toast({
        title: "Thành công",
        description: `Đã cập nhật thông tin khách hàng ${editCustomer.name}`,
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể cập nhật thông tin khách hàng",
        variant: "destructive",
      });
    }
  };
  const handleDeleteCustomer = async (customer: Customer) => {
    if (!window.confirm(`Bạn có chắc muốn xóa khách hàng "${customer.name}"? Hành động này không thể hoàn tác.`)) {
      return;
    }
    try {
      await customerApi.deleteCustomer(customer.id);
      setCustomers(customers.filter(c => c.id !== customer.id));
      toast({
        title: "Thành công",
        description: `Đã xóa khách hàng ${customer.name}`,
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể xóa khách hàng. Có thể khách hàng đã có đơn hàng.",
        variant: "destructive",
      });
    }
  };
  const handleViewCustomerDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    fetchCustomerOrders(customer.id);
    openDialog('view', customer.id);
    setIsCustomerDetailOpen(true);
  };
  const getStatusBadge = (status: string) => {
    const config = getOrderStatusConfig(status);
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };
  const filteredCustomers = customers.filter(customer => {
    const name = (customer.name || '').toString();
    const code = (customer.customer_code || customer.code || '').toString();
    const phone = (customer.phoneNumber || '').toString();
    const email = (customer.email || '').toString();
    const q = (searchTerm || '').toLowerCase();
    return (
      name.toLowerCase().includes(q) ||
      code.toLowerCase().includes(q) ||
      phone.includes(searchTerm) ||
      email.toLowerCase().includes(q)
    );
  });
  // Show loading if loading
  if (isLoading) {
    return <div>Đang tải danh sách khách hàng...</div>;
  }
  return (
    <div className="min-h-screen bg-background space-y-4 p-6 sm:p-6 md:p-7">
        <div className="mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">Quản Lý Khách Hàng</h1>
          <p className="text-muted-foreground">Danh sách và thông tin chi tiết khách hàng</p>
        </div>
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Tìm kiếm khách hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (open) {
              openDialog('create');
            } else {
              isClosingDialogRef.current = true;
              closeDialog();
              setNewCustomer(createEmptyCustomerFormState());
              setTimeout(() => {
                isClosingDialogRef.current = false;
              }, 100);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Thêm Khách Hàng
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Thêm Khách Hàng Mới</DialogTitle>
                <DialogDescription>
                  Nhập thông tin khách hàng. Nếu không nhập mã khách hàng, hệ thống sẽ tự động tạo.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="customer-code">Mã khách hàng (tùy chọn)</Label>
                  <Input
                    id="customer-code"
                    value={newCustomer.customer_code}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, customer_code: e.target.value }))}
                    placeholder="Để trống để hệ thống tự tạo"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nếu để trống, hệ thống sẽ tự động tạo mã như KH000001, KH000002...
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Tên khách hàng <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                    placeholder="Nhập tên khách hàng"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Số điện thoại <span className="text-red-500">*</span></Label>
                  <Input
                    id="phone"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    placeholder="Nhập số điện thoại"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                    placeholder="Nhập email"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Địa chỉ</Label>
                  <AddressFormSeparate
                    value={{
                      address: newCustomer.address,
                      provinceCode: newCustomer.addressInfo?.provinceCode,
                      districtCode: newCustomer.addressInfo?.districtCode,
                      wardCode: newCustomer.addressInfo?.wardCode,
                      provinceName: newCustomer.addressInfo?.provinceName,
                      districtName: newCustomer.addressInfo?.districtName,
                      wardName: newCustomer.addressInfo?.wardName
                    }}
                    onChange={(data) => {
                      setNewCustomer(prev => ({
                        ...prev,
                        address: data.address,
                        addressInfo: {
                          ...prev.addressInfo,
                          provinceCode: data.provinceCode,
                          districtCode: data.districtCode,
                          wardCode: data.wardCode,
                          provinceName: data.provinceName,
                          districtName: data.districtName,
                          wardName: data.wardName
                        }
                      }));
                    }}
                    required={false}
                  />
                </div>
                <div className="space-y-3 rounded-lg border border-dashed border-border/60 bg-muted/20 p-4">
                  <div>
                    <Label className="font-medium">Thông tin hóa đơn VAT</Label>
                    <p className="text-xs text-muted-foreground">
                      Cập nhật thông tin doanh nghiệp để xuất hóa đơn điện tử.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="vat-tax-code">Mã số thuế</Label>
                      <Input
                        id="vat-tax-code"
                        value={newCustomer.vatInfo.taxCode}
                        onChange={(e) =>
                          setNewCustomer((prev) => ({
                            ...prev,
                            vatInfo: { ...prev.vatInfo, taxCode: e.target.value },
                          }))
                        }
                        placeholder="Ví dụ: 0123456789"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="vat-company-name">Tên công ty/đơn vị</Label>
                      <Input
                        id="vat-company-name"
                        value={newCustomer.vatInfo.companyName}
                        onChange={(e) =>
                          setNewCustomer((prev) => ({
                            ...prev,
                            vatInfo: { ...prev.vatInfo, companyName: e.target.value },
                          }))
                        }
                        placeholder="Nhập tên công ty"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="vat-email">Email nhận hóa đơn</Label>
                      <Input
                        id="vat-email"
                        type="email"
                        value={newCustomer.vatInfo.vatEmail}
                        onChange={(e) =>
                          setNewCustomer((prev) => ({
                            ...prev,
                            vatInfo: { ...prev.vatInfo, vatEmail: e.target.value },
                          }))
                        }
                        placeholder="vd: hoadon@abc.com"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="vat-company-phone">Số điện thoại công ty</Label>
                      <Input
                        id="vat-company-phone"
                        value={newCustomer.vatInfo.companyPhone}
                        onChange={(e) =>
                          setNewCustomer((prev) => ({
                            ...prev,
                            vatInfo: { ...prev.vatInfo, companyPhone: e.target.value },
                          }))
                        }
                        placeholder="vd: +84987654321"
                      />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <Label htmlFor="vat-company-address">Địa chỉ công ty</Label>
                      <Textarea
                        id="vat-company-address"
                        value={newCustomer.vatInfo.companyAddress}
                        onChange={(e) =>
                          setNewCustomer((prev) => ({
                            ...prev,
                            vatInfo: { ...prev.vatInfo, companyAddress: e.target.value },
                          }))
                        }
                        placeholder="Nhập địa chỉ ghi trên hóa đơn"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                isClosingDialogRef.current = true;
      closeDialog();
      setIsAddDialogOpen(false);
      setTimeout(() => {
        isClosingDialogRef.current = false;
      }, 100);
                setSearchParams({});
                setNewCustomer(createEmptyCustomerFormState());
              }}>
                  Hủy
                </Button>
                <Button onClick={handleAddCustomer} disabled={!newCustomer.name}>
                  Thêm Khách Hàng
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {/* Customer List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{customer.name}</CardTitle>
                    <CardDescription className="font-mono text-sm">
                      {customer.customer_code}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewCustomerDetail(customer)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCustomer(customer)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCustomer(customer)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {customer.phoneNumber && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {customer.phoneNumber}
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {customer.email}
                  </div>
                )}
                 {(customer.address || (customer as any).addressInfo) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                     <span className="truncate">{formatAddress(customer)}</span>
                  </div>
                )}
                {customer.vatInfo?.taxCode && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Receipt className="h-4 w-4" />
                    Mã số thuế: {customer.vatInfo.taxCode}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Tham gia: {customer.createdAt && customer.createdAt !== '' ? format(new Date(customer.createdAt), 'dd/MM/yyyy', { locale: vi }) : 'N/A'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {isLoading ? (
          <Card>
            <CardContent className="py-10 text-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Đang tải dữ liệu...</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredCustomers.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">
                {searchTerm ? "Không tìm thấy khách hàng nào" : "Chưa có khách hàng nào"}
              </p>
            </CardContent>
          </Card>
        )}
        {/* Edit Customer Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            isClosingDialogRef.current = true;
            closeDialog();
            setEditingCustomer(null);
            setEditCustomer(createEmptyCustomerFormState());
            setTimeout(() => {
              isClosingDialogRef.current = false;
            }, 100);
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chỉnh Sửa Khách Hàng</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin khách hàng
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-customer-code">Mã khách hàng</Label>
                <Input
                  id="edit-customer-code"
                  value={editCustomer.customer_code}
                  onChange={(e) => setEditCustomer(prev => ({ ...prev, customer_code: e.target.value }))}
                  placeholder="Mã khách hàng"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Tên khách hàng <span className="text-red-500">*</span></Label>
                <Input
                  id="edit-name"
                  value={editCustomer.name}
                  onChange={(e) => setEditCustomer({...editCustomer, name: e.target.value})}
                  placeholder="Nhập tên khách hàng"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Số điện thoại</Label>
                <Input
                  id="edit-phone"
                  value={editCustomer.phone}
                  onChange={(e) => setEditCustomer({...editCustomer, phone: e.target.value})}
                  placeholder="Nhập số điện thoại"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editCustomer.email}
                  onChange={(e) => setEditCustomer({...editCustomer, email: e.target.value})}
                  placeholder="Nhập email"
                />
              </div>
              <div className="grid gap-2">
                <Label>Địa chỉ</Label>
                <AddressFormSeparate
                  value={{
                    address: editCustomer.address,
                    provinceCode: editCustomer.addressInfo?.provinceCode,
                    districtCode: editCustomer.addressInfo?.districtCode,
                    wardCode: editCustomer.addressInfo?.wardCode,
                    provinceName: editCustomer.addressInfo?.provinceName,
                    districtName: editCustomer.addressInfo?.districtName,
                    wardName: editCustomer.addressInfo?.wardName
                  }}
                  onChange={(data) => {
                    setEditCustomer(prev => ({
                      ...prev,
                      address: data.address,
                      addressInfo: {
                        ...prev.addressInfo,
                        provinceCode: data.provinceCode,
                        districtCode: data.districtCode,
                        wardCode: data.wardCode,
                        provinceName: data.provinceName,
                        districtName: data.districtName,
                        wardName: data.wardName
                      }
                    }));
                  }}
                  required={false}
                />
              </div>
              <div className="space-y-3 rounded-lg border border-dashed border-border/60 bg-muted/20 p-4">
                <div>
                  <Label className="font-medium">Thông tin hóa đơn VAT</Label>
                  <p className="text-xs text-muted-foreground">
                    Cập nhật để đồng bộ với hệ thống xuất hóa đơn.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-vat-tax-code">Mã số thuế</Label>
                    <Input
                      id="edit-vat-tax-code"
                      value={editCustomer.vatInfo.taxCode}
                      onChange={(e) =>
                        setEditCustomer((prev) => ({
                          ...prev,
                          vatInfo: { ...prev.vatInfo, taxCode: e.target.value },
                        }))
                      }
                      placeholder="Ví dụ: 0123456789"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-vat-company-name">Tên công ty/đơn vị</Label>
                    <Input
                      id="edit-vat-company-name"
                      value={editCustomer.vatInfo.companyName}
                      onChange={(e) =>
                        setEditCustomer((prev) => ({
                          ...prev,
                          vatInfo: { ...prev.vatInfo, companyName: e.target.value },
                        }))
                      }
                      placeholder="Nhập tên công ty"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-vat-email">Email nhận hóa đơn</Label>
                    <Input
                      id="edit-vat-email"
                      type="email"
                      value={editCustomer.vatInfo.vatEmail}
                      onChange={(e) =>
                        setEditCustomer((prev) => ({
                          ...prev,
                          vatInfo: { ...prev.vatInfo, vatEmail: e.target.value },
                        }))
                      }
                      placeholder="vd: hoadon@abc.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-vat-company-phone">Số điện thoại công ty</Label>
                    <Input
                      id="edit-vat-company-phone"
                      value={editCustomer.vatInfo.companyPhone}
                      onChange={(e) =>
                        setEditCustomer((prev) => ({
                          ...prev,
                          vatInfo: { ...prev.vatInfo, companyPhone: e.target.value },
                        }))
                      }
                      placeholder="vd: +84987654321"
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="edit-vat-company-address">Địa chỉ công ty</Label>
                    <Textarea
                      id="edit-vat-company-address"
                      value={editCustomer.vatInfo.companyAddress}
                      onChange={(e) =>
                        setEditCustomer((prev) => ({
                          ...prev,
                          vatInfo: { ...prev.vatInfo, companyAddress: e.target.value },
                        }))
                      }
                      placeholder="Nhập địa chỉ ghi trên hóa đơn"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                isClosingDialogRef.current = true;
      closeDialog();
      setIsEditDialogOpen(false);
      setTimeout(() => {
        isClosingDialogRef.current = false;
      }, 100);
                setSearchParams({});
                setEditingCustomer(null);
                setEditCustomer(createEmptyCustomerFormState());
              }}>
                Hủy
              </Button>
              <Button onClick={handleUpdateCustomer} disabled={!editCustomer.name}>
                Cập Nhật
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Customer Detail Dialog */}
        <Dialog open={isCustomerDetailOpen} onOpenChange={(open) => {
          setIsCustomerDetailOpen(open);
          if (!open) {
            isClosingDialogRef.current = true;
            closeDialog();
            setSelectedCustomer(null);
            setTimeout(() => {
              isClosingDialogRef.current = false;
            }, 100);
          }
          if (!open) {
            setSearchParams({});
            setSelectedCustomer(null);
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chi Tiết Khách Hàng</DialogTitle>
              <DialogDescription>
                Thông tin và lịch sử giao dịch của {selectedCustomer?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedCustomer && (
              <div className="space-y-6">
                {/* Customer Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{selectedCustomer.name}</h3>
                        <p className="text-sm text-muted-foreground font-mono">{selectedCustomer.customer_code}</p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          {selectedCustomer.phoneNumber && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{selectedCustomer.phoneNumber}</span>
                            </div>
                          )}
                          {selectedCustomer.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span>{selectedCustomer.email}</span>
                            </div>
                          )}
                           {(selectedCustomer.address || (selectedCustomer as any).addressInfo) && (
                             <div className="flex items-center gap-2">
                               <MapPin className="h-4 w-4 text-muted-foreground" />
                               <span>{formatAddress(selectedCustomer)}</span>
                             </div>
                           )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Tham gia: {selectedCustomer.createdAt && selectedCustomer.createdAt !== '' ? format(new Date(selectedCustomer.createdAt), 'dd/MM/yyyy', { locale: vi }) : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      {selectedCustomer.vatInfo && (
                        <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                            <Receipt className="h-4 w-4" />
                            Thông tin VAT
                          </div>
                          <div className="mt-3 grid gap-2 text-sm">
                            {selectedCustomer.vatInfo.companyName && (
                              <div>
                                <span className="text-muted-foreground">Đơn vị: </span>
                                {selectedCustomer.vatInfo.companyName}
                              </div>
                            )}
                            {selectedCustomer.vatInfo.taxCode && (
                              <div>
                                <span className="text-muted-foreground">Mã số thuế: </span>
                                {selectedCustomer.vatInfo.taxCode}
                              </div>
                            )}
                            {selectedCustomer.vatInfo.companyAddress && (
                              <div>
                                <span className="text-muted-foreground">Địa chỉ: </span>
                                {selectedCustomer.vatInfo.companyAddress}
                              </div>
                            )}
                            {selectedCustomer.vatInfo.vatEmail && (
                              <div>
                                <span className="text-muted-foreground">Email hóa đơn: </span>
                                {selectedCustomer.vatInfo.vatEmail}
                              </div>
                            )}
                            {selectedCustomer.vatInfo.companyPhone && (
                              <div>
                                <span className="text-muted-foreground">SĐT công ty: </span>
                                {selectedCustomer.vatInfo.companyPhone}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                {/* Customer Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tổng Đơn Hàng</CardTitle>
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{customerStats.total_orders}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tổng Chi Tiêu</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {customerStats.total_spent.toLocaleString('vi-VN')}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Công Nợ</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${customerStats.current_debt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {customerStats.current_debt.toLocaleString('vi-VN')}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                {/* Order History */}
                <Card>
                  <CardHeader>
                    <CardTitle>Lịch Sử Đơn Hàng</CardTitle>
                    <CardDescription>
                      Danh sách tất cả đơn hàng của khách hàng
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {customerOrders.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mã Đơn Hàng</TableHead>
                            <TableHead>Ngày Tạo</TableHead>
                            <TableHead>Loại</TableHead>
                            <TableHead>Trạng Thái</TableHead>
                            <TableHead className="text-right">Tổng Tiền</TableHead>
                            <TableHead className="text-right">Đã Trả</TableHead>
                            <TableHead className="text-right">Còn Nợ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerOrders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium font-mono">
                                {order.order_number}
                              </TableCell>
                              <TableCell>
                                {order.created_at ? format(new Date(order.created_at), 'dd/MM/yyyy', { locale: vi }) : 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {order.order_type === 'sale' ? 'Bán hàng' : 'Khác'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(order.status)}
                              </TableCell>
                              <TableCell className="text-right">
                                {Number(order.total_amount).toLocaleString('vi-VN')}
                              </TableCell>
                              <TableCell className="text-right">
                                {Number(order.paid_amount ?? (order as any).initial_payment).toLocaleString('vi-VN')}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={Number(order.debt_amount) > 0 ? 'text-red-600' : 'text-green-600'}>
                                  {Number(order.debt_amount).toLocaleString('vi-VN')}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Khách hàng chưa có đơn hàng nào</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );

};

const Customers = () => {
    return (
      <PermissionGuard requiredPermissions={['CUSTOMERS_VIEW']} requireAll={false}>
        <CustomersContent />
      </PermissionGuard>
    );
  };

  export default Customers;