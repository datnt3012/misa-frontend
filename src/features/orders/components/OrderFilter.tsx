import { useState, useEffect } from "react";
import { ORDER_TYPES, OrderFilterSchemaType, OrderFilterSchema } from "../schemas";
import { ChevronDown, ChevronUp, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormProvider, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { filterOrderConfig } from "../constants";
import { DynamicFormField } from "@/shared/components/DynamicFormField";
import { getColSpan } from "@/shared/config";
import { useNavigate } from "react-router-dom";

interface OrderFilterProps {
    filters: OrderFilterSchemaType;
    onFilterChange: (filters: OrderFilterSchemaType) => void;
    defaultExpanded?: boolean;
}

const defaultValues: OrderFilterSchemaType = {
    keyword: '',
    page: 1,
    limit: 50,
    type: ORDER_TYPES[0],
}

export const OrderFilter = ({
    filters,
    onFilterChange,
    defaultExpanded = false
}: OrderFilterProps) => {
    const navigate = useNavigate();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const methods = useForm<OrderFilterSchemaType>({
        defaultValues: { ...defaultValues, ...filters },
        resolver: yupResolver(OrderFilterSchema),
    });

    const { handleSubmit, reset, watch } = methods;

    // ── Watch form changes for auto-filtering ───────────────────────────────────
    const watchedValues = watch();

    useEffect(() => {
        // Trigger filter change on every field change with a slight delay
        const timer = setTimeout(() => {
            onFormSubmit();
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [JSON.stringify(watchedValues)]);

    const onFormSubmit = handleSubmit((data) => {
        onFilterChange(data);
    });

    const handleReset = () => {
        reset(defaultValues);
        onFilterChange(defaultValues);
    };

    return (
        <div className="space-y-4">
            <div className="bg-card/60 backdrop-blur-xl rounded-2xl border border-border/50 shadow-premium overflow-hidden transition-all duration-500 hover:shadow-premium-hover">
                <FormProvider {...methods}>
                    <form onSubmit={onFormSubmit} className="p-5 md:p-8 space-y-6">
                        {/* Main Filter Row */}
                        <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-5">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-5">
                                {filterOrderConfig.slice(0, 3).map((config) => (
                                    <div
                                        key={config.name}
                                        className={cn(
                                            "w-full transition-all duration-300",
                                            config.name === "keyword" ? "md:col-span-12 lg:col-span-6" : "md:col-span-6 lg:col-span-3"
                                        )}
                                    >
                                        <DynamicFormField
                                            config={config}
                                            isFilterVariant={true}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Actions Group */}
                            <div className="flex items-center gap-2.5 min-w-fit">
                                <Button
                                    type="button"
                                    onClick={handleReset}
                                    variant="outline"
                                    className="h-11 px-6 gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all active:scale-95"
                                    title="Làm mới bộ lọc"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    <span>Đặt lại</span>
                                </Button>

                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className={cn(
                                        "h-11 px-6 gap-2 transition-all active:scale-95 whitespace-nowrap",
                                        isExpanded && "bg-accent text-accent-foreground shadow-inner"
                                    )}
                                >
                                    {isExpanded ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-primary" />}
                                    <span>{isExpanded ? "Thu gọn" : "Nâng cao"}</span>
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => navigate('/orders/create')}
                                    className="h-11 px-6 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 transition-all duration-300 active:scale-95 group font-semibold"
                                >
                                    <div className="p-1 rounded-md ">
                                        <Plus className="h-4 w-4" />
                                    </div>
                                    Thêm mới
                                </Button>
                            </div>
                        </div>

                        {/* Collapsible Advanced Filters Section */}
                        <div
                            className={cn(
                                "grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-6 pt-6 border-t border-border/40 transition-all duration-500 ease-in-out origin-top",
                                isExpanded
                                    ? "opacity-100 max-h-[1200px] visible translate-y-0 pb-2"
                                    : "opacity-0 max-h-0 invisible -translate-y-8 h-0 overflow-hidden border-0 p-0"
                            )}
                        >
                            {filterOrderConfig.slice(3).map((config) => (
                                <div
                                    key={config.name}
                                    className={cn(
                                        "w-full transition-all duration-300",
                                        "lg:" + getColSpan(config.colSpan || 6),
                                        "md:" + getColSpan(config.colSpanMd || config.colSpan || 6),
                                        "col-span-1" // Mobile default
                                    )}
                                >
                                    <DynamicFormField
                                        config={config}
                                        isFilterVariant={true}
                                    />
                                </div>
                            ))}
                        </div>
                    </form>
                </FormProvider>
            </div>
        </div>
    );
};