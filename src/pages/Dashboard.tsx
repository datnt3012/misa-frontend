import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Line, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, TrendingUp, ShoppingCart, AlertTriangle, Wallet, Boxes, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { dashboardApi } from "@/api/dashboard.api";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGuard } from "@/components/PermissionGuard";
import { Loading } from "@/components/ui/loading";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OrderViewDialog } from "@/components/orders/OrderViewDialog";
import { getOrderStatusConfig } from "@/constants/order-status.constants";
import { Badge } from "@/components/ui/badge";
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0
  }).format(value);
};
// Component to display permission error messages
const PermissionErrorCard = ({ title, error, loading }: { title: string; error: string | null; loading: boolean }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Đang tải...</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Lock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  return null;
};
const DashboardContent = () => {
  const { user } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  // Permission checks for different data sections
  const canViewOrders = hasPermission('ORDERS_READ');
  const canViewProducts = hasPermission('PRODUCTS_READ');
  const canViewInventory = hasPermission('STOCK_LEVELS_READ');
  const canViewRevenue = hasPermission('REVENUE_READ');
  // Gate: only admin, owner_director, chief_accountant can see total revenue
  const canSeeTotalRevenue = canViewRevenue && (
    (user as any)?.roleId === 'admin' || (user as any)?.roleId === 'owner_director' || (user as any)?.roleId === 'chief_accountant'
  );
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
    totalDebt: 0,
    totalProfit: 0,
    totalProducts: 0,
    totalOrders: 0,
    currentMonthRevenue: 0,
    previousMonthRevenue: 0,
    currentProfit: 0,
    previousProfit: 0,
    currentProfitRevenue: 0,
    previousProfitRevenue: 0,
    totalExpenses: 0,
    totalInventoryValue: 0,
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [orderStatus, setOrderStatus] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [productStockData, setProductStockData] = useState<any[]>([]);
  const [regionRevenue, setRegionRevenue] = useState<any[]>([]);
  const [categoryProfit, setCategoryProfit] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentOrdersLimit, setRecentOrdersLimit] = useState<number>(5);
  const [newCustomers, setNewCustomers] = useState<number>(0);
  // Period toggle: 'month' or 'year'
  const [revenuePeriod, setRevenuePeriod] = useState<'month' | 'year'>('month');
  const [profitPeriod, setProfitPeriod] = useState<'month' | 'year'>('month');
  // Order detail dialog state
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderDetailDialogOpen, setOrderDetailDialogOpen] = useState<boolean>(false);
  // Track loading and error states for different sections
  const [loadingStates, setLoadingStates] = useState({
    orders: false,
    products: false,
    inventory: false,
    revenue: false
  });
  const [errorStates, setErrorStates] = useState({
    orders: null as string | null,
    products: null as string | null,
    inventory: null as string | null,
    revenue: null as string | null
  });
  // Track if data has been loaded
  const [dataLoaded, setDataLoaded] = useState(false);
  // Clear error states when permissions are available
  useEffect(() => {
    if (canViewOrders && canViewProducts && canViewInventory && canViewRevenue) {
      setErrorStates({ orders: null, products: null, inventory: null, revenue: null });
    }
  }, [canViewOrders, canViewProducts, canViewInventory, canViewRevenue]);
  const fetchDashboardData = async () => {
    try {
      // Don't fetch data if permissions are still loading
      if (permissionsLoading) {
        return;
      }
      setLoadingStates({ orders: true, products: true, inventory: true, revenue: true });
      setErrorStates({ orders: null, products: null, inventory: null, revenue: null });
      // Fetch all dashboard data from backend APIs
      const [summary, revenueSeries, orderStatusData, inventoryOverview, topProductsData, topCustomersData, regionRevenueData, categoryProfitData, recentOrdersData, recentActivitiesData] = await Promise.all([
        dashboardApi.getSummary({ revenuePeriod, profitPeriod }),
        dashboardApi.getRevenueSeries(),
        dashboardApi.getOrderStatus(),
        dashboardApi.getInventoryOverview(),
        dashboardApi.getTopProducts(5),
        dashboardApi.getTopCustomers(5),
        dashboardApi.getRegionRevenue(5),
        dashboardApi.getCategoryProfit(5),
        dashboardApi.getRecentOrders(10),
        dashboardApi.getRecentActivities(8),
      ]);
      // Debug: Log API responses
      // Set summary data - merge with previous state to ensure all properties exist
      setDashboardData(prev => ({
        ...prev,
        ...summary,
      }));
      // Set revenue data - need to add colors
      // Ensure revenueSeries is an array before mapping
      const revenueWithColors = (revenueSeries || []).map((item, idx) => ({
        ...item,
        month: format(new Date(item.year, item.monthNumber, 1), 'MMM-yyyy', { locale: vi }),
      }));
      setRevenueData(revenueWithColors);
      // Set order status data - need to format to array
      // Ensure orderStatusData is an object before processing
      const orderStatusArray = Object.entries(orderStatusData || {}).map(([key, value]) => {
        const config = getOrderStatusConfig(key.toLowerCase());
        return {
          trangThai: config.label,
          soLuong: value,
        };
      });
      setOrderStatus(orderStatusArray);
      // Set inventory data
      // Ensure inventoryOverview exists before accessing properties
      if (inventoryOverview) {
        setInventoryData(inventoryOverview.inventoryData || []);
        setLowStockProducts(inventoryOverview.lowStockProducts || []);
        setProductStockData(inventoryOverview.productStockData || []);
        } else {
        setInventoryData([]);
        setLowStockProducts([]);
        setProductStockData([]);
        }
      // Set top products
      setTopProducts(topProductsData || []);
      // Set top customers
      setTopCustomers(topCustomersData || []);
      // Set region revenue
      setRegionRevenue(regionRevenueData || []);
      // Set category profit - need to add colors
      // Ensure categoryProfitData is an array before mapping
      const palette = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6'];
      const catArray = (categoryProfitData || []).map((c, idx) => ({
        ...c,
        color: palette[idx % palette.length],
        fill: palette[idx % palette.length],
      }));
      setCategoryProfit(catArray);
      // Set recent orders
      setRecentOrders(recentOrdersData || []);
      // Set recent activities
      setRecentActivities(recentActivitiesData || []);
      // Calculate new customers count from summary revenue period
      const today = new Date();
      const pStart = revenuePeriod === 'month' 
        ? new Date(today.getFullYear(), today.getMonth(), 1)
        : new Date(today.getFullYear(), 0, 1);
      const pEnd = revenuePeriod === 'month'
        ? new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
        : new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
      // Note: New customers count is not available from backend, setting to 0
      setNewCustomers(0);
      // Set all loading states to false
      setLoadingStates({ orders: false, products: false, inventory: false, revenue: false });
      setDataLoaded(true); // Mark data as loaded
    } catch (error: any) {
      // Set all loading states to false and show error
      setLoadingStates({ orders: false, products: false, inventory: false, revenue: false });
      let errorMessage = 'Lỗi tải dữ liệu dashboard';
      if (error?.response?.status === 403) {
        errorMessage = 'Không có quyền truy cập dashboard';
      } else if (error?.response?.status === 401) {
        errorMessage = 'Phiên đăng nhập đã hết hạn';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      setErrorStates({ 
        orders: errorMessage, 
        products: errorMessage, 
        inventory: errorMessage,
        revenue: errorMessage
      });
      // Mark data as loaded even on error to prevent infinite loading
      setDataLoaded(true);
    }
  };
  // Trigger data fetch when permissions are loaded or period changes
  useEffect(() => {
    if (!permissionsLoading) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsLoading, revenuePeriod, profitPeriod]);
  const getGrowthPercentage = () => {
    if (!dashboardData) return 0;
    const delta = (dashboardData.currentMonthRevenue || 0) - (dashboardData.previousMonthRevenue || 0);
    if (delta <= 0) return 0;
    if ((dashboardData.previousMonthRevenue || 0) === 0) return 0;
    return Math.round((delta / (dashboardData.previousMonthRevenue || 1)) * 100);
  };
  // Show loading if permissions are still loading
  if (permissionsLoading) {
    return (
      <Loading 
        message="Đang tải dữ liệu dashboard..."
      />
    );
  }
  // Show loading if data is being fetched for the first time
  // Only show loading when loading AND data hasn't been loaded yet
  // This prevents NaN errors and allows rendering when data is loaded
  const isInitialLoading = !dataLoaded && (loadingStates.revenue || loadingStates.orders || loadingStates.products || loadingStates.inventory);
  if (isInitialLoading) {
    return (
      <Loading 
        message="Đang tải dữ liệu dashboard..."
      />
    );
  }
  // Safeguard: ensure dashboardData exists before rendering
  if (!dashboardData) {
    return (
      <Loading 
        message="Đang tải dữ liệu dashboard..."
      />
    );
  }
  return (
    <div className="min-h-screen bg-background space-y-4 p-6 sm:p-6 md:p-7">
      <div className="mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Quản Lý</h1>
            <p className="text-muted-foreground">Tổng quan hoạt động kinh doanh</p>
          </div>
        </div>
        {/* Thống kê tổng quan */}
        {/* Hàng 1: Tối đa 4 card, tự động co giãn */}
        <div className="flex flex-col md:flex-row md:flex-wrap gap-4">
          {/* Tổng Doanh Thu - gated */}
          {errorStates.revenue || loadingStates.revenue ? (
            <PermissionErrorCard 
              title="Tổng Doanh Thu" 
              error={errorStates.revenue} 
              loading={loadingStates.revenue} 
            />
          ) : (
            canSeeTotalRevenue && (
              <Card className="flex-1 min-w-0 md:flex-[1_1_calc(25%-12px)]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tổng Doanh Thu</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(dashboardData.currentMonthRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getGrowthPercentage() >= 0 ? '+' : ''}{getGrowthPercentage()}% so với tháng trước
                  </p>
                </CardContent>
              </Card>
            )
          )}
          {/* Tổng doanh thu - visible to all who can view revenue section */}
          <Card className="flex-1 min-w-0 md:flex-[1_1_calc(25%-12px)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
              <Select value={revenuePeriod} onValueChange={(v) => setRevenuePeriod(v as 'month' | 'year')}>
                <SelectTrigger className="h-7 w-auto px-2 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Tháng</SelectItem>
                  <SelectItem value="year">Năm</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(dashboardData.currentMonthRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {(() => {
                  const delta = dashboardData.currentMonthRevenue - dashboardData.previousMonthRevenue;
                  if (delta <= 0) {
                    return `0 so với ${revenuePeriod === 'month' ? 'tháng' : 'năm'} trước`;
                  }
                  const revenueGrowth = dashboardData.previousMonthRevenue === 0 
                    ? 0 
                    : (delta / dashboardData.previousMonthRevenue) * 100;
                  return `${revenueGrowth >= 0 ? '+' : ''}${Math.round(revenueGrowth)}% so với ${revenuePeriod === 'month' ? 'tháng' : 'năm'} trước`;
                })()}
              </p>
            </CardContent>
          </Card>
          {/* Lợi nhuận trong tháng */}
          <Card className="flex-1 min-w-0 md:flex-[1_1_calc(25%-12px)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lợi nhuận</CardTitle>
              <Select value={profitPeriod} onValueChange={(v) => setProfitPeriod(v as 'month' | 'year')}>
                <SelectTrigger className="h-7 w-auto px-2 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Tháng</SelectItem>
                  <SelectItem value="year">Năm</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {(() => {
                const currentProfit = dashboardData.currentProfit || 0;
                const currentRevenue = dashboardData.currentProfitRevenue || 0;
                const currentMargin = currentRevenue > 0 ? (currentProfit / currentRevenue) * 100 : 0;
                const color = currentProfit >= 0 ? 'text-green-600' : 'text-red-600';
                return (
                  <>
                    <div className={`text-2xl font-bold ${color}`}>
                      {currentProfit >= 0 ? '+' : ''}{formatCurrency(Math.abs(currentProfit))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tỷ suất: {currentMargin.toFixed(1)}%
                    </p>
                  </>
                );
              })()}
            </CardContent>
          </Card>
          {/* Tổng Chi Phí */}
          {errorStates.orders || loadingStates.orders ? (
            <PermissionErrorCard 
              title="Tổng Chi Phí" 
              error={errorStates.orders} 
              loading={loadingStates.orders} 
            />
          ) : (
            <Card className="flex-1 min-w-0 md:flex-[1_1_calc(25%-12px)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Chi Phí</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(dashboardData.totalExpenses || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tổng chi phí tất cả hóa đơn
                </p>
              </CardContent>
            </Card>
          )}
          {/* Tổng Đơn Hàng */}
          {errorStates.orders || loadingStates.orders ? (
            <PermissionErrorCard 
              title="Tổng Đơn Hàng" 
              error={errorStates.orders} 
              loading={loadingStates.orders} 
            />
          ) : (
            <Card className="flex-1 min-w-0 md:flex-[1_1_calc(25%-12px)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Đơn Hàng</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.totalOrders}</div>
                <p className="text-xs text-muted-foreground">Tổng cộng tất cả đơn hàng</p>
              </CardContent>
            </Card>
          )}
        </div>
        {/* Hàng 2: Các card còn lại - tự động co giãn */}
        <div className="flex flex-col md:flex-row md:flex-wrap gap-4">
          {/* Sản Phẩm Tồn Kho */}
          {errorStates.products || loadingStates.products ? (
            <PermissionErrorCard 
              title="Sản Phẩm Tồn Kho" 
              error={errorStates.products} 
              loading={loadingStates.products} 
            />
          ) : (
            <Card className="flex-1 min-w-0 md:flex-[1_1_calc(25%-12px)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sản Phẩm Tồn Kho</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.totalProducts}</div>
                <p className="text-xs text-muted-foreground">Sản phẩm đang quản lý</p>
              </CardContent>
            </Card>
          )}
          {/* Giá Trị Tồn Kho */}
          {errorStates.inventory || loadingStates.inventory ? (
            <PermissionErrorCard 
              title="Giá Trị Tồn Kho" 
              error={errorStates.inventory} 
              loading={loadingStates.inventory} 
            />
          ) : (
            <Card className="flex-1 min-w-0 md:flex-[1_1_calc(25%-12px)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Giá Trị Tồn Kho</CardTitle>
                <Boxes className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(dashboardData.totalInventoryValue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Tổng giá trị hàng tồn kho</p>
              </CardContent>
            </Card>
          )}
          {/* Công Nợ Tồn Đọng */}
          {errorStates.orders || loadingStates.orders ? (
            <PermissionErrorCard 
              title="Công Nợ Tồn Đọng" 
              error={errorStates.orders} 
              loading={loadingStates.orders} 
            />
          ) : (
            <Card className="flex-1 min-w-0 md:flex-[1_1_calc(25%-12px)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Công Nợ Tồn Đọng</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(dashboardData.totalDebt)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Lãi gộp: {formatCurrency(dashboardData.totalProfit)}
                </p>
              </CardContent>
            </Card>
          )}
          {/* Đơn chờ xử lý */}
          <Card className="flex-1 min-w-0 md:flex-[1_1_calc(25%-12px)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đơn chờ xử lý</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(orderStatus.find(s => s.trangThai === 'Chờ xử lý')?.soLuong) || 0}</div>
              <p className="text-xs text-muted-foreground">Cần xử lý trong ngày</p>
            </CardContent>
          </Card>
          {/* Khách hàng mới */}
          <Card className="flex-1 min-w-0 md:flex-[1_1_calc(25%-12px)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Khách hàng mới</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{newCustomers}</div>
              <p className="text-xs text-muted-foreground">Trong tháng hiện tại</p>
            </CardContent>
          </Card>
        </div>
        {/* Biểu đồ và thống kê chi tiết */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="revenue">Doanh Thu</TabsTrigger>
            <TabsTrigger value="inventory">Tồn Kho</TabsTrigger>
            <TabsTrigger value="orders">Đơn Hàng</TabsTrigger>
          </TabsList>
          <TabsContent value="revenue" className="space-y-4">
            {errorStates.revenue || loadingStates.revenue ? (
              <Card>
                <CardHeader>
                  <CardTitle>Biểu Đồ Doanh Thu 6 Tháng Gần Nhất</CardTitle>
                  <CardDescription>Theo dõi xu hướng doanh thu theo tháng</CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      {errorStates.revenue || 'Đang tải dữ liệu doanh thu...'}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>So sánh doanh thu 12 tháng gần nhất</CardTitle>
                  <CardDescription>Năm nay vs Năm trước</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={revenueData} barCategoryGap={20}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fontSize: 12 }}
                        height={30}
                      />
                      <YAxis 
                        tickFormatter={(value) => {
                          if (value >= 1000000) {
                            return `${(value / 1000000).toFixed(1)}M`;
                          } else if (value >= 1000) {
                            return `${(value / 1000).toFixed(0)}K`;
                          } else {
                            return value.toString();
                          }
                        }}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        formatter={(value: any, name: string) => [
                          formatCurrency(value), 
                          name === 'Năm nay' || name === 'Xu hướng' ? 'Năm nay' : 'Năm trước'
                        ]}
                        labelFormatter={(label, payload) => {
                          const i = payload && payload[0] ? payload[0].payload : null;
                          return i ? `Tháng: ${i.month}` : label;
                        }}
                      />
                      <Bar dataKey="previous" fill="#94a3b8" name="Năm trước" opacity={0.6} />
                      <Bar dataKey="current" fill="#1d4ed8" name="Năm nay" />
                      <Line type="monotone" dataKey="current" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} name="Xu hướng" />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 12 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            {/* Doanh thu theo khu vực & danh mục */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Doanh thu theo khu vực</CardTitle>
                </CardHeader>
                <CardContent>
                  {regionRevenue.length === 0 ? (
                    <p className="text-muted-foreground">Chưa có dữ liệu</p>
                  ) : (
                    <div className="space-y-3">
                      {regionRevenue.map((row, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between text-sm">
                            <span>{row.name}</span>
                            <span className="font-medium">{formatCurrency(row.revenue)}</span>
                          </div>
                          <div className="h-2 bg-muted rounded">
                            <div className="h-2 bg-primary rounded" style={{ width: `${Math.min(100, Math.round((row.revenue / (regionRevenue[0]?.revenue || 1)) * 100))}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Lợi nhuận theo danh mục</CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryProfit.length === 0 ? (
                    <p className="text-muted-foreground">Chưa có dữ liệu</p>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie 
                            data={categoryProfit} 
                            dataKey="profit" 
                            nameKey="name" 
                            cx="50%" 
                            cy="50%" 
                            outerRadius={90} 
                            label={({ name }) => {
                              // Find the category in data to get percentage
                              const category = categoryProfit.find(c => c.name === name);
                              if (category) {
                                // Use percentage from backend if available
                                const percentage = category.percentage || category.value;
                                if (percentage) {
                                  // Extract number from "72.73%" format
                                  const percentStr = typeof percentage === 'string' 
                                    ? percentage.replace('%', '') 
                                    : percentage.toString();
                                  return `${name}: ${percentStr}%`;
                                }
                              }
                              // Fallback: calculate from profit values
                              const total = categoryProfit.reduce((sum, item) => sum + (Number(item.profit) || 0), 0);
                              const currentProfit = category?.profit || 0;
                              const percentValue = total > 0 ? ((Number(currentProfit) || 0) / total * 100).toFixed(1) : '0';
                              return `${name}: ${percentValue}%`;
                            }}
                          >
                            {categoryProfit.map((entry, index) => (
                              <Cell key={`cat-${index}`} fill={entry.fill || entry.color || '#3b82f6'} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: any, n: string, props: any) => {
                            // v is the profit value (number)
                            // props.payload might be array or object
                            let payload = props?.payload;
                            if (Array.isArray(payload)) {
                              payload = payload[0] || {};
                            }
                            const percentage = payload?.percentage || payload?.value;
                            let percentStr = '';
                            if (percentage) {
                              // Extract number from "72.73%" format
                              percentStr = typeof percentage === 'string' 
                                ? percentage.replace('%', '') 
                                : percentage.toString();
                            } else {
                              // Calculate if not provided
                              const total = categoryProfit.reduce((sum, item) => sum + (Number(item.profit) || 0), 0);
                              percentStr = total > 0 ? ((Number(v) || 0) / total * 100).toFixed(1) : '0';
                            }
                            return [`${formatCurrency(Number(v) || 0)} (${percentStr}%)`, n];
                          }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-4 space-y-2">
                        {categoryProfit.map((c, idx) => {
                          // Use percentage from backend if available
                          const percentage = c.percentage || c.value;
                          let percentStr = '';
                          if (percentage) {
                            // Extract number from "72.73%" format
                            percentStr = typeof percentage === 'string' 
                              ? percentage.replace('%', '') 
                              : percentage.toString();
                          } else {
                            // Calculate if not provided
                            const total = categoryProfit.reduce((sum, item) => sum + (Number(item.profit) || 0), 0);
                            percentStr = total > 0 ? ((Number(c.profit) || 0) / total * 100).toFixed(1) : '0';
                          }
                          return (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                              <span>{c.name}</span>
                            </div>
                              <span className="font-medium">{percentStr}%</span>
                          </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="inventory" className="space-y-4">
            {/* Detailed Product Stock Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Chi Tiết Tồn Kho Theo Sản Phẩm</CardTitle>
                <CardDescription>Tình trạng tồn kho của từng sản phẩm</CardDescription>
              </CardHeader>
              <CardContent>
                {errorStates.inventory || loadingStates.inventory ? (
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      {errorStates.inventory || 'Đang tải dữ liệu tồn kho...'}
                    </AlertDescription>
                  </Alert>
                ) : productStockData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart 
                      data={productStockData} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        allowDecimals={false}
                      />
                      <Tooltip 
                        formatter={(value: any, name: string) => [
                          `${value} sản phẩm`, 
                          'Số lượng tồn kho'
                        ]}
                        labelFormatter={(label) => `Sản phẩm: ${label}`}
                      />
                      <Bar 
                        dataKey="stock" 
                        fill="#3b82f6"
                        name="Số lượng tồn kho"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[400px]">
                    <div className="text-center">
                      <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Chưa có dữ liệu sản phẩm</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Product Stock Table */}
            <Card>
              <CardHeader>
                <CardTitle>Bảng Chi Tiết Tồn Kho</CardTitle>
                <CardDescription>Thông tin chi tiết về tồn kho từng sản phẩm</CardDescription>
              </CardHeader>
              <CardContent>
                {errorStates.inventory || loadingStates.inventory ? (
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      {errorStates.inventory || 'Đang tải dữ liệu tồn kho...'}
                    </AlertDescription>
                  </Alert>
                ) : productStockData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-center p-2">Sản phẩm</th>
                          <th className="text-center p-2">Tồn kho</th>
                          <th className="text-center p-2">Tồn tối thiểu</th>
                          <th className="text-center p-2">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productStockData.map((product, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-2">
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-xs text-gray-500">{product.code}</div>
                              </div>
                            </td>
                            <td className="text-right p-2 font-medium">{product.stock}</td>
                            <td className="text-right p-2 text-gray-500">{product.minStock}</td>
                            <td className="text-center p-2">
                              <span 
                                className="px-2 py-1 rounded-full text-xs font-medium"
                                style={{ 
                                  backgroundColor: `${product.color}20`,
                                  color: product.color
                                }}
                              >
                                {product.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Chưa có dữ liệu sản phẩm</p>
                )}
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tình Trạng Tồn Kho</CardTitle>
                  <CardDescription>Phân bổ tình trạng hàng hóa</CardDescription>
                </CardHeader>
                <CardContent>
                  {errorStates.inventory || loadingStates.inventory ? (
                    <Alert>
                      <Lock className="h-4 w-4" />
                      <AlertDescription>
                        {errorStates.inventory || 'Đang tải dữ liệu tồn kho...'}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={inventoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            dataKey="value"
                            label={({ name, value }) => value > 0 ? `${name}: ${value}%` : ''}
                            labelLine={false}
                          >
                            {inventoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any, name: string) => [`${value}%`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-4 space-y-2">
                        {inventoryData.map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm">{item.name}: {item.value}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Sản Phẩm Cần Chú Ý</CardTitle>
                  <CardDescription>Danh sách hàng sắp hết hoặc hết hàng</CardDescription>
                </CardHeader>
                <CardContent>
                  {errorStates.inventory || loadingStates.inventory ? (
                    <Alert>
                      <Lock className="h-4 w-4" />
                      <AlertDescription>
                        {errorStates.inventory || 'Đang tải dữ liệu tồn kho...'}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      {lowStockProducts.length > 0 ? (
                        lowStockProducts.map((product, index) => (
                          <div key={index} className={`flex justify-between items-center p-3 rounded-lg ${
                            product.status === 'Hết hàng' ? 'bg-red-50' : 'bg-orange-50'
                          }`}>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">Còn lại: {product.stock} sản phẩm</p>
                            </div>
                            <span className={`text-sm font-medium ${
                              product.status === 'Hết hàng' ? 'text-red-600' : 'text-orange-600'
                            }`}>
                              {product.status}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-4">Tất cả sản phẩm đều có đủ hàng</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trạng Thái Đơn Hàng</CardTitle>
                <CardDescription>Tổng quan tình trạng xử lý đơn hàng</CardDescription>
              </CardHeader>
              <CardContent>
                {errorStates.orders || loadingStates.orders ? (
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      {errorStates.orders || 'Đang tải dữ liệu đơn hàng...'}
                    </AlertDescription>
                  </Alert>
                ) : orderStatus.length > 0 && orderStatus.some(item => item.soLuong > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                      <BarChart 
                        data={orderStatus.filter(item => item.soLuong > 0)} 
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="trangThai"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          domain={[0, 'dataMax']}
                          tickCount={Math.max(...orderStatus.filter(item => item.soLuong > 0).map(item => item.soLuong)) + 1}
                          allowDecimals={false}
                        />
                        <Tooltip 
                          formatter={(value: any, name: string) => [
                            `${value} đơn hàng`, 
                            'Số lượng'
                          ]}
                          labelFormatter={(label) => `Trạng thái: ${label}`}
                        />
                        <Bar 
                          dataKey="soLuong" 
                          fill="#3b82f6" 
                          name="Số lượng"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="text-center">
                      <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Chưa có dữ liệu đơn hàng</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Tạo đơn hàng đầu tiên để xem biểu đồ trạng thái
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top sản phẩm bán chạy</CardTitle>
                </CardHeader>
                <CardContent>
                  {topProducts.length === 0 ? (
                    <p className="text-muted-foreground">Chưa có dữ liệu</p>
                  ) : (
                    <div className="space-y-3">
                      {topProducts.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{idx+1}</div>
                            <div>
                              <div className="font-medium">{(p as any).name}</div>
                              <div className="text-xs text-muted-foreground">Đã bán: {(p as any).qty} sản phẩm</div>
                            </div>
                          </div>
                          <div className="text-blue-600 font-bold">{formatCurrency((p as any).revenue)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Top khách hàng</CardTitle>
                </CardHeader>
                <CardContent>
                  {topCustomers.length === 0 ? (
                    <p className="text-muted-foreground">Chưa có dữ liệu</p>
                  ) : (
                    <div className="space-y-3">
                      {topCustomers.map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{idx+1}</div>
                            <div>
                              <div className="font-medium">{(c as any).name}</div>
                              <div className="text-xs text-muted-foreground">Lần cuối: {format((c as any).lastDate, 'yyyy-MM-dd')}</div>
                            </div>
                          </div>
                          <div className="text-blue-600 font-bold">{formatCurrency((c as any).revenue)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {/* Đơn hàng gần đây */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Đơn hàng gần đây</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Hiển thị</span>
                <Select value={String(recentOrdersLimit)} onValueChange={(v) => setRecentOrdersLimit(Number(v))}>
                  <SelectTrigger className="h-8 w-20">
                    <SelectValue placeholder="Số lượng" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-muted-foreground">Chưa có đơn hàng</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.slice(0, recentOrdersLimit).map((o, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setSelectedOrder(o);
                      setOrderDetailDialogOpen(true);
                    }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{o.order_number}</span>
                        {(() => {
                          const statusConfig = getOrderStatusConfig(o.status);
                          return (
                            <Badge variant={statusConfig.variant} className={statusConfig.className}>
                              {statusConfig.label}
                            </Badge>
                          );
                        })()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{o.customer_name || 'Khách lẻ'} • {format(new Date(o.created_at), 'yyyy-MM-dd')}</div>
                    </div>
                    <div className="text-blue-600 font-bold">{formatCurrency(o.total_amount || 0)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        {/* Hoạt động gần đây */}
        <Card>
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <p className="text-muted-foreground">Chưa có hoạt động</p>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((a, idx) => (
                  <div key={idx} className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${a.type === 'success' ? 'bg-green-100 text-green-700' : a.type === 'warning' ? 'bg-yellow-100 text-yellow-700' : a.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-primary/10 text-primary'}`}>{idx+1}</div>
                      <div>
                        <div className="text-sm font-medium">{a.title}</div>
                        <div className="text-xs text-muted-foreground">{a.message}</div>
                        <div className="text-[10px] text-muted-foreground">{format(new Date(a.createdAt), 'yyyy-MM-dd HH:mm')}</div>
                      </div>
                    </div>
                    {a.amount !== undefined && (
                      <div className="text-blue-600 font-medium">{formatCurrency(a.amount)}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Order View Dialog (Read-only) */}
        {selectedOrder && (
          <OrderViewDialog
            order={selectedOrder}
            open={orderDetailDialogOpen}
            onOpenChange={(open) => {
              setOrderDetailDialogOpen(open);
              if (!open) {
                // Clear selected order when dialog is closed
                setSelectedOrder(null);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};
const Dashboard = () => {
  return (
    <PermissionGuard 
      requiredPermissions={['DASHBOARD_VIEW']}
    >
      <DashboardContent />
    </PermissionGuard>
  );
};
export default Dashboard;