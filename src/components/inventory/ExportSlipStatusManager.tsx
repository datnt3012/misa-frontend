import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Package, CheckCircle, Clock, Truck, AlertTriangle, Info } from "lucide-react";
import { exportSlipsApi, type ExportSlip } from "@/api/exportSlips.api";

interface ExportSlipStatusManagerProps {
  exportSlip: ExportSlip;
  onStatusUpdated?: () => void;
}

interface StatusTransition {
  from: string;
  to: string;
  action: string;
  description: string;
  inventoryImpact: string;
  requiresPermission: string;
}

const STATUS_TRANSITIONS: StatusTransition[] = [
  {
    from: 'pending',
    to: 'picked',
    action: 'Đã lấy hàng',
    description: 'Thủ kho xác nhận đã lấy hàng từ kho',
    inventoryImpact: 'Trừ tồn kho theo số lượng trong phiếu',
    requiresPermission: 'WAREHOUSE_MANAGE'
  },
  {
    from: 'picked',
    to: 'exported',
    action: 'Đã xuất kho',
    description: 'Hàng đã rời khỏi kho, hoàn tất quy trình',
    inventoryImpact: 'Chỉ thay đổi trạng thái, không trừ thêm tồn',
    requiresPermission: 'WAREHOUSE_MANAGE'
  },
  {
    from: 'pending',
    to: 'exported',
    action: 'Xuất kho trực tiếp',
    description: 'Admin/Giám đốc chuyển trực tiếp từ Chờ → Đã xuất kho',
    inventoryImpact: 'Trừ tồn kho ngay tại thời điểm đổi',
    requiresPermission: 'ADMIN'
  }
];

export const ExportSlipStatusManager: React.FC<ExportSlipStatusManagerProps> = ({
  exportSlip,
  onStatusUpdated
}) => {
  const [transitionDialog, setTransitionDialog] = useState(false);
  const [selectedTransition, setSelectedTransition] = useState<StatusTransition | null>(null);
  const [transitionNotes, setTransitionNotes] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Chờ
          </Badge>
        );
      case 'picked':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-blue-100 text-blue-800">
            <Package className="w-3 h-3" />
            Đã lấy hàng
          </Badge>
        );
      case 'exported':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Đã xuất kho
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAvailableTransitions = (): StatusTransition[] => {
    return STATUS_TRANSITIONS.filter(transition => {
      // Check if transition is valid for current status
      if (transition.from !== exportSlip.status) return false;
      
      // Check if user has required permission
      if (transition.requiresPermission === 'ADMIN') {
        return hasPermission('ADMIN') || hasPermission('WAREHOUSE_ADMIN');
      }
      
      return hasPermission(transition.requiresPermission);
    });
  };

  const handleStatusTransition = async (transition: StatusTransition) => {
    setSelectedTransition(transition);
    setTransitionNotes('');
    setTransitionDialog(true);
  };

  const executeTransition = async () => {
    if (!selectedTransition) return;

    try {
      setLoading(true);

      let result;
      switch (selectedTransition.to) {
        case 'picked':
          result = await exportSlipsApi.markAsPicked(exportSlip.id, transitionNotes);
          break;
        case 'exported':
          if (selectedTransition.from === 'pending') {
            result = await exportSlipsApi.directExport(exportSlip.id, transitionNotes);
          } else {
            result = await exportSlipsApi.markAsExported(exportSlip.id, transitionNotes);
          }
          break;
        default:
          throw new Error('Invalid transition');
      }

      toast({
        title: "Thành công",
        description: result.message || `Đã chuyển trạng thái sang "${selectedTransition.action}"`,
      });

      setTransitionDialog(false);
      setSelectedTransition(null);
      setTransitionNotes('');
      onStatusUpdated?.();
    } catch (error: any) {
      console.error('Error updating export slip status:', error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể cập nhật trạng thái phiếu xuất kho",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const availableTransitions = getAvailableTransitions();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Quản lý trạng thái phiếu xuất kho
            </div>
            {getStatusBadge(exportSlip.status)}
          </CardTitle>
          <CardDescription>
            Phiếu xuất kho {exportSlip.code} - Đơn hàng: {exportSlip.order?.order_number}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Thông tin trạng thái hiện tại</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="font-medium">Trạng thái:</Label>
                <div className="mt-1">{getStatusBadge(exportSlip.status)}</div>
              </div>
              <div>
                <Label className="font-medium">Người tạo:</Label>
                <p>{exportSlip.creator_profile?.full_name || 'Không xác định'}</p>
              </div>
              <div>
                <Label className="font-medium">Ngày tạo:</Label>
                <p>{formatDateTime(exportSlip.created_at)}</p>
              </div>
              {exportSlip.picked_at && (
                <>
                  <div>
                    <Label className="font-medium">Người lấy hàng:</Label>
                    <p>{exportSlip.picker_profile?.full_name || 'Không xác định'}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Ngày lấy hàng:</Label>
                    <p>{formatDateTime(exportSlip.picked_at)}</p>
                  </div>
                </>
              )}
              {exportSlip.exported_at && (
                <>
                  <div>
                    <Label className="font-medium">Người xuất kho:</Label>
                    <p>{exportSlip.exporter_profile?.full_name || 'Không xác định'}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Ngày xuất kho:</Label>
                    <p>{formatDateTime(exportSlip.exported_at)}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Status Impact Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Ảnh hưởng đến tồn kho:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><strong>Chờ:</strong> Không trừ tồn kho</li>
                  <li><strong>Đã lấy hàng:</strong> Hệ thống trừ tồn kho theo số lượng hàng hóa trong phiếu</li>
                  <li><strong>Đã xuất kho:</strong> Chỉ thay đổi trạng thái, không trừ thêm</li>
                  <li><strong>Ngoại lệ:</strong> Nếu chuyển trực tiếp từ Chờ → Đã xuất kho thì hệ thống trừ tồn kho ngay</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* Available Actions */}
          {availableTransitions.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Thao tác có thể thực hiện</h4>
              <div className="grid gap-3">
                {availableTransitions.map((transition, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-medium">{transition.action}</h5>
                          <Badge variant="outline" className="text-xs">
                            {transition.from} → {transition.to}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{transition.description}</p>
                        <p className="text-xs text-blue-600">
                          <strong>Tác động:</strong> {transition.inventoryImpact}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleStatusTransition(transition)}
                        className="ml-4"
                        size="sm"
                      >
                        {transition.action}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {availableTransitions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Không có thao tác nào khả dụng cho trạng thái hiện tại</p>
              {exportSlip.status === 'exported' && (
                <p className="text-sm mt-2">Phiếu xuất kho đã hoàn tất</p>
              )}
            </div>
          )}

          {/* Notes */}
          {exportSlip.notes && (
            <div>
              <Label className="font-medium">Ghi chú phiếu xuất kho:</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <p className="text-sm">{exportSlip.notes}</p>
              </div>
            </div>
          )}

          {exportSlip.export_notes && (
            <div>
              <Label className="font-medium">Ghi chú xuất kho:</Label>
              <div className="mt-1 p-3 bg-blue-50 rounded-md">
                <p className="text-sm">{exportSlip.export_notes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Transition Dialog */}
      <Dialog open={transitionDialog} onOpenChange={setTransitionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Xác nhận thay đổi trạng thái</DialogTitle>
            <DialogDescription>
              {selectedTransition?.action} - Phiếu xuất kho {exportSlip.code}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Tác động:</strong> {selectedTransition?.inventoryImpact}</p>
                  <p><strong>Mô tả:</strong> {selectedTransition?.description}</p>
                </div>
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="transition-notes">
                Ghi chú {selectedTransition?.action.toLowerCase()}
              </Label>
              <Textarea
                id="transition-notes"
                value={transitionNotes}
                onChange={(e) => setTransitionNotes(e.target.value)}
                placeholder={`Nhập ghi chú cho ${selectedTransition?.action.toLowerCase()}...`}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransitionDialog(false)}>
              Hủy
            </Button>
            <Button 
              onClick={executeTransition}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {selectedTransition?.action}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
