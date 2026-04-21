import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { OrderTag as ApiOrderTag } from '@/api/orderTags.api';
import { formatCurrency } from '../utils/formatters';
import { ORDER_TABLE_COLUMN_METADATA } from '../constants';
import {
  orderCodeRenderer,
  contractCodeRenderer,
  partnerRenderer,
  expensesRenderer,
  totalOrderValueExcludingVATRenderer,
  totalVatValueRenderer,
  totalOrderValueRenderer,
  paidRenderer,
  statusRenderer,
  completedAtRenderer,
  creatorRenderer,
  noteRenderer,
  actionsRenderer,
  productRenderer,
  categoryRenderer,
  unitPriceRenderer,
  quantityRenderer,
  vatRenderer,
} from './OrderDataTableRenderers';
import { OrderDialogActions } from './OrderDialogs';
import { OrderDetailSchemaType, OrderSchemaType, OrderSummarySchemaType } from '../schemas';
import { GroupedRowTable, GroupedRowColumn, GroupedRowGroup } from '@/shared/components/GroupedRowTable';
import { useColumnVisibility } from '@/shared/hooks';
import { ColumnVisibilityPopover } from '@/shared/components/data-tables/ColumnVisibilityPopover';
import { useNavigate } from 'react-router-dom';

// ─── Prop types ───────────────────────────────────────────────────────────────

export interface OrderDataTableProps {
  orders: OrderSchemaType[];
  summary?: OrderSummarySchemaType;
  isLoading: boolean;
  total: number;
  pagination: { page: number; limit: number };
  onPaginationChange: (p: { page: number; limit: number }) => void;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  orderType: 'sale' | 'purchase';
  availableTags: ApiOrderTag[];
  onUpdateStatus: (orderId: string, status: string) => void;
  hasPermission: (p: string) => boolean;
  dialogActions: OrderDialogActions & {
    openReturnSlip?: (order: OrderSchemaType) => void;
  };
  orderHasLinkedSlipsCache?: Record<string, boolean>;
  onUpdateQuickNote?: (id: string, note: string) => void;
}

// ─── buildOrderColumns ────────────────────────────────────────────────────────

type OrderGroup = OrderSchemaType & GroupedRowGroup<OrderDetailSchemaType>;
type OrderCol = GroupedRowColumn<OrderDetailSchemaType, OrderGroup>;

function buildOrderColumns(params: {
  availableTags: ApiOrderTag[];
  orderType: 'sale' | 'purchase';
  onUpdateStatus: (orderId: string, status: string) => void;
  hasPermission: (p: string) => boolean;
  dialogActions: OrderDataTableProps['dialogActions'];
  orderHasLinkedSlipsCache?: Record<string, boolean>;
  onUpdateQuickNote?: (id: string, note: string) => void;
}): OrderCol[] {
  const {
    availableTags, orderType,
    onUpdateStatus, hasPermission,
    dialogActions, orderHasLinkedSlipsCache, onUpdateQuickNote,
  } = params;

  const cols = ORDER_TABLE_COLUMN_METADATA;

  return [
    {
      ...cols.orderCode,
      render: (group: OrderGroup) => orderCodeRenderer(group, availableTags),
    },
    {
      ...cols.contractCode,
      render: (group: OrderGroup) => contractCodeRenderer(group),
    },
    {
      ...cols.partner,
      label: orderType === 'purchase' ? 'Nhà cung cấp' : 'Khách hàng',
      render: (group: OrderGroup) => partnerRenderer(group, orderType),
    },
    {
      ...cols.product,
      render: (detail: OrderDetailSchemaType) => productRenderer(detail),
    },
    {
      ...cols.category,
      render: (detail: OrderDetailSchemaType) => categoryRenderer(detail),
    },
    {
      ...cols.unitPrice,
      render: (detail: OrderDetailSchemaType) => unitPriceRenderer(detail),
    },
    {
      ...cols.quantity,
      render: (detail: OrderDetailSchemaType) => quantityRenderer(detail),
    },
    {
      ...cols.vat,
      render: (detail: OrderDetailSchemaType) => vatRenderer(detail),
    },
    {
      ...cols.expenses,
      render: (group: OrderGroup) => expensesRenderer(group),
    },
    {
      ...cols.totalOrderValueExcludingVAT,
      render: (group: OrderGroup) => totalOrderValueExcludingVATRenderer(group),
    },
    {
      ...cols.totalVatValue,
      render: (group: OrderGroup) => totalVatValueRenderer(group),
    },
    {
      ...cols.totalOrderValue,
      render: (group: OrderGroup) => totalOrderValueRenderer(group),
    },
    {
      ...cols.paid,
      render: (group: OrderGroup) => paidRenderer(group),
    },
    {
      ...cols.status,
      render: (group: OrderGroup) => statusRenderer(group, onUpdateStatus, hasPermission),
    },
    {
      ...cols.completedAt,
      render: (group: OrderGroup) => completedAtRenderer(group),
    },
    {
      ...cols.creator,
      render: (group: OrderGroup) => creatorRenderer(group),
    },
    {
      ...cols.note,
      render: (group: OrderGroup) => noteRenderer(group, onUpdateQuickNote),
    },
    {
      ...cols.actions,
      render: (group: OrderGroup) => actionsRenderer(group, dialogActions, orderHasLinkedSlipsCache),
    },
  ];
}

// ─── Main component ───────────────────────────────────────────────────────────

export const OrderDataTable: React.FC<OrderDataTableProps> = ({
  orders, summary,
  isLoading, total, pagination, onPaginationChange,
  selectedIds, onSelectedIdsChange,
  orderType, availableTags,
  onUpdateStatus, hasPermission, dialogActions,
  orderHasLinkedSlipsCache, onUpdateQuickNote,
}) => {
  const navigate = useNavigate();
  const groups = useMemo(
    (): OrderGroup[] => orders.map(order => ({
      ...order,
      id: order.id,
      rows: order.details || []
    })),
    [orders]
  );

  const allColumns = useMemo(
    () => buildOrderColumns({
      availableTags, orderType,
      onUpdateStatus, hasPermission,
      dialogActions, orderHasLinkedSlipsCache, onUpdateQuickNote,
    }),
    [availableTags, orderType, onUpdateStatus, hasPermission, dialogActions, orderHasLinkedSlipsCache, onUpdateQuickNote],
  );

  const alwaysVisibleKeys = useMemo(() => ['orderCode', 'actions'], []);
  const defaultVisibility = useMemo(
    () => allColumns.reduce((acc, col) => ({ ...acc, [String(col.key)]: true }), {} as Record<string, boolean>),
    [allColumns]
  );

  const { columnVisibility, toggleColumn, resetToDefaults, setAllVisible, isVisible, alwaysVisible } =
    useColumnVisibility({
      alwaysVisible: alwaysVisibleKeys,
      defaults: defaultVisibility,
      storageKey: `orders-${orderType}`,
    });

  const columns = useMemo(
    () => allColumns.filter(col => isVisible(String(col.key))),
    [allColumns, isVisible]
  );

  const hasCheckbox = !!onSelectedIdsChange;

  const footer = useMemo(() => (
    <tr className="bg-slate-50 border-t border-slate-200">
      {/* Spacer for checkbox column if present */}
      {hasCheckbox && <td className="px-3 py-2 border-r border-slate-200"></td>}

      {columns.map((col) => {
        const key = String(col.key);
        let content: React.ReactNode = null;
        let align = col.align || (col.type === 'number' ? 'right' : 'left');

        if (key === 'orderCode') {
          content = (
            <div className="flex flex-col">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Tổng cộng</span>
              <span className="text-slate-900 font-semibold whitespace-nowrap">{total} đơn</span>
            </div>
          );
        } else if (key === 'expenses') {
          content = (
            <div className="flex flex-col items-end w-full">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Chi phí</span>
              <span className="text-amber-600 font-semibold tabular-nums">{formatCurrency(summary?.totalExpenses || 0)}</span>
            </div>
          );
        } else if (key === 'totalOrderValueExcludingVAT') {
          content = (
            <div className="flex flex-col items-end w-full">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Tổng giá trị chưa có thuế GTGT</span>
              <span className="text-amber-600 font-semibold tabular-nums">{formatCurrency(summary?.totalAmount || 0)}</span>
            </div>
          );
        } else if (key === 'totalVatValue') {
          content = (
            <div className="flex flex-col items-end w-full">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Tổng tiền thuế GTGT</span>
              <span className="text-amber-600 font-semibold tabular-nums">{formatCurrency(summary?.totalVat || 0)}</span>
            </div>
          );
        } else if (key === 'totalOrderValue') {
          content = (
            <div className="flex flex-col items-end w-full">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Tổng giá trị có thuế GTGT</span>
              <span className="text-amber-600 font-semibold tabular-nums">{formatCurrency(summary?.totalVatAmount || 0)}</span>
            </div>
          );
        } else if (key === 'paid') {
          content = (
            <div className="flex flex-col items-end w-full">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Công nợ</span>
              <span className="text-red-600 font-semibold tabular-nums">{formatCurrency(summary?.totalDebt || 0)}</span>
            </div>
          );
        }

        return (
          <td
            key={key}
            className={cn(
              "px-3 py-2 border-r border-slate-200 last:border-r-0",
              align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
            )}
          >
            {content}
          </td>
        );
      })}
    </tr>
  ), [columns, total, summary]);

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-end px-4 py-2 bg-background border-b border-border/40">
        <ColumnVisibilityPopover
          columns={allColumns}
          visibility={columnVisibility}
          onToggle={toggleColumn}
          onReset={resetToDefaults}
          onSetAll={setAllVisible}
          alwaysVisible={alwaysVisible}
          className="h-8 px-3 rounded-lg bg-muted/40 hover:bg-muted/80 border-border/50 text-[13px]"
        />
      </div>
      <GroupedRowTable<OrderDetailSchemaType, OrderGroup>
        groups={groups}
        columns={columns}
        isLoading={isLoading}
        total={total}
        filters={{ page: pagination.page, limit: pagination.limit }}
        onFiltersChange={(f) => onPaginationChange({ page: f.page, limit: f.limit })}
        selectedIds={selectedIds}
        onSelectedIdsChange={(ids) => onSelectedIdsChange(ids as string[])}
        onRowClick={(_, group) => dialogActions.openView(group)}
        footer={footer}
        containerClassName="h-[calc(100vh-320px)] min-h-[500px] border-0 rounded-none shadow-none"
      />
    </div>
  );
};
