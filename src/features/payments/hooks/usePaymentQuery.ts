import { useQuery } from '@tanstack/react-query';
import { PAYMENTS_API } from '../payment.api';
import { PAYMENTS_QUERY_KEY } from '../constants';

export const usePaymentsQuery = (orderId: string) =>
  useQuery({
    queryKey: [...PAYMENTS_QUERY_KEY, orderId],
    queryFn: ({ signal }) => PAYMENTS_API.GET_PAYMENTS({ orderId }, signal),
    refetchInterval: 300_000,
    staleTime: 60_000,
    retry: 2,
  });

export const usePaymentQuery = (id: string) =>
  useQuery({
    queryKey: [...PAYMENTS_QUERY_KEY, id],
    queryFn: ({ signal }) => PAYMENTS_API.GET_PAYMENT_BY_ID(id, signal),
    enabled: !!id,
    refetchInterval: 300_000,
    staleTime: 60_000,
    retry: 2,
  });
