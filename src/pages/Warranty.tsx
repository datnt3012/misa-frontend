import React, { useState, useEffect, useCallback } from "react";
import { Search, Filter, MoreHorizontal, Eye, Edit, Trash2, RotateCw, Loader, ChevronDown, ChevronUp, Plus, Printer } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { warrantyTicketApi } from "@/api/warrantyTicket.api";
import { usersApi } from "@/api/users.api";
import { orderApi } from "@/api/order.api";
import { WarrantyTicketDetailDialog } from "@/components/warranty/WarrantyTicketDetailDialog";
import { ProcessWarrantyDialog } from "@/components/warranty/ProcessWarrantyDialog";
import CreateWarrantyTicketForm from "@/components/orders/CreateWarrantyTicketForm";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { format, parseISO, differenceInDays } from "date-fns";
import { vi } from "date-fns/locale";
import { WARRANTY_STATUS_NAMES, WARRANTY_STATUS_COLORS } from "@/constants/warranty.constants";

const formatWarrantyRemaining = (serial: any): { text: string; type: string } => {
  try {
    const startDateStr = serial.warrantyStartDate;
    const months = serial.warrantyMonths;
    if (!startDateStr || !months) {
      return { text: "Chưa kích hoạt", type: "unknown" };
    }
    
    const startDate = parseISO(startDateStr);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);
    endDate.setHours(23, 59, 59, 999);
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = differenceInDays(endDate, now);
    
    if (Number.isNaN(diff)) {
      return { text: "Chưa kích hoạt", type: "unknown" };
    }
    
    if (diff >= 0) {
      return { text: `Còn ${diff} ngày`, type: "active" };
    } else {
      return { 
        text: `Hết hạn từ ${format(endDate, "dd/MM/yyyy")}`, 
        type: "expired" 
      };
    }
  } catch {
    return { text: "Chưa kích hoạt", type: "unknown" };
  }
};

interface WarrantyTicket {
  id: string;
  code?: string;
  order?: {
    id: string;
    code: string;
    receiverName?: string;
    receiverPhone?: string;
    customer?: {
      id: string;
      name: string;
      phoneNumber?: string;
    };
  };
  warehouseId?: {
    id: string;
    code: string;
    name: string;
  };
  personInCharge?: {
    id: string;
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  customer?: {
    id: string;
    name: string;
    phoneNumber?: string;
  };
  note?: string;
  details?: Array<{
    id: string;
    serialId: string;
    serialNumber: string;
    productId: string;
    productName: string;
    warrantyMonths: number;
    warrantyStartDate?: string;
    warrantyActived: boolean;
    createdAt: string;
    processStatus?: string;
    processed?: boolean;
    processedAt?: string;
  }>;
  status: string;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
  receivedAt?: string;
  overdue?: boolean;
}

const WarrantyPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<WarrantyTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keywords, setKeywords] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [personInChargeFilter, setPersonInChargeFilter] = useState<string>("");
  const [personInCharges, setPersonInCharges] = useState<any[]>([]);
  const [createdDateFrom, setCreatedDateFrom] = useState("");
  const [createdDateTo, setCreatedDateTo] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<WarrantyTicket | null>(null);
  const [selectedTicketDetail, setSelectedTicketDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [selectedTicketForProcess, setSelectedTicketForProcess] = useState<any>(null);
  const [loadingProcessDetail, setLoadingProcessDetail] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<WarrantyTicket | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [showChangePersonDialog, setShowChangePersonDialog] = useState(false);
  const [ticketToChangePerson, setTicketToChangePerson] = useState<WarrantyTicket | null>(null);
  const [changingPerson, setChangingPerson] = useState(false);
  const [selectedNewPersonId, setSelectedNewPersonId] = useState<string>("");
  const [summary, setSummary] = useState<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  } | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showOrderSelectDialog, setShowOrderSelectDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      setUpdatingStatus(ticketId);
      await warrantyTicketApi.updateWarrantyTicket(ticketId, { status: newStatus });
      toast({
        title: "Thành công",
        description: "Đã cập nhật trạng thái phiếu bảo hành",
      });
      fetchTickets();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể cập nhật trạng thái",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticketToDelete) return;
    try {
      setDeleting(true);
      await warrantyTicketApi.deleteWarrantyTicket(ticketToDelete.id);
      toast({
        title: "Thành công",
        description: "Đã xóa phiếu bảo hành",
      });
      setShowDeleteDialog(false);
      setTicketToDelete(null);
      fetchTickets();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể xóa phiếu bảo hành",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmDelete = (ticket: WarrantyTicket, e: React.MouseEvent) => {
    e.stopPropagation();
    setTicketToDelete(ticket);
    setShowDeleteDialog(true);
  };

  const handleResetFilters = () => {
    setKeywords("");
    setStatusFilter("all");
    setPersonInChargeFilter("");
    setCreatedDateFrom("");
    setCreatedDateTo("");
    setFiltersCollapsed(false);
    setPage(1);
  };

const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: pageSize,
      };
      if (keywords) params.keywords = keywords;
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (personInChargeFilter) params.personInCharge = personInChargeFilter;
      if (createdDateFrom) params.createdStartDate = createdDateFrom;
      if (createdDateTo) params.createdEndDate = createdDateTo;

      const response = await warrantyTicketApi.getWarrantyTickets(params);
      const apiData = response?.data;
      const data = apiData?.data || apiData;
      const ticketsData = Array.isArray(data?.rows) ? data.rows : [];

      setTickets(ticketsData);
      setTotal(typeof data?.count === "number" ? data.count : 0);
      setTotalPages(Math.max(1, Math.ceil((data?.count || 0) / pageSize)));
      if (data?.summary) {
        setSummary({
          total: data.summary.total || 0,
          pending: data.summary.pending || 0,
          inProgress: data.summary.inProgress || 0,
          completed: data.summary.completed || 0,
          overdue: data.summary.overdue || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching warranty tickets:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách phiếu bảo hành",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keywords, statusFilter, personInChargeFilter, createdDateFrom, createdDateTo, toast]);

  const handleGetTicketDetail = async (ticketId: string) => {
    if (!ticketId) return;
    setLoadingDetail(true);
    try {
      const response = await warrantyTicketApi.getWarrantyTicket(ticketId);
      const ticketData = response?.data || response;
      if (ticketData) {
        setSelectedTicket(ticketData);
        setSelectedTicketDetail(ticketData);
      }
    } catch (error) {
      console.error("Error fetching ticket detail:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải thông tin phiếu bảo hành",
        variant: "destructive"
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    const ticketId = searchParams.get("id");
    if (ticketId && showDetailDialog === false) {
      const openTicketDetail = async () => {
        setLoadingDetail(true);
        setShowDetailDialog(true);
        
        // Clear URL params after reading to prevent re-trigger
        setSearchParams({}, { replace: true });
        
        try {
          const response = await warrantyTicketApi.getWarrantyTicket(ticketId);
          const ticketData = response?.data || response;
          if (ticketData) {
            setSelectedTicket(ticketData);
            setSelectedTicketDetail(ticketData);
          } else {
            toast({
              title: "Lỗi",
              description: "Không tìm thấy phiếu bảo hành",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error("Error fetching ticket detail:", error);
          toast({
            title: "Lỗi",
            description: "Không thể tải thông tin phiếu bảo hành",
            variant: "destructive"
          });
        } finally {
          setLoadingDetail(false);
        }
      };
      openTicketDetail();
    }
  }, [searchParams]);

  const fetchPersonInCharges = async () => {
    try {
      const usersResp = await usersApi.getUsers({ page: 1, limit: 1000 });
      setPersonInCharges(usersResp.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      setPersonInCharges([]);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await orderApi.getOrders({ page: 1, limit: 500, type: 'sale' });
      const data = response?.data || response;
      setOrders(data?.rows || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchPersonInCharges();
  }, []);

  const handleProcessWarranty = async (ticket: WarrantyTicket) => {
    setSelectedTicketForProcess(ticket);
    setShowProcessDialog(true);
    setLoadingProcessDetail(true);
    try {
      const response = await warrantyTicketApi.getWarrantyTicket(ticket.id);
      const data = response?.data || response;
      setSelectedTicketForProcess(data);
    } catch (error) {
      console.error("Error fetching warranty ticket detail:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải chi tiết phiếu bảo hành",
        variant: "destructive"
      });
    } finally {
      setLoadingProcessDetail(false);
    }
  };

  const handleViewDetail = async (ticket: WarrantyTicket) => {
    setSelectedTicket(ticket);
    setShowDetailDialog(true);
    setLoadingDetail(true);
    try {
      const response = await warrantyTicketApi.getWarrantyTicket(ticket.id);
      const data = response?.data || response;
      setSelectedTicketDetail(data);
    } catch (error) {
      console.error("Error fetching warranty ticket detail:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải chi tiết phiếu bảo hành",
        variant: "destructive"
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenChangePersonDialog = (ticket: WarrantyTicket) => {
    setTicketToChangePerson(ticket);
    setSelectedNewPersonId(ticket.personInCharge?.id || "");
    setShowChangePersonDialog(true);
  };

  const handleChangePersonInCharge = async (userId: string) => {
    if (!ticketToChangePerson || !userId) return;
    try {
      setChangingPerson(true);
      await warrantyTicketApi.updateWarrantyTicket(ticketToChangePerson.id, { personInCharge: userId });
      toast({ title: "Thành công", description: "Đã cập nhật người phụ trách" });
      setShowChangePersonDialog(false);
      setTicketToChangePerson(null);
      fetchTickets();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error?.response?.data?.message || "Không thể cập nhật người phụ trách",
        variant: "destructive"
      });
    } finally {
      setChangingPerson(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  return (
    <div className="p-6 space-y-4">
      {/* Filter Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo mã phiếu, mã đơn hàng, serial..."
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setPage(1);
                      fetchTickets();
                    }
                  }}
                  className="w-72 pl-8"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="new">Mới</SelectItem>
                <SelectItem value="received">Đã tiếp nhận</SelectItem>
                <SelectItem value="in_progress">Đang xử lý</SelectItem>
                <SelectItem value="completed">Hoàn thành</SelectItem>
                <SelectItem value="cancelled">Hủy</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => setFiltersCollapsed(!filtersCollapsed)}
            >
              <Filter className="w-4 h-4" />
              {filtersCollapsed ? "Thu gọn" : "Mở rộng"}
              {filtersCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Button
              onClick={handleResetFilters}
              variant="outline"
              disabled={loading}
            >
              {!loading ? <RotateCw className="h-4 w-4" /> : <Loader className="h-4 w-4" />}
            </Button>
            <div className="ml-auto">
              <Button
                onClick={() => {
                  fetchOrders();
                  setShowCreateDialog(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Tạo phiếu bảo hành
              </Button>
            </div>
          </div>
          {filtersCollapsed && (
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Ngày tạo:</label>
                <Input
                  type="date"
                  className="w-36"
                  value={createdDateFrom}
                  onChange={(e) => setCreatedDateFrom(e.target.value)}
                />
                <span className="text-sm font-medium">-</span>
                <Input
                  type="date"
                  className="w-36"
                  value={createdDateTo}
                  onChange={(e) => setCreatedDateTo(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Combobox
                  options={[
                    { label: "Tất cả người phụ trách", value: "" },
                    ...personInCharges.map((user) => {
                      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                      const displayName = fullName || user.username || user.email || 'Không xác định';
                      return {
                        label: displayName,
                        value: user.id
                      };
                    })
                  ]}
                  value={personInChargeFilter}
                  onValueChange={(value) => {
                    setPersonInChargeFilter(Array.isArray(value) ? value[0] : value);
                    setPage(1);
                  }}
                  placeholder="Người phụ trách"
                  searchPlaceholder="Tìm người phụ trách..."
                  className="flex-1"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng phiếu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đã tiếp nhận</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{summary.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đang xử lý</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{summary.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoàn thành</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quá hạn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.overdue}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <div
        className="overflow-x-scroll overflow-y-auto w-full max-h-[calc(100vh-420px)]"
        style={{ scrollbarGutter: "stable" }}
      >
        <div
          className="table-wrapper"
          style={{ display: "inline-block", minWidth: "100%" }}
        >
          <Table className="min-w-[1000px] w-full">
            <TableHeader className="bg-gray-100">
              <TableRow>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none font-semibold text-center min-w-[120px]">
                      <div className="flex justify-center items-center gap-1">Mã phiếu</div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none font-semibold text-center min-w-[120px]">
                      <div className="flex justify-center items-center gap-1">Ngày nhận</div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none font-semibold text-center min-w-[150px]">
                      <div className="flex justify-center items-center gap-1">Khách hàng</div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none font-semibold text-center min-w-[120px]">
                      <div className="flex justify-center items-center gap-1">SĐT</div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none font-semibold text-center min-w-[120px]">
                      <div className="flex justify-center items-center gap-1">Mã đơn hàng</div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none font-semibold text-center min-w-[180px]">
                      <div className="flex justify-center items-center gap-1">Sản phẩm</div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none font-semibold text-center min-w-[60px]">
                      <div className="flex justify-center items-center gap-1">SL</div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none font-semibold text-center min-w-[140px]">
                      <div className="flex justify-center items-center gap-1">Người phụ trách</div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none font-semibold text-center min-w-[100px]">
                      <div className="flex justify-center items-center gap-1">Trạng thái</div>
                    </TableHead>
                    <TableHead className="font-semibold text-center min-w-[80px]">
                      <div className="text-center">Thao tác</div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                          <span className="text-muted-foreground">Đang tải dữ liệu...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : tickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        {keywords || statusFilter || personInChargeFilter || createdDateFrom || createdDateTo
                          ? "Không tìm thấy phiếu bảo hành nào"
                          : "Chưa có phiếu bảo hành nào"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    tickets.map((ticket) => {
                      const canProcessWarranty = hasPermission('WARRANTY_TICKETS_MANAGE') || user?.id === ticket.personInCharge?.id;
    const handleExportTicket = async (ticketId: string, ticketCode?: string) => {
      try {
        const blob = await warrantyTicketApi.exportWarrantyTicket(ticketId);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `phieu-bao-hanh-${ticketCode || ticketId}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast({
          title: "Thành công",
          description: "Đã tải file xuống",
        });
      } catch (error: any) {
        console.error("Error exporting ticket:", error);
        toast({
          title: "Lỗi",
          description: error.response?.data?.message || error.message || "Không thể xuất file",
          variant: "destructive",
        });
      }
    };

   return (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium text-center min-w-[120px]">
                          <div className="truncate" title={ticket.code || ticket.id}>
                            <Link
                              to="#"
                              className="text-primary hover:underline"
                              onClick={() => handleViewDetail(ticket)}
                            >
                              {ticket.code || ticket.id.slice(0, 8)}
                            </Link>
                            {ticket.overdue && (
                              <Badge className="ml-1 border border-red-500 bg-transparent text-red-500 text-[10px] px-1.5 py-0.5 hover:bg-transparent">
                                Quá hạn
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center min-w-[120px]">
                          {ticket.receivedAt
                            ? format(new Date(ticket.receivedAt), "dd/MM/yyyy", { locale: vi })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center min-w-[150px]">
                          <div className="truncate">{ticket.customer?.name || ticket.order?.customer?.name || "-"}</div>
                        </TableCell>
                        <TableCell className="text-center min-w-[120px]">
                          <div className="truncate">{ticket.customer?.phoneNumber || ticket.order?.customer?.phoneNumber || "-"}</div>
                        </TableCell>
                        <TableCell className="text-center min-w-[120px]">
                          <div className="truncate">
                            {ticket.order?.code ? (
                              <Link
                                to={`/orders/${ticket.order.id}`}
                                className="text-primary hover:underline"
                              >
                                {ticket.order.code}
                              </Link>
                            ) : (
                              "-"
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="p-0 text-center min-w-[180px]">
                          <div className="divide-y divide-slate-100">
                            {(() => {
                              const uniqueProducts = [...new Set(ticket.details?.map((d: any) => d.productName) || [])];
                              return uniqueProducts.map((productName, idx) => (
                                <div key={idx} className="text-sm py-2 px-2 truncate">
                                  {productName || "-"}
                                </div>
                              ));
                            })()}
                            {(ticket.details?.length === 0) && (
                              <div className="text-sm text-muted-foreground py-2 px-2">-</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="p-0 text-center min-w-[60px]">
                          <div className="divide-y divide-slate-100">
                            {(() => {
                              const uniqueProducts = [...new Set(ticket.details?.map((d: any) => d.productName) || [])];
                              return uniqueProducts.map((productName, idx) => {
                                const productCount = ticket.details?.filter((d: any) => d.productName === productName).length || 0;
                                return (
                                  <div key={idx} className="text-sm py-2 px-2">
                                    {productCount}
                                  </div>
                                );
                              });
                            })()}
                            {(ticket.details?.length === 0) && (
                              <div className="text-sm text-muted-foreground py-2 px-2">-</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center min-w-[140px]">
                          <div className="truncate">
                            {ticket.personInCharge?.firstName || ticket.personInCharge?.lastName || ticket.personInCharge?.username || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-center min-w-[100px]">
                          <Select
                            value={ticket.status}
                            onValueChange={(value) => {
                              if (value !== ticket.status) {
                                handleUpdateStatus(ticket.id, value);
                              }
                            }}
                            disabled={updatingStatus === ticket.id}
                          >
                            <SelectTrigger className="min-w-[100px] h-auto p-0 border-none bg-transparent hover:bg-transparent focus:bg-transparent justify-center">
                              <div className="cursor-pointer inline-flex whitespace-nowrap text-xs">
                                <Badge
                                  className={
                                    WARRANTY_STATUS_COLORS[ticket.status] || "bg-gray-100"
                                  }
                                >
                                  {WARRANTY_STATUS_NAMES[ticket.status] ||
                                    ticket.status}
                                </Badge>
                              </div>
                            </SelectTrigger>
                            <SelectContent className="min-w-[120px]">
                              <SelectItem value="new">Mới</SelectItem>
                              <SelectItem value="received">Đã tiếp nhận</SelectItem>
                              <SelectItem value="in_progress">Đang xử lý</SelectItem>
                              <SelectItem value="completed">Hoàn thành</SelectItem>
                              <SelectItem value="cancelled">Hủy</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center min-w-[80px]">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-background border shadow-lg z-50"
                            >
                              <DropdownMenuItem
                                onClick={() => handleViewDetail(ticket)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Xem chi tiết
                              </DropdownMenuItem>
                              {canProcessWarranty && (
                              <DropdownMenuItem onClick={() => handleProcessWarranty(ticket)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Xử lý bảo hành
                              </DropdownMenuItem>
                            )}
                              <DropdownMenuItem onClick={() => handleOpenChangePersonDialog(ticket)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Đổi người phụ trách
                              </DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleExportTicket(ticket.id, ticket.code)}>
                                 <Printer className="mr-2 h-4 w-4" />
                                 In phiếu
                               </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => handleConfirmDelete(ticket, e)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hủy phiếu
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );})
                  )}
              </TableBody>
            </Table>
        </div>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="flex justify-center flex-1">
            <Pagination>
              <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) setPage(page - 1);
                      }}
                      className={page === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    if (pageNum < 1 || pageNum > totalPages) return null;
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(pageNum);
                          }}
                          isActive={page === pageNum}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  {page < totalPages - 2 && (
                    <>
                      {page < totalPages - 3 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(totalPages);
                          }}
                        >
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    </>
                  )}
                  <PaginationItem>
                    <PaginationNext 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page < totalPages) setPage(page + 1);
                      }}
                      className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
</PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Label htmlFor="display-limit" className="text-xs font-medium">
              Hiển thị:
            </Label>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(parseInt(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-16 h-8">
                <SelectValue placeholder="SL" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground whitespace-nowrap">/ trang ({total})</span>
          </div>
        </div>
      )}
  
      <WarrantyTicketDetailDialog
        open={showDetailDialog}
        onOpenChange={(open) => {
          setShowDetailDialog(open);
          if (!open) {
            setSelectedTicket(null);
            setSelectedTicketDetail(null);
          }
        }}
        ticketDetail={selectedTicketDetail}
        loading={loadingDetail}
        onRefresh={() => {
          handleGetTicketDetail(selectedTicket?.id);
          fetchTickets();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open);
        if (!open) {
          setTicketToDelete(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa phiếu bảo hành</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa phiếu bảo hành <strong>{ticketToDelete?.code || ticketToDelete?.id}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setTicketToDelete(null);
              }}
              disabled={deleting}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTicket}
              disabled={deleting}
            >
              {deleting ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateWarrantyTicketForm
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) {
            setSelectedOrderId("");
          }
        }}
        onOrderCreated={() => fetchTickets()}
        showOrderSelector={true}
      />

      {/* Process Warranty Dialog */}
      <ProcessWarrantyDialog
        open={showProcessDialog}
        onOpenChange={(open) => {
          setShowProcessDialog(open);
          if (!open) {
            setSelectedTicketForProcess(null);
          }
        }}
        ticketDetail={selectedTicketForProcess}
        onRefresh={() => fetchTickets()}
      />

      {/* Change Person In Charge Dialog */}
      <Dialog open={showChangePersonDialog} onOpenChange={(open) => {
        setShowChangePersonDialog(open);
        if (!open) {
          setTicketToChangePerson(null);
          setSelectedNewPersonId("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi người phụ trách</DialogTitle>
            <DialogDescription>
              Chọn người phụ trách mới cho phiếu bảo hành {ticketToChangePerson?.code || ticketToChangePerson?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Combobox
              options={personInCharges.map(u => ({ 
                label: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username, 
                value: u.id 
              }))}
              value={selectedNewPersonId || ticketToChangePerson?.personInCharge?.id || ""}
              onValueChange={(value) => setSelectedNewPersonId(value)}
              placeholder="Chọn người phụ trách"
              searchPlaceholder="Tìm kiếm..."
              disabled={changingPerson}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowChangePersonDialog(false);
              setSelectedNewPersonId("");
            }}>Hủy</Button>
            <Button onClick={() => handleChangePersonInCharge(selectedNewPersonId)} disabled={changingPerson || !selectedNewPersonId}>
              {changingPerson ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarrantyPage;