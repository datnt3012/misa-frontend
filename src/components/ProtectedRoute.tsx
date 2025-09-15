import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { UnauthorizedPage } from '@/components/UnauthorizedPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, userRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return (
      <UnauthorizedPage
        title="Không có quyền truy cập"
        message={`Bạn cần quyền ${requiredRole} để truy cập trang này`}
        error={`Vai trò hiện tại: ${userRole || 'Không xác định'}`}
        showBackButton={false}
        showRetryButton={false}
        showContactMessage={false}
      />
    );
  }

  return <>{children}</>;
}