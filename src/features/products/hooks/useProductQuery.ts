import { useQuery } from '@tanstack/react-query';
import type { ProductFilterSchemaType } from '../schemas';
import { PRODUCT_API } from '../api/product.api';

export const PRODUCT_QUERY_KEYS = {
  list: (params: Partial<ProductFilterSchemaType>) => ['products', 'list', params] as const,
  detail: (id: string) => ['products', 'detail', id] as const,
  manufacturers: () => ['products', 'manufacturers'] as const,
  importJobs: (params?: { onlyActive?: boolean; page?: number; limit?: number }) =>
    ['products', 'importJobs', params] as const,
  importJobStatus: (jobId: string) => ['products', 'importJobStatus', jobId] as const,
};

export const useProductList = (params: Partial<ProductFilterSchemaType>) => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.list(params),
    queryFn: ({ signal }) => PRODUCT_API.GET_PRODUCTS(params, signal),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
};

export const useProductDetail = (id: string | null) => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.detail(id ?? ''),
    queryFn: ({ signal }) => PRODUCT_API.GET_PRODUCT_BY_ID(id!, signal),
    enabled: !!id,
    staleTime: 30_000,
  });
};

export const useManufacturers = () => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.manufacturers(),
    queryFn: ({ signal }) => PRODUCT_API.GET_MANUFACTURERS(signal),
    staleTime: 300_000,
  });
};

export const useImportJobs = (params?: { onlyActive?: boolean; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.importJobs(params),
    queryFn: ({ signal }) => PRODUCT_API.LIST_IMPORT_JOBS(params, signal),
    staleTime: 10_000,
  });
};

/** Poll import job status until completed/failed/cancelled. */
export const useImportJobStatus = (jobId: string | null) => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.importJobStatus(jobId ?? ''),
    queryFn: ({ signal }) => PRODUCT_API.GET_IMPORT_JOB_STATUS(jobId!, signal),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || status === 'completed' || status === 'failed' || status === 'cancelled') {
        return false;
      }
      return 2_000;
    },
    staleTime: 0,
  });
};
