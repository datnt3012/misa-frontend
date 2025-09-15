import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

interface LazyDataState {
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
}

interface LazyDataConfig {
  [key: string]: {
    loadFunction: () => Promise<void>;
    dependencies?: any[];
  };
}

export const useLazyData = (config: LazyDataConfig) => {
  const location = useLocation();
  const [dataStates, setDataStates] = useState<{ [key: string]: LazyDataState }>({});

  // Initialize data states
  useEffect(() => {
    const initialStates: { [key: string]: LazyDataState } = {};
    Object.keys(config).forEach(key => {
      initialStates[key] = {
        isLoading: false,
        hasLoaded: false,
        error: null
      };
    });
    setDataStates(initialStates);
  }, []);

  const loadData = useCallback(async (key: string) => {
    const dataConfig = config[key];
    if (!dataConfig) return;

    // Check current state before proceeding
    setDataStates(prev => {
      // Don't load if already loading or loaded
      if (prev[key]?.isLoading || prev[key]?.hasLoaded) return prev;
      
      // Start loading
      return {
        ...prev,
        [key]: { ...prev[key], isLoading: true, error: null }
      };
    });

    try {
      await dataConfig.loadFunction();
      setDataStates(prev => ({
        ...prev,
        [key]: { ...prev[key], isLoading: false, hasLoaded: true, error: null }
      }));
    } catch (error) {
      setDataStates(prev => ({
        ...prev,
        [key]: { 
          ...prev[key], 
          isLoading: false, 
          hasLoaded: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }));
    }
  }, [config]);

  const reloadData = useCallback(async (key: string) => {
    const dataConfig = config[key];
    if (!dataConfig) return;

    setDataStates(prev => ({
      ...prev,
      [key]: { ...prev[key], isLoading: true, error: null }
    }));

    try {
      await dataConfig.loadFunction();
      setDataStates(prev => ({
        ...prev,
        [key]: { ...prev[key], isLoading: false, hasLoaded: true, error: null }
      }));
    } catch (error) {
      setDataStates(prev => ({
        ...prev,
        [key]: { 
          ...prev[key], 
          isLoading: false, 
          hasLoaded: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }));
    }
  }, [config]);

  const resetData = useCallback((key: string) => {
    setDataStates(prev => ({
      ...prev,
      [key]: { isLoading: false, hasLoaded: false, error: null }
    }));
  }, []);

  const getDataState = useCallback((key: string) => {
    return dataStates[key] || { isLoading: false, hasLoaded: false, error: null };
  }, [dataStates]);

  return {
    loadData,
    reloadData,
    resetData,
    getDataState,
    isLoading: Object.values(dataStates).some(state => state.isLoading),
    hasError: Object.values(dataStates).some(state => state.error)
  };
};

// Hook for route-based lazy loading
export const useRouteBasedLazyData = (config: LazyDataConfig) => {
  const location = useLocation();
  const lazyData = useLazyData(config);

  useEffect(() => {
    // Load data based on current route
    const pathname = location.pathname;
    
    if (pathname === '/' || pathname === '/dashboard') {
      lazyData.loadData('dashboard');
    } else if (pathname.startsWith('/inventory')) {
      lazyData.loadData('inventory');
    } else if (pathname.startsWith('/orders')) {
      lazyData.loadData('orders');
    } else if (pathname.startsWith('/customers')) {
      lazyData.loadData('customers');
    } else if (pathname.startsWith('/revenue')) {
      lazyData.loadData('revenue');
    } else if (pathname.startsWith('/export-slips')) {
      lazyData.loadData('exportSlips');
    } else if (pathname.startsWith('/settings')) {
      lazyData.loadData('settings');
    }
  }, [location.pathname]); // Removed lazyData from dependencies to prevent infinite loops

  return lazyData;
};
