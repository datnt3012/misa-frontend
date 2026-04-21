import React from 'react';
import { format } from 'date-fns';
import {
  Banknote, MoreHorizontal, Eye, Edit, Tag, CreditCard, Package,
  Trash2, Download, RotateCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  getOrderStatusConfig,
  ORDER_STATUSES, ORDER_STATUS_LABELS_VI,
  PURCHASE_ORDER_STATUSES, PURCHASE_ORDER_STATUS_LABELS_VI,
} from '@/constants/order-status.constants';
import { formatCurrency, maskPhoneNumber, formatAddress } from '../utils/formatters';
import {
  isReconciledDisplayTag, isPendingDisplayTag,
  getTagDisplayName, mapTagNames,
} from '../utils/tagHelpers';
import { OrderDetailSchemaType, OrderSchemaType } from '../schemas';
import { GroupedRowGroup } from '@/shared/components/GroupedRowTable';
import { ApiOrderTag } from '@/api/orderTags.api';
import { OrderDataTableProps } from './OrderDataTable';

export type OrderGroup = OrderSchemaType & GroupedRowGroup<OrderDetailSchemaType>;

// ─── Reusable Components ──────────────────────────────────────────────────────

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
        <Eye className="w-4 h-4 mr-2" />Chi tiết đơn hàng
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => dialogActions.openEdit(order)} className="cursor-pointer hover:bg-muted">
        <Edit className="w-4 h-4 mr-2" />Chỉnh sửa đơn hàng
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => dialogActions.openTagsManager(order)} className="cursor-pointer hover:bg-muted">
        <Tag className="w-4 h-4 mr-2" />Quản lý nhãn
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => dialogActions.openPayment(order)} className="cursor-pointer hover:bg-muted">
        <CreditCard className="w-4 h-4 mr-2" />Thanh toán
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

// ─── Render functions for grouped columns ──────────────────────────────────────
export const orderCodeRenderer = (group: OrderGroup, availableTags: ApiOrderTag[]) => (
  <div className="space-y-1">
    <span className="font-mono text-sm font-semibold text-slate-900 leading-none">
      {group.code}
    </span>
    <div className="text-xs text-slate-500">
      {group.createdAt ? format(new Date(group.createdAt), 'dd/MM/yy HH:mm') : '—'}
    </div>
    <div className="flex flex-wrap gap-1">
      <ReconciliationBadge tags={group.tags ?? []} availableTags={availableTags} />
    </div>
  </div>
);

export const contractCodeRenderer = (group: OrderGroup) => (
  <span className="font-mono text-sm font-medium text-slate-800 leading-none">
    {group.contractCode || '—'}
  </span>
);

export const partnerRenderer = (group: OrderGroup, orderType: 'sale' | 'purchase') => {
  const phone = maskPhoneNumber(group.customer?.phoneNumber || '');
  const addr = formatAddress(group.customer?.address || '');
  return (
    <div className="space-y-0.5">
      <div className="text-sm font-semibold text-slate-900 truncate max-w-[200px]" title={group.customer?.name}>
        {group.customer?.name || '—'}
      </div>
      <div className="text-xs text-slate-500 font-mono">{phone}</div>
      <div className="text-xs text-slate-500 truncate max-w-[200px]" title={addr}>{addr}</div>
    </div>
  );
};

export const expensesRenderer = (group: OrderGroup) => formatCurrency(group.totalExpenses);

export const totalOrderValueExcludingVATRenderer = (group: OrderGroup) => formatCurrency(group.totalAmount);

export const totalVatValueRenderer = (group: OrderGroup) => formatCurrency(group.totalVat);

export const totalOrderValueRenderer = (group: OrderGroup) => formatCurrency(group.totalVatAmount);

export const paidRenderer = (group: OrderGroup) => {
  const paid = group.totalPaidAmount ?? 0;
  const debt = group.remainingDebt ?? Math.max(0, (group.totalAmount ?? 0) - paid);
  return (
    <div className="space-y-0.5">
      <div className="text-sm font-medium text-emerald-600 tabular-nums flex items-center justify-end gap-1">
        <Banknote className="w-3 h-3 shrink-0" />
        {formatCurrency(paid)}
      </div>
      {debt > 0 && (
        <div className="text-xs font-medium text-red-500 tabular-nums">{formatCurrency(debt)}</div>
      )}
    </div>
  );
};

export const statusRenderer = (
  group: OrderGroup,
  onUpdateStatus: (orderId: string, status: string) => void,
  hasPermission: (p: string) => boolean,
) => (
  <div onClick={(e) => e.stopPropagation()} className="w-full flex items-center justify-center">
    <StatusSelect order={group} onUpdateStatus={onUpdateStatus} hasPermission={hasPermission} />
  </div>
);

export const completedAtRenderer = (group: OrderGroup) => (
  <div className="text-sm text-slate-800">
    {group.completedAt
      ? format(new Date(group.completedAt), 'dd/MM/yyyy')
      : <span className="text-slate-400">—</span>}
  </div>
);

export const creatorRenderer = (group: OrderGroup) => (
  <div className="text-sm text-slate-800">
    {group.creator?.username || <span className="text-slate-400">—</span>}
  </div>
);

export const noteRenderer = (
  group: OrderGroup,
  onUpdateQuickNote?: (id: string, note: string) => void,
) => (
  <div
    className="absolute inset-0 w-full h-full flex items-center justify-center text-center
      text-sm p-2 overflow-auto hover:bg-muted/50 focus:bg-background
      focus:outline-none focus:ring-1 focus:ring-ring break-words whitespace-pre-wrap select-text"
    contentEditable
    suppressContentEditableWarning={true}
    onClick={(e) => e.stopPropagation()}
    onBlur={(e) => onUpdateQuickNote?.(group.id, e.currentTarget.textContent || '')}
    onKeyDown={(e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.currentTarget.blur();
      }
    }}
  >
    {group.note || ''}
  </div>
);

export const actionsRenderer = (
  group: OrderGroup,
  dialogActions: OrderDataTableProps['dialogActions'],
  orderHasLinkedSlipsCache?: Record<string, boolean>,
) => (
  <div onClick={(e) => e.stopPropagation()}>
    <ActionsMenu
      order={group}
      dialogActions={dialogActions}
      orderHasLinkedSlipsCache={orderHasLinkedSlipsCache}
    />
  </div>
);

// Render functions for detail columns
export const productRenderer = (detail: OrderDetailSchemaType) => (
  <span className="text-sm tabular-nums">
    {detail.product?.name}
  </span>
);

export const categoryRenderer = (detail: OrderDetailSchemaType) => (
  <span className="text-sm tabular-nums">
    {detail.product?.category?.name}
  </span>
);

export const unitPriceRenderer = (detail: OrderDetailSchemaType) => formatCurrency(detail.unitPrice);

export const quantityRenderer = (detail: OrderDetailSchemaType) => detail.quantity;

export const vatRenderer = (detail: OrderDetailSchemaType) => {
  const vatRate = detail.vatPercentage ?? 0;
  const vatPrice = detail.vatTotalPrice ?? 0;
  return (
    <div className="space-y-0.5">
      <div className="text-sm tabular-nums">{formatCurrency(vatPrice)}</div>
      <div className="text-xs text-slate-500 tabular-nums">({vatRate}%)</div>
    </div>
  );
};
