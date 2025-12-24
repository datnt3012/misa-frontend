import React from 'react';
import { Loading } from '@/components/ui/loading';
import { ApiErrorPage } from '@/components/ApiErrorPage';

interface LoadingWrapperProps {
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  loadingMessage?: string;
  errorMessage?: string;
  isUnauthorized?: boolean;
}

export const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  isLoading,
  error,
  onRetry,
  children,
  loadingMessage = "Đang tải...",
  errorMessage,
  isUnauthorized = false
}) => {
  // Show error page if there's an error
  if (error) {
    return (
      <ApiErrorPage
        error={errorMessage || error}
        onRetry={onRetry}
        isUnauthorized={isUnauthorized}
        showBackButton={true}
      />
    );
  }

  // Show loading state if loading
  if (isLoading) {
    return <Loading message={loadingMessage} />;
  }

  // Show children if not loading and no error
  return <>{children}</>;
};

export default LoadingWrapper;