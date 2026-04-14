import { paginationSchema } from '@/shared/schemas';
import * as yup from 'yup';
import { warehouseReceiptStatusLogSchema } from './status-log.schema';

export const inventoryLogFilter = paginationSchema.concat(
    warehouseReceiptStatusLogSchema
        .omit(['receiptType', 'warehouseId']).required()
);

export type InventoryLogFilterSchemaType = yup.InferType<typeof inventoryLogFilter>;