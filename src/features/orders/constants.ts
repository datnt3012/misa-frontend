import { CreateCustomerSchemaType } from '@/features/customers/schemas';
import { GenericFormFieldConfig } from "@/shared/config";
import { CreateOrderSchemaType, ORDER_STATUSES, OrderFilterSchemaType } from "./schemas";
import { useCategoriesQuery } from "../categories/hooks";
import { useUserList } from "../users";
import { useManufacturers } from "../products";
import { useCustomerListQuery } from "../customers/hooks";
import { useSupplierListQuery } from "../suppliers/hooks";
import { useProvincesQuery, useWardsQuery } from "../administrative/hooks/useAdministrativeQuery";

export type FilterOrderFieldConfig = GenericFormFieldConfig<OrderFilterSchemaType>;

export const filterOrderConfig: FilterOrderFieldConfig[] = [
    {
        label: "Người tạo",
        name: "createdBy",
        type: "autocomplete",
        placeholder: "Tất cả",
        fetchOptions: () => {
            const { data, isLoading, isFetching } = useUserList({});
            return {
                data: data?.data?.rows?.map(user => ({
                    value: user.id,
                    label: user.username
                })) ?? [],
                isLoading,
                isFetching,
            };
        },
        multiple: true,
        colSpan: 6,
        colSpanMd: 6,
    },
    {
        label: "Trạng thái",
        name: "status",
        type: "autocomplete",
        placeholder: "Tất cả",
        multiple: true,
        options: ORDER_STATUSES.map((status) => ({ value: status, label: status })),
        colSpan: 6,
        colSpanMd: 6,
    },

    {
        label: "Phương thức thanh toán",
        name: "paymentMethods",
        type: "autocomplete",
        placeholder: "Tất cả",
        multiple: true,
        options: [
            { value: "cash", label: "Tiền mặt" },
            { value: "credit_card", label: "Thẻ tín dụng" },
            { value: "bank_transfer", label: "Chuyển khoản" },
        ],
        colSpan: 6,
        colSpanMd: 6,
    },
    {
        label: "Nhà sản xuất",
        name: "manufacturers",
        type: "autocomplete",
        placeholder: "Chọn nhà sản xuất...",
        multiple: true,
        fetchOptions: () => {
            const { data, isLoading, isFetching } = useManufacturers();
            return {
                data: data?.data?.map(manufacturer => ({
                    value: manufacturer,
                    label: manufacturer
                })) ?? [],
                isLoading,
                isFetching,
            };
        },
        colSpan: 6,
        colSpanMd: 6,
    },
    {
        label: "Hãng sản xuất",
        name: "categories",
        type: "autocomplete",
        placeholder: "Tất cả",
        multiple: true,
        fetchOptions: () => {
            const { data, isLoading, isFetching } = useCategoriesQuery();
            return {
                data: data?.data?.rows?.map(category => ({
                    value: category.id,
                    label: category.name
                })) ?? [],
                isLoading,
                isFetching,
            };
        },
        colSpan: 6,
        colSpanMd: 6,
    },
    {
        label: "Ngày tạo",
        name: "startDate",
        type: "dateRange",
        minField: "startDate",
        maxField: "endDate",
        colSpan: 6,
        colSpanMd: 6,
    },
    {
        label: "Khoảng giá",
        name: "minTotalAmount",
        type: "numberRange",
        minField: "minTotalAmount",
        maxField: "maxTotalAmount",
        colSpan: 6,
        colSpanMd: 6,
    },
    {
        label: "Ngày hoàn thành",
        name: "completedStartDate",
        type: "dateRange",
        minField: "completedStartDate",
        maxField: "completedEndDate",
        colSpan: 6,
        colSpanMd: 6,
    },
] as const;

// Field configs
export const customerBaseFields: GenericFormFieldConfig<CreateOrderSchemaType>[] = [
    {
        name: "customerId", label: "Khách hàng", type: "autocomplete", required: true, colSpan: 6,
        fetchOptions: () => {
            const customerQuery = useCustomerListQuery();
            return {
                data: [
                    { value: '__new__', label: 'Thêm mới khách hàng' },
                    ...(customerQuery.data?.data.rows.map(customer => ({
                        value: customer.id ?? '',
                        label: customer.name && customer.code ? `${customer.name} (${customer.code})` : '',
                        data: customer,
                    })) ?? [])
                ],
                isLoading: customerQuery.isLoading,
                isFetching: customerQuery.isFetching,
            };
        },
        onChange: (value, setValue, data: CreateCustomerSchemaType) => {
            if (data && value !== '__new__') {
                setValue("customer", data);
            }
        },
    },
    { name: "customer.name", label: "Tên khách hàng", type: "text", placeholder: "Tên khách hàng", required: true, colSpan: 6 },
    { name: "customer.phoneNumber", label: "Số điện thoại", type: "text", placeholder: "09xx xxx xxx", colSpan: 6 },
    { name: "customer.email", label: "Email", type: "text", placeholder: "example@gmail.com", colSpan: 6 },
];


export const supplierBaseFields: GenericFormFieldConfig<CreateOrderSchemaType>[] = [
    {
        name: "customerId", label: "Nhà cung cấp", type: "autocomplete", required: true, colSpan: 6,
        fetchOptions: () => {
            const supplierQuery = useSupplierListQuery();
            return {
                data: [
                    { value: '__new__', label: 'Thêm mới nhà cung cấp' },
                    ...(supplierQuery.data?.data.rows.map(supplier => ({
                        value: supplier.id ?? '',
                        label: supplier.name ?? '',
                        data: supplier,
                    })) ?? [])
                ],
                isLoading: supplierQuery.isLoading,
                isFetching: supplierQuery.isFetching,
            };
        },
        onChange: (value, setValue, data: CreateCustomerSchemaType) => {
            if (data && value !== '__new__') {
                setValue("customer", data);
            }
        },
    },
    { name: "customer.name", label: "Tên nhà cung cấp", type: "text", placeholder: "Tên nhà cung cấp", required: true, colSpan: 6 },
    { name: "customer.phoneNumber", label: "Số điện thoại", type: "text", placeholder: "09xx xxx xxx", colSpan: 6 },
    { name: "customer.email", label: "Email", type: "text", placeholder: "example@gmail.com", colSpan: 6 },
    {
        name: "addressInfo.provinceCode",
        label: "Tỉnh/Thành phố",
        type: "autocomplete",
        required: true,
        fetchOptions: () => {
            const { data, isLoading, isFetching } = useProvincesQuery();
            return {
                data: data?.data.rows.map(province => ({
                    value: province.code ?? '',
                    label: province.name ?? '',
                })) ?? [],
                isLoading,
                isFetching,
            };
        },
        colSpan: 6
    },
    {
        name: "addressInfo.wardCode",
        label: "Phường/Xã",
        type: "autocomplete",
        required: true,
        fetchOptions: (watch) => {
            const provinceCode = watch('addressInfo.provinceCode') as string | undefined;
            const { data, isLoading, isFetching } = useWardsQuery(provinceCode);
            return {
                data: data?.data.rows.map(ward => ({
                    value: ward.code ?? '',
                    label: ward.name ?? '',
                })) ?? [
                        {
                            value: '',
                            label: 'Chọn tỉnh/thành phố trước',
                        }
                    ],
                isLoading,
                isFetching,
            };
        },
        colSpan: 6
    },
    { name: "receiverAddress", label: "Địa chỉ chi tiết", type: "textarea", placeholder: "Nhập địa chỉ chi tiết giao hàng", required: true, colSpan: 12 },

];

export const vatFields: GenericFormFieldConfig<CreateOrderSchemaType>[] = [
    { name: "customer.vatInfo.taxCode", label: "Mã số thuế", type: "text", placeholder: "Mã số thuế doanh nghiệp", colSpan: 6 },
    { name: "customer.vatInfo.vatEmail", label: "Email nhận hóa đơn VAT", type: "text", placeholder: "email@domain.com", colSpan: 6 },
    { name: "customer.vatInfo.companyName", label: "Tên công ty", type: "text", placeholder: "Tên đầy đủ trên hóa đơn", colSpan: 12 },
    { name: "customer.vatInfo.companyPhone", label: "Điện thoại công ty", type: "text", placeholder: "Số điện thoại công ty", colSpan: 6 },
    { name: "customer.vatInfo.companyAddress", label: "Địa chỉ công ty", type: "text", placeholder: "Địa chỉ công ty", colSpan: 6 },
];

export const contractFields: GenericFormFieldConfig<CreateOrderSchemaType>[] = [
    { name: "contractCode", label: "Mã hợp đồng", type: "text", placeholder: "Nhập mã hợp đồng", colSpan: 12 },
    { name: "note", label: "Ghi chú", type: "textarea", placeholder: "Ghi chú đơn hàng...", colSpan: 12 },
];

export const PAYMENT_METHOD_OPTIONS = [
    { value: "cash", label: "Tiền mặt" },
    { value: "bank_transfer", label: "Chuyển khoản" },
];

export const ORDER_DETAIL_DEFAULT = {
    productId: "",
    quantity: 1,
    unitPrice: 0,
    vatPercentage: 0,
};

export const ORDER_EXPENSE_DEFAULT = {
    name: "",
    amount: 0,
    note: "",
};

export const receiverFields: GenericFormFieldConfig<CreateOrderSchemaType>[] = [
    { name: "receiverName", label: "Người nhận", type: "text", placeholder: "Nhập tên người nhận", required: true, colSpan: 6 },
    { name: "receiverPhone", label: "SĐT người nhận", type: "text", placeholder: "Nhập số điện thoại người nhận", required: true, colSpan: 6 },
    {
        name: "addressInfo.provinceCode",
        label: "Tỉnh/Thành phố",
        type: "autocomplete",
        required: true,
        fetchOptions: () => {
            const { data, isLoading, isFetching } = useProvincesQuery();
            return {
                data: data?.data.rows.map(province => ({
                    value: province.code ?? '',
                    label: province.name ?? '',
                })) ?? [],
                isLoading,
                isFetching,
            };
        },
        colSpan: 6
    },
    {
        name: "addressInfo.wardCode",
        label: "Phường/Xã",
        type: "autocomplete",
        required: true,
        fetchOptions: (watch) => {
            const provinceCode = watch('addressInfo.provinceCode') as string | undefined;
            const { data, isLoading, isFetching } = useWardsQuery(provinceCode);
            return {
                data: data?.data.rows.map(ward => ({
                    value: ward.code ?? '',
                    label: ward.name ?? '',
                })) ?? [
                        {
                            value: '',
                            label: 'Chọn tỉnh/thành phố trước',
                        }
                    ],
                isLoading,
                isFetching,
            };
        },
        colSpan: 6
    },
    { name: "receiverAddress", label: "Địa chỉ chi tiết giao hàng", type: "textarea", placeholder: "Nhập địa chỉ chi tiết giao hàng", required: true, colSpan: 12 },
];

// Order table column metadata
export const ORDER_TABLE_COLUMN_METADATA = {
  orderCode: { key: 'orderCode', label: 'Mã đơn hàng', grouped: true, width: 230 },
  contractCode: { key: 'contractCode', label: 'Mã số hợp đồng', grouped: true, width: 140 },
  partner: { key: 'partner', grouped: true, width: 220 },
  product: { key: 'product', label: 'Sản phẩm', grouped: false, width: 250 },
  category: { key: 'category', label: 'Hãng sản xuất', grouped: false, width: 200 },
  unitPrice: { key: 'unitPrice', label: 'Đơn giá', grouped: false, width: 130, type: 'number' as const },
  quantity: { key: 'quantity', label: 'Số lượng', grouped: false, width: 100, type: 'number' as const },
  vat: { key: 'vat', label: 'Thuế suất', grouped: false, width: 100, type: 'number' as const },
  expenses: { key: 'expenses', label: 'Chi phí', grouped: true, width: 130, type: 'number' as const },
  totalOrderValueExcludingVAT: { key: 'totalOrderValueExcludingVAT', label: 'Tổng giá trị chưa có thuế GTGT', grouped: true, width: 150, type: 'number' as const },
  totalVatValue: { key: 'totalVatValue', label: 'Tổng tiền thuế GTGT', grouped: true, width: 120, type: 'number' as const },
  totalOrderValue: { key: 'totalOrderValue', label: 'Tổng giá trị có thuế GTGT', grouped: true, width: 150, type: 'number' as const },
  paid: { key: 'paid', label: 'Thanh toán', grouped: true, width: 160, type: 'number' as const },
  status: { key: 'status', label: 'Trạng thái', width: 160, grouped: true },
  completedAt: { key: 'completedAt', label: 'Ngày hoàn thành', grouped: true, width: 140 },
  creator: { key: 'creator', label: 'Người tạo đơn', grouped: true, width: 150 },
  note: { key: 'note', label: 'Ghi chú', width: 300, cellClassName: 'relative p-0 h-16', grouped: true },
  actions: { key: 'actions', label: 'Thao tác', width: 60, grouped: true },
} as const;