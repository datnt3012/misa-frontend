import { useMutation, useQueryClient } from '@tanstack/react-query';
import { WAREHOUSE_API } from '../api/warehouse.api';
import { WAREHOUSE_QUERY_KEYS } from './useWarehouseQuery';
import type { CreateWarehouseSchemaType, UpdateWarehouseSchemaType } from '../schemas';

export const useCreateWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWarehouseSchemaType) => WAREHOUSE_API.CREATE_WAREHOUSE(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses', 'list'] });
    },
  });
};

export const useUpdateWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ warehouseId, data }: { warehouseId: string; data: UpdateWarehouseSchemaType }) =>
      WAREHOUSE_API.UPDATE_WAREHOUSE(warehouseId, data),
    onSuccess: (_, { warehouseId }) => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_QUERY_KEYS.detail(warehouseId) });
      queryClient.invalidateQueries({ queryKey: ['warehouses', 'list'] });
    },
  });
};

export const useDeleteWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (warehouseId: string) => WAREHOUSE_API.DELETE_WAREHOUSE(warehouseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses', 'list'] });
    },
  });
};
