import * as yup from 'yup';

export const WarehouseReceiptFilterSchema = yup.object({
    includeDeleted: yup.boolean(),

    isDeleted: yup.boolean(),

    warehouseId: yup.string(),

    supplierId: yup
        .string()
        .uuid('Supplier ID không hợp lệ'),

    orderId: yup
        .string()
        .uuid('Order ID không hợp lệ'),

    status: yup.string(),

    type: yup.string(),

    startDate: yup
        .string()
        .test('is-date', 'startDate không hợp lệ', (val) => {
            if (!val) return true;
            return !isNaN(Date.parse(val));
        }),

    endDate: yup
        .string()
        .test('is-date', 'endDate không hợp lệ', (val) => {
            if (!val) return true;
            return !isNaN(Date.parse(val));
        }),

    completedStartDate: yup
        .string()
        .test('is-date', 'completedStartDate không hợp lệ', (val) => {
            if (!val) return true;
            return !isNaN(Date.parse(val));
        }),

    completedEndDate: yup
        .string()
        .test('is-date', 'completedEndDate không hợp lệ', (val) => {
            if (!val) return true;
            return !isNaN(Date.parse(val));
        }),

    categories: yup
        .array()
        .of(yup.string().uuid('Category ID không hợp lệ')),

    manufacturers: yup.string(),

    sortBy: yup
        .mixed<
            | 'code'
            | 'status'
            | 'type'
            | 'totalAmount'
            | 'createdAt'
            | 'updatedAt'
            | 'orderCode'
            | 'customerName'
            | 'warehouse'
            | 'supplier'
        >()
        .oneOf([
            'code',
            'status',
            'type',
            'totalAmount',
            'createdAt',
            'updatedAt',
            'orderCode',
            'customerName',
            'warehouse',
            'supplier',
        ]),

    sortOrder: yup
        .mixed<'ASC' | 'DESC'>()
        .oneOf(['ASC', 'DESC']),
});

export type WarehouseReceiptFilterSchemaType = yup.InferType<typeof WarehouseReceiptFilterSchema>;