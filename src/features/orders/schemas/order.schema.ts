import * as yup from 'yup';

// --- Shared/Location Schemas ---

export const LocationSchema = yup.object({
  code: yup.string().nullable().optional(),
  name: yup.string().nullable().optional(),
  level: yup.string().nullable().optional(),
  parentCode: yup.string().nullable().optional(),
  divisionType: yup.string().nullable().optional(),
  type: yup.string().nullable().optional(),
  codename: yup.string().nullable().optional(),
  isDeleted: yup.boolean().optional(),
  createdAt: yup.string().nullable().optional(),
  updatedAt: yup.string().nullable().optional(),
  deletedAt: yup.string().nullable().optional(),
});

export const AddressInfoSchema = yup.object({
  id: yup.string().optional(),
  entityType: yup.string().optional(),
  entityId: yup.string().optional(),
  provinceCode: yup.mixed().nullable().optional(),
  districtCode: yup.mixed().nullable().optional(),
  wardCode: yup.mixed().nullable().optional(),
  postalCode: yup.string().nullable().optional(),
  latitude: yup.number().nullable().optional(),
  longitude: yup.number().nullable().optional(),
  isDeleted: yup.boolean().optional(),
  createdAt: yup.string().nullable().optional(),
  updatedAt: yup.string().nullable().optional(),
  deletedAt: yup.string().nullable().optional(),
  province: LocationSchema.nullable().optional(),
  district: LocationSchema.nullable().optional(),
  ward: LocationSchema.nullable().optional(),
});

// --- Customer Schemas ---

export const CustomerVatInfoSchema = yup.object({
  taxCode: yup.string().nullable().optional(),
});

export const CustomerSchema = yup.object({
  id: yup.string().required(),
  code: yup.string().required(),
  name: yup.string().required(),
  phoneNumber: yup.string().nullable().optional(),
  email: yup.string().nullable().optional(),
  address: yup.string().nullable().optional(),
  addressDetail: yup.string().nullable().optional(),
  vatInfo: CustomerVatInfoSchema.nullable().optional(),
  userId: yup.string().optional(),
  isActive: yup.boolean().optional(),
  isDeleted: yup.boolean().optional(),
  createdAt: yup.string().optional(),
  updatedAt: yup.string().optional(),
  deletedAt: yup.string().nullable().optional(),
});

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

// --- Creation and Update Schemas ---

export const CreateOrderSchema = yup.object({
  customerId: yup.string().required('Khách hàng/Nhà cung cấp không được để trống').defined(),
  customerName: yup.string().optional(),
  customerPhone: yup.string().optional(),
  customerEmail: yup.string().optional(),
  customerAddress: yup.string().optional(),
  customerAddressInfo: yup.object({
    provinceCode: yup.string().optional(),
    districtCode: yup.string().optional(),
    wardCode: yup.string().optional(),
  }).optional(),

  code: yup.string().optional(),
  note: yup.string().optional(),
  status: yup.string().optional(),
  type: yup.string().oneOf(['sale', 'purchase']).optional(),

  // VAT Information
  taxCode: yup.string().optional(),
  companyName: yup.string().optional(),
  companyAddress: yup.string().optional(),
  vatEmail: yup.string().optional(),
  companyPhone: yup.string().optional(),

  // Receiver Information
  receiverName: yup.string().optional(),
  receiverPhone: yup.string().optional(),
  receiverAddress: yup.string().optional(),
  addressInfo: yup.object({
    provinceCode: yup.string().optional(),
    districtCode: yup.string().optional(),
    wardCode: yup.string().optional(),
  }).optional(),

  // Payment
  paymentMethod: yup.string().required('Phương thức thanh toán không được để trống').defined(),
  initialPayment: yup.number().optional(),
  totalAmount: yup.number().required('Tổng tiền không được để trống').defined(),
  paymentDeadline: yup.string().optional(),

  // Order details
  details: yup.array().of(
    yup.object({
      productId: yup.string().required('Sản phẩm không được để trống').defined(),
      quantity: yup.number().min(1, 'Số lượng phải lớn hơn hoặc bằng 1').required('Số lượng không được để trống').defined(),
      unitPrice: yup.number().min(0, 'Đơn giá không được âm').required('Đơn giá không được để trống').defined(),
    })
  ).min(1, 'Đơn hàng phải có ít nhất 1 sản phẩm').required('Chi tiết đơn hàng không được để trống').defined(),

  // Additional expenses
  expenses: yup.array().of(OrderExpenseSchema).optional(),

  tags: yup.array().of(yup.string()).optional(),
  contractCode: yup.string().optional(),
});

export const UpdateOrderSchema = yup.object({
  status: yup.string().optional(),
  note: yup.string().optional(),
  initialPayment: yup.number().optional(),
  paidAmount: yup.number().optional(),
  debtAmount: yup.number().optional(),
  paymentDeadline: yup.string().optional(),
  tags: yup.array().of(yup.string()).optional(),
  expenses: yup.array().of(OrderExpenseSchema).optional(),
});

// --- Types ---

export type CreateOrderSchemaType = yup.InferType<typeof CreateOrderSchema>;
export type UpdateOrderSchemaType = yup.InferType<typeof UpdateOrderSchema>;
export type OrderSchemaType = yup.InferType<typeof OrderSchema>;
export type OrderDetailSchemaType = yup.InferType<typeof OrderDetailSchema>;
export type ProductSchemaType = yup.InferType<typeof ProductSchema>;
export type CustomerSchemaType = yup.InferType<typeof CustomerSchema>;
export type CreatorSchemaType = yup.InferType<typeof CreatorSchema>;
export type AddressInfoSchemaType = yup.InferType<typeof AddressInfoSchema>;
