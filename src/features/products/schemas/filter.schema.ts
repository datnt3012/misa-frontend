import * as yup from 'yup';
import { paginationSchema } from '@/shared/schemas';

export const ProductFilterSchema = paginationSchema.concat(
  yup.object({
    keyword: yup.string().optional(),
    categoryId: yup.mixed<string | string[]>().optional(),
    manufacturer: yup.mixed<string | string[]>().optional(),
    minPrice: yup.number().min(0).optional(),
    maxPrice: yup.number().min(0).optional(),
    isActive: yup.boolean().optional(),
  })
);

export type ProductFilterSchemaType = yup.InferType<typeof ProductFilterSchema>;
