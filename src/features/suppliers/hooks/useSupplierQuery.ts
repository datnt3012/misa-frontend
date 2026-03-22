import { useQuery } from '@tanstack/react-query';
import { SUPPLIERS_API } from '../suppliers.api';
import { CustomersFilterSchemaType } from '@/features/customers/schemas/filter.schema';
import { SUPPLIERS_QUERY_KEY } from '../constants';

export const useSupplierListQuery = (params?: CustomersFilterSchemaType) =>
  useQuery({
    queryKey: [...SUPPLIERS_QUERY_KEY, params],
    queryFn: ({ signal }) => SUPPLIERS_API.GET_ALL(params, signal),
    refetchInterval: 300_000,
    staleTime: 60_000,
    retry: 2,
  });

export const useSupplierQuery = (id: string) =>
  useQuery({
    queryKey: [...SUPPLIERS_QUERY_KEY, id],
    queryFn: ({ signal }) => SUPPLIERS_API.GET_BY_ID(id, signal),
    enabled: !!id,
    refetchInterval: 300_000,
    staleTime: 60_000,
    retry: 2,
  });
