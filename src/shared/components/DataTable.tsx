import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

interface DataTableProps<T extends { id: string }> {
    title?: string;
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

export function DataTable<T extends { id: string }>({
    columns,
    data,
    isLoading = false,
    total = 0,
    filters,
    onFiltersChange,
    selectedIds = [],
    onSelectedIdsChange,
    onRowClick,
}: DataTableProps<T>) {
    const limit = filters?.limit ?? 10;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const isAllSelected = data?.length > 0 && data?.every(item => selectedIds.includes(item.id));
    const isSomeSelected = data?.some(item => selectedIds.includes(item.id)) && !isAllSelected;

    const handleSelectAll = (checked: boolean) => {
        if (!onSelectedIdsChange) return;
        if (checked) {
            const allIds = [...new Set([...selectedIds, ...data.map(item => item.id)])];
            onSelectedIdsChange(allIds);
        } else {
            const remainingIds = selectedIds.filter(id => !data.some(item => item.id === id));
            onSelectedIdsChange(remainingIds);
        }
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        if (!onSelectedIdsChange) return;
        if (checked) {
            onSelectedIdsChange([...selectedIds, id]);
        } else {
            onSelectedIdsChange(selectedIds.filter(selectedId => selectedId !== id));
        }
    };

    return (
        <div className="w-full space-y-4">
            <div className="overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                    <Table className="border-b">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent bg-muted/10 border-b">
                                {onSelectedIdsChange && (
                                    <TableHead className="w-[40px] text-left px-3">
                                        <Checkbox
                                            checked={isAllSelected || (isSomeSelected ? "indeterminate" : false)}
                                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                            aria-label="Select all"
                                            className="h-3.5 w-3.5"
                                        />
                                    </TableHead>
                                )}
                                {columns.map((col) => (
                                    <TableHead
                                        key={String(col.key)}
                                        className={cn(
                                            "h-10 px-3 text-xs text-left font-semibold uppercase tracking-wider text-muted-foreground/70 whitespace-nowrap",
                                            col.className
                                        )}
                                    >
                                        {col.label}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [1, 2, 3, 4, 5].map((item) => (
                                    <TableRow key={item} className="h-12">
                                        {onSelectedIdsChange && <TableCell className="px-3"><Skeleton className="h-3.5 w-3.5" /></TableCell>}
                                        {columns.map((_, idx) => (
                                            <TableCell key={idx} className="px-3 py-2">
                                                <Skeleton className="h-4 w-full" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : data?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length + (onSelectedIdsChange ? 1 : 0)} className="text-left py-10 text-muted-foreground text-sm">
                                        Không có dữ liệu
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data?.map((item, idx) => {
                                    const isSelected = selectedIds.includes(item.id);
                                    return (
                                        <TableRow
                                            key={item.id}
                                            onClick={() => onRowClick?.(item)}
                                            className={cn(
                                                "h-12 hover:bg-muted/50 transition-colors border-b last:border-0",
                                                isSelected && "bg-primary/5",
                                                onRowClick && "cursor-pointer"
                                            )}
                                        >
                                            {onSelectedIdsChange && (
                                                <TableCell className="px-3">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={(checked) => handleSelectRow(item.id, !!checked)}
                                                        aria-label={`Select row ${idx + 1}`}
                                                        className="h-3.5 w-3.5"
                                                    />
                                                </TableCell>
                                            )}
                                            {columns.map((col) => (
                                                <TableCell
                                                    key={String(col.key)}
                                                    onClick={(e) => {
                                                        // Prevent row click for actions column
                                                        if (col.key === 'actions') {
                                                            e.stopPropagation();
                                                        }
                                                    }}
                                                    className={cn(
                                                        "px-3 py-2 text-left text-sm text-foreground/80 whitespace-nowrap",
                                                        col.lengthLimit && "max-w-[250px] truncate",
                                                        col.className
                                                    )}
                                                >
                                                    {col.render ? col.render(item, idx + 1) : (item as any)[col.key]}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {
                filters && onFiltersChange && (
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
                        <div className="flex items-center gap-2 order-2 sm:order-1">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">Hiển thị</span>
                            <Select
                                value={String(limit)}
                                onValueChange={(value) =>
                                    onFiltersChange({ ...filters, limit: parseInt(value, 10), page: 1 })
                                }
                            >
                                <SelectTrigger className="w-[70px] h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[10, 25, 50, 100].map((opt) => (
                                        <SelectItem key={opt} value={String(opt)} className="text-xs">
                                            {opt}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">trong tổng số {total} bản ghi</span>
                        </div>

                        <div className="order-1 sm:order-2">
                            <Pagination>
                                <PaginationContent className="gap-1">
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (filters.page > 1)
                                                    onFiltersChange({ ...filters, page: filters.page - 1 });
                                            }}
                                            className={cn(
                                                "h-8 px-2 text-xs",
                                                filters.page <= 1 && "pointer-events-none opacity-50"
                                            )}
                                        />
                                    </PaginationItem>

                                    <div className="hidden sm:flex items-center gap-1">
                                        {Array.from({ length: totalPages }).map((_, idx) => {
                                            const pageNum = idx + 1;
                                            if (totalPages > 5) {
                                                if (pageNum > 1 && pageNum < totalPages && (pageNum < filters.page - 1 || pageNum > filters.page + 1)) {
                                                    if (pageNum === filters.page - 2 || pageNum === filters.page + 2) {
                                                        return <span key={pageNum} className="px-1 text-muted-foreground">...</span>;
                                                    }
                                                    return null;
                                                }
                                            }

                                            return (
                                                <PaginationItem key={pageNum}>
                                                    <PaginationLink
                                                        href="#"
                                                        isActive={filters.page === pageNum}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            onFiltersChange({ ...filters, page: pageNum });
                                                        }}
                                                        className="h-8 w-8 text-xs"
                                                    >
                                                        {pageNum}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            );
                                        })}
                                    </div>

                                    <div className="flex sm:hidden items-center px-4 text-xs text-muted-foreground">
                                        Trang {filters.page} / {totalPages}
                                    </div>

                                    <PaginationItem>
                                        <PaginationNext
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (filters.page < totalPages)
                                                    onFiltersChange({ ...filters, page: filters.page + 1 });
                                            }}
                                            className={cn(
                                                "h-8 px-2 text-xs",
                                                filters.page >= totalPages && "pointer-events-none opacity-50"
                                            )}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
