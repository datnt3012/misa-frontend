// API Configuration
export const API_CONFIG = {
  // Sử dụng backend thực tế
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3274/api/v0',
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3274',
  
  // Timeout cho requests (ms)
  TIMEOUT: Number(import.meta.env.VITE_API_TIMEOUT) || 10000,
  
  // Headers mặc định
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  }
};

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  
  // Dashboard
  DASHBOARD: {
    SUMMARY: '/dashboard/summary',
    REVENUE_SERIES: '/dashboard/revenue-series',
    ORDER_STATUS: '/dashboard/order-status',
    INVENTORY_OVERVIEW: '/dashboard/inventory-overview',
    TOP_PRODUCTS: '/dashboard/top-products',
    TOP_CUSTOMERS: '/dashboard/top-customers',
    REGION_REVENUE: '/dashboard/region-revenue',
    CATEGORY_PROFIT: '/dashboard/category-profit',
    RECENT_ORDERS: '/dashboard/recent-orders',
    RECENT_ACTIVITIES: '/dashboard/recent-activities',
  },
  
  // Users
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
  },
  
  // Roles
  ROLES: {
    LIST: '/roles',
  },
  
  // Warehouses
  WAREHOUSES: {
    LIST: '/warehouses',
    CREATE: '/warehouses',
    UPDATE: (id: string) => `/warehouses/${id}`,
    DELETE: (id: string) => `/warehouses/${id}`,
  },
  
  // Products
  PRODUCTS: {
    LIST: '/products',
    CREATE: '/products',
    UPDATE: (id: string) => `/products/${id}`,
    DELETE: (id: string) => `/products/${id}`,
    IMPORT: '/products/import',
    EXPORT: '/products/export',
  },
  
  // Categories
  CATEGORIES: {
    LIST: '/categories',
    GET: (id: string) => `/categories/${id}`,
    CREATE: '/categories',
    UPDATE: (id: string) => `/categories/${id}`,
    DELETE: (id: string) => `/categories/${id}`,
  },
  
  // Inventory
  INVENTORY: {
    LIST: '/inventory',
    UPDATE: (id: string) => `/inventory/${id}`,
    HISTORY: '/inventory/history',
    STOCK_LEVELS: '/inventory/stock-levels',
  },
  
  // Customers
  CUSTOMERS: {
    LIST: '/customers',
    CREATE: '/customers',
    UPDATE: (id: string) => `/customers/${id}`,
    DELETE: (id: string) => `/customers/${id}`,
  },
  
  // Suppliers
  SUPPLIERS: {
    LIST: '/suppliers',
    CREATE: '/suppliers',
    UPDATE: (id: string) => `/suppliers/${id}`,
    DELETE: (id: string) => `/suppliers/${id}`,
  },
  
  // Organizations
  ORGANIZATIONS: {
    LIST: '/organizations',
    CREATE: '/organizations',
    UPDATE: (id: string) => `/organizations/${id}`,
    DELETE: (id: string) => `/organizations/${id}`,
  },
  
  // Stock Levels
  STOCK_LEVELS: {
    LIST: '/stock-levels',
    CREATE: '/stock-levels',
    UPDATE: (id: string) => `/stock-levels/${id}`,
    DELETE: (id: string) => `/stock-levels/${id}`,
  },
  
  // Orders
  ORDERS: {
    LIST: '/orders',
    CREATE: '/orders',
    UPDATE: (id: string) => `/orders/${id}`,
    DELETE: (id: string) => `/orders/${id}`,
    ITEMS: (id: string) => `/orders/${id}/items`,
    DETAILS: (orderId: string, itemId: string) => `/orders/${orderId}/details/${itemId}`,
  },
  
  // Order Items
  ORDER_ITEMS: {
    LIST: '/order-items',
    CREATE: '/order-items',
    UPDATE: (id: string) => `/order-items/${id}`,
    DELETE: (id: string) => `/order-items/${id}`,
  },
  
  // Order Tags (handled via order API)
  ORDER_TAGS: {
    // Tags are managed through order API updates
    // No separate endpoints needed
  },
  
  // Export Slips
  EXPORT_SLIPS: {
    LIST: '/export-slips',
    CREATE: '/export-slips',
    UPDATE: (id: string) => `/export-slips/${id}`,
    DELETE: (id: string) => `/export-slips/${id}`,
    APPROVE: (id: string) => `/export-slips/${id}/approve`,
    COMPLETE: (id: string) => `/export-slips/${id}/complete`,
  },

  // Warehouse Receipts (Import Slips)
  WAREHOUSE_RECEIPTS: {
    LIST: '/warehouse-receipts',
    CREATE: '/warehouse-receipts',
    UPDATE: (id: string) => `/warehouse-receipts/${id}`,
    DELETE: (id: string) => `/warehouse-receipts/${id}`,
    APPROVE: (id: string) => `/warehouse-receipts/${id}/approve`,
  },
  
  // Payments
  PAYMENTS: {
    LIST: '/payments',
    CREATE: '/payments',
    UPDATE: (id: string) => `/payments/${id}`,
    DELETE: (id: string) => `/payments/${id}`,
  },
  
  // Revenue
  REVENUE: {
    LIST: '/revenue',
    ANALYTICS: '/revenue/analytics',
    REPORTS: '/revenue/reports',
  },

  // Report
  REPORT: {
    REVENUE: '/report/revenue',
  },
  
  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/mark-all-read',
  },
  
  // Documents
  DOCUMENTS: {
    UPLOAD: '/documents/upload',
    DOWNLOAD: (id: string) => `/documents/${id}/download`,
    DELETE: (id: string) => `/documents/${id}`,
  }
};
