import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PermissionGuard } from '@/components/PermissionGuard';
import { OrderForm, OrderFormMode } from '../components/forms/OrderForm';

const OrderFormPageContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();

  const isEditMode = location.pathname.endsWith('/edit');
  const isCreateMode = !id;
  const mode: OrderFormMode = isCreateMode ? 'create' : isEditMode ? 'edit' : 'view';

  const [isFormDirty, setIsFormDirty] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const isFormDirtyRef = React.useRef(false);
  useEffect(() => { isFormDirtyRef.current = isFormDirty; }, [isFormDirty]);

  // Intercept browser back button when form is dirty
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      if (isCreateMode && isFormDirtyRef.current) {
        window.history.pushState(null, '', window.location.href);
        setShowLeaveDialog(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isCreateMode]);

  // Block browser tab close / refresh when form is dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormDirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFormDirty]);

  const handleGoBack = () => {
    if (isCreateMode && isFormDirty) {
      setShowLeaveDialog(true);
    } else {
      navigate('/orders-new');
    }
  };

  const invalidateAndGoBack = () => {
    queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
    navigate('/orders-new');
  };

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const modeLabel = { create: 'TẠO MỚI', edit: 'CHỈNH SỬA', view: 'CHI TIẾT' }[mode];
  const badgeVariant = { create: 'default', edit: 'warning', view: 'secondary' }[mode] as any;
  const pageTitle = { create: 'Tạo đơn hàng mới', edit: 'Chỉnh sửa đơn hàng', view: 'Chi tiết đơn hàng' }[mode];
  const pageSubtitle = { create: 'Khởi tạo dữ liệu đơn hàng', edit: 'Cập nhật thông tin đơn hàng', view: 'Thông tin chi tiết & lịch sử' }[mode];

  return (
    <>
      <div className="min-h-screen bg-slate-50/50 pb-20">
        <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-slate-200">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={handleGoBack}
                className="gap-2 text-slate-600 hover:text-slate-900 pr-4 border-r border-slate-200 rounded-none h-auto py-1">
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </Button>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  {pageTitle}
                  {id && <span className="text-slate-400 font-normal text-sm ml-2">#{id}</span>}
                </h1>
                <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">{pageSubtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={badgeVariant} className="px-3 py-1 font-bold tracking-wider text-[10px]">{modeLabel}</Badge>
            </div>
          </div>

          {/* Form */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <OrderForm
              mode={mode}
              orderId={id}
              onSuccess={invalidateAndGoBack}
              onCancel={handleGoBack}
              onDirtyChange={isCreateMode ? setIsFormDirty : undefined}
            />
          </div>
        </div>
      </div>
      {/* Navigation guard dialog */}
      <AlertDialog open={showLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rời khỏi trang?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có thay đổi chưa được lưu. Nếu rời đi, dữ liệu sẽ bị mất.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowLeaveDialog(false)}>Ở lại</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setShowLeaveDialog(false); navigate('/orders-new'); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Rời đi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const OrderFormPage: React.FC = () => (
  <PermissionGuard requiredPermissions={['ORDERS_VIEW']}>
    <OrderFormPageContent />
  </PermissionGuard>
);
