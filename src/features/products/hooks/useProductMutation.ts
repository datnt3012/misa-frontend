import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PRODUCT_API } from '../api/product.api';
import { PRODUCT_QUERY_KEYS } from './useProductQuery';
import type { CreateProductSchemaType, UpdateProductSchemaType } from '../schemas';

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductSchemaType) => PRODUCT_API.CREATE_PRODUCT(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: UpdateProductSchemaType }) =>
      PRODUCT_API.UPDATE_PRODUCT(productId, data),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.detail(productId) });
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => PRODUCT_API.DELETE_PRODUCT(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
    },
  });
};

export const useDeleteProducts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productIds: string[]) =>
      Promise.all(productIds.map((id) => PRODUCT_API.DELETE_PRODUCT(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
    },
  });
};

export const useRestoreProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => PRODUCT_API.RESTORE_PRODUCT(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
    },
  });
};

// ── Import ─────────────────────────────────────────────────────────────────

export const useImportProducts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, warehouse_id }: { file: File; warehouse_id?: string }) =>
      PRODUCT_API.IMPORT_EXCEL(file, warehouse_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
    },
  });
};

export const useImportProductsAsync = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, warehouse_id }: { file: File; warehouse_id?: string }) =>
      PRODUCT_API.IMPORT_EXCEL_ASYNC(file, warehouse_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'importJobs'] });
    },
  });
};

export const useCancelImportJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => PRODUCT_API.CANCEL_IMPORT_JOB(jobId),
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.importJobStatus(jobId) });
      queryClient.invalidateQueries({ queryKey: ['products', 'importJobs'] });
    },
  });
};

// ── Export ─────────────────────────────────────────────────────────────────

export const useExportProducts = () => {
  return useMutation({
    mutationFn: (params?: { warehouse_id?: string; category?: string }) =>
      PRODUCT_API.EXPORT_PRODUCTS(params),
  });
};

export const useDownloadImportTemplate = () => {
  return useMutation({
    mutationFn: () => PRODUCT_API.DOWNLOAD_IMPORT_TEMPLATE(),
  });
};
