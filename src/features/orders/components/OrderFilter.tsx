import { useState, useEffect } from "react";
import { ORDER_TYPES, OrderFilterSchemaType, OrderFilterSchema } from "../schemas";
import { cn } from "@/lib/utils";
import { FormProvider, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { filterOrderConfig } from "../constants";
import { DynamicFormField } from "@/shared/components/DynamicFormField";

interface OrderFilterProps {
    filters: OrderFilterSchemaType;
    onFilterChange: (filters: OrderFilterSchemaType) => void;
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
}: OrderFilterProps) => {
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
                    <form onSubmit={onFormSubmit} className="p-5 md:p-8 space-y-2">
                        <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-5">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-5">
                                {filterOrderConfig.map((config) => (
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
                        </div>
                    </form>
                </FormProvider>
            </div>
        </div>
    );
};