import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";

// ─── Types ───────────────────────────────────────────────
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

// ─── Main Hook ───────────────────────────────────────────
export const useLazyData = (config: LazyDataConfig) => {
  // Khởi tạo state cho từng key trong config
  const [dataStates, setDataStates] = useState<Record<string, LazyDataState>>(() =>
    Object.keys(config).reduce((acc, key) => {
      acc[key] = { isLoading: false, hasLoaded: false, error: null };
      return acc;
    }, {} as Record<string, LazyDataState>)
  );

  // ── Load dữ liệu (chỉ load khi chưa loaded hoặc chưa loading)
  const loadData = useCallback(
    async (key: string) => {
      const dataConfig = config[key];
      if (!dataConfig) return;

      let isCancelled = false;

      setDataStates((prev) => {
        const current = prev[key];
        if (current?.isLoading || current?.hasLoaded) return prev;
        return {
          ...prev,
          [key]: { ...current, isLoading: true, error: null },
        };
      });

      try {
        await dataConfig.loadFunction();
        if (isCancelled) return;

        setDataStates((prev) => ({
          ...prev,
          [key]: { ...prev[key], isLoading: false, hasLoaded: true, error: null },
        }));
      } catch (error) {
        if (isCancelled) return;

        setDataStates((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            isLoading: false,
            hasLoaded: false,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        }));
      }

      return () => {
        isCancelled = true;
      };
    },
    [config]
  );

  // ── Reload dữ liệu (bỏ qua điều kiện hasLoaded)
  const reloadData = useCallback(
    async (key: string) => {
      const dataConfig = config[key];
      if (!dataConfig) return;

      setDataStates((prev) => ({
        ...prev,
        [key]: { ...prev[key], isLoading: true, error: null },
      }));

      try {
        await dataConfig.loadFunction();
        setDataStates((prev) => ({
          ...prev,
          [key]: { ...prev[key], isLoading: false, hasLoaded: true, error: null },
        }));
      } catch (error) {
        setDataStates((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            isLoading: false,
            hasLoaded: false,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        }));
      }
    },
    [config]
  );

  // ── Reset dữ liệu
  const resetData = useCallback((key: string) => {
    setDataStates((prev) => ({
      ...prev,
      [key]: { isLoading: false, hasLoaded: false, error: null },
    }));
  }, []);

  // ── Lấy trạng thái 1 key cụ thể
  const getDataState = useCallback(
    (key: string) => dataStates[key] || { isLoading: false, hasLoaded: false, error: null },
    [dataStates]
  );

  // ── Tự reload khi dependencies thay đổi
  useEffect(() => {
    Object.entries(config).forEach(([key, { dependencies }]) => {
      if (dependencies && dependencies.length > 0) {
        reloadData(key);
      }
    });
  }, [config]);

  // ── Derived states
  const isLoading = Object.values(dataStates).some((s) => s.isLoading);
  const hasError = Object.values(dataStates).some((s) => !!s.error);
  const isAllLoaded = Object.values(dataStates).every((s) => s.hasLoaded);
  const errorMessages = Object.entries(dataStates)
    .filter(([, s]) => s.error)
    .map(([key, s]) => `${key}: ${s.error}`);

  return {
    loadData,
    reloadData,
    resetData,
    getDataState,
    dataStates,
    isLoading,
    hasError,
    isAllLoaded,
    errorMessages,
  };
};

// ─── Hook cho lazy loading theo route ──────────────────────
export const useRouteBasedLazyData = (config: LazyDataConfig) => {
  const location = useLocation();
  const lazyData = useLazyData(config);

  const routeMap: Record<string, string> = {
    "/": "dashboard",
    "/dashboard": "dashboard",
    "/inventory": "inventory",
    "/orders": "orders",
    "/customers": "customers",
    "/revenue": "revenue",
    "/export-slips": "exportSlips",
    "/settings": "settings",
  };

  useEffect(() => {
    const matchedKey = Object.keys(routeMap).find(
      (route) => location.pathname === route || location.pathname.startsWith(route)
    );

    if (matchedKey) lazyData.loadData(routeMap[matchedKey]);
  }, [location.pathname]);

  return lazyData;
};
