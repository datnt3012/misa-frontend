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
  currentDebt?: number;
  previousDebt?: number;
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
    // Backend API already excludes cancelled orders by default, no need for params
    const url = queryParams.toString() 
      ? `/dashboard/summary?${queryParams.toString()}`
      : '/dashboard/summary';
    
    try {
      console.log('[Dashboard API] Fetching summary with URL:', url);
      const response = await api.get<any>(url);
      const data = response?.data || response;
      console.log('[Dashboard API] Summary response:', data);
      
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
  
  // Get revenue series for last 12 months (backend automatically excludes cancelled orders)
  getRevenueSeries: async (): Promise<RevenueDataPoint[]> => {
    try {
      // Backend API already excludes cancelled orders by default, no need for params
      const url = '/dashboard/revenue-series';
      console.log('[Dashboard API] Fetching revenue series with URL:', url);
      const response = await api.get<any>(url);
      const data = response?.data || response;
      
      console.log('[Dashboard API] Revenue series response:', data);
      
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
      const response = await api.get<any>(`/dashboard/top-products?limit=${limit}`);
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
      const response = await api.get<any>(`/dashboard/top-customers?limit=${limit}`);
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
      const response = await api.get<any>(`/dashboard/region-revenue?limit=${limit}`);
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
      const response = await api.get<any>(`/dashboard/category-profit?limit=${limit}`);
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
  
  // Get recent activities from history table only
  getRecentActivities: async (limit: number = 8): Promise<any[]> => {
    try {
      // Use /history endpoint instead of /dashboard/recent-activities
      const response = await api.get<any>(`/history?limit=${limit}&orderBy=createdAt&order=desc`);
      const data = response?.data || response;
      
      // Handle different response structures
      let historyItems: any[] = [];
      
      if (Array.isArray(data)) {
        historyItems = data;
      } else if (data && Array.isArray(data.data)) {
        historyItems = data.data;
      } else if (data && Array.isArray(data.rows)) {
        historyItems = data.rows;
      } else if (data && data.data && Array.isArray(data.data.rows)) {
        historyItems = data.data.rows;
      }
      
      // Transform history items to match the expected format for dashboard
      return historyItems.slice(0, limit).map((item: any) => ({
        id: item.id,
        title: item.title || item.message || 'Hoạt động',
        message: item.message || item.title || '',
        type: item.type || 'info',
        amount: item.amount || item.metadata?.amount,
        createdAt: item.createdAt || item.created_at || item.created_at,
        entityType: item.entityType || item.entity_type,
        entityId: item.entityId || item.entity_id,
        action: item.action,
      }));
    } catch (error) {
      console.error('Error fetching recent activities from history:', error);
      return [];
    }
  },
};

