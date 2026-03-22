import * as yup from 'yup';
import { paginationSchema } from '@/shared/schemas';

export const SuppliersFilterSchema = paginationSchema.concat(
  yup.object({
    // TODO: Add filter fields
  })
);

export type SuppliersFilterSchemaType = yup.InferType<typeof SuppliersFilterSchema>;
