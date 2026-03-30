import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { PermissionGuard } from '@/components/PermissionGuard';
import NewOrderForm from '../components/forms/NewOrderForm';
import EditOrderForm from '../components/forms/EditOrderForm';
import ViewOrderForm from '../components/forms/ViewOrderForm';
import { ORDER_QUERY_KEYS } from '../hooks/useOrderQuery';

export type OrderFormMode = "create" | "edit" | "view";

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
      if (isFormDirtyRef.current) {
        window.history.pushState(null, '', window.location.href);
        setShowLeaveDialog(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Block browser tab close / refresh when form is dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormDirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFormDirty]);

  const handleGoBack = () => {
    if (isFormDirty) {
      setShowLeaveDialog(true);
    } else {
      navigate('/orders');
    }
  };

  const invalidateAndGoBack = () => {
    queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.list({}) });
    navigate('/orders');
  };

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  return (
    <>
      <div className="min-h-screen bg-slate-50/50 pb-4">
        <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-6">
          {/* Form */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">{
            mode === "create" ? <NewOrderForm onOrderCreated={invalidateAndGoBack} onCancel={handleGoBack} onDirtyChange={setIsFormDirty} /> :
              mode === "edit" ? <EditOrderForm orderId={id!} onOrderUpdated={invalidateAndGoBack} onCancel={handleGoBack} onDirtyChange={setIsFormDirty} /> :
                <ViewOrderForm orderId={id!} onBack={handleGoBack} />
          }</div>
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
              onClick={() => { setShowLeaveDialog(false); navigate('/orders'); }}
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
