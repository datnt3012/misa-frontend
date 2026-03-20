import { GenericFormFieldConfig } from "@/shared/config/field.config";
import { CategorySchemaType } from "./schemas";

export const CATEGORIES_QUERY_KEY = ['categories'] as const;

type FormFieldConfig = GenericFormFieldConfig<CategorySchemaType>;

export const CATEGORY_FORM_CONFIG: FormFieldConfig[] = [
    {
        label: 'Tên loại sản phẩm',
        name: 'name',
        type: 'text',
        colSpan: 12,
        required: true,
    },
    {
        label: 'Mô tả',
        name: 'description',
        type: 'textarea',
        colSpan: 12,
    },
] as const;