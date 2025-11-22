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
import { CheckCircle, Package, FileText, Clock, Search, ChevronUp, ChevronDown, ChevronsUpDown, Truck, ArrowRight, XCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { exportSlipsApi, type ExportSlip } from '@/api/exportSlips.api';
import { orderApi } from '@/api/order.api';
import { useToast } from '@/hooks/use-toast';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';


function ExportSlipsContent() {
  const [exportSlips, setExportSlips] = useState<ExportSlip[]>([]);
  const [displayLimit, setDisplayLimit] = useState<number>(25);
  const [addressCache, setAddressCache] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const canDirectExport = hasPermission('ADMIN') || hasPermission('WAREHOUSE_ADMIN');

  // Get available status options based on current status and role
  const getAvailableStatusOptions = (currentStatus: string) => {
    const options = [];
    
    console.log('Getting status options for:', currentStatus);
    
    // Only show options that make sense for the current status
    if (currentStatus === 'pending') {
      options.push({ 
        value: 'picked', 
        label: 'Đã lấy hàng', 
        description: 'Xác nhận đã lấy hàng từ kho' 
      });
      // Only show direct export when user has admin-level permission
      if (canDirectExport) {
        options.push({ 
          value: 'exported', 
          label: 'Đã xuất kho', 
          description: 'Xuất kho trực tiếp' 
        });
      }
      // Hủy lấy hàng xuống cuối cùng
      options.push({ 
        value: 'cancelled', 
        label: 'Hủy lấy hàng', 
        description: 'Hủy phiếu xuất kho (chưa trừ tồn kho)' 
      });
    } else if (currentStatus === 'picked') {
      options.push({ 
        value: 'exported', 
        label: 'Đã xuất kho', 
        description: 'Xác nhận hàng đã rời khỏi kho' 
      });
    }
    // No options for 'exported' or 'cancelled' status - they are final
    
    console.log('Available options:', options);
    return options;
  };

  useEffect(() => {
    fetchExportSlips();
  }, [displayLimit]);

  const fetchExportSlips = async () => {
    try {
      const resp = await exportSlipsApi.getSlips({ page: 1, limit: displayLimit });
      
      
      // If order data is missing, we'll need to fetch it separately
      const slips = await Promise.all((resp.slips || []).map(async (s) => {
        let orderData = s.order;
        
        // If order data is missing but we have order_id, try to fetch it
        if (!orderData && s.order_id) {
          try {
            const orderResponse = await orderApi.getOrderIncludeDeleted(s.order_id);
            orderData = {
              order_number: orderResponse.order_number,
              customer_name: orderResponse.customer_name || 'Không xác định',
              customer_address: orderResponse.customer_address,
              customer_phone: orderResponse.customer_phone,
              customer_addressInfo: orderResponse.customer_addressInfo || orderResponse.addressInfo,
              total_amount: orderResponse.total_amount,
              order_items: orderResponse.order_items
            };
          } catch (error) {
            console.error('Error fetching order data:', error);
          }
        }
        
        return {
          id: s.id || '',
          code: s.code || '',
          order_id: s.order_id || '',
          status: s.status || 'pending',
          notes: s.notes || undefined,
          approval_notes: s.approval_notes || undefined,
          created_at: s.created_at || '',
          approved_at: s.approved_at || undefined,
          created_by: s.created_by || '',
          approved_by: s.approved_by || undefined,
          order: orderData ? {
            order_number: orderData.order_number || '',
            customer_name: orderData.customer_name || '',
            customer_address: orderData.customer_address || undefined,
            customer_phone: orderData.customer_phone || undefined,
            customer_addressInfo: orderData.customer_addressInfo || undefined,
            total_amount: orderData.total_amount || 0,
            order_items: orderData.order_items || undefined,
          } : undefined,
          export_slip_items: s.export_slip_items || [],
        };
      }));
      
      setExportSlips(slips);
      
      // Update address cache for slips that now have addressInfo
      const newCache: Record<string, string> = {};
      for (const slip of slips) {
        console.log(`Slip ${slip.id}:`, {
          hasAddress: !!slip.order?.customer_address,
          hasAddressInfo: !!slip.order?.customer_addressInfo,
          addressInfo: slip.order?.customer_addressInfo
        });
        
        if (slip.order?.customer_address && slip.order?.customer_addressInfo) {
          const fullAddress = formatFullAddress(slip.order.customer_address, slip.order.customer_addressInfo);
          newCache[slip.id] = fullAddress;
          console.log(`Cached full address for ${slip.id}:`, fullAddress);
        } else if (slip.order?.customer_address) {
          // Even without addressInfo, cache the basic address
          newCache[slip.id] = slip.order.customer_address;
          console.log(`Cached basic address for ${slip.id}:`, slip.order.customer_address);
        }
      }
      console.log('Final address cache:', newCache);
      setAddressCache(newCache);
      
      // No toast notification for empty export slips list
    } catch (error: any) {
      console.error('Error fetching export slips:', error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể tải danh sách phiếu xuất kho. Vui lòng kiểm tra kết nối backend.",
        variant: "destructive",
      });
    }
  };


  // Handle status updates based on role permissions
  const handleStatusUpdate = async (slipId: string, newStatus: string, notes: string = '') => {
    try {
      let response;
      
      switch (newStatus) {
        case 'picked':
          response = await exportSlipsApi.markAsPicked(slipId, notes);
          break;
        case 'exported':
          response = await exportSlipsApi.markAsExported(slipId, notes);
          break;
        default:
          throw new Error('Trạng thái không hợp lệ');
      }

      toast({
        title: "Thành công",
        description: response.message || `Đã cập nhật trạng thái thành ${newStatus === 'picked' ? 'Đã lấy hàng' : 'Đã xuất kho'}`,
      });

      fetchExportSlips();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể cập nhật trạng thái",
        variant: "destructive",
      });
    }
  };

  // Direct export (Admin/Giám đốc only)
  const handleDirectExport = async (slipId: string, notes: string = '') => {
    try {
      const response = await exportSlipsApi.directExport(slipId, notes);

      toast({
        title: "Thành công",
        description: response.message || "Đã xuất kho trực tiếp",
      });

      fetchExportSlips();
    } catch (error: any) {
      console.error('Error direct exporting:', error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể xuất kho trực tiếp",
        variant: "destructive",
      });
    }
  };

  // Handle status update with selected status
  const handleStatusUpdateWithSelection = async (slipId: string, newStatus: string, notes: string = '') => {
    try {
      let response;
      
      switch (newStatus) {
        case 'picked':
          response = await exportSlipsApi.markAsPicked(slipId, notes);
          break;
        case 'exported':
          response = await exportSlipsApi.markAsExported(slipId, notes);
          break;
        case 'cancelled':
          response = await exportSlipsApi.markAsCancelled(slipId, notes);
          break;
        default:
          throw new Error('Trạng thái không hợp lệ');
      }

      const statusLabels: Record<string, string> = {
        'picked': 'Đã lấy hàng',
        'exported': 'Đã xuất kho',
        'cancelled': 'Hủy lấy hàng'
      };

      toast({
        title: "Thành công",
        description: response.message || `Đã cập nhật trạng thái thành ${statusLabels[newStatus] || newStatus}`,
      });

      fetchExportSlips();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể cập nhật trạng thái",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-orange-600"><Clock className="w-3 h-3 mr-1" />Chờ</Badge>;
      case 'picked':
        return <Badge variant="outline" className="text-blue-600"><Package className="w-3 h-3 mr-1" />Đã lấy hàng</Badge>;
      case 'exported':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Đã xuất kho</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" />Hủy lấy hàng</Badge>;
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

  // Enhanced address formatting with fallback to order API
  const formatAddressWithFallback = async (slip: ExportSlip) => {
    if (slip.order?.customer_addressInfo) {
      return formatFullAddress(slip.order.customer_address || '', slip.order.customer_addressInfo);
    }
    
    // If no addressInfo in export slip, try to get from order API
    if (slip.order_id) {
      try {
        const orderDetails = await orderApi.getOrderIncludeDeleted(slip.order_id);
        if (orderDetails.customer_addressInfo) {
          return formatFullAddress(slip.order?.customer_address || '', orderDetails.customer_addressInfo);
        }
      } catch (error) {
        console.warn('Could not fetch order details for address:', error);
      }
    }
    
    return slip.order?.customer_address || '';
  };

  // Permission checks removed - let backend handle authorization

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

  const exportToExcel = () => {
    // Prepare data for export
    const exportData = filteredAndSortedSlips.map((slip, index) => {
      // Get product details for each slip
      const productDetails = slip.order?.order_items?.map((item) => {
        const exportItem = slip.export_slip_items?.find(
          ei => ei.product_code === item.product_code
        );
        return {
          'Mã SP': item.product_code,
          'Tên sản phẩm': item.product_name,
          'SL Yêu cầu': item.quantity,
          'Đơn giá': item.unit_price,
          'Thành tiền': (exportItem?.actual_quantity || 0) * item.unit_price,
        };
      }) || [];

      return {
        'STT': index + 1,
        'Số phiếu': slip.code,
        'Đơn hàng': slip.order?.order_number || '',
        'Khách hàng': slip.order?.customer_name || '',
        'Địa chỉ': slip.order?.customer_address ? formatFullAddress(slip.order.customer_address, slip.order.customer_addressInfo) : '',
        'SĐT': slip.order?.customer_phone || '',
        'Trạng thái': slip.status === 'pending' ? 'Chờ' : 
                     slip.status === 'picked' ? 'Đã lấy hàng' :
                     slip.status === 'exported' ? 'Đã xuất kho' :
                     slip.status === 'cancelled' ? 'Hủy lấy hàng' : slip.status,
        'Tổng giá trị': slip.export_slip_items?.reduce((sum, item) => sum + (item.actual_quantity * item.unit_price), 0) || 0,
        'Ngày tạo': slip.created_at ? new Date(slip.created_at).toLocaleString('vi-VN') : '',
        'Chi tiết sản phẩm': productDetails.map(p => `${p['Tên sản phẩm']} (${p['SL Yêu cầu']})`).join('; '),
      };
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const colWidths = [
      { wch: 5 },   // STT
      { wch: 18 },  // Số phiếu
      { wch: 15 },  // Đơn hàng
      { wch: 25 },  // Khách hàng
      { wch: 40 },  // Địa chỉ
      { wch: 15 },  // SĐT
      { wch: 15 },  // Trạng thái
      { wch: 15 },  // Tổng giá trị
      { wch: 20 },  // Ngày tạo
      { wch: 60 },  // Chi tiết sản phẩm
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách phiếu xuất kho');

    // Generate filename with timestamp
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN').replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false }).replace(/:/g, '-');
    const filename = `Danh_sach_phieu_xuat_kho_${dateStr}_${timeStr}.xlsx`;

    // Write file
    XLSX.writeFile(wb, filename);

    toast({
      title: "Thành công",
      description: `Đã xuất ${exportData.length} phiếu xuất kho ra file Excel`,
    });
  };

  // Filter and sort export slips
  const filteredAndSortedSlips = exportSlips
    .filter(slip => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        slip.code.toLowerCase().includes(searchLower) ||
        slip.order?.order_number.toLowerCase().includes(searchLower) ||
        slip.order?.customer_name.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'slip_number':
          aValue = a.code;
          bValue = b.code;
          break;
        case 'order_number':
          aValue = a.order?.order_number || '';
          bValue = b.order?.order_number || '';
          break;
        case 'customer_name':
          aValue = a.order?.customer_name || '';
          bValue = b.order?.customer_name || '';
          break;
        case 'total_amount':
          aValue = a.order?.total_amount || 0;
          bValue = b.order?.total_amount || 0;
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
              <Button
                variant="outline"
                onClick={() => exportToExcel()}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Xuất Excel
              </Button>
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
                  <TableCell className="font-medium">{slip.code}</TableCell>
                  <TableCell>{slip.order?.order_number}</TableCell>
                  <TableCell>{slip.order?.customer_name}</TableCell>
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
                              Thông tin chi tiết phiếu {slip.code}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="font-medium">Số phiếu:</Label>
                                <p className="text-sm">{slip.code}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Đơn hàng:</Label>
                                <p className="text-sm">{slip.order?.order_number}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Khách hàng:</Label>
                                <p className="text-sm">{slip.order?.customer_name}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Trạng thái:</Label>
                                <div className="text-sm">{getStatusBadge(slip.status)}</div>
                              </div>
                              {slip.order?.customer_address && (
                                <div className="col-span-2">
                                  <Label className="font-medium">Địa chỉ giao hàng:</Label>
                                  <p className="text-sm">
                                    {(() => {
                                      const cachedAddress = addressCache[slip.id];
                                      const directAddress = formatFullAddress(slip.order.customer_address, slip.order.customer_addressInfo);
                                      return cachedAddress || directAddress;
                                    })()}
                                  </p>
                                </div>
                              )}
                              {slip.order?.customer_phone && (
                                <div>
                                  <Label className="font-medium">Số điện thoại:</Label>
                                  <p className="text-sm">{slip.order.customer_phone}</p>
                                </div>
                              )}
                              <div>
                                <Label className="font-medium">Tổng giá trị đơn hàng:</Label>
                                <p className="text-sm font-medium text-green-600">
                                  {formatCurrency(slip.order?.total_amount || 0)}
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
                            {slip.order?.order_items && slip.order.order_items.length > 0 && (
                              <div>
                                <Label className="font-medium block mb-3">Danh sách sản phẩm cần xuất:</Label>
                                <div className="border rounded-md overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Tên sản phẩm</TableHead>
                                        <TableHead>Mã SP</TableHead>
                                        <TableHead className="text-right">Số lượng</TableHead>
                                        <TableHead className="text-right">Đơn giá</TableHead>
                                        <TableHead className="text-right">Thành tiền</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {slip.order.order_items.map((orderItem, index) => {
                                        // Find corresponding export slip item
                                        const exportItem = slip.export_slip_items?.find(
                                          item => item.product_code === orderItem.product_code
                                        );
                                        
                                        const requestedQuantity = orderItem.quantity;
                                        const actualQuantity = exportItem?.actual_quantity || 0;
                                        
                                        return (
                                          <TableRow key={index}>
                                            <TableCell className="font-medium">{orderItem.product_name}</TableCell>
                                            <TableCell>{orderItem.product_code}</TableCell>
                                            <TableCell className="text-right font-medium text-blue-600">{requestedQuantity}</TableCell>
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

                            {/* Documents - Temporarily disabled */}
                            <div>
                              <Label className="font-medium block mb-3">Tài liệu đính kèm:</Label>
                              <div className="text-sm text-muted-foreground">
                                Chưa có tài liệu đính kèm nào
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {/* Status Update Dropdown - Only show when status can be updated */}
                      {getAvailableStatusOptions(slip.status).length > 0 && (
                        <Select
                          value=""
                          onValueChange={(newStatus) => {
                            console.log('Status changed for slip:', slip.code, 'to:', newStatus);
                            handleStatusUpdateWithSelection(slip.id, newStatus, '');
                          }}
                        >
                          <SelectTrigger className="w-40 h-8 text-xs bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200 hover:border-blue-300 focus:ring-2 focus:ring-blue-200 transition-all duration-200 shadow-sm">
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                                <ArrowRight className="w-2 h-2 text-white" />
                              </div>
                              <SelectValue placeholder="Cập nhật trạng thái" />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="min-w-[220px] p-1">
                            {getAvailableStatusOptions(slip.status).map((option) => (
                              <SelectItem 
                                key={option.value} 
                                value={option.value}
                                className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50 rounded-md p-2"
                              >
                                <div className="flex items-center space-x-3 w-full">
                                  <div className="flex-shrink-0">
                                    {option.value === 'picked' ? (
                                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                        <Package className="w-3 h-3 text-blue-600" />
                                      </div>
                                    ) : option.value === 'cancelled' ? (
                                      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                                        <XCircle className="w-3 h-3 text-red-600" />
                                      </div>
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                        <CheckCircle className="w-3 h-3 text-green-600" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">{option.label}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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


    </div>
  );
}

export default function ExportSlips() {
  return (
    <PermissionGuard 
      requiredPermissions={['EXPORT_SLIPS_VIEW']}
      requireAll={false}
    >
      <ExportSlipsContent />
    </PermissionGuard>
  );
}

