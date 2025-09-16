/**
 * Utility to convert permission codes in error messages to human-readable names
 */

// Permission code to display name mapping
const permissionDisplayNames: Record<string, string> = {
  'USERS_VIEW': 'View Users',
  'USERS_READ': 'Read Users',
  'USERS_CREATE': 'Create Users',
  'USERS_UPDATE': 'Update Users',
  'USERS_DELETE': 'Delete Users',
  'ROLES_VIEW': 'View Roles',
  'ROLES_READ': 'Read Roles',
  'ROLES_CREATE': 'Create Roles',
  'ROLES_UPDATE': 'Update Roles',
  'ROLES_DELETE': 'Delete Roles',
  'PERMISSIONS_VIEW': 'View Permissions',
  'PERMISSIONS_READ': 'Read Permissions',
  'PERMISSIONS_CREATE': 'Create Permissions',
  'PERMISSIONS_UPDATE': 'Update Permissions',
  'PERMISSIONS_DELETE': 'Delete Permissions',
  'PRODUCTS_VIEW': 'View Products',
  'PRODUCTS_READ': 'Read Products',
  'PRODUCTS_CREATE': 'Create Products',
  'PRODUCTS_UPDATE': 'Update Products',
  'PRODUCTS_DELETE': 'Delete Products',
  'CATEGORIES_VIEW': 'View Categories',
  'CATEGORIES_READ': 'Read Categories',
  'CATEGORIES_CREATE': 'Create Categories',
  'CATEGORIES_UPDATE': 'Update Categories',
  'CATEGORIES_DELETE': 'Delete Categories',
  'INVENTORY_VIEW': 'View Inventory',
  'INVENTORY_READ': 'Read Inventory',
  'INVENTORY_CREATE': 'Create Inventory',
  'INVENTORY_UPDATE': 'Update Inventory',
  'INVENTORY_DELETE': 'Delete Inventory',
  'STOCK_LEVELS_VIEW': 'View Stock Levels',
  'STOCK_LEVELS_READ': 'Read Stock Levels',
  'STOCK_LEVELS_CREATE': 'Create Stock Levels',
  'STOCK_LEVELS_UPDATE': 'Update Stock Levels',
  'STOCK_LEVELS_DELETE': 'Delete Stock Levels',
  'WAREHOUSES_VIEW': 'View Warehouses',
  'WAREHOUSES_READ': 'Read Warehouses',
  'WAREHOUSES_CREATE': 'Create Warehouses',
  'WAREHOUSES_UPDATE': 'Update Warehouses',
  'WAREHOUSES_DELETE': 'Delete Warehouses',
  'WAREHOUSE_RECEIPTS_VIEW': 'View Warehouse Receipts',
  'WAREHOUSE_RECEIPTS_READ': 'Read Warehouse Receipts',
  'WAREHOUSE_RECEIPTS_CREATE': 'Create Warehouse Receipts',
  'WAREHOUSE_RECEIPTS_UPDATE': 'Update Warehouse Receipts',
  'WAREHOUSE_RECEIPTS_DELETE': 'Delete Warehouse Receipts',
  'EXPORT_SLIPS_VIEW': 'View Export Slips Page',
  'ORDERS_VIEW': 'View Orders',
  'ORDERS_READ': 'Read Orders',
  'ORDERS_CREATE': 'Create Orders',
  'ORDERS_UPDATE': 'Update Orders',
  'ORDERS_DELETE': 'Delete Orders',
  'CUSTOMERS_VIEW': 'View Customers',
  'CUSTOMERS_READ': 'Read Customers',
  'CUSTOMERS_CREATE': 'Create Customers',
  'CUSTOMERS_UPDATE': 'Update Customers',
  'CUSTOMERS_DELETE': 'Delete Customers',
  'SUPPLIERS_VIEW': 'View Suppliers',
  'SUPPLIERS_READ': 'Read Suppliers',
  'SUPPLIERS_CREATE': 'Create Suppliers',
  'SUPPLIERS_UPDATE': 'Update Suppliers',
  'SUPPLIERS_DELETE': 'Delete Suppliers',
  'DASHBOARD_VIEW': 'View Dashboard',
  'SETTINGS_VIEW': 'View Settings',
  'SETTINGS_READ': 'Read Settings',
  'SETTINGS_CREATE': 'Create Settings',
  'SETTINGS_UPDATE': 'Update Settings',
  'SETTINGS_DELETE': 'Delete Settings',
  'REPORTS_VIEW': 'View Reports',
  'REPORTS_READ': 'Read Reports',
  'REPORTS_CREATE': 'Create Reports',
  'REPORTS_UPDATE': 'Update Reports',
  'REPORTS_DELETE': 'Delete Reports',
  'REVENUE_VIEW': 'View Revenue',
  'REVENUE_READ': 'Read Revenue',
  'REVENUE_CREATE': 'Create Revenue',
  'REVENUE_UPDATE': 'Update Revenue',
  'REVENUE_DELETE': 'Delete Revenue',
  'REVENUE_PROFIT_VIEW': 'View Revenue Profit',
  'NOTIFICATIONS_VIEW': 'View Notifications',
  'NOTIFICATIONS_READ': 'Read Notifications',
  'NOTIFICATIONS_CREATE': 'Create Notifications',
  'NOTIFICATIONS_UPDATE': 'Update Notifications',
  'NOTIFICATIONS_DELETE': 'Delete Notifications'
};

/**
 * Convert permission codes in error messages to human-readable names
 * @param message - The error message that may contain permission codes
 * @returns The message with permission codes converted to display names
 */
export function convertPermissionCodesInMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return message;
  }

  let convertedMessage = message;

  // Find all permission codes in the message and replace them
  Object.entries(permissionDisplayNames).forEach(([code, displayName]) => {
    // Use word boundaries to ensure we only replace complete permission codes
    const regex = new RegExp(`\\b${code}\\b`, 'g');
    convertedMessage = convertedMessage.replace(regex, displayName);
  });

  return convertedMessage;
}

/**
 * Convert a single permission code to display name
 * @param code - The permission code
 * @returns The display name or the original code if not found
 */
export function getPermissionDisplayName(code: string): string {
  return permissionDisplayNames[code] || code;
}
