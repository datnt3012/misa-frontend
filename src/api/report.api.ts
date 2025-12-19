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
export const reportApi = {
  /**
   * Get revenue report summary
   * Returns total revenue, total debt, total profit (if authorized), total orders, and average per month
   */
  getRevenueReport: async (): Promise<RevenueReportResponse> => {
    try {
      const response = await api.get<any>(API_ENDPOINTS.REPORT.REVENUE);
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