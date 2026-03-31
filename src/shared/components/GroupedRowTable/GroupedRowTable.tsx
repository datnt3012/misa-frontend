import React from "react";

import { cn } from "@/lib/utils";
import { GroupedColumn, GroupedRowColumn, GroupedRowGroup, GroupedRowTableProps, RowColumn } from "./GroupedRowTable.type";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cellClass(align?: string, type?: string) {
    if (align === "center") return "text-center";
    if (align === "right") return "text-right tabular-nums";
    if (align === "left") return "text-left";

    // Auto-align based on type
    if (type === "number") return "text-right tabular-nums";
    if (type === "date") return "text-center";
    return "text-left";
}

function isGroupedCol<TRow, TGroup extends GroupedRowGroup<TRow>>(
    col: GroupedRowColumn<TRow, TGroup>
): col is GroupedColumn<TRow, TGroup> {
    return col.grouped === true;
}

// ─── Checkbox (native, styled) ────────────────────────────────────────────────

function Checkbox({
    checked,
    indeterminate = false,
    onChange,
    ariaLabel,
}: {
    checked: boolean;
    indeterminate?: boolean;
    onChange: (checked: boolean) => void;
    ariaLabel?: string;
}) {
    const ref = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (ref.current) ref.current.indeterminate = indeterminate;
    }, [indeterminate]);

    return (
        <input
            ref={ref}
            type="checkbox"
            aria-label={ariaLabel}
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-3.5 w-3.5 accent-blue-600 cursor-pointer"
        />
    );
}

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
    return (
        <div
            className={cn("animate-pulse rounded bg-gray-200", className)}
        />
    );
}

// ─── Loading skeleton rows ────────────────────────────────────────────────────

function SkeletonRows({
    colCount,
    hasCheckbox,
    rowCount = 5,
}: {
    colCount: number;
    hasCheckbox: boolean;
    rowCount?: number;
}) {
    return (
        <>
            {Array.from({ length: rowCount }).map((_, i) => (
                <tr
                    key={i}
                    className={cn("border-b border-gray-200", i % 2 !== 0 && "bg-gray-50")}
                >
                    {hasCheckbox && (
                        <td className="px-3 py-3 border-r border-gray-200">
                            <Skeleton className="h-3.5 w-3.5" />
                        </td>
                    )}
                    {Array.from({ length: colCount }).map((_, ci) => (
                        <td
                            key={ci}
                            className="px-3 py-3 border-r border-gray-200 last:border-r-0"
                        >
                            <Skeleton className="h-4 w-full" />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function PaginationBar({
    filters,
    total,
    onFiltersChange,
}: {
    filters: { page: number; limit: number;[key: string]: any };
    total: number;
    onFiltersChange: (f: any) => void;
}) {
    const limit = filters.limit ?? 10;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = filters.page;

    const btnBase =
        "inline-flex items-center justify-center h-8 min-w-[2rem] px-2 rounded text-xs border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:pointer-events-none";
    const btnActive = "bg-primary text-white border-primary hover:bg-primary";

    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push("...");
        for (
            let i = Math.max(2, page - 1);
            i <= Math.min(totalPages - 1, page + 1);
            i++
        )
            pages.push(i);
        if (page < totalPages - 2) pages.push("...");
        pages.push(totalPages);
    }

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 py-2">
            {/* Page size + total */}
            <div className="flex items-center gap-2 order-2 sm:order-1">
                <span className="text-sm text-gray-500 whitespace-nowrap">Hiển thị</span>
                <select
                    value={limit}
                    onChange={(e) =>
                        onFiltersChange({ ...filters, limit: Number(e.target.value), page: 1 })
                    }
                    className="h-8 text-xs border border-gray-200 rounded px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    {[10, 25, 50, 100].map((opt) => (
                        <option key={opt} value={opt}>
                            {opt}
                        </option>
                    ))}
                </select>
                <span className="text-sm text-gray-500 whitespace-nowrap">
                    trong tổng số {total} bản ghi
                </span>
            </div>

            {/* Page numbers */}
            <nav className="flex items-center gap-1 order-1 sm:order-2">
                <button
                    onClick={() =>
                        page > 1 && onFiltersChange({ ...filters, page: page - 1 })
                    }
                    disabled={page <= 1}
                    className={btnBase}
                    aria-label="Trang trước"
                >
                    ‹ Trước
                </button>

                <div className="hidden sm:flex items-center gap-1">
                    {pages.map((p, i) =>
                        p === "..." ? (
                            <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-xs">
                                ...
                            </span>
                        ) : (
                            <button
                                key={p}
                                onClick={() => onFiltersChange({ ...filters, page: p })}
                                className={cn(btnBase, page === p && btnActive)}
                            >
                                {p}
                            </button>
                        )
                    )}
                </div>

                <span className="flex sm:hidden items-center px-3 text-xs text-gray-500">
                    {page} / {totalPages}
                </span>

                <button
                    onClick={() =>
                        page < totalPages &&
                        onFiltersChange({ ...filters, page: page + 1 })
                    }
                    disabled={page >= totalPages}
                    className={btnBase}
                    aria-label="Trang sau"
                >
                    Sau ›
                </button>
            </nav>
        </div>
    );
}

// ─── GroupedRowTable ──────────────────────────────────────────────────────────

export function GroupedRowTable<TRow, TGroup extends GroupedRowGroup<TRow>>({
    columns,
    groups,
    isLoading = false,
    emptyText = "Không có dữ liệu",
    selectedIds = [],
    onSelectedIdsChange,
    onRowClick,
    total = 0,
    filters,
    onFiltersChange,
    footer,
}: GroupedRowTableProps<TRow, TGroup>) {

    // ── Derived ────────────────────────────────────────────────────────────────
    const hasCheckbox = !!onSelectedIdsChange;
    const totalColCount = columns.length + (hasCheckbox ? 1 : 0);

    const isAllSelected =
        groups.length > 0 && groups.every((g) => selectedIds.includes(g.id));
    const isSomeSelected =
        groups.some((g) => selectedIds.includes(g.id)) && !isAllSelected;

    // ── Selection ──────────────────────────────────────────────────────────────
    const handleSelectAll = (checked: boolean) => {
        if (!onSelectedIdsChange) return;
        onSelectedIdsChange(
            checked
                ? [...new Set([...selectedIds, ...groups.map((g) => g.id)])]
                : selectedIds.filter((id) => !groups.some((g) => g.id === id))
        );
    };

    const handleSelectGroup = (id: string | number, checked: boolean) => {
        if (!onSelectedIdsChange) return;
        onSelectedIdsChange(
            checked ? [...selectedIds, id] : selectedIds.filter((sid) => sid !== id)
        );
    };

    // ── Render grouped <td> ────────────────────────────────────────────────────
    //  Type-safe: col phải là GroupedColumn → render(group: TGroup)
    const renderGroupedCell = (
        col: GroupedColumn<TRow, TGroup>,
        group: TGroup,
        rowCount: number,
        isLastGroup: boolean
    ) => (
        <td
            key={col.key}
            rowSpan={rowCount}
            style={col.width ? { minWidth: col.width } : undefined}
            className={cn(
                "px-3 py-3 align-middle text-sm text-gray-700",
                "border-r border-gray-200",
                !isLastGroup && "border-b-2 border-gray-300",
                cellClass(col.align, col.type),
                col.cellClassName
            )}
        >
            {col.render(group)}
        </td>
    );

    // ── Render row-level <td> ──────────────────────────────────────────────────
    //  Type-safe: col phải là RowColumn → render(row: TRow, rowIdx, group: TGroup)
    const renderRowCell = (
        col: RowColumn<TRow, TGroup>,
        row: TRow,
        rowIdx: number,
        group: TGroup,
        isLastRow: boolean,
        isLastGroup: boolean
    ) => (
        <td
            key={col.key}
            style={col.width ? { minWidth: col.width } : undefined}
            className={cn(
                "px-3 py-2 text-sm text-gray-700",
                "border-r border-gray-200",
                !isLastRow && "border-b border-gray-200",
                isLastRow && !isLastGroup && "border-b-2 border-gray-300",
                cellClass(col.align, col.type),
                col.cellClassName
            )}
        >
            {col.render(row, rowIdx, group)}
        </td>
    );

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <div className="w-full space-y-4">
            {/* Table */}
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">

                        {/* colgroup */}
                        <colgroup>
                            {hasCheckbox && <col style={{ width: 40, minWidth: 40 }} />}
                            {columns.map((col) => (
                                <col
                                    key={col.key}
                                    style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                                />
                            ))}
                        </colgroup>

                        {/* Header */}
                        <thead>
                            <tr className="bg-gray-100 border-b-2 border-gray-200">
                                {hasCheckbox && (
                                    <th className="w-[40px] px-3 py-2.5 border-r border-gray-200">
                                        <Checkbox
                                            checked={isAllSelected}
                                            indeterminate={isSomeSelected}
                                            onChange={handleSelectAll}
                                            ariaLabel="Chọn tất cả"
                                        />
                                    </th>
                                )}
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        style={col.width ? { minWidth: col.width } : undefined}
                                        className={cn(
                                            "h-10 px-3 py-2.5 text-xs font-semibold tracking-wider text-gray-500 whitespace-nowrap",
                                            "border-r border-gray-200",
                                            cellClass(col.align, col.type),
                                            col.headerClassName
                                        )}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        {/* Body */}
                        <tbody>
                            {/* Loading */}
                            {isLoading && (
                                <SkeletonRows colCount={columns.length} hasCheckbox={hasCheckbox} />
                            )}

                            {/* Empty */}
                            {!isLoading && groups.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={totalColCount}
                                        className="py-10 px-3 text-sm text-gray-400"
                                    >
                                        {emptyText}
                                    </td>
                                </tr>
                            )}

                            {/* Data */}
                            {!isLoading &&
                                groups.map((group, groupIdx) => {
                                    const rowCount = group.rows.length;
                                    const isLastGroup = groupIdx === groups.length - 1;
                                    const isGroupSelected = selectedIds.includes(group.id);

                                    return group.rows.map((row, rowIdx) => {
                                        const isFirstRow = rowIdx === 0;
                                        const isLastRow = rowIdx === rowCount - 1;

                                        return (
                                            <tr
                                                key={`${group.id}-${rowIdx}`}
                                                onClick={() => onRowClick?.(row, group)}
                                                className={cn(
                                                    "transition-colors",
                                                    groupIdx % 2 !== 0 ? "bg-gray-50/80" : "bg-white",
                                                    onRowClick && "cursor-pointer hover:bg-blue-50/40",
                                                    isGroupSelected && "bg-blue-50"
                                                )}
                                            >
                                                {/* Checkbox — grouped, only first row */}
                                                {hasCheckbox && isFirstRow && (
                                                    <td
                                                        rowSpan={rowCount}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className={cn(
                                                            "px-3 align-middle border-r border-gray-200",
                                                            !isLastGroup && "border-b-2 border-gray-300"
                                                        )}
                                                    >
                                                        <Checkbox
                                                            checked={isGroupSelected}
                                                            onChange={(c) => handleSelectGroup(group.id, c)}
                                                            ariaLabel={`Chọn nhóm ${group.id}`}
                                                        />
                                                    </td>
                                                )}

                                                {/* Columns */}
                                                {columns.map((col) => {
                                                    if (isGroupedCol(col)) {
                                                        // Grouped column: chỉ render ở row đầu tiên với rowSpan
                                                        if (!isFirstRow) return null;
                                                        return renderGroupedCell(col, group, rowCount, isLastGroup);
                                                    }
                                                    // Row column: render ở mỗi row
                                                    return renderRowCell(col, row, rowIdx, group, isLastRow, isLastGroup);
                                                })}
                                            </tr>
                                        );
                                    });
                                })}
                        </tbody>

                        {/* Footer */}
                        {footer && (
                            <tfoot className="border-t border-gray-200 bg-gray-100 font-medium whitespace-nowrap">
                                {footer}
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {filters && onFiltersChange && (
                <PaginationBar
                    filters={filters}
                    total={total}
                    onFiltersChange={onFiltersChange}
                />
            )}
        </div>
    );
}
