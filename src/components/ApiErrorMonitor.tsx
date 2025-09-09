import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, AlertTriangle, RefreshCw, X } from 'lucide-react';

interface ApiError {
  timestamp: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  error: string;
}

export const ApiErrorMonitor: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [errors, setErrors] = useState<ApiError[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Monitor console for API errors
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const originalWarn = console.warn;
    const originalError = console.error;

    console.warn = (...args) => {
      originalWarn(...args);
      
      // Check if it's an API fallback message
      const message = args[0];
      if (typeof message === 'string' && message.includes('API call failed, using fallback')) {
        const errorInfo = args[1];
        if (errorInfo && typeof errorInfo === 'object') {
          const newError: ApiError = {
            timestamp: new Date().toLocaleTimeString(),
            url: errorInfo.url || 'Unknown',
            method: errorInfo.method || 'Unknown',
            status: errorInfo.status || 0,
            statusText: errorInfo.statusText || 'Unknown',
            error: errorInfo.error || 'Unknown error'
          };
          
          setErrors(prev => [newError, ...prev.slice(0, 9)]); // Keep last 10 errors
        }
      }
    };

    console.error = (...args) => {
      originalError(...args);
      
      // Check for network errors and connection refused errors
      const message = args[0];
      if (typeof message === 'string' && (message.includes('Network Error') || message.includes('ECONNREFUSED'))) {
        const newError: ApiError = {
          timestamp: new Date().toLocaleTimeString(),
          url: 'Backend Connection',
          method: 'Unknown',
          status: 0,
          statusText: 'Connection Refused',
          error: 'Backend server appears to be offline'
        };
        
        setErrors(prev => [newError, ...prev.slice(0, 9)]);
      }
    };

    return () => {
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  const clearErrors = () => {
    setErrors([]);
  };

  const testApi = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3274/api/v0'}/health`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      console.log('API test successful');
    } catch (error) {
      console.error('API test failed:', error);
    }
  };

  if (!import.meta.env.DEV || errors.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100">
            <AlertTriangle className="w-4 h-4 mr-2" />
            API Errors ({errors.length})
            {isOpen ? <ChevronDown className="w-4 h-4 ml-2" /> : <ChevronRight className="w-4 h-4 ml-2" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="w-96 mt-2 bg-red-50 border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-red-800 flex items-center justify-between">
                API Error Monitor
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={testApi}
                    className="h-6 text-xs"
                  >
                    Test API
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearErrors}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {errors.map((error, index) => (
                <div key={index} className="text-xs bg-white p-2 rounded border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-red-700">{error.timestamp}</span>
                    <Badge variant="destructive" className="text-xs">
                      {error.status || 'ERR'}
                    </Badge>
                  </div>
                  <div className="text-red-600">
                    <div><strong>{error.method}</strong> {error.url}</div>
                    <div className="text-red-500">{error.error}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
