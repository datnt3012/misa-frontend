import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  Eye, Edit, Tag, CreditCard, Package, Banknote,
  Trash2, Download, MoreHorizontal, ChevronRight, RotateCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getOrderStatusConfig,
  ORDER_STATUSES, ORDER_STATUS_LABELS_VI,
  PURCHASE_ORDER_STATUSES, PURCHASE_ORDER_STATUS_LABELS_VI,
} from '@/constants/order-status.constants';
import { OrderTag as ApiOrderTag } from '@/api/orderTags.api';
import { formatCurrency, maskPhoneNumber, formatAddress } from '../utils/formatters';
import {
  isReconciledDisplayTag, isPendingDisplayTag,
  getTagDisplayName, mapTagNames,
} from '../utils/tagHelpers';
import { OrderDialogActions } from './OrderDialogs';
import { OrderSchemaType, OrderDetailSchemaType, OrderSummarySchemaType } from '../schemas';
import { StripedDataTable, DataTableColumn } from '@/shared/components/data-tables/StripedDataTable';

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

// ─── ReconciliationBadge ──────────────────────────────────────────────────────

const ReconciliationBadge: React.FC<{
  tags: string[];
  availableTags: ApiOrderTag[];
}> = ({ tags, availableTags }) => {
  const mapped = mapTagNames(tags, availableTags);
  const special = mapped.filter(t => isReconciledDisplayTag(t) || isPendingDisplayTag(t));
  const hasReconciled = special.some(isReconciledDisplayTag);
  const items = special.length > 0 ? special : [null];

  return (
    <span className="inline-flex gap-1">
      {items.map((tag, i) => {
        const reconciled = tag ? isReconciledDisplayTag(tag) : hasReconciled;
        return (
          <Badge
            key={i}
            variant="outline"
            className={cn(
              'text-[10px] px-1.5 py-0 h-4 font-medium border',
              reconciled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-100 text-amber-700 border-amber-200',
            )}
          >
            {tag ? getTagDisplayName(tag) : (reconciled ? 'Đã đối soát' : 'Chưa đối soát')}
          </Badge>
        );
      })}
    </span>
  );
};

// ─── StatusSelect ─────────────────────────────────────────────────────────────

const StatusSelect: React.FC<{
  order: OrderSchemaType;
  onUpdateStatus: (id: string, status: string) => void;
  hasPermission: (p: string) => boolean;
}> = ({ order, onUpdateStatus, hasPermission }) => {
  const statusCode =
    typeof order.status === 'object' ? order.status?.code : (order.status as string);
  const config = getOrderStatusConfig(statusCode, order.type === 'purchase');
  const isLong = statusCode === 'delivery_failed' || statusCode === 'partially_imported';

  return (
    <Select
      value={statusCode || 'pending'}
      onValueChange={s => onUpdateStatus(order.id, s)}
      disabled={!hasPermission('ORDERS_UPDATE_STATUS')}
    >
      <SelectTrigger className="h-auto p-0 border-none bg-transparent hover:bg-transparent w-fit min-w-0">
        <Badge
          variant={config.variant}
          className={cn(config.className, isLong && 'text-[10px] px-1.5 py-0.5 whitespace-nowrap')}
        >
          {config.label}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        {(order.type === 'purchase' ? PURCHASE_ORDER_STATUSES : ORDER_STATUSES).map(s => (
          <SelectItem key={s} value={s}>
            {order.type === 'purchase'
              ? PURCHASE_ORDER_STATUS_LABELS_VI[s as keyof typeof PURCHASE_ORDER_STATUS_LABELS_VI]
              : ORDER_STATUS_LABELS_VI[s as keyof typeof ORDER_STATUS_LABELS_VI]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// ─── ActionsMenu ──────────────────────────────────────────────────────────────

const ActionsMenu: React.FC<{
  order: OrderSchemaType;
  dialogActions: OrderDataTableProps['dialogActions'];
  orderHasLinkedSlipsCache?: Record<string, boolean>;
}> = ({ order, dialogActions, orderHasLinkedSlipsCache }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-50 hover:opacity-100 transition-opacity">
        <MoreHorizontal className="w-4 h-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
      <DropdownMenuItem onClick={() => dialogActions.openView(order)} className="cursor-pointer hover:bg-muted">
        <Eye className="w-4 h-4 mr-2" />Xem chi tiết
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => dialogActions.openEdit(order)} className="cursor-pointer hover:bg-muted">
        <Edit className="w-4 h-4 mr-2" />Sửa đơn
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => dialogActions.openPayment(order)} className="cursor-pointer hover:bg-muted">
        <CreditCard className="w-4 h-4 mr-2" />Thanh toán
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => dialogActions.openTagsManager(order)} className="cursor-pointer hover:bg-muted">
        <Tag className="w-4 h-4 mr-2" />Quản lý nhãn
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => dialogActions.openExportDelivery(order)} className="cursor-pointer hover:bg-muted">
        <Download className="w-4 h-4 mr-2" />
        {order.type === 'purchase' ? 'Xuất biên bản mua hàng' : 'Xuất biên bản giao hàng'}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => dialogActions.openExportSlip(order)} className="cursor-pointer hover:bg-muted">
        <Package className="w-4 h-4 mr-2" />
        {order.type === 'purchase' ? 'Tạo phiếu nhập kho' : 'Tạo phiếu xuất kho'}
      </DropdownMenuItem>
      {orderHasLinkedSlipsCache?.[order.id] !== false && dialogActions.openReturnSlip && (
        <DropdownMenuItem onClick={() => dialogActions.openReturnSlip!(order)} className="cursor-pointer hover:bg-muted">
          <RotateCw className="w-4 h-4 mr-2" />
          {order.type === 'purchase' ? 'Tạo phiếu trả hàng NCC' : 'Tạo phiếu hoàn hàng'}
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        onClick={() => dialogActions.openDelete(order)}
        className="cursor-pointer hover:bg-muted text-red-600 focus:text-red-600"
      >
        <Trash2 className="w-4 h-4 mr-2" />Xóa đơn hàng
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

// ─── OrderItemsSection (expandable sub-row) ───────────────────────────────────

type DetailColumn = {
  key: string;
  title: string;
  headerClassName?: string;
  cellClassName?: string;
  render: (item: OrderDetailSchemaType) => React.ReactNode;
};

const DETAIL_GRID_COLS = 'grid-cols-[4fr_2fr_1fr_1fr_1fr_1fr_1fr_3fr]';

const DETAIL_COLUMNS: DetailColumn[] = [
  { key: 'empty_start', title: '', render: () => null },
  {
    key: 'product',
    title: 'Sản phẩm',
    cellClassName: 'text-sm font-medium text-slate-800 truncate pr-4',
    render: (item) => <span title={item.product?.name}>{item.product?.name || 'N/A'}</span>,
  },
  {
    key: 'manufacturer',
    title: 'Hãng sản xuất',
    cellClassName: 'text-sm text-slate-500 truncate',
    render: (item) => item.product?.manufacturer || '—',
  },
  {
    key: 'unitPrice',
    title: 'Đơn giá',
    headerClassName: 'text-left',
    cellClassName: 'text-sm text-left tabular-nums text-slate-700',
    render: (item) => formatCurrency(item.unitPrice),
  },
  {
    key: 'quantity',
    title: 'SL',
    headerClassName: 'text-left',
    cellClassName: 'text-sm text-left tabular-nums font-medium text-slate-800',
    render: (item) => item.quantity || 0,
  },
  {
    key: 'vatPercentage',
    title: 'VAT',
    headerClassName: 'text-left',
    cellClassName: 'text-sm text-left text-slate-500',
    render: (item) => `${item.vatPercentage || 0}%`,
  },
  {
    key: 'lineTotal',
    title: 'Thành tiền',
    headerClassName: 'text-left',
    cellClassName: 'text-sm text-left tabular-nums font-bold text-emerald-700',
    render: (item) => formatCurrency(
      (item.unitPrice || 0) * (item.quantity || 0) * (1 + (Number(item.vatPercentage) || 0) / 100)
    ),
  },
  { key: 'empty_end', title: '', render: () => null },
];

const OrderItemsSection: React.FC<{
  items: OrderSchemaType['details'];
  isExpanded: boolean;
  colSpan: number;
  rowIndex: number;
}> = ({ items, isExpanded, colSpan, rowIndex }) => {
  if (!isExpanded) return null;

  return (
    <TableRow className="hover:bg-transparent border-b-2 border-border/50">
      <TableCell colSpan={colSpan} className="p-0 border-b border-border/50">
        <div className={cn(rowIndex % 2 !== 0 ? 'bg-muted/60' : 'bg-background')}>
          {/* Sub-header */}
          <div className={cn('grid px-4 py-2 border-b border-border/50 bg-muted/40', DETAIL_GRID_COLS)}>
            {DETAIL_COLUMNS.map((col) => (
              <div
                key={col.key}
                className={cn('text-[11px] text-left font-semibold tracking-wide text-muted-foreground border-r border-border/50 last:border-r-0 px-3', col.headerClassName)}
              >
                {col.title}
              </div>
            ))}
          </div>

          {/* Item rows */}
          {items?.length ? (
            items.map((item, i) => (
              <div
                key={i}
                className={cn(
                  'grid px-4 py-2.5',
                  DETAIL_GRID_COLS,
                  i < items.length - 1 && 'border-b border-border/30',
                )}
              >
                {DETAIL_COLUMNS.map((col) => (
                  <div key={col.key} className={cn('border-r border-border/50 last:border-r-0 px-3 min-w-10 text-left', col.cellClassName)}>
                    {col.render(item)}
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="px-4 py-4 text-sm text-muted-foreground">Không có sản phẩm</div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const OrderDataTable: React.FC<OrderDataTableProps> = ({
  orders, summary,
  isLoading, total, pagination, onPaginationChange,
  selectedIds, onSelectedIdsChange,
  orderType, availableTags,
  onUpdateStatus, hasPermission, dialogActions,
  orderHasLinkedSlipsCache, onUpdateQuickNote,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpandedIds(new Set(orders.map(o => o.id)));
  }, [orders]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const columns = useMemo((): DataTableColumn<OrderSchemaType>[] => [
    {
      key: 'orderCode',
      label: 'Mã đơn hàng',
      render: (order) => (
        <div className="space-y-1">
          <span className="font-mono text-sm font-semibold text-slate-900 leading-none">
            {order.code}
          </span>
          <div className="text-xs text-slate-500">
            {order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yy HH:mm') : '—'}
          </div>
          <div className="flex flex-wrap gap-1">
            <ReconciliationBadge tags={order.tags ?? []} availableTags={availableTags} />
          </div>
        </div>
      ),
    },
    {
      key: 'contractCode',
      label: 'Mã số hợp đồng',
      render: (order) => (
        <span className="font-mono text-sm font-medium text-slate-800 leading-none">
          {order.contractCode || '—'}
        </span>
      ),
    },
    {
      key: 'partner',
      label: orderType === 'purchase' ? 'Nhà cung cấp' : 'Khách hàng',
      render: (order) => {
        const phone = maskPhoneNumber(order.customer?.phoneNumber || '');
        const addr = formatAddress(order.customer?.address || '');
        return (
          <div className="space-y-0.5">
            <div className="text-sm font-semibold text-slate-900 truncate max-w-[170px]" title={order.customer?.name}>
              {order.customer?.name || '—'}
            </div>
            <div className="text-xs text-slate-500 font-mono">{phone}</div>
            <div className="text-xs text-slate-500 truncate max-w-[170px]" title={addr}>{addr}</div>
          </div>
        );
      },
    },
    {
      key: 'product',
      label: 'Sản phẩm',
      onCellClick: (order, e) => { e.stopPropagation(); toggleExpand(order.id); },
      render: (order) => {
        const itemCount = order.details?.length ?? 0;
        const isExpanded = expandedIds.has(order.id);
        const totalQty = order.details?.reduce((s, d) => s + (d.quantity || 0), 0) ?? 0;
        return (
          <div className="flex items-center gap-2 cursor-pointer">
            <div>
              <div className="text-sm font-medium text-slate-800 whitespace-nowrap">{itemCount} sản phẩm</div>
              <div className="text-xs text-slate-500">{totalQty} đơn vị</div>
            </div>
            <ChevronRight
              className={cn(
                'w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150',
                isExpanded && 'rotate-90 text-primary',
              )}
            />
          </div>
        );
      },
    },
    {
      key: 'expenses',
      label: 'Chi phí',
      className: 'text-left',
      render: (order) => (
        <span className="text-sm font-medium text-amber-600 tabular-nums">
          {formatCurrency(order.totalExpenses)}
        </span>
      ),
    },
    {
      key: 'totalOrderValueExcludingVAT',
      label: 'Tổng trước thuế',
      className: 'text-left',
      render: (order) => (
        <span className="text-sm font-medium text-emerald-600 tabular-nums">
          {formatCurrency(order.totalAmount)}
        </span>
      ),
    },
    {
      key: 'totalVatValue',
      label: 'VAT',
      className: 'text-left',
      render: (order) => (
        <span className="text-sm font-medium text-amber-500 tabular-nums">
          {formatCurrency(order.totalVat)}
        </span>
      ),
    },
    {
      key: 'totalOrderValue',
      label: 'Tổng sau thuế',
      className: 'text-left',
      render: (order) => (
        <span className="text-sm font-bold text-emerald-700 tabular-nums">
          {formatCurrency(order.totalVatAmount)}
        </span>
      ),
    },
    {
      key: 'paid',
      label: 'Thanh toán',
      className: 'text-left',
      render: (order) => {
        const paid = order.totalPaidAmount ?? 0;
        const debt = order.remainingDebt ?? Math.max(0, (order.totalAmount ?? 0) - paid);
        return (
          <div className="space-y-0.5">
            <div className="text-sm font-medium text-emerald-600 tabular-nums flex items-center gap-1">
              <Banknote className="w-3 h-3 shrink-0" />
              {formatCurrency(paid)}
            </div>
            {debt > 0 && (
              <div className="text-xs font-medium text-red-500 tabular-nums">{formatCurrency(debt)}</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Trạng thái',
      className: 'w-40',
      onCellClick: (_, e) => e.stopPropagation(),
      render: (order) => (
        <StatusSelect order={order} onUpdateStatus={onUpdateStatus} hasPermission={hasPermission} />
      ),
    },
    {
      key: 'completedAt',
      label: 'Ngày hoàn thành',
      render: (order) => (
        <div className="text-sm text-slate-800">
          {order.completedAt
            ? format(new Date(order.completedAt), 'dd/MM/yyyy')
            : <span className="text-slate-400">—</span>}
        </div>
      ),
    },
    {
      key: 'creator',
      label: 'Người tạo đơn',
      render: (order) => (
        <div className="text-sm text-slate-800">
          {order.creator?.username || <span className="text-slate-400">—</span>}
        </div>
      ),
    },
    {
      key: 'note',
      label: 'Ghi chú',
      cellClassName: 'w-48 relative p-0 h-16',
      onCellClick: (_, e) => e.stopPropagation(),
      render: (order) => (
        <div
          className="absolute inset-0 w-full h-full flex items-center justify-center text-center
            text-sm p-2 overflow-auto hover:bg-muted/50 focus:bg-background
            focus:outline-none focus:ring-1 focus:ring-ring break-words whitespace-pre-wrap select-text"
          contentEditable
          suppressContentEditableWarning={true}
          onBlur={(e) => onUpdateQuickNote?.(order.id, e.currentTarget.textContent || '')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        >
          {order.note || ''}
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (order) => (
        <ActionsMenu
          order={order}
          dialogActions={dialogActions}
          orderHasLinkedSlipsCache={orderHasLinkedSlipsCache}
        />
      ),
    },
  ], [
    availableTags, expandedIds, orderType, toggleExpand,
    onUpdateStatus, hasPermission,
    dialogActions, orderHasLinkedSlipsCache, onUpdateQuickNote,
  ]);

  const footer = useMemo(() => (
    <TableRow className="bg-slate-50 border-t-2 border-slate-200 hover:bg-slate-100/60">
      {[
        { label: 'Tổng cộng', className: 'text-slate-600 font-semibold' },
        { label: `${orders.length} đơn`, className: 'text-slate-600' },
        { label: '', colSpan: 3 },
        { label: formatCurrency(Number(summary?.totalExpenses) || 0), className: 'text-[16px] font-semibold text-amber-600 tabular-nums' },
        // { label: formatCurrency(Number(summary?.totalVat) || 0), className: 'text-amber-600 tabular-nums' },
        // { label: formatCurrency(Number(summary?.totalVatAmount) || 0), className: 'text-emerald-700 font-bold tabular-nums' },
        { label: '', colSpan: 2 },
        { label: formatCurrency(Number(summary?.totalAmount) || 0), className: 'text-[16px] font-semibold text-amber-600 tabular-nums' },
        { label: formatCurrency(Number(summary?.totalDebt) || 0), className: 'text-[16px] font-semibold text-red-600 tabular-nums' },
        { label: '', colSpan: 5 },
      ].map((cell, i) => (
        <TableCell
          key={i}
          colSpan={cell.colSpan}
          className={cn('px-3 py-2.5 text-sm whitespace-nowrap', cell.className)}
        >
          {cell.label}
        </TableCell>
      ))}
    </TableRow>
  ), [orders.length, summary]);

  return (
    <StripedDataTable
      data={orders}
      columns={columns}
      isLoading={isLoading}
      total={total}
      filters={{ page: pagination.page, limit: pagination.limit }}
      onFiltersChange={(f) => onPaginationChange({ page: f.page, limit: f.limit })}
      selectedIds={selectedIds}
      onSelectedIdsChange={onSelectedIdsChange}
      onRowClick={(order) => dialogActions.openView(order)}
      renderSubRow={(order, colSpan, rowIndex) => (
        <OrderItemsSection
          items={order.details}
          isExpanded={expandedIds.has(order.id)}
          colSpan={colSpan}
          rowIndex={rowIndex}
        />
      )}
      footer={footer}
    />
  );
};
