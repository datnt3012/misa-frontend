import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  Trash2
} from "lucide-react";
import { customerApi } from "@/api/customer.api";
import { useToast } from "@/hooks/use-toast";
import { useRouteBasedLazyData } from "@/hooks/useLazyData";
import { Loading } from "@/components/ui/loading";
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

interface Customer {
  id: string;
  customer_code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

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

const Customers = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
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

  // Form states
  const [newCustomer, setNewCustomer] = useState({
    customer_code: "",
    name: "",
    phone: "",
    email: "",
    address: ""
  });

  const [editCustomer, setEditCustomer] = useState({
    customer_code: "",
    name: "",
    phone: "",
    email: "",
    address: ""
  });

  // Lazy loading configuration
  const lazyData = useRouteBasedLazyData({
    customers: {
      loadFunction: async () => {
        try {
          const resp = await customerApi.getCustomers({ page: 1, limit: 1000 });
          setCustomers(resp.customers || []);
        } catch (error) {
          console.error('Error fetching customers:', error);
          toast({
            title: "Lỗi",
            description: "Không thể tải danh sách khách hàng",
            variant: "destructive",
          });
          throw error; // Re-throw for lazy loading error handling
        }
      }
    }
  });

  // Restore form state from URL parameters after page reload
  useEffect(() => {
    const action = searchParams.get('action');
    const customerId = searchParams.get('customerId');
    
    if (action === 'add') {
      setIsAddDialogOpen(true);
    } else if (action === 'edit' && customerId) {
      // Find customer and open edit dialog
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        handleEditCustomer(customer);
      }
    } else if (action === 'view' && customerId) {
      // Find customer and open detail dialog
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        handleViewCustomerDetail(customer);
      }
    }
  }, [customers, searchParams]);

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
      console.error('Error fetching customer orders:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải lịch sử đơn hàng",
        variant: "destructive",
      });
    }
  };

  const handleAddCustomer = async () => {
    try {
      const insertData: any = {
        name: newCustomer.name,
        phoneNumber: newCustomer.phone || null,
        email: newCustomer.email || null,
        address: newCustomer.address || null
      };

      // Backend will auto-generate customer code

      const data = await customerApi.createCustomer(insertData);

      setCustomers([data, ...customers]);
      setNewCustomer({ customer_code: "", name: "", phone: "", email: "", address: "" });
      setIsAddDialogOpen(false);
      // Clear URL parameters
      setSearchParams({});
      
      toast({
        title: "Thành công",
        description: `Đã thêm khách hàng ${data.name} với mã ${data.customer_code}`,
      });
    } catch (error) {
      console.error('Error adding customer:', error);
      toast({
        title: "Lỗi",
        description: "Không thể thêm khách hàng",
        variant: "destructive",
      });
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditCustomer({
      customer_code: customer.customer_code,
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || ""
    });
    setIsEditDialogOpen(true);
    // Save state to URL
    setSearchParams({ action: 'edit', customerId: customer.id });
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer) return;

    try {
      await customerApi.updateCustomer(editingCustomer.id, {
        name: editCustomer.name,
        phoneNumber: editCustomer.phone || null,
        email: editCustomer.email || null,
        address: editCustomer.address || null
      });

      // Reload customers to get updated data
      await fetchCustomers();
      setIsEditDialogOpen(false);
      setEditingCustomer(null);
      // Clear URL parameters
      setSearchParams({});
      
      toast({
        title: "Thành công",
        description: `Đã cập nhật thông tin khách hàng ${data.name}`,
      });
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật thông tin khách hàng",
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
      console.error('Error deleting customer:', error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa khách hàng. Có thể khách hàng đã có đơn hàng.",
        variant: "destructive",
      });
    }
  };

  const handleViewCustomerDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    fetchCustomerOrders(customer.id);
    setIsCustomerDetailOpen(true);
    // Save state to URL
    setSearchParams({ action: 'view', customerId: customer.id });
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'pending': { variant: 'secondary' as const, text: 'Chờ xử lý' },
      'confirmed': { variant: 'default' as const, text: 'Đã xác nhận' },
      'shipping': { variant: 'default' as const, text: 'Đang giao' },
      'delivered': { variant: 'default' as const, text: 'Đã giao' },
      'cancelled': { variant: 'destructive' as const, text: 'Đã hủy' }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { variant: 'secondary' as const, text: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>;
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customer_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const customersState = lazyData.getDataState('customers');
  
  if (customersState.isLoading || customersState.error) {
    return (
      <Loading 
        message="Đang tải danh sách khách hàng..."
        error={customersState.error}
        onRetry={() => lazyData.reloadData('customers')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
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
              setSearchParams({ action: 'add' });
            } else {
              setSearchParams({});
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Thêm Khách Hàng
              </Button>
            </DialogTrigger>
            <DialogContent>
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
                  <Label htmlFor="name">Tên khách hàng *</Label>
                  <Input
                    id="name"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                    placeholder="Nhập tên khách hàng"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    placeholder="Nhập số điện thoại"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                    placeholder="Nhập email"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Địa chỉ</Label>
                  <Textarea
                    id="address"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                    placeholder="Nhập địa chỉ"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsAddDialogOpen(false);
                setSearchParams({});
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
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {customer.phone}
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {customer.email}
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{customer.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Tham gia: {customer.created_at ? format(new Date(customer.created_at), 'dd/MM/yyyy', { locale: vi }) : 'N/A'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCustomers.length === 0 && (
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
            setSearchParams({});
            setEditingCustomer(null);
          }
        }}>
          <DialogContent>
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
                <Label htmlFor="edit-name">Tên khách hàng *</Label>
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
                <Label htmlFor="edit-address">Địa chỉ</Label>
                <Textarea
                  id="edit-address"
                  value={editCustomer.address}
                  onChange={(e) => setEditCustomer({...editCustomer, address: e.target.value})}
                  placeholder="Nhập địa chỉ"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                setSearchParams({});
                setEditingCustomer(null);
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        {selectedCustomer.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedCustomer.phone}</span>
                          </div>
                        )}
                        {selectedCustomer.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedCustomer.email}</span>
                          </div>
                        )}
                        {selectedCustomer.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedCustomer.address}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Tham gia: {selectedCustomer.created_at ? format(new Date(selectedCustomer.created_at), 'dd/MM/yyyy', { locale: vi }) : 'N/A'}</span>
                        </div>
                      </div>
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
                        {customerStats.total_spent.toLocaleString('vi-VN')} ₫
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
                        {customerStats.current_debt.toLocaleString('vi-VN')} ₫
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
                                {Number(order.total_amount).toLocaleString('vi-VN')} ₫
                              </TableCell>
                              <TableCell className="text-right">
                                {Number(order.initial_payment || order.paid_amount).toLocaleString('vi-VN')} ₫
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={Number(order.debt_amount) > 0 ? 'text-red-600' : 'text-green-600'}>
                                  {Number(order.debt_amount).toLocaleString('vi-VN')} ₫
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

export default Customers;
