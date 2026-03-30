import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "./data-tables/DataTable";

interface DataTableCardProps<T extends { id: string }> {
    /**
     * Tiêu đề của bảng
     */
    title: string;
    /**
     * Mô tả chi tiết (hiển thị dưới tiêu đề)
     */
    description?: string;
    /**
     * Icon hiển thị cạnh tiêu đề
     */
    icon?: LucideIcon;
    /**
     * Số lượng bản ghi (badge hiển thị cạnh tiêu đề)
     */
    count?: number;
    /**
     * Các hành động bổ sung hiển thị bên phải header
     */
    actions?: React.ReactNode;
    /**
     * Class bổ sung cho Card
     */
    className?: string;
    /**
     * Class bổ sung cho CardHeader
     */
    headerClassName?: string;
    /**
     * Class bổ sung cho CardContent
     */
    contentClassName?: string;

    // Core DataTable Props
    columns: {
        key: keyof T | string;
        label: React.ReactNode;
        render?: (item: T, index: number) => React.ReactNode;
        lengthLimit?: number;
        className?: string;
    }[];
    data: T[];
    isLoading?: boolean;
    total?: number;
    filters?: {
        page?: number;
        limit?: number;
        [key: string]: any;
    };
    onFiltersChange?: (filters: any) => void;
    selectedIds?: string[];
    onSelectedIdsChange?: (ids: string[]) => void;
    onRowClick?: (item: T) => void;
}

/**
 * Một component Card bọc ngoài DataTable, mang phong cách UI đồng nhất toàn hệ thống.
 * Phù hợp để hiển thị danh sách dữ liệu chính trong các trang quản lý.
 */
export function DataTableCard<T extends { id: string }>({
    title,
    description,
    icon: Icon,
    count,
    actions,
    className,
    headerClassName,
    contentClassName,
    columns,
    data,
    isLoading = false,
    total = 0,
    filters,
    onFiltersChange,
    selectedIds,
    onSelectedIdsChange,
    onRowClick,
}: DataTableCardProps<T>) {
    return (
        <Card className={cn("bg-gradient-card shadow-card border-b border-border overflow-hidden", className)}>
            <CardHeader className={cn("flex flex-row border-b items-center justify-between px-6 py-4 space-y-0", headerClassName)}>
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-4 w-4 text-primary" />
                        </div>
                    )}
                    <div className="flex flex-col">
                        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                            {title}
                            {count !== undefined && !isLoading && (
                                <span className="ml-1 text-xs font-normal text-muted-foreground bg-background px-2 py-0.5 rounded-full border">
                                    {count}
                                </span>
                            )}
                        </CardTitle>
                        {description && (
                            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
                {actions && (
                    <div className="flex items-center gap-2">
                        {actions}
                    </div>
                )}
            </CardHeader>
            <CardContent className={cn("p-0", contentClassName)}>
                <div className="p-6">
                    <DataTable
                        columns={columns}
                        data={data}
                        isLoading={isLoading}
                        total={total}
                        filters={filters}
                        onFiltersChange={onFiltersChange}
                        selectedIds={selectedIds}
                        onSelectedIdsChange={onSelectedIdsChange}
                        onRowClick={onRowClick}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
