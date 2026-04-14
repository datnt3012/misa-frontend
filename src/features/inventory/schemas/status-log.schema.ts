import { uuidSchema } from '@/shared/schemas/validation.schema';
import * as yup from 'yup';
import { ReceiptAction, ReceiptStatus, WarehouseReceiptType } from '../constants';

/**
 * Yup Validation Schema for WarehouseReceiptStatusLog
 */
export const warehouseReceiptStatusLogSchema = yup.object().shape({
    warehouseReceiptId: uuidSchema.required('Warehouse Receipt ID is required'),

    receiptType: yup
        .string()
        .oneOf(
            Object.values(WarehouseReceiptType),
            `Receipt Type must be one of: ${Object.values(WarehouseReceiptType).join(', ')}`
        )
        .required('Receipt Type is required'),

    quantity: yup
        .string()
        .required('Quantity is required')
        .max(25, 'Quantity must not exceed 25 characters'),

    action: yup
        .string()
        .oneOf(
            Object.values(ReceiptAction),
            `Action must be one of: ${Object.values(ReceiptAction).join(', ')}`
        )
        .required('Action is required'),

    performedBy: yup.string().required('Performed By is required'),

    // Optional Fields
    receiptCode: yup
        .string()
        .max(25, 'Receipt Code must not exceed 25 characters')
        .optional(),

    warehouseId: uuidSchema.optional(),

    warehouseName: yup
        .string()
        .max(25, 'Warehouse Name must not exceed 25 characters')
        .optional(),

    warehouseCode: yup
        .string()
        .max(25, 'Warehouse Code must not exceed 25 characters')
        .optional(),

    productName: yup
        .string()
        .max(25, 'Product Name must not exceed 25 characters')
        .optional(),

    productCode: yup
        .string()
        .max(25, 'Product Code must not exceed 25 characters')
        .optional(),

    status: yup
        .string()
        .oneOf(
            Object.values(ReceiptStatus),
            `Status must be one of: ${Object.values(ReceiptStatus).join(', ')}`
        )
        .optional(),

    note: yup.string().optional(),
});

/**
 * TypeScript Type derived from Yup Schema
 */
export type WarehouseReceiptStatusLog = yup.InferType<typeof warehouseReceiptStatusLogSchema> & {
    id: string; // UUID - auto-generated
    performedAt: Date; // auto-generated
};

/**
 * Helper function to validate data
 */
export const validateWarehouseReceiptStatusLog = async (
    data: unknown
): Promise<{ valid: boolean; errors?: Record<string, string> }> => {
    try {
        await warehouseReceiptStatusLogSchema.validate(data, { abortEarly: false });
        return { valid: true };
    } catch (error) {
        if (error instanceof yup.ValidationError) {
            const errors: Record<string, string> = {};
            error.inner.forEach((err) => {
                if (err.path) {
                    errors[err.path] = err.message;
                }
            });
            return { valid: false, errors };
        }
        return { valid: false, errors: { general: 'Validation failed' } };
    }
};
