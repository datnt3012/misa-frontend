import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ORDER_API } from '../api/order.api';
import { ORDER_QUERY_KEYS } from './useOrderQuery';
import { CreateOrderSchemaType, UpdateOrderSchemaType } from '../schemas';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/error-utils';

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrderSchemaType) => ORDER_API.CREATE_ORDER(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
      toast({
        title: 'Thành công',
        description: 'Thêm mới đơn hàng thành công',
        variant: 'default',
      })
    },
    onError: (error) => {
      toast({
        title: 'Thất bại',
        description: getErrorMessage(error, "Không thể tạo đơn hàng"),
        variant: 'destructive',
      })
      console.error("error", error)
    }
  });
};


export const useUpdateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: UpdateOrderSchemaType }) =>
      ORDER_API.UPDATE_ORDER(orderId, data),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
      toast({
        title: 'Thành công',
        description: 'Cập nhật đơn hàng thành công',
        variant: 'default',
      })
    },
    onError: (error) => {
      toast({
        title: 'Thất bại',
        description: getErrorMessage(error, "Không thể cập nhật đơn hàng"),
        variant: 'destructive',
      })
      console.error("error", error)
    }
  });
}

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      ORDER_API.UPDATE_ORDER_STATUS(orderId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
      toast({
        title: 'Thành công',
        description: 'Cập nhật trạng thái đơn hàng thành công',
        variant: 'default',
      })
    },
    onError: (error) => {
      toast({
        title: 'Thất bại',
        description: getErrorMessage(error, "Không thể cập nhật trạng thái đơn hàng"),
        variant: 'destructive',
      })
      console.error("error", error)
    }
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
