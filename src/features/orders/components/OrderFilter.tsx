import { useMemo, useState } from "react";
import { ORDER_STATUSES, OrderFilterParams, orderFilterSchema } from "../schemas";
import { ChevronDown, ChevronUp, Filter, RotateCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Autocomplete } from "@/shared/components/autocomplete";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormProvider, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { filterOrderConfig } from "../constants";
import { DynamicFormField } from "@/shared/components/DynamicFormField";

interface OrderFilterProps {
    filters: OrderFilterParams;
    onFilterChange: (filters: OrderFilterParams) => void;
    defaultExpanded?: boolean;
}

const defaultValues: OrderFilterParams = {
    keyword: '',
    page: 1,
    limit: 50,
}

export const OrderFilter = ({ filters, onFilterChange, defaultExpanded = false }: OrderFilterProps) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const methods = useForm<OrderFilterParams>({
        defaultValues,
        resolver: yupResolver(orderFilterSchema),
    });
    const { control, handleSubmit, reset, watch } = methods;

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex-1 flex flex-col md:flex-row gap-3 items-end">
                    {/* Integrated Search */}
                    <div className="w-full md:w-[300px] space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase ml-1">Tìm kiếm</label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Mã, địa chỉ, nhà mạng..."
                                className="pl-9 bg-background/50 border-border/50 focus:border-primary/50 transition-all"
                                value={filters.keyword}
                                onChange={(e) => onFilterChange({ ...filters, keyword: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Primary Status Filter */}
                    <div className="w-full md:w-[200px] space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase ml-1">Trạng thái</label>
                        <div className="relative">
                            <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                            <Autocomplete
                                options={ORDER_STATUSES.map((status) => ({ value: status, label: status }))}
                                value={filters.status || 'all'}
                                onChange={(value) => onFilterChange({ ...filters, status: value === 'all' ? undefined : value as any })}
                                placeholder="Lọc trạng thái"
                                className="pl-9 h-10"
                            />
                        </div>
                    </div>

                    {/* Primary Type Filter */}
                    {/* <div className="w-full md:w-[220px] space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase ml-1">Loại hợp đồng</label>
                        <div className="relative">
                            <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                            <Autocomplete
                                options={typeOptions}
                                value={watchedValues.contractType || 'all'}
                                onChange={(value) => setValue('contractType', (value === 'all' ? undefined : value) as any)}
                                placeholder="Lọc loại hợp đồng"
                                className="pl-9 h-10"
                            />
                        </div>
                    </div> */}

                    {/* Toggle Advanced Filters */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={cn(
                            "h-10 px-3 gap-2 text-muted-foreground hover:text-foreground",
                            isExpanded && "bg-muted text-foreground"
                        )}
                    >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        Bộ lọc nâng cao
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        onClick={() => onFilterChange(defaultValues)}
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                        title="Đặt lại bộ lọc"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Advanced Filters Section */}
            {isExpanded && (
                <div className="p-6 border rounded-2xl bg-card/40 backdrop-blur-sm shadow-premium animate-in fade-in slide-in-from-top-2 duration-300">
                    <FormProvider {...methods}>
                        <form>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
                                {filterOrderConfig
                                    .filter(config => config.name !== 'status' && config.name !== 'createdBy')
                                    .map((config) => (
                                        <div key={config.name} className="flex flex-col space-y-1.5">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1 opacity-70">
                                                {config.label}
                                            </label>
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
            )}
        </div>
    );
}