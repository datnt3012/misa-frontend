import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateCategorySchemaType, UpdateCategorySchemaType } from '../schemas';
import { CATEGORIES_API } from '../categories.api';
import { toast } from '@/hooks/use-toast';
import { CATEGORIES_QUERY_KEY } from '../constants';

export const useCategoriesMutation = () => {
    const queryClient = useQueryClient();

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });

    const createCategory = useMutation({
        mutationFn: (data: CreateCategorySchemaType) => CATEGORIES_API.CREATE_CATEGORY(data),
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

    const updateCategory = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateCategorySchemaType }) =>
            CATEGORIES_API.UPDATE_CATEGORY(id, data),
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

    const deleteCategory = useMutation({
        mutationFn: (id: string) => CATEGORIES_API.DELETE_CATEGORY(id),
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

    return { createCategory, updateCategory, deleteCategory };
};