import { uuidSchema } from '@/shared/schemas/validation.schema';
import * as yup from 'yup';
import { MovementType, ReferenceType } from '../constants';

/**
 * Yup Validation Schema for InventoryMovement
 */
export const inventoryMovementSchema = yup.object().shape({
    id: uuidSchema.optional(),
    productId: uuidSchema.required('Product ID is required'),
    warehouseId: uuidSchema.required('Warehouse ID is required'),

    movementType: yup
        .string()
        .oneOf(
            Object.values(MovementType),
            `Movement Type must be one of: ${Object.values(MovementType).join(', ')}`
        )
        .required('Movement Type is required'),

    quantity: yup.number().required('Quantity is required'),
    quantityBefore: yup.number().required('Quantity before is required'),
    quantityAfter: yup.number().required('Quantity after is required'),

    referenceType: yup
        .string()
        .oneOf(
            Object.values(ReferenceType),
            `Reference Type must be one of: ${Object.values(ReferenceType).join(', ')}`
        )
        .required('Reference Type is required'),

    referenceId: uuidSchema.required('Reference ID is required'),
    referenceCode: yup.string().required('Reference Code is required'),
    note: yup.string().optional().nullable(),
    createdBy: uuidSchema.required('Created by is required'),
    createdAt: yup.string().required('Created at is required'),
    product: yup.lazy(() => yup.object().shape({
        id: uuidSchema.required('Product ID is required'),
        name: yup.string().optional(),
        code: yup.string().optional(),
    })).optional(),
    warehouse: yup.lazy(() => yup.object().shape({
        id: uuidSchema.required('Warehouse ID is required'),
        name: yup.string().optional(),
        code: yup.string().optional(),
    })).optional(),

});

/**
 * TypeScript Type derived from Yup Schema
 */
export type InventoryMovement = yup.InferType<typeof inventoryMovementSchema>;

/**
 * Helper function to validate data
 */
export const validateInventoryMovement = async (
    data: unknown
): Promise<{ valid: boolean; errors?: Record<string, string> }> => {
    try {
        await inventoryMovementSchema.validate(data, { abortEarly: false });
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
