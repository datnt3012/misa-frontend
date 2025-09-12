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
        console.log('🔍 Current user:', user);
        console.log('🔍 User roleId:', user.roleId);
        
        const roles = await usersApi.getUserRoles();
        console.log('🔍 All available roles:', roles);
        
        // Find user's role by roleId
        const userRoleData = roles.find(role => role.id === user.roleId);
        
        if (userRoleData) {
          console.log('🔍 Found user role:', userRoleData);
          console.log('🔍 User role permissions:', userRoleData.permissions);
          setUserRole(userRoleData);
          setPermissions(userRoleData.permissions || []);
        } else {
          console.warn('🔍 User role not found for roleId:', user.roleId);
          console.log('🔍 Available roles:', roles);
          console.log('🔍 User object details:', {
            id: user.id,
            roleId: user.roleId,
            email: user.email,
            name: user.name
          });
          
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
            console.log('🔍 Found fallback admin role:', fallbackRole);
            setUserRole(fallbackRole);
            setPermissions(fallbackRole.permissions || []);
          } else {
            console.log('🔍 No fallback role found, setting empty permissions');
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

  const hasPermission = (permission: string): boolean => {
    console.log('🔍 hasPermission called with:', permission);
    console.log('🔍 User state:', { user: !!user, loading, authLoading });
    console.log('🔍 User object:', user);
    console.log('🔍 UserRole:', userRole);
    console.log('🔍 Permissions:', permissions);
    
    if (!user || loading || authLoading) {
      console.log('🔍 Permission check failed: no user or loading', { user: !!user, loading, authLoading });
      return false;
    }
    
    // Check if userRole and permissions are loaded
    if (!userRole || !permissions || permissions.length === 0) {
      console.log('🔍 Permission check failed: userRole or permissions not loaded', { 
        userRole: !!userRole, 
        permissions: permissions?.length || 0 
      });
      return false;
    }
    
    console.log('🔍 Checking permission:', permission);
    console.log('🔍 User role:', userRole);
    console.log('🔍 User permissions:', permissions);
    
    // Allow admin access to everything
    const isAdmin = userRole?.code?.toLowerCase() === 'admin' || 
                   userRole?.name?.toLowerCase().includes('admin') ||
                   userRole?.name?.toLowerCase().includes('owner') ||
                   userRole?.name?.toLowerCase().includes('director') ||
                   userRole?.name?.toLowerCase().includes('chief') ||
                   userRole?.name?.toLowerCase().includes('manager') ||
                   userRole?.name?.toLowerCase().includes('super') ||
                   userRole?.name?.toLowerCase().includes('root');
    
    console.log('🔍 Admin check details:', { 
      code: userRole?.code, 
      name: userRole?.name, 
      isAdmin,
      codeCheck: userRole?.code?.toLowerCase() === 'admin',
      nameIncludesAdmin: userRole?.name?.toLowerCase().includes('admin'),
      nameIncludesOwner: userRole?.name?.toLowerCase().includes('owner'),
      nameIncludesDirector: userRole?.name?.toLowerCase().includes('director'),
      nameIncludesChief: userRole?.name?.toLowerCase().includes('chief'),
      nameIncludesManager: userRole?.name?.toLowerCase().includes('manager'),
      nameIncludesSuper: userRole?.name?.toLowerCase().includes('super'),
      nameIncludesRoot: userRole?.name?.toLowerCase().includes('root')
    });
    
    if (isAdmin) {
      console.log('🔍 Admin access granted for permission:', permission);
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
        return findRelatedPermissions(module, action);
      }
      
      // Fallback: return the permission as-is
      return [permission];
    };
    
    // Check if user has any of the mapped permissions
    const mappedPermissions = getMappedPermissions(permission);
    const hasAccess = mappedPermissions.some(perm => permissions.includes(perm));
    
    console.log('🔍 Permission mapping details:');
    console.log('  - Original permission:', permission);
    console.log('  - Mapped permissions:', mappedPermissions);
    console.log('  - User permissions:', permissions);
    console.log('  - Has access:', hasAccess);
    console.log('  - Permission checks:', mappedPermissions.map(perm => ({
      permission: perm,
      hasPermission: permissions.includes(perm)
    })));
    
    return hasAccess;
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    console.log('🔍 hasAnyPermission called with:', permissionList);
    console.log('🔍 User state:', { user: !!user, loading, authLoading });
    console.log('🔍 UserRole:', userRole);
    console.log('🔍 Permissions:', permissions);
    
    if (!user || loading || authLoading) {
      console.log('🔍 hasAnyPermission failed: no user or loading');
      return false;
    }
    
    // Check if userRole and permissions are loaded
    if (!userRole || !permissions || permissions.length === 0) {
      console.log('🔍 hasAnyPermission failed: userRole or permissions not loaded');
      return false;
    }
    
    // Allow admin access to everything
    const isAdmin = userRole?.code?.toLowerCase() === 'admin' || 
                   userRole?.name?.toLowerCase().includes('admin') ||
                   userRole?.name?.toLowerCase().includes('owner');
    
    console.log('🔍 Admin check in hasAnyPermission:', { 
      code: userRole?.code, 
      name: userRole?.name, 
      isAdmin 
    });
    
    if (isAdmin) {
      console.log('🔍 Admin access granted in hasAnyPermission');
      return true;
    }
    
    // Check if user has any of the required permissions using permission mapping
    const hasAccess = permissionList.some(permission => hasPermission(permission));
    console.log('🔍 hasAnyPermission result:', hasAccess);
    return hasAccess;
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    if (!user || loading || authLoading) {
      return false;
    }
    return permissionList.every(permission => permissions.includes(permission));
  };

  return {
    userRole,
    permissions,
    loading: loading || authLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin: userRole?.code === 'ADMIN' || userRole?.name?.toLowerCase().includes('admin'),
  };
}
