import { useQuery } from '@tanstack/react-query';
import type { OrderFilterSchemaType } from '../schemas';
import { ORDER_API } from '../api/order.api';

export const ORDER_QUERY_KEYS = {
  list: (params: Partial<OrderFilterSchemaType> & { type?: 'sale' | 'purchase' }) =>
    ['orders', 'list', params] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
};

export const useOrderList = (
  params: Partial<OrderFilterSchemaType> & { type?: 'sale' | 'purchase' }
) => {
  return useQuery({
    queryKey: ORDER_QUERY_KEYS.list(params),
    queryFn: () => ORDER_API.GET_ALL(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
};

export const useOrderDetail = (id: string | null) => {
  return useQuery({
    queryKey: ORDER_QUERY_KEYS.detail(id ?? ''),
    queryFn: () => ORDER_API.GET_BY_ID(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
};
