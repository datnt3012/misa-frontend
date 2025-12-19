import { useAuth } from './useAuth';
import { useState, useEffect, useRef } from 'react';
import { usersApi } from '@/api/users.api';
import { authApi } from '@/api/auth.api';
import { getPermissionDisplayName as getPermissionNameFromCache, initializePermissionNames } from '@/utils/permissionNames';
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
  const [permissionNamesLoaded, setPermissionNamesLoaded] = useState(false);
  const translationsLoadStarted = useRef<string | null>(null);
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
  // Initialize permission names cache (shared with permissionMessageConverter)
  // Load after user role is fetched to ensure user is authenticated
  // This avoids 403 errors when trying to access /permissions endpoint
  useEffect(() => {
    // Only load when user is authenticated and user role has been fetched
    // Don't check loading state as it might create a loop
    if (!user || authLoading || !userRole) {
      // If user logs out, reset permission names loaded state
      if (!user && !authLoading) {
        setPermissionNamesLoaded(false);
      }
      return;
    }
    // Try to load all permissions from /permissions endpoint to supplement cache
    // Permission names from user role are already in cache (populated in fetchUserRole)
    // This will merge with existing cache to get all permissions (not just user's permissions)
    const loadAllPermissionNames = async () => {
      try {
        await initializePermissionNames();
        // Check if translations were loaded successfully
        const { areTranslationsLoaded } = await import('@/utils/translations');
        const { arePermissionsLoaded } = await import('@/utils/permissionNames');
        if (areTranslationsLoaded() || arePermissionsLoaded()) {
          setPermissionNamesLoaded(true);
        } else {
          setPermissionNamesLoaded(true);
        }
      } catch (error: any) {
        // Check if we have any permissions in cache (from user role or translations)
        const { arePermissionsLoaded } = await import('@/utils/permissionNames');
        const { areTranslationsLoaded } = await import('@/utils/translations');
        if (areTranslationsLoaded() || arePermissionsLoaded()) {
        } else {
        }
        // Always set to true to avoid blocking UI
        // Even without translations, we can still format codes for better UX
        setPermissionNamesLoaded(true);
      }
    };
    // Always try to load translations from /public/translations
    // Even if we have permissions from user role, we need ALL permissions for error messages
    // Use a ref to track if we've already initiated the load for this userRole to avoid duplicate calls
    const userRoleId = userRole?.id;
    const loadKey = `${user?.id}-${userRoleId}`;
    // Always try to load translations - use ref to prevent duplicate calls for same user/role
    if (translationsLoadStarted.current !== loadKey) {
      translationsLoadStarted.current = loadKey;
      loadAllPermissionNames();
    } else {
    }
  }, [user?.id, authLoading, userRole?.id]);
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
            // Update permission name cache from user role permissions FIRST
            // This ensures we have permission names even if /permissions endpoint is not accessible
            if (userData.role.permissions && Array.isArray(userData.role.permissions)) {
              // Update permission name cache with permissions from user role
              // This ensures we have permission names even if user doesn't have access to /permissions endpoint
              const { updatePermissionNameCacheFromRole } = await import('@/utils/permissionNames');
              updatePermissionNameCacheFromRole(userData.role.permissions);
              // Don't mark as loaded yet - we still need to load translations from /public/translations
              // to get ALL permission names, not just the ones from user role
            }
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
            const viewPermissions = findRelatedPermissions(module, 'view');
            const hasViewAction = viewPermissions.length > 0;
            if (hasViewAction) {
              // Module has VIEW action (like products, revenue) - require VIEW for page access
              if (action === 'view') {
                // For view action, try READ as fallback if no VIEW found
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
        } else {
          // If we found VIEW permissions, also include READ permissions as fallback for page access
          // This allows users with REVENUE_READ to access revenue page even if REVENUE_VIEW is required
          if (isPageAccess && action === 'view') {
            const readPermissions = findRelatedPermissions(module, 'read');
            // Merge VIEW and READ permissions, removing duplicates
            const allPermissions = [...new Set([...mappedPermissions, ...readPermissions])];
            return allPermissions;
          }
        }
        return mappedPermissions;
      }
      // For direct permission codes, return as-is (no automatic fallback)
      // Revenue page specifically requires REVENUE_VIEW, not REVENUE_READ
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
  // Uses shared permission names cache from backend API (same as RolePermissionsManager and permissionMessageConverter)
  // No hardcoded mapping to avoid name discrepancies
  const getPermissionDisplayName = (permissionCode: string): string => {
    // Use shared permission name cache
    return getPermissionNameFromCache(permissionCode);
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
    // Note: For revenue page, we only check REVENUE_VIEW, not REVENUE_READ
    const hasAccess = requireAll 
      ? permissionList.every(permission => hasPermission(permission, false)) // No fallback for revenue
      : permissionList.some(permission => hasPermission(permission, false)); // No fallback for revenue
    if (!hasAccess) {
      // Convert permission codes to readable names
      // This uses permission name cache from /permissions endpoint (same as settings page)
      const permissionNames = permissionList.map(code => getPermissionDisplayName(code));
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
    permissionNamesLoaded,
    isAdmin: userRole?.code === 'ADMIN' || userRole?.name?.toLowerCase().includes('admin'),
  };
}