import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'card' | 'other';
  payment_date: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator_profile?: {
    full_name: string;
  };
}

export interface CreatePaymentRequest {
  order_id: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'card' | 'other';
  payment_date: string;
  notes?: string;
  created_by: string;
}

export interface UpdatePaymentRequest {
  amount?: number;
  payment_method?: 'cash' | 'bank_transfer' | 'card' | 'other';
  payment_date?: string;
  notes?: string;
}

export const paymentsApi = {
  // Get payments for a specific order (mock data since backend doesn't have payments API)
  getPaymentsByOrder: async (orderId: string): Promise<Payment[]> => {
    // Return empty array since backend doesn't have payments API
    // TODO: Implement when backend adds payments API
    return [];
  },

  // Create a new payment (mock since backend doesn't have payments API)
  createPayment: async (paymentData: CreatePaymentRequest): Promise<Payment> => {
    // Return mock payment since backend doesn't have payments API
    // TODO: Implement when backend adds payments API
    return {
      id: `payment_${Date.now()}`,
      order_id: paymentData.order_id,
      amount: paymentData.amount,
      payment_method: paymentData.payment_method,
      payment_date: paymentData.payment_date,
      notes: paymentData.notes || '',
      created_by: paymentData.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },

  // Update a payment (mock since backend doesn't have payments API)
  updatePayment: async (paymentId: string, paymentData: UpdatePaymentRequest): Promise<Payment> => {
    // Return mock updated payment since backend doesn't have payments API
    // TODO: Implement when backend adds payments API
    return {
      id: paymentId,
      order_id: '',
      amount: paymentData.amount || 0,
      payment_method: paymentData.payment_method || 'cash',
      payment_date: paymentData.payment_date || new Date().toISOString(),
      notes: paymentData.notes || '',
      created_by: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },

  // Delete a payment (mock since backend doesn't have payments API)
  deletePayment: async (paymentId: string): Promise<{ message: string }> => {
    // Return mock success since backend doesn't have payments API
    // TODO: Implement when backend adds payments API
    return { message: 'Payment deleted successfully' };
  },
};
