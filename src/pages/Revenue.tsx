import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { CalendarIcon, Filter, Download, TrendingUp, AlertCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PermissionGuard } from '@/components/PermissionGuard';
import { customerApi } from '@/api/customer.api';
import { orderApi } from '@/api/order.api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRouteBasedLazyData } from '@/hooks/useLazyData';
import { Loading } from '@/components/ui/loading';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
};

function RevenueContent() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [debtData, setDebtData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchCustomers = async () => {
    try {
      const response = await customerApi.getCustomers({ page: 1, limit: 1000 });
      setCustomers(response.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error; // Re-throw for lazy loading error handling
    }
  };

  const fetchRevenueData = async () => {
    try {
      
      // Fetch orders data from backend API
      const ordersResponse = await orderApi.getOrders({ page: 1, limit: 1000 });
      const orders = ordersResponse.orders || [];

      // Calculate revenue by month from orders
      const monthlyRevenue: any = {};
      let totalDebt = 0;
      let totalRevenue = 0;

      // Process orders to calculate revenue and debt
      orders.forEach(order => {
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
        description: "Không thể tải dữ liệu doanh thu",
        variant: "destructive",
      });
      throw error; // Re-throw for lazy loading error handling
    }
  };

  // Lazy loading configuration
  const lazyData = useRouteBasedLazyData({
    revenue: {
      loadFunction: async () => {
        await Promise.all([fetchCustomers(), fetchRevenueData()]);
      }
    }
  });

  const getMonthIndex = (monthName: string) => {
    const months = ['Thg 1', 'Thg 2', 'Thg 3', 'Thg 4', 'Thg 5', 'Thg 6', 
                   'Thg 7', 'Thg 8', 'Thg 9', 'Thg 10', 'Thg 11', 'Thg 12'];
    return months.indexOf(monthName);
  };

  const handleFilter = () => {
    fetchRevenueData();
    toast({
      title: "Bộ lọc được áp dụng",
      description: `Lọc từ ${startDate ? format(startDate, 'dd/MM/yyyy', { locale: vi }) : 'không xác định'} đến ${endDate ? format(endDate, 'dd/MM/yyyy', { locale: vi }) : 'không xác định'}${selectedCustomer !== 'all' ? ` cho khách hàng ${customers.find(c => c.id === selectedCustomer)?.name}` : ''}`,
    });
  };

  const resetFilter = () => {
    setSelectedCustomer("all");
    setStartDate(undefined);
    setEndDate(undefined);
    fetchRevenueData();
  };

  const revenueState = lazyData.getDataState('revenue');
  
  if (revenueState.isLoading || revenueState.error) {
    return (
      <Loading 
        message="Đang tải dữ liệu doanh thu..."
        error={revenueState.error}
        onRetry={() => lazyData.reloadData('revenue')}
      />
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date Range */}
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
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="pointer-events-auto"
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
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Customer Filter */}
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

            {/* Filter Actions */}
            <div className="space-y-2">
              <Label className="invisible">Actions</Label>
              <div className="flex gap-2">
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
    </div>
  );
}

export default function Revenue() {
  return (
    <PermissionGuard requiredPermissions={['revenue.view']}>
      <RevenueContent />
    </PermissionGuard>
  );
}

