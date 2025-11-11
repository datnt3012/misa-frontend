import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { UnauthorizedPage } from '@/components/UnauthorizedPage';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermissions: string[];
  fallback?: React.ReactNode;
  showFallback?: boolean;
  requireAll?: boolean; // If true, user needs ALL permissions; if false, user needs ANY permission
}

export function PermissionGuard({ 
  children, 
  requiredPermissions, 
  fallback,
  showFallback = true,
  requireAll = false
}: PermissionGuardProps) {
  const { hasAnyPermission, hasAllPermissions, loading, userRole, getPermissionErrorMessage, permissionNamesLoaded } = usePermissions();

  // Wait for both user permissions AND permission names to load
  // This ensures permission names are available when displaying error messages
  if (loading || !permissionNamesLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  const hasPermission = requireAll ? hasAllPermissions(requiredPermissions) : hasAnyPermission(requiredPermissions);
  const errorMessage = getPermissionErrorMessage(requiredPermissions, requireAll);


  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (!showFallback) {
      return null;
    }

    return (
      <UnauthorizedPage
        title="Không có quyền truy cập"
        message={errorMessage || 'Bạn cần quyền truy cập để xem trang này'}
        error={`Vai trò hiện tại: ${userRole?.name || 'Không xác định'}`}
        showBackButton={false}
        showRetryButton={false}
        showContactMessage={false}
      />
    );
  }

  return <>{children}</>;
}

// Higher-order component version
export function withPermissionGuard<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions: string[],
  fallback?: React.ReactNode
) {
  return function PermissionGuardedComponent(props: P) {
    return (
      <PermissionGuard requiredPermissions={requiredPermissions} fallback={fallback}>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}
