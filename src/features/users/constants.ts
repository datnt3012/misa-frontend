import { GenericFormFieldConfig } from "@/shared/config";
import { UserFilterParams } from "./schemas";
import { useUserList } from "./hooks";

export type FilterUserFieldConfig = GenericFormFieldConfig<UserFilterParams>;

export const filterUserConfig: FilterUserFieldConfig[] = [
    {
        label: "Tìm kiếm",
        name: "keyword",
        type: "text",
        placeholder: "Tìm kiếm theo tên, email...",
        colSpan: 4,
        colSpanMd: 4,
    },
    {
        label: "Vai trò",
        name: "roleId",
        type: "select",
        placeholder: "Tất cả vai trò",
        options: [], // Will be populated dynamically or via another hook
        colSpan: 4,
        colSpanMd: 4,
    },
    {
        label: "Trạng thái",
        name: "isActive",
        type: "select",
        placeholder: "Tất cả",
        options: [
            { value: "true", label: "Đang hoạt động" },
            { value: "false", label: "Ngừng hoạt động" },
        ],
        colSpan: 4,
        colSpanMd: 4,
    },
];

// Example of fetchOptions usage if needed
export const userSelectConfig: FilterUserFieldConfig = {
    label: "Người dùng",
    name: "keyword", // or specific field
    type: "autocomplete",
    placeholder: "Chọn người dùng...",
    fetchOptions: () => {
        const { data, isLoading, isFetching } = useUserList({});
        return {
            data: data?.data?.rows?.map(user => ({
                value: user.id,
                label: `${user.firstName} ${user.lastName}`.trim() || user.username
            })) ?? [],
            isLoading,
            isFetching,
        };
    },
};
