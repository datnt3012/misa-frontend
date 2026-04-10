import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, ShoppingBag, RotateCcw, Plus, FunnelPlus, FunnelX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useDialogUrl } from '@/hooks/useDialogUrl';
import { PermissionGuard } from '@/components/PermissionGuard';
import { getErrorMessage } from '@/lib/error-utils';
import { useOrderList, useOrderCatalogs } from '@/features/orders/hooks';
import { ORDER_API } from '@/features/orders/api/order.api';
import { OrderFilter } from '@/features/orders/components/OrderFilter';
import { OrderDialogManager, type OrderDialogManagerHandle } from '@/features/orders/components/OrderDialogManager';
import { OrderBulkActions } from '@/features/orders/components/OrderBulkActions';
import { OrderDataTable } from '@/features/orders/components/OrderDataTable';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ToastAction } from "@/components/ui/toast";
import { warehouseReceiptsApi } from "@/api/warehouseReceipts.api";
import { ORDER_TYPES, OrderFilterSchemaType } from '@/features/orders/schemas';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PaginationBar } from '@/shared/components/Pagination';

const DEFAULT_FILTERS: OrderFilterSchemaType = {
    keyword: '',
    page: 1,
    limit: 50,
    type: ORDER_TYPES[0],
}

const Ordersv1Content: React.FC = () => {
    const dialogManagerRef = useRef<OrderDialogManagerHandle>(null);
    const navigate = useNavigate();
    const [isExpanded, setIsExpanded] = useState(false);
    const { hasPermission } = usePermissions();
    const { openDialog, closeDialog, getDialogState } = useDialogUrl('orders');
    const location = useLocation();

    // ── Hooks ──────────────────────────────────────────────────────────────────
    const [filters, setFilters] = useState<OrderFilterSchemaType>(DEFAULT_FILTERS);
    const catalogs = useOrderCatalogs();
    const { data, isLoading, isFetching } = useOrderList(filters);
    const orders = data?.data?.rows ?? [];
    const summary = data?.data?.summary ?? null;

    // ── Selection ──────────────────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // ── Scroll to top on route change ──────────────────────────────────────────
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [location.pathname]);

    // ── Quick note + status update ─────────────────────────────────────────────
    // Note: These could also be moved to a hook if needed
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const [orderHasLinkedSlipsCache, setOrderHasLinkedSlipsCache] = useState<Record<string, boolean>>({});
    const [checkingLinkedSlips, setCheckingLinkedSlips] = useState<Set<string>>(new Set());
    const [showPaymentWarningDialog, setShowPaymentWarningDialog] = useState(false);
    const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{ orderId: string, status: string } | null>(null);

    const checkOrderHasLinkedSlips = useCallback(async (orderId: string) => {
        if (orderHasLinkedSlipsCache[orderId] !== undefined) return orderHasLinkedSlipsCache[orderId];
        if (checkingLinkedSlips.has(orderId)) return false;

        setCheckingLinkedSlips(prev => new Set(prev).add(orderId));
        try {
            const exportSlipsResponse = await warehouseReceiptsApi.getReceipts({ orderId, limit: 100, type: 'export,purchase_return_note' });
            const validExportSlips = exportSlipsResponse?.receipts?.filter((s: any) => s.status === 'picked' || s.status === 'exported') || [];
            if (validExportSlips.length > 0) {
                setOrderHasLinkedSlipsCache(prev => ({ ...prev, [orderId]: true }));
                return true;
            }
            const importSlipsResponse = await warehouseReceiptsApi.getReceipts({ orderId, limit: 100 });
            const validImportSlips = importSlipsResponse?.receipts?.filter((s: any) => s.status === 'approved') || [];
            const hasLinked = validImportSlips.length > 0 || validExportSlips.length > 0;
            setOrderHasLinkedSlipsCache(prev => ({ ...prev, [orderId]: hasLinked }));
            return hasLinked;
        } catch {
            setOrderHasLinkedSlipsCache(prev => ({ ...prev, [orderId]: false }));
            return false;
        } finally {
            setCheckingLinkedSlips(prev => {
                const next = new Set(prev);
                next.delete(orderId);
                return next;
            });
        }
    }, [orderHasLinkedSlipsCache, checkingLinkedSlips]);

    useEffect(() => {
        if (orders?.length) {
            orders.forEach((o: any) => {
                if (o.id && orderHasLinkedSlipsCache[o.id] === undefined && !checkingLinkedSlips.has(o.id)) {
                    checkOrderHasLinkedSlips(o.id);
                }
            });
        }
    }, [orders, orderHasLinkedSlipsCache, checkingLinkedSlips, checkOrderHasLinkedSlips]);

    const executeStatusUpdate = useCallback(async (orderId: string, newStatus: string) => {
        try {
            await ORDER_API.UPDATE_ORDER_STATUS(orderId, { status: newStatus });
            queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
            toast({ title: 'Thành công', description: 'Đã cập nhật trạng thái đơn hàng' });
        } catch (error: any) {
            const errorDetails = error.response?.data?.details;
            const warehouseReceipts = errorDetails?.warehouseReceipts || {};
            const exportCodes = warehouseReceipts?.export || [];
            const returnCodes = warehouseReceipts?.sale_return_note || [];

            let toastAction: React.ReactNode = undefined;
            const exportSearchQuery = exportCodes.join(',');
            const exportAction = exportCodes.length > 0 ? (
                <ToastAction altText="Xem phiếu xuất" onClick={() => window.open(`/export-import?tab=exports&search=${encodeURIComponent(exportSearchQuery)}`, '_blank')}>Phiếu xuất ({exportCodes.length})</ToastAction>
            ) : null;

            const returnSearchQuery = returnCodes.join(',');
            const returnAction = returnCodes.length > 0 ? (
                <ToastAction altText="Xem phiếu hoàn" onClick={() => window.open(`/export-import?tab=imports&search=${encodeURIComponent(returnSearchQuery)}`, '_blank')}>Phiếu hoàn ({returnCodes.length})</ToastAction>
            ) : null;

            if (exportAction && returnAction) {
                toastAction = <div className="flex flex-row gap-2 w-full">{exportAction}{returnAction}</div>;
            } else if (exportAction) {
                toastAction = exportAction;
            } else if (returnAction) {
                toastAction = returnAction;
            }

            const toastOptions: any = {
                title: "Lỗi",
                description: error.response?.data?.message || getErrorMessage(error, "Không thể cập nhật trạng thái"),
                variant: "destructive",
                action: toastAction,
            };
            if (toastAction) {
                toastOptions.layout = "stacked";
            }
            toast(toastOptions);
        } finally {
            setPendingStatusUpdate(null);
        }
    }, [queryClient, toast]);

    const handleUpdateOrderStatus = useCallback(async (orderId: string, newStatus: string) => {
        if (!hasPermission('ORDERS_UPDATE_STATUS')) {
            toast({ title: 'Không có quyền', description: 'Bạn không có quyền cập nhật trạng thái đơn hàng', variant: 'destructive' });
            return;
        }

        if (newStatus === 'cancelled') {
            const order = orders?.find((o: any) => o.id === orderId) as any;
            const paidAmount = order?.totalPaidAmount ?? order?.total_paid_amount ?? order?.paid_amount ?? order?.initialPayment ?? order?.initial_payment ?? 0;
            if (paidAmount > 0) {
                setPendingStatusUpdate({ orderId, status: newStatus });
                setShowPaymentWarningDialog(true);
                return;
            }
        }
        await executeStatusUpdate(orderId, newStatus);
    }, [hasPermission, toast, orders, executeStatusUpdate]);

    const handleConfirmedStatusUpdate = useCallback(() => {
        if (pendingStatusUpdate) {
            setShowPaymentWarningDialog(false);
            executeStatusUpdate(pendingStatusUpdate.orderId, pendingStatusUpdate.status);
        }
    }, [pendingStatusUpdate, executeStatusUpdate]);

    const handleQuickNote = useCallback(async (orderId: string, note: string) => {
        try {
            await ORDER_API.UPDATE_ORDER(orderId, { note });
            queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
        } catch (error) {
            toast({ title: 'Lỗi', description: getErrorMessage(error, 'Không thể cập nhật ghi chú'), variant: 'destructive' });
        }
    }, [queryClient, toast]);

    const handleFilterChange = useCallback((newFilters: Partial<OrderFilterSchemaType>) => {
        setFilters(prev => ({
            ...prev,
            ...newFilters,
        }));
    }, []);

    const dialogActions = useMemo(() => ({
        openView: (order: any) => navigate(`/orders/${order.id}`),
        openEdit: (order: any) => navigate(`/orders/${order.id}/edit`),
        openPayment: (order: any) => dialogManagerRef.current?.openPayment(order),
        openTagsManager: (order: any) => dialogManagerRef.current?.openTagsManager(order),
        openExportDelivery: (order: any) => dialogManagerRef.current?.openExportDelivery(order),
        openExportSlip: (order: any) => dialogManagerRef.current?.openExportSlip(order, order.type === 'purchase' ? 'import' : 'export'),
        openReturnSlip: (order: any) => dialogManagerRef.current?.openExportSlip(order, order.type === 'purchase' ? 'purchase_return' : 'sale_return'),
        openDelete: (order: any) => dialogManagerRef.current?.openDelete(order),
    }), [navigate]);

    return (
        <div className="min-h-[calc(100vh-63px)] bg-slate-50/50 dark:bg-background">
            {/* Payment Warning Dialog */}
            <AlertDialog open={showPaymentWarningDialog} onOpenChange={setShowPaymentWarningDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cảnh báo thanh toán</AlertDialogTitle>
                        <AlertDialogDescription>
                            Đơn hàng này đã có thanh toán liên kết. Nếu hủy đơn, bạn cần hoàn tiền cho khách hàng. Bạn có chắc chắn muốn hủy đơn hàng không?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingStatusUpdate(null)}>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmedStatusUpdate}>Tiếp tục hủy</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="w-full mx-auto space-y-6 p-4 md:p-8">

                <div className='flex gap-2'>
                    <Tabs value={filters.type ?? ORDER_TYPES[0]} onValueChange={(value) => handleFilterChange({ type: value as any })} className="w-full">
                        <TabsList className="grid grid-cols-2 lg:w-[400px]">
                            <TabsTrigger value={ORDER_TYPES[0]} className="flex items-center gap-2"><ShoppingCart className="w-4 h-4" />Bán hàng</TabsTrigger>
                            <TabsTrigger value={ORDER_TYPES[1]} className="flex items-center gap-2"><ShoppingBag className="w-4 h-4" />Mua hàng</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Search */}
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Tìm kiếm đơn hàng..."
                            value={filters.keyword}
                            onChange={(e) => handleFilterChange({ keyword: e.target.value })}
                            className='w-50'
                        />

                    </div>

                    {/* reset filter */}
                    <Button
                        type="button"
                        onClick={() => setFilters(DEFAULT_FILTERS)}
                        variant="outline"
                        className="px-6 gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all active:scale-95"
                        title="Làm mới bộ lọc"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </Button>

                    {/* Show filter button */}
                    <Button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        variant="outline"
                        className="px-6 gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all active:scale-95"
                        title="Bộ lọc"
                    >
                        {isExpanded ? <FunnelX className="h-4 w-4" /> : <FunnelPlus className="h-4 w-4" />}
                    </Button>

                    {/* Add order button */}
                    <Button
                        type="button"
                        onClick={() => navigate('/orders/create')}
                        className="px-6 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 transition-all duration-300 active:scale-95 group font-semibold"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Thêm mới</span>
                    </Button>
                </div>

                {isExpanded && (
                    <OrderFilter
                        filters={filters}
                        onFilterChange={handleFilterChange}
                    />
                )}

                <OrderBulkActions
                    selectedCount={selectedIds.length}
                    onMultiplePayments={() => dialogManagerRef.current?.openMultiplePayment()}
                    onDelete={() => dialogManagerRef.current?.openMultipleDelete()}
                    onClearSelection={() => setSelectedIds([])}
                />

                <Card className="shadow-md border border-slate-200/50 overflow-hidden">
                    <CardContent className="p-0">
                        <OrderDataTable
                            orders={orders}
                            summary={summary}
                            isLoading={isLoading || isFetching}
                            total={data?.data?.count ?? 0}
                            pagination={{ page: filters.page || 1, limit: filters.limit || 50 }}
                            onPaginationChange={(p) => handleFilterChange(p)}
                            selectedIds={selectedIds}
                            onSelectedIdsChange={setSelectedIds}
                            orderType={(filters.type === 'purchase' ? 'purchase' : 'sale')}
                            availableTags={catalogs.availableTags}
                            onUpdateStatus={handleUpdateOrderStatus}
                            hasPermission={hasPermission}
                            orderHasLinkedSlipsCache={orderHasLinkedSlipsCache}
                            onUpdateQuickNote={handleQuickNote}
                            dialogActions={dialogActions}
                        />
                    </CardContent>
                </Card>

                {/* Pagination */}
                {/* <div className='mt-0'>
                   
                </div> */}
                <PaginationBar
                    filters={{ page: filters.page, limit: filters.limit }}
                    total={data?.data?.count ?? 0}
                    onFiltersChange={(f) => handleFilterChange({ page: f.page, limit: f.limit })}
                />

                {/* Encapsulated Dialog States and Logic */}
                <OrderDialogManager
                    ref={dialogManagerRef}
                    orders={orders}
                    availableTags={catalogs.availableTags}
                    selectedIds={selectedIds}
                    setSelectedIds={setSelectedIds}
                    openDialog={openDialog}
                    closeDialog={closeDialog}
                    getDialogState={getDialogState}
                    refreshTags={catalogs.refreshTags}
                />
            </div>
        </div>
    );
};


export const Ordersv1 = () => (
    <PermissionGuard requiredPermissions={['ORDERS_VIEW']}>
        <Ordersv1Content />
    </PermissionGuard>
);
