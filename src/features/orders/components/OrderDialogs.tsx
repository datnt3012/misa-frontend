import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { orderApi } from '@/api/order.api';
import { orderTagsApi, OrderTag as ApiOrderTag } from '@/api/orderTags.api';
import { getErrorMessage } from '@/lib/error-utils';
import axiosClient from '@/shared/api/axiosClient';
import CreateOrderForm from '@/components/orders/CreateOrderForm';
import { PaymentDialog } from '@/components/PaymentDialog';
import { OrderTagsManager } from '@/components/orders/OrderTagsManager';
import { MultiplePaymentDialog } from '@/components/MultiplePaymentDialog';
import { OrderSpecificExportSlipCreation } from '@/components/inventory/OrderSpecificExportSlipCreation';
import { getFilenameFromContentDisposition } from '../utils/formatters';
import { mapTagNames } from '../utils/tagHelpers';

export interface OrderDialogActions {
  openView: (order: any) => void;
  openEdit: (order: any) => void;
  openPayment: (order: any) => void;
  openTagsManager: (order: any) => void;
  openExportDelivery: (order: any) => void;
  openExportSlip: (order: any) => void;
  openDelete: (order: any) => void;
}

export interface OrderDialogsState {
  selectedOrder: any;
  setSelectedOrder: (o: any) => void;
  showPaymentDialog: boolean;
  setShowPaymentDialog: (v: boolean) => void;
  showMultiplePaymentDialog: boolean;
  setShowMultiplePaymentDialog: (v: boolean) => void;
  showTagsManager: boolean;
  setShowTagsManager: (v: boolean) => void;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (v: boolean) => void;
  orderToDelete: any;
  setOrderToDelete: (o: any) => void;
  showExportSlipDialog: boolean;
  setShowExportSlipDialog: (v: boolean) => void;
  selectedOrderForExport: any;
  setSelectedOrderForExport: (o: any) => void;
  showExportDeliveryDialog: boolean;
  setShowExportDeliveryDialog: (v: boolean) => void;
  selectedOrderForDeliveryExport: any;
  setSelectedOrderForDeliveryExport: (o: any) => void;
  exportingDeliveryPDF: boolean;
  setExportingDeliveryPDF: (v: boolean) => void;
  exportingDeliveryXLSX: boolean;
  setExportingDeliveryXLSX: (v: boolean) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  orders: any[];
  availableTags: ApiOrderTag[];
  isLoading: boolean;
  isClosingDialogRef: React.MutableRefObject<boolean>;
  openDialog: (type: string, id?: string) => void;
  closeDialog: () => void;
  refreshTags: () => void;
}

export const OrderDialogs: React.FC<OrderDialogsState> = (props) => {
  const {
    selectedOrder, setSelectedOrder,
    showPaymentDialog, setShowPaymentDialog,
    showMultiplePaymentDialog, setShowMultiplePaymentDialog,
    showTagsManager, setShowTagsManager,
    showDeleteDialog, setShowDeleteDialog,
    orderToDelete, setOrderToDelete,
    showExportSlipDialog, setShowExportSlipDialog,
    selectedOrderForExport, setSelectedOrderForExport,
    showExportDeliveryDialog, setShowExportDeliveryDialog,
    selectedOrderForDeliveryExport, setSelectedOrderForDeliveryExport,
    exportingDeliveryPDF, setExportingDeliveryPDF,
    exportingDeliveryXLSX, setExportingDeliveryXLSX,
    selectedIds, setSelectedIds,
    orders, availableTags, isLoading,
    isClosingDialogRef, openDialog, closeDialog, refreshTags,
  } = props;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const closeWithDelay = (closeFn: () => void) => {
    isClosingDialogRef.current = true;
    closeFn();
    closeDialog();
    setTimeout(() => { isClosingDialogRef.current = false; }, 100);
  };

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });

  // ── Export delivery note ────────────────────────────────────────────────────
  const exportDeliveryNote = async (order: any, type: 'pdf' | 'xlsx') => {
    const isPdf = type === 'pdf';
    isPdf ? setExportingDeliveryPDF(true) : setExportingDeliveryXLSX(true);
    try {
      const response = await axiosClient.get(`/orders/${order.id}/export?type=${type}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = getFilenameFromContentDisposition(response.headers['content-disposition'])
        ?? `delivery_note_${order.order_number}.${type}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Thành công', description: `Đã xuất biên bản giao hàng ${order.order_number} ra file ${isPdf ? 'PDF' : 'Excel'}` });
      setShowExportDeliveryDialog(false);
    } catch (error: any) {
      let msg = `Không thể xuất file ${isPdf ? 'PDF' : 'Excel'}`;
      if (error?.response?.data instanceof Blob) {
        try { const json = JSON.parse(await error.response.data.text()); msg = json.message || json.error || msg; }
        catch { msg = `Lỗi từ server: ${error.response.status}`; }
      }
      toast({ title: 'Lỗi', description: msg, variant: 'destructive' });
    } finally {
      isPdf ? setExportingDeliveryPDF(false) : setExportingDeliveryXLSX(false);
    }
  };

  // ── Delete handlers ─────────────────────────────────────────────────────────
  const handleDeleteOrders = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => orderApi.deleteOrder(id)));
      toast({ title: 'Thành công', description: `Đã xóa ${selectedIds.length} đơn hàng` });
      setSelectedIds([]);
      setShowDeleteDialog(false);
      invalidateList();
    } catch (error) {
      toast({ title: 'Lỗi', description: getErrorMessage(error, 'Không thể xóa đơn hàng'), variant: 'destructive' });
    }
  };

  const handleDeleteSingleOrder = async () => {
    if (!orderToDelete) return;
    try {
      const res = await orderApi.deleteOrder(orderToDelete.id);
      toast({ title: 'Thành công', description: (res as any).message || `Đã xóa đơn hàng ${orderToDelete.order_number}` });
      setOrderToDelete(null);
      setShowDeleteDialog(false);
      invalidateList();
    } catch (error) {
      toast({ title: 'Lỗi', description: getErrorMessage(error, 'Không thể xóa đơn hàng'), variant: 'destructive' });
    }
  };

  return (
    <>
      {/* Tags */}
      {showTagsManager && selectedOrder && (
        <OrderTagsManager
          orderId={selectedOrder.id}
          open={showTagsManager}
          onOpenChange={setShowTagsManager}
          onTagsUpdated={() => {
            invalidateList();
            refreshTags();
            if (selectedOrder) orderApi.getOrder(selectedOrder.id).then(setSelectedOrder).catch(() => {});
          }}
          currentTags={mapTagNames(selectedOrder.tags || [], availableTags)}
          availableTags={availableTags}
        />
      )}

      {/* Payment */}
      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={(open) => {
          setShowPaymentDialog(open);
          if (open && selectedOrder?.id) openDialog('payment', selectedOrder.id);
          else if (!open) closeWithDelay(() => setShowPaymentDialog(false));
        }}
        order={selectedOrder}
        onUpdate={invalidateList}
      />

      {/* Multiple Payment */}
      <MultiplePaymentDialog
        open={showMultiplePaymentDialog}
        onOpenChange={(open) => {
          setShowMultiplePaymentDialog(open);
          if (!open) closeWithDelay(() => setShowMultiplePaymentDialog(false));
        }}
        orderIds={selectedIds}
        orders={orders}
        onUpdate={() => { invalidateList(); setSelectedIds([]); }}
        onRemoveOrder={(id) => {
          const newIds = selectedIds.filter((x) => x !== id);
          setSelectedIds(newIds);
        }}
      />

      {/* Export Slip */}
      <Dialog open={showExportSlipDialog} onOpenChange={setShowExportSlipDialog}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedOrderForExport?.type === 'purchase' ? 'Tạo phiếu nhập kho' : 'Tạo phiếu xuất kho'}</DialogTitle>
            <DialogDescription>
              {selectedOrderForExport && (
                <>{selectedOrderForExport.type === 'purchase' ? 'Tạo phiếu nhập kho' : 'Tạo phiếu xuất kho'} cho đơn hàng <strong>{selectedOrderForExport.order_number}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedOrderForExport && (
              <OrderSpecificExportSlipCreation
                orderId={selectedOrderForExport.id}
                orderType={selectedOrderForExport.type}
                onExportSlipCreated={() => {
                  setShowExportSlipDialog(false);
                  const { order_number, type } = selectedOrderForExport;
                  setSelectedOrderForExport(null);
                  toast({ title: 'Thành công', description: `Đã tạo ${type === 'purchase' ? 'phiếu nhập kho' : 'phiếu xuất kho'} cho đơn hàng ${order_number}` });
                  invalidateList();
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => { setShowDeleteDialog(open); if (!open) { setOrderToDelete(null); setSelectedIds([]); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa đơn hàng</DialogTitle>
            <DialogDescription>
              {orderToDelete
                ? <>Bạn có chắc chắn muốn xóa đơn hàng <strong>{orderToDelete.order_number}</strong>? Hành động này không thể hoàn tác.</>
                : <>Bạn có chắc chắn muốn xóa {selectedIds.length} đơn hàng đã chọn? Hành động này không thể hoàn tác.</>
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setOrderToDelete(null); setSelectedIds([]); }}>Hủy</Button>
            <Button variant="destructive" onClick={orderToDelete ? handleDeleteSingleOrder : handleDeleteOrders} disabled={isLoading}>
              {isLoading ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Delivery Note */}
      <Dialog open={showExportDeliveryDialog} onOpenChange={setShowExportDeliveryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xuất biên bản giao hàng</DialogTitle>
            <DialogDescription>
              {selectedOrderForDeliveryExport && (
                <>Chọn định dạng xuất cho đơn hàng <strong>{selectedOrderForDeliveryExport.order_number}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Button
              onClick={() => selectedOrderForDeliveryExport && exportDeliveryNote(selectedOrderForDeliveryExport, 'pdf')}
              disabled={exportingDeliveryPDF || exportingDeliveryXLSX}
              className="w-full" variant="outline"
            >
              <FileDown className="w-4 h-4 mr-2" />
              {exportingDeliveryPDF ? 'Đang xuất PDF...' : 'Xuất PDF'}
            </Button>
            <Button
              onClick={() => selectedOrderForDeliveryExport && exportDeliveryNote(selectedOrderForDeliveryExport, 'xlsx')}
              disabled={exportingDeliveryPDF || exportingDeliveryXLSX}
              className="w-full" variant="outline"
            >
              <FileDown className="w-4 h-4 mr-2" />
              {exportingDeliveryXLSX ? 'Đang xuất Excel...' : 'Xuất Excel'}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDeliveryDialog(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
