import React from 'react';
import { Button } from './button';
import { ApiErrorPage } from '../ApiErrorPage';

interface LoadingProps {
  message?: string;
  error?: string | null;
  onRetry?: () => void;
  retryText?: string;
  isUnauthorized?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({ 
  message = "Đang tải...", 
  error = null, 
  onRetry,
  retryText = "Thử lại",
  isUnauthorized = false
}) => {
  if (error) {
    // Check if it's a 403/401 error (unauthorized)
    const is403Error = error.includes('403') || error.includes('401') || error.includes('Unauthorized');
    const finalIsUnauthorized = isUnauthorized || is403Error;
    
    return (
      <ApiErrorPage
        error={error}
        onRetry={onRetry}
        isUnauthorized={finalIsUnauthorized}
        showBackButton={true}
      />
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
