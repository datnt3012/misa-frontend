import * as yup from 'yup';
import { OrderExpenseSchema } from './order.schema';
import { phoneRegExp } from '@/shared/constants';
import { CreateCustomerSchema } from '@/features/customers/schemas';

/**
 * Payment Information Schema
 */
export const OrderPaymentSchema = yup.object({
    paymentMethod: yup.string()
        .oneOf(['cash', 'bank_transfer'], 'Phương thức thanh toán không hợp lệ')
        .required('Phương thức thanh toán không được để trống'),
    initialPayment: yup.number()
        .typeError('Số tiền trả trước phải là số')
        .min(0, 'Không được nhập số âm')
        .nullable()
        .optional(),
    totalAmount: yup.number()
        .typeError('Tổng tiền phải là số')
        .min(0, 'Tổng tiền không được âm')
        .required('Tổng tiền không được để trống'),
    // paidAmount: yup.number()
    //     .typeError('Số tiền đã trả phải là số')
    //     .min(0, 'Số tiền đã trả không được âm')
    //     .nullable()
    //     .optional(),
    // debtAmount: yup.number()
    //     .typeError('Số nợ phải là số')
    //     .min(0, 'Số nợ không được âm')
    //     .nullable()
    //     .optional(),
    bank: yup.string().trim().nullable().optional(),
    paymentDeadline: yup.string().trim().nullable().optional(),
});

/**
 * Individual Order Detail Item Schema
 */
export const OrderDetailItemSchema = yup.object({
    productId: yup.string().required('Sản phẩm không được để trống'),
    vatPercentage: yup.number()
        .typeError('Phần trăm VAT phải là số')
        .min(0)
        .max(100)
        .nullable()
        .optional(),
    quantity: yup.number()
        .typeError('Số lượng phải là số')
        .min(1, 'Số lượng tối thiểu là 1')
        .required('Số lượng là bắt buộc'),
    unitPrice: yup.number()
        .typeError('Đơn giá phải là số')
        .min(0, 'Đơn giá không được âm')
        .required('Đơn giá là bắt buộc'),
});

// --- Main Schemas ---

/**
 * Create Order Schema
 */
export const CreateOrderSchema = yup.object()
    .concat(OrderPaymentSchema)
    .concat(yup.object({
        customerId: yup.string().required('Khách hàng không được để trống'),
        customer: CreateCustomerSchema,
        // General Info
        contractCode: yup.string().trim().nullable().optional(),
        purchaseOrderNumber: yup.string().trim().nullable().optional(),
        note: yup.string().trim().nullable().optional(),

        status: yup.string()
            .oneOf(['new', 'confirmed', 'shipping', 'completed', 'cancelled'], 'Trạng thái không hợp lệ')
            .nullable()
            .optional(),
        type: yup.string()
            .oneOf(['sale', 'purchase'], 'Loại đơn hàng không hợp lệ')
            .required('Loại đơn hàng không được để trống'),

        // Receiver fields — chỉ required khi type = 'sale'
        receiverName: yup.string().trim().when('type', {
            is: 'sale',
            then: (s) => s.required('Tên người nhận không được để trống'),
            otherwise: (s) => s.nullable().optional(),
        }),
        receiverPhone: yup.string().trim().when('type', {
            is: 'sale',
            then: (s) => s.matches(phoneRegExp, 'Số điện thoại người nhận không hợp lệ').required('Số điện thoại người nhận không được để trống'),
            otherwise: (s) => s.nullable().optional(),
        }),
        receiverAddress: yup.string().trim().when('type', {
            is: 'sale',
            then: (s) => s.required('Địa chỉ người nhận không được để trống'),
            otherwise: (s) => s.nullable().optional(),
        }),
        addressInfo: yup.object({
            provinceCode: yup.number().nullable().optional(),
            wardCode: yup.number().nullable().optional(),
            postalCode: yup.string().nullable().optional(),
        }).nullable().optional(),

        // Details (Required + Min 1)
        details: yup.array()
            .of(OrderDetailItemSchema)
            .min(1, 'Đơn hàng phải có ít nhất 1 sản phẩm')
            .required('Chi tiết đơn hàng không được để trống'),

        // Expenses
        expenses: yup.array().of(OrderExpenseSchema).nullable().optional(),
    }))
// // Business Logic: paidAmount <= totalAmount
// .test('paid-check', 'Số tiền đã trả không thể lớn hơn giá trị đơn hàng', function (value) {
//     const { paidAmount, totalAmount } = value || {};
//     if (paidAmount != null && totalAmount != null) {
//         return paidAmount <= totalAmount;
//     }
//     return true;
// })
// // Business Logic: debtAmount = totalAmount - paidAmount
// .test('debt-check', 'Số nợ không khớp với tổng tiền và tiền đã trả', function (value) {
//     const { paidAmount = 0, totalAmount = 0, debtAmount } = value || {};
//     if (debtAmount != null) {
//         const expectedDebt = totalAmount - (paidAmount ?? 0);
//         return Math.abs(debtAmount - expectedDebt) < 0.01;
//     }
//     return true;
// });

/**
 * Update Order Schema
 */
export const UpdateOrderSchema = CreateOrderSchema.concat(
    yup.object({
        id: yup.string().required('ID đơn hàng là bắt buộc để cập nhật'),
        tags: yup.array().of(yup.string().trim()).nullable().optional(),
    })
).noUnknown(true);

// --- Types Inference ---

export type CreateOrderSchemaType = yup.InferType<typeof CreateOrderSchema>;
export type UpdateOrderSchemaType = yup.InferType<typeof UpdateOrderSchema>;