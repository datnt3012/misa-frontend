import * as yup from 'yup';
import { paginationSchema } from '@/shared/schemas';

export const CustomersFilterSchema = paginationSchema.concat(
  yup.object({
    // TODO: Add filter fields
  })
);

export type CustomersFilterSchemaType = yup.InferType<typeof CustomersFilterSchema>;
