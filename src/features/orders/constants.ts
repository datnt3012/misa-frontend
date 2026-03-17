import { GenericFormFieldConfig } from "@/shared/config";
import { ORDER_STATUSES, OrderFilterParams } from "./schemas";

export type FilterOrderFieldConfig = GenericFormFieldConfig<OrderFilterParams>;

export const filterOrderConfig: FilterOrderFieldConfig[] = [
    {
        label: "Trạng thái",
        name: "status",
        type: "select",
        placeholder: "Tất cả",
        options: ORDER_STATUSES.map((status) => ({ value: status, label: status })),
        colSpan: 1,
    },
    {
        label: "Loại đơn hàng",
        name: "type",
        type: "select",
        placeholder: "Tất cả",
        options: [
            { value: "sale", label: "Bán hàng" },
            { value: "return", label: "Trả hàng" },
            { value: "purchase", label: "Mua hàng" },
        ],
        colSpan: 1,
    },
    {
        label: "Dòng sản phẩm/Danh mục",
        name: "categories",
        type: "autocomplete",
        placeholder: "Tất cả",
        colSpan: 1,
    },
    {
        label: "Ngày tạo",
        name: "startDate",
        type: "dateRange",
        minField: "startDate",
        maxField: "endDate",
        colSpan: 2,
    },
    {
        label: "Khoảng giá",
        name: "minTotalAmount",
        type: "numberRange",
        minField: "minTotalAmount",
        maxField: "maxTotalAmount",
        colSpan: 2,
    },
    {
        label: "Người tạo",
        name: "createdBy",
        type: "autocomplete",
        placeholder: "Chọn người tạo...",
        colSpan: 1,
    },
    {
        label: "Ngày hoàn thành",
        name: "completedStartDate",
        type: "dateRange",
        minField: "completedStartDate",
        maxField: "completedEndDate",
        colSpan: 2,
    },
    {
        label: "Phương thức thanh toán",
        name: "paymentMethods",
        type: "select",
        placeholder: "Tất cả",
        options: [
            { value: "cash", label: "Tiền mặt" },
            { value: "credit_card", label: "Thẻ tín dụng" },
            { value: "bank_transfer", label: "Chuyển khoản" },
        ],
        colSpan: 1,
    },
    {
        label: "Nhà sản xuất",
        name: "manufacturers",
        type: "autocomplete",
        placeholder: "Chọn nhà sản xuất...",
        colSpan: 1,
    },
] as const;