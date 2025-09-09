import React from 'react';
import { Button } from './button';

interface LoadingProps {
  message?: string;
  error?: string | null;
  onRetry?: () => void;
  retryText?: string;
}

export const Loading: React.FC<LoadingProps> = ({ 
  message = "Đang tải...", 
  error = null, 
  onRetry,
  retryText = "Thử lại"
}) => {
  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-600 mb-4">Lỗi tải dữ liệu: {error}</p>
              {onRetry && (
                <Button 
                  onClick={onRetry}
                  className="px-4 py-2"
                >
                  {retryText}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loading;
