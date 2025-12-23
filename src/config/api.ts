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
    CHANGE_PASSWORD: '/auth/change-password',
    VERIFY_TEMPORARY_PASSWORD: '/auth/verify-temporary-password',
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
    IMPORT_TEMPLATE: '/products/import/template',
    UPDATE: (id: string) => `/products/${id}`,
    DELETE: (id: string) => `/products/${id}`,
    IMPORT: '/products/import/excel',
    IMPORT_ASYNC: '/products/import/excel/async',
    IMPORT_STATUS_LIST: '/products/import/status',
    IMPORT_STATUS: (jobId: string) => `/products/import/status/${jobId}`,
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
  
  // Administrative Units
  ADMINISTRATIVE: {
    LIST: '/administrative',
    CREATE: '/administrative',
    UPDATE: (code: string) => `/administrative/${code}`,
    DELETE: (code: string) => `/administrative/${code}`,
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
    STATUS: (id: string) => `/orders/${id}/status`,
    DELETE: (id: string) => `/orders/${id}`,
    ITEMS: (id: string) => `/orders/${id}/items`,
    DETAILS: (orderId: string) => `/orders/${orderId}/details`,
    DETAIL: (orderId: string, itemId: string) => `/orders/${orderId}/details/${itemId}`,
    PAYMENTS: (id: string) => `/orders/${id}/payments`,
    HISTORY: (id: string) => `/orders/${id}/history`,
    BANKS: '/orders/banks',
  },
  
  // History
  HISTORY: {
    LIST: '/history',
    ENTITY: (entityType: string, entityId: string) => `/history/entity/${entityType}/${entityId}`,
    // Legacy endpoints (kept for backward compatibility)
    ORDER: (orderId: string) => `/history/entity/order/${orderId}`,
    ORDERS_BY_ID: (id: string) => `/orders/${id}/history`, // Alternative endpoint
  },
  
  // Order Items
  ORDER_ITEMS: {
    LIST: '/order-items',
    CREATE: '/order-items',
    UPDATE: (id: string) => `/order-items/${id}`,
    DELETE: (id: string) => `/order-items/${id}`,
  },
  
  // Tags
  TAGS: {
    LIST: '/tags',
    CREATE: '/tags',
    DETAIL: (id: string) => `/tags/${id}`,
    UPDATE: (id: string) => `/tags/${id}`,
    DELETE: (id: string) => `/tags/${id}`,
    RESTORE: (id: string) => `/tags/${id}/restore`,
    SYNC_FROM_ORDERS: '/tags/sync-from-orders',
  },

  // Order Tags (assign tags to specific orders)
  ORDER_TAGS: {
    ASSIGN: (orderId: string) => `/orders/${orderId}/tags`,
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
    MULTIPLE: '/payments/multiple',
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
    DETAIL: (id: string) => `/notifications/${id}`,
    MARK_ALL_READ: '/notifications/mark-all-read',
  },
  
  // Documents
  DOCUMENTS: {
    UPLOAD: '/documents/upload',
    DOWNLOAD: (id: string) => `/documents/${id}/download`,
    DELETE: (id: string) => `/documents/${id}`,
  },
  
  // Quotations
  QUOTATIONS: {
    LIST: '/quotations',
    CREATE: '/quotations',
    STATUS: (id: string) => `/quotations/${id}/status`,
    UPDATE: (id: string) => `/quotations/${id}`,
    DELETE: (id: string) => `/quotations/${id}`,
  },

  // Banks
  BANKS: {
    LIST: '/banks/banks',
    OPTIONS: '/banks/banks-options',
    CREATE: '/banks',
    UPDATE: (id: string) => `/banks/${id}`,
    DELETE: (id: string) => `/banks/${id}`,
    RESTORE: (id: string) => `/banks/${id}/restore`,
  }
};
