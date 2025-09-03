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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
};

export default function Revenue() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [debtData, setDebtData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { userRole } = useAuth();

  // Check if user can view revenue data at all (thủ kho không thấy doanh thu)
  const canViewRevenue = userRole === 'owner_director' || userRole === 'chief_accountant' || userRole === 'accountant' || userRole === 'admin';
  
  // Check if user can view profit data (chỉ kế toán trưởng và giám đốc thấy lãi)
  const canViewProfit = userRole === 'owner_director' || userRole === 'chief_accountant' || userRole === 'admin';

  // Early return if user cannot view revenue data
  if (!canViewRevenue) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Không có quyền truy cập</h1>
          <p className="text-muted-foreground mt-2">
            Bạn không có quyền xem dữ liệu doanh thu
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchCustomers();
    fetchRevenueData();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, customer_code, name')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      
      // Fetch actual revenue data from payments and revenue table
      const { data: revenueRecords, error: revenueError } = await supabase
        .from('revenue')
        .select(`
          *,
          orders (
            order_number,
            customer_name,
            status,
            total_amount,
            debt_amount,
            order_items (
              quantity,
              unit_price,
              total_price,
              products (
                cost_price
              )
            )
          )
        `)
        .order('revenue_date');

      if (revenueError) throw revenueError;

      // Also get debt information from all orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, debt_amount, status');

      if (ordersError) throw ordersError;

      // Calculate revenue by month from actual revenue records
      const monthlyRevenue: any = {};
      let totalDebt = 0;
      let totalProfit = 0;
      let totalRevenue = 0;

      // Calculate debt from all orders
      orders?.forEach(order => {
        totalDebt += order.debt_amount || 0;
      });

      // Calculate revenue from revenue records (from actual payments)
      revenueRecords?.forEach(revenue => {
        const month = format(new Date(revenue.revenue_date), 'MMM', { locale: vi });
        const year = new Date(revenue.revenue_date).getFullYear();
        const key = `${month}-${year}`;

        if (!monthlyRevenue[key]) {
          monthlyRevenue[key] = {
            month: month,
            year: year,
            revenue: 0,
            profit: 0,
            debt: 0,
            orderCount: 0,
            paymentCount: 0
          };
        }

        monthlyRevenue[key].revenue += revenue.amount || 0;
        monthlyRevenue[key].paymentCount += 1;
        totalRevenue += revenue.amount || 0;

        // Calculate profit if user can view it and order has items
        if (canViewProfit && revenue.orders?.order_items) {
          let orderProfit = 0;
          revenue.orders.order_items.forEach(item => {
            const costPrice = item.products?.cost_price || 0;
            const profit = (item.unit_price - costPrice) * item.quantity;
            orderProfit += profit;
          });
          // Proportional profit based on payment amount vs order total
          const orderTotal = revenue.orders.total_amount || 1;
          const proportionalProfit = (revenue.amount / orderTotal) * orderProfit;
          monthlyRevenue[key].profit += proportionalProfit;
          totalProfit += proportionalProfit;
        }
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
        totalProfit,
        debtRatio: totalRevenue > 0 ? (totalDebt / totalRevenue) * 100 : 0,
        profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
      });

    } catch (error) {
      console.error('Error fetching revenue data:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải dữ liệu doanh thu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">Báo Cáo Doanh Thu</h1>
          <p className="text-muted-foreground">Đang tải dữ liệu...</p>
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
        
        {canViewProfit && (
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
              <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Doanh thu" />
              <Bar dataKey="debt" fill="hsl(var(--destructive))" name="Công nợ" />
              {canViewProfit && <Bar dataKey="profit" fill="hsl(var(--secondary))" name="Lãi" />}
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
              <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
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
              {canViewProfit && (
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  name="Lãi"
                />
              )}
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