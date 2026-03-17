import * as yup from 'yup';

export const addressInfoSchema = yup.object({
  provinceCode: yup.string().optional(),
  districtCode: yup.string().optional(),
  wardCode: yup.string().optional(),
  postalCode: yup.string().optional(),
  latitude: yup.number().optional(),
  longitude: yup.number().optional(),
});

export const orderDetailSchema = yup.object({
  productId: yup.string().required('Sản phẩm không được để trống').defined(),
  quantity: yup.number().min(1, 'Số lượng phải lớn hơn hoặc bằng 1').required('Số lượng không được để trống').defined(),
  unitPrice: yup.number().min(0, 'Đơn giá không được âm').required('Đơn giá không được để trống').defined(),
});

export const orderExpenseSchema = yup.object({
  name: yup.string().required('Tên chi phí không được để trống').defined(),
  amount: yup.number().min(0, 'Số tiền không được âm').required('Số tiền không được để trống').defined(),
  note: yup.string().optional(),
});

export const CreateOrderSchema = yup.object({
  customerId: yup.string().required('Khách hàng/Nhà cung cấp không được để trống').defined(),
  customerName: yup.string().optional(),
  customerPhone: yup.string().optional(),
  customerEmail: yup.string().optional(),
  customerAddress: yup.string().optional(),
  customerAddressInfo: addressInfoSchema.optional(),
  
  code: yup.string().optional(),
  note: yup.string().optional(),
  status: yup.string().optional(),
  orderType: yup.string().optional(),
  type: yup.string().oneOf(['sale', 'purchase']).optional(),
  
  // VAT Information
  vatRate: yup.number().optional(),
  taxCode: yup.string().optional(),
  companyName: yup.string().optional(),
  companyAddress: yup.string().optional(),
  vatEmail: yup.string().optional(),
  companyPhone: yup.string().optional(),
  
  // Receiver Information
  receiverName: yup.string().optional(),
  receiverPhone: yup.string().optional(),
  receiverAddress: yup.string().optional(),
  addressInfo: addressInfoSchema.optional(),
  
  // Payment
  paymentMethod: yup.string().required('Phương thức thanh toán không được để trống').defined(),
  initialPayment: yup.number().optional(),
  totalAmount: yup.number().required('Tổng tiền không được để trống').defined(),
  bank: yup.string().optional(),
  paymentDeadline: yup.string().optional(),
  
  // Order details
  details: yup.array().of(orderDetailSchema).min(1, 'Đơn hàng phải có ít nhất 1 sản phẩm').required('Chi tiết đơn hàng không được để trống').defined(),
  
  // Additional expenses
  expenses: yup.array().of(orderExpenseSchema).optional(),
  
  // Optional fields
  description: yup.string().optional(),
  tags: yup.array().of(yup.string().required('Giá trị nhãn không hợp lệ').defined()).optional(),
  isDeleted: yup.boolean().optional(),
  contractCode: yup.string().optional(),
  purchaseOrderNumber: yup.string().optional(),
});

export const UpdateOrderSchema = yup.object({
  customer_name: yup.string().optional(),
  customer_phone: yup.string().optional(),
  customer_address: yup.string().optional(),
  customer_addressInfo: addressInfoSchema.optional(),
  receiver_address: yup.string().optional(),
  receiver_addressInfo: addressInfoSchema.optional(),
  
  status: yup.string().optional(),
  order_type: yup.string().optional(),
  
  initialPayment: yup.number().optional(),
  paid_amount: yup.number().optional(),
  debt_amount: yup.number().optional(),
  debt_date: yup.string().optional(),
  
  note: yup.string().optional(),
  contract_code: yup.string().optional(),
  purchase_order_number: yup.string().optional(),
  tags: yup.array().of(yup.string().required('Giá trị nhãn không hợp lệ').defined()).optional(),
  
  // VAT company information
  taxCode: yup.string().optional(),
  companyName: yup.string().optional(),
  companyAddress: yup.string().optional(),
  vatEmail: yup.string().optional(),
  companyPhone: yup.string().optional(),
  
  expenses: yup.array().of(orderExpenseSchema).optional(),
  paymentDeadline: yup.string().optional(),
});

// Based on the user's initial structure, but completed
export const OrderSchema = yup.object({
  id: yup.string().required('ID không được để trống').defined(),
  code: yup.string().required('Mã đơn hàng không được để trống').defined(),
  type: yup.string().required('Loại đơn hàng không được để trống').defined(),
  contractCode: yup.string().optional(),
  note: yup.string().optional(),
  taxCode: yup.string().optional(),
  
  // customer info
  customerId: yup.string().optional(),
  customerName: yup.string().optional(),
  customerPhone: yup.string().optional(),
  customerEmail: yup.string().optional(),
  customerAddress: yup.string().optional(),

  // company info
  companyName: yup.string().optional(),
  companyAddress: yup.string().optional(),
  companyPhone: yup.string().optional(),
  vatEmail: yup.string().optional(),
  vatAmount: yup.number().optional(),
  
  // Summary/Totals
  totalAmount: yup.number().optional(),
  paidAmount: yup.number().optional(),
  debtAmount: yup.number().optional(),
  totalExpenses: yup.number().optional(),
  totalVatAmount: yup.number().optional(),
  
  status: yup.string().optional(),
  createdAt: yup.string().optional(),
  updatedAt: yup.string().optional(),
});

export type CreateOrderSchemaType = yup.InferType<typeof CreateOrderSchema>;
export type UpdateOrderSchemaType = yup.InferType<typeof UpdateOrderSchema>;
export type OrderSchemaType = yup.InferType<typeof OrderSchema>;
