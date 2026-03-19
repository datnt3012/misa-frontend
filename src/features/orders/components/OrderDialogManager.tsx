import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { OrderDialogs, type OrderDialogActions } from './OrderDialogs';
import { orderApi } from '@/api/order.api';
import { getErrorMessage } from '@/lib/error-utils';

export interface OrderDialogManagerHandle {
    openCreate: () => void;
    openView: (order: any) => void;
    openEdit: (order: any) => void;
    openPayment: (order: any) => void;
    openTagsManager: (order: any) => void;
    openExportDelivery: (order: any) => void;
    openExportSlip: (order: any) => void;
    openDelete: (order: any) => void;
    openMultipleDelete: () => void;
    openMultiplePayment: () => void;
}

interface OrderDialogManagerProps {
    orders: any[];
    availableTags: any[];
    selectedIds: string[];
    setSelectedIds: (ids: string[]) => void;
    openDialog: (type: string, id?: string) => void;
    closeDialog: () => void;
    getDialogState: () => any;
    refreshTags: () => void;
}

export const OrderDialogManager = forwardRef<OrderDialogManagerHandle, OrderDialogManagerProps>((props, ref) => {
    const { 
        orders, 
        availableTags, 
        selectedIds, 
        setSelectedIds, 
        openDialog, 
        closeDialog, 
        getDialogState, 
        refreshTags 
    } = props;
    
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const isClosingDialogRef = useRef(false);

    // Dialog Visibility States
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

    useImperativeHandle(ref, () => ({
        openCreate: () => { openDialog('create'); setShowCreateDialog(true); },
        openView: (order) => { setSelectedOrder(order); openDialog('view', order.id); setShowOrderViewDialog(true); },
        openEdit: (order) => { setSelectedOrder(order); openDialog('edit', order.id); setShowOrderDetailDialog(true); },
        openPayment: (order) => { setSelectedOrder(order); openDialog('payment', order.id); setShowPaymentDialog(true); },
        openTagsManager: (order) => { setSelectedOrder(order); setShowTagsManager(true); },
        openExportDelivery: (order) => { setSelectedOrderForDeliveryExport(order); setShowExportDeliveryDialog(true); },
        openExportSlip: (order) => { setSelectedOrderForExport(order); setShowExportSlipDialog(true); },
        openDelete: (order) => { setOrderToDelete(order); setShowDeleteDialog(true); },
        openMultipleDelete: () => setShowDeleteDialog(true),
        openMultiplePayment: () => setShowMultiplePaymentDialog(true),
    }));

    return (
        <OrderDialogs
            selectedOrder={selectedOrder}
            setSelectedOrder={setSelectedOrder}
            showOrderViewDialog={showOrderViewDialog}
            setShowOrderViewDialog={setShowOrderViewDialog}
            showOrderDetailDialog={showOrderDetailDialog}
            setShowOrderDetailDialog={setShowOrderDetailDialog}
            showCreateDialog={showCreateDialog}
            setShowCreateDialog={setShowCreateDialog}
            showPaymentDialog={showPaymentDialog}
            setShowPaymentDialog={setShowPaymentDialog}
            showMultiplePaymentDialog={showMultiplePaymentDialog}
            setShowMultiplePaymentDialog={setShowMultiplePaymentDialog}
            showTagsManager={showTagsManager}
            setShowTagsManager={setShowTagsManager}
            showDeleteDialog={showDeleteDialog}
            setShowDeleteDialog={setShowDeleteDialog}
            orderToDelete={orderToDelete}
            setOrderToDelete={setOrderToDelete}
            showExportSlipDialog={showExportSlipDialog}
            setShowExportSlipDialog={setShowExportSlipDialog}
            selectedOrderForExport={selectedOrderForExport}
            setSelectedOrderForExport={setSelectedOrderForExport}
            showExportDeliveryDialog={showExportDeliveryDialog}
            setShowExportDeliveryDialog={setShowExportDeliveryDialog}
            selectedOrderForDeliveryExport={selectedOrderForDeliveryExport}
            setSelectedOrderForDeliveryExport={setSelectedOrderForDeliveryExport}
            exportingDeliveryPDF={exportingDeliveryPDF}
            setExportingDeliveryPDF={setExportingDeliveryPDF}
            exportingDeliveryXLSX={exportingDeliveryXLSX}
            setExportingDeliveryXLSX={setExportingDeliveryXLSX}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            orders={orders}
            availableTags={availableTags}
            isLoading={false} // Handle internal loading if needed
            isClosingDialogRef={isClosingDialogRef}
            openDialog={openDialog}
            closeDialog={closeDialog}
            refreshTags={refreshTags}
        />
    );
});
OrderDialogManager.displayName = 'OrderDialogManager';
