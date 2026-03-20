import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { AlertCircle, Loader2, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { GenericFormFieldConfig } from "@/shared/config";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Autocomplete } from "./autocomplete";
import { DatePicker } from "./date-picker";
import { DatePickerWithRange } from "./date-range-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface DynamicFormFieldProps<T extends object> {
    config: GenericFormFieldConfig<T>;
    isReadOnly?: boolean;
    isFilterVariant?: boolean;
}

// Sub-component: calls fetchOptions() unconditionally so React hook rules are satisfied
interface AutocompleteWithFetchProps {
    fetchOptions: () => { data: Array<{ value: string; label: string }>; isLoading?: boolean; isFetching?: boolean };
    value: string | string[];
    onChange: (value: string | string[]) => void;
    multiple?: boolean;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}
const AutocompleteWithFetch: React.FC<AutocompleteWithFetchProps> = ({ fetchOptions, ...props }) => {
    const { data: options = [], isLoading } = fetchOptions();
    return (
        <div className="relative">
            <Autocomplete options={options} {...props} />
            {isLoading && <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
    );
};

const colSpanClasses = {
    1: "col-span-1",
    2: "col-span-2",
    3: "col-span-3",
    4: "col-span-4",
    6: "col-span-6",
    8: "col-span-8",
    12: "col-span-12"
};

export const DynamicFormField = <T extends object>({
    config,
    isReadOnly,
    isFilterVariant
}: DynamicFormFieldProps<T>) => {
    const { control, register, formState: { errors }, setValue, watch } = useFormContext<T>();
    // const { uploadFile } = useUploadFileMutation();
    const currentValues = watch();
    const error = errors[config.name as string];
    const colSpan = colSpanClasses[config.colSpan || (isFilterVariant ? 1 : 4)];

    // Check if field should be shown
    if (config.condition && !config.condition(currentValues)) {
        return null;
    }

    // Text/Number Input
    if (config.type === "text" || config.type === "number") {
        return (
            <div className={`${colSpan} space-y-2`}>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase ml-1 opacity-70"
                    htmlFor={config.name as string}>{config.label} {config.required && <span className="text-destructive">*</span>}</Label>
                <Input
                    id={config.name as string}
                    type={config.type}
                    {...register(config.name as any)}
                    placeholder={config.placeholder}
                    className={error ? "border-destructive" : ""}
                    disabled={isReadOnly || config.disabled}
                    required={config.required}
                />
                {error?.message && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {error.message as string}
                    </p>
                )}
            </div>
        );
    }

    // Select
    if (config.type === "select") {
        return (
            <div className={`${colSpan} space-y-2`}>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase ml-1 opacity-70"
                    htmlFor={config.name as string}>{config.label} {config.required && <span className="text-destructive">*</span>}</Label>
                <Controller
                    control={control}
                    name={config.name as any}
                    render={({ field }) => (
                        <Select
                            value={field.value !== undefined && field.value !== null && field.value !== "" ? String(field.value) : "all"}
                            onValueChange={(value) =>
                                field.onChange(value === "all" ? undefined : value)
                            }
                            disabled={isReadOnly || config.disabled}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={config.placeholder || "Tất cả"} />
                            </SelectTrigger>
                            <SelectContent>
                                {/* Only show default "Tất cả" if no "all" option is provided in config */}
                                {!config.options?.some(opt => opt.value === "all" || opt.value === "") && (
                                    <SelectItem value="all">Tất cả</SelectItem>
                                )}
                                {config.options?.map((option) => (
                                    <SelectItem
                                        key={option.value || "all"}
                                        value={option.value || "all"}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>
        );
    }

    // Textarea
    if (config.type === "textarea") {
        return (
            <div className={`${colSpan} space-y-2`}>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase ml-1 opacity-70"
                    htmlFor={config.name as string}>{config.label} {config.required && <span className="text-destructive">*</span>}</Label>
                <Textarea
                    id={config.name as string}
                    {...register(config.name as any)}
                    placeholder={config.placeholder}
                    className={error ? "border-destructive" : ""}
                    disabled={isReadOnly || config.disabled}
                />
                {error?.message && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {error.message as string}
                    </p>
                )}
            </div>
        );
    }

    // Autocomplete
    if (config.type === "autocomplete") {
        return (
            <div className={`${colSpan} space-y-2`}>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase ml-1 opacity-70"
                    htmlFor={config.name as string}>{config.label} {config.required && <span className="text-destructive">*</span>}</Label>
                <Controller
                    name={config.name as any}
                    control={control}
                    rules={{ required: config.required }}
                    render={({ field }) => {
                        const commonProps = {
                            multiple: config.multiple,
                            value: field.value ?? (config.multiple ? [] : ""),
                            onChange: (value: string | string[]) => {
                                field.onChange(value);
                                config.onChange?.(value, setValue);
                            },
                            placeholder: config.placeholder,
                            disabled: isReadOnly || config.disabled,
                            className: error ? "border-destructive" : "",
                        };
                        return config.fetchOptions
                            ? <AutocompleteWithFetch fetchOptions={config.fetchOptions} {...commonProps} />
                            : <Autocomplete options={config.options || []} {...commonProps} />;
                    }}
                />
                {error?.message && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {error.message as string}
                    </p>
                )}
            </div>
        );
    }

    // DatePicker
    if (config.type === "date") {
        return (
            <div className={`${colSpan} space-y-2`}>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase ml-1 opacity-70"
                    htmlFor={config.name as string}>{config.label} {config.required && <span className="text-destructive">*</span>}</Label>
                <Controller
                    name={config.name as any}
                    control={control}
                    rules={{ required: config.required }}
                    render={({ field }) => (
                        <DatePicker
                            date={field.value as Date | undefined}
                            setDate={(date) => {
                                field.onChange(date);
                                config.onChange?.(date, setValue);
                            }}
                            className={error ? "border-destructive" : ""}
                            disabled={isReadOnly || config.disabled}
                        />
                    )}
                />
                {error?.message && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {error.message as string}
                    </p>
                )}
            </div>
        );
    }

    // Date range
    if (config.type === "dateRange") {
        return (
            <div className={`${colSpan} space-y-2 mt-2`}>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase ml-1 opacity-70"
                    htmlFor={config.name as string}>{config.label} {config.required && <span className="text-destructive">*</span>}</Label>
                <Controller
                    control={control}
                    name={config.name as any}
                    disabled={isReadOnly || config.disabled}
                    render={({ field }) => (
                        <DatePickerWithRange
                            date={field.value as DateRange}
                            setDate={(range) => field.onChange(range)}
                        />
                    )}
                />
            </div>
        );
    }

    // Checkbox
    if (config.type === "checkbox") {
        return (
            <div className={`${colSpan} space-y-2`}>
                <div className="flex items-center space-x-2">
                    <Controller
                        name={config.name as any}
                        control={control}
                        rules={{ required: config.required }}
                        render={({ field }) => (
                            <Checkbox
                                checked={field.value as boolean}
                                onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    config.onChange?.(checked, setValue);
                                }}
                                className={error ? "border-destructive" : ""}
                                disabled={isReadOnly || config.disabled}
                            />
                        )}
                    />
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase ml-1 opacity-70"
                        htmlFor={config.name as string}>{config.label} {config.required && <span className="text-destructive">*</span>}</Label>
                </div>
                {error?.message && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {error.message as string}
                    </p>
                )}
            </div>
        );
    }

    // Button
    if (config.type === "button") {
        return (
            <div className={`${colSpan} flex items-end pb-0.5`}>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => config.onClick?.(currentValues, setValue)}
                    disabled={isReadOnly || config.disabled}
                    className="w-full"
                >
                    {config.label}
                </Button>
            </div>
        );
    }

    // Number range field (min/max inputs)
    if (config.type === "numberRange" && config.minField && config.maxField) {
        return (
            <div className={`${colSpan} space-y-2`}>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase ml-1 opacity-70"
                    htmlFor={config.name as string}>{config.label} {config.required && <span className="text-destructive">*</span>}</Label>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor={config.minField as string}>{config.minLabel}</Label>
                        <Input
                            id={config.minField as string}
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={watch(config.minField as any) != null
                                ? Number(watch(config.minField as any)).toLocaleString('en-US')
                                : ""}
                            onChange={(e) => {
                                const raw = e.target.value.replace(/,/g, '');
                                setValue(
                                    config.minField as any,
                                    raw === "" ? undefined : Number(raw) as any
                                );
                            }}
                            disabled={isReadOnly || config.disabled}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={config.maxField as string}>{config.maxLabel}</Label>
                        <Input
                            id={config.maxField as string}
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={watch(config.maxField as any) != null
                                ? Number(watch(config.maxField as any)).toLocaleString('en-US')
                                : ""}
                            onChange={(e) => {
                                const raw = e.target.value.replace(/,/g, '');
                                setValue(
                                    config.maxField as any,
                                    raw === "" ? undefined : Number(raw) as any
                                );
                            }}
                            disabled={isReadOnly || config.disabled}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // Slider field (for progress)
    if (config.type === "slider" && config.minField && config.maxField) {
        const minVal = watch(config.minField as any) as number ?? 0;
        const maxVal = watch(config.maxField as any) as number ?? 100;

        return (
            <div className={`${colSpan} space-y-2 mt-2`}>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase ml-1 opacity-70"
                    htmlFor={config.name as string}>{config.label} {config.required && <span className="text-destructive">*</span>}</Label>
                <div className="space-y-3">
                    {/* <span className="text-sm text-muted-foreground">{config.label}: {minVal}% - {maxVal}%</span> */}
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground min-w-[40px]">{minVal}%</span>
                        <Slider
                            value={[minVal, maxVal]}
                            onValueChange={([min, max]) => {
                                setValue(config.minField as any, min as any);
                                setValue(config.maxField as any, max as any);
                            }}
                            min={config.min ?? 0}
                            max={config.max ?? 100}
                            step={config.step ?? 5}
                            className="flex-1"
                            disabled={isReadOnly || config.disabled}
                        />
                        <span className="text-sm text-muted-foreground min-w-[40px]">{maxVal}%</span>
                    </div>
                </div>
            </div>
        );
    }

    // Radio Group
    if (config.type === "radio") {
        return (
            <div className={`${colSpan} space-y-2`}>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase ml-1 opacity-70"
                >{config.label} {config.required && <span className="text-destructive">*</span>}</Label>
                <Controller
                    control={control}
                    name={config.name as any}
                    render={({ field }) => (
                        <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-2"
                            disabled={isReadOnly || config.disabled}
                        >
                            {config.options?.map((option) => (
                                <div className="flex items-center space-x-2" key={option.value}>
                                    <RadioGroupItem value={option.value} id={option.value} />
                                    <Label htmlFor={option.value} className="font-normal cursor-pointer">
                                        {option.label}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    )}
                />
                {error?.message && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {error.message as string}
                    </p>
                )}
            </div>
        );
    }

    // File Input
    // if (config.type === "file") {
    //     const [uploading, setUploading] = useState(false);
    //     const [fileName, setFileName] = useState<string>("");
    //     const fileKey = watch(config.name as any);

    //     const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    //         const files = e.target.files;
    //         if (!files || files.length === 0) return;

    //         const file = files[0];
    //         setFileName(file.name);
    //         setUploading(true);

    //         try {
    //             const response = await uploadFile({ file, folder: config.folder });

    //             const uploadedFileKey = response?.key || response?.fileKey;

    //             if (uploadedFileKey) {
    //                 setValue(config.name as any, uploadedFileKey as any);
    //                 toast({
    //                     title: "Thành công",
    //                     description: `Đã tải lên file: ${file.name}`,
    //                 });
    //             } else {
    //                 throw new Error("Không nhận được file key từ server");
    //             }
    //         } catch (error) {
    //             console.error("Upload failed:", error);
    //             toast({
    //                 title: "Lỗi",
    //                 description: "Tải file lên thất bại. Vui lòng thử lại.",
    //                 variant: "destructive",
    //             });
    //             setFileName("");
    //             setValue(config.name as any, undefined as any);
    //         } finally {
    //             setUploading(false);
    //             // Reset input để có thể upload lại cùng file
    //             e.target.value = "";
    //         }
    //     };

    //     const handleRemoveFile = () => {
    //         setFileName("");
    //         setValue(config.name as any, undefined as any);
    //     };

    //     return (
    //         <div className={`${colSpan} space-y-2`}>
    //             <Label htmlFor={config.name as string}>{config.label}</Label>

    //             {fileKey && !uploading ? (
    //                 <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
    //                     <svg
    //                         className="w-5 h-5 text-primary"
    //                         fill="none"
    //                         stroke="currentColor"
    //                         viewBox="0 0 24 24"
    //                     >
    //                         <path
    //                             strokeLinecap="round"
    //                             strokeLinejoin="round"
    //                             strokeWidth={2}
    //                             d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    //                         />
    //                     </svg>
    //                     <span className="flex-1 text-sm truncate">{fileName || fileKey}</span>
    //                     <Button
    //                         type="button"
    //                         variant="ghost"
    //                         size="sm"
    //                         onClick={handleRemoveFile}
    //                         disabled={isReadOnly || config.disabled}
    //                     >
    //                         <X className="h-4 w-4" />
    //                     </Button>
    //                 </div>
    //             ) : (
    //                 <div className="flex items-center justify-center w-full">
    //                     <label
    //                         htmlFor={config.name as string}
    //                         className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg ${uploading || isReadOnly || config.disabled
    //                             ? "cursor-not-allowed opacity-60"
    //                             : "cursor-pointer bg-gray-50 hover:bg-gray-100"
    //                             } border-gray-300`}
    //                     >
    //                         {uploading ? (
    //                             <div className="flex flex-col items-center justify-center pt-5 pb-6">
    //                                 <Loader2 className="w-8 h-8 mb-3 text-primary animate-spin" />
    //                                 <p className="mb-2 text-sm text-gray-500">
    //                                     <span className="font-semibold">Đang tải lên...</span>
    //                                 </p>
    //                             </div>
    //                         ) : (
    //                             <div className="flex flex-col items-center justify-center pt-5 pb-6">
    //                                 <svg
    //                                     className="w-8 h-8 mb-3 text-gray-400"
    //                                     fill="none"
    //                                     stroke="currentColor"
    //                                     viewBox="0 0 24 24"
    //                                 >
    //                                     <path
    //                                         strokeLinecap="round"
    //                                         strokeLinejoin="round"
    //                                         strokeWidth={2}
    //                                         d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
    //                                     />
    //                                 </svg>
    //                                 <p className="mb-2 text-sm text-gray-500">
    //                                     <span className="font-semibold">Chọn file để tải lên</span>
    //                                 </p>
    //                             </div>
    //                         )}
    //                         <Input
    //                             id={config.name as string}
    //                             type="file"
    //                             className="hidden"
    //                             onChange={handleFileUpload}
    //                             disabled={uploading || isReadOnly || config.disabled}
    //                         />
    //                     </label>
    //                 </div>
    //             )}

    //             {error?.message && (
    //                 <p className="text-sm text-destructive flex items-center gap-1">
    //                     <AlertCircle className="h-3 w-3" />
    //                     {error.message as string}
    //                 </p>
    //             )}
    //         </div>
    //     );
    // }

    return null;
};