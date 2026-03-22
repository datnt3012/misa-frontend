import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Form,
} from '@/components/ui/form';
import { createCategorySchema, CreateCategorySchemaType, CategorySchemaType as Category } from '../schemas/category.schema';
import { useCategoriesMutation } from '../hooks/useCategoriesMutation';
import { CATEGORY_FORM_CONFIG } from '../constants';
import { DynamicFormField } from '@/shared/components/DynamicFormField';

interface CategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category?: Category | null;
}

export const CategoryDialog: React.FC<CategoryDialogProps> = ({
    open,
    onOpenChange,
    category,
}) => {
    const isEdit = !!category;
    const { createCategory, updateCategory } = useCategoriesMutation();
    const form = useForm<CreateCategorySchemaType>({
        resolver: yupResolver(createCategorySchema),
        defaultValues: {
            name: '',
            description: '',
        },
    });

    useEffect(() => {
        if (open) {
            if (category) {
                form.reset({
                    name: category.name,
                    description: category.description || '',
                });
            } else {
                form.reset({
                    name: '',
                    description: '',
                });
            }
        }
    }, [open, category, form]);

    const onSubmit = async (values: CreateCategorySchemaType) => {
        try {
            if (isEdit && category) {
                await updateCategory.mutateAsync({
                    id: category.id,
                    data: values,
                });
            } else {
                await createCategory.mutateAsync(values);
            }
            onOpenChange(false);
        } catch (error) {
            // Error is handled in the mutation hook via toast
        }
    };

    const isLoading = createCategory.isPending || updateCategory.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? 'Chỉnh sửa loại sản phẩm' : 'Thêm loại sản phẩm mới'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? 'Cập nhật thông tin loại sản phẩm'
                            : 'Tạo loại sản phẩm mới trong hệ thống'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                        <div className="grid grid-cols-12 gap-4">
                            {CATEGORY_FORM_CONFIG.map((config) => (
                                <DynamicFormField
                                    key={config.name as string}
                                    config={config}
                                    isReadOnly={isLoading}
                                />
                            ))}
                        </div>

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isLoading}
                            >
                                Hủy
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm loại sản phẩm'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

