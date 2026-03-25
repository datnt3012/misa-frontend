import { useQuery } from '@tanstack/react-query';
import type { OrderFilterSchemaType } from '../schemas';
import { ORDER_API } from '../api/order.api';

export const ORDER_QUERY_KEYS = {
  list: (params: Partial<OrderFilterSchemaType>) =>
    ['orders', 'list', params] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
  payments: (id: string) => ['orders', 'payments', id] as const,
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

export const useOrderDetail = (id: string) => {
  return useQuery({
    queryKey: ORDER_QUERY_KEYS.detail(id),
    queryFn: ({ signal }) => ORDER_API.GET_ORDER_BY_ID(id, signal).then((res) => res.data),
    enabled: !!id,
    refetchInterval: 300_000,
    staleTime: 60_000,
    retry: 2,
  });
};

export const useOrderPaymentHistory = (id: string) => {
  return useQuery({
    queryKey: ORDER_QUERY_KEYS.payments(id),
    queryFn: ({ signal }) => ORDER_API.GET_PAYMENTS(id, signal).then((res) => res.data),
    enabled: !!id,
    refetchInterval: 300_000,
    staleTime: 60_000,
    retry: 2,
  });
};
