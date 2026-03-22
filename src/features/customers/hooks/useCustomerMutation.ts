import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateCustomerSchemaType, CustomerSchemaType, UpdateCustomerSchemaType } from '../schemas';
import { CUSTOMERS_API } from '../customers.api';
import { toast } from '@/hooks/use-toast';
import { CUSTOMERS_QUERY_KEY } from '../constants';
import { BackendPaginatedResponse } from '@/shared/schemas';

export const useCustomerMutation = () => {
    const queryClient = useQueryClient();

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });

    const createCustomer = useMutation({
        mutationFn: (data: CreateCustomerSchemaType) => CUSTOMERS_API.CREATE_CATEGORY(data),
        onSuccess: () => {
            invalidate();
            toast({
                title: "Thành công",
                description: "Đã thêm khách hàng mới",
            });
        },
        onError: () => {
            toast({
                title: "Lỗi",
                description: "Không thể thêm khách hàng",
                variant: "destructive",
            });
        },
    });

    const updateCustomer = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateCustomerSchemaType }) =>
            CUSTOMERS_API.UPDATE_CATEGORY(id, data),
        onSuccess: () => {
            invalidate();
            toast({
                title: "Thành công",
                description: "Đã cập nhật khách hàng",
            });
        },
        onError: () => {
            toast({
                title: "Lỗi",
                description: "Không thể cập nhật khách hàng",
                variant: "destructive",
            });
        },
    });

    const deleteCustomer = useMutation({
        mutationFn: (id: string) => CUSTOMERS_API.DELETE_CATEGORY(id),
        onSuccess: () => {
            invalidate();
            toast({
                title: "Thành công",
                description: "Đã xóa khách hàng",
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

    return { createCustomer, updateCustomer, deleteCustomer };
};