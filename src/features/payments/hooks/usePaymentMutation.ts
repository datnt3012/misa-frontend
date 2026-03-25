import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreatePaymentSchemaType, UpdatePaymentSchemaType } from '../schemas';
import { PAYMENTS_API } from '../payment.api';
import { toast } from '@/hooks/use-toast';
import { PAYMENTS_QUERY_KEY } from '../constants';

export const usePaymentMutation = () => {
    const queryClient = useQueryClient();

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: PAYMENTS_QUERY_KEY });

    const createPayment = useMutation({
        mutationFn: (data: CreatePaymentSchemaType) => PAYMENTS_API.CREATE_PAYMENT(data),
        onSuccess: () => {
            invalidate();
            toast({
                title: "Thành công",
                description: "Đã thêm loại sản phẩm mới",
            });
        },
        onError: () => {
            toast({
                title: "Lỗi",
                description: "Không thể thêm loại sản phẩm",
                variant: "destructive",
            });
        },
    });

    const updatePayment = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdatePaymentSchemaType }) =>
            PAYMENTS_API.UPDATE_PAYMENT(id, data),
        onSuccess: () => {
            invalidate();
            toast({
                title: "Thành công",
                description: "Đã cập nhật loại sản phẩm",
            });
        },
        onError: () => {
            toast({
                title: "Lỗi",
                description: "Không thể cập nhật loại sản phẩm",
                variant: "destructive",
            });
        },
    });

    const deletePayment = useMutation({
        mutationFn: (id: string) => PAYMENTS_API.DELETE_PAYMENT(id),
        onSuccess: () => {
            invalidate();
            toast({
                title: "Thành công",
                description: "Đã xóa loại sản phẩm",
            });
        },
        onError: () => {
            toast({
                title: "Lỗi",
                description: "Không thể xóa loại sản phẩm",
                variant: "destructive",
            });
        },
    });

    return { createPayment, updatePayment, deletePayment };
};