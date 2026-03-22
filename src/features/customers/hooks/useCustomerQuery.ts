import { useQuery } from '@tanstack/react-query';
import { CUSTOMERS_API } from '../customers.api';
import { CustomersFilterSchemaType } from '@/features/customers/schemas/filter.schema';
import { CUSTOMERS_QUERY_KEY } from '../constants';

export const useCustomerListQuery = (params?: CustomersFilterSchemaType) =>
  useQuery({
    queryKey: [...CUSTOMERS_QUERY_KEY, params],
    queryFn: ({ signal }) => CUSTOMERS_API.GET_ALL(params, signal),
    refetchInterval: 300_000,
    staleTime: 60_000,
    retry: 2,
  });

export const useCustomerQuery = (id: string) =>
  useQuery({
    queryKey: [...CUSTOMERS_QUERY_KEY, id],
    queryFn: ({ signal }) => CUSTOMERS_API.GET_BY_ID(id, signal),
    enabled: !!id,
    refetchInterval: 300_000,
    staleTime: 60_000,
    retry: 2,
  });
