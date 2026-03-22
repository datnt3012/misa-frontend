import React, { useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Eye, Edit, Tag, CreditCard, Package, Banknote, Trash2, Download, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataTable } from '@/shared/components/DataTable';
import { getOrderStatusConfig, ORDER_STATUSES, ORDER_STATUS_LABELS_VI, PURCHASE_ORDER_STATUSES, PURCHASE_ORDER_STATUS_LABELS_VI } from '@/constants/order-status.constants';
import { OrderTag as ApiOrderTag } from '@/api/orderTags.api';
import { formatCurrency, maskPhoneNumber, formatAddress } from '../utils/formatters';
import { isReconciledDisplayTag, isPendingDisplayTag, getTagDisplayName, mapTagNames } from '../utils/tagHelpers';

// ─── Row height sync (ResizeObserver per row) ─────────────────────────────────
const useSyncRowHeights = (orderId: string, itemCount: number) => {
  useEffect(() => {
    if (itemCount === 0) return;
    const syncHeights = () => {
      const rows = document.querySelectorAll<HTMLElement>(
        `[data-order-id="${orderId}"] [data-item-row]`
      );
      if (rows.length === 0) return;
      const byIndex: Record<number, HTMLElement[]> = {};
      rows.forEach((row) => {
        const idx = parseInt(row.getAttribute('data-item-index') || '0');
        (byIndex[idx] ??= []).push(row);
      });
      Object.values(byIndex).forEach((items) => {
        items.forEach((el) => { el.style.height = 'auto'; });
        const max = Math.max(...items.map((el) => el.offsetHeight));
        items.forEach((el) => { el.style.height = `${max}px`; });
      });
    };
    const timer = setTimeout(syncHeights, 0);
    const raf = requestAnimationFrame(syncHeights);
    const container = document.querySelector<HTMLElement>(`[data-order-id="${orderId}"]`);
    const observer = new ResizeObserver(syncHeights);
    if (container) observer.observe(container);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); observer.disconnect(); };
  }, [orderId, itemCount]);
};

const RowHeightSync: React.FC<{ orderId: string; itemCount: number }> = ({ orderId, itemCount }) => {
  useSyncRowHeights(orderId, itemCount);
  return null;
};

// ─── Dialog action callbacks ──────────────────────────────────────────────────
import { OrderDialogActions } from './OrderDialogs';
import { OrderSchemaType } from '../schemas';
import CreatorDisplay from './CreatorDisplay';

interface OrderDataTableProps {
  orders: OrderSchemaType[];
  isLoading: boolean;
  total: number;
  pagination: { page: number; limit: number };
  onPaginationChange: (p: { page: number; limit: number }) => void;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  orderType: 'sale' | 'purchase';
  availableTags: ApiOrderTag[];
  onSort: (field: string) => void;
  getSortIcon: (field: string) => React.ReactNode;
  onQuickNote: (orderId: string, note: string, currentNote: string) => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  hasPermission: (p: string) => boolean;
  dialogActions: OrderDialogActions;
}

export const OrderDataTable: React.FC<OrderDataTableProps> = ({
  orders, isLoading, total, pagination, onPaginationChange,
  selectedIds, onSelectedIdsChange,
  orderType, availableTags,
  onSort, getSortIcon, onQuickNote, onUpdateStatus, hasPermission, dialogActions,
}) => {
  const getStatusBadge = (status: string, isPurchase = false) => {
    const config = getOrderStatusConfig(status, isPurchase);
    const isLong = status === 'delivery_failed' || status === 'partially_imported';
    return (
      <Badge variant={config.variant} className={cn(config.className, isLong && 'text-[10px] px-1.5 py-0.5')}>
        {config.label}
      </Badge>
    );
  };

  const columns = useMemo(() => {
    return [
      {
        key: 'code',
        label: (
          <button onClick={() => onSort('code')} className="flex items-start gap-1 font-medium">
            ID {getSortIcon('code')}
          </button>
        ),
        render: (order: OrderSchemaType) => {
          const tags = mapTagNames(order.tags, availableTags);
          const specialTags = tags.filter((t) => isReconciledDisplayTag(t) || isPendingDisplayTag(t));
          const hasReconciliation = specialTags.some(isReconciledDisplayTag);
          return (
            <div className="space-y-1 whitespace-nowrap text-left">
              <div className="font-mono text-sm font-medium text-blue-600">{order.code}</div>
              <div className="text-xs text-muted-foreground">
                {order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm') : 'N/A'}
              </div>
              <div className="flex gap-1 flex-wrap justify-start">
                {specialTags.length > 0 ? specialTags.map((tag, i) => (
                  <Badge key={i} variant={isReconciledDisplayTag(tag) ? 'default' : 'secondary'}
                    className={cn('text-xs', isReconciledDisplayTag(tag) ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800')}>
                    {getTagDisplayName(tag)}
                  </Badge>
                )) : (
                  <Badge variant={hasReconciliation ? 'default' : 'secondary'}
                    className={cn('text-xs', hasReconciliation ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800')}>
                    {hasReconciliation ? 'Đã đối soát' : 'Chưa đối soát'}
                  </Badge>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: 'customer',
        label: (
          <button onClick={() => onSort('customer')} className="flex items-start gap-1 font-medium">
            {orderType === 'purchase' ? 'Nhà cung cấp' : 'Khách hàng'} {getSortIcon('customer')}
          </button>
        ),
        render: (order: OrderSchemaType) => {
          const tags = mapTagNames(order.tags, availableTags);
          const specialTags = tags.filter((t) => isReconciledDisplayTag(t) || isPendingDisplayTag(t));
          const otherTags = tags.filter((t) => !specialTags.includes(t));
          const phone = order.customer?.phoneNumber || '';
          const maskedPhone = maskPhoneNumber(phone);
          const addr = order.customer?.address || '';
          const shortAddr = formatAddress(addr);
          return (
            <div className="space-y-1 whitespace-nowrap text-left">
              <div className="text-sm font-medium text-blue-600">{maskedPhone}</div>
              <div className="font-medium truncate" title={order.customer?.name}>{order.customer?.name}</div>
              <div className="text-sm text-muted-foreground truncate" title={shortAddr}>{shortAddr}</div>
              <div className="flex flex-wrap gap-1 justify-center">
                {otherTags.map((tag, i) => tag && (
                  <Badge key={i} variant="outline" className="text-xs" style={{ borderColor: tag.color, color: tag.color }}>
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          );
        },
      },
      {
        key: 'product',
        label: <span className="font-medium">Sản phẩm</span>,
        render: (order: OrderSchemaType) => (
          <div className="divide-y divide-slate-100 text-left" data-order-id={order.id}>
            <RowHeightSync orderId={order.id} itemCount={order.details?.length || 0} />
            {order.details?.map((item, i: number) => (
              <div key={i} data-item-row data-item-index={i} className="text-sm py-5 min-h-[60px] flex items-start justify-center">
                <div className="font-medium text-slate-900 truncate w-full" title={item.product?.name}>{item.product?.name || 'N/A'}</div>
              </div>
            ))}
            {!order.details?.length && <div className="text-sm text-muted-foreground min-h-[60px] flex items-center justify-center">Không có sản phẩm</div>}
          </div>
        ),
      },
      {
        key: 'manufacturer',
        label: <span className="font-medium">Hãng sản xuất</span>,
        render: (order: OrderSchemaType) => (
          <div className="divide-y divide-slate-100">
            {order.details?.map((item, i: number) => (
              <div key={i} data-item-row data-item-index={i} className="text-sm py-5 min-h-[60px] flex items-start">
                <div className="font-medium text-slate-900 truncate text-left">{item.product?.manufacturer || '-'}</div>
              </div>
            ))}
            {!order.details?.length && <div className="text-sm text-muted-foreground min-h-[60px] flex items-center">-</div>}
          </div>
        ),
      },
      {
        key: 'price',
        label: <span className="font-medium">Giá</span>,
        render: (order: OrderSchemaType) => (
          <div className="divide-y divide-slate-100">
            {order.details?.map((item, i: number) => (
              <div key={i} data-item-row data-item-index={i} className="text-sm py-5 min-h-[60px] flex items-start">
                <div className="font-medium text-slate-900">{formatCurrency(item.unitPrice)}</div>
              </div>
            ))}
            {!order.details?.length && <div className="text-sm text-muted-foreground min-h-[60px] flex items-center">-</div>}
          </div>
        ),
      },
      {
        key: 'qty',
        label: <span className="font-medium">Số lượng</span>,
        render: (order: OrderSchemaType) => (
          <div className="divide-y divide-slate-100">
            {order.details?.map((item, i: number) => (
              <div key={i} data-item-row data-item-index={i} className="text-sm py-5 min-h-[60px] flex items-start">
                <div className="font-medium">{item.quantity || 0}</div>
              </div>
            ))}
            {!order.details?.length && <div className="text-sm text-muted-foreground min-h-[60px] flex items-center">-</div>}
          </div>
        ),
      },
      {
        key: 'vat',
        label: <span className="font-medium">Thuế suất</span>,
        render: (order: OrderSchemaType) => (
          <div className="divide-y divide-slate-100">
            {order.details?.map((item, i: number) => (
              <div key={i} data-item-row data-item-index={i} className="text-sm py-5 min-h-[60px] flex items-start">
                <div className="text-center">
                  <div>{formatCurrency(item.vatTotalPrice)}</div>
                  <div className="text-xs text-slate-500">({item.vatPercentage}%)</div>
                </div>
              </div>
            ))}
            {!order.details?.length && <div className="text-sm text-muted-foreground min-h-[60px] flex items-center justify-center">-</div>}
          </div>
        ),
      },
      {
        key: 'totalExpenses',
        label: <span className="font-medium">Chi phí</span>,
        render: (order: OrderSchemaType) => (
          <div className="text-sm font-medium text-orange-600 text-left">
            {formatCurrency(order.totalExpenses ?? order.expenses?.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0) ?? 0)}
          </div>
        ),
      },
      {
        key: 'totalAmount',
        label: <span className="font-medium text-xs">Tổng chưa VAT</span>,
        render: (order: OrderSchemaType) => (
          <div className="text-sm font-semibold text-slate-900 text-left">
            {formatCurrency(order.totalAmount ?? 0)}
          </div>
        ),
      },
      {
        key: 'totalVat',
        label: <span className="font-medium text-xs">Tổng tiền VAT</span>,
        render: (order: OrderSchemaType) => (
          <div className="text-sm font-semibold text-slate-900 text-left">
            {formatCurrency(order.totalVat ?? 0)}
          </div>
        ),
      },
      {
        key: 'totalVatAmount',
        label: <span className="font-medium text-xs">Tổng có VAT</span>,
        render: (order: OrderSchemaType) => (
          <div className="text-sm font-semibold text-slate-900 text-left">
            {formatCurrency(order.totalVatAmount ?? 0)}
          </div>
        ),
      },
      {
        key: 'payment',
        label: <span className="font-medium">Thanh toán</span>,
        render: (order: OrderSchemaType) => {
          const total = order.totalAmount ?? 0;
          const paid = order.totalPaidAmount ?? 0;
          const debt = order.remainingDebt ?? Math.max(0, total - paid);
          return (
            <div className="space-y-1 text-left">
              <div className="text-sm font-medium flex items-center gap-1 justify-center">
                <Banknote className="w-3 h-3" />{formatCurrency(paid)}
              </div>
              <div className="text-sm font-medium text-red-600">{formatCurrency(debt)}</div>
            </div>
          );
        },
      },
      {
        key: 'contract_code',
        label: <span className="font-medium">Số hợp đồng</span>,
        render: (order: OrderSchemaType) => <div className="text-sm text-left">{order.contractCode || '-'}</div>,
      },
      {
        key: 'note',
        label: <span className="font-medium">Ghi chú</span>,
        render: (order: OrderSchemaType) => (
          <div
            className="relative p-2 min-w-[120px] min-h-[60px]
            text-sm text-left overflow-auto hover:bg-muted/50 focus:bg-background
            focus:outline-none focus:ring-1 focus:ring-ring break-words"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onQuickNote(order.id, e.currentTarget.textContent ?? '', order.note)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
          >
            {order.note || ''}
          </div>
        ),
      },
      {
        key: 'creator',
        label: <span className="font-medium">Người tạo</span>,
        render: (order: OrderSchemaType) => <CreatorDisplay createdBy={order.creator?.id} creatorInfo={order.creator} />,
      },
      {
        key: 'completed_at',
        label: <span className="font-medium">Ngày hoàn thành</span>,
        render: (order: OrderSchemaType) => {
          const completedAt = order.completedAt || order.updatedAt;
          const show = ['delivered', 'completed'].includes(order.status?.code);
          return <div className="text-left text-sm">{show && completedAt ? format(new Date(completedAt), 'dd/MM/yyyy HH:mm') : '-'}</div>;
        },
      },
      {
        key: 'status',
        label: <span className="font-medium">Trạng thái</span>,
        render: (order: OrderSchemaType) => (
          <Select
            value={(typeof order.status === 'object' && order.status?.code) || (order.status as string) || 'pending'}
            onValueChange={(s) => onUpdateStatus(order.id, s)}
            disabled={!hasPermission('ORDERS_UPDATE_STATUS')}
          >
            <SelectTrigger className="h-auto p-0 border-none bg-transparent hover:bg-transparent min-w-[120px]">
              <div className="cursor-pointer inline-flex whitespace-nowrap text-xs">
                {getStatusBadge(
                  typeof order.status === 'object' ? order.status?.code : order.status,
                  order.type === 'purchase'
                )}
              </div>
            </SelectTrigger>
            <SelectContent>
              {(order.type === 'purchase' ? PURCHASE_ORDER_STATUSES : ORDER_STATUSES).map((statusKey: string) => (
                <SelectItem key={statusKey} value={statusKey}>
                  {order.type === 'purchase'
                    ? PURCHASE_ORDER_STATUS_LABELS_VI[statusKey as keyof typeof PURCHASE_ORDER_STATUS_LABELS_VI]
                    : ORDER_STATUS_LABELS_VI[statusKey as keyof typeof ORDER_STATUS_LABELS_VI]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        key: 'actions',
        label: <span className="font-medium">Thao tác</span>,
        render: (order: OrderSchemaType) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
              <DropdownMenuItem onClick={() => dialogActions.openDelete(order)} className="cursor-pointer hover:bg-muted text-red-600 focus:text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />Xóa đơn hàng
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ];
  }, [dialogActions, hasPermission, orders, onQuickNote, onUpdateStatus, total, pagination, onPaginationChange, selectedIds, onSelectedIdsChange]);

  return (
    <DataTable
      columns={columns}
      data={orders as (OrderSchemaType & { id: string })[]}
      isLoading={isLoading}
      total={total}
      filters={pagination}
      onFiltersChange={onPaginationChange}
      selectedIds={selectedIds}
      onSelectedIdsChange={onSelectedIdsChange}
    />
  );
};
