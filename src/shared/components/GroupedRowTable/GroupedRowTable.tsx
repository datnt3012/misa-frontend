import React from "react";

import { cn } from "@/lib/utils";
import { GroupedColumn, GroupedRowColumn, GroupedRowGroup, GroupedRowTableProps, RowColumn } from "./GroupedRowTable.type";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

// ─── GroupedRowTable ──────────────────────────────────────────────────────────

export function GroupedRowTable<TRow, TGroup extends GroupedRowGroup<TRow>>({
    columns,
    groups,
    isLoading = false,
    emptyText = "Không có dữ liệu",
    selectedIds = [],
    onSelectedIdsChange,
    onRowClick,
    footer,
    containerClassName,
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
                "px-5 py-4 align-middle text-sm text-slate-700 font-medium leading-relaxed",
                "border-r border-slate-200/60",
                !isLastGroup && "border-b-2 border-slate-200",
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
                "px-5 py-3 text-sm text-[#020817] font-medium leading-relaxed",
                "border-r border-slate-200/60",
                !isLastRow && "border-b border-slate-100",
                isLastRow && !isLastGroup && "border-b-2 border-slate-200",
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
            <div className={cn("overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm flex flex-col", containerClassName)}>
                <div className="overflow-auto min-h-0 flex-1 relative">
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
                        <thead className="sticky top-0 z-10 shadow-[inset_0_-1px_0_0_#e2e8f0]">
                            <tr className="bg-slate-50 text-slate-600">
                                {hasCheckbox && (
                                    <th className="w-[40px] px-5 py-3.5 border-r border-slate-200/60">
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
                                            "px-5 py-3.5 text-[13px] font-semibold tracking-wide text-slate-600 whitespace-nowrap",
                                            "border-r border-slate-200/60",
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
                                                            "px-5 border-r border-gray-200",
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
                            <tfoot className="sticky bottom-0 z-20 bg-gray-100 font-medium whitespace-nowrap shadow-[inset_0_1px_0_0_#e5e7eb]">
                                {footer}
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {/* {filters && onFiltersChange && (
                <PaginationBar
                    filters={filters}
                    total={total}
                    onFiltersChange={onFiltersChange}
                />
            )} */}
        </div>
    );
}
