import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// // import { supabase } from "@/integrations/supabase/client"; // Removed - using API instead // Removed - using API instead
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Package, CheckCircle, XCircle, Clock, FileText, Upload } from "lucide-react";
import { ExportSlipQuantityDialog } from "@/components/inventory/ExportSlipQuantityDialog";
import { DocumentUpload } from "@/components/documents/DocumentUpload";

interface ExportSlip {
  id: string;
  slip_number: string;
  status: 'pending' | 'approved' | 'rejected' | 'partial_export' | 'completed';
  created_by: string;
  approved_by?: string;
  notes?: string;
  approval_notes?: string;
  created_at: string;
  approved_at?: string;
  order: {
    order_number: string;
    customer_name: string;
    order_items: Array<{
      product_name: string;
      product_code: string;
      quantity: number;
      unit_price: number;
    }>;
  };
  export_slip_items?: Array<{
    id: string;
    product_id: string;
    product_name: string;
    product_code: string;
    requested_quantity: number;
    actual_quantity: number;
    remaining_quantity: number;
    unit_price: number;
  }>;
  creator_profile?: {
    full_name: string;
  };
  approver_profile?: {
    full_name: string;
  };
}

interface ExportSlipProps {
  orderId: string;
  onUpdate?: () => void;
}

export const ExportSlip: React.FC<ExportSlipProps> = ({ orderId, onUpdate }) => {
  const [exportSlip, setExportSlip] = useState<ExportSlip | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [quantityDialog, setQuantityDialog] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadExportSlip();
  }, [orderId]);

  const loadExportSlip = async () => {
    try {
      const { data, error } = await supabase
        .from('export_slips')
        .select(`
          *,
          order:orders (
            order_number,
            customer_name,
            order_items (
              product_name,
              product_code,
              quantity,
              unit_price
            )
          ),
          export_slip_items (
            id,
            product_id,
            product_name,
            product_code,
            requested_quantity,
            actual_quantity,
            remaining_quantity,
            unit_price
          ),
          creator_profile:profiles!export_slips_created_by_fkey (full_name),
          approver_profile:profiles!export_slips_approved_by_fkey (full_name)
        `)
        .eq('order_id', orderId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setExportSlip({
          ...data,
          status: data.status as 'pending' | 'approved' | 'rejected' | 'partial_export' | 'completed',
          creator_profile: data.creator_profile || { full_name: 'Không xác định' },
          approver_profile: data.approver_profile || { full_name: 'Không xác định' },
          export_slip_items: data.export_slip_items || []
        } as ExportSlip);
        
        // Load related documents
        loadDocuments(data.id);
      } else {
        setExportSlip(null);
      }
    } catch (error) {
      console.error('Error loading export slip:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (exportSlipId: string) => {
    try {
      const { data, error } = await supabase
        .from('order_documents')
        .select('*')
        .eq('order_id', orderId)
        .eq('document_type', 'export_slip');

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleApproval = async () => {
    try {
      const { error } = await supabase
        .from('export_slips')
        .update({
          status: approvalAction,
          approved_by: user?.id,
          approval_notes: approvalNotes,
          approved_at: new Date().toISOString()
        })
        .eq('id', exportSlip?.id);

      if (error) throw error;

      toast({
        title: "Thành công",
        description: `Đã ${approvalAction === 'approve' ? 'duyệt' : 'từ chối'} phiếu xuất kho`,
      });

      setApprovalDialog(false);
      setApprovalNotes('');
      loadExportSlip();
      onUpdate?.();
    } catch (error) {
      console.error('Error updating export slip:', error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật phiếu xuất kho",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsExported = async () => {
    try {
      const { error } = await supabase
        .from('export_slips')
        .update({
          status: 'completed',
          export_completed_by: user?.id,
          export_completed_at: new Date().toISOString(),
          export_notes: 'Đã hoàn thành xuất kho'
        })
        .eq('id', exportSlip?.id);

      if (error) throw error;

      toast({
        title: "Thành công",
        description: "Đã đánh dấu hoàn thành xuất kho",
      });

      loadExportSlip();
      onUpdate?.();
    } catch (error) {
      console.error('Error marking export as completed:', error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái xuất kho",
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
            Chờ duyệt
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Đã duyệt
          </Badge>
        );
      case 'partial_export':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-100 text-yellow-800 border-yellow-300">
            <Package className="w-3 h-3" />
            Xuất một phần
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-gray-800 text-white">
            <CheckCircle className="w-3 h-3" />
            Hoàn thành
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Đã từ chối
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  // Check user roles for different actions
  const canApprove = user && exportSlip?.status === 'pending';
  const canExport = user && (exportSlip?.status === 'approved');

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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Phiếu xuất kho {exportSlip.slip_number}
            </div>
            {getStatusBadge(exportSlip.status)}
          </CardTitle>
          <CardDescription>
            Đơn hàng: {exportSlip.order.order_number} - {exportSlip.order.customer_name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Slip Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="font-medium">Người tạo:</Label>
              <p>{exportSlip.creator_profile?.full_name || 'Không xác định'}</p>
            </div>
            <div>
              <Label className="font-medium">Ngày tạo:</Label>
              <p>{formatDateTime(exportSlip.created_at)}</p>
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
          </div>

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
                  {exportSlip.order.order_items.map((orderItem, index) => {
                    // Find corresponding export slip item
                    const exportItem = exportSlip.export_slip_items?.find(
                      item => item.product_code === orderItem.product_code
                    );
                    
                    // Use order quantities as base
                    const requestedQuantity = orderItem.quantity;
                    const actualQuantity = exportItem?.actual_quantity || 0;
                    const remainingQuantity = requestedQuantity - actualQuantity;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{orderItem.product_name}</TableCell>
                        <TableCell>{orderItem.product_code}</TableCell>
                        <TableCell className="text-right font-medium text-blue-600">
                          {requestedQuantity}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {actualQuantity}
                        </TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          {remainingQuantity}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(orderItem.unit_price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(orderItem.quantity * orderItem.unit_price)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Notes */}
          {exportSlip.notes && (
            <div>
              <Label className="font-medium">Ghi chú:</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <p className="text-sm">{exportSlip.notes}</p>
              </div>
            </div>
          )}

          {/* Approval Notes */}
          {exportSlip.approval_notes && (
            <div>
              <Label className="font-medium">Ghi chú duyệt:</Label>
              <div className="mt-1 p-3 bg-blue-50 rounded-md">
                <p className="text-sm">{exportSlip.approval_notes}</p>
              </div>
            </div>
          )}

          {/* Document Upload */}
          <div>
            <DocumentUpload
              orderId={orderId}
              existingDocuments={documents}
              onDocumentUploaded={(doc) => setDocuments([...documents, doc])}
              onDocumentDeleted={(docId) => setDocuments(documents.filter(d => d.id !== docId))}
              label="Phiếu xuất kho đã ký"
              documentType="export_slip"
            />
          </div>

          {/* Action Buttons */}
          {canApprove && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={() => {
                  setApprovalAction('approve');
                  setApprovalDialog(true);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Duyệt phiếu
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setApprovalAction('reject');
                  setApprovalDialog(true);
                }}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Từ chối
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
              Phiếu xuất kho {exportSlip.slip_number}
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
  );
};

