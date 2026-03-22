import * as yup from 'yup';

export const orderItemSchema = yup.object({
    id: yup.string().required('ID không được để trống').defined(),
    orderId: yup.string().required('Mã đơn hàng không được để trống').defined(),
    productId: yup.string().required('Mã sản phẩm không được để trống').defined(),
    productName: yup.string().required('Tên sản phẩm không được để trống').defined(),
    productCode: yup.string().required('Mã sản phẩm không được để trống').defined(),
    quantity: yup.number().min(1, 'Số lượng phải lớn hơn hoặc bằng 1').defined(),
    unitPrice: yup.number().min(0, 'Đơn giá không được âm').defined(),
    vatPercentage: yup.number().min(0, 'Thuế VAT không được âm').defined(),
    createdAt: yup.string().optional(),
    updatedAt: yup.string().optional(),
})

export const createOrderItemSchema = yup.object({
    // orderId: yup.string().required('Mã đơn hàng không được để trống').defined(),
    productId: yup.string().required('Mã sản phẩm không được để trống').defined(),
    productName: yup.string().required('Tên sản phẩm không được để trống').defined(),
    productCode: yup.string().required('Mã sản phẩm không được để trống').defined(),
    quantity: yup.number().min(1, 'Số lượng phải lớn hơn hoặc bằng 1').defined(),
    unitPrice: yup.number().min(0, 'Đơn giá không được âm').defined(),
    vatPercentage: yup.number().min(0, 'Thuế VAT không được âm').defined(),
})

export const updateOrderItemSchema = createOrderItemSchema.partial()

export type OrderItemSchemaType = yup.InferType<typeof orderItemSchema>;
export type CreateOrderItemSchemaType = yup.InferType<typeof createOrderItemSchema>;
export type UpdateOrderItemSchemaType = yup.InferType<typeof updateOrderItemSchema>;
