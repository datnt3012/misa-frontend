import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

export interface DashboardSummary {
  totalRevenue: number;
  totalDebt: number;
  totalProfit: number;
  totalProducts: number;
  totalOrders: number;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  currentProfit: number;
  previousProfit: number;
  currentProfitRevenue: number;
  previousProfitRevenue: number;
}

export interface RevenueDataPoint {
  month: string;
  label: string;
  current: number;
  previous: number;
  monthNumber: number;
  year: number;
}

export interface OrderStatusData {
  [status: string]: number;
}

export interface LowStockProduct {
  name: string;
  stock: number;
  status: string;
  minStock: number;
}

export interface ProductStockData {
  name: string;
  stock: number;
  minStock: number;
  status: string;
  color: string;
  code: string;
}

export interface RegionRevenueData {
  name: string;
  revenue: number;
}

export interface CategoryProfitData {
  name: string;
  value: number;
}

export interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

export interface TopCustomer {
  name: string;
  revenue: number;
  lastDate: Date | string;
}

export interface RecentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export const dashboardApi = {
  // Get only summary metrics (excludes cancelled orders from revenue)
  getSummary: async (params?: {
    revenuePeriod?: 'month' | 'year';
    profitPeriod?: 'month' | 'year';
  }): Promise<DashboardSummary> => {
    const queryParams = new URLSearchParams();
    
    if (params?.revenuePeriod) {
      queryParams.append('revenuePeriod', params.revenuePeriod);
    }
    if (params?.profitPeriod) {
      queryParams.append('profitPeriod', params.profitPeriod);
    }
    // Exclude cancelled orders from revenue calculation
    queryParams.append('excludeStatus', 'cancelled');
    
    const url = `/dashboard/summary?${queryParams.toString()}`;
    
    try {
      const response = await api.get<any>(url);
      const data = response?.data || response;
      
      // Return data if it's already in the correct format
      if (data && typeof data === 'object' && 'totalRevenue' in data) {
        return data as DashboardSummary;
      }
      
      // Return default values if data is not in expected format
      return {
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
      };
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      return {
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
      };
    }
  },
  
  // Get revenue series for last 12 months (excludes cancelled orders)
  getRevenueSeries: async (): Promise<RevenueDataPoint[]> => {
    try {
      // Exclude cancelled orders from revenue calculation
      const response = await api.get<any>('/dashboard/revenue-series?excludeStatus=cancelled');
      const data = response?.data || response;
      
      // If data is an array, return it
      if (Array.isArray(data)) {
        return data;
      }
      
      // If data is wrapped in an object, try to extract array
      if (data && Array.isArray(data.rows)) {
        return data.rows;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching revenue series:', error);
      return [];
    }
  },
  
  // Get order status breakdown
  getOrderStatus: async (): Promise<OrderStatusData> => {
    try {
      const response = await api.get<any>('/dashboard/order-status');
      const data = response?.data || response;
      
      // If data is an object, return it
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return data as OrderStatusData;
      }
      
      return {};
    } catch (error) {
      console.error('Error fetching order status:', error);
      return {};
    }
  },
  
  // Get inventory overview and low stock products
  getInventoryOverview: async (): Promise<{
    inventoryData: any[];
    lowStockProducts: LowStockProduct[];
    productStockData: ProductStockData[];
    totalProducts: number;
  }> => {
    try {
      const response = await api.get<any>('/dashboard/inventory-overview');
      const data = response?.data || response;
      
      // If data is in expected format, return it
      if (data && typeof data === 'object') {
        return {
          inventoryData: data.inventoryData || [],
          lowStockProducts: data.lowStockProducts || [],
          productStockData: data.productStockData || [],
          totalProducts: data.totalProducts || 0,
        };
      }
      
      return {
        inventoryData: [],
        lowStockProducts: [],
        productStockData: [],
        totalProducts: 0,
      };
    } catch (error) {
      console.error('Error fetching inventory overview:', error);
      return {
        inventoryData: [],
        lowStockProducts: [],
        productStockData: [],
        totalProducts: 0,
      };
    }
  },
  
      // Get top products by revenue (excludes cancelled orders)
  getTopProducts: async (limit: number = 5): Promise<TopProduct[]> => {
    try {
      const response = await api.get<any>(`/dashboard/top-products?limit=${limit}&excludeStatus=cancelled`);
      const data = response?.data || response;
      
      if (Array.isArray(data)) {
        return data;
      }
      
      if (data && Array.isArray(data.rows)) {
        return data.rows;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching top products:', error);
      return [];
    }
  },
  
      // Get top customers by revenue (excludes cancelled orders)
  getTopCustomers: async (limit: number = 5): Promise<TopCustomer[]> => {
    try {
      const response = await api.get<any>(`/dashboard/top-customers?limit=${limit}&excludeStatus=cancelled`);
      const data = response?.data || response;
      
      if (Array.isArray(data)) {
        return data;
      }
      
      if (data && Array.isArray(data.rows)) {
        return data.rows;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching top customers:', error);
      return [];
    }
  },
  
      // Get revenue by region (province) (excludes cancelled orders)
  getRegionRevenue: async (limit: number = 5): Promise<RegionRevenueData[]> => {
    try {
      const response = await api.get<any>(`/dashboard/region-revenue?limit=${limit}&excludeStatus=cancelled`);
      const data = response?.data || response;
      
      if (Array.isArray(data)) {
        return data;
      }
      
      if (data && Array.isArray(data.rows)) {
        return data.rows;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching region revenue:', error);
      return [];
    }
  },
  
      // Get profit by category (excludes cancelled orders)
  getCategoryProfit: async (limit: number = 5): Promise<CategoryProfitData[]> => {
    try {
      const response = await api.get<any>(`/dashboard/category-profit?limit=${limit}&excludeStatus=cancelled`);
      const data = response?.data || response;
      
      if (Array.isArray(data)) {
        return data;
      }
      
      if (data && Array.isArray(data.rows)) {
        return data.rows;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching category profit:', error);
      return [];
    }
  },
  
  // Get recent orders
  getRecentOrders: async (limit: number = 5): Promise<RecentOrder[]> => {
    try {
      const response = await api.get<any>(`/dashboard/recent-orders?limit=${limit}`);
      const data = response?.data || response;
      
      if (Array.isArray(data)) {
        return data;
      }
      
      if (data && Array.isArray(data.rows)) {
        return data.rows;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      return [];
    }
  },
  
  // Get recent activities (orders + notifications)
  getRecentActivities: async (limit: number = 8): Promise<any[]> => {
    try {
      const response = await api.get<any>(`/dashboard/recent-activities?limit=${limit}`);
      const data = response?.data || response;
      
      if (Array.isArray(data)) {
        return data;
      }
      
      if (data && Array.isArray(data.rows)) {
        return data.rows;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      return [];
    }
  },
};

