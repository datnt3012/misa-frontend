import * as yup from 'yup';
import { PAYMENTS_METHOD } from '../constants';

export const PaymentSchema = yup.object({
  id: yup.string().required('ID không được để trống'),
  orderId: yup.string().required('ID đơn hàng không được để trống'),
  amount: yup
    .number()
    .typeError('Số tiền phải là số')
    .required()
    .min(0),
  paymentMethod: yup.string()
    .oneOf(Object.values(PAYMENTS_METHOD))
    .required(),
  paymentDate: yup
    .string()
    .required()
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'Ngày thanh toán không hợp lệ'),
  note: yup.string().optional().nullable(),
  filePaths: yup.array().of(yup.string()).nullable().optional(),
  bank: yup.string().optional().nullable(),
  createdBy: yup.string().optional(),
  createdAt: yup.string().optional(),
  updatedAt: yup.string().optional(),
  creatorProfile: yup.object({
    fullName: yup.string().optional().nullable(),
  }).optional().nullable(),
});
export type PaymentSchemaType = Omit<yup.InferType<typeof PaymentSchema>, 'id'> & { id: string };

export const createPaymentSchema = PaymentSchema
  .omit(['id', 'createdBy', 'createdAt', 'updatedAt', 'creatorProfile'])
  .required();
export type CreatePaymentSchemaType = yup.InferType<typeof createPaymentSchema>;

export const updatePaymentSchema = PaymentSchema
  .omit(['id', 'createdBy', 'createdAt', 'updatedAt', 'creatorProfile'])
  .partial()
  .noUnknown(true, 'Field không hợp lệ');
export type UpdatePaymentSchemaType = yup.InferType<typeof updatePaymentSchema>;


export const CreateMultiplePaymentSchema = PaymentSchema
  .omit(['id', 'orderId', 'createdBy', 'createdAt', 'updatedAt', 'creatorProfile'])
  .shape({
    orderIds: yup.array().of(yup.string()).required('ID đơn hàng không được để trống'),
    totalAmount: yup.number().required('Tổng số tiền không được để trống'),
    files: yup.array().optional(),
  })
  .required();
export type CreateMultiplePaymentSchemaType = yup.InferType<typeof CreateMultiplePaymentSchema>;
