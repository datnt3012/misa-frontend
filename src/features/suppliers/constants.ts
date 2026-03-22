import { GenericFormFieldConfig } from "@/shared/config/field.config";
import { CreateSupplierSchemaType, SuppliersFilterSchemaType } from "./schemas";
import { useProvincesQuery, useWardsQuery } from "../administrative/hooks/useAdministrativeQuery";

export const SUPPLIERS_QUERY_KEY = ['suppliers'] as const;

type FormFieldConfig = GenericFormFieldConfig<SuppliersFilterSchemaType>;

export const CUSTOMER_FORM_CONFIG: FormFieldConfig[] = [
    // TODO: Add filter fields
] as const;

export const supplierCreateFields: GenericFormFieldConfig<CreateSupplierSchemaType>[] = [
    {
        name: "name",
        label: "Tên nhà cung cấp",
        type: "text",
        placeholder: "Tên nhà cung cấp",
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
];