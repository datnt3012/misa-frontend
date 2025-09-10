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
  // Get payments for a specific order
  getPaymentsByOrder: async (orderId: string): Promise<Payment[]> => {
    const response = await api.get<any>(`${API_ENDPOINTS.PAYMENTS.LIST}?order_id=${orderId}`);
    const data = response?.data || response;
    
    // Handle different response structures
    let payments = [];
    if (Array.isArray(data)) {
      payments = data;
    } else if (data && Array.isArray(data.data)) {
      payments = data.data;
    } else if (data && Array.isArray(data.rows)) {
      payments = data.rows;
    }
    
    return payments.map((payment: any) => ({
      id: payment.id,
      order_id: payment.order_id,
      amount: Number(payment.amount || 0),
      payment_method: payment.payment_method || 'cash',
      payment_date: payment.payment_date || payment.created_at,
      notes: payment.notes || '',
      created_by: payment.created_by || '',
      created_at: payment.created_at || '',
      updated_at: payment.updated_at || '',
      creator_profile: payment.creator_profile ? {
        full_name: payment.creator_profile.full_name || '',
      } : undefined,
    }));
  },

  // Create a new payment
  createPayment: async (paymentData: CreatePaymentRequest): Promise<Payment> => {
    const response = await api.post<Payment>(API_ENDPOINTS.PAYMENTS.CREATE, paymentData);
    return response.data || response;
  },

  // Update a payment
  updatePayment: async (paymentId: string, paymentData: UpdatePaymentRequest): Promise<Payment> => {
    const response = await api.patch<Payment>(API_ENDPOINTS.PAYMENTS.UPDATE(paymentId), paymentData);
    return response.data || response;
  },

  // Delete a payment
  deletePayment: async (paymentId: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(API_ENDPOINTS.PAYMENTS.DELETE(paymentId));
    return response.data || response;
  },
};
