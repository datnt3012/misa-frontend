import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Line, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, TrendingUp, ShoppingCart, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { productApi } from "@/api/product.api";
import { categoriesApi } from "@/api/categories.api";
import { orderApi } from "@/api/order.api";
import { stockLevelsApi } from "@/api/stockLevels.api";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGuard } from "@/components/PermissionGuard";
import { notificationApi } from "@/api/notification.api";
import { useRouteBasedLazyData } from "@/hooks/useLazyData";
import { Loading } from "@/components/ui/loading";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

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
  const canViewInventory = hasPermission('INVENTORY_READ');
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
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentOrdersLimit, setRecentOrdersLimit] = useState<number>(5);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [newCustomers, setNewCustomers] = useState<number>(0);
  // Period toggle: 'month' or 'year'
  const [revenuePeriod, setRevenuePeriod] = useState<'month' | 'year'>('month');
  const [profitPeriod, setProfitPeriod] = useState<'month' | 'year'>('month');
  
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
  
  
  // Clear error states when permissions are available
  useEffect(() => {
    if (canViewOrders && canViewProducts && canViewInventory && canViewRevenue) {
      setErrorStates({ orders: null, products: null, inventory: null, revenue: null });
    }
  }, [canViewOrders, canViewProducts, canViewInventory, canViewRevenue]);

  // Trigger data fetch when permissions are loaded
  useEffect(() => {
    if (!permissionsLoading) {
      fetchDashboardData();
    }
  }, [permissionsLoading, canViewOrders, canViewProducts, canViewInventory, canViewRevenue]);
  
  // Fetch data when period changes
  useEffect(() => {
    if (!permissionsLoading) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revenuePeriod, profitPeriod]);

  const fetchDashboardData = async () => {
    try {
      // Don't fetch data if permissions are still loading
      if (permissionsLoading) {
        return;
      }
      
      setLoadingStates({ orders: true, products: true, inventory: true, revenue: true });
      setErrorStates({ orders: null, products: null, inventory: null, revenue: null });
      
      // Fetch data based on permissions
      const promises: Promise<any>[] = [];
      const promiseLabels: string[] = [];
      
      if (canViewOrders) {
        promises.push(orderApi.getOrders({ page: 1, limit: 1000 }));
        promiseLabels.push('orders');
      }
      
      if (canViewProducts) {
        promises.push(productApi.getProducts({ page: 1, limit: 1000 }));
        promiseLabels.push('products');
        promises.push(categoriesApi.getCategories({ page: 1, limit: 1000 }));
        promiseLabels.push('categories');
      }
      // Notifications for recent activities (not permission-gated for this demo)
      promises.push(notificationApi.getNotifications({ page: 1, limit: 20 }));
      promiseLabels.push('notifications');
      
      if (canViewInventory) {
        promises.push(stockLevelsApi.getStockLevels({ page: 1, limit: 1000, includeDeleted: false }));
        promiseLabels.push('inventory');
      }
      
      // If no permissions, set empty data and return
      if (promises.length === 0) {
        setLoadingStates({ orders: false, products: false, inventory: false, revenue: false });
        setErrorStates({ 
          orders: 'Không có quyền xem dữ liệu đơn hàng (cần Read Orders)', 
          products: 'Không có quyền xem dữ liệu sản phẩm (cần Read Products)', 
          inventory: 'Không có quyền xem dữ liệu tồn kho (cần Read Inventory)',
          revenue: 'Không có quyền xem dữ liệu doanh thu (cần Read Revenue)'
        });
        return;
      }
      
      const responses = await Promise.allSettled(promises);
      
      // Process responses and handle errors
      let allOrders: any[] = [];
      let products: any[] = [];
      let stockLevels: any[] = [];
      let categories: any[] = [];
      let notifications: any = { notifications: [] };
      
      responses.forEach((response, index) => {
        const label = promiseLabels[index];
        
        if (response.status === 'fulfilled') {
          const data = response.value;
          if (label === 'orders') {
            allOrders = data.orders || [];
            setLoadingStates(prev => ({ ...prev, orders: false }));
          } else if (label === 'products') {
            products = data.products || [];
            setLoadingStates(prev => ({ ...prev, products: false }));
          } else if (label === 'inventory') {
            stockLevels = data.stockLevels || [];
            setLoadingStates(prev => ({ ...prev, inventory: false }));
          } else if (label === 'categories') {
            categories = data.categories || [];
          } else if (label === 'notifications') {
            notifications = data || { notifications: [] };
          }
        } else {
          // Handle API errors
          const error = response.reason;
          let errorMessage = 'Lỗi tải dữ liệu';
          
          if (error?.response?.status === 403) {
            if (label === 'orders') {
              errorMessage = 'Không có quyền truy cập dữ liệu đơn hàng (cần Read Orders)';
            } else if (label === 'products') {
              errorMessage = 'Không có quyền truy cập dữ liệu sản phẩm (cần Read Products)';
            } else if (label === 'inventory') {
              errorMessage = 'Không có quyền truy cập dữ liệu tồn kho (cần Read Inventory)';
            } else if (label === 'revenue') {
              errorMessage = 'Không có quyền truy cập dữ liệu doanh thu (cần Read Revenue)';
            } else {
              errorMessage = 'Không có quyền truy cập dữ liệu này';
            }
          } else if (error?.response?.status === 401) {
            errorMessage = 'Phiên đăng nhập đã hết hạn';
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          setErrorStates(prev => ({ ...prev, [label]: errorMessage }));
          setLoadingStates(prev => ({ ...prev, [label]: false }));
        }
      });

      // Calculate dashboard metrics
      let totalRevenue = 0;
      let totalDebt = 0;
      let totalProfit = 0;
      const monthlyRevenue: any = {};
      const today = new Date();
      
      // Calculate revenue period based on revenuePeriod toggle
      let pStart: Date, pEnd: Date, prevStart: Date, prevEnd: Date;
      if (revenuePeriod === 'month') {
        pStart = new Date(today.getFullYear(), today.getMonth(), 1);
        pEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        prevStart = new Date(today.getFullYear() - 1, today.getMonth(), 1);
        prevEnd = new Date(today.getFullYear() - 1, today.getMonth() + 1, 0, 23, 59, 59, 999);
      } else {
        pStart = new Date(today.getFullYear(), 0, 1);
        pEnd = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
        prevStart = new Date(today.getFullYear() - 1, 0, 1);
        prevEnd = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      }
      
      // Separate period calculation for profit based on profitPeriod toggle
      let currentProfitStart: Date, currentProfitEnd: Date, previousProfitStart: Date, previousProfitEnd: Date;
      if (profitPeriod === 'month') {
        currentProfitStart = new Date(today.getFullYear(), today.getMonth(), 1);
        currentProfitEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        previousProfitStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        previousProfitEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      } else {
        currentProfitStart = new Date(today.getFullYear(), 0, 1);
        currentProfitEnd = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
        previousProfitStart = new Date(today.getFullYear() - 1, 0, 1);
        previousProfitEnd = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      }
      let currentMonthRevenue = 0;
      let previousMonthRevenue = 0;
      let currentProfit = 0;
      let previousProfit = 0;
      let currentProfitRevenue = 0;
      let previousProfitRevenue = 0;
      const customerFirstOrder: Record<string, Date> = {};
      const statusCounter: Record<string, number> = {};
      const provinceToRevenue: Record<string, number> = {};
      const productAggregate: Record<string, { name: string; qty: number; revenue: number } > = {};
      const customerAggregate: Record<string, { name: string; revenue: number; lastDate: Date } > = {};
      const categoryProfitMap: Record<string, number> = {};
      // Build product map for quick lookup
      const productMapAtCalc = (products || []).reduce((acc: any, p: any) => {
        acc[p.id] = p;
        return acc;
      }, {} as any);
      const productByCodeMap = (products || []).reduce((acc: any, p: any) => {
        const code = p.code || p.product_code;
        if (code) acc[String(code)] = p;
        return acc;
      }, {} as any);
      const categoryMapById = (categories || []).reduce((acc: any, c: any) => {
        acc[c.id] = c.name;
        return acc;
      }, {} as any);

      // Calculate total debt and basic revenue estimation from orders
      allOrders.forEach((order: any) => {
        totalDebt += order.debt_amount || 0;
        const createdAt = order.created_at ? new Date(order.created_at) : new Date();
        const orderMonth = createdAt.getMonth();
        const orderYear = createdAt.getFullYear();
        const amount = order.total_amount || 0;
        totalRevenue += amount;
        // status counter
        if (order.status) statusCounter[order.status] = (statusCounter[order.status] || 0) + 1;
        // first order per customer to estimate new customers
        const custId = order.customer_id || order.customer?.id;
        if (custId) {
          if (!customerFirstOrder[custId] || createdAt < customerFirstOrder[custId]) {
            customerFirstOrder[custId] = createdAt;
          }
          const custName = order.customer_name || order.customer?.name || 'Khách hàng';
          const lastDate = createdAt;
          if (!customerAggregate[custId]) customerAggregate[custId] = { name: custName, revenue: 0, lastDate };
          customerAggregate[custId].revenue += amount;
          if (lastDate > customerAggregate[custId].lastDate) customerAggregate[custId].lastDate = lastDate;
        }
        // region revenue by province name if available
        const provinceName = order.customer_addressInfo?.provinceName || order.customer?.addressInfo?.province?.name;
        if (provinceName) provinceToRevenue[provinceName] = (provinceToRevenue[provinceName] || 0) + amount;
        // aggregate products by items when available
        const lineItems = order.items || order.order_items || order.details || [];
        lineItems.forEach((it: any) => {
          const prodId = it.product?.id || it.product_id || it.productId;
          const prodCode = it.product?.code || it.product_code || it.productCode;
          const key = prodId || prodCode || it.id;
          const name = it.product_name || it.productName || prodCode || 'SP';
          const qty = Number(it.quantity || 0);
          const rev = Number(it.total_price || it.totalPrice || (Number(it.unit_price || it.unitPrice || 0) * qty) || 0);
          const costUnit = Number(it.product?.costPrice || it.costPrice || 0);
          const profit = Math.max(0, rev - costUnit * qty);
          if (!productAggregate[key]) productAggregate[key] = { name, qty: 0, revenue: 0 };
          productAggregate[key].qty += qty;
          productAggregate[key].revenue += rev;
          // Category revenue by product
          const prod = (prodId && productMapAtCalc[prodId]) || (prodCode && productByCodeMap[prodCode]);
          const itemCategoryRaw = it.product?.category; // can be string or object
          const itemCategoryId = it.product?.categoryId || it.categoryId || it.category_id;
          const catName = (
            typeof itemCategoryRaw === 'string' ? itemCategoryRaw :
            itemCategoryRaw?.name ||
            categoryMapById[itemCategoryId as any] ||
            prod?.category?.name ||
            categoryMapById[prod?.categoryId as any] ||
            it.category_name || prod?.categoryName ||
            (prod?.category && (prod.category.name || prod.category.title)) ||
            'Không xác định'
          );
          const catKey = String(catName);
          categoryProfitMap[catKey] = (categoryProfitMap[catKey] || 0) + profit;
        });
        
        // Calculate revenue in selected period and previous period
        if (createdAt >= pStart && createdAt <= pEnd) {
          currentMonthRevenue += amount;
        } else if (createdAt >= prevStart && createdAt <= prevEnd) {
          previousMonthRevenue += amount;
        }
        
        // Calculate profit based on profitPeriod toggle
        if (createdAt >= currentProfitStart && createdAt <= currentProfitEnd) {
          currentProfitRevenue += amount;
          const lineItems2 = order.items || order.order_items || order.details || [];
          lineItems2.forEach((it: any) => {
            const qty = Number(it.quantity || 0);
            const rev2 = Number(it.total_price || it.totalPrice || (Number(it.unit_price || it.unitPrice || 0) * qty) || 0);
            const costUnit2 = Number(it.product?.costPrice || it.costPrice || 0);
            currentProfit += Math.max(0, rev2 - costUnit2 * qty);
          });
        } else if (createdAt >= previousProfitStart && createdAt <= previousProfitEnd) {
          previousProfitRevenue += amount;
          const lineItems2 = order.items || order.order_items || order.details || [];
          lineItems2.forEach((it: any) => {
            const qty = Number(it.quantity || 0);
            const rev2 = Number(it.total_price || it.totalPrice || (Number(it.unit_price || it.unitPrice || 0) * qty) || 0);
            const costUnit2 = Number(it.product?.costPrice || it.costPrice || 0);
            previousProfit += Math.max(0, rev2 - costUnit2 * qty);
          });
        }
        
        // Accumulate per-order only; month buckets will be constructed after
      });

      // Helper to get month end
      const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth()+1, 0, 23, 59, 59, 999);
      // Create 12 months of data comparing current year vs previous year
      // Start from 11 months ago (most distant), end at last month (most recent)
      const merged = Array.from({ length: 12 }).map((_, i) => {
        // Calculate months back: where i=0 is 11 months back, i=11 is 0 months back (last month)
        const monthsBack = 11 - i; // i=0: 11 months back, i=11: 0 months back (last month)
        
        // Get the month by subtracting from current date
        const targetDate = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
        const curStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        const curEnd = endOfMonth(curStart);
        
        // Previous year: same month
        const prevStart = new Date(targetDate.getFullYear() - 1, targetDate.getMonth(), 1);
        const prevEnd = endOfMonth(prevStart);
        
        const sumInRange = (start: Date, end: Date) => {
          let sum = 0;
          allOrders.forEach((order: any) => {
            const createdAt = order.created_at ? new Date(order.created_at) : new Date();
            if (createdAt >= start && createdAt <= end) sum += (order.total_amount || 0);
          });
          return sum;
        };
        const currentSum = sumInRange(curStart, curEnd);
        const prevSum = sumInRange(prevStart, prevEnd);
        return {
          month: format(curStart, 'MMM-yyyy', { locale: vi }),
          label: `T${String(curStart.getMonth() + 1).padStart(2, '0')}`,
          current: currentSum,
          previous: prevSum,
          monthNumber: curStart.getMonth(),
          year: curStart.getFullYear(),
        };
      }).sort((a, b) => {
        // Sort by month number only
        return a.monthNumber - b.monthNumber;
      });

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
        totalProfit: currentProfit,
        totalProducts,
        totalOrders: allOrders?.length || 0,
        currentMonthRevenue,
        previousMonthRevenue,
        currentProfit,
        previousProfit,
        currentProfitRevenue,
        previousProfitRevenue
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

      setRevenueData(merged);
      setInventoryData(inventoryArray);
      setOrderStatus(orderStatusArray);
      setLowStockProducts(lowStockItems.slice(0, 5)); // Show only top 5
      setProductStockData(productStockChartData);
      // Region revenue list (top 5 provinces)
      const regionList = Object.keys(provinceToRevenue)
        .map(name => ({ name, revenue: provinceToRevenue[name] }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      setRegionRevenue(regionList);
      // Top products (by revenue)
      const topProds = Object.values(productAggregate)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 5);
      setTopProducts(topProds as any);
      // Top customers (by revenue)
      const topCusts = Object.keys(customerAggregate).map(id => customerAggregate[id])
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      setTopCustomers(topCusts);
      // Recent orders (latest 5)
      const sortedRecent = [...allOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentOrders(sortedRecent);
      // Recent activities: mix notifications + order created/completed
      const orderActivities = sortedRecent.slice(0, 10).map(o => ({
        id: `order-${o.id}`,
        type: o.status === 'completed' ? 'success' : 'info',
        title: o.status === 'completed' ? 'Đơn hàng hoàn thành' : 'Đơn hàng mới',
        message: `${o.order_number} • ${o.customer_name || 'Khách lẻ'}`,
        amount: o.total_amount || 0,
        createdAt: o.created_at
      }));
      const notifActivities = (notifications.notifications || []).map((n: any) => ({
        id: `notif-${n.id}`,
        type: n.type || 'info',
        title: n.title,
        message: n.message,
        amount: undefined,
        createdAt: n.createdAt || n.created_at
      }));
      const combined = [...orderActivities, ...notifActivities]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8);
      setRecentActivities(combined);
      // Category revenue array (top 5)
      const palette = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6'];
      const catArray = Object.keys(categoryProfitMap).map((name, idx) => ({ name, value: categoryProfitMap[name], color: palette[idx % palette.length], fill: palette[idx % palette.length] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map((c, idx) => ({ ...c, color: c.color, fill: c.fill }));
      setCategoryProfit(catArray);
      // New customers in current month
      const newCustCount = Object.values(customerFirstOrder).filter((d: any) => d >= pStart && d <= pEnd).length;
      setNewCustomers(newCustCount);
      
      // Set revenue loading to false after processing
      setLoadingStates(prev => ({ ...prev, revenue: false }));

    } catch (error) {
      // Set all loading states to false and show error
      setLoadingStates({ orders: false, products: false, inventory: false, revenue: false });
      setErrorStates({ 
        orders: 'Lỗi tải dữ liệu đơn hàng (cần Read Orders)', 
        products: 'Lỗi tải dữ liệu sản phẩm (cần Read Products)', 
        inventory: 'Lỗi tải dữ liệu tồn kho (cần Read Inventory)',
        revenue: 'Lỗi tải dữ liệu doanh thu (cần Read Revenue)'
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
    const delta = dashboardData.currentMonthRevenue - dashboardData.previousMonthRevenue;
    if (delta <= 0) return 0;
    if (dashboardData.previousMonthRevenue === 0) return 0;
    return Math.round((delta / dashboardData.previousMonthRevenue) * 100);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tổng Doanh Thu - gated */}
          {errorStates.revenue || loadingStates.revenue ? (
            <PermissionErrorCard 
              title="Tổng Doanh Thu" 
              error={errorStates.revenue} 
              loading={loadingStates.revenue} 
            />
          ) : (
            canSeeTotalRevenue && (
              <Card>
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
          <Card>
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
          <Card>
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

          {/* Tổng Đơn Hàng */}
          {errorStates.orders || loadingStates.orders ? (
            <PermissionErrorCard 
              title="Tổng Đơn Hàng" 
              error={errorStates.orders} 
              loading={loadingStates.orders} 
            />
          ) : (
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
          )}

          {/* Sản Phẩm Tồn Kho */}
          {errorStates.products || loadingStates.products ? (
            <PermissionErrorCard 
              title="Sản Phẩm Tồn Kho" 
              error={errorStates.products} 
              loading={loadingStates.products} 
            />
          ) : (
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
          )}

          {/* Công Nợ Tồn Đọng */}
          {errorStates.orders || loadingStates.orders ? (
            <PermissionErrorCard 
              title="Công Nợ Tồn Đọng" 
              error={errorStates.orders} 
              loading={loadingStates.orders} 
            />
          ) : (
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
          )}

          {/* Đơn chờ xử lý */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đơn chờ xử lý</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(orderStatus.find(s => s.trangThai === 'Chờ xử lý')?.soLuong) || 0}</div>
              <p className="text-xs text-muted-foreground">Cần xử lý trong ngày</p>
            </CardContent>
          </Card>

          {/* Khách hàng mới */}
          <Card>
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
                          <Pie data={categoryProfit} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                            {categoryProfit.map((entry, index) => (
                              <Cell key={`cat-${index}`} fill={entry.fill || entry.color || '#3b82f6'} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: any, n: string) => [formatCurrency(Number(v)), n]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-4 space-y-2">
                        {categoryProfit.map((c, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                              <span>{c.name}</span>
                            </div>
                            <span className="font-medium">{formatCurrency(c.value)}</span>
                          </div>
                        ))}
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
          </TabsContent>
        </Tabs>

        {/* Cảnh báo tồn kho & Hoạt động gần đây */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Cảnh báo tồn kho</CardTitle>
            </CardHeader>
            <CardContent>
              {!canViewInventory ? (
                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Bạn không có quyền xem dữ liệu tồn kho (cần Read Inventory)
                  </AlertDescription>
                </Alert>
              ) : errorStates.inventory ? (
                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {errorStates.inventory}
                  </AlertDescription>
                </Alert>
              ) : loadingStates.inventory ? (
                <div className="text-muted-foreground text-sm">Đang tải dữ liệu tồn kho...</div>
              ) : lowStockProducts.length === 0 ? (
                <p className="text-muted-foreground">Không có cảnh báo</p>
              ) : (
                <div className="space-y-3">
                  {lowStockProducts.map((p, idx) => {
                    const isCritical = p.status === 'Hết hàng';
                    const percent = Math.min(100, Math.round(((p.stock || 0) / ((p.minStock || 20))) * 100));
                    return (
                      <div key={idx} className={`p-3 rounded-lg ${isCritical ? 'bg-red-50' : 'bg-orange-50'}`}>
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{p.name}</div>
                          <span className={`text-xs px-2 py-1 rounded-full ${isCritical ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{isCritical ? 'Nghiêm trọng' : 'Cảnh báo'}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Tồn: {p.stock || 0}</div>
                        <div className="mt-2 h-2 bg-muted rounded">
                          <div className={`h-2 rounded ${isCritical ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

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
                  <div key={idx} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{o.order_number}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : o.status === 'processing' ? 'bg-blue-100 text-blue-700' : o.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                        >{o.status === 'pending' ? 'Chờ xử lý' : o.status === 'processing' ? 'Đang giao' : o.status === 'completed' ? 'Hoàn thành' : o.status}
                        </span>
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
