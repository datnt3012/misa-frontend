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
        label: "Tìm kiếm",
        name: "keyword",
        type: "text",
        placeholder: "Tìm kiếm...",
        colSpan: 3,
        colSpanMd: 3,
    },
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
        colSpan: 3,
        colSpanMd: 3,
    },
    {
        label: "Trạng thái",
        name: "status",
        type: "autocomplete",
        placeholder: "Tất cả",
        multiple: true,
        options: ORDER_STATUSES.map((status) => ({ value: status, label: status })),
        colSpan: 3,
        colSpanMd: 3,
    },
    // {
    //     label: "Loại đơn hàng",
    //     name: "type",
    //     type: "select",
    //     placeholder: "Tất cả",
    //     options: [
    //         { value: "sale", label: "Bán hàng" },
    //         { value: "return", label: "Trả hàng" },
    //         { value: "purchase", label: "Mua hàng" },
    //     ],
    //     colSpan: 1,
    // },
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
        label: "Dòng sản phẩm/Danh mục",
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