import { paginationSchema } from '@/shared/schemas';
import * as yup from 'yup';
import { inventoryMovementSchema } from './inventory-movement.schema';

export const inventoryMovementFilter = paginationSchema.concat(
    inventoryMovementSchema.partial()
);

export type InventoryMovementFilterSchemaType = yup.InferType<typeof inventoryMovementFilter>;