import React, { useState, useEffect } from 'react';
import './Revenue.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AdvancedCalendar } from '@/components/ui/advanced-calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { CalendarIcon, Filter, Download, TrendingUp, AlertCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { format as formatDate } from 'date-fns';
import { cn } from '@/lib/utils';
import { PermissionGuard } from '@/components/PermissionGuard';
import { customerApi } from '@/api/customer.api';
import { orderApi } from '@/api/order.api';
import { productApi } from '@/api/product.api';
import { categoriesApi } from '@/api/categories.api';
import { usersApi } from '@/api/users.api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
};

function RevenueContent() {
  const formatDateLocal = (d?: Date) => (d ? formatDate(d, 'yyyy-MM-dd') : undefined);
  // Filter states
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Date filters
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [createdFromDate, setCreatedFromDate] = useState<Date>();
  const [createdToDate, setCreatedToDate] = useState<Date>();
  const [completedFromDate, setCompletedFromDate] = useState<Date>();
  const [completedToDate, setCompletedToDate] = useState<Date>();
  
  // Value filters
  const [valueFrom, setValueFrom] = useState<string>("0");
  const [valueTo, setValueTo] = useState<string>("999,999,999");
  
  // Selection filters
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<string>("all");
  const [selectedOrderCreator, setSelectedOrderCreator] = useState<string>("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all");
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [selectedProductGroup, setSelectedProductGroup] = useState<string>("all");
  
  // Data states
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [debtData, setDebtData] = useState<any>({});
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(10);
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  // Check permissions
  const canReadRevenue = hasPermission('REVENUE_READ');
  const canViewProfit = hasPermission('REVENUE_PROFIT_VIEW');
  
  // Access to profit relies on permission only to avoid type errors on user role fields
  const canAccessProfit = !!user && canViewProfit;

  const fetchFilterData = async () => {
    try {
      const [customersResponse, productsResponse, categoriesResponse, usersResponse] = await Promise.all([
        customerApi.getCustomers({ page: 1, limit: 1000 }),
        productApi.getProducts({ page: 1, limit: 1000 }),
        categoriesApi.getCategories({ page: 1, limit: 1000 }),
        usersApi.getUsers({ page: 1, limit: 1000 })
      ]);
      
      setCustomers(customersResponse.customers || []);
      setProducts(productsResponse.products || []);
      setCategories(categoriesResponse.categories || []);
      setUsers(usersResponse.users || []);
    } catch (error) {
      console.error('Error fetching filter data:', error);
      throw error;
    }
  };

  const fetchRevenueData = async () => {
    try {
      setOrdersLoading(true);
      // Build API-supported query parameters
      const queryParams: any = {
        page: 1,
        limit: 1000,
      };

      // Date filters
      // Created date range -> startDate/endDate (prefer specific created range if provided)
      const createdStart = formatDateLocal(createdFromDate || startDate);
      const createdEnd = formatDateLocal(createdToDate || endDate);
      if (createdStart) queryParams.startDate = createdStart;
      if (createdEnd) queryParams.endDate = createdEnd;

      // Completed date range -> completedStartDate/completedEndDate
      const completedStart = formatDateLocal(completedFromDate);
      const completedEnd = formatDateLocal(completedToDate);
      if (completedStart) queryParams.completedStartDate = completedStart;
      if (completedEnd) queryParams.completedEndDate = completedEnd;

      // Value filters (backend expects minTotalAmount/maxTotalAmount)
      if (valueFrom && valueFrom !== "0") {
        queryParams.minTotalAmount = parseFloat(valueFrom.replace(/,/g, ''));
      }
      if (valueTo && valueTo !== "999,999,999") {
        queryParams.maxTotalAmount = parseFloat(valueTo.replace(/,/g, ''));
      }

      // Selection filters
      if (selectedCustomer !== "all") {
        queryParams.customerId = selectedCustomer;
      }
      // status supported by API (map UI -> backend)
      if (selectedOrderStatus !== "all") {
        const statusMapToBackend: Record<string, string> = {
          pending: 'draft',
          processing: 'processing',
          delivered: 'delivered',
          completed: 'completed',
          cancelled: 'cancelled',
        };
        const apiStatus = statusMapToBackend[selectedOrderStatus] || selectedOrderStatus;
        queryParams.status = apiStatus;
      }
      // Product category (backend: categories accepts CSV or array)
      if (selectedProductGroup !== 'all') {
        queryParams.categories = String(selectedProductGroup);
      }

      // Payment methods (backend: paymentMethods accepts CSV or array)
      if (selectedPaymentMethod !== 'all') {
        queryParams.paymentMethods = String(selectedPaymentMethod);
      }

      // Region (backend handles region based on receiver/customer province)
      if (selectedArea !== 'all') {
        queryParams.region = selectedArea;
      }

      // Other filters will be applied client-side below

      // Fetch orders data from backend API with filters
      console.log('[Revenue] Fetch orders with params:', queryParams);
      const ordersResponse = await orderApi.getOrders(queryParams);
      console.log('[Revenue] Received orders:', ordersResponse.total);
      let ordersData = ordersResponse.orders || [];

      // Apply client-side filters not supported by API
      ordersData = ordersData.filter((order) => {
        // Value range is now handled by backend (minTotalAmount/maxTotalAmount)
        
        // Creator
        if (selectedOrderCreator !== 'all' && String(order.created_by) !== String(selectedOrderCreator)) return false;

        // Payment method: already handled by backend when selectedPaymentMethod !== 'all'
        if (selectedPaymentMethod !== 'all') {
          // Do not re-filter here to avoid dropping valid BE results
        }

        // Region: already handled by backend

        // Product and Category by items
        if (selectedProduct !== 'all') {
          const hasProduct = (order.items || order.order_items || []).some((it: any) => String(it.product_id) === String(selectedProduct));
          if (!hasProduct) return false;
        }
        if (selectedProductGroup !== 'all') {
          // Category filter sent to backend via categories param; skip client-side item check to avoid false negatives
        }

        // Completed date range if available
        if (completedFromDate || completedToDate) {
          const completedAt = order.updated_at || order.created_at;
          const d = completedAt ? new Date(completedAt) : null;
          if (!d) return false;
          if (completedFromDate && d < new Date(completedFromDate.setHours(0,0,0,0))) return false;
          if (completedToDate && d > new Date(completedToDate.setHours(23,59,59,999))) return false;
        }

        return true;
      });
      
      // Store orders for detailed view and reset pagination
      setOrders(ordersData);
      setCurrentPage(1);

      // Calculate revenue by month from filtered orders
      const monthlyRevenue: any = {};
      let totalDebt = 0;
      let totalRevenue = 0;

      // Process orders to calculate revenue and debt
      ordersData.forEach(order => {
        const orderDate = new Date(order.created_at);
        const month = format(orderDate, 'MMM', { locale: vi });
        const year = orderDate.getFullYear();
        const key = `${month}-${year}`;

        if (!monthlyRevenue[key]) {
          monthlyRevenue[key] = {
            month: month,
            year: year,
            revenue: 0,
            debt: 0,
            orderCount: 0,
            paymentCount: 0
          };
        }

        // Add total amount to revenue (use total_amount as revenue)
        const orderAmount = order.total_amount || 0;
        monthlyRevenue[key].revenue += orderAmount;
        monthlyRevenue[key].orderCount += 1;
        totalRevenue += orderAmount;

        // Add debt amount
        monthlyRevenue[key].debt += order.debt_amount || 0;
        totalDebt += order.debt_amount || 0;
      });

      // Convert to array and sort by date
      const revenueArray = Object.values(monthlyRevenue).sort((a: any, b: any) => {
        const dateA = new Date(a.year, getMonthIndex(a.month)).getTime();
        const dateB = new Date(b.year, getMonthIndex(b.month)).getTime();
        return dateA - dateB;
      });
      
      setRevenueData(revenueArray);
      setDebtData({
        totalRevenue,
        totalDebt,
        totalProfit: 0, // Profit calculation removed - let backend handle
        debtRatio: totalRevenue > 0 ? (totalDebt / totalRevenue) * 100 : 0,
        profitMargin: 0 // Profit margin removed - let backend handle
      });

    } catch (error) {
      console.error('Error fetching revenue data:', error);
        toast({
          title: "Lỗi",
          description: error.response?.data?.message || error.message || "Không thể tải dữ liệu doanh thu",
          variant: "destructive",
        });
      throw error; // Re-throw for lazy loading error handling
    } finally {
      setOrdersLoading(false);
    }
  };

  // Load data when permissions are available
  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchFilterData(), fetchRevenueData()]);
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [canReadRevenue]);

  const getMonthIndex = (monthName: string) => {
    const months = ['Thg 1', 'Thg 2', 'Thg 3', 'Thg 4', 'Thg 5', 'Thg 6', 
                   'Thg 7', 'Thg 8', 'Thg 9', 'Thg 10', 'Thg 11', 'Thg 12'];
    return months.indexOf(monthName);
  };

  const handleFilter = () => {
    setCurrentPage(1); // Reset to first page when applying filters
    fetchRevenueData();
    
    // Build filter description
    const filterDescriptions = [];
    
    if (startDate || endDate) {
      filterDescriptions.push(`Thời gian: ${startDate ? format(startDate, 'dd/MM/yyyy', { locale: vi }) : 'không xác định'} - ${endDate ? format(endDate, 'dd/MM/yyyy', { locale: vi }) : 'không xác định'}`);
    }
    
    if (selectedCustomer !== 'all') {
      const customer = customers.find(c => c.id === selectedCustomer);
      filterDescriptions.push(`Khách hàng: ${customer?.name || 'Không xác định'}`);
    }
    
    if (selectedProduct !== 'all') {
      const product = products.find(p => p.id === selectedProduct);
      filterDescriptions.push(`Sản phẩm: ${product?.name || 'Không xác định'}`);
    }
    
    if (selectedOrderStatus !== 'all') {
      const statusMap: { [key: string]: string } = {
        'pending': 'Chờ xử lý',
        'processing': 'Đang xử lý',
        'completed': 'Hoàn thành',
        'cancelled': 'Đã hủy'
      };
      filterDescriptions.push(`Trạng thái: ${statusMap[selectedOrderStatus] || selectedOrderStatus}`);
    }
    
    if (valueFrom !== "0" || valueTo !== "999,999,999") {
      filterDescriptions.push(`Giá trị: ${valueFrom} - ${valueTo} VNĐ`);
    }
    
    const description = filterDescriptions.length > 0 
      ? `Áp dụng bộ lọc: ${filterDescriptions.join(', ')}`
      : 'Áp dụng bộ lọc mặc định';
    
    toast({
      title: "Bộ lọc được áp dụng",
      description: description,
    });
  };

  const resetFilter = () => {
    // Reset all filters
    setSelectedCustomer("all");
    setSelectedProduct("all");
    setSelectedOrderStatus("all");
    setSelectedOrderCreator("all");
    setSelectedPaymentMethod("all");
    setSelectedArea("all");
    setSelectedProductGroup("all");
    setStartDate(undefined);
    setEndDate(undefined);
    setCreatedFromDate(undefined);
    setCreatedToDate(undefined);
    setCompletedFromDate(undefined);
    setCompletedToDate(undefined);
    setValueFrom("0");
    setValueTo("999,999,999");
    setCurrentPage(1); // Reset pagination
    fetchRevenueData();
  };

  // Pagination logic
  const totalPages = Math.ceil(orders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const currentOrders = orders.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Đang tải dữ liệu doanh thu...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Báo Cáo Doanh Thu</h1>
        <p className="text-muted-foreground">
          Theo dõi và phân tích doanh thu theo thời gian
        </p>
      </div>

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Bộ Lọc Báo Cáo
          </CardTitle>
          <CardDescription>
            Lọc dữ liệu theo khoảng thời gian và khách hàng
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
            {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Từ ngày</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'dd/MM/yyyy', { locale: vi }) : "Chọn ngày"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 revenue-calendar-popover overflow-visible" align="start" side="bottom" sideOffset={8} avoidCollisions={true} collisionPadding={16}>
                  <AdvancedCalendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="rounded-md border bg-background p-2"
                    showYearMonthPicker={true}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Đến ngày</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'dd/MM/yyyy', { locale: vi }) : "Chọn ngày"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 revenue-calendar-popover overflow-visible" align="start" side="bottom" sideOffset={8} avoidCollisions={true} collisionPadding={16}>
                  <AdvancedCalendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="rounded-md border bg-background p-2"
                    showYearMonthPicker={true}
                  />
                </PopoverContent>
              </Popover>
            </div>
            </div>

              {/* Creation Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ngày tạo từ</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !createdFromDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {createdFromDate ? format(createdFromDate, 'dd/MM/yyyy', { locale: vi }) : "Chọn ngày"}
                      </Button>
                    </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 revenue-calendar-popover overflow-visible" align="start" side="bottom" sideOffset={8} avoidCollisions={true} collisionPadding={16}>
                  <AdvancedCalendar
                    mode="single"
                    selected={createdFromDate}
                    onSelect={setCreatedFromDate}
                    initialFocus
                    className="rounded-md border bg-background p-2"
                    showYearMonthPicker={true}
                  />
                </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Ngày tạo đến</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !createdToDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {createdToDate ? format(createdToDate, 'dd/MM/yyyy', { locale: vi }) : "Chọn ngày"}
                      </Button>
                    </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 revenue-calendar-popover overflow-visible" align="start" side="bottom" sideOffset={8} avoidCollisions={true} collisionPadding={16}>
                  <AdvancedCalendar
                    mode="single"
                    selected={createdToDate}
                    onSelect={setCreatedToDate}
                    initialFocus
                    className="rounded-md border bg-background p-2"
                    showYearMonthPicker={true}
                  />
                </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Completion Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ngày hoàn thành từ</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !completedFromDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {completedFromDate ? format(completedFromDate, 'dd/MM/yyyy', { locale: vi }) : "Chọn ngày"}
                      </Button>
                    </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 revenue-calendar-popover overflow-visible" align="start" side="bottom" sideOffset={8} avoidCollisions={true} collisionPadding={16}>
                  <AdvancedCalendar
                    mode="single"
                    selected={completedFromDate}
                    onSelect={setCompletedFromDate}
                    initialFocus
                    className="rounded-md border bg-background p-2"
                    showYearMonthPicker={true}
                  />
                </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Ngày hoàn thành đến</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !completedToDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {completedToDate ? format(completedToDate, 'dd/MM/yyyy', { locale: vi }) : "Chọn ngày"}
                      </Button>
                    </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 revenue-calendar-popover overflow-visible" align="start" side="bottom" sideOffset={8} avoidCollisions={true} collisionPadding={16}>
                  <AdvancedCalendar
                    mode="single"
                    selected={completedToDate}
                    onSelect={setCompletedToDate}
                    initialFocus
                    className="rounded-md border bg-background p-2"
                    showYearMonthPicker={true}
                  />
                </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Value Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Giá trị từ (VNĐ)</Label>
                  <Input
                    value={valueFrom}
                    onChange={(e) => setValueFrom(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Giá trị đến (VNĐ)</Label>
                  <Input
                    value={valueTo}
                    onChange={(e) => setValueTo(e.target.value)}
                    placeholder="999,999,999"
                  />
                </div>
              </div>

              {/* Product and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sản phẩm</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn sản phẩm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả sản phẩm</SelectItem>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.code} - {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Trạng thái đơn hàng</Label>
                  <Select value={selectedOrderStatus} onValueChange={setSelectedOrderStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả trạng thái</SelectItem>
                      <SelectItem value="pending">Chờ xử lý</SelectItem>
                      <SelectItem value="processing">Đang xử lý</SelectItem>
                      <SelectItem value="completed">Hoàn thành</SelectItem>
                      <SelectItem value="cancelled">Đã hủy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Order Creator and Customer */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Người tạo đơn</Label>
                  <Select value={selectedOrderCreator} onValueChange={setSelectedOrderCreator}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn nhân viên" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả nhân viên</SelectItem>
                      {users.map((user) => {
                        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                        const label = fullName || user.email || 'Không xác định';
                        return (
                          <SelectItem key={user.id} value={user.id}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

            <div className="space-y-2">
              <Label>Khách hàng</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn khách hàng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả khách hàng</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.customer_code} - {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
                </div>
            </div>

              {/* Payment Method and Area */}
              <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                  <Label>Phương thức thanh toán</Label>
                  <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn phương thức" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả phương thức</SelectItem>
                      <SelectItem value="cash">Tiền mặt</SelectItem>
                      <SelectItem value="bank_transfer">Chuyển khoản</SelectItem>
                      <SelectItem value="credit_card">Thẻ tín dụng</SelectItem>
                      <SelectItem value="debit_card">Thẻ ghi nợ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Khu vực</Label>
                  <Select value={selectedArea} onValueChange={setSelectedArea}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn khu vực" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả khu vực</SelectItem>
                      <SelectItem value="north">Miền Bắc</SelectItem>
                      <SelectItem value="central">Miền Trung</SelectItem>
                      <SelectItem value="south">Miền Nam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Product Group */}
              <div className="space-y-2">
                <Label>Nhóm sản phẩm</Label>
                <Select value={selectedProductGroup} onValueChange={setSelectedProductGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn nhóm sản phẩm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả nhóm</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Actions */}
              <div className="flex gap-2 pt-4">
                <Button onClick={handleFilter} className="flex-1">
                  <Filter className="w-4 h-4 mr-2" />
                  Lọc
                </Button>
                <Button variant="outline" onClick={resetFilter}>
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tổng Doanh Thu
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(debtData.totalRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Doanh thu từ thanh toán thực tế
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tổng Công Nợ
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(debtData.totalDebt || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {debtData.debtRatio ? `${debtData.debtRatio.toFixed(1)}% doanh thu` : 'Không có công nợ'}
            </p>
          </CardContent>
        </Card>
        
         {canAccessProfit && (
           <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">
                 Tổng Lãi
               </CardTitle>
               <DollarSign className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-green-600">{formatCurrency(debtData.totalProfit || 0)}</div>
               <p className="text-xs text-muted-foreground">
                 {debtData.profitMargin ? `Tỷ suất lãi: ${debtData.profitMargin.toFixed(1)}%` : 'Chưa có dữ liệu'}
               </p>
             </CardContent>
           </Card>
         )}
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Số Đơn Hàng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenueData.reduce((sum, item) => sum + (item.paymentCount || 0), 0)}</div>
            <p className="text-xs text-muted-foreground">
              Số lượt thanh toán
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Trung Bình/Tháng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(revenueData.length > 0 ? (debtData.totalRevenue || 0) / revenueData.length : 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Doanh thu trung bình
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Biểu Đồ Doanh Thu Theo Tháng</CardTitle>
              <CardDescription>
                So sánh doanh thu thực tế với mục tiêu
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Xuất Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => {
                if (value >= 1000000) {
                  return `${(value / 1000000).toFixed(1)}M`;
                } else if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}K`;
                } else {
                  return value.toString();
                }
              }} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Doanh thu" />
              <Bar dataKey="debt" fill="hsl(var(--destructive))" name="Công nợ" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Xu Hướng Doanh Thu</CardTitle>
          <CardDescription>
            Đường xu hướng doanh thu qua các tháng
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => {
                if (value >= 1000000) {
                  return `${(value / 1000000).toFixed(1)}M`;
                } else if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}K`;
                } else {
                  return value.toString();
                }
              }} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Doanh thu"
              />
              <Line 
                type="monotone" 
                dataKey="debt" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                name="Công nợ"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Customer Revenue Breakdown - if specific customer selected */}
      {selectedCustomer !== "all" && (
        <Card>
          <CardHeader>
            <CardTitle>Chi Tiết Doanh Thu Khách Hàng</CardTitle>
            <CardDescription>
              Phân tích chi tiết cho {customers.find(c => c.id === selectedCustomer)?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>Dữ liệu chi tiết sẽ được hiển thị khi có đơn hàng thực tế</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Detail Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Chi Tiết Đơn Hàng</CardTitle>
              <CardDescription>
                Danh sách đầy đủ các đơn hàng theo bộ lọc đã chọn
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Hiển thị {startIndex + 1}-{Math.min(endIndex, orders.length)} trong {orders.length} đơn hàng
              </span>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Xuất Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Đang tải dữ liệu đơn hàng...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Không có đơn hàng nào phù hợp với bộ lọc đã chọn</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã đơn hàng</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Phương thức TT</TableHead>
                    <TableHead className="text-center">Ngày hoàn thành</TableHead>
                    <TableHead>Tổng tiền</TableHead>
                    <TableHead>Công nợ</TableHead>
                    <TableHead>Người tạo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentOrders.map((order) => {
                    const customer = customers.find(c => c.id === order.customer_id);
                    const creator = users.find(u => u.id === order.created_by);
                    
                    const getCreatorName = () => {
                      // Try to get from users list first
                      if (creator) {
                        const fullName = `${creator.firstName || ''} ${creator.lastName || ''}`.trim();
                        // Only show email if no name is available
                        if (fullName) {
                          return fullName;
                        }
                        return creator.email || 'Không xác định';
                      }
                      
                      // Fallback to order.creator if available
                      if (order.creator) {
                        const fullName = `${order.creator.firstName || ''} ${order.creator.lastName || ''}`.trim();
                        // Only show email if no name is available
                        if (fullName) {
                          return fullName;
                        }
                        return order.creator.email || 'Không xác định';
                      }
                      
                      return 'Không xác định';
                    };
                    
                    const getStatusBadge = (status: string) => {
                      const statusMap: { [key: string]: { label: string; variant: "default" | "secondary" | "destructive" | "outline" } } = {
                        'pending': { label: 'Chờ xử lý', variant: 'secondary' },
                        'processing': { label: 'Đang xử lý', variant: 'default' },
                        'completed': { label: 'Hoàn thành', variant: 'outline' },
                        'cancelled': { label: 'Đã hủy', variant: 'destructive' }
                      };
                      const statusInfo = statusMap[status] || { label: status, variant: 'default' };
                      return (
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                      );
                    };

                    const getPaymentMethodLabel = (method: string) => {
                      const methodMap: { [key: string]: string } = {
                        'cash': 'Tiền mặt',
                        'bank_transfer': 'Chuyển khoản',
                        'credit_card': 'Thẻ tín dụng',
                        'debit_card': 'Thẻ ghi nợ'
                      };
                      return methodMap[method] || method;
                    };

                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.order_number || `#${order.id.slice(-8)}`}
                        </TableCell>
                        <TableCell>
                          {customer ? `${customer.customer_code} - ${customer.name}` : 'Không xác định'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.status)}
                        </TableCell>
                        <TableCell>
                          {getPaymentMethodLabel(order.payment_method)}
                        </TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const completedAt = order.completed_at || order.updated_at;
                            const showCompleted = ['delivered','completed'].includes(order.status);
                            return showCompleted && completedAt
                              ? format(new Date(completedAt), 'dd/MM/yyyy HH:mm', { locale: vi })
                              : '-';
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(order.total_amount || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={order.debt_amount > 0 ? 'text-red-600' : 'text-green-600'}>
                            {formatCurrency(order.debt_amount || 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getCreatorName()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination */}
          {orders.length > ordersPerPage && (
            <div className="flex justify-center mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Revenue() {
  return (
    <PermissionGuard requiredPermissions={['REVENUE_VIEW']}>
      <RevenueContent />
    </PermissionGuard>
  );
}

