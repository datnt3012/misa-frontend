import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Eye, Edit, Tag, CreditCard, Package, Banknote, Trash2, Download, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataTable } from '@/shared/components/DataTable';
import CreatorDisplay from '@/components/orders/CreatorDisplay';
import { getOrderStatusConfig, ORDER_STATUSES, ORDER_STATUS_LABELS_VI, PURCHASE_ORDER_STATUSES, PURCHASE_ORDER_STATUS_LABELS_VI } from '@/constants/order-status.constants';
import { OrderTag as ApiOrderTag } from '@/api/orderTags.api';
import { formatCurrency } from '../utils/formatters';
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
export interface OrderDialogActions {
  openView: (order: any) => void;
  openEdit: (order: any) => void;
  openPayment: (order: any) => void;
  openTagsManager: (order: any) => void;
  openExportDelivery: (order: any) => void;
  openExportSlip: (order: any) => void;
  openDelete: (order: any) => void;
}

interface OrderDataTableProps {
  orders: any[];
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

  const columns = [
    {
      key: 'order_number',
      label: (
        <button onClick={() => onSort('order_number')} className="flex items-center gap-1 font-medium">
          ID {getSortIcon('order_number')}
        </button>
      ),
      render: (order: any) => {
        const tags = mapTagNames(order.tags, availableTags);
        const specialTags = tags.filter((t) => isReconciledDisplayTag(t) || isPendingDisplayTag(t));
        const hasReconciliation = specialTags.some(isReconciledDisplayTag);
        return (
          <div className="space-y-1 whitespace-nowrap text-center">
            <div className="font-mono text-sm font-medium text-blue-600">{order.order_number}</div>
            <div className="text-xs text-muted-foreground">
              {order.created_at ? format(new Date(order.created_at), 'dd/MM/yyyy HH:mm') : 'N/A'}
            </div>
            <div className="flex gap-1 flex-wrap justify-center">
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
      key: 'customer_name',
      label: (
        <button onClick={() => onSort('customer_name')} className="flex items-center gap-1 font-medium">
          {orderType === 'purchase' ? 'Nhà cung cấp' : 'Khách hàng'} {getSortIcon('customer_name')}
        </button>
      ),
      render: (order: any) => {
        const tags = mapTagNames(order.tags, availableTags);
        const specialTags = tags.filter((t) => isReconciledDisplayTag(t) || isPendingDisplayTag(t));
        const otherTags = tags.filter((t) => !specialTags.includes(t));
        const phone = order.customer_phone || '';
        const maskedPhone = phone.length >= 8 ? `${phone.slice(0, 3)}${'*'.repeat(4)}${phone.slice(-3)}` : phone;
        const addr = order.customer_address || '';
        const addrParts = addr.split(',').map((p: string) => p.trim());
        const shortAddr = addrParts.length >= 2 ? `${addrParts[addrParts.length - 2]} - ${addrParts[addrParts.length - 1]}` : addr;
        return (
          <div className="space-y-1 whitespace-nowrap text-center">
            <div className="text-sm font-medium text-blue-600">{maskedPhone}</div>
            <div className="font-medium truncate" title={order.customer_name}>{order.customer_name}</div>
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
      key: 'items_product',
      label: <span className="font-medium">Sản phẩm</span>,
      render: (order: any) => (
        <div className="divide-y divide-slate-100" data-order-id={order.id}>
          <RowHeightSync orderId={order.id} itemCount={order.items?.length || 0} />
          {order.items?.map((item: any, i: number) => (
            <div key={i} data-item-row data-item-index={i} className="text-sm py-5 px-3 min-h-[60px] flex items-center justify-center">
              <div className="font-medium text-slate-900 truncate w-full text-center" title={item.product_name}>{item.product_name || 'N/A'}</div>
            </div>
          ))}
          {!order.items?.length && <div className="text-sm text-muted-foreground min-h-[60px] flex items-center justify-center">Không có sản phẩm</div>}
        </div>
      ),
    },
    {
      key: 'items_manufacturer',
      label: <span className="font-medium">Hãng sản xuất</span>,
      render: (order: any) => (
        <div className="divide-y divide-slate-100">
          {order.items?.map((item: any, i: number) => (
            <div key={i} data-item-row data-item-index={i} className="text-sm py-5 px-3 min-h-[60px] flex items-center justify-center">
              <div className="font-medium text-slate-900 truncate">{item.manufacturer || '-'}</div>
            </div>
          ))}
          {!order.items?.length && <div className="text-sm text-muted-foreground min-h-[60px] flex items-center justify-center">-</div>}
        </div>
      ),
    },
    {
      key: 'items_price',
      label: <span className="font-medium">Giá</span>,
      render: (order: any) => (
        <div className="divide-y divide-slate-100">
          {order.items?.map((item: any, i: number) => (
            <div key={i} data-item-row data-item-index={i} className="text-sm py-5 px-3 min-h-[60px] flex items-center justify-center">
              <div className="font-medium text-slate-900">{formatCurrency(item.unit_price)}</div>
            </div>
          ))}
          {!order.items?.length && <div className="text-sm text-muted-foreground min-h-[60px] flex items-center justify-center">-</div>}
        </div>
      ),
    },
    {
      key: 'items_qty',
      label: <span className="font-medium">Số lượng</span>,
      render: (order: any) => (
        <div className="divide-y divide-slate-100">
          {order.items?.map((item: any, i: number) => (
            <div key={i} data-item-row data-item-index={i} className="text-sm py-5 px-3 min-h-[60px] flex items-center justify-center">
              <div className="font-medium">{item.quantity || 0}</div>
            </div>
          ))}
          {!order.items?.length && <div className="text-sm text-muted-foreground min-h-[60px] flex items-center justify-center">-</div>}
        </div>
      ),
    },
    {
      key: 'items_vat',
      label: <span className="font-medium">Thuế suất</span>,
      render: (order: any) => (
        <div className="divide-y divide-slate-100">
          {order.items?.map((item: any, i: number) => (
            <div key={i} data-item-row data-item-index={i} className="text-sm py-5 px-3 min-h-[60px] flex items-center justify-center">
              <div className="text-center">
                <div>{formatCurrency(item.vat_price)}</div>
                <div className="text-xs text-slate-500">({item.vat_percentage}%)</div>
              </div>
            </div>
          ))}
          {!order.items?.length && <div className="text-sm text-muted-foreground min-h-[60px] flex items-center justify-center">-</div>}
        </div>
      ),
    },
    {
      key: 'totalExpenses',
      label: <span className="font-medium">Chi phí</span>,
      render: (order: any) => (
        <div className="text-sm font-medium text-orange-600 text-center">
          {formatCurrency(order.totalExpenses ?? order.expenses?.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0) ?? 0)}
        </div>
      ),
    },
    {
      key: 'totalAmount',
      label: <span className="font-medium text-xs">Tổng chưa VAT</span>,
      render: (order: any) => (
        <div className="text-sm font-semibold text-slate-900 text-center">
          {formatCurrency(order.totalAmount ?? order.total_amount ?? 0)}
        </div>
      ),
    },
    {
      key: 'totalVat',
      label: <span className="font-medium text-xs">Tổng tiền VAT</span>,
      render: (order: any) => (
        <div className="text-sm font-semibold text-slate-900 text-center">
          {formatCurrency(order.totalVat ?? order.total_vat ?? 0)}
        </div>
      ),
    },
    {
      key: 'totalVatAmount',
      label: <span className="font-medium text-xs">Tổng có VAT</span>,
      render: (order: any) => (
        <div className="text-sm font-semibold text-slate-900 text-center">
          {formatCurrency(order.totalVatAmount ?? order.total_vat_amount ?? 0)}
        </div>
      ),
    },
    {
      key: 'payment',
      label: <span className="font-medium">Thanh toán</span>,
      render: (order: any) => {
        const total = order.totalAmount ?? order.total_amount ?? 0;
        const paid = order.totalPaidAmount ?? order.paid_amount ?? order.initial_payment ?? 0;
        const debt = order.remainingDebt ?? Math.max(0, total - paid);
        return (
          <div className="space-y-1 text-center">
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
      render: (order: any) => <div className="text-sm text-center">{order.contract_code || '-'}</div>,
    },
    {
      key: 'notes',
      label: <span className="font-medium">Ghi chú</span>,
      render: (order: any) => (
        <div
          className="relative p-2 min-w-[120px] min-h-[60px] flex items-center justify-center
            text-sm text-center overflow-auto hover:bg-muted/50 focus:bg-background
            focus:outline-none focus:ring-1 focus:ring-ring break-words"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onQuickNote(order.id, e.currentTarget.textContent ?? '', order.notes)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
        >
          {order.notes || ''}
        </div>
      ),
    },
    {
      key: 'created_by',
      label: <span className="font-medium">Người tạo</span>,
      render: (order: any) => <CreatorDisplay createdBy={order.created_by} creatorInfo={order.creator_info} />,
    },
    {
      key: 'completed_at',
      label: <span className="font-medium">Ngày hoàn thành</span>,
      render: (order: any) => {
        const completedAt = order.completed_at || order.updated_at;
        const show = ['delivered', 'completed'].includes(order.status?.code);
        return <div className="text-center text-sm">{show && completedAt ? format(new Date(completedAt), 'dd/MM/yyyy HH:mm') : '-'}</div>;
      },
    },
    {
      key: 'status',
      label: <span className="font-medium">Trạng thái</span>,
      render: (order: any) => (
        <Select
          value={typeof order.status === 'object' ? order.status?.code : order.status || 'pending'}
          onValueChange={(s) => onUpdateStatus(order.id, s)}
          disabled={!hasPermission('ORDERS_UPDATE_STATUS')}
        >
          <SelectTrigger className="h-auto p-0 border-none bg-transparent hover:bg-transparent justify-center min-w-[120px]">
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
      render: (order: any) => (
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

  return (
    <DataTable
      columns={columns}
      data={orders}
      isLoading={isLoading}
      total={total}
      filters={pagination}
      onFiltersChange={onPaginationChange}
      selectedIds={selectedIds}
      onSelectedIdsChange={onSelectedIdsChange}
    />
  );
};
