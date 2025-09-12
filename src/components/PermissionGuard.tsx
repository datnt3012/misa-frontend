import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Shield, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermissions: string[];
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export function PermissionGuard({ 
  children, 
  requiredPermissions, 
  fallback,
  showFallback = true 
}: PermissionGuardProps) {
  const { hasAnyPermission, loading, userRole, getPermissionErrorMessage } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  const hasPermission = hasAnyPermission(requiredPermissions);
  const errorMessage = getPermissionErrorMessage(requiredPermissions);

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (!showFallback) {
      return null;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Không có quyền truy cập</CardTitle>
            <CardDescription>
              {errorMessage || 'Bạn cần quyền truy cập để xem trang này'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Vai trò hiện tại: <strong>{userRole?.name || 'Không xác định'}</strong></p>
              <p>Quyền cần thiết: {requiredPermissions.join(', ')}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
              className="w-full"
            >
              Quay lại
            </Button>
          </CardContent>
        </Card>
      </div>
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
