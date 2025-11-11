import { useAuth } from './useAuth';
import { useState, useEffect } from 'react';
import { usersApi } from '@/api/users.api';
import { authApi } from '@/api/auth.api';

interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
}

interface UserRole {
  id: string;
  name: string;
  code?: string;
  description?: string;
  permissions?: string[];
}

export function usePermissions() {
  const { user, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  // Map roleId to role name (fallback when API doesn't return role info)
  const getRoleNameFromId = (roleId: string): string | null => {
    // Based on the test results, map known roleIds to role names
    const roleMap: { [key: string]: string } = {
      '48cf005a-e5ed-4859-968d-237d1c1edf85': 'Administrator',
      '1db8203f-8618-4092-9215-5854e6aaa368': 'Owner',
      '6babbed0-e267-4f6e-80c8-31b337ac0eca': 'Chief Accountant',
      'cd9bd126-b114-4657-aeef-191395b7e1dd': 'Accountant',
      '0d1e0d2e-7fdc-4af7-88e6-574497282798': 'Warehouse Keeper'
    };
    return roleMap[roleId] || null;
  };

  // Map role name to permissions array (fallback when API doesn't return permissions)
  const getRolePermissions = (roleName: string): string[] => {
    const role = roleName.toLowerCase();
    
    if (role.includes('admin') || role.includes('administrator')) {
      return [
        'SETTINGS_VIEW', 'SETTINGS_READ', 'SETTINGS_CREATE', 'SETTINGS_UPDATE', 'SETTINGS_DELETE',
        'ROLES_VIEW', 'ROLES_READ', 'ROLES_CREATE', 'ROLES_UPDATE', 'ROLES_DELETE',
        'PERMISSIONS_VIEW', 'PERMISSIONS_READ', 'PERMISSIONS_CREATE', 'PERMISSIONS_UPDATE', 'PERMISSIONS_DELETE',
        'USERS_VIEW', 'USERS_READ', 'USERS_CREATE', 'USERS_UPDATE', 'USERS_DELETE',
        'PRODUCTS_VIEW', 'PRODUCTS_READ', 'PRODUCTS_CREATE', 'PRODUCTS_UPDATE', 'PRODUCTS_DELETE',
        'CATEGORIES_VIEW', 'CATEGORIES_READ', 'CATEGORIES_CREATE', 'CATEGORIES_UPDATE', 'CATEGORIES_DELETE',
        'CUSTOMERS_VIEW', 'CUSTOMERS_READ', 'CUSTOMERS_CREATE', 'CUSTOMERS_UPDATE', 'CUSTOMERS_DELETE',
        'SUPPLIERS_VIEW', 'SUPPLIERS_READ', 'SUPPLIERS_CREATE', 'SUPPLIERS_UPDATE', 'SUPPLIERS_DELETE',
        'ORDERS_VIEW', 'ORDERS_READ', 'ORDERS_CREATE', 'ORDERS_UPDATE', 'ORDERS_DELETE',
        'INVENTORY_VIEW', 'INVENTORY_READ', 'INVENTORY_CREATE', 'INVENTORY_UPDATE', 'INVENTORY_DELETE',
        'STOCK_LEVELS_VIEW', 'STOCK_LEVELS_READ', 'STOCK_LEVELS_CREATE', 'STOCK_LEVELS_UPDATE', 'STOCK_LEVELS_DELETE',
        'WAREHOUSES_VIEW', 'WAREHOUSES_READ', 'WAREHOUSES_CREATE', 'WAREHOUSES_UPDATE', 'WAREHOUSES_DELETE',
        'WAREHOUSE_RECEIPTS_VIEW', 'WAREHOUSE_RECEIPTS_READ', 'WAREHOUSE_RECEIPTS_CREATE', 'WAREHOUSE_RECEIPTS_UPDATE', 'WAREHOUSE_RECEIPTS_DELETE',
        'REPORTS_VIEW', 'REPORTS_READ', 'REPORTS_CREATE', 'REPORTS_UPDATE', 'REPORTS_DELETE',
        'REVENUE_VIEW', 'REVENUE_READ', 'REVENUE_CREATE', 'REVENUE_UPDATE', 'REVENUE_DELETE',
        'DASHBOARD_VIEW', 'NOTIFICATIONS_VIEW', 'NOTIFICATIONS_READ', 'NOTIFICATIONS_CREATE', 'NOTIFICATIONS_UPDATE', 'NOTIFICATIONS_DELETE'
      ];
    }
    
    if (role.includes('owner') || role.includes('director')) {
      return [
        'SETTINGS_VIEW', 'SETTINGS_READ', 'SETTINGS_CREATE', 'SETTINGS_UPDATE', 'SETTINGS_DELETE',
        'ROLES_VIEW', 'ROLES_READ', 'ROLES_CREATE', 'ROLES_UPDATE', 'ROLES_DELETE',
        'PERMISSIONS_VIEW', 'PERMISSIONS_READ', 'PERMISSIONS_CREATE', 'PERMISSIONS_UPDATE', 'PERMISSIONS_DELETE',
        'USERS_VIEW', 'USERS_READ', 'USERS_CREATE', 'USERS_UPDATE', 'USERS_DELETE',
        'PRODUCTS_VIEW', 'PRODUCTS_READ', 'PRODUCTS_CREATE', 'PRODUCTS_UPDATE', 'PRODUCTS_DELETE',
        'CATEGORIES_VIEW', 'CATEGORIES_READ', 'CATEGORIES_CREATE', 'CATEGORIES_UPDATE', 'CATEGORIES_DELETE',
        'CUSTOMERS_VIEW', 'CUSTOMERS_READ', 'CUSTOMERS_CREATE', 'CUSTOMERS_UPDATE', 'CUSTOMERS_DELETE',
        'SUPPLIERS_VIEW', 'SUPPLIERS_READ', 'SUPPLIERS_CREATE', 'SUPPLIERS_UPDATE', 'SUPPLIERS_DELETE',
        'ORDERS_VIEW', 'ORDERS_READ', 'ORDERS_CREATE', 'ORDERS_UPDATE', 'ORDERS_DELETE',
        'INVENTORY_VIEW', 'INVENTORY_READ', 'INVENTORY_CREATE', 'INVENTORY_UPDATE', 'INVENTORY_DELETE',
        'STOCK_LEVELS_VIEW', 'STOCK_LEVELS_READ', 'STOCK_LEVELS_CREATE', 'STOCK_LEVELS_UPDATE', 'STOCK_LEVELS_DELETE',
        'WAREHOUSES_VIEW', 'WAREHOUSES_READ', 'WAREHOUSES_CREATE', 'WAREHOUSES_UPDATE', 'WAREHOUSES_DELETE',
        'WAREHOUSE_RECEIPTS_VIEW', 'WAREHOUSE_RECEIPTS_READ', 'WAREHOUSE_RECEIPTS_CREATE', 'WAREHOUSE_RECEIPTS_UPDATE', 'WAREHOUSE_RECEIPTS_DELETE',
        'REPORTS_VIEW', 'REPORTS_READ', 'REPORTS_CREATE', 'REPORTS_UPDATE', 'REPORTS_DELETE',
        'REVENUE_VIEW', 'REVENUE_READ', 'REVENUE_CREATE', 'REVENUE_UPDATE', 'REVENUE_DELETE',
        'DASHBOARD_VIEW', 'NOTIFICATIONS_VIEW', 'NOTIFICATIONS_READ', 'NOTIFICATIONS_CREATE', 'NOTIFICATIONS_UPDATE', 'NOTIFICATIONS_DELETE'
      ];
    }
    
    if (role.includes('chief')) {
      return [
        'SETTINGS_VIEW', 'SETTINGS_READ',
        'PRODUCTS_VIEW', 'PRODUCTS_READ',
        'CATEGORIES_VIEW', 'CATEGORIES_READ',
        'CUSTOMERS_VIEW', 'CUSTOMERS_READ',
        'SUPPLIERS_VIEW', 'SUPPLIERS_READ',
        'ORDERS_VIEW', 'ORDERS_READ',
        'INVENTORY_VIEW', 'INVENTORY_READ',
        'STOCK_LEVELS_VIEW', 'STOCK_LEVELS_READ',
        'WAREHOUSES_VIEW', 'WAREHOUSES_READ',
        'WAREHOUSE_RECEIPTS_VIEW', 'WAREHOUSE_RECEIPTS_READ',
        'REPORTS_VIEW', 'REPORTS_READ', 'REPORTS_CREATE', 'REPORTS_UPDATE', 'REPORTS_DELETE',
        'REVENUE_VIEW', 'REVENUE_READ', 'REVENUE_CREATE', 'REVENUE_UPDATE', 'REVENUE_DELETE',
        'DASHBOARD_VIEW', 'NOTIFICATIONS_VIEW', 'NOTIFICATIONS_READ'
      ];
    }
    
    if (role.includes('accountant')) {
      return [
        'SETTINGS_VIEW', 'SETTINGS_READ',
        'CUSTOMERS_VIEW', 'CUSTOMERS_READ',
        'SUPPLIERS_VIEW', 'SUPPLIERS_READ',
        'ORDERS_VIEW', 'ORDERS_READ',
        'EXPORT_SLIPS_VIEW',
        'REPORTS_VIEW', 'REPORTS_READ', 'REPORTS_CREATE', 'REPORTS_UPDATE', 'REPORTS_DELETE',
        'REVENUE_VIEW', 'REVENUE_READ', 'REVENUE_CREATE', 'REVENUE_UPDATE', 'REVENUE_DELETE',
        'DASHBOARD_VIEW', 'NOTIFICATIONS_VIEW', 'NOTIFICATIONS_READ'
      ];
    }
    
    if (role.includes('inventory')) {
      return [
        'PRODUCTS_VIEW', 'PRODUCTS_READ', 'PRODUCTS_CREATE', 'PRODUCTS_UPDATE', 'PRODUCTS_DELETE',
        'CATEGORIES_VIEW', 'CATEGORIES_READ', 'CATEGORIES_CREATE', 'CATEGORIES_UPDATE', 'CATEGORIES_DELETE',
        'INVENTORY_VIEW', 'INVENTORY_READ', 'INVENTORY_CREATE', 'INVENTORY_UPDATE', 'INVENTORY_DELETE',
        'STOCK_LEVELS_VIEW', 'STOCK_LEVELS_READ', 'STOCK_LEVELS_CREATE', 'STOCK_LEVELS_UPDATE', 'STOCK_LEVELS_DELETE',
        'WAREHOUSES_VIEW', 'WAREHOUSES_READ', 'WAREHOUSES_CREATE', 'WAREHOUSES_UPDATE', 'WAREHOUSES_DELETE',
        'WAREHOUSE_RECEIPTS_VIEW', 'WAREHOUSE_RECEIPTS_READ', 'WAREHOUSE_RECEIPTS_CREATE', 'WAREHOUSE_RECEIPTS_UPDATE', 'WAREHOUSE_RECEIPTS_DELETE',
        'EXPORT_SLIPS_VIEW',
        'DASHBOARD_VIEW', 'NOTIFICATIONS_VIEW', 'NOTIFICATIONS_READ'
      ];
    }
    
    if (role.includes('sales')) {
      return [
        'PRODUCTS_VIEW', 'PRODUCTS_READ',
        'CATEGORIES_VIEW', 'CATEGORIES_READ',
        'CUSTOMERS_VIEW', 'CUSTOMERS_READ', 'CUSTOMERS_CREATE', 'CUSTOMERS_UPDATE', 'CUSTOMERS_DELETE',
        'ORDERS_VIEW', 'ORDERS_READ', 'ORDERS_CREATE', 'ORDERS_UPDATE', 'ORDERS_DELETE',
        'INVENTORY_VIEW', 'INVENTORY_READ',
        'STOCK_LEVELS_VIEW', 'STOCK_LEVELS_READ',
        'DASHBOARD_VIEW', 'NOTIFICATIONS_VIEW', 'NOTIFICATIONS_READ'
      ];
    }
    
    if (role.includes('shipper')) {
      return [
        'ORDERS_VIEW', 'ORDERS_READ', 'ORDERS_UPDATE',
        'DASHBOARD_VIEW', 'NOTIFICATIONS_VIEW', 'NOTIFICATIONS_READ'
      ];
    }
    
    // For unknown roles, return basic permissions
    return [
      'DASHBOARD_VIEW', 'NOTIFICATIONS_VIEW', 'NOTIFICATIONS_READ'
    ];
  };

  // Reset retry count when user changes
  useEffect(() => {
    setRetryCount(0);
    setHasFetched(false);
    setLastError(null);
  }, [user?.id]);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user || authLoading) {
        setLoading(false);
        return;
      }

      // Prevent infinite retries - only retry up to 3 times
      if (hasFetched && retryCount >= 3) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setHasFetched(true);
        setLastError(null);
        
        // Add timeout to prevent hanging API calls
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API timeout')), 5000)
        );
        
        // Use the /auth/me endpoint to get current user info with role and permissions
        const response = await Promise.race([
          authApi.getMe(),
          timeoutPromise
        ]) as any;
        
        // Handle the response from /auth/me
        if (response && response.data) {
          const userData = response.data;
          
          // The /auth/me endpoint returns user data with role object containing permissions
          if (userData.role && typeof userData.role === 'object') {
            // Extract permission codes from the permissions array
            const permissionCodes = userData.role.permissions?.map((perm: any) => perm.code) || [];
            
            
            setUserRole(userData.role);
            setPermissions(permissionCodes);
          }
          else {
            setUserRole(null);
            setPermissions([]);
          }
        } else {
          setUserRole(null);
          setPermissions([]);
        }
      } catch (error) {
        setLastError(error as Error);
        setRetryCount(prev => prev + 1);
        
        // If we've reached max retries, use fallback immediately
        if (retryCount >= 2) {
          const roleName = getRoleNameFromId(user.roleId);
          if (roleName) {
            const rolePermissions = getRolePermissions(roleName);
            const fallbackRole = {
              id: user.roleId,
              name: roleName,
              code: roleName.toUpperCase(),
              permissions: rolePermissions
            };
            setUserRole(fallbackRole);
            setPermissions(rolePermissions);
          } else {
            const fallbackRole = {
              id: user.roleId,
              name: 'Unknown Role',
              code: 'UNKNOWN',
              permissions: ['DASHBOARD_VIEW', 'NOTIFICATIONS_VIEW', 'NOTIFICATIONS_READ']
            };
            setUserRole(fallbackRole);
            setPermissions(['DASHBOARD_VIEW', 'NOTIFICATIONS_VIEW', 'NOTIFICATIONS_READ']);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user, authLoading, hasFetched, retryCount]);

  const hasPermission = (permission: string, isPageAccess: boolean = false): boolean => {
    if (!user || loading || authLoading) {
      return false;
    }
    
    // Check if userRole and permissions are loaded
    if (!userRole || !permissions || permissions.length === 0) {
      return false;
    }
    
    
    // Allow admin access to everything - only for specific admin roles
    const isAdmin = userRole?.code?.toLowerCase() === 'admin' || 
                   userRole?.name?.toLowerCase() === 'admin' ||
                   userRole?.name?.toLowerCase() === 'owner' ||
                   userRole?.name?.toLowerCase() === 'administrator';
    
    
    if (isAdmin) {
      return true;
    }
    
    // Helper function to generate permission codes based on MODULE_ACTION format
    const generatePermissionCode = (module: string, action: string): string => {
      const moduleUpper = module.toUpperCase();
      const actionUpper = action.toUpperCase();
      return `${moduleUpper}_${actionUpper}`;
    };
    
    // Helper function to find related permissions dynamically
    const findRelatedPermissions = (module: string, action: string): string[] => {
      const basePermission = generatePermissionCode(module, action);
      const relatedPermissions: string[] = [basePermission];
      
      // Find all permissions that start with the module prefix
      const modulePrefix = module.toUpperCase();
      const allPermissions = permissions; // Use current user's permissions as reference
      
      // For complex modules, find related permissions
      if (module === 'inventory') {
        const inventoryModules = ['PRODUCTS', 'STOCK_LEVELS', 'WAREHOUSES', 'CATEGORIES', 'INVENTORY'];
        inventoryModules.forEach(invModule => {
          const relatedPerm = `${invModule}_${action.toUpperCase()}`;
          if (allPermissions.includes(relatedPerm)) {
            relatedPermissions.push(relatedPerm);
          }
        });
      } else if (module === 'revenue') {
        const revenueModules = ['REPORTS', 'REVENUE'];
        revenueModules.forEach(revModule => {
          const relatedPerm = `${revModule}_${action.toUpperCase()}`;
          if (allPermissions.includes(relatedPerm)) {
            relatedPermissions.push(relatedPerm);
          }
        });
      } else if (module === 'settings') {
        const settingsModules = ['SETTINGS', 'ROLES', 'PERMISSIONS'];
        settingsModules.forEach(setModule => {
          const relatedPerm = `${setModule}_${action.toUpperCase()}`;
          if (allPermissions.includes(relatedPerm)) {
            relatedPermissions.push(relatedPerm);
          }
        });
      } else if (module === 'roles') {
        const rolesModules = ['ROLES', 'PERMISSIONS'];
        rolesModules.forEach(roleModule => {
          const relatedPerm = `${roleModule}_${action.toUpperCase()}`;
          if (allPermissions.includes(relatedPerm)) {
            relatedPermissions.push(relatedPerm);
          }
        });
      }
      
      return relatedPermissions;
    };

    // Helper function to get fallback permission (VIEW -> READ)
    const getFallbackPermission = (permission: string): string => {
      // If permission ends with VIEW, try READ as fallback
      if (permission.endsWith('_VIEW')) {
        return permission.replace('_VIEW', '_READ');
      }
      return permission;
    };
    
    // Only keep truly special cases that can't be auto-generated
    const specialPermissionMap: Record<string, string[]> = {
      // Custom action mappings that don't follow MODULE_ACTION pattern
      'inventory.import': ['WAREHOUSE_RECEIPTS_CREATE', 'WAREHOUSE_RECEIPTS_READ'],
      'inventory.export': ['WAREHOUSE_RECEIPTS_READ', 'WAREHOUSE_RECEIPTS_CREATE'],
      'inventory.approve': ['WAREHOUSE_RECEIPTS_UPDATE'],
      'orders.approve': ['ORDERS_UPDATE'],
      'revenue.export': ['REPORTS_CREATE', 'REPORTS_UPDATE'],
      'settings.manage': ['SETTINGS_MANAGE_ALL'],
      'users.reset_password': ['SETTINGS_CHANGE_PASSWORD'],
    };
    
    // Auto-generate permissions for simple MODULE_ACTION format
    const getMappedPermissions = (permission: string): string[] => {
      // Check if it's already in the special cases map
      if (specialPermissionMap[permission]) {
        return specialPermissionMap[permission];
      }
      
      // Parse MODULE.ACTION format
      const [module, action] = permission.split('.');
      if (module && action) {
        // Use dynamic permission finding for complex modules
        const mappedPermissions = findRelatedPermissions(module, action);
        
        // If no permissions found, apply specific fallback logic
        if (mappedPermissions.length === 0) {
          // Only apply fallback logic for page access, not for action access
          if (isPageAccess) {
            // Check if module has VIEW action available
            const hasViewAction = findRelatedPermissions(module, 'view').length > 0;
            
            if (hasViewAction) {
              // Module has VIEW action (like products) - require VIEW for page access
              if (action === 'view') {
                // For view action, try READ as fallback only if no VIEW found
                const readPermissions = findRelatedPermissions(module, 'read');
                if (readPermissions.length > 0) {
                  return readPermissions;
                }
              }
              // For other actions in modules with VIEW, don't fallback to READ
            } else {
              // Module doesn't have VIEW action (like permissions) - allow READ for page access
              if (action !== 'view') {
                const readPermissions = findRelatedPermissions(module, 'read');
                if (readPermissions.length > 0) {
                  return readPermissions;
                }
              }
            }
          }
          // For action access (API calls), don't apply any fallback - require exact permission
        }
        
        return mappedPermissions;
      }
      
      // Fallback: return the permission as-is
      return [permission];
    };
    
    // Check if user has any of the mapped permissions
    const mappedPermissions = getMappedPermissions(permission);
    const hasAccess = mappedPermissions.some(perm => permissions.includes(perm));
    
    return hasAccess;
  };

  const hasAnyPermission = (permissionList: string[], isPageAccess: boolean = true): boolean => {
    if (!user || loading || authLoading) {
      return false;
    }
    
    // Check if userRole and permissions are loaded
    if (!userRole || !permissions || permissions.length === 0) {
      return false;
    }
    
    // Allow admin access to everything
    const isAdmin = userRole?.code?.toLowerCase() === 'admin' || 
                   userRole?.name?.toLowerCase().includes('admin') ||
                   userRole?.name?.toLowerCase().includes('owner');
    
    
    if (isAdmin) {
      return true;
    }
    
    // Check if user has any of the required permissions using permission mapping
    const hasAccess = permissionList.some(permission => hasPermission(permission, isPageAccess));
    return hasAccess;
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    if (!user || loading || authLoading) {
      return false;
    }
    return permissionList.every(permission => permissions.includes(permission));
  };

  // Check action access (for API calls) - no fallback, require exact permission
  const hasActionPermission = (permission: string): boolean => {
    return hasPermission(permission, false); // isPageAccess = false
  };

  const hasAnyActionPermission = (permissionList: string[]): boolean => {
    return hasAnyPermission(permissionList, false); // isPageAccess = false
  };

  // Convert permission codes to more readable names
  const getPermissionDisplayName = (permissionCode: string): string => {
    const permissionMap: Record<string, string> = {
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
    
    return permissionMap[permissionCode] || permissionCode;
  };

  // Get error message for permission check
  const getPermissionErrorMessage = (permissionList: string[], requireAll: boolean = false): string => {
    if (!user || loading || authLoading) {
      return 'Đang kiểm tra quyền truy cập...';
    }
    
    if (!userRole || !permissions || permissions.length === 0) {
      return 'Không thể tải thông tin quyền truy cập';
    }
    
    // Check if user has the required permissions
    const hasAccess = requireAll 
      ? permissionList.every(permission => hasPermission(permission))
      : permissionList.some(permission => hasPermission(permission));
    
    if (!hasAccess) {
      // Convert permission codes to readable names
      const permissionNames = permissionList.map(getPermissionDisplayName);
      if (requireAll) {
        return `Bạn cần tất cả các quyền sau: ${permissionNames.join(', ')}`;
      } else {
        return `Bạn cần một trong các quyền sau: ${permissionNames.join(', ')}`;
      }
    }
    
    return '';
  };

  return {
    userRole,
    permissions,
    loading: loading || authLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasActionPermission,
    hasAnyActionPermission,
    getPermissionErrorMessage,
    isAdmin: userRole?.code === 'ADMIN' || userRole?.name?.toLowerCase().includes('admin'),
  };
}
