import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useDialogUrl } from '@/hooks/useDialogUrl';
import { PermissionGuard } from '@/components/PermissionGuard';
import { orderApi } from '@/api/order.api';
import { getErrorMessage } from '@/lib/error-utils';
import { useOrderList } from '@/features/orders/hooks';
import { useOrderFilters } from '@/features/orders/hooks';
import { useOrderCatalogs } from '@/features/orders/hooks';
import {
    OrderFilterBar,
    OrderSummary,
    OrderBulkActions,
    OrderDataTable,
    OrderDialogs,
    type OrderDialogActions,
} from '@/features/orders/components';

const OrdersNewContent: React.FC = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { hasPermission } = usePermissions();
    const { openDialog, closeDialog, getDialogState } = useDialogUrl('orders');
    const location = useLocation();
    const isClosingDialogRef = useRef(false);

    // ── Hooks ──────────────────────────────────────────────────────────────────
    const filters = useOrderFilters();
    const catalogs = useOrderCatalogs();
    const { data, isLoading, isFetching } = useOrderList(filters.queryParams);

    const orders = data?.orders ?? [];
    const totalOrders = data?.total ?? 0;
    const summary = data?.summary ?? null;

    // ── Selection ──────────────────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // ── Dialog state ───────────────────────────────────────────────────────────
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [showOrderViewDialog, setShowOrderViewDialog] = useState(false);
    const [showOrderDetailDialog, setShowOrderDetailDialog] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [showMultiplePaymentDialog, setShowMultiplePaymentDialog] = useState(false);
    const [showTagsManager, setShowTagsManager] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<any>(null);
    const [showExportSlipDialog, setShowExportSlipDialog] = useState(false);
    const [selectedOrderForExport, setSelectedOrderForExport] = useState<any>(null);
    const [showExportDeliveryDialog, setShowExportDeliveryDialog] = useState(false);
    const [selectedOrderForDeliveryExport, setSelectedOrderForDeliveryExport] = useState<any>(null);
    const [exportingDeliveryPDF, setExportingDeliveryPDF] = useState(false);
    const [exportingDeliveryXLSX, setExportingDeliveryXLSX] = useState(false);

    // ── Scroll to top on route change ──────────────────────────────────────────
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [location.pathname]);

    // ── URL dialog auto-open ───────────────────────────────────────────────────
    useEffect(() => {
        if (isClosingDialogRef.current) return;
        const dialogState = getDialogState();
        if (!dialogState.isOpen || !dialogState.entityId) return;
        const isOpen =
            (showOrderViewDialog && selectedOrder?.id === dialogState.entityId && dialogState.dialogType === 'view') ||
            (showOrderDetailDialog && selectedOrder?.id === dialogState.entityId);
        if (isOpen) return;
        const open = (o: any) => {
            setSelectedOrder(o);
            dialogState.dialogType === 'view' ? setShowOrderViewDialog(true) : setShowOrderDetailDialog(true);
        };
        const order = orders.find((o) => o.id === dialogState.entityId);
        if (order) open(order);
        else if (orders.length > 0) orderApi.getOrder(dialogState.entityId).then(open).catch(closeDialog);
    }, [getDialogState, orders, showOrderViewDialog, showOrderDetailDialog, selectedOrder, closeDialog]);

    // ── Totals ────────────────────────────────────────────────────────────────
    const totals = summary
        ? { totalAmount: summary.totalAmount, paidAmount: summary.totalPaidAmount || summary.totalInitialPayment, debtAmount: summary.totalDebt, totalExpenses: summary.totalExpenses || 0 }
        : orders.reduce(
            (acc, o: any) => {
                const total = o.totalAmount ?? o.total_amount ?? 0;
                const paid = o.totalPaidAmount ?? o.paid_amount ?? o.initial_payment ?? 0;
                return { totalAmount: acc.totalAmount + total, paidAmount: acc.paidAmount + paid, debtAmount: acc.debtAmount + (o.remainingDebt ?? Math.max(0, total - paid)), totalExpenses: acc.totalExpenses + (o.totalExpenses ?? 0) };
            },
            { totalAmount: 0, paidAmount: 0, debtAmount: 0, totalExpenses: 0 }
        );

    // ── Quick note + status update ─────────────────────────────────────────────
    const handleQuickNote = async (orderId: string, note: string, currentNote: string) => {
        if (note === (currentNote || '')) return;
        try {
            await orderApi.updateOrder(orderId, { note });
            queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
        } catch (error) {
            toast({ title: 'Lỗi', description: getErrorMessage(error, 'Không thể cập nhật ghi chú'), variant: 'destructive' });
        }
    };

    const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
        if (!hasPermission('ORDERS_UPDATE_STATUS')) {
            toast({ title: 'Không có quyền', description: 'Bạn không có quyền cập nhật trạng thái đơn hàng', variant: 'destructive' });
            return;
        }
        try {
            await orderApi.updateOrderStatus(orderId, newStatus);
            queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
            toast({ title: 'Thành công', description: 'Đã cập nhật trạng thái đơn hàng' });
        } catch (error) {
            toast({ title: 'Lỗi', description: getErrorMessage(error, 'Không thể cập nhật trạng thái'), variant: 'destructive' });
        }
    };

    // ── Dialog action callbacks ────────────────────────────────────────────────
    const dialogActions: OrderDialogActions = {
        openView: (order) => { setSelectedOrder(order); openDialog('view', order.id); setShowOrderViewDialog(true); },
        openEdit: (order) => { setSelectedOrder(order); openDialog('edit', order.id); setShowOrderDetailDialog(true); },
        openPayment: (order) => { setSelectedOrder(order); openDialog('payment', order.id); setShowPaymentDialog(true); },
        openTagsManager: (order) => { setSelectedOrder(order); setShowTagsManager(true); },
        openExportDelivery: (order) => { setSelectedOrderForDeliveryExport(order); setShowExportDeliveryDialog(true); },
        openExportSlip: (order) => { setSelectedOrderForExport(order); setShowExportSlipDialog(true); },
        openDelete: (order) => { setOrderToDelete(order); setShowDeleteDialog(true); },
    };

    return (
        <div className="min-h-screen bg-background p-6 sm:p-6 md:p-7">
            <div className="w-full mx-auto space-y-3 sm:space-y-4">

                <OrderFilterBar
                    filters={filters}
                    catalogs={catalogs}
                    isLoading={isLoading || isFetching}
                    onCreateClick={() => { openDialog('create'); setShowCreateDialog(true); }}
                />

                <Tabs value={filters.orderType} onValueChange={(v) => filters.setOrderType(v as 'sale' | 'purchase')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="sale" className="flex items-center gap-2"><ShoppingCart className="w-4 h-4" />Bán hàng</TabsTrigger>
                        <TabsTrigger value="purchase" className="flex items-center gap-2"><ShoppingBag className="w-4 h-4" />Mua hàng</TabsTrigger>
                    </TabsList>
                </Tabs>

                <OrderBulkActions
                    selectedCount={selectedIds.length}
                    onMultiplePayments={() => setShowMultiplePaymentDialog(true)}
                    onDelete={() => setShowDeleteDialog(true)}
                    onClearSelection={() => setSelectedIds([])}
                />

                <Card className="shadow-sm border">
                    <CardContent className="p-0">
                        <OrderDataTable
                            orders={orders}
                            isLoading={isLoading}
                            total={totalOrders}
                            pagination={filters.pagination}
                            onPaginationChange={filters.setPagination}
                            selectedIds={selectedIds}
                            onSelectedIdsChange={setSelectedIds}
                            orderType={filters.orderType}
                            availableTags={catalogs.availableTags}
                            onSort={filters.handleSort}
                            getSortIcon={filters.getSortIcon}
                            onQuickNote={handleQuickNote}
                            onUpdateStatus={handleUpdateOrderStatus}
                            hasPermission={hasPermission}
                            dialogActions={dialogActions}
                        />
                    </CardContent>
                </Card>

                <OrderDialogs
                    selectedOrder={selectedOrder} setSelectedOrder={setSelectedOrder}
                    showOrderViewDialog={showOrderViewDialog} setShowOrderViewDialog={setShowOrderViewDialog}
                    showOrderDetailDialog={showOrderDetailDialog} setShowOrderDetailDialog={setShowOrderDetailDialog}
                    showCreateDialog={showCreateDialog} setShowCreateDialog={setShowCreateDialog}
                    showPaymentDialog={showPaymentDialog} setShowPaymentDialog={setShowPaymentDialog}
                    showMultiplePaymentDialog={showMultiplePaymentDialog} setShowMultiplePaymentDialog={setShowMultiplePaymentDialog}
                    showTagsManager={showTagsManager} setShowTagsManager={setShowTagsManager}
                    showDeleteDialog={showDeleteDialog} setShowDeleteDialog={setShowDeleteDialog}
                    orderToDelete={orderToDelete} setOrderToDelete={setOrderToDelete}
                    showExportSlipDialog={showExportSlipDialog} setShowExportSlipDialog={setShowExportSlipDialog}
                    selectedOrderForExport={selectedOrderForExport} setSelectedOrderForExport={setSelectedOrderForExport}
                    showExportDeliveryDialog={showExportDeliveryDialog} setShowExportDeliveryDialog={setShowExportDeliveryDialog}
                    selectedOrderForDeliveryExport={selectedOrderForDeliveryExport} setSelectedOrderForDeliveryExport={setSelectedOrderForDeliveryExport}
                    exportingDeliveryPDF={exportingDeliveryPDF} setExportingDeliveryPDF={setExportingDeliveryPDF}
                    exportingDeliveryXLSX={exportingDeliveryXLSX} setExportingDeliveryXLSX={setExportingDeliveryXLSX}
                    selectedIds={selectedIds} setSelectedIds={setSelectedIds}
                    orders={orders}
                    availableTags={catalogs.availableTags}
                    isLoading={isLoading}
                    isClosingDialogRef={isClosingDialogRef}
                    openDialog={openDialog}
                    closeDialog={closeDialog}
                    refreshTags={catalogs.refreshTags}
                />

            </div>
        </div>
    );
};

export const OrdersNew = () => (
    <PermissionGuard requiredPermissions={['ORDERS_VIEW']}>
        <OrdersNewContent />
    </PermissionGuard>
);
