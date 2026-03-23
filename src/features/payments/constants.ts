import { GenericFormFieldConfig } from "@/shared/config/field.config";
import { PaymentSchemaType } from "./schemas";

export const PAYMENTS_QUERY_KEY = ['payments'] as const;
export const PAYMENTS_METHOD = {
    CASH: 'cash',
    BANK_TRANSFER: 'bank_transfer',
    CARD: 'card',
    OTHER: 'other',
} as const;

type FormFieldConfig = GenericFormFieldConfig<PaymentSchemaType>;

export const PAYMENT_FORM_CONFIG: FormFieldConfig[] = [
    // {
    //     label: 'Tên loại sản phẩm',
    //     name: 'name',
    //     type: 'text',
    //     colSpan: 12,
    //     required: true,
    // },
    // {
    //     label: 'Mô tả',
    //     name: 'description',
    //     type: 'textarea',
    //     colSpan: 12,
    // },
] as const;