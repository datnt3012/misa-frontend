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
    console.log('🔍 getRolePermissions: checking role:', roleName, 'lowercase:', role);
    
    if (role.includes('admin') || role.includes('administrator')) {
      console.log('🔍 getRolePermissions: matched admin/administrator role');
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
        'EXPORT_SLIPS_VIEW', 'EXPORT_SLIPS_READ', 'EXPORT_SLIPS_CREATE', 'EXPORT_SLIPS_UPDATE', 'EXPORT_SLIPS_DELETE',
        'WAREHOUSE_RECEIPTS_VIEW', 'WAREHOUSE_RECEIPTS_READ', 'WAREHOUSE_RECEIPTS_CREATE', 'WAREHOUSE_RECEIPTS_UPDATE', 'WAREHOUSE_RECEIPTS_DELETE',
        'REPORTS_VIEW', 'REPORTS_READ', 'REPORTS_CREATE', 'REPORTS_UPDATE', 'REPORTS_DELETE',
        'REVENUE_VIEW', 'REVENUE_READ', 'REVENUE_CREATE', 'REVENUE_UPDATE', 'REVENUE_DELETE',
        'DASHBOARD_VIEW', 'NOTIFICATIONS_VIEW', 'NOTIFICATIONS_READ', 'NOTIFICATIONS_CREATE', 'NOTIFICATIONS_UPDATE', 'NOTIFICATIONS_DELETE'
      ];
    }
    
    if (role.includes('owner') || role.includes('director')) {
      console.log('🔍 getRolePermissions: matched owner/director role');
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
        'EXPORT_SLIPS_VIEW', 'EXPORT_SLIPS_READ', 'EXPORT_SLIPS_CREATE', 'EXPORT_SLIPS_UPDATE', 'EXPORT_SLIPS_DELETE',
        'WAREHOUSE_RECEIPTS_VIEW', 'WAREHOUSE_RECEIPTS_READ', 'WAREHOUSE_RECEIPTS_CREATE', 'WAREHOUSE_RECEIPTS_UPDATE', 'WAREHOUSE_RECEIPTS_DELETE',
        'REPORTS_VIEW', 'REPORTS_READ', 'REPORTS_CREATE', 'REPORTS_UPDATE', 'REPORTS_DELETE',
        'REVENUE_VIEW', 'REVENUE_READ', 'REVENUE_CREATE', 'REVENUE_UPDATE', 'REVENUE_DELETE',
        'DASHBOARD_VIEW', 'NOTIFICATIONS_VIEW', 'NOTIFICATIONS_READ', 'NOTIFICATIONS_CREATE', 'NOTIFICATIONS_UPDATE', 'NOTIFICATIONS_DELETE'
      ];
    }
    
    if (role.includes('chief') || role.includes('accountant')) {
      console.log('🔍 getRolePermissions: matched chief/accountant role - Restored PRODUCTS_VIEW for testing');
      return [
        'SETTINGS_VIEW', 'SETTINGS_READ',
        'PRODUCTS_VIEW', 'PRODUCTS_READ', // Restored to test if this fixes the issue
        // 'CATEGORIES_VIEW', 'CATEGORIES_READ', // Removed to test permission blocking
        'CUSTOMERS_VIEW', 'CUSTOMERS_READ',
        'SUPPLIERS_VIEW', 'SUPPLIERS_READ',
        'ORDERS_VIEW', 'ORDERS_READ',
        // 'INVENTORY_VIEW', 'INVENTORY_READ', // Removed to test permission blocking
        'STOCK_LEVELS_VIEW', 'STOCK_LEVELS_READ',
        // 'WAREHOUSES_VIEW', 'WAREHOUSES_READ', // Removed to test permission blocking
        'EXPORT_SLIPS_VIEW', 'EXPORT_SLIPS_READ',
        // 'WAREHOUSE_RECEIPTS_VIEW', 'WAREHOUSE_RECEIPTS_READ', // Removed to test permission blocking
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
        'EXPORT_SLIPS_VIEW', 'EXPORT_SLIPS_READ', 'EXPORT_SLIPS_CREATE', 'EXPORT_SLIPS_UPDATE', 'EXPORT_SLIPS_DELETE',
        'WAREHOUSE_RECEIPTS_VIEW', 'WAREHOUSE_RECEIPTS_READ', 'WAREHOUSE_RECEIPTS_CREATE', 'WAREHOUSE_RECEIPTS_UPDATE', 'WAREHOUSE_RECEIPTS_DELETE',
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
        'EXPORT_SLIPS_VIEW', 'EXPORT_SLIPS_READ', 'EXPORT_SLIPS_CREATE', 'EXPORT_SLIPS_UPDATE', 'EXPORT_SLIPS_DELETE',
        'DASHBOARD_VIEW', 'NOTIFICATIONS_VIEW', 'NOTIFICATIONS_READ'
      ];
    }
    
    if (role.includes('shipper')) {
      return [
        'ORDERS_VIEW', 'ORDERS_READ', 'ORDERS_UPDATE',
        'EXPORT_SLIPS_VIEW', 'EXPORT_SLIPS_READ', 'EXPORT_SLIPS_UPDATE',
        'DASHBOARD_VIEW', 'NOTIFICATIONS_VIEW', 'NOTIFICATIONS_READ'
      ];
    }
    
    // For unknown roles, return basic permissions
    console.log('🔍 getRolePermissions: no role matched, returning basic permissions');
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
        console.log('🔍 usePermissions: Max retries reached, using fallback permissions');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setHasFetched(true);
        setLastError(null);
        console.log('🔍 usePermissions: Fetching user roles for user:', user, 'retry:', retryCount);
        console.log('🔍 usePermissions: user.roleId:', user.roleId);
        
        // Add timeout to prevent hanging API calls
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API timeout')), 5000)
        );
        
        // Use the /auth/me endpoint to get current user info with role and permissions
        const response = await Promise.race([
          authApi.getMe(),
          timeoutPromise
        ]) as any;
        
        console.log('🔍 usePermissions: Retrieved response from /auth/me:', response);
        
        // Handle the response from /auth/me
        if (response && response.data) {
          const userData = response.data;
          console.log('🔍 usePermissions: Processing user data:', userData);
          
          // The /auth/me endpoint returns user data with role object containing permissions
          if (userData.role && typeof userData.role === 'object') {
            console.log('🔍 usePermissions: Found user role object:', userData.role);
            console.log('🔍 usePermissions: Role permissions:', userData.role.permissions);
            
            // Extract permission codes from the permissions array
            const permissionCodes = userData.role.permissions?.map((perm: any) => perm.code) || [];
            console.log('🔍 usePermissions: Extracted permission codes:', permissionCodes);
            
            setUserRole(userData.role);
            setPermissions(permissionCodes);
          }
          else {
            console.warn('🔍 usePermissions: No role object found in user data');
            setUserRole(null);
            setPermissions([]);
          }
        } else {
          console.warn('🔍 usePermissions: No user data received from /auth/me');
          setUserRole(null);
          setPermissions([]);
        }
      } catch (error) {
        console.error('🔍 usePermissions: Error fetching user role:', error);
        setLastError(error as Error);
        setRetryCount(prev => prev + 1);
        
        // If we've reached max retries, use fallback immediately
        if (retryCount >= 2) {
          console.log('🔍 usePermissions: Using fallback permissions after max retries');
          const roleName = getRoleNameFromId(user.roleId);
          if (roleName) {
            const rolePermissions = getRolePermissions(roleName);
            console.log('🔍 usePermissions: Role permissions from getRolePermissions:', rolePermissions);
            const fallbackRole = {
              id: user.roleId,
              name: roleName,
              code: roleName.toUpperCase(),
              permissions: rolePermissions
            };
            console.log('🔍 usePermissions: Using fallback role:', fallbackRole);
            setUserRole(fallbackRole);
            setPermissions(rolePermissions);
            console.log('🔍 usePermissions: Permissions set to state:', rolePermissions);
          } else {
            console.log('🔍 usePermissions: No fallback role found, setting basic permissions');
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
    
    // Allow admin access to everything
    const isAdmin = userRole?.code?.toLowerCase() === 'admin' || 
                   userRole?.name?.toLowerCase().includes('admin') ||
                   userRole?.name?.toLowerCase().includes('owner') ||
                   userRole?.name?.toLowerCase().includes('director') ||
                   userRole?.name?.toLowerCase().includes('chief') ||
                   userRole?.name?.toLowerCase().includes('manager') ||
                   userRole?.name?.toLowerCase().includes('super') ||
                   userRole?.name?.toLowerCase().includes('root');
    
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
      'inventory.export': ['EXPORT_SLIPS_READ', 'EXPORT_SLIPS_CREATE'],
      'inventory.approve': ['WAREHOUSE_RECEIPTS_UPDATE', 'EXPORT_SLIPS_UPDATE'],
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
      'USERS_READ': 'Read Users',
      'ROLES_READ': 'Read Roles',
      'PERMISSIONS_READ': 'Read Permissions',
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
      'WAREHOUSES_VIEW': 'View Warehouses',
      'WAREHOUSES_READ': 'Read Warehouses',
      'WAREHOUSE_RECEIPTS_VIEW': 'View Warehouse Receipts',
      'WAREHOUSE_RECEIPTS_READ': 'Read Warehouse Receipts',
      'EXPORT_SLIPS_VIEW': 'View Export Slips',
      'EXPORT_SLIPS_READ': 'Read Export Slips',
      'ORDERS_VIEW': 'View Orders',
      'ORDERS_READ': 'Read Orders',
      'CUSTOMERS_VIEW': 'View Customers',
      'CUSTOMERS_READ': 'Read Customers',
      'SUPPLIERS_VIEW': 'View Suppliers',
      'SUPPLIERS_READ': 'Read Suppliers',
      'DASHBOARD_VIEW': 'View Dashboard',
      'SETTINGS_VIEW': 'View Settings',
      'REPORTS_VIEW': 'View Reports',
      'REVENUE_VIEW': 'View Revenue',
      'NOTIFICATIONS_VIEW': 'View Notifications',
      'NOTIFICATIONS_READ': 'Read Notifications'
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
