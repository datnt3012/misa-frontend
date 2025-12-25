import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { exportSlipsApi, type ExportSlip } from "@/api/exportSlips.api";
import { Package, CheckCircle, XCircle, Clock, FileText, Upload } from "lucide-react";
import { ExportSlipQuantityDialog } from "@/components/inventory/ExportSlipQuantityDialog";
import { LoadingWrapper } from "@/components/LoadingWrapper";
interface ExportSlipComponentProps {
  orderId: string;
  onUpdate?: () => void;
}
export const ExportSlipComponent: React.FC<ExportSlipComponentProps> = ({ orderId, onUpdate }) => {
  const [exportSlip, setExportSlip] = useState<ExportSlip | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [quantityDialog, setQuantityDialog] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  useEffect(() => {
    loadExportSlip();
  }, [orderId]);
  const loadExportSlip = async () => {
    try {
      // Get export slip by order ID
      const slip = await exportSlipsApi.getSlipByOrderId(orderId);
      if (slip) {
        setExportSlip(slip);
      } else {
        setExportSlip(null);
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải thông tin phiếu xuất kho",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const handleApproval = async () => {
    try {
      if (!exportSlip?.id) return;
      await exportSlipsApi.approveSlip(exportSlip.id, approvalNotes);
      toast({
        title: "Thành công",
        description: `Đã ${approvalAction === 'approve' ? 'duyệt' : 'từ chối'} phiếu xuất kho`,
      });
      setApprovalDialog(false);
      setApprovalNotes('');
      loadExportSlip();
      onUpdate?.();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể cập nhật phiếu xuất kho",
        variant: "destructive",
      });
    }
  };
  const handleMarkAsPicked = async () => {
    try {
      if (!exportSlip?.id) return;
      await exportSlipsApi.markAsPicked(exportSlip.id, 'Đã lấy hàng từ kho');
      toast({
        title: "Thành công",
        description: "Đã xác nhận lấy hàng. Tồn kho đã được trừ theo số lượng trong phiếu.",
      });
      loadExportSlip();
      onUpdate?.();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể cập nhật trạng thái lấy hàng",
        variant: "destructive",
      });
    }
  };
  const handleMarkAsExported = async () => {
    try {
      if (!exportSlip?.id) return;
      await exportSlipsApi.markAsExported(exportSlip.id, 'Đã hoàn thành xuất kho - hàng đã rời khỏi kho');
      toast({
        title: "Thành công",
        description: "Đã hoàn tất xuất kho. Hàng đã rời khỏi kho.",
      });
      loadExportSlip();
      onUpdate?.();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể cập nhật trạng thái xuất kho",
        variant: "destructive",
      });
    }
  };
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
      case 'cancelled':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3" />
            Hủy lấy hàng
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0
    }).format(amount);
  };
  const formatFullAddress = (address: string, addressInfo?: any) => {
    const wardName = addressInfo?.ward?.name || addressInfo?.wardName;
    const districtName = addressInfo?.district?.name || addressInfo?.districtName;
    const provinceName = addressInfo?.province?.name || addressInfo?.provinceName;
    const parts: string[] = [];
    if (address) parts.push(address);
    if (wardName) parts.push(wardName);
    if (districtName) parts.push(districtName);
    if (provinceName) parts.push(provinceName);
    return parts.join(', ');
  };
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };
  // Check user roles for different actions
  const canPick = user && exportSlip?.status === 'pending';
  const canExport = user && (exportSlip?.status === 'picked');
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Phiếu xuất kho
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Đang tải...</div>
        </CardContent>
      </Card>
    );
  }
  if (!exportSlip) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Phiếu xuất kho
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Chưa có phiếu xuất kho cho đơn hàng này
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <LoadingWrapper
      isLoading={loading}
      error={null}
      onRetry={loadExportSlip}
      loadingMessage="Đang tải thông tin phiếu xuất kho..."
    >
      <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Phiếu xuất kho {exportSlip.code}
            </div>
            {getStatusBadge(exportSlip.status)}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Đơn hàng: {exportSlip.order?.order_number || 'Đang tải...'} - {exportSlip.order?.customer_name || 'Đang tải...'}
            {exportSlip.order?.customer_phone && ` - ${exportSlip.order.customer_phone}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Slip Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="font-medium">Mã phiếu:</Label>
              <p>{exportSlip.code}</p>
            </div>
            <div>
              <Label className="font-medium">Người tạo:</Label>
              <p>{exportSlip.creator_profile?.full_name || 'Không xác định'}</p>
            </div>
            <div>
              <Label className="font-medium">Ngày tạo:</Label>
              <p>{formatDateTime(exportSlip.created_at)}</p>
            </div>
            <div>
              <Label className="font-medium">Trạng thái:</Label>
              <div className="mt-1">{getStatusBadge(exportSlip.status)}</div>
            </div>
            {exportSlip.approved_by && (
              <>
                <div>
                  <Label className="font-medium">Người duyệt:</Label>
                  <p>{exportSlip.approver_profile?.full_name || 'Không xác định'}</p>
                </div>
                <div>
                  <Label className="font-medium">Ngày duyệt:</Label>
                  <p>{exportSlip.approved_at ? formatDateTime(exportSlip.approved_at) : '-'}</p>
                </div>
              </>
            )}
            {exportSlip.picked_by && (
              <>
                <div>
                  <Label className="font-medium">Người lấy hàng:</Label>
                  <p>{exportSlip.picker_profile?.full_name || 'Không xác định'}</p>
                </div>
                <div>
                  <Label className="font-medium">Ngày lấy hàng:</Label>
                  <p>{exportSlip.picked_at ? formatDateTime(exportSlip.picked_at) : '-'}</p>
                </div>
              </>
            )}
            {exportSlip.exported_by && (
              <>
                <div>
                  <Label className="font-medium">Người xuất kho:</Label>
                  <p>{exportSlip.exporter_profile?.full_name || 'Không xác định'}</p>
                </div>
                <div>
                  <Label className="font-medium">Ngày xuất kho:</Label>
                  <p>{exportSlip.exported_at ? formatDateTime(exportSlip.exported_at) : '-'}</p>
                </div>
              </>
            )}
          </div>
          {/* Order Information */}
          {exportSlip.order && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Thông tin đơn hàng:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="font-medium">Số đơn hàng:</Label>
                  <p>{exportSlip.order.order_number}</p>
                </div>
                <div>
                  <Label className="font-medium">Khách hàng:</Label>
                  <p>{exportSlip.order.customer_name}</p>
                </div>
                {exportSlip.order.customer_phone && (
                  <div>
                    <Label className="font-medium">SĐT:</Label>
                    <p>{exportSlip.order.customer_phone}</p>
                  </div>
                )}
                {exportSlip.order.customer_address && (
                  <div>
                    <Label className="font-medium">Địa chỉ:</Label>
                    <p>{formatFullAddress(exportSlip.order.customer_address, exportSlip.order.customer_addressInfo)}</p>
                  </div>
                )}
                <div>
                  <Label className="font-medium">Tổng tiền đơn hàng:</Label>
                  <p className="font-semibold text-blue-600">{formatCurrency(exportSlip.order.total_amount || 0)}</p>
                </div>
                <div>
                  <Label className="font-medium">Tổng giá trị thực xuất:</Label>
                  <p className="font-semibold text-green-600">
                    {formatCurrency(
                      exportSlip.export_slip_items?.reduce((sum, item) => 
                        sum + (item.actual_quantity * item.unit_price), 0
                      ) || 0
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* Items to Export */}
          <div>
            <Label className="font-medium mb-3 block">Danh sách sản phẩm xuất kho:</Label>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Mã SP</TableHead>
                    <TableHead className="text-right">SL Yêu cầu</TableHead>
                    <TableHead className="text-right">SL Thực xuất</TableHead>
                    <TableHead className="text-right">SL Còn lại</TableHead>
                    <TableHead className="text-right">Đơn giá</TableHead>
                    <TableHead className="text-right">Thành tiền</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportSlip.export_slip_items?.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell>{item.product_code}</TableCell>
                      <TableCell className="text-right font-medium text-blue-600">
                        {item.requested_quantity}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {item.actual_quantity}
                      </TableCell>
                      <TableCell className="text-right font-medium text-orange-600">
                        {item.remaining_quantity}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.actual_quantity * item.unit_price)}</TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                        Chưa có sản phẩm nào
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          {/* Notes */}
          {exportSlip.notes && (
            <div>
              <Label className="font-medium">Ghi chú:</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <div className="text-sm whitespace-pre-wrap">{exportSlip.notes}</div>
              </div>
            </div>
          )}
          {/* Approval Notes */}
          {exportSlip.approval_notes && (
            <div>
              <Label className="font-medium">Ghi chú duyệt:</Label>
              <div className="mt-1 p-3 bg-blue-50 rounded-md">
                <div className="text-sm whitespace-pre-wrap">{exportSlip.approval_notes}</div>
              </div>
            </div>
          )}
          {/* Action Buttons */}
          {canPick && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={handleMarkAsPicked}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Package className="w-4 h-4 mr-2" />
                Xác nhận đã lấy hàng
              </Button>
            </div>
          )}
          {canExport && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={() => setQuantityDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Package className="w-4 h-4 mr-2" />
                Xác nhận số lượng xuất
              </Button>
              <Button
                onClick={handleMarkAsExported}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Đã xuất kho
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'Duyệt' : 'Từ chối'} phiếu xuất kho
            </DialogTitle>
            <DialogDescription>
              Phiếu xuất kho {exportSlip.code}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Tổng quan đơn hàng</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Mã đơn hàng:</span>
                  <span className="ml-2 text-blue-600 font-semibold">{exportSlip.order.order_number}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Khách hàng:</span>
                  <span className="ml-2 font-semibold">{exportSlip.order.customer_name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Người tạo phiếu:</span>
                  <span className="ml-2">{exportSlip.creator_profile?.full_name || 'Không xác định'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Ngày tạo:</span>
                  <span className="ml-2">{formatDateTime(exportSlip.created_at)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Tổng giá trị:</span>
                  <span className="ml-2 text-green-600 font-semibold">
                    {formatCurrency(exportSlip.export_slip_items?.reduce((sum, item) => sum + (item.actual_quantity * item.unit_price), 0) || 0)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Tổng sản phẩm:</span>
                  <span className="ml-2 font-semibold">
                    {exportSlip.export_slip_items?.reduce((sum, item) => sum + item.actual_quantity, 0) || 0} sản phẩm
                  </span>
                </div>
              </div>
            </div>
            {/* Export Items Summary */}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Mã SP</TableHead>
                    <TableHead className="text-right">Số lượng</TableHead>
                    <TableHead className="text-right">Đơn giá</TableHead>
                    <TableHead className="text-right">Thành tiền</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportSlip.order.order_items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell>{item.product_code}</TableCell>
                      <TableCell className="text-right font-medium text-blue-600">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.quantity * item.unit_price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div>
              <Label htmlFor="approval-notes">
                Ghi chú {approvalAction === 'approve' ? 'duyệt' : 'từ chối'}
              </Label>
              <Textarea
                id="approval-notes"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder={`Nhập lý do ${approvalAction === 'approve' ? 'duyệt' : 'từ chối'}...`}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleApproval}
              variant={approvalAction === 'approve' ? 'default' : 'destructive'}
            >
              {approvalAction === 'approve' ? 'Duyệt' : 'Từ chối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Quantity Confirmation Dialog */}
      {quantityDialog && exportSlip && (
        <ExportSlipQuantityDialog
          open={quantityDialog}
          onOpenChange={setQuantityDialog}
          exportSlipId={exportSlip.id}
          items={exportSlip.export_slip_items || []}
          orderInfo={exportSlip.order ? {
            order_number: exportSlip.order.order_number,
            customer_name: exportSlip.order.customer_name,
            customer_phone: '', // This field might need to be added to the query
            total_amount: exportSlip.export_slip_items?.reduce((sum, item) => sum + (item.actual_quantity * item.unit_price), 0) || 0
          } : undefined}
          onUpdate={() => {
            loadExportSlip();
            onUpdate?.();
          }}
        />
      )}
    </>
      </LoadingWrapper>
  );
};