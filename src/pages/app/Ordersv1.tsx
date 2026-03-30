import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useDialogUrl } from '@/hooks/useDialogUrl';
import { PermissionGuard } from '@/components/PermissionGuard';
import { getErrorMessage } from '@/lib/error-utils';
import { useOrderList, useOrderCatalogs } from '@/features/orders/hooks';
import { ORDER_API } from '@/features/orders/api/order.api';
import { OrderFilter } from '@/features/orders/components/OrderFilter';
import { OrderPageHeader } from '@/features/orders/components/OrderPageHeader';
import { OrderDialogManager, type OrderDialogManagerHandle } from '@/features/orders/components/OrderDialogManager';
import { OrderBulkActions } from '@/features/orders/components/OrderBulkActions';
import { OrderDataTable } from '@/features/orders/components/OrderDataTable';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ToastAction } from "@/components/ui/toast";
import { warehouseReceiptsApi } from "@/api/warehouseReceipts.api";
import { ORDER_TYPES, OrderFilterSchemaType } from '@/features/orders/schemas';

const Ordersv1Content: React.FC = () => {
    const dialogManagerRef = useRef<OrderDialogManagerHandle>(null);
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { openDialog, closeDialog, getDialogState } = useDialogUrl('orders');
    const location = useLocation();

    // ── Hooks ──────────────────────────────────────────────────────────────────
    const [filters, setFilters] = useState<OrderFilterSchemaType>({
        keyword: '',
        page: 1,
        limit: 50,
        type: ORDER_TYPES[0],
    });
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

    const executeStatusUpdate = async (orderId: string, newStatus: string) => {
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
    };

    const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
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
    };

    const handleConfirmedStatusUpdate = () => {
        if (pendingStatusUpdate) {
            setShowPaymentWarningDialog(false);
            executeStatusUpdate(pendingStatusUpdate.orderId, pendingStatusUpdate.status);
        }
    };

    const handleQuickNote = async (orderId: string, note: string) => {
        try {
            await ORDER_API.UPDATE_ORDER(orderId, { note });
            queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
        } catch (error) {
            toast({ title: 'Lỗi', description: getErrorMessage(error, 'Không thể cập nhật ghi chú'), variant: 'destructive' });
        }
    };

    const handleFilterChange = (newFilters: Partial<OrderFilterSchemaType>) => {
        setFilters(prev => ({
            ...prev,
            ...newFilters,
        }));
    };

    return (
        <div className="min-h-screen bg-background pb-10">
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
                {/* Header with Title and Add New Action */}
                <OrderPageHeader
                    onCreateClick={() => navigate('/orders/create')}
                    description="Theo dõi và quản lý tất cả đơn hàng bán và mua của bạn."
                />

                <OrderFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    defaultExpanded={false}
                />

                <Tabs value={filters.type ?? ORDER_TYPES[0]} onValueChange={(value) => handleFilterChange({ type: value as any })} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                        <TabsTrigger value={ORDER_TYPES[0]} className="flex items-center gap-2"><ShoppingCart className="w-4 h-4" />Bán hàng</TabsTrigger>
                        <TabsTrigger value={ORDER_TYPES[1]} className="flex items-center gap-2"><ShoppingBag className="w-4 h-4" />Mua hàng</TabsTrigger>
                    </TabsList>
                </Tabs>

                <OrderBulkActions
                    selectedCount={selectedIds.length}
                    onMultiplePayments={() => dialogManagerRef.current?.openMultiplePayment()}
                    onDelete={() => dialogManagerRef.current?.openMultipleDelete()}
                    onClearSelection={() => setSelectedIds([])}
                />

                <Card className="shadow-premium border-none overflow-hidden">
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
                            dialogActions={{
                                openView: (order) => navigate(`/orders/${order.id}`),
                                openEdit: (order) => navigate(`/orders/${order.id}/edit`),
                                openPayment: (order) => dialogManagerRef.current?.openPayment(order),
                                openTagsManager: (order) => dialogManagerRef.current?.openTagsManager(order),
                                openExportDelivery: (order) => dialogManagerRef.current?.openExportDelivery(order),
                                openExportSlip: (order) => dialogManagerRef.current?.openExportSlip(order, order.type === 'purchase' ? 'import' : 'export'),
                                openReturnSlip: (order) => dialogManagerRef.current?.openExportSlip(order, order.type === 'purchase' ? 'purchase_return' : 'sale_return'),
                                openDelete: (order) => dialogManagerRef.current?.openDelete(order),
                            }}
                        />
                    </CardContent>
                </Card>

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
