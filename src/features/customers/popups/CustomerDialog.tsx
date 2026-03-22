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
import { customerCreateFields } from '../constants';
import { DynamicFormField } from '@/shared/components/DynamicFormField';
import { CreateCustomerSchema, CreateCustomerSchemaType, CustomerSchemaType } from '../schemas/customer.schema';
import { useCustomerMutation } from '../hooks';
import { Label } from '@/components/ui/label';

interface CustomerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer?: CustomerSchemaType | null;
    onSave?: (customer: CustomerSchemaType) => void;
}

export const CustomerDialog: React.FC<CustomerDialogProps> = ({
    open,
    onOpenChange,
    customer,
    onSave,
}) => {
    const isEdit = !!customer;
    const { createCustomer, updateCustomer } = useCustomerMutation();
    const form = useForm<CreateCustomerSchemaType>({
        resolver: yupResolver(CreateCustomerSchema),
        defaultValues: {},
    });

    useEffect(() => {
        if (open) {
            if (customer) {
                form.reset({});
            } else {
                form.reset({});
            }
        }
    }, [open, customer, form]);

    const onSubmit = async (values: CreateCustomerSchemaType) => {
        try {
            if (isEdit && customer) {
                await updateCustomer.mutateAsync({
                    id: customer.id,
                    data: values,
                });
            } else {
                await createCustomer.mutateAsync(values);
            }
            onOpenChange(false);
        } catch (error) {
            // Error is handled in the mutation hook via toast
        }
    };

    const isLoading = createCustomer.isPending || updateCustomer.isPending;

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
                            <div className="col-span-12">
                                <Label className="text-lg">Thông tin khách hàng</Label>
                                <p className="text-sm text-muted-foreground">Nhập thông tin cơ bản của khách hàng.</p>
                            </div>
                            {customerCreateFields.slice(0, 6).map((config) => (
                                <DynamicFormField
                                    key={config.name as string}
                                    config={config}
                                    isReadOnly={isLoading}
                                />
                            ))}
                        </div>
                        <hr className="border-gray-200" />

                        <div className="grid grid-cols-12 gap-4 border border-gray-200 rounded-md p-4">
                            <div className="col-span-12">
                                <Label className="text-lg">Thông tin xuất hóa đơn VAT</Label>
                                <p className="text-sm text-muted-foreground">Nhập thông tin xuất hóa đơn VAT.</p>
                            </div>
                            {customerCreateFields.slice(6, customerCreateFields.length).map((config) => (
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

