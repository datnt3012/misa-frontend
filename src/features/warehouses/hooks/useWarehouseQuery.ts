import { useQuery } from '@tanstack/react-query';
import type { WarehouseFilterSchemaType } from '../schemas';
import { WAREHOUSE_API } from '../api/warehouse.api';

export const WAREHOUSE_QUERY_KEYS = {
  list: (params: Partial<WarehouseFilterSchemaType>) => ['warehouses', 'list', params] as const,
  detail: (id: string) => ['warehouses', 'detail', id] as const,
};

export const useWarehouseList = (params: Partial<WarehouseFilterSchemaType>) => {
  return useQuery({
    queryKey: WAREHOUSE_QUERY_KEYS.list(params),
    queryFn: ({ signal }) => WAREHOUSE_API.GET_WAREHOUSES(params, signal),
    placeholderData: (prev) => prev,
    refetchInterval: 300_000,
    staleTime: 60_000,
    retry: 2,
  });
};

export const useWarehouseDetail = (id: string | null) => {
  return useQuery({
    queryKey: WAREHOUSE_QUERY_KEYS.detail(id ?? ''),
    queryFn: ({ signal }) => WAREHOUSE_API.GET_WAREHOUSE_BY_ID(id!, signal),
    enabled: !!id,
    refetchInterval: 300_000,
    staleTime: 60_000,
    retry: 2,
  });
};
