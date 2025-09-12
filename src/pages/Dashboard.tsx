import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Package, TrendingUp, ShoppingCart, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { productApi } from "@/api/product.api";
import { orderApi } from "@/api/order.api";
import { stockLevelsApi } from "@/api/stockLevels.api";
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
  const [productStockData, setProductStockData] = useState<any[]>([]);

  // Permission checks removed - let backend handle authorization
  const canViewProfit = true; // Always show profit data - backend will handle access control
  const canViewRevenue = true; // Always show revenue data - backend will handle access control

  const fetchDashboardData = async () => {
    try {
      // Fetch from backend APIs
      const [ordersResp, productsResp, stockLevelsResp] = await Promise.all([
        orderApi.getOrders({ page: 1, limit: 1000 }),
        productApi.getProducts({ page: 1, limit: 1000 }),
        stockLevelsApi.getStockLevels({ page: 1, limit: 1000, includeDeleted: false })
      ]);
      
      const allOrders = ordersResp.orders || [];
      const products = productsResp.products || [];
      const stockLevels = stockLevelsResp.stockLevels || [];

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
        
        // Calculate current and previous month revenue
        if (orderYear === currentYear) {
          if (orderMonth === currentMonth) {
            currentMonthRevenue += amount;
          } else if (orderMonth === (currentMonth - 1 + 12) % 12) {
            previousMonthRevenue += amount;
          }
        }
        
        // Group by month for chart
        const monthKey = format(createdAt, 'MMM-yyyy', { locale: vi });
        if (!monthlyRevenue[monthKey]) {
          monthlyRevenue[monthKey] = { 
            month: monthKey, 
            revenue: 0, 
            profit: 0,
            monthNumber: createdAt.getMonth(),
            year: createdAt.getFullYear()
          };
        }
        monthlyRevenue[monthKey].revenue += amount;
      });

      // Convert monthly revenue to array and sort properly
      const revenueArray = Object.values(monthlyRevenue)
        .sort((a: any, b: any) => {
          // Sort by year first, then by month
          if (a.year !== b.year) {
            return a.year - b.year;
          }
          return a.monthNumber - b.monthNumber;
        })
        .slice(-6); // Last 6 months

      // Calculate order status breakdown
      const statusCounts: any = {};
      allOrders?.forEach((order) => {
        const status = order.status;
        if (status) {
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        }
      });

      const orderStatusArray = [
        // Trạng thái từ API interface: 'draft' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
        { trangThai: 'Nháp', soLuong: statusCounts.draft || 0 },
        { trangThai: 'Đang xử lý', soLuong: statusCounts.processing || 0 },
        { trangThai: 'Đã giao', soLuong: statusCounts.shipped || 0 },
        { trangThai: 'Đã nhận', soLuong: statusCounts.delivered || 0 },
        { trangThai: 'Đã hủy', soLuong: statusCounts.cancelled || 0 },
        // Thêm các trạng thái khác có thể có từ backend
        { trangThai: 'Chờ xử lý', soLuong: statusCounts.pending || 0 },
        { trangThai: 'Đã xác nhận', soLuong: statusCounts.confirmed || 0 },
        { trangThai: 'Đã lấy hàng', soLuong: statusCounts.picked || 0 },
        { trangThai: 'Bàn giao ĐVVC', soLuong: statusCounts.handover || 0 },
        { trangThai: 'Đã giao hàng', soLuong: statusCounts.delivered || 0 },
        { trangThai: 'Hoàn thành', soLuong: statusCounts.completed || 0 },
        { trangThai: 'Đang giao', soLuong: statusCounts.shipping || 0 },
      ];

      // Add any other statuses that might exist in the data
      Object.keys(statusCounts).forEach(status => {
        const predefinedStatuses = ['draft', 'processing', 'shipped', 'delivered', 'cancelled', 'pending', 'confirmed', 'picked', 'handover', 'completed', 'shipping'];
        if (!predefinedStatuses.includes(status)) {
          orderStatusArray.push({ 
            trangThai: status.charAt(0).toUpperCase() + status.slice(1), 
            soLuong: statusCounts[status] 
          });
        }
      });

      // If no orders, show a default message
      if (allOrders.length === 0) {
        orderStatusArray.push({ trangThai: 'Chưa có đơn hàng', soLuong: 0 });
      }

      // Calculate inventory breakdown using actual stock levels
      let inStock = 0;
      let lowStock = 0;
      let outOfStock = 0;
      const lowStockItems: any[] = [];
      const productStockMap: any = {};

      // Create a map of products for easy lookup
      const productMap = products.reduce((acc: any, product: any) => {
        acc[product.id] = product;
        return acc;
      }, {});

      // Group stock levels by product and calculate totals
      const productStockTotals: any = {};
      stockLevels.forEach((stockLevel: any) => {
        const productId = stockLevel.productId;
        if (!productStockTotals[productId]) {
          productStockTotals[productId] = 0;
        }
        productStockTotals[productId] += stockLevel.quantity || 0;
      });

      // Calculate inventory status for each product
      Object.keys(productStockTotals).forEach(productId => {
        const product = productMap[productId];
        if (!product) return;
        
        const totalStock = productStockTotals[productId];
        const minStock = product.min_stock_level || 10; // Default minimum stock level
        
        if (totalStock === 0) {
          outOfStock++;
          lowStockItems.push({
            name: product.name,
            stock: totalStock,
            status: 'Hết hàng'
          });
        } else if (totalStock <= minStock) {
          lowStock++;
          lowStockItems.push({
            name: product.name,
            stock: totalStock,
            status: 'Sắp hết'
          });
        } else {
          inStock++;
        }
        
        productStockMap[productId] = {
          name: product.name,
          stock: totalStock,
          minStock: minStock
        };
      });

      // Handle products with no stock levels (should be considered out of stock)
      products.forEach((product: any) => {
        if (!productStockTotals[product.id]) {
          outOfStock++;
          lowStockItems.push({
            name: product.name,
            stock: 0,
            status: 'Hết hàng'
          });
        }
      });

      const totalProducts = products.length || 0;
      const inventoryArray = totalProducts > 0 ? [
        ...(inStock > 0 ? [{ name: 'Còn hàng', value: Math.round((inStock / totalProducts) * 100), color: '#22c55e' }] : []),
        ...(lowStock > 0 ? [{ name: 'Sắp hết', value: Math.round((lowStock / totalProducts) * 100), color: '#f59e0b' }] : []),
        ...(outOfStock > 0 ? [{ name: 'Hết hàng', value: Math.round((outOfStock / totalProducts) * 100), color: '#ef4444' }] : []),
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
      // Create detailed product stock data for chart
      const productStockChartData = Object.keys(productStockTotals).map(productId => {
        const product = productMap[productId];
        if (!product) return null;
        
        const totalStock = productStockTotals[productId];
        const minStock = product.min_stock_level || 10;
        
        let status = 'Còn hàng';
        let color = '#22c55e';
        
        if (totalStock === 0) {
          status = 'Hết hàng';
          color = '#ef4444';
        } else if (totalStock <= minStock) {
          status = 'Sắp hết';
          color = '#f59e0b';
        }
        
        return {
          name: product.name,
          stock: totalStock,
          minStock: minStock,
          status: status,
          color: color,
          code: product.code || product.id
        };
      }).filter(Boolean).sort((a: any, b: any) => b.stock - a.stock); // Sort by stock descending

      setRevenueData(revenueArray);
      setInventoryData(inventoryArray);
      setOrderStatus(orderStatusArray);
      setLowStockProducts(lowStockItems.slice(0, 5)); // Show only top 5
      setProductStockData(productStockChartData);

    } catch (error) {
      console.error('❌ Dashboard: Error fetching dashboard data:', error);
      console.error('❌ Dashboard: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Quản Lý</h1>
            <p className="text-muted-foreground">Tổng quan hoạt động kinh doanh</p>
          </div>
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
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
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
                          name === 'revenue' ? 'Doanh thu' : 'Lợi nhuận'
                        ]}
                        labelFormatter={(label) => `Tháng: ${label}`}
                      />
                      <Bar dataKey="revenue" fill="#22c55e" name="Doanh thu" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            {/* Detailed Product Stock Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Chi Tiết Tồn Kho Theo Sản Phẩm</CardTitle>
                <CardDescription>Tình trạng tồn kho của từng sản phẩm</CardDescription>
              </CardHeader>
              <CardContent>
                {productStockData.length > 0 ? (
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
                {productStockData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Sản phẩm</th>
                          <th className="text-right p-2">Tồn kho</th>
                          <th className="text-right p-2">Tồn tối thiểu</th>
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
                {orderStatus.length > 0 && orderStatus.some(item => item.soLuong > 0) ? (
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
