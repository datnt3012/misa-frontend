import { useAuth } from './useAuth';
import { useState, useEffect } from 'react';
import { usersApi } from '@/api/users.api';

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

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user || authLoading) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const roles = await usersApi.getUserRoles();
        
        // Find user's role by roleId
        const userRoleData = roles.find(role => role.id === user.roleId);
        
        if (userRoleData) {
          setUserRole(userRoleData);
          setPermissions(userRoleData.permissions || []);
        } else {
          console.warn('User role not found for roleId:', user.roleId);
          
          // Try to find role by name or code as fallback - only admin-like roles
          const fallbackRole = roles.find(role => 
            role.name?.toLowerCase().includes('admin') ||
            role.code?.toLowerCase() === 'admin' ||
            role.name?.toLowerCase().includes('owner') ||
            role.name?.toLowerCase().includes('director') ||
            role.name?.toLowerCase().includes('chief') ||
            role.name?.toLowerCase().includes('manager') ||
            role.name?.toLowerCase().includes('super') ||
            role.name?.toLowerCase().includes('root')
          );
          
          if (fallbackRole) {
            setUserRole(fallbackRole);
            setPermissions(fallbackRole.permissions || []);
          } else {
            setUserRole(null);
            setPermissions([]);
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user, authLoading]);

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

  // Get error message for permission check
  const getPermissionErrorMessage = (permissionList: string[]): string => {
    if (!user || loading || authLoading) {
      return 'Đang kiểm tra quyền truy cập...';
    }
    
    if (!userRole || !permissions || permissions.length === 0) {
      return 'Không thể tải thông tin quyền truy cập';
    }
    
    // Check if user has any of the required permissions
    const hasAccess = permissionList.some(permission => hasPermission(permission));
    
    if (!hasAccess) {
      return `Bạn cần một trong các quyền sau: ${permissionList.join(', ')}`;
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
