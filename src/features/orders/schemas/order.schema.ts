import { CustomerSchema } from '@/features/customers/schemas';
import { AddressInfoSchema } from '@/shared/schemas';
import * as yup from 'yup';

// --- Creator Schema ---

export const CreatorSchema = yup.object({
  id: yup.string().required(),
  email: yup.string().email().nullable().optional(),
  firstName: yup.string().nullable().optional(),
  lastName: yup.string().nullable().optional(),
  phoneNumber: yup.string().nullable().optional(),
  avatarUrl: yup.string().nullable().optional(),
  username: yup.string().nullable().optional(),
});

// --- Product Schema ---

export const ProductSchema = yup.object({
  id: yup.string().required(),
  code: yup.string().required(),
  name: yup.string().required(),
  description: yup.string().nullable().optional(),
  category: yup.string().nullable().optional(),
  sku: yup.string().nullable().optional(),
  unit: yup.string().nullable().optional(),
  price: yup.number().optional(),
  costPrice: yup.number().optional(),
  barcode: yup.string().nullable().optional(),
  manufacturer: yup.string().nullable().optional(),
  lowStockThreshold: yup.number().optional(),
  isForeignCurrency: yup.boolean().optional(),
  exchangeRate: yup.mixed().nullable().optional(),
  isActive: yup.boolean().optional(),
  isDeleted: yup.boolean().optional(),
  createdAt: yup.string().optional(),
  updatedAt: yup.string().optional(),
  deletedAt: yup.string().nullable().optional(),
});

// --- Order Items/Details ---

export const OrderDetailSchema = yup.object({
  id: yup.string().optional(),
  quantity: yup.number().required('Số lượng không được để trống'),
  unitPrice: yup.number().required('Đơn giá không được để trống'),
  totalPrice: yup.number().optional(),
  vatPercentage: yup.number().optional(),
  vatTotalPrice: yup.number().optional(),
  product: ProductSchema.required(),
});

// --- Order Expense ---

export const OrderExpenseSchema = yup.object({
  name: yup.string().required('Tên chi phí không được để trống'),
  amount: yup.number().min(0, 'Số tiền không được âm').required('Số tiền không được để trống'),
  note: yup.string().optional(),
});

// --- Main Order Schema ---

export const OrderSchema = yup.object({
  id: yup.string().defined().required('ID không được để trống'),
  code: yup.string().defined().required('Mã đơn hàng không được để trống'),
  contractCode: yup.string().nullable().optional(),
  note: yup.string().nullable().optional(),
  taxCode: yup.string().nullable().optional(),
  companyName: yup.string().nullable().optional(),
  companyAddress: yup.string().nullable().optional(),
  vatEmail: yup.string().nullable().optional(),
  companyPhone: yup.string().nullable().optional(),
  vatAmount: yup.number().optional(),
  receiverName: yup.string().nullable().optional(),
  receiverPhone: yup.string().nullable().optional(),
  receiverAddress: yup.string().nullable().optional(),
  paymentMethod: yup.string().nullable().optional(),
  initialPayment: yup.number().optional(),
  totalAmount: yup.number().optional(),
  orderType: yup.string().oneOf(['sale', 'purchase']).optional(),
  type: yup.string().oneOf(['sale', 'purchase']).optional(),
  status: yup.object({
    code: yup.string().optional(),
    name: yup.string().optional(),
  }).optional(),
  tags: yup.array().of(yup.string()).optional(),
  isDeleted: yup.boolean().optional(),
  createdAt: yup.string().optional(),
  updatedAt: yup.string().optional(),
  deletedAt: yup.string().nullable().optional(),
  completedAt: yup.string().nullable().optional(),
  paymentDeadline: yup.string().nullable().optional(),
  expenses: yup.array().of(OrderExpenseSchema).optional(),
  customer: CustomerSchema.optional(),
  creator: CreatorSchema.optional(),
  details: yup.array().of(OrderDetailSchema).optional(),
  addressInfo: AddressInfoSchema.nullable().optional(),
  totalPaidAmount: yup.number().optional(),
  remainingDebt: yup.number().optional(),
  totalExpenses: yup.number().optional(),
  totalVatAmount: yup.number().optional(),
  totalVat: yup.number().optional(),
}).required();

// --- Types ---

export type OrderSchemaType = yup.InferType<typeof OrderSchema>;
export type OrderDetailSchemaType = yup.InferType<typeof OrderDetailSchema>;
export type ProductSchemaType = yup.InferType<typeof ProductSchema>;
export type CreatorSchemaType = yup.InferType<typeof CreatorSchema>;