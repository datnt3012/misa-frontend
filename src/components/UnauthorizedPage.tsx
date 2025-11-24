import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UnauthorizedPageProps {
  title?: string;
  message?: string;
  error?: string;
  onRetry?: () => void;
  showBackButton?: boolean;
  showRetryButton?: boolean;
  showContactMessage?: boolean;
}

export const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({
  title = "Không có quyền truy cập",
  message = "Bạn không có quyền truy cập vào trang này",
  error,
  onRetry,
  showBackButton = true,
  showRetryButton = false,
  showContactMessage = false
}) => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <Card className="border-destructive/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold text-destructive">
              {title}
            </CardTitle>
            <CardDescription className="text-base">
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-center text-sm text-muted-foreground">
                <p>{error}</p>
              </div>
            )}

            {showContactMessage && (
              <div className="text-center text-sm text-muted-foreground">
                <p>
                  Nếu bạn cho rằng đây là lỗi, vui lòng liên hệ quản trị viên.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
