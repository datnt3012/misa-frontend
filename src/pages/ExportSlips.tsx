import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle, Package, FileText, Clock, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { DocumentUploadViewer } from '@/components/documents/DocumentUploadViewer';

interface ExportSlip {
  id: string;
  slip_number: string;
  order_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'partial_export' | 'completed';
  notes?: string;
  approval_notes?: string;
  created_at: string;
  approved_at?: string;
  created_by: string;
  approved_by?: string;
  orders?: {
    order_number: string;
    customer_name: string;
    customer_address?: string;
    customer_phone?: string;
    total_amount: number;
    order_items: Array<{
      product_name: string;
      product_code: string;
      quantity: number;
      unit_price: number;
      total_price: number;
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
}

export default function ExportSlips() {
  const [exportSlips, setExportSlips] = useState<ExportSlip[]>([]);
  const [selectedSlip, setSelectedSlip] = useState<ExportSlip | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [displayLimit, setDisplayLimit] = useState<number>(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchExportSlips();
  }, [displayLimit]);

  const fetchExportSlips = async () => {
    try {
      const { data, error } = await supabase
        .from('export_slips')
        .select(`
          *,
          orders (
            order_number,
            customer_name,
            customer_address,
            customer_phone,
            total_amount,
            order_items (
              product_name,
              product_code,
              quantity,
              unit_price,
              total_price
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(displayLimit);

      if (error) throw error;
      
      // Fetch export slip items separately
      if (data && data.length > 0) {
        const exportSlipIds = data.map(slip => slip.id);
        const { data: exportSlipItems, error: itemsError } = await supabase
          .from('export_slip_items')
          .select('*')
          .in('export_slip_id', exportSlipIds);
        
        if (itemsError) throw itemsError;
        
        // Merge export slip items with export slips
        const enrichedData = data.map(slip => ({
          ...slip,
          export_slip_items: exportSlipItems?.filter(item => item.export_slip_id === slip.id) || []
        }));
        
        setExportSlips(enrichedData as any);
      } else {
        setExportSlips([]);
      }
    } catch (error) {
      console.error('Error fetching export slips:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách phiếu xuất kho",
        variant: "destructive",
      });
    }
  };

  const handleApproveSlip = async (slipId: string, approve: boolean) => {
    try {
      const { error } = await supabase
        .from('export_slips')
        .update({
          status: approve ? 'approved' : 'rejected',
          approval_notes: approvalNotes,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', slipId);

      if (error) throw error;

      toast({
        title: "Thành công",
        description: `Phiếu xuất kho đã được ${approve ? 'duyệt' : 'từ chối'}`,
      });

      setIsApprovalDialogOpen(false);
      setApprovalNotes('');
      fetchExportSlips();
    } catch (error) {
      console.error('Error updating export slip:', error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật phiếu xuất kho",
        variant: "destructive",
      });
    }
  };

  const handleExportComplete = async (slipId: string, exportNotes: string = '') => {
    try {
      const { error } = await supabase
        .from('export_slips')
        .update({
          status: 'completed',
          export_notes: exportNotes,
          export_completed_by: user?.id,
          export_completed_at: new Date().toISOString(),
        })
        .eq('id', slipId);

      if (error) throw error;

      toast({
        title: "Thành công",
        description: "Đã hoàn thành xuất kho",
      });

      fetchExportSlips();
    } catch (error) {
      console.error('Error completing export:', error);
      toast({
        title: "Lỗi",
        description: "Không thể hoàn thành xuất kho",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-orange-600"><Clock className="w-3 h-3 mr-1" />Chờ duyệt</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Đã duyệt</Badge>;
      case 'partial_export':
        return <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50"><Package className="w-3 h-3 mr-1" />Xuất một phần</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-gray-800 bg-gray-100"><CheckCircle className="w-3 h-3 mr-1" />Hoàn thành</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Từ chối</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const canApprove = userRole === 'accountant' || userRole === 'chief_accountant' || userRole === 'owner_director';
  const canExport = userRole === 'inventory' || userRole === 'owner_director';

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-gray-600" />
      : <ChevronDown className="w-4 h-4 text-gray-600" />;
  };

  // Filter and sort export slips
  const filteredAndSortedSlips = exportSlips
    .filter(slip => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        slip.slip_number.toLowerCase().includes(searchLower) ||
        slip.orders?.order_number.toLowerCase().includes(searchLower) ||
        slip.orders?.customer_name.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'slip_number':
          aValue = a.slip_number;
          bValue = b.slip_number;
          break;
        case 'order_number':
          aValue = a.orders?.order_number || '';
          bValue = b.orders?.order_number || '';
          break;
        case 'customer_name':
          aValue = a.orders?.customer_name || '';
          bValue = b.orders?.customer_name || '';
          break;
        case 'total_amount':
          aValue = a.orders?.total_amount || 0;
          bValue = b.orders?.total_amount || 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Quản Lý Phiếu Xuất Kho</h1>
        <p className="text-muted-foreground">
          Danh sách và duyệt phiếu xuất kho hàng hóa
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Danh Sách Phiếu Xuất Kho
              </CardTitle>
              <CardDescription>
                Tất cả phiếu xuất kho được tạo từ đơn hàng
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="display-limit" className="text-sm font-medium">
                Hiển thị:
              </Label>
              <Select
                value={displayLimit.toString()}
                onValueChange={(value) => setDisplayLimit(parseInt(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo số phiếu, đơn hàng hoặc khách hàng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('slip_number')}
                >
                  <div className="flex items-center gap-1">
                    Số phiếu
                    {getSortIcon('slip_number')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('order_number')}
                >
                  <div className="flex items-center gap-1">
                    Đơn hàng
                    {getSortIcon('order_number')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('customer_name')}
                >
                  <div className="flex items-center gap-1">
                    Khách hàng
                    {getSortIcon('customer_name')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('total_amount')}
                >
                  <div className="flex items-center gap-1">
                    Giá trị
                    {getSortIcon('total_amount')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Trạng thái
                    {getSortIcon('status')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-1">
                    Ngày tạo
                    {getSortIcon('created_at')}
                  </div>
                </TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedSlips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    {searchTerm ? 'Không tìm thấy phiếu xuất kho nào' : 'Chưa có phiếu xuất kho nào'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedSlips.map((slip) => (
                <TableRow key={slip.id}>
                  <TableCell className="font-medium">{slip.slip_number}</TableCell>
                  <TableCell>{slip.orders?.order_number}</TableCell>
                  <TableCell>{slip.orders?.customer_name}</TableCell>
                  <TableCell>{formatCurrency(slip.export_slip_items?.reduce((sum, item) => sum + (item.actual_quantity * item.unit_price), 0) || 0)}</TableCell>
                  <TableCell>{getStatusBadge(slip.status)}</TableCell>
                  <TableCell>
                    {new Date(slip.created_at).toLocaleString('vi-VN')}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <FileText className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Chi tiết phiếu xuất kho</DialogTitle>
                            <DialogDescription>
                              Thông tin chi tiết phiếu {slip.slip_number}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="font-medium">Số phiếu:</Label>
                                <p className="text-sm">{slip.slip_number}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Đơn hàng:</Label>
                                <p className="text-sm">{slip.orders?.order_number}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Khách hàng:</Label>
                                <p className="text-sm">{slip.orders?.customer_name}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Trạng thái:</Label>
                                <p className="text-sm">{getStatusBadge(slip.status)}</p>
                              </div>
                              {slip.orders?.customer_address && (
                                <div className="col-span-2">
                                  <Label className="font-medium">Địa chỉ giao hàng:</Label>
                                  <p className="text-sm">{slip.orders.customer_address}</p>
                                </div>
                              )}
                              {slip.orders?.customer_phone && (
                                <div>
                                  <Label className="font-medium">Số điện thoại:</Label>
                                  <p className="text-sm">{slip.orders.customer_phone}</p>
                                </div>
                              )}
                              <div>
                                <Label className="font-medium">Tổng giá trị đơn hàng:</Label>
                                <p className="text-sm font-medium text-green-600">
                                  {formatCurrency(slip.orders?.total_amount || 0)}
                                </p>
                              </div>
                              <div>
                                <Label className="font-medium">Tổng giá trị thực xuất:</Label>
                                <p className="text-sm font-medium text-blue-600">
                                  {formatCurrency(slip.export_slip_items?.reduce((sum, item) => sum + (item.actual_quantity * item.unit_price), 0) || 0)}
                                </p>
                              </div>
                            </div>

                            {/* Product List */}
                            {slip.orders?.order_items && slip.orders.order_items.length > 0 && (
                              <div>
                                <Label className="font-medium block mb-3">Danh sách sản phẩm cần xuất:</Label>
                                <div className="border rounded-md overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Tên sản phẩm</TableHead>
                                        <TableHead>Mã SP</TableHead>
                                        <TableHead className="text-right">SL Yêu cầu</TableHead>
                                        <TableHead className="text-right">SL Thực xuất</TableHead>
                                        <TableHead className="text-right">SL Còn lại</TableHead>
                                        <TableHead className="text-right">Đơn giá</TableHead>
                                        <TableHead className="text-right">Thành tiền</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {slip.orders.order_items.map((orderItem, index) => {
                                        // Find corresponding export slip item
                                        const exportItem = slip.export_slip_items?.find(
                                          item => item.product_code === orderItem.product_code
                                        );
                                        
                                        const requestedQuantity = orderItem.quantity;
                                        const actualQuantity = exportItem?.actual_quantity || 0;
                                        const remainingQuantity = requestedQuantity - actualQuantity;
                                        
                                        return (
                                          <TableRow key={index}>
                                            <TableCell className="font-medium">{orderItem.product_name}</TableCell>
                                            <TableCell>{orderItem.product_code}</TableCell>
                            <TableCell className="text-right font-medium text-blue-600">{requestedQuantity}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">{actualQuantity}</TableCell>
                            <TableCell className="text-right font-medium text-orange-600">{remainingQuantity}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(orderItem.unit_price)}</TableCell>
                                             <TableCell className="text-right font-medium">
                                               {formatCurrency(actualQuantity * orderItem.unit_price)}
                                             </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}

                            {/* Notes */}
                            {slip.notes && (
                              <div>
                                <Label className="font-medium">Ghi chú:</Label>
                                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                                  <p className="text-sm">{slip.notes}</p>
                                </div>
                              </div>
                            )}
                            {slip.approval_notes && (
                              <div>
                                <Label className="font-medium">Ghi chú duyệt:</Label>
                                <div className="mt-1 p-3 bg-blue-50 rounded-md">
                                  <p className="text-sm">{slip.approval_notes}</p>
                                </div>
                              </div>
                            )}

                            {/* Documents */}
                            <div>
                              <Label className="font-medium block mb-3">Tài liệu đính kèm:</Label>
                              <DocumentUploadViewer exportSlipId={slip.id} />
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {canApprove && slip.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSlip(slip);
                            setIsApprovalDialogOpen(true);
                          }}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {canExport && slip.status === 'approved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                          onClick={() => handleExportComplete(slip.id)}
                        >
                          <Package className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Duyệt phiếu xuất kho</DialogTitle>
            <DialogDescription>
              Xác nhận phiếu xuất kho {selectedSlip?.slip_number}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSlip && (
            <div className="space-y-6">
              {/* Order Overview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Thông tin đơn hàng</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Mã đơn hàng:</span>
                    <span className="ml-2 text-blue-600 font-semibold">{selectedSlip.orders?.order_number}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Khách hàng:</span>
                    <span className="ml-2 font-semibold">{selectedSlip.orders?.customer_name}</span>
                  </div>
                  {selectedSlip.orders?.customer_phone && (
                    <div>
                      <span className="font-medium text-gray-600">Số điện thoại:</span>
                      <span className="ml-2">{selectedSlip.orders.customer_phone}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-600">Tổng giá trị:</span>
                    <span className="ml-2 text-green-600 font-semibold">
                      {formatCurrency(selectedSlip.orders?.total_amount || 0)}
                    </span>
                  </div>
                </div>
                
                {selectedSlip.orders?.customer_address && (
                  <div className="mt-3">
                    <span className="font-medium text-gray-600">Địa chỉ giao hàng:</span>
                    <p className="mt-1 text-sm bg-white rounded p-2 border">
                      {selectedSlip.orders.customer_address}
                    </p>
                  </div>
                )}
              </div>

              {/* Product List */}
              {selectedSlip.orders?.order_items && selectedSlip.orders.order_items.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Danh sách sản phẩm cần xuất</h4>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead>Tên sản phẩm</TableHead>
                           <TableHead>Mã SP</TableHead>
                           <TableHead className="text-right">SL Yêu cầu</TableHead>
                           <TableHead className="text-right">SL Thực xuất</TableHead>
                           <TableHead className="text-right">SL Còn lại</TableHead>
                           <TableHead className="text-right">Đơn giá</TableHead>
                           <TableHead className="text-right">Thành tiền</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {selectedSlip.orders.order_items.map((orderItem, index) => {
                           // Find corresponding export slip item
                           const exportItem = selectedSlip.export_slip_items?.find(
                             item => item.product_code === orderItem.product_code
                           );
                           
                           const requestedQuantity = orderItem.quantity;
                           const actualQuantity = exportItem?.actual_quantity || 0;
                           const remainingQuantity = requestedQuantity - actualQuantity;
                           
                           return (
                             <TableRow key={index}>
                               <TableCell className="font-medium">{orderItem.product_name}</TableCell>
                               <TableCell>{orderItem.product_code}</TableCell>
                                <TableCell className="text-right font-medium text-blue-600">{requestedQuantity}</TableCell>
                                <TableCell className="text-right font-medium text-green-600">{actualQuantity}</TableCell>
                                <TableCell className="text-right font-medium text-orange-600">{remainingQuantity}</TableCell>
                               <TableCell className="text-right">{formatCurrency(orderItem.unit_price)}</TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(actualQuantity * orderItem.unit_price)}
                                </TableCell>
                             </TableRow>
                           );
                         })}
                       </TableBody>
                    </Table>
                  </div>
                </div>
               )}

               {/* Documents */}
               <div>
                 <h4 className="font-semibold mb-3">Tài liệu đính kèm</h4>
                 <DocumentUploadViewer exportSlipId={selectedSlip.id} allowUpload={true} />
               </div>

               <div>
                 <Label htmlFor="approval-notes">Ghi chú duyệt phiếu</Label>
                 <Textarea
                   id="approval-notes"
                   value={approvalNotes}
                   onChange={(e) => setApprovalNotes(e.target.value)}
                   placeholder="Nhập ghi chú về việc duyệt/từ chối phiếu xuất kho..."
                   rows={3}
                 />
               </div>
             </div>
          )}

          <div className="flex space-x-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsApprovalDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedSlip && handleApproveSlip(selectedSlip.id, false)}
            >
              Từ chối
            </Button>
            <Button
              onClick={() => selectedSlip && handleApproveSlip(selectedSlip.id, true)}
            >
              Duyệt phiếu
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}