import * as yup from 'yup';
import { paginationSchema } from '@/shared/schemas';

export const ORDER_STATUSES = [
  'new', 'pending', 'picking', 'picked',
  'delivered', 'delivery_failed', 'completed', 'cancelled',
] as const;

export const ORDER_TYPES = [
  'sale', 'purchase',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderType = (typeof ORDER_TYPES)[number];

export const OrderFilterSchema = paginationSchema.concat(
  yup.object({
    status: yup.string().optional(),
    startDate: yup.string().optional(),
    endDate: yup.string().optional(),
    completedStartDate: yup.string().optional(),
    completedEndDate: yup.string().optional(),
    minTotalAmount: yup.number().min(0).optional(),
    maxTotalAmount: yup.number().min(0).optional(),
    createdBy: yup.mixed<string | string[]>().optional(),
    type: yup.string().oneOf(['sale', 'return', 'purchase']).optional(),
    categories: yup.mixed<string | string[]>().optional(),
    paymentMethods: yup.mixed<string | string[]>().optional(),
    manufacturers: yup.mixed<string | string[]>().optional(),
  })
);

export type OrderFilterSchemaType = yup.InferType<typeof OrderFilterSchema>;
