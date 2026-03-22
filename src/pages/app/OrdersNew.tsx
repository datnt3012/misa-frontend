import React, { useState, useRef, useEffect } from 'react';
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
import { useOrderList } from '@/features/orders/hooks';
import { useOrderCatalogs } from '@/features/orders/hooks';
import { ORDER_API } from '@/features/orders/api/order.api';
import { OrderFilter } from '@/features/orders/components/OrderFilter';
import { OrderPageHeader } from '@/features/orders/components/OrderPageHeader';
import { OrderDialogManager, type OrderDialogManagerHandle } from '@/features/orders/components/OrderDialogManager';
import { OrderBulkActions } from '@/features/orders/components/OrderBulkActions';
import { OrderDataTable } from '@/features/orders/components/OrderDataTable';
import { ORDER_TYPES, OrderFilterSchemaType } from '@/features/orders/schemas';

const OrdersNewContent: React.FC = () => {
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

    const handleQuickNote = async (orderId: string, note: string, currentNote: string) => {
        if (note === (currentNote || '')) return;
        try {
            await ORDER_API.UPDATE_ORDER(orderId, { note });
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
            await ORDER_API.UPDATE_ORDER_STATUS(orderId, { status: newStatus });
            queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
            toast({ title: 'Thành công', description: 'Đã cập nhật trạng thái đơn hàng' });
        } catch (error) {
            toast({ title: 'Lỗi', description: getErrorMessage(error, 'Không thể cập nhật trạng thái'), variant: 'destructive' });
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
            <div className="w-full mx-auto space-y-6 p-4 md:p-8">
                {/* Header with Title and Add New Action */}
                <OrderPageHeader
                    onCreateClick={() => navigate('/orders-new/create')}
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

                {/* {summary && (
                    <OrderSummary
                        totalOrders={data?.total ?? 0}
                        totalAmount={summary.totalAmount}
                        paidAmount={summary.totalPaidAmount || summary.totalInitialPayment}
                        debtAmount={summary.totalDebt}
                        totalExpenses={summary.totalExpenses || 0}
                        orderType={filters.type as any}
                    />
                )} */}

                <Card className="shadow-premium border-none overflow-hidden">
                    <CardContent className="p-0">
                        <OrderDataTable
                            orders={orders}
                            isLoading={isLoading || isFetching}
                            total={data?.data?.count ?? 0}
                            pagination={{ page: filters.page || 1, limit: filters.limit || 50 }}
                            onPaginationChange={(p) => handleFilterChange(p)}
                            selectedIds={selectedIds}
                            onSelectedIdsChange={setSelectedIds}
                            orderType={(filters.type === 'purchase' ? 'purchase' : 'sale')}
                            availableTags={catalogs.availableTags}
                            onSort={(field) => console.log('Sort', field)}
                            getSortIcon={() => null}
                            onQuickNote={handleQuickNote}
                            onUpdateStatus={handleUpdateOrderStatus}
                            hasPermission={hasPermission}
                            dialogActions={{
                                openView: (order) => navigate(`/orders-new/${order.id}`),
                                openEdit: (order) => navigate(`/orders-new/${order.id}/edit`),
                                openPayment: (order) => dialogManagerRef.current?.openPayment(order),
                                openTagsManager: (order) => dialogManagerRef.current?.openTagsManager(order),
                                openExportDelivery: (order) => dialogManagerRef.current?.openExportDelivery(order),
                                openExportSlip: (order) => dialogManagerRef.current?.openExportSlip(order),
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


export const OrdersNew = () => (
    <PermissionGuard requiredPermissions={['ORDERS_VIEW']}>
        <OrdersNewContent />
    </PermissionGuard>
);
