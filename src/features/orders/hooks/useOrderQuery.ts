import { useQuery } from '@tanstack/react-query';
import type { OrderFilterSchemaType } from '../schemas';
import { ORDER_API } from '../api/order.api';

export const ORDER_QUERY_KEYS = {
  list: (params: Partial<OrderFilterSchemaType>) =>
    ['orders', 'list', params] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
};

export const useOrderList = (params: Partial<OrderFilterSchemaType>) => {
  return useQuery({
    queryKey: ORDER_QUERY_KEYS.list(params),
    queryFn: ({ signal }) => ORDER_API.GET_ORDERS(params, signal),
    placeholderData: (prev) => prev,
    refetchInterval: 300_000,
    staleTime: 60_000,
    retry: 2,
  });
};

export const useOrderDetail = (id: string | null) => {
  return useQuery({
    queryKey: ORDER_QUERY_KEYS.detail(id ?? ''),
    queryFn: ({ signal }) => ORDER_API.GET_ORDER_BY_ID(id!, signal),
    enabled: !!id,
    refetchInterval: 300_000,
    staleTime: 60_000,
    retry: 2,
  });
};
