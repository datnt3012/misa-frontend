import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Eye, Edit, Trash2, MoreHorizontal, FileText, Calendar, Download, FileDown } from "lucide-react";
import * as XLSX from 'xlsx';
// PDF generation using @react-pdf/renderer
import { pdf } from '@react-pdf/renderer';
import QuotationPDFDocument from '@/components/quotations/QuotationPDFDocument';
import { useToast } from "@/hooks/use-toast";
import { quotationApi, Quotation } from "@/api/quotation.api";
import { customerApi } from "@/api/customer.api";
import { usersApi } from "@/api/users.api";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, set } from "date-fns";
import { ca, vi } from "date-fns/locale";
import { getErrorMessage } from "@/lib/error-utils";
import { Checkbox } from "@/components/ui/checkbox";
import CreateQuotationForm from "@/components/quotations/CreateQuotationForm";
import CreateOrderFromQuotation from "@/components/quotations/CreateOrderFromQuotation";
import { ORDER_STATUSES, ORDER_STATUS_LABELS_VI } from "@/constants/order-status.constants";

const QuotationsContent: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<Quotation | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [quotationToEdit, setQuotationToEdit] = useState<Quotation | null>(null);
  const [showCreateOrderDialog, setShowCreateOrderDialog] = useState(false);
  const [quotationForOrder, setQuotationForOrder] = useState<Quotation | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [selectedQuotations, setSelectedQuotations] = useState<string[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalQuotations, setTotalQuotations] = useState(0);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  // Fetch quotations function
  const fetchQuotations = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page: currentPage, limit: itemsPerPage };
      if (searchTerm) params.code = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      if (creatorFilter !== 'all') params.createdBy = creatorFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const resp = await quotationApi.getQuotations(params);
      setQuotations(resp.quotations || []);
      setTotalQuotations(resp.total || 0);
    } catch (error) {
      console.error('Error fetching quotations:', error);
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể tải danh sách báo giá"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, statusFilter, typeFilter, creatorFilter, searchTerm, startDate, endDate, toast]);

  // Fetch customers and creators for filters
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersResp, usersResp] = await Promise.all([
          customerApi.getCustomers({ page: 1, limit: 1000 }),
          usersApi.getUsers({ page: 1, limit: 1000 })
        ]);
        setCustomers(customersResp.customers || []);
        setCreators(usersResp.users || []);
      } catch (error) {
        console.error('Error fetching filter data:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleDeleteQuotation = async () => {
    if (!quotationToDelete) return;

    try {
      setLoading(true);
      await quotationApi.deleteQuotation(quotationToDelete.id);
      toast({
        title: "Thành công",
        description: `Đã xóa báo giá ${quotationToDelete.code}`,
      });
      setQuotationToDelete(null);
      setShowDeleteDialog(false);
      fetchQuotations();
    } catch (error) {
      console.error("Error deleting quotation:", error);
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể xóa báo giá"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | string | undefined | null) => {
    const numAmount = Number(amount) || 0;
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0
    }).format(numAmount);
  };

  const maskPhoneNumber = (phone: string) => {
    if (!phone || phone.length < 8) return phone;
    const start = phone.slice(0, 3);
    const end = phone.slice(-3);
    return `${start}****${end}`;
  };

  const calculateTotalAmount = (quotation: Quotation) => {
    if (!quotation.details || quotation.details.length === 0) return 0;
    return quotation.details.reduce((sum, detail) => sum + (detail.price * detail.quantity), 0);
  };

  const calculateTotalQuantity = (quotation: Quotation) => {
    if (!quotation.details || quotation.details.length === 0) return 0;
    return quotation.details.reduce((sum, detail) => sum + detail.quantity, 0);
  };

  // Calculate totals for all quotations
  const totalAmount = quotations.reduce((sum, q) => sum + calculateTotalAmount(q), 0);
  const totalQuantity = quotations.reduce((sum, q) => sum + calculateTotalQuantity(q), 0);

  const handleSelectQuotation = (quotationId: string) => {
    setSelectedQuotations(prev => 
      prev.includes(quotationId) 
        ? prev.filter(id => id !== quotationId)
        : [...prev, quotationId]
    );
  };

  const handleSelectAll = () => {
    if (selectedQuotations.length === quotations.length) {
      setSelectedQuotations([]);
    } else {
      setSelectedQuotations(quotations.map(q => q.id));
    }
  };

  const handleUpdateQuotationStatus = async (quotationId: string, newStatus: string) => {
    try {
      if(!hasPermission('QUOTATIONS_UPDATE_STATUS')) {
        toast({
          title: "Lỗi",
          description: "Bạn không có quyền cập nhật trạng thái báo giá",
          variant: "destructive",
        });
        return;
      }

      await quotationApi.updateQuotationStatus(quotationId, newStatus);

      // Update local state directly with newStatus
      setQuotations(prevQuotations => 
        prevQuotations.map(q => 
          q.id === quotationId ? { ...q, status: newStatus } : q
        )
      );

      toast({
        title: "Thành công",
        description: `Đã cập nhật trạng thái báo giá`,
      });
    }catch(error: any){
      toast({
        title: "Lỗi",
        description: error?.response?.data?.message || error?.message || "Không thể cập nhật trạng thái",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      'completed': { label: 'Hoàn thành', variant: 'default' },
      'pending': { label: 'Chờ xử lý', variant: 'secondary' },
      'cancelled': { label: 'Đã hủy', variant: 'destructive' },
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const exportToExcel = () => {
    if (quotations.length === 0) {
      toast({
        title: "Cảnh báo",
        description: "Không có dữ liệu để xuất",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare data for export
      const exportData = quotations.flatMap((quotation, index) => {
        const statusLabels: Record<string, string> = {
          'completed': 'Hoàn thành',
          'pending': 'Chờ xử lý',
          'cancelled': 'Đã hủy',
        };

        // Tính tổng tiền của tất cả sản phẩm trong báo giá
        const totalAmountForQuotation = calculateTotalAmount(quotation);

        // Map each detail to a new row
        return (quotation.details || []).map((detail, detailIndex) => ({
          'STT': detailIndex === 0 ? `${index + 1}` : `${index + 1}.${detailIndex + 1}`, // Main product gets `index + 1`, others get `index + 1.detailIndex`
          'Mã báo giá': detailIndex === 0 ? quotation.code : '', // Show quotation code only for the first product
          'Ngày tạo': detailIndex === 0 
            ? format(new Date(quotation.created_at), "dd/MM/yyyy HH:mm", { locale: vi }) 
            : '', // Show date only for the first product
          'Khách hàng': detailIndex === 0 ? quotation.customer_name || '' : '',
          'SĐT khách hàng': detailIndex === 0 ? quotation.customer_phone || '' : '',
          'Sản phẩm': detail.product_name || '',
          'Mã sản phẩm': detail.product_code || '',
          'Giá': detail.price || 0,
          'Số lượng': detail.quantity || 0,
          'Thành tiền': detail.price * detail.quantity || 0,
          'Tổng tiền': detailIndex === 0 ? totalAmountForQuotation : '', // Only show total amount on the main product row
          'Ghi chú': detailIndex === 0 ? quotation.note || '' : '',
          'Người tạo': detailIndex === 0 ? quotation.creator?.email || '' : '',
          'Trạng thái': detailIndex === 0 ? (statusLabels[quotation.status] || quotation.status) : '',
        }));
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const colWidths = [
        { wch: 5 },   // STT
        { wch: 15 },  // Mã báo giá
        { wch: 18 },  // Ngày tạo
        { wch: 25 },  // Khách hàng
        { wch: 15 },  // SĐT khách hàng
        { wch: 25 },  // Sản phẩm
        { wch: 15 },  // Mã sản phẩm
        { wch: 15 },  // Giá
        { wch: 12 },  // Số lượng
        { wch: 15 },  // Thành tiền
        { wch: 15 },  // Tổng tiền
        { wch: 30 },  // Ghi chú
        { wch: 25 },  // Người tạo
        { wch: 15 },  // Trạng thái
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Danh sách báo giá');

      // Generate filename with current date
      const filename = `Bao_gia_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);

      toast({
        title: "Thành công",
        description: `Đã xuất ${exportData.length} dòng báo giá ra file Excel`,
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể xuất file Excel"),
        variant: "destructive",
      });
    }
  };

  const exportToPDF = async (quotation: Quotation) => {
    try {
      // Sử dụng @react-pdf/renderer - hỗ trợ tiếng Việt tốt, text selectable
      const totalAmount = calculateTotalAmount(quotation);
      const statusLabels: Record<string, string> = {
        'completed': 'Hoàn thành',
        'pending': 'Chờ xử lý',
        'cancelled': 'Đã hủy',
      };
      
      // Tạo PDF document
      const doc = (
        <QuotationPDFDocument
          quotation={quotation}
          totalAmount={totalAmount}
          statusLabels={statusLabels}
        />
      );
      
      // Generate PDF blob
      const blob = await pdf(doc).toBlob();
      
      // Download file
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bao_gia_${quotation.code}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Thành công",
        description: `Đã xuất báo giá ${quotation.code} ra file PDF`,
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể xuất file PDF"),
        variant: "destructive",
      });
    }
  };


  return (
    <div className="space-y-4 p-2 sm:p-3 md:p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-bold">DANH SÁCH BÁO GIÁ</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Xuất Excel
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            THÊM MỚI
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tìm kiếm theo ID</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nhập ID đơn sản (API ID)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trạng thái</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="pending">Chờ xử lý</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                  <SelectItem value="cancelled">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Người tạo</label>
              <Select value={creatorFilter} onValueChange={setCreatorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả người tạo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả người tạo</SelectItem>
                  {creators.map((creator) => (
                    <SelectItem key={creator.id} value={creator.id}>
                      {creator.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Từ ngày</label>
              <div className="relative">
                <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Đến ngày</label>
              <div className="relative">
                <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={fetchQuotations}>Áp dụng</Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={selectedQuotations.length === quotations.length && quotations.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-center">ID</TableHead>
                  <TableHead className="text-center">Khách hàng</TableHead>
                  <TableHead className="text-left">Sản phẩm</TableHead>
                  <TableHead className="text-center">Giá</TableHead>
                  <TableHead className="text-center">Số lượng</TableHead>
                  <TableHead className="text-center">Thành tiền</TableHead>
                  <TableHead className="text-center">Ghi chú</TableHead>
                  <TableHead className="text-center">Người tạo báo giá</TableHead>
                  <TableHead className="text-center">Trạng thái</TableHead>
                  <TableHead className="w-12 text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      Đang tải...
                    </TableCell>
                  </TableRow>
                ) : quotations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      Không có dữ liệu
                    </TableCell>
                  </TableRow>
                ) : (
                  quotations.map((quotation) => {
                    const totalAmount = calculateTotalAmount(quotation);
                    
                    return (
                      <TableRow key={quotation.id}>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={selectedQuotations.includes(quotation.id)}
                            onCheckedChange={() => handleSelectQuotation(quotation.id)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <div>
                            <div className="font-medium">{quotation.code}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(quotation.created_at), "dd/MM/yyyy", { locale: vi })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(quotation.created_at), "HH:mm", { locale: vi })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div>
                            <div className="font-medium">{quotation.customer_name || 'N/A'}</div>
                            {quotation.customer_phone && (
                              <div className="text-xs text-muted-foreground">
                                {maskPhoneNumber(quotation.customer_phone)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="divide-y divide-slate-100">
                            {quotation.details?.map((item: any, index: number) => (
                                <div key={index} className="text-sm py-5 px-5">
                                  <div className="font-medium text-slate-900 truncate" title={item.product_name || 'N/A'}>{item.product_name || 'N/A'}</div>
                                </div>
                            ))}
                            {(!quotation.details || quotation.details.length === 0) && (
                                  <div className="text-sm text-muted-foreground">Không có sản phẩm</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="divide-y divide-slate-100">
                            {quotation.details?.map((item: any, index: number) => (
                                <div key={index} className="text-sm py-5 px-5">
                                  <div className="font-medium text-slate-900 truncate" title={item.product_name || 'N/A'}>{item.price || 'N/A'}</div>
                                </div>
                            ))}
                            {(!quotation.details || quotation.details.length === 0) && (
                                  <div className="text-sm text-muted-foreground">0</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="divide-y divide-slate-100">
                            {quotation.details?.map((item: any, index: number) => (
                                <div key={index} className="text-sm py-5 px-5">
                                  <div className="font-medium text-slate-900 truncate" title={item.product_name || 'N/A'}>{item.quantity || 'N/A'}</div>
                                </div>
                            ))}
                            {(!quotation.details || quotation.details.length === 0) && (
                                  <div className="text-sm text-muted-foreground">0</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {formatCurrency(totalAmount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="max-w-[200px] truncate text-center">
                            {quotation.note || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {quotation.creator?.email || 'N/A'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Select
                              value={quotation.status || 'pending'}
                              onValueChange={(newStatus) => handleUpdateQuotationStatus(quotation.id, newStatus)}
                              disabled={!hasPermission('QUOTATIONS_UPDATE_STATUS')}
                            >
                              <SelectTrigger className="min-w-[88px] sm:min-w-[104px] h-auto p-0 border-none bg-transparent hover:bg-transparent focus:bg-transparent justify-center">
                                <div className="cursor-pointer inline-flex whitespace-nowrap truncate max-w-[88px] sm:max-w-[104px] text-xs sm:text-sm">
                                  {getStatusBadge(quotation.status || 'pending')}
                                </div>
                              </SelectTrigger>
                              <SelectContent className="min-w-[128px] sm:min-w-[144px]">
                                {(['pending', 'completed', 'cancelled'] as const).map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {ORDER_STATUS_LABELS_VI[status] || status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedQuotation(quotation);
                                setShowDetailDialog(true);
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                Xem chi tiết
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => exportToPDF(quotation)}>
                                <FileDown className="h-4 w-4 mr-2" />
                                Xuất PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setQuotationToEdit(quotation);
                                setShowEditDialog(true);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Chỉnh sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setQuotationForOrder(quotation);
                                setShowCreateOrderDialog(true);
                              }}>
                                <Plus className="h-4 w-4 mr-2" />
                                Tạo đơn hàng từ báo giá
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setQuotationToDelete(quotation);
                                  setShowDeleteDialog(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                {/* Total row */}
                {quotations.length > 0 && (
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={4} className="text-center">Tổng</TableCell>
                    <TableCell className="text-center"></TableCell>
                    <TableCell className="text-center">{formatCurrency(totalQuantity)}</TableCell>
                    <TableCell className="text-center">{formatCurrency(totalAmount)}</TableCell>
                    <TableCell colSpan={4} className="text-center"></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalQuotations > itemsPerPage && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalQuotations)} trong tổng số {totalQuotations}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage * itemsPerPage >= totalQuotations}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa báo giá {quotationToDelete?.code}? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDeleteQuotation}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết báo giá {selectedQuotation?.code}</DialogTitle>
          </DialogHeader>
          {selectedQuotation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Mã báo giá</label>
                  <div className="text-sm">{selectedQuotation.code}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Trạng thái</label>
                  <div>{getStatusBadge(selectedQuotation.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Khách hàng</label>
                  <div className="text-sm">{selectedQuotation.customer_name || 'N/A'}</div>
                  {selectedQuotation.customer_phone && (
                    <div className="text-xs text-muted-foreground">{selectedQuotation.customer_phone}</div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Người tạo</label>
                  <div className="text-sm">{selectedQuotation.creator?.email || 'N/A'}</div>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Ghi chú</label>
                  <div className="text-sm">{selectedQuotation.note || '-'}</div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Chi tiết sản phẩm</label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead className="text-center">Giá</TableHead>
                      <TableHead className="text-center">Số lượng</TableHead>
                      <TableHead className="text-center">Thành tiền</TableHead>
                      <TableHead className="text-center">Ghi chú</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedQuotation.details?.map((detail) => (
                      <TableRow key={detail.id}>
                        <TableCell className="text-left">{detail.product_name || 'N/A'}</TableCell>
                        <TableCell className="text-center">{formatCurrency(detail.price)}</TableCell>
                        <TableCell className="text-center">{detail.quantity}</TableCell>
                        <TableCell className="text-center">{formatCurrency(detail.price * detail.quantity)}</TableCell>
                        <TableCell className="text-center">{detail.note || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedQuotation && (
              <Button 
                variant="outline" 
                onClick={() => exportToPDF(selectedQuotation)}
                className="mr-auto"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Xuất PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Quotation Dialog */}
      <CreateQuotationForm
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onQuotationCreated={() => {
          setShowCreateDialog(false);
          fetchQuotations();
        }}
      />

      {/* Edit Quotation Dialog */}
      <CreateQuotationForm
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) setQuotationToEdit(null);
        }}
        onQuotationCreated={() => {
          setShowEditDialog(false);
          setQuotationToEdit(null);
          fetchQuotations();
        }}
        initialQuotation={quotationToEdit}
      />

      {/* Create Order from Quotation Dialog */}
      <CreateOrderFromQuotation
        open={showCreateOrderDialog}
        onOpenChange={(open) => {
          setShowCreateOrderDialog(open);
          if (!open) setQuotationForOrder(null);
        }}
        quotation={quotationForOrder}
        onOrderCreated={() => {
          setShowCreateOrderDialog(false);
          setQuotationForOrder(null);
        }}
      />
    </div>
  );
};

export default QuotationsContent;

