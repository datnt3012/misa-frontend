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
import { supplierCreateFields } from '../constants';
import { DynamicFormField } from '@/shared/components/DynamicFormField';
import { CreateSupplierSchema, CreateSupplierSchemaType, SupplierSchemaType } from '../schemas/supplier.schema';
import { useSupplierMutation } from '../hooks';

interface SupplierDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    supplier?: SupplierSchemaType | null;
    onSave?: (supplier: SupplierSchemaType) => void;
}

export const SupplierDialog: React.FC<SupplierDialogProps> = ({
    open,
    onOpenChange,
    supplier,
    onSave,
}) => {
    const isEdit = !!supplier;
    const { createSupplier, updateSupplier } = useSupplierMutation();
    const form = useForm<CreateSupplierSchemaType>({
        resolver: yupResolver(CreateSupplierSchema),
        defaultValues: {},
    });

    useEffect(() => {
        if (open) {
            if (supplier) {
                form.reset({});
            } else {
                form.reset({});
            }
        }
    }, [open, supplier, form]);

    const onSubmit = async (values: CreateSupplierSchemaType) => {
        try {
            if (isEdit && supplier) {
                await updateSupplier.mutateAsync({
                    id: supplier.id,
                    data: values,
                });
            } else {
                await createSupplier.mutateAsync(values);
            }
            onOpenChange(false);
        } catch (error) {
            // Error is handled in the mutation hook via toast
        }
    };

    const isLoading = createSupplier.isPending || updateSupplier.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? 'Cập nhật thông tin khách hàng'
                            : 'Tạo khách hàng mới trong hệ thống'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                        <div className="grid grid-cols-12 gap-4 border border-gray-200 rounded-md p-4">
                            {supplierCreateFields.map((config) => (
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
                                {isLoading ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm mới'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

