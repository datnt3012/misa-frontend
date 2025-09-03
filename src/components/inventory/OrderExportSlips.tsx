import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Package, CheckCircle, XCircle, Clock, FileText, Eye } from "lucide-react";
import { ExportSlip } from "./ExportSlip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface OrderExportSlipsProps {
  orderId: string;
  onUpdate?: () => void;
}

interface ExportSlipSummary {
  id: string;
  slip_number: string;
  status: string;
  created_at: string;
  approved_at?: string;
  export_completed_at?: string;
  creator_profile?: { full_name: string };
  approver_profile?: { full_name: string };
  export_slip_items: Array<{
    product_name: string;
    product_code: string;
    requested_quantity: number;
    actual_quantity: number;
    remaining_quantity: number;
  }>;
}

export const OrderExportSlips: React.FC<OrderExportSlipsProps> = ({ orderId, onUpdate }) => {
  const [exportSlips, setExportSlips] = useState<ExportSlipSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlipId, setSelectedSlipId] = useState<string | null>(null);
  const [showSlipDialog, setShowSlipDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadExportSlips();
  }, [orderId]);

  const loadExportSlips = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('export_slips')
        .select(`
          id,
          slip_number,
          status,
          created_at,
          approved_at,
          export_completed_at,
          created_by,
          approved_by,
          export_slip_items (
            product_name,
            product_code,
            requested_quantity,
            actual_quantity,
            remaining_quantity
          )
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get creator and approver profiles separately
      const enrichedData = await Promise.all((data || []).map(async (slip) => {
        const [creatorProfile, approverProfile] = await Promise.all([
          slip.created_by ? supabase.from('profiles').select('full_name').eq('id', slip.created_by).single() : null,
          slip.approved_by ? supabase.from('profiles').select('full_name').eq('id', slip.approved_by).single() : null,
        ]);

        return {
          ...slip,
          creator_profile: creatorProfile?.data || { full_name: 'Không xác định' },
          approver_profile: approverProfile?.data || { full_name: 'Không xác định' },
        };
      }));

      setExportSlips(enrichedData);
    } catch (error) {
      console.error('Error loading export slips:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách phiếu xuất kho",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Chờ Duyệt
        </Badge>;
      case 'approved':
        return <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Đã Duyệt
        </Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600 flex items-center gap-1">
          <Package className="w-3 h-3" />
          Đã Xuất Kho
        </Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Từ Chối
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Đang tải phiếu xuất kho...</p>
        </div>
      </div>
    );
  }

  if (exportSlips.length === 0) {
    return (
      <div className="text-center p-8">
        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium text-muted-foreground">Chưa có phiếu xuất kho cho đơn hàng này</p>
        <p className="text-sm text-muted-foreground mt-2">
          Phiếu xuất kho sẽ được tạo tự động khi đơn hàng chuyển sang trạng thái "Đang Xử Lý"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Phiếu Xuất Kho ({exportSlips.length})</h3>
      </div>

      <div className="space-y-4">
        {exportSlips.map((slip) => (
          <Card key={slip.id} className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{slip.slip_number}</CardTitle>
                  {getStatusBadge(slip.status)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedSlipId(slip.id);
                    setShowSlipDialog(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Xem Chi Tiết
                </Button>
              </div>
              <CardDescription>
                Tạo: {formatDateTime(slip.created_at)} bởi {slip.creator_profile?.full_name || 'Không xác định'}
                {slip.approved_at && (
                  <span className="block">
                    Duyệt: {formatDateTime(slip.approved_at)} bởi {slip.approver_profile?.full_name || 'Không xác định'}
                  </span>
                )}
                {slip.export_completed_at && (
                  <span className="block">
                    Xuất kho: {formatDateTime(slip.export_completed_at)}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản Phẩm</TableHead>
                    <TableHead className="text-right">SL Yêu Cầu</TableHead>
                    <TableHead className="text-right">SL Thực Xuất</TableHead>
                    <TableHead className="text-right">SL Còn Lại</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slip.export_slip_items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-sm text-muted-foreground">{item.product_code}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.requested_quantity}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {item.actual_quantity}
                      </TableCell>
                      <TableCell className="text-right font-medium text-orange-600">
                        {item.remaining_quantity}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Export Slip Detail Dialog */}
      {selectedSlipId && (
        <Dialog open={showSlipDialog} onOpenChange={setShowSlipDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Chi Tiết Phiếu Xuất Kho
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <ExportSlip 
                orderId={orderId}
                onUpdate={() => {
                  loadExportSlips();
                  if (onUpdate) onUpdate();
                  setShowSlipDialog(false);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};