import * as yup from 'yup';
import { paginationSchema } from '@/shared/schemas';

export const UserFilterSchema = paginationSchema.concat(yup.object({
    roleId: yup.string().optional(),
    isActive: yup.boolean().optional(),
    isDeleted: yup.boolean().optional(),
    includeDeleted: yup.boolean().optional(),
}));

export type UserFilterParams = yup.InferType<typeof UserFilterSchema>;
