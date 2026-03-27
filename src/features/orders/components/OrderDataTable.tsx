import React, { useState, useMemo, useCallback } from 'react';
import { format, formatDate } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import {
  Eye, Edit, Tag, CreditCard, Package, Banknote,
  Trash2, Download, MoreHorizontal, ChevronRight,
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
import { OrderSchemaType } from '../schemas';

// ─── Prop types ───────────────────────────────────────────────────────────────

export interface OrderDataTableProps {
  orders: OrderSchemaType[];
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
  dialogActions: OrderDialogActions;
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
                : 'bg-amber-50 text-amber-700 border-amber-200',
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
  const isLong =
    statusCode === 'delivery_failed' || statusCode === 'partially_imported';

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
  dialogActions: OrderDialogActions;
}> = ({ order, dialogActions }) => (
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
      <DropdownMenuItem
        onClick={() => dialogActions.openDelete(order)}
        className="cursor-pointer hover:bg-muted text-red-600 focus:text-red-600"
      >
        <Trash2 className="w-4 h-4 mr-2" />Xóa đơn hàng
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

// ─── OrderItemsSection (expandable) ──────────────────────────────────────────

const OrderItemsSection: React.FC<{
  items: OrderSchemaType['details'];
  isExpanded: boolean;
  colSpan: number;
}> = ({ items, isExpanded, colSpan }) => {
  if (!isExpanded) return null;

  return (
    <TableRow className="hover:bg-transparent border-0">
      <TableCell colSpan={colSpan} className="p-0 border-b border-border/50">
        <div className="bg-muted/25 border-y border-dashed border-bolênrder/40">
          {/* Sub-header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] px-12 py-2 border-b border-border/30">
            {['Sản phẩm', 'Hãng sản xuất', 'Đơn giá', 'SL', 'VAT', 'Thành tiền'].map((h, i) => (
              <div
                key={h}
                className={cn(
                  'text-[11px] font-semibold  tracking-wide text-muted-foreground',
                  i >= 2 && 'text-right',
                )}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Item rows */}
          {items?.length ? (
            items.map((item, i) => {
              const lineTotal =
                (item.unitPrice || 0) *
                (item.quantity || 0) *
                (1 + (Number(item.vatPercentage) || 0) / 100);
              return (
                <div
                  key={i}
                  className={cn(
                    'grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] px-12 py-2.5',
                    i % 2 === 1 && 'bg-muted/20',
                    i < items.length - 1 && 'border-b border-border/20',
                  )}
                >
                  <div
                    className="text-sm font-medium text-foreground truncate pr-4"
                    title={item.product?.name}
                  >
                    {item.product?.name || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {item.product?.manufacturer || '—'}
                  </div>
                  <div className="text-sm text-right tabular-nums text-slate-700">
                    {formatCurrency(item.unitPrice)}
                  </div>
                  <div className="text-sm text-right tabular-nums font-medium text-foreground">
                    {item.quantity || 0}
                  </div>
                  <div className="text-sm text-right text-slate-600">
                    {item.vatPercentage || 0}%
                  </div>
                  <div className="text-sm text-right tabular-nums font-semibold text-emerald-700">
                    {formatCurrency(lineTotal)}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-12 py-4 text-sm text-muted-foreground">
              Không có sản phẩm
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

// ─── OrderRow ─────────────────────────────────────────────────────────────────

interface OrderRowProps {
  order: OrderSchemaType;
  isExpanded: boolean;
  isSelected: boolean;
  isEven: boolean;
  onToggleExpand: () => void;
  onSelect: (checked: boolean) => void;
  onUpdateStatus: (id: string, status: string) => void;
  hasPermission: (p: string) => boolean;
  dialogActions: OrderDialogActions;
  availableTags: ApiOrderTag[];
  onRowClick: () => void;
}

const OrderRow: React.FC<OrderRowProps> = ({
  order, isExpanded, isSelected, isEven,
  onToggleExpand, onSelect, onUpdateStatus,
  hasPermission, dialogActions, availableTags, onRowClick,
}) => {
  const phone = maskPhoneNumber(order.customer?.phoneNumber || '');
  const addr = formatAddress(order.customer?.address || '');
  const paid = order.totalPaidAmount ?? 0;
  const debt = order.remainingDebt ?? Math.max(0, (order.totalAmount ?? 0) - paid);
  const itemCount = order.details?.length ?? 0;
  const totalQty = order.details?.reduce((s, d) => s + (d.quantity || 0), 0) ?? 0;
  const expenses =
    order.totalExpenses ??
    order.expenses?.reduce((s, e) => s + (Number(e.amount) || 0), 0) ??
    0;

  return (
    <TableRow
      className={cn(
        'border-b border-border/40 transition-colors group',
        isEven ? 'bg-background' : 'bg-muted/35',
        isSelected && '!bg-primary/5',
        isExpanded && '!bg-primary/[0.04] border-b-0',
        'hover:bg-muted/60',
      )}
    >
      {/* ── Checkbox ── */}
      <TableCell className="px-3 py-3 w-8 border-r border-border/30">
        <Checkbox
          checked={isSelected}
          onCheckedChange={c => onSelect(!!c)}
          aria-label={`Chọn ${order.code}`}
          className="h-3.5 w-3.5"
          onClick={e => e.stopPropagation()}
        />
      </TableCell>

      {/* ── Mã đơn hàng ── */}
      <TableCell
        className="px-3 py-3 border-r border-border/30 min-w-[165px] cursor-pointer"
        onClick={onRowClick}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm font-semibold text-primary leading-none">
              {order.code}
            </span>
          </div>
          <div className="text-xs text-muted-foreground pl-5">
            {order.createdAt
              ? format(new Date(order.createdAt), 'dd/MM/yy HH:mm')
              : '—'}
          </div>
          <div className="pl-5 flex flex-wrap gap-1">
            <ReconciliationBadge tags={order.tags} availableTags={availableTags} />
          </div>
        </div>
      </TableCell>

      {/* ── Mã số hợp đồng ── */}
      <TableCell className="px-3 py-3 border-r border-border/30 min-w-[150px] cursor-pointer">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm font-semibold text-primary leading-none">
              {order.contractCode}
            </span>
          </div>
        </div>
      </TableCell>

      {/* ── Khách hàng / NCC ── */}
      <TableCell className="px-3 py-3 border-r border-border/30 min-w-[150px] cursor-pointer">
        <div className="space-y-0.5">
          <div
            className="text-sm font-semibold text-foreground truncate max-w-[170px]"
            title={order.customer?.name}
          >
            {order.customer?.name || '—'}
          </div>
          <div className="text-xs text-muted-foreground font-mono">{phone}</div>
          <div
            className="text-xs text-muted-foreground truncate max-w-[170px]"
            title={addr}
          >
            {addr}
          </div>
        </div>
      </TableCell>

      {/* ── Sản phẩm (click to expand) ── */}
      <TableCell
        className="px-3 py-3 border-r border-border/30 cursor-pointer"
        onClick={e => { e.stopPropagation(); onToggleExpand(); }}
      >
        <div className="flex items-center gap-2">
          <div>
            <div className="text-sm font-medium text-foreground whitespace-nowrap">
              {itemCount} sản phẩm
            </div>
            <div className="text-xs text-muted-foreground">{totalQty} đơn vị</div>
          </div>
          <ChevronRight
            className={cn(
              'w-3 h-3 text-muted-foreground/60 shrink-0 transition-transform duration-150',
              isExpanded && 'rotate-90 text-primary',
            )}
          />
        </div>
      </TableCell>

      {/* ── Chi phí ── */}
      <TableCell className="px-3 py-3 border-r border-border/30 text-right">
        <span className="text-sm font-medium text-amber-600 tabular-nums">
          {formatCurrency(expenses)}
        </span>
      </TableCell>

      {/* ── Tổng có VAT ── */}
      <TableCell className="px-3 py-3 border-r border-border/30 text-right">
        <span className="text-sm font-semibold text-emerald-700 tabular-nums">
          {formatCurrency(order.totalVatAmount ?? 0)}
        </span>
      </TableCell>

      {/* ── Thanh toán ── */}
      <TableCell className="px-3 py-3 border-r border-border/30">
        <div className="space-y-0.5 text-right">
          <div className="text-sm font-medium text-emerald-700 tabular-nums flex items-center justify-end gap-1">
            <Banknote className="w-3 h-3 shrink-0" />
            {formatCurrency(paid)}
          </div>
          {debt > 0 && (
            <div className="text-xs font-medium text-red-500 tabular-nums">
              {formatCurrency(debt)}
            </div>
          )}
        </div>
      </TableCell>

      {/* ── Trạng thái ── */}
      <TableCell
        className="px-3 py-3 border-r border-border/30"
        onClick={e => e.stopPropagation()}
      >
        <StatusSelect
          order={order}
          onUpdateStatus={onUpdateStatus}
          hasPermission={hasPermission}
        />
      </TableCell>

      {/* ── Ngày tạo ── */}
      <TableCell className="px-3 py-3 border-r border-border/30">
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-foreground tabular-nums">
            {format(new Date(order.createdAt), 'dd/MM/yyyy')}
          </div>
        </div>
      </TableCell>

      {/* ── Người tạo đơn ── */}
      <TableCell className="px-3 py-3 border-r border-border/30">
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-foreground tabular-nums">
            {order.creator.username}
          </div>
        </div>
      </TableCell>

      {/* ── Thao tác ── */}
      <TableCell className="px-3 py-3" onClick={e => e.stopPropagation()}>
        <ActionsMenu order={order} dialogActions={dialogActions} />
      </TableCell>
    </TableRow>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

// Total columns: checkbox + 8 data cols = 9
const COL_COUNT = 12;

export const OrderDataTable: React.FC<OrderDataTableProps> = ({
  orders, isLoading, total, pagination, onPaginationChange,
  selectedIds, onSelectedIdsChange,
  orderType, availableTags,
  onUpdateStatus, hasPermission, dialogActions,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const isAllSelected =
    orders.length > 0 && orders.every(o => selectedIds.includes(o.id));
  const isSomeSelected =
    orders.some(o => selectedIds.includes(o.id)) && !isAllSelected;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectedIdsChange([...new Set([...selectedIds, ...orders.map(o => o.id)])]);
    } else {
      onSelectedIdsChange(selectedIds.filter(id => !orders.some(o => o.id === id)));
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) onSelectedIdsChange([...selectedIds, id]);
    else onSelectedIdsChange(selectedIds.filter(s => s !== id));
  };

  // Footer aggregates
  const totalQty = useMemo(
    () => orders.reduce((acc, o) => acc + o.details.reduce((s, d) => s + d.quantity, 0), 0),
    [orders],
  );
  const totalCosts = useMemo(
    () => orders.reduce((acc, o) => acc + o.expenses.reduce((s, e) => s + e.amount, 0), 0),
    [orders],
  );
  const totalVatAmount = useMemo(
    () => orders.reduce((acc, o) => acc + (o.totalVatAmount ?? 0), 0),
    [orders],
  );

  const limit = pagination.limit;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="w-full space-y-4">
      {/* ── Table wrapper ── */}
      <div className="overflow-hidden rounded-md border border-border/60 shadow-sm">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
          <Table>
            {/* Sticky header */}
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-muted border-b-2 border-border/60 hover:bg-muted">
                {/* Checkbox col */}
                <TableHead className="w-8 px-3 border-r border-border/50">
                  <Checkbox
                    checked={isAllSelected || (isSomeSelected ? 'indeterminate' : false)}
                    onCheckedChange={c => handleSelectAll(!!c)}
                    className="h-3.5 w-3.5"
                    aria-label="Chọn tất cả"
                  />
                </TableHead>

                {/* Mã đơn hàng */}
                <TableHead className="h-10 px-3 text-xs font-semibold  tracking-wider text-muted-foreground whitespace-nowrap border-r border-border/50">
                  Mã đơn hàng
                </TableHead>

                {/* Mã số hợp đồng */}
                <TableHead className="h-10 px-3 text-xs font-semibold  tracking-wider text-muted-foreground whitespace-nowrap border-r border-border/50">
                  Mã số hợp đồng
                </TableHead>

                {/* Khách hàng */}
                <TableHead className="h-10 px-3 text-xs font-semibold  tracking-wider text-muted-foreground whitespace-nowrap border-r border-border/50">
                  {orderType === 'purchase' ? 'Nhà cung cấp' : 'Khách hàng'}
                </TableHead>

                {/* Sản phẩm */}
                <TableHead className="h-10 px-3 text-xs font-semibold  tracking-wider text-muted-foreground whitespace-nowrap border-r border-border/50">
                  Sản phẩm
                </TableHead>

                {/* Chi phí */}
                <TableHead className="h-10 px-3 text-xs font-semibold  tracking-wider text-muted-foreground whitespace-nowrap border-r border-border/50 text-right">
                  Chi phí
                </TableHead>

                {/* Tổng có VAT */}
                <TableHead className="h-10 px-3 text-xs font-semibold  tracking-wider text-muted-foreground whitespace-nowrap border-r border-border/50 text-right">
                  Tổng có VAT
                </TableHead>

                {/* Thanh toán */}
                <TableHead className="h-10 px-3 text-xs font-semibold  tracking-wider text-muted-foreground whitespace-nowrap border-r border-border/50 text-right">
                  Thanh toán
                </TableHead>

                {/* Trạng thái */}
                <TableHead className="h-10 px-3 text-xs font-semibold  tracking-wider text-muted-foreground whitespace-nowrap border-r border-border/50">
                  Trạng thái
                </TableHead>

                {/* Ngày tạo */}
                <TableHead className="h-10 px-3 text-xs font-semibold  tracking-wider text-muted-foreground whitespace-nowrap border-r border-border/50">
                  Ngày tạo
                </TableHead>

                {/* Người tạo đơn */}
                <TableHead className="h-10 px-3 text-xs font-semibold  tracking-wider text-muted-foreground whitespace-nowrap border-r border-border/50">
                  Người tạo đơn
                </TableHead>

                {/* Thao tác */}
                <TableHead className="h-10 px-3 w-10" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow
                    key={i}
                    className={cn('border-b border-border/30', i % 2 !== 0 && 'bg-muted/35')}
                  >
                    {Array.from({ length: COL_COUNT }).map((_, j) => (
                      <TableCell
                        key={j}
                        className="px-3 py-4 border-r border-border/30 last:border-r-0"
                      >
                        <Skeleton className="h-4 w-full rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={COL_COUNT}
                    className="py-14 text-center text-sm text-muted-foreground"
                  >
                    Không có dữ liệu
                  </TableCell>
                </TableRow>
              ) : (
                orders.flatMap((order, idx) => {
                  const isExpanded = expandedIds.has(order.id);
                  const isSelected = selectedIds.includes(order.id);
                  return [
                    <OrderRow
                      key={`${order.id}-row`}
                      order={order}
                      isExpanded={isExpanded}
                      isSelected={isSelected}
                      isEven={idx % 2 === 0}
                      onToggleExpand={() => toggleExpand(order.id)}
                      onSelect={c => handleSelectRow(order.id, c)}
                      onUpdateStatus={onUpdateStatus}
                      hasPermission={hasPermission}
                      dialogActions={dialogActions}
                      availableTags={availableTags}
                      onRowClick={() => dialogActions.openView(order)}
                    />,
                    <OrderItemsSection
                      key={`${order.id}-section`}
                      items={order.details}
                      isExpanded={isExpanded}
                      colSpan={COL_COUNT}
                    />,
                  ];
                })
              )}
            </TableBody>

            {/* Footer summary */}
            <TableFooter>
              <TableRow className="bg-primary/5 border-t-2 border-primary/20 hover:bg-primary/10">
                <TableCell className="px-3 py-2" />
                <TableCell className="px-3 py-2 font-bold text-primary  text-xs tracking-wide border-r border-border/40">
                  Tổng cộng
                </TableCell>
                <TableCell className="px-3 py-2 text-xs font-semibold text-slate-600 border-r border-border/40">
                  {total} đơn
                </TableCell>
                <TableCell className="px-3 py-2 text-xs font-semibold text-slate-600 border-r border-border/40">
                  {totalQty} đơn vị
                </TableCell>
                <TableCell className="px-3 py-2 text-xs font-semibold text-amber-600 text-right tabular-nums border-r border-border/40">
                  {formatCurrency(totalCosts)}
                </TableCell>
                <TableCell className="px-3 py-2 text-xs font-semibold text-emerald-700 text-right tabular-nums border-r border-border/40">
                  {formatCurrency(totalVatAmount)}
                </TableCell>
                <TableCell className="px-3 py-2 text-xs font-bold text-primary text-right tabular-nums border-r border-border/40">
                  {formatCurrency(totalCosts + totalVatAmount)}
                </TableCell>
                <TableCell className="px-3 py-2 border-r border-border/40" />
                <TableCell className="px-3 py-2" />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>

      {/* ── Pagination ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 py-1">
        <div className="flex items-center gap-2 order-2 sm:order-1">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Hiển thị</span>
          <Select
            value={String(limit)}
            onValueChange={v =>
              onPaginationChange({ ...pagination, limit: parseInt(v, 10), page: 1 })
            }
          >
            <SelectTrigger className="w-[70px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map(opt => (
                <SelectItem key={opt} value={String(opt)} className="text-xs">
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            trong tổng số {total} bản ghi
          </span>
        </div>

        <div className="order-1 sm:order-2">
          <Pagination>
            <PaginationContent className="gap-1">
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={e => {
                    e.preventDefault();
                    if (pagination.page > 1)
                      onPaginationChange({ ...pagination, page: pagination.page - 1 });
                  }}
                  className={cn(
                    'h-8 px-2 text-xs',
                    pagination.page <= 1 && 'pointer-events-none opacity-50',
                  )}
                />
              </PaginationItem>

              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const p = i + 1;
                  if (
                    totalPages > 5 &&
                    p > 1 &&
                    p < totalPages &&
                    (p < pagination.page - 1 || p > pagination.page + 1)
                  ) {
                    if (p === pagination.page - 2 || p === pagination.page + 2) {
                      return (
                        <span key={p} className="px-1 text-muted-foreground text-xs">
                          …
                        </span>
                      );
                    }
                    return null;
                  }
                  return (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={pagination.page === p}
                        onClick={e => {
                          e.preventDefault();
                          onPaginationChange({ ...pagination, page: p });
                        }}
                        className="h-8 w-8 text-xs"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
              </div>

              <div className="flex sm:hidden items-center px-4 text-xs text-muted-foreground">
                Trang {pagination.page} / {totalPages}
              </div>

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={e => {
                    e.preventDefault();
                    if (pagination.page < totalPages)
                      onPaginationChange({ ...pagination, page: pagination.page + 1 });
                  }}
                  className={cn(
                    'h-8 px-2 text-xs',
                    pagination.page >= totalPages && 'pointer-events-none opacity-50',
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
};
