/**
 * Utility to convert permission codes in error messages to human-readable names
 */

// Permission code to display name mapping
const permissionDisplayNames: Record<string, string> = {
  'USERS_VIEW': 'Xem người dùng',
  'USERS_READ': 'Đọc người dùng',
  'USERS_CREATE': 'Tạo người dùng',
  'USERS_UPDATE': 'Cập nhật người dùng',
  'USERS_DELETE': 'Xóa người dùng',
  'ROLES_VIEW': 'Xem vai trò',
  'ROLES_READ': 'Đọc vai trò',
  'ROLES_CREATE': 'Tạo vai trò',
  'ROLES_UPDATE': 'Cập nhật vai trò',
  'ROLES_DELETE': 'Xóa vai trò',
  'PERMISSIONS_VIEW': 'Xem quyền',
  'PERMISSIONS_READ': 'Đọc quyền',
  'PERMISSIONS_CREATE': 'Tạo quyền',
  'PERMISSIONS_UPDATE': 'Cập nhật quyền',
  'PERMISSIONS_DELETE': 'Xóa quyền',
  'PRODUCTS_VIEW': 'Xem sản phẩm',
  'PRODUCTS_READ': 'Đọc sản phẩm',
  'PRODUCTS_CREATE': 'Tạo sản phẩm',
  'PRODUCTS_UPDATE': 'Cập nhật sản phẩm',
  'PRODUCTS_DELETE': 'Xóa sản phẩm',
  'CATEGORIES_VIEW': 'Xem danh mục',
  'CATEGORIES_READ': 'Đọc danh mục',
  'CATEGORIES_CREATE': 'Tạo danh mục',
  'CATEGORIES_UPDATE': 'Cập nhật danh mục',
  'CATEGORIES_DELETE': 'Xóa danh mục',
  'INVENTORY_VIEW': 'Xem kho',
  'INVENTORY_READ': 'Đọc kho',
  'INVENTORY_CREATE': 'Tạo kho',
  'INVENTORY_UPDATE': 'Cập nhật kho',
  'INVENTORY_DELETE': 'Xóa kho',
  'STOCK_LEVELS_VIEW': 'Xem mức tồn kho',
  'STOCK_LEVELS_READ': 'Đọc mức tồn kho',
  'STOCK_LEVELS_CREATE': 'Tạo mức tồn kho',
  'STOCK_LEVELS_UPDATE': 'Cập nhật mức tồn kho',
  'STOCK_LEVELS_DELETE': 'Xóa mức tồn kho',
  'WAREHOUSES_VIEW': 'Xem kho hàng',
  'WAREHOUSES_READ': 'Đọc kho hàng',
  'WAREHOUSES_CREATE': 'Tạo kho hàng',
  'WAREHOUSES_UPDATE': 'Cập nhật kho hàng',
  'WAREHOUSES_DELETE': 'Xóa kho hàng',
  'WAREHOUSE_RECEIPTS_VIEW': 'Xem phiếu nhập kho',
  'WAREHOUSE_RECEIPTS_READ': 'Đọc phiếu nhập kho',
  'WAREHOUSE_RECEIPTS_CREATE': 'Tạo phiếu nhập kho',
  'WAREHOUSE_RECEIPTS_UPDATE': 'Cập nhật phiếu nhập kho',
  'WAREHOUSE_RECEIPTS_DELETE': 'Xóa phiếu nhập kho',
  'EXPORT_SLIPS_VIEW': 'Xem phiếu xuất kho',
  'ORDERS_VIEW': 'Xem đơn hàng',
  'ORDERS_READ': 'Đọc đơn hàng',
  'ORDERS_CREATE': 'Tạo đơn hàng',
  'ORDERS_UPDATE': 'Cập nhật đơn hàng',
  'ORDERS_DELETE': 'Xóa đơn hàng',
  'CUSTOMERS_VIEW': 'Xem khách hàng',
  'CUSTOMERS_READ': 'Đọc khách hàng',
  'CUSTOMERS_CREATE': 'Tạo khách hàng',
  'CUSTOMERS_UPDATE': 'Cập nhật khách hàng',
  'CUSTOMERS_DELETE': 'Xóa khách hàng',
  'SUPPLIERS_VIEW': 'Xem nhà cung cấp',
  'SUPPLIERS_READ': 'Đọc nhà cung cấp',
  'SUPPLIERS_CREATE': 'Tạo nhà cung cấp',
  'SUPPLIERS_UPDATE': 'Cập nhật nhà cung cấp',
  'SUPPLIERS_DELETE': 'Xóa nhà cung cấp',
  'DASHBOARD_VIEW': 'Xem trang chủ',
  'SETTINGS_VIEW': 'Xem cài đặt',
  'SETTINGS_READ': 'Đọc cài đặt',
  'SETTINGS_CREATE': 'Tạo cài đặt',
  'SETTINGS_UPDATE': 'Cập nhật cài đặt',
  'SETTINGS_DELETE': 'Xóa cài đặt',
  'REPORTS_VIEW': 'Xem báo cáo',
  'REPORTS_READ': 'Đọc báo cáo',
  'REPORTS_CREATE': 'Tạo báo cáo',
  'REPORTS_UPDATE': 'Cập nhật báo cáo',
  'REPORTS_DELETE': 'Xóa báo cáo',
  'REVENUE_VIEW': 'Xem doanh thu',
  'REVENUE_READ': 'Đọc doanh thu',
  'REVENUE_CREATE': 'Tạo doanh thu',
  'REVENUE_UPDATE': 'Cập nhật doanh thu',
  'REVENUE_DELETE': 'Xóa doanh thu',
  'REVENUE_PROFIT_VIEW': 'Xem lợi nhuận',
  'NOTIFICATIONS_VIEW': 'Xem thông báo',
  'NOTIFICATIONS_READ': 'Đọc thông báo',
  'NOTIFICATIONS_CREATE': 'Tạo thông báo',
  'NOTIFICATIONS_UPDATE': 'Cập nhật thông báo',
  'NOTIFICATIONS_DELETE': 'Xóa thông báo'
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
