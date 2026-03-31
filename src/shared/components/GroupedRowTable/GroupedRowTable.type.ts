import React from "react";

// ─── Alignment ────────────────────────────────────────────────────────────────

export type GroupedColumnAlign = "left" | "center" | "right";

// ─── Column definition — Discriminated Union ──────────────────────────────────
//
//  Thay vì render union mơ hồ:
//    render: (rowOrGroup: TRow | TGroup, ...) => ReactNode   ← mất type safety
//
//  Dùng discriminated union theo grouped flag:
//    grouped: true  → render nhận (group: TGroup)           ← rõ ràng, autocomplete đúng
//    grouped: false → render nhận (row: TRow, rowIdx, group) ← rõ ràng, autocomplete đúng
//

type ColumnBase = {
    /** Unique key for this column */
    key: string;

    /** Header label */
    label: React.ReactNode;

    align?: GroupedColumnAlign;
    width?: number | string;

    /** Extra className on <th> */
    headerClassName?: string;

    /** Extra className on <td> */
    cellClassName?: string;

    /** Type of data for automatic styling (e.g. number -> right align) */
    type?: 'text' | 'number' | 'date';
};

/** Cột được gộp theo nhóm — render 1 lần/group, dùng rowSpan */
export type GroupedColumn<TRow, TGroup extends GroupedRowGroup<TRow>> = ColumnBase & {
    grouped: true;
    render: (group: TGroup) => React.ReactNode;
};

/** Cột theo từng dòng — render 1 lần/row */
export type RowColumn<TRow, TGroup extends GroupedRowGroup<TRow>> = ColumnBase & {
    grouped?: false;
    render: (row: TRow, rowIdx: number, group: TGroup) => React.ReactNode;
};

/** Union type cho cả 2 loại */
export type GroupedRowColumn<TRow, TGroup extends GroupedRowGroup<TRow>> =
    | GroupedColumn<TRow, TGroup>
    | RowColumn<TRow, TGroup>;

// ─── Group / Row shape ────────────────────────────────────────────────────────

export type GroupedRowGroup<TRow> = {
    /** Unique group id */
    id: string | number;
    /** The rows that belong to this group */
    rows: TRow[];
};

// ─── Component props ──────────────────────────────────────────────────────────

export interface GroupedRowTableProps<TRow, TGroup extends GroupedRowGroup<TRow>> {
    columns: GroupedRowColumn<TRow, TGroup>[];
    groups: TGroup[];

    isLoading?: boolean;
    emptyText?: React.ReactNode;

    // ── Selection ──────────────────────────────────────────────────────────────
    /** IDs of selected GROUPS */
    selectedIds?: Array<string | number>;
    onSelectedIdsChange?: (ids: Array<string | number>) => void;

    // ── Row click ─────────────────────────────────────────────────────────────
    onRowClick?: (row: TRow, group: TGroup) => void;

    // ── Pagination ─────────────────────────────────────────────────────────────
    total?: number;
    filters?: {
        page: number;
        limit: number;
        [key: string]: any;
    };
    onFiltersChange?: (filters: any) => void;

    // ── Footer ─────────────────────────────────────────────────────────────────
    footer?: React.ReactNode;
}
