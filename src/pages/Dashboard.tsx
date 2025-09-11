import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Package, TrendingUp, ShoppingCart, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { productApi } from "@/api/product.api";
import { orderApi } from "@/api/order.api";
import { useAuth } from "@/hooks/useAuth";
import { useRouteBasedLazyData } from "@/hooks/useLazyData";
import { Loading } from "@/components/ui/loading";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
};

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
    totalDebt: 0,
    totalProfit: 0,
    totalProducts: 0,
    totalOrders: 0,
    currentMonthRevenue: 0,
    previousMonthRevenue: 0
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [orderStatus, setOrderStatus] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  // Permission checks removed - let backend handle authorization
  const canViewProfit = true; // Always show profit data - backend will handle access control
  const canViewRevenue = true; // Always show revenue data - backend will handle access control

  const fetchDashboardData = async () => {
    try {
      
      // Fetch from backend APIs
      const [ordersResp, productsResp] = await Promise.all([
        orderApi.getOrders({ page: 1, limit: 1000 }),
        productApi.getProducts({ page: 1, limit: 1000 })
      ]);
      const allOrders = ordersResp.orders || [];
      const products = productsResp.products || [];

      // Calculate dashboard metrics
      let totalRevenue = 0;
      let totalDebt = 0;
      let totalProfit = 0;
      const monthlyRevenue: any = {};
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      let currentMonthRevenue = 0;
      let previousMonthRevenue = 0;

      // Calculate total debt and basic revenue estimation from orders
      allOrders.forEach((order: any) => {
        totalDebt += order.debt_amount || 0;
        const createdAt = order.created_at ? new Date(order.created_at) : new Date();
        const orderMonth = createdAt.getMonth();
        const orderYear = createdAt.getFullYear();
        const amount = order.total_amount || 0;
        totalRevenue += amount;
        if (orderYear === currentYear) {
          if (orderMonth === currentMonth) currentMonthRevenue += amount;
          else if (orderMonth === currentMonth - 1) previousMonthRevenue += amount;
        }
        const monthKey = format(createdAt, 'MMM-yyyy', { locale: vi });
        if (!monthlyRevenue[monthKey]) monthlyRevenue[monthKey] = { month: monthKey, revenue: 0, profit: 0 };
        monthlyRevenue[monthKey].revenue += amount;
      });

      // Convert monthly revenue to array and sort
      const revenueArray = Object.values(monthlyRevenue)
        .sort((a: any, b: any) => new Date(a.month).getTime() - new Date(b.month).getTime())
        .slice(-6); // Last 6 months

      // Calculate order status breakdown
      const statusCounts: any = {};
      allOrders?.forEach(order => {
        const status = order.status;
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const orderStatusArray = [
        { trangThai: 'Chờ xử lý', soLuong: statusCounts.pending || 0 },
        { trangThai: 'Đang xử lý', soLuong: statusCounts.processing || 0 },
        { trangThai: 'Đang giao', soLuong: statusCounts.shipping || 0 },
        { trangThai: 'Hoàn thành', soLuong: (statusCounts.completed || 0) + (statusCounts.shipped || 0) },
        { trangThai: 'Đã hủy', soLuong: statusCounts.cancelled || 0 },
      ];

      // Calculate inventory breakdown
      let inStock = 0;
      let lowStock = 0;
      let outOfStock = 0;
      const lowStockItems: any[] = [];

      products.forEach((product: any) => {
        if ((product.current_stock || 0) === 0) {
          outOfStock++;
          lowStockItems.push({
            name: product.name,
            stock: product.current_stock || 0,
            status: 'Hết hàng'
          });
        } else if ((product.current_stock || 0) <= (product.min_stock_level || 0)) {
          lowStock++;
          lowStockItems.push({
            name: product.name,
            stock: product.current_stock || 0,
            status: 'Sắp hết'
          });
        } else {
          inStock++;
        }
      });

      const totalProducts = products.length || 0;
      const inventoryArray = totalProducts > 0 ? [
        { name: 'Còn hàng', value: Math.round((inStock / totalProducts) * 100), color: '#22c55e' },
        { name: 'Sắp hết', value: Math.round((lowStock / totalProducts) * 100), color: '#f59e0b' },
        { name: 'Hết hàng', value: Math.round((outOfStock / totalProducts) * 100), color: '#ef4444' },
      ] : [
        { name: 'Không có dữ liệu', value: 100, color: '#e5e7eb' },
      ];

      // Update state
      setDashboardData({
        totalRevenue,
        totalDebt,
        totalProfit,
        totalProducts,
        totalOrders: allOrders?.length || 0,
        currentMonthRevenue,
        previousMonthRevenue
      });
      setRevenueData(revenueArray);
      setInventoryData(inventoryArray);
      setOrderStatus(orderStatusArray);
      setLowStockProducts(lowStockItems.slice(0, 5)); // Show only top 5

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  // Lazy loading configuration
  const lazyData = useRouteBasedLazyData({
    dashboard: {
      loadFunction: fetchDashboardData
    }
  });

  const getGrowthPercentage = () => {
    if (dashboardData.previousMonthRevenue === 0) return 0;
    return Math.round(((dashboardData.currentMonthRevenue - dashboardData.previousMonthRevenue) / dashboardData.previousMonthRevenue) * 100);
  };

  const dashboardState = lazyData.getDataState('dashboard');
  
  if (dashboardState.isLoading || dashboardState.error) {
    return (
      <Loading 
        message="Đang tải dữ liệu dashboard..."
        error={dashboardState.error}
        onRetry={() => lazyData.reloadData('dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">Dashboard Quản Lý</h1>
          <p className="text-muted-foreground">Tổng quan hoạt động kinh doanh</p>
        </div>

        {/* Thống kê tổng quan */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Doanh Thu Tháng Hiện Tại</CardTitle>
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Đơn Hàng</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.totalOrders}</div>
              <p className="text-xs text-muted-foreground">Tổng cộng tất cả đơn hàng</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sản Phẩm Tồn Kho</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.totalProducts}</div>
              <p className="text-xs text-muted-foreground">Sản phẩm đang quản lý</p>
            </CardContent>
          </Card>

          <Card>
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
        </div>

        {/* Biểu đồ và thống kê chi tiết */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="revenue">Doanh Thu</TabsTrigger>
            <TabsTrigger value="inventory">Tồn Kho</TabsTrigger>
            <TabsTrigger value="orders">Đơn Hàng</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Biểu Đồ Doanh Thu 6 Tháng Gần Nhất</CardTitle>
                  <CardDescription>Theo dõi xu hướng doanh thu theo tháng</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `${value / 1000000}M`} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                      <Bar dataKey="profit" fill="hsl(var(--secondary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tình Trạng Tồn Kho</CardTitle>
                  <CardDescription>Phân bổ tình trạng hàng hóa</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={inventoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {inventoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sản Phẩm Cần Chú Ý</CardTitle>
                  <CardDescription>Danh sách hàng sắp hết hoặc hết hàng</CardDescription>
                </CardHeader>
                <CardContent>
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
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={orderStatus} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="trangThai" type="category" width={100} />
                    <Bar dataKey="soLuong" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
