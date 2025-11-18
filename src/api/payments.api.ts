import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

export interface Payment {
  id: string;
  order_id: string;
  orderId?: string; // Support both formats
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'card' | 'other';
  paymentMethod?: 'cash' | 'bank_transfer' | 'card' | 'other'; // Support both formats
  payment_date: string;
  paymentDate?: string; // Support both formats
  notes?: string;
  note?: string; // Support both formats
  filePaths?: string[] | null; // Array of file paths
  bank?: string; // Bank name or ID when payment method is bank_transfer
  created_by?: string;
  createdBy?: string; // Support both formats
  created_at: string;
  createdAt?: string; // Support both formats
  updated_at: string;
  updatedAt?: string; // Support both formats
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
  created_by?: string; // Optional - may be set by backend from auth token
  bank?: string; // Bank ID or code when payment method is bank_transfer
}

export interface UpdatePaymentRequest {
  amount?: number;
  payment_method?: 'cash' | 'bank_transfer' | 'card' | 'other';
  payment_date?: string;
  notes?: string;
}

// Normalize payment data from API response
const normalizePayment = (row: any): Payment => ({
  id: row.id || '',
  order_id: row.order_id ?? row.orderId ?? '',
  orderId: row.orderId ?? row.order_id,
  amount: typeof row.amount === 'string' ? parseFloat(row.amount) : Number(row.amount || 0),
  payment_method: row.payment_method ?? row.paymentMethod ?? 'cash',
  paymentMethod: row.paymentMethod ?? row.payment_method,
  payment_date: row.payment_date ?? row.paymentDate ?? row.created_at ?? row.createdAt ?? new Date().toISOString(),
  paymentDate: row.paymentDate ?? row.payment_date,
  notes: row.notes ?? row.note ?? undefined,
  note: row.note ?? row.notes,
  filePaths: row.filePaths ?? row.file_paths ?? null, // Support both camelCase and snake_case
  bank: row.bank ?? undefined, // Bank name or ID when payment method is bank_transfer
  created_by: row.created_by ?? row.createdBy ?? row.user_id ?? row.userId ?? '',
  createdBy: row.createdBy ?? row.created_by,
  created_at: row.created_at ?? row.createdAt ?? new Date().toISOString(),
  createdAt: row.createdAt ?? row.created_at,
  updated_at: row.updated_at ?? row.updatedAt ?? new Date().toISOString(),
  updatedAt: row.updatedAt ?? row.updated_at,
  creator_profile: (row.creator_profile ?? row.creator ?? row.user) ? (() => {
    // Try to get full_name from various sources
    const fullName = row.creator_profile?.full_name ?? 
                     row.creator?.fullName ?? 
                     row.user?.fullName;
    if (fullName) return { full_name: fullName };
    
    // Try to construct from firstName and lastName
    const firstName = row.creator?.firstName ?? row.user?.firstName ?? '';
    const lastName = row.creator?.lastName ?? row.user?.lastName ?? '';
    const constructedName = `${firstName} ${lastName}`.trim();
    if (constructedName) return { full_name: constructedName };
    
    // Fallback to name field
    const name = row.creator?.name ?? row.user?.name;
    return { full_name: name ?? 'Không xác định' };
  })() : undefined,
});

export const paymentsApi = {
  // Get payments for a specific order
  // Tries multiple endpoints in order:
  // 1. GET /orders/:id/payments (preferred)
  // 2. GET /payments?orderId=:id (fallback)
  getPaymentsByOrder: async (orderId: string): Promise<Payment[]> => {
    try {
      // Try endpoint: GET /orders/:id/payments (preferred)
      try {
        const response = await api.get<any>(API_ENDPOINTS.ORDERS.PAYMENTS(orderId));
        const data = response?.data || response;
        
        // Handle different response structures
        if (Array.isArray(data)) {
          return data.map(normalizePayment);
        } else if (data?.rows && Array.isArray(data.rows)) {
          return data.rows.map(normalizePayment);
        } else if (data?.payments && Array.isArray(data.payments)) {
          return data.payments.map(normalizePayment);
        } else if (data?.data && Array.isArray(data.data)) {
          return data.data.map(normalizePayment);
        }
      } catch (ordersEndpointError: any) {
        console.log('[paymentsApi] Orders endpoint not available, trying payments endpoint:', ordersEndpointError);
        
        // Fallback: GET /payments?orderId=:id
        const response = await api.get<any>(`${API_ENDPOINTS.PAYMENTS.LIST}?orderId=${orderId}`);
        const data = response?.data || response;
        
        // Handle different response structures
        if (Array.isArray(data)) {
          return data.map(normalizePayment);
        } else if (data?.rows && Array.isArray(data.rows)) {
          return data.rows.map(normalizePayment);
        } else if (data?.payments && Array.isArray(data.payments)) {
          return data.payments.map(normalizePayment);
        } else if (data?.data && Array.isArray(data.data)) {
          return data.data.map(normalizePayment);
        }
      }
      
      return [];
    } catch (error: any) {
      console.error('[paymentsApi] Error loading payments:', error);
      // Return empty array if API doesn't exist or fails
      return [];
    }
  },

  // Create a new payment (JSON only, no files)
  createPayment: async (paymentData: CreatePaymentRequest): Promise<Payment> => {
    try {
      // API expects camelCase format
      const response = await api.post<any>(API_ENDPOINTS.PAYMENTS.CREATE, {
        orderId: paymentData.order_id,
        amount: paymentData.amount,
        paymentMethod: paymentData.payment_method,
        paymentDate: paymentData.payment_date || new Date().toISOString(),
        note: paymentData.notes,
        // createdBy is usually set by backend from auth token, but include if provided
        ...(paymentData.created_by && { createdBy: paymentData.created_by }),
        // Include bank if payment method is bank_transfer
        ...(paymentData.payment_method === 'bank_transfer' && paymentData.bank && { bank: paymentData.bank }),
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = response?.data || response;
      const paymentData_raw = data?.data || data?.payment || data;
      
      if (paymentData_raw) {
        return normalizePayment(paymentData_raw);
      }
      
      // If response doesn't have the expected structure, create a normalized payment from request
      return normalizePayment({
        ...paymentData,
        id: `payment_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Error creating payment:', error);
      throw error;
    }
  },

  // Get a single payment by ID
  getPaymentById: async (paymentId: string): Promise<Payment> => {
    try {
      const response = await api.get<any>(`${API_ENDPOINTS.PAYMENTS.LIST}/${paymentId}`);
      const data = response?.data || response;
      const paymentData_raw = data?.data || data?.payment || data;
      
      if (paymentData_raw) {
        return normalizePayment(paymentData_raw);
      }
      
      throw new Error('Invalid payment response structure');
    } catch (error: any) {
      console.error('Error loading payment:', error);
      throw error;
    }
  },

  // Upload files for a payment (multipart/form-data)
  // Upload one file at a time to match backend API (POST /payments/{paymentId}/files expects single file)
  uploadFiles: async (paymentId: string, files: File[]): Promise<Payment> => {
    try {
      let lastPayment: Payment | null = null;
      
      // Upload files one by one (backend expects single file per request)
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post<any>(
          `${API_ENDPOINTS.PAYMENTS.LIST}/${paymentId}/files`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        
        const data = response?.data || response;
        const paymentData_raw = data?.data || data?.payment || data;
        
        if (paymentData_raw) {
          lastPayment = normalizePayment(paymentData_raw);
        }
      }
      
      if (!lastPayment) {
        throw new Error('No payment data returned after file uploads');
      }
      
      return lastPayment;
    } catch (error: any) {
      console.error('Error uploading files:', error);
      throw error;
    }
  },

  // Delete a file from a payment
  deleteFile: async (paymentId: string, filePath: string): Promise<Payment> => {
    try {
      const response = await api.delete<any>(
        `${API_ENDPOINTS.PAYMENTS.LIST}/${paymentId}/files?filePath=${encodeURIComponent(filePath)}`
      );
      
      const data = response?.data || response;
      const paymentData_raw = data?.data || data?.payment || data;
      
      if (paymentData_raw) {
        return normalizePayment(paymentData_raw);
      }
      
      throw new Error('Invalid payment response structure');
    } catch (error: any) {
      console.error('Error deleting file:', error);
      throw error;
    }
  },

  // Update a payment (JSON only, no files)
  updatePayment: async (paymentId: string, paymentData: UpdatePaymentRequest): Promise<Payment> => {
    try {
      const payload: any = {};
      if (paymentData.amount !== undefined) payload.amount = paymentData.amount;
      if (paymentData.payment_method) payload.paymentMethod = paymentData.payment_method;
      if (paymentData.payment_date) payload.paymentDate = paymentData.payment_date;
      if (paymentData.notes !== undefined) payload.note = paymentData.notes;

      const response = await api.patch<any>(
        API_ENDPOINTS.PAYMENTS.UPDATE(paymentId),
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      const data = response?.data || response;
      const paymentData_raw = data?.data || data?.payment || data;
      
      if (paymentData_raw) {
        return normalizePayment(paymentData_raw);
      }
      
      throw new Error('Invalid payment response structure');
    } catch (error: any) {
      console.error('Error updating payment:', error);
      throw error;
    }
  },

  // Delete a payment
  deletePayment: async (paymentId: string, hardDelete: boolean = false): Promise<{ message: string }> => {
    try {
      const url = hardDelete 
        ? `${API_ENDPOINTS.PAYMENTS.DELETE(paymentId)}?hard=true`
        : API_ENDPOINTS.PAYMENTS.DELETE(paymentId);
      
      const response = await api.delete<any>(url);
      return response?.data || response || { message: 'Payment deleted successfully' };
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  },
};
