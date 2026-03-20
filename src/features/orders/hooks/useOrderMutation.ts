import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ORDER_API } from '../api/order.api';
import { ORDER_QUERY_KEYS } from './useOrderQuery';

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      ORDER_API.UPDATE_ORDER_STATUS(orderId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
    },
  });
};

export const useUpdateOrderNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, note }: { orderId: string; note: string }) =>
      ORDER_API.UPDATE_ORDER(orderId, { note }),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
    },
  });
};

export const useDeleteOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => ORDER_API.DELETE_ORDER(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
    },
  });
};

export const useDeleteOrders = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderIds: string[]) =>
      Promise.all(orderIds.map((id) => ORDER_API.DELETE_ORDER(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
    },
  });
};
