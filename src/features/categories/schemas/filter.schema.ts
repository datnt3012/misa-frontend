import * as yup from 'yup';
import { paginationSchema } from '@/shared/schemas';

export const CategoriesFilterSchema = paginationSchema.concat(
  yup.object({
    isActive: yup.boolean().optional(),
  })
);

export type CategoriesFilterParams = yup.InferType<typeof CategoriesFilterSchema>;
