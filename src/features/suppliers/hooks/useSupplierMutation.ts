import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateSupplierSchemaType, UpdateSupplierSchemaType } from '../schemas';
import { SUPPLIERS_API } from '../suppliers.api';
import { toast } from '@/hooks/use-toast';
import { SUPPLIERS_QUERY_KEY } from '../constants';

export const useSupplierMutation = () => {
    const queryClient = useQueryClient();

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: SUPPLIERS_QUERY_KEY });

    const createSupplier = useMutation({
        mutationFn: (data: CreateSupplierSchemaType) => SUPPLIERS_API.CREATE_CATEGORY(data),
        onSuccess: (data) => {
            invalidate();
            toast({
                title: "Thành công",
                description: "Đã thêm nhà cung cấp mới",
            });
            return data;
        },
        onError: () => {
            toast({
                title: "Lỗi",
                description: "Không thể thêm khách hàng",
                variant: "destructive",
            });
        },
    });

    const updateSupplier = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateSupplierSchemaType }) =>
            SUPPLIERS_API.UPDATE_CATEGORY(id, data),
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

    const deleteSupplier = useMutation({
        mutationFn: (id: string) => SUPPLIERS_API.DELETE_CATEGORY(id),
        onSuccess: () => {
            invalidate();
            toast({
                title: "Thành công",
                description: "Đã xóa nhà cung cấp",
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

    return { createSupplier, updateSupplier, deleteSupplier };
};