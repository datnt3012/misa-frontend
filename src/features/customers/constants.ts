import { GenericFormFieldConfig } from "@/shared/config/field.config";
import { CreateCustomerSchemaType, CustomersFilterSchemaType } from "./schemas";
import { useProvincesQuery, useWardsQuery } from "../administrative/hooks/useAdministrativeQuery";

export const CUSTOMERS_QUERY_KEY = ['customers'] as const;

type FormFieldConfig = GenericFormFieldConfig<CustomersFilterSchemaType>;

export const CUSTOMER_FORM_CONFIG: FormFieldConfig[] = [
    // TODO: Add filter fields
] as const;

export const customerCreateFields: GenericFormFieldConfig<CreateCustomerSchemaType>[] = [
    {
        name: "name",
        label: "Tên khách hàng",
        type: "text",
        placeholder: "Tên khách hàng",
        required: true,
        colSpan: 12
    },
    {
        name: "phoneNumber",
        label: "Số điện thoại",
        type: "text",
        placeholder: "09xx xxx xxx",
        required: true,
        colSpan: 6
    },
    {
        name: "email",
        label: "Email",
        type: "text",
        placeholder: "example@gmail.com",
        colSpan: 6
    },
    {
        name: "addressInfo.provinceCode",
        label: "Tỉnh/Thành phố",
        type: "autocomplete",
        placeholder: "Tỉnh/Thành phố",
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
        colSpan: 6,
    },
    {
        name: "addressInfo.wardCode",
        label: "Phường/Xã",
        type: "autocomplete",
        placeholder: "Phường/Xã",
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
        colSpan: 6,
    },
    {
        name: "address",
        label: "Địa chỉ chi tiết",
        type: "textarea",
        placeholder: "Số nhà, tên đường...",
        colSpan: 12
    },
    {
        name: "vatInfo.taxCode",
        label: "Mã số thuế",
        type: "text",
        placeholder: "Mã số thuế",
        colSpan: 6
    },
    {
        name: "vatInfo.companyName",
        label: "Tên công ty/đơn vị",
        type: "text",
        placeholder: "Tên công ty/đơn vị",
        colSpan: 6
    },
    {
        name: "vatInfo.vatEmail",
        label: "Email xuất hóa đơn",
        type: "text",
        placeholder: "Email xuất hóa đơn",
        colSpan: 6
    },
    {
        name: "vatInfo.companyPhone",
        label: "Số điện thoại công ty",
        type: "text",
        placeholder: "Số điện thoại công ty",
        colSpan: 6
    },
    {
        name: "vatInfo.companyAddress",
        label: "Địa chỉ công ty",
        type: "text",
        placeholder: "Địa chỉ công ty",
        colSpan: 12
    },
];