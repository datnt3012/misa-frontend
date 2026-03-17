import { useQuery } from '@tanstack/react-query';
import { orderApi } from '@/api/order.api';
import type { OrderFilterParams } from '../schemas';

export const ORDER_QUERY_KEYS = {
  list: (params: Partial<OrderFilterParams> & { type?: 'sale' | 'purchase' }) =>
    ['orders', 'list', params] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
};

export const useOrderList = (
  params: Partial<OrderFilterParams> & { type?: 'sale' | 'purchase' }
) => {
  return useQuery({
    queryKey: ORDER_QUERY_KEYS.list(params),
    queryFn: () =>
      orderApi.getOrders({
        page: params.page,
        limit: params.limit,
        status: params.status,
        startDate: params.startDate,
        endDate: params.endDate,
        completedStartDate: params.completedStartDate,
        completedEndDate: params.completedEndDate,
        minTotalAmount: params.minTotalAmount,
        maxTotalAmount: params.maxTotalAmount,
        categories: params.categories as string | undefined,
        paymentMethods: params.paymentMethods as string | undefined,
        manufacturers: params.manufacturers as string | undefined,
        createdBy: params.createdBy,
        bank: params.bank,
        type: params.type,
      }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
};

export const useOrderDetail = (id: string | null) => {
  return useQuery({
    queryKey: ORDER_QUERY_KEYS.detail(id ?? ''),
    queryFn: () => orderApi.getOrder(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
};
