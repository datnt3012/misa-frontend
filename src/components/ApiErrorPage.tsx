import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Wifi, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ApiErrorPageProps {
  title?: string;
  message?: string;
  error?: string;
  onRetry?: () => void;
  showBackButton?: boolean;
  isUnauthorized?: boolean;
}

export const ApiErrorPage: React.FC<ApiErrorPageProps> = ({
  title,
  message,
  error,
  onRetry,
  showBackButton = true,
  isUnauthorized = false
}) => {
  const navigate = useNavigate();

  // Set default title and message based on error type
  const defaultTitle = isUnauthorized 
    ? "Không có quyền truy cập" 
    : "Lỗi tải dữ liệu";
    
  const defaultMessage = isUnauthorized
    ? "Bạn không có quyền truy cập vào dữ liệu này"
    : "Không thể tải dữ liệu từ máy chủ";

  const finalTitle = title || defaultTitle;
  const finalMessage = message || defaultMessage;

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const getErrorIcon = () => {
    if (isUnauthorized) {
      return <AlertTriangle className="h-8 w-8 text-destructive" />;
    }
    return <Wifi className="h-8 w-8 text-destructive" />;
  };

  const getErrorColor = () => {
    return isUnauthorized ? "destructive" : "orange-600";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <Card className={`border-${getErrorColor()}/20`}>
          <CardHeader className="text-center">
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-${getErrorColor()}/10`}>
              {getErrorIcon()}
            </div>
            <CardTitle className={`text-2xl font-bold text-${getErrorColor()}`}>
              {finalTitle}
            </CardTitle>
            <CardDescription className="text-base">
              {finalMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className={`rounded-lg border border-${getErrorColor()}/20 bg-${getErrorColor()}/5 p-4`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`h-5 w-5 text-${getErrorColor()} mt-0.5 flex-shrink-0`} />
                  <div className="space-y-1">
                    <p className={`text-sm font-medium text-${getErrorColor()}`}>
                      Chi tiết lỗi:
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {showBackButton && (
                <Button 
                  variant="outline" 
                  onClick={handleGoBack}
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Quay lại
                </Button>
              )}
              
              <Button 
                onClick={handleGoHome}
                className="w-full"
              >
                Về trang chủ
              </Button>

              {onRetry && (
                <Button 
                  variant="outline" 
                  onClick={onRetry}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Thử lại
                </Button>
              )}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>
                {isUnauthorized 
                  ? "Vui lòng liên hệ quản trị viên để được cấp quyền truy cập."
                  : "Vui lòng kiểm tra kết nối mạng và thử lại."
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApiErrorPage;
