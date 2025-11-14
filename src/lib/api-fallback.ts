// API Fallback utilities for when backend is not available

export const isBackendAvailable = async (): Promise<boolean> => {
  try {
    // Try the root endpoint first (should return "Hello World" from AppController)
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3274/api/v0'}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    
    if (response.ok) {
      console.log('Backend health check successful at root endpoint');
      return true;
    }
    
    console.log('Backend health check failed');
    return false;
  } catch (error) {
    console.log('Backend not available:', error);
    return false;
  }
};

export const createApiFallback = <T, P extends any[] = []>(
  apiCall: (...args: P) => Promise<T>,
  fallbackValue: T,
  errorMessage?: string
) => {
  return async (...args: P): Promise<T> => {
    try {
      return await apiCall(...args);
    } catch (error: any) {
      // Log detailed error information
      const errorInfo = {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method
      };
      
      // Only log if it's not a connection refused error (backend offline)
      if (!error.message?.includes('ECONNREFUSED') && !error.message?.includes('Network Error')) {
        console.warn(errorMessage || 'API call failed, using fallback:', errorInfo);
      } else {
        console.log('Backend appears to be offline, using fallback data');
      }
      
      // Return fallback value for any error (network, 500, etc.)
      return fallbackValue;
    }
  };
};

// Mock data for development
export const mockNotifications = [
  {
    id: '1',
    userId: 'current-user',
    title: 'Chào mừng!',
    message: 'Hệ thống đã được cập nhật thành công.',
    type: 'success' as const,
    isRead: false,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    userId: 'current-user',
    title: 'Thông báo',
    message: 'Backend đang được cấu hình. Một số tính năng có thể chưa hoạt động.',
    type: 'info' as const,
    isRead: false,
    isDeleted: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  }
];

export const mockWarehouses = [
  {
    id: '1',
    code: 'WH001',
    name: 'Kho chính',
    address: '123 Đường ABC, Quận 1, TP.HCM',
    description: 'Kho hàng chính của công ty',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const mockProducts = [
  {
    id: '1',
    code: 'PRD001',
    name: 'Laptop Dell Inspiron 15',
    description: 'Laptop Dell Inspiron 15 3000 series',
    category: 'Electronics',
    unit_price: 15000000,
    cost_price: 12000000,
    current_stock: 25,
    min_stock_level: 5,
    location: 'A1-01',
    warehouse_id: '1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const mockCustomers = [
  {
    id: '1',
    customer_code: 'KH000001',
    name: 'Nguyễn Văn A',
    email: 'nguyenvana@email.com',
    phone: '0901234567',
    address: '123 Đường XYZ, Quận 2, TP.HCM',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const mockOrders = [
  {
    id: '1',
    order_number: 'ORD-000001',
    customer_id: '1',
    customer_name: 'Nguyễn Văn A',
    customer_phone: '0901234567',
    customer_address: '123 Đường XYZ, Quận 2, TP.HCM',
    status: 'pending' as const,
    order_type: 'sale' as const,
    total_amount: 30000000,
    paid_amount: 15000000,
    debt_amount: 15000000,
    notes: 'Giao hàng trước 15h',
    created_by: 'current-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

// Mock authentication data
export const mockUsers = [
  {
    id: '1',
    email: 'admin@system.local',
    full_name: 'Admin User',
    role: 'admin' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    email: 'user@system.local',
    full_name: 'Test User',
    role: 'sales' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const mockLoginResponse = {
  access_token: 'mock-access-token-' + Date.now(),
  refresh_token: 'mock-refresh-token-' + Date.now(),
  user: mockUsers[0],
  expires_in: 3600
};
