import { Path } from "react-hook-form";

export type FormFieldType =
    | "text"
    | "number"
    | "date"
    | "textarea"
    | "select"
    | "autocomplete"
    | "checkbox"
    | "button"
    | "dateRange"
    | "slider"
    | "numberRange"
    | "radio"
    | "file";

export interface GenericFormFieldConfig<T> {
    label?: string;
    name: Path<T> | keyof T;
    placeholder?: string;
    type: FormFieldType;
    options?: Array<{ value: string; label: string }>;
    fetchOptions?: () => {
        data: Array<{ value: string; label: string }>;
        isLoading: boolean;
        isFetching: boolean;
    };
    disabled?: boolean;
    colSpan?: 1 | 2 | 3 | 4 | 6 | 8 | 12;
    colSpanMd?: 1 | 2 | 3 | 4 | 6 | 8 | 12;
    colSpanLg?: 1 | 2 | 3 | 4 | 6 | 8 | 12;
    required?: boolean;
    onChange?: (value: any, setValue: any) => void;
    onClick?: (value: any, setValue: any) => void;
    condition?: (values: T) => boolean; // Show/hide field
    // For range/slider types
    min?: number;
    max?: number;
    step?: number;
    minField?: Path<T> | keyof T;
    maxField?: Path<T> | keyof T;
    minLabel?: string;
    maxLabel?: string;
    // For select with lazy loading
    onOpenChange?: (open: boolean) => void;
    folder?: string;
    multiple?: boolean;
}