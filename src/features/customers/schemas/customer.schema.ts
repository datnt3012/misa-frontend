import { UserSchema } from '@/features/users';
import { phoneRegExp } from '@/shared/constants';
import { AddressInfoSchema } from '@/shared/schemas';
import * as yup from 'yup';

// --- Customer Schemas ---

export const CustomerVatInfoSchema = yup.object({
  taxCode: yup.string().nullable().optional(),
  companyName: yup.string().nullable().optional(),
  companyAddress: yup.string().nullable().optional(),
  vatEmail: yup.string().nullable().optional(),
  companyPhone: yup.string().nullable().optional(),
});

export const CustomerSchema = yup.object({
  id: yup.string().required(),
  code: yup.string().required(),
  name: yup.string().required(),
  phoneNumber: yup.string().nullable().optional(),
  email: yup.string().nullable().optional(),
  address: yup.string().nullable().optional(),
  vatInfo: CustomerVatInfoSchema.nullable().optional(),
  userId: yup.string().optional(),
  isSupplier: yup.boolean().optional(),
  isActive: yup.boolean().optional(),
  isDeleted: yup.boolean().optional(),
  createdAt: yup.string().optional(),
  updatedAt: yup.string().optional(),
  deletedAt: yup.string().nullable().optional(),
  user: UserSchema.nullable().optional(),
  addressInfo: AddressInfoSchema.nullable().optional(),
});

export const CreateCustomerSchema = yup.object({
  name: yup.string().trim().required('Tên khách hàng không được để trống'),
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
  vatInfo: CustomerVatInfoSchema.nullable().optional(),
  addressInfo: AddressInfoSchema.nullable().optional(),
});


export const UpdateCustomerSchema = CreateCustomerSchema.concat(
  yup.object({
    id: yup.string().required('ID không được để trống'),
  })
).noUnknown(true);


export type CustomerSchemaType = yup.InferType<typeof CustomerSchema>;
export type CreateCustomerSchemaType = yup.InferType<typeof CreateCustomerSchema>;
export type UpdateCustomerSchemaType = yup.InferType<typeof UpdateCustomerSchema>;
