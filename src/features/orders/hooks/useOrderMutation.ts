import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '@/api/order.api';
import { ORDER_QUERY_KEYS } from './useOrderQuery';

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      orderApi.updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
    },
  });
};

export const useUpdateOrderNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, note }: { orderId: string; note: string }) =>
      orderApi.updateOrder(orderId, { note }),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
    },
  });
};

export const useDeleteOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => orderApi.deleteOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
    },
  });
};

export const useDeleteOrders = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderIds: string[]) =>
      Promise.all(orderIds.map((id) => orderApi.deleteOrder(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
    },
  });
};
