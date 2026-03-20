import { GenericFormFieldConfig } from "@/shared/config";
import { ORDER_STATUSES, OrderFilterSchemaType } from "./schemas";
import { useCategoriesQuery } from "../categories/hooks";
import { useUserList } from "../users";
import { useManufacturers } from "../products";

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