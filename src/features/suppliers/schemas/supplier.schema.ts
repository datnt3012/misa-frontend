import { phoneRegExp } from '@/shared/constants';
import { AddressInfoSchema } from '@/shared/schemas';
import * as yup from 'yup';

export const SupplierSchema = yup.object({
  id: yup.string().required(),
  code: yup.string().required(),
  name: yup.string().required(),
  contact_phone: yup.string().required(),
  email: yup.string().optional(),
  address: yup.string().optional(),
  addressInfo: AddressInfoSchema.optional(),
  isDeleted: yup.boolean().optional(),
  createdAt: yup.string().optional(),
  updatedAt: yup.string().optional(),
});

export const CreateSupplierSchema = yup.object({
  name: yup.string().trim().required('Tên nhà cung cấp không được để trống'),
  email: yup.string()
    .trim()
    .email('Email không hợp lệ')
    .nullable()
    .optional(),
  phoneNumber: yup.string()
    .trim()
    .matches(phoneRegExp, 'Số điện thoại không hợp lệ (9-11 số)')
    .nullable()
    .optional(),
  address: yup.string().trim().nullable().optional(),
  addressInfo: AddressInfoSchema.nullable().optional(),
});

export const UpdateSupplierSchema = CreateSupplierSchema.concat(
  yup.object({
    id: yup.string().required('ID không được để trống'),
  })
).noUnknown(true);

export type SupplierSchemaType = yup.InferType<typeof SupplierSchema>;
export type CreateSupplierSchemaType = yup.InferType<typeof CreateSupplierSchema>;
export type UpdateSupplierSchemaType = yup.InferType<typeof UpdateSupplierSchema>;