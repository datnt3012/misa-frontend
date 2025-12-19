import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

export interface RevenueReportResponse {
  totalRevenue: number;
  totalDebt: number;
  totalProfit?: number; // Only available for admin/owner/chief_accountant
  totalOrders: number;
  averagePerMonth: number;
  monthsCount?: number;
}

export interface RevenueReportFilters {
  startDate?: string;
  endDate?: string;
  createdStartDate?: string;
  createdEndDate?: string;
  completedStartDate?: string;
  completedEndDate?: string;
  customerId?: string;
  productIds?: string;
  status?: string;
  minTotalAmount?: number;
  maxTotalAmount?: number;
  created_by?: string;
  paymentMethod?: string;
  region?: string;
  category?: string;
}

export const reportApi = {
  /**
   * Get revenue report summary
   * Returns total revenue, total debt, total profit (if authorized), total orders, and average per month
   */
  getRevenueReport: async (filters?: RevenueReportFilters): Promise<RevenueReportResponse> => {
    try {
      const params = new URLSearchParams();
      
      // Add filter parameters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
          }
        });
      }
      
      const url = params.toString() ? `${API_ENDPOINTS.REPORT.REVENUE}?${params.toString()}` : API_ENDPOINTS.REPORT.REVENUE;
      const response = await api.get<any>(url);
      
      // Handle different response structures
      const data = response?.data || response;
      return {
        totalRevenue: data.totalRevenue || 0,
        totalDebt: data.totalDebt || 0,
        totalProfit: data.totalProfit,
        totalOrders: data.totalOrders || 0,
        averagePerMonth: data.averagePerMonth || 0,
        monthsCount: data.monthsCount,
      };
    } catch (error: any) {
      throw error;
    }
  },
};