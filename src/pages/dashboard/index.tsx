import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Package, TrendingUp, ShoppingCart, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { productApi } from "@/api/product.api";
import { orderApi } from "@/api/order.api";
import { stockLevelsApi } from "@/api/stockLevels.api";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useRouteBasedLazyData } from "@/hooks/useLazyData";
import { Loading } from "@/components/ui/loading";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";
import { formatCurrency } from "@/utils";
import Revenue from "./view/revenue";
import Inventory from "./view/inventory";
import Order from "./view/order";

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

    const canViewOrders = hasPermission('ORDERS_READ');
    const canViewProducts = hasPermission('PRODUCTS_READ');
    const canViewInventory = hasPermission('INVENTORY_READ');
    const canViewRevenue = hasPermission('REVENUE_READ');

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
            }

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
                    {/* Doanh Thu Tháng Hiện Tại */}
                    {errorStates.revenue || loadingStates.revenue ? (
                        <PermissionErrorCard
                            title="Doanh Thu Tháng Hiện Tại"
                            error={errorStates.revenue}
                            loading={loadingStates.revenue}
                        />
                    ) : (
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
                    )}

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
                </div>

                {/* Biểu đồ và thống kê chi tiết */}
                <Tabs defaultValue="revenue" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="revenue">Doanh Thu</TabsTrigger>
                        <TabsTrigger value="inventory">Tồn Kho</TabsTrigger>
                        <TabsTrigger value="orders">Đơn Hàng</TabsTrigger>
                    </TabsList>

                    <TabsContent value="revenue" className="space-y-4">
                        <Revenue
                            errorStates={errorStates}
                            revenueData={revenueData}
                            loadingStates={loadingStates}
                        />
                    </TabsContent>

                    <TabsContent value="inventory" className="space-y-4">
                        <Inventory
                            errorStates={errorStates}
                            productStockData={productStockData}
                            inventoryData={inventoryData}
                            loadingStates={loadingStates}
                            lowStockProducts={lowStockProducts}
                        />
                    </TabsContent>

                    <TabsContent value="orders" className="space-y-4">
                        <Order
                            errorStates={errorStates}
                            orderStatus={orderStatus}
                            loadingStates={loadingStates}
                        />
                    </TabsContent>
                </Tabs>
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
