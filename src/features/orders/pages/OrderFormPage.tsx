import React, { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PermissionGuard } from '@/components/PermissionGuard';
import { OrderCreateForm } from '../components/forms/OrderCreateForm';
import { OrderEditForm } from '../components/forms/OrderEditForm';
import { OrderViewForm } from '../components/forms/OrderViewForm';

const OrderFormPageContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();

  // Use location to determine mode
  const isEditMode = location.pathname.endsWith('/edit');
  const isViewMode = Boolean(id) && !isEditMode;
  const isCreateMode = !id;

  const handleGoBack = () => navigate('/orders-new');

  const invalidateAndGoBack = () => {
    queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
    navigate('/orders-new');
  };

  const goToEdit = () => navigate(`/orders-new/${id}/edit`);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-6">
        {/* Navigation / Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-slate-200">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleGoBack}
              className="gap-2 text-slate-600 hover:text-slate-900 pr-4 border-r border-slate-200 rounded-none h-auto py-1"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại
            </Button>
            <div>
               <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                {isCreateMode ? 'Tạo đơn hàng mới' : (isEditMode ? 'Chỉnh sửa đơn hàng' : 'Chi tiết đơn hàng')}
                {id && <span className="text-slate-400 font-normal text-sm ml-2">#{id}</span>}
              </h1>
              <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
                {isCreateMode ? 'Khởi tạo dữ liệu đơn hàng' : 
                 isEditMode ? 'Cập nhật thông tin đơn hàng' : 
                 'Thông tin chi tiết & lịch sử'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <Badge variant={isCreateMode ? "default" : (isEditMode ? "warning" : "secondary" as any)} className="px-3 py-1 font-bold tracking-wider text-[10px]">
               {isCreateMode ? 'TẠO MỚI' : (isEditMode ? 'CHỈNH SỬA' : 'CHI TIẾT')}
             </Badge>
          </div>
        </div>

        {/* Real Form Content (NOT Dialog) */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {isCreateMode ? (
            <OrderCreateForm
              onOrderCreated={invalidateAndGoBack}
              onCancel={handleGoBack}
            />
          ) : isEditMode ? (
            <OrderEditForm
              orderId={id!}
              onOrderUpdated={() => {
                queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
              }}
              onCancel={handleGoBack}
            />
          ) : (
            <OrderViewForm
              orderId={id!}
              onEdit={goToEdit}
              onBack={handleGoBack}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const OrderFormPage: React.FC = () => (
  <PermissionGuard requiredPermissions={['ORDERS_VIEW']}>
    <OrderFormPageContent />
  </PermissionGuard>
);
