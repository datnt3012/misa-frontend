import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Eye, Edit, Tag, CreditCard, Package, Banknote,
  Trash2, Download, MoreHorizontal, RotateCw,
  Plus,
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

  return [
    {
      key: 'orderCode',
      label: 'Mã đơn hàng',
      grouped: true,
      width: 230,
      render: (group: OrderGroup) => (
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
      ),
    },
    {
      key: 'contractCode',
      label: 'Mã số hợp đồng',
      grouped: true,
      width: 140,
      render: (group: OrderGroup) => (
        <span className="font-mono text-sm font-medium text-slate-800 leading-none">
          {group.contractCode || '—'}
        </span>
      ),
    },
    {
      key: 'partner',
      label: orderType === 'purchase' ? 'Nhà cung cấp' : 'Khách hàng',
      grouped: true,
      width: 220,
      render: (group: OrderGroup) => {
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
      },
    },
    {
      key: 'product',
      label: 'Sản phẩm',
      grouped: false,
      width: 250,
      render: (detail: OrderDetailSchemaType) => (
        <span className="text-sm tabular-nums">
          {detail.product?.name}
        </span>
      ),
    },
    {
      key: 'category',
      label: 'Hãng sản xuất',
      grouped: false,
      width: 200,
      render: (detail: OrderDetailSchemaType) => (
        <span className="text-sm tabular-nums">
          {detail.product?.category?.name}
        </span>
      ),
    },
    {
      key: 'unitPrice',
      label: 'Đơn giá',
      grouped: false,
      width: 130,
      type: 'number',
      render: (detail: OrderDetailSchemaType) => formatCurrency(detail.unitPrice),
    },
    {
      key: 'quantity',
      label: 'Số lượng',
      grouped: false,
      width: 100,
      type: 'number',
      render: (detail: OrderDetailSchemaType) => detail.quantity,
    },
    {
      key: 'vat',
      label: 'Thuế suất',
      grouped: false,
      width: 100,
      type: 'number',
      render: (detail: OrderDetailSchemaType) => {
        const vatRate = detail.vatPercentage ?? 0;
        const vatPrice = detail.vatTotalPrice ?? 0;
        return (
          <div className="space-y-0.5">
            <div className="text-sm tabular-nums">{formatCurrency(vatPrice)}</div>
            <div className="text-xs text-slate-500 tabular-nums">({vatRate}%)</div>
          </div>
        );
      },
    },
    {
      key: 'expenses',
      label: 'Chi phí',
      grouped: true,
      width: 130,
      type: 'number',
      render: (group: OrderGroup) => formatCurrency(group.totalExpenses),
    },
    {
      key: 'totalOrderValueExcludingVAT',
      label: 'Tổng giá trị chưa có thuế GTGT',
      grouped: true,
      width: 150,
      type: 'number',
      render: (group: OrderGroup) => formatCurrency(group.totalAmount),
    },
    {
      key: 'totalVatValue',
      label: 'Tổng tiền thuế GTGT',
      grouped: true,
      width: 120,
      type: 'number',
      render: (group: OrderGroup) => formatCurrency(group.totalVat),
    },
    {
      key: 'totalOrderValue',
      label: 'Tổng giá trị có thuế GTGT',
      grouped: true,
      width: 150,
      type: 'number',
      render: (group: OrderGroup) => formatCurrency(group.totalVatAmount),
    },
    {
      key: 'paid',
      label: 'Thanh toán',
      grouped: true,
      width: 160,
      type: 'number',
      render: (group: OrderGroup) => {
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
      },
    },
    {
      key: 'status',
      label: 'Trạng thái',
      width: 160,
      grouped: true,
      render: (group: OrderGroup) => (
        <div onClick={(e) => e.stopPropagation()} className="w-full flex items-center justify-center">
          <StatusSelect order={group} onUpdateStatus={onUpdateStatus} hasPermission={hasPermission} />
        </div>
      ),
    },
    {
      key: 'completedAt',
      label: 'Ngày hoàn thành',
      grouped: true,
      width: 140,
      render: (group: OrderGroup) => (
        <div className="text-sm text-slate-800">
          {group.completedAt
            ? format(new Date(group.completedAt), 'dd/MM/yyyy')
            : <span className="text-slate-400">—</span>}
        </div>
      ),
    },
    {
      key: 'creator',
      label: 'Người tạo đơn',
      grouped: true,
      width: 150,
      render: (group: OrderGroup) => (
        <div className="text-sm text-slate-800">
          {group.creator?.username || <span className="text-slate-400">—</span>}
        </div>
      ),
    },
    {
      key: 'note',
      label: 'Ghi chú',
      width: 300,
      cellClassName: 'relative p-0 h-16',
      grouped: true,
      render: (group: OrderGroup) => (
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
      ),
    },
    {
      key: 'actions',
      label: 'Thao tác',
      width: 60,
      grouped: true,
      render: (group: OrderGroup) => (
        <div onClick={(e) => e.stopPropagation()}>
          <ActionsMenu
            order={group}
            dialogActions={dialogActions}
            orderHasLinkedSlipsCache={orderHasLinkedSlipsCache}
          />
        </div>
      ),
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
    <div className="space-y-2">
      <div className="flex justify-end pr-2 gap-2">
        <ColumnVisibilityPopover
          columns={allColumns}
          visibility={columnVisibility}
          onToggle={toggleColumn}
          onReset={resetToDefaults}
          onSetAll={setAllVisible}
          alwaysVisible={alwaysVisible}
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
        containerClassName="h-[calc(100vh-280px)] min-h-[500px]"
      />
    </div>
  );
};
