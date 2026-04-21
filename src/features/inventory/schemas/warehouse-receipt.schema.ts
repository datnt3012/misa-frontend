import * as yup from 'yup';
import { ReceiptStatus, WarehouseReceiptType } from '../constants';

export const WarehouseReceiptDetailSchema = yup.object().shape({
    warehouseReceiptId: yup
        .string()
        .uuid('warehouseReceiptId không hợp lệ')
        .required('Phiếu kho là bắt buộc'),

    productId: yup
        .string()
        .uuid('productId không hợp lệ')
        .required('Sản phẩm là bắt buộc'),

    quantity: yup
        .number()
        .integer('Số lượng phải là số nguyên')
        .min(1, 'Số lượng phải lớn hơn 0')
        .required('Số lượng là bắt buộc'),

    unitPrice: yup
        .number()
        .min(0, 'Đơn giá không được âm')
        .required('Đơn giá là bắt buộc'),

    totalPrice: yup
        .number()
        .min(0, 'Thành tiền không được âm')
        .required('Thành tiền là bắt buộc'),

    vatTotalPrice: yup
        .number()
        .min(0, 'VAT không hợp lệ')
        .nullable(),

    purchasePrice: yup
        .number()
        .min(0, 'Giá nhập không được âm')
        .required('Giá nhập là bắt buộc'),

    salePrice: yup
        .number()
        .min(0, 'Giá bán không được âm')
        .required('Giá bán là bắt buộc'),

    vatPercentage: yup
        .number()
        .min(0, 'VAT % không hợp lệ')
        .max(100, 'VAT % không vượt quá 100')
        .nullable(),
});

export type WarehouseReceiptDetailSchemaType = yup.InferType<typeof WarehouseReceiptDetailSchema> & {
    id: string;
    createdAt: string;
    updatedAt: string;
}

export const WareHouseReceiptSchema = yup.object().shape({
    code: yup
        .string()
        .max(25, 'Mã phiếu tối đa 25 ký tự')
        .required('Mã phiếu nhập kho là bắt buộc'),

    warehouseId: yup
        .string()
        .uuid('warehouseId không hợp lệ')
        .required('Kho là bắt buộc'),

    movingReceiptId: yup
        .string()
        .uuid('movingReceiptId không hợp lệ')
        .nullable(),

    supplierId: yup
        .string()
        .uuid('supplierId không hợp lệ')
        .required('Nhà cung cấp là bắt buộc'),

    orderId: yup
        .string()
        .uuid('orderId không hợp lệ')
        .required('Đơn hàng là bắt buộc'),

    createdBy: yup
        .string()
        .uuid('createdBy không hợp lệ')
        .required('Người tạo là bắt buộc'),

    type: yup
        .string()
        .oneOf(Object.values(WarehouseReceiptType))
        .required('Loại phiếu nhập kho là bắt buộc'),

    status: yup
        .string()
        .oneOf(Object.values(ReceiptStatus))
        .required('Trạng thái phiếu nhập kho là bắt buộc'),

    description: yup
        .string()
        .max(1000, 'Mô tả tối đa 1000 ký tự')
        .nullable(),

    totalAmount: yup
        .number()
        .min(0, 'Tổng tiền không được âm')
        .required('Tổng tiền là bắt buộc'),

    isForeignCurrency: yup
        .boolean()
        .required(),

    exchangeRate: yup
        .number()
        .min(0, 'Tỷ giá phải >= 0')
        .nullable()
        .when('isForeignCurrency', {
            is: true,
            then: (schema) =>
                schema.required('Tỷ giá là bắt buộc khi dùng ngoại tệ'),
            otherwise: (schema) => schema.nullable(),
        }),

    completedAt: yup
        .date()
        .nullable(),

    details: yup
        .array()
        .of(WarehouseReceiptDetailSchema)
        .min(1, 'Phiếu kho phải có ít nhất 1 chi tiết')
        .required('Chi tiết phiếu kho là bắt buộc'),
});

export type WareHouseReceiptSchemaType = yup.InferType<typeof WareHouseReceiptSchema> & {
    id: string;
    createdAt: string;
    updatedAt: string;
};