import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Eye, Edit, Tag, DollarSign, ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal, CreditCard, Package, Banknote, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { orderApi } from "@/api/order.api";
import { categoriesApi } from "@/api/categories.api";
import { PaymentDialog } from "@/components/PaymentDialog";
import { useAuth } from "@/hooks/useAuth";
import { PermissionGuard } from "@/components/PermissionGuard";
import CreateOrderForm from "@/components/orders/CreateOrderForm";
import { OrderDetailDialog } from "@/components/orders/OrderDetailDialog";
import { OrderViewDialog } from "@/components/orders/OrderViewDialog";
import { OrderTagsManager } from "@/components/orders/OrderTagsManager";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrderSpecificExportSlipCreation } from "@/components/inventory/OrderSpecificExportSlipCreation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import CreatorDisplay from "@/components/orders/CreatorDisplay";
import { getErrorMessage } from "@/lib/error-utils";
import { getOrderStatusConfig, ORDER_STATUSES, ORDER_STATUS_LABELS_VI } from "@/constants/order-status.constants";


const OrdersContent: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [creators, setCreators] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetailDialog, setShowOrderDetailDialog] = useState(false);
  const [showOrderViewDialog, setShowOrderViewDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showTagsManager, setShowTagsManager] = useState(false);
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [showExportSlipDialog, setShowExportSlipDialog] = useState(false);
  const [selectedOrderForExport, setSelectedOrderForExport] = useState<any>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalOrders, setTotalOrders] = useState(0);
  
  // Summary state from API
  const [summary, setSummary] = useState<{
    totalAmount: number;
    totalInitialPayment: number;
    totalDebt: number;
  } | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch orders function
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page: currentPage, limit: itemsPerPage };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.categories = categoryFilter;
      if (searchTerm) params.search = searchTerm;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (creatorFilter !== 'all') params.creatorFilter = creatorFilter;
      const resp = await orderApi.getOrders(params);
      console.log('[Orders] API response:', {
        ordersCount: resp.orders?.length || 0,
        total: resp.total,
        hasSummary: !!resp.summary,
        summary: resp.summary,
      });
      
      setOrders(resp.orders || []);
      setTotalOrders(resp.total || 0);
      
      // Set summary from API if available
      if (resp.summary) {
        console.log('[Orders] Setting summary from API:', resp.summary);
        setSummary(resp.summary);
      } else {
        console.log('[Orders] No summary from API, using fallback calculation');
        // Fallback: calculate from orders if summary not available
        setSummary(null);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể tải danh sách đơn hàng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, statusFilter, categoryFilter, searchTerm, startDate, endDate, creatorFilter, toast]);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoriesApi.getCategories({ page: 1, limit: 1000 });
        // Filter out deleted categories
        const activeCategories = response.categories.filter(cat => !cat.isDeleted);
        setCategories(activeCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Handle creating export slip
  const handleCreateExportSlip = (order: any) => {
    setSelectedOrderForExport(order);
    setShowExportSlipDialog(true);
  };

  // Handle checkbox selection
  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(order => order.id));
    }
  };

  // Handle delete orders
  const handleDeleteOrders = async () => {
    if (selectedOrders.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn đơn hàng cần xóa",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const deletePromises = selectedOrders.map(orderId =>
        orderApi.deleteOrder(orderId)
      );
      
      const responses = await Promise.all(deletePromises);
      
      toast({
        title: "Thành công",
        description: `Đã xóa ${selectedOrders.length} đơn hàng`,
      });
      
      setSelectedOrders([]);
      setShowDeleteDialog(false);
      fetchOrders();
    } catch (error) {
      console.error("Error deleting orders:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể xóa đơn hàng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle delete single order
  const handleDeleteSingleOrder = async () => {
    if (!orderToDelete) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy đơn hàng cần xóa",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await orderApi.deleteOrder(orderToDelete.id);
      
      toast({
        title: "Thành công",
        description: response.message || `Đã xóa đơn hàng ${orderToDelete.order_number}`,
      });
      
      setOrderToDelete(null);
      setShowDeleteDialog(false);
      fetchOrders();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể xóa đơn hàng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage]); // Fetch when pagination changes

  // Removed automatic refresh - only reload on user actions

  const fetchCreators = async () => {
    setCreators([]); // Not implemented on BE yet
  };

  const formatCurrency = (amount: number | string | undefined | null) => {
    const numAmount = Number(amount) || 0;
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0
    }).format(numAmount);
  };

  // Format VND without currency symbol for per-item unit prices
  const formatVndNoSymbol = (amount: number | string | undefined | null) => {
    const numAmount = Number(amount) || 0;
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0
    }).format(numAmount);
  };

  // Mask phone number - hide 4 middle digits
  const maskPhoneNumber = (phone: string) => {
    if (!phone || phone.length < 8) return phone;
    const start = phone.slice(0, 3);
    const end = phone.slice(-3);
    const middle = '*'.repeat(4);
    return `${start}${middle}${end}`;
  };

  // Format address to show only district - city
  const formatAddress = (address: string) => {
    if (!address) return "";
    // Extract district/province from address string
    const parts = address.split(',').map(part => part.trim());
    if (parts.length >= 2) {
      return `${parts[parts.length - 2]} - ${parts[parts.length - 1]}`;
    }
    return address;
  };

  // Handle quick note update
  const handleQuickNote = async (orderId: string, note: string) => {
    try {
      await orderApi.updateOrder(orderId, { notes: note });
      
      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, notes: note } : order
      ));
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể cập nhật ghi chú",
        variant: "destructive",
      });
    }
  };

  // Handle order status update
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await orderApi.updateOrder(orderId, { status: newStatus as any });
      
      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      
      toast({
        title: "Thành công",
        description: "Đã cập nhật trạng thái đơn hàng",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể cập nhật trạng thái",
        variant: "destructive",
      });
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  
  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchOrders();
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4" />;
    }
    return sortDirection === "asc" ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  const getStatusBadge = (status: string) => {
    const config = getOrderStatusConfig(status);
    // Thu nhỏ chữ cho status "delivery_failed" vì label quá dài
    const isLongLabel = status === 'delivery_failed';
    return (
      <Badge 
        variant={config.variant} 
        className={isLongLabel ? 'text-[10px] px-1.5 py-0.5' : ''}
      >
        {config.label}
      </Badge>
    );
  };

  // Use summary from API if available, otherwise calculate from orders
  const totals = summary ? {
    totalAmount: summary.totalAmount,
    paidAmount: summary.totalInitialPayment,
    debtAmount: summary.totalDebt,
  } : orders.reduce((acc, order) => ({
    totalAmount: acc.totalAmount + (order.total_amount || 0),
    paidAmount: acc.paidAmount + (order.initial_payment || order.paid_amount || 0),
    debtAmount: acc.debtAmount + (order.debt_amount || 0),
  }), { totalAmount: 0, paidAmount: 0, debtAmount: 0 });

  return (
    <div className="min-h-screen bg-background p-2 sm:p-3 md:p-4">
      <div className="w-full mx-auto space-y-3 sm:space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">📋 DANH SÁCH ĐƠN HÀNG</h1>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          THÊM MỚI
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <Input
                placeholder="Nhập ID đơn sản (API ID)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="pending">Chờ xử lý</SelectItem>
                <SelectItem value="processing">Đang xử lý</SelectItem>
                <SelectItem value="delivered">Đã giao</SelectItem>
                <SelectItem value="completed">Hoàn thành</SelectItem>
                <SelectItem value="cancelled">Đã hủy</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Chọn loại sản phẩm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Từ ngày:</label>
              <Input
                type="date"
                className="w-40"
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Đến ngày:</label>
              <Input
                type="date"
                className="w-40"
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* Creator Filter */}
            <Select value={creatorFilter} onValueChange={setCreatorFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Người tạo đơn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả người tạo</SelectItem>
                {creators.map((creator) => (
                  <SelectItem key={creator.id} value={creator.id}>
                    {creator.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Apply Filters Button */}
            <Button 
              onClick={handleApplyFilters}
              className="ml-auto"
            >
              Áp dụng
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Row */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <div className="text-sm text-muted-foreground">Đơn hàng</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(totals.totalAmount)}</div>
              <div className="text-sm text-muted-foreground">Tổng tiền</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.paidAmount)}</div>
              <div className="text-sm text-muted-foreground">Đã trả</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totals.debtAmount)}</div>
              <div className="text-sm text-muted-foreground">Còn nợ</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Bar */}
      {selectedOrders.length > 0 && (
        <Card className="shadow-sm border bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-700">
                  Đã chọn {selectedOrders.length} đơn hàng
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setShowDeleteDialog(true)}
                  variant="destructive"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Xóa
                </Button>
                <Button 
                  onClick={() => setSelectedOrders([])}
                  variant="outline"
                  size="sm"
                >
                  Bỏ chọn
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card className="shadow-sm border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-full text-xs sm:text-sm">
              <TableHeader>
                <TableRow className="border-b bg-slate-50/50">
                  <TableHead className="w-10 sm:w-12 py-1 sm:py-2 border-r border-slate-200">
                    <input 
                      type="checkbox" 
                      className="rounded" 
                      checked={selectedOrders.length === orders.length && orders.length > 0}
                      onChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100/50 py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 min-w-[96px] sm:min-w-[110px] text-center" 
                    onClick={() => handleSort("order_number")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      ID
                      {getSortIcon("order_number")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100/50 py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 min-w-[120px] sm:min-w-[140px] text-center" 
                    onClick={() => handleSort("customer_name")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Khách hàng
                      {getSortIcon("customer_name")}
                    </div>
                  </TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[80px] sm:min-w-[90px]">Sản phẩm</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[80px] sm:min-w-[90px]">Giá</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[64px] sm:min-w-[70px]">Số lượng</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[96px] sm:min-w-[110px]">Thanh toán</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 min-w-[112px] sm:min-w-[130px] text-center">Ghi chú</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 min-w-[100px] sm:min-w-[110px] text-center">Người tạo đơn</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 min-w-[112px] sm:min-w-[130px] text-center">Ngày hoàn thành</TableHead>
                  <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 min-w-[88px] sm:min-w-[104px] text-center whitespace-nowrap">Trạng thái</TableHead>
                  <TableHead className="text-center py-1 sm:py-2 font-medium text-slate-700 min-w-[80px] sm:min-w-[90px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6">
                      Đang tải...
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6">
                      Không có đơn hàng nào
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => {
                    // Convert tag names to tag objects for display
                    const tagNames = order.tags || [];
                    const allPredefinedTags = [
                      { id: 'tag_chua_doi_soat', name: 'Chưa đối soát', color: '#ef4444' },
                      { id: 'tag_da_doi_soat', name: 'Đã đối soát', color: '#10b981' },
                      { id: 'tag_khach_moi', name: 'Khách mới', color: '#3b82f6' },
                      { id: 'tag_khach_quay_lai', name: 'Khách hàng quay lại', color: '#8b5cf6' },
                      { id: 'tag_uu_tien', name: 'Ưu tiên', color: '#f59e0b' },
                      { id: 'tag_loi', name: 'Lỗi', color: '#dc2626' },
                    ];
                    
                    const tags = tagNames.map(tagName => 
                      allPredefinedTags.find(tag => tag.name === tagName)
                    ).filter(Boolean);
                    
                    const specialTags = tags.filter((t: any) => t.name === 'Đã đối soát' || t.name === 'Chưa đối soát');
                    const otherTags = tags.filter((t: any) => t.name !== 'Đã đối soát' && t.name !== 'Chưa đối soát');
                    const hasReconciliation = specialTags.some((tag: any) => tag.name === 'Đã đối soát');
                    
                    return (
                      <TableRow key={order.id} className="hover:bg-slate-50/50 border-b border-slate-100">
                        <TableCell className="py-3 border-r border-slate-200">
                          <input 
                            type="checkbox" 
                            className="rounded" 
                            checked={selectedOrders.includes(order.id)}
                            onChange={() => handleSelectOrder(order.id)}
                          />
                        </TableCell>
                         {/* ID Column */}
                         <TableCell className="py-3 border-r border-slate-200">
                           <div className="space-y-2">
                             <div className="font-mono text-sm font-medium text-blue-600">
                               {order.order_number}
                             </div>
                             <div className="text-xs text-muted-foreground">
                               {order.created_at ? format(new Date(order.created_at), 'dd/MM/yyyy HH:mm') : 'N/A'}
                             </div>
                             <div className="flex gap-1 flex-wrap">
                               {specialTags.length > 0 ? (
                                 specialTags.map((tag: any, idx: number) => (
                                   <Badge
                                     key={idx}
                                     variant={tag.name === 'Đã đối soát' ? 'default' : 'secondary'}
                                     className={cn(
                                       'text-xs',
                                       tag.name === 'Đã đối soát'
                                         ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                                         : 'bg-red-100 text-red-800 hover:bg-red-100'
                                     )}
                                   >
                                     {tag.name}
                                   </Badge>
                                 ))
                               ) : (
                                 <Badge 
                                   variant={hasReconciliation ? 'default' : 'secondary'}
                                   className={cn(
                                     'text-xs',
                                     hasReconciliation 
                                       ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' 
                                       : 'bg-red-100 text-red-800 hover:bg-red-100'
                                   )}
                                 >
                                   {hasReconciliation ? 'Đã đối soát' : 'Chưa đối soát'}
                                 </Badge>
                               )}
                             </div>
                           </div>
                         </TableCell>
                         
                         {/* Customer Column */}
                         <TableCell className="py-3 border-r border-slate-200">
                           <div className="space-y-1">
                             <div className="text-sm font-medium text-blue-600 cursor-pointer hover:underline">
                               {maskPhoneNumber(order.customer_phone || "")}
                             </div>
                             <div className="font-medium">{order.customer_name}</div>
                             <div className="text-sm text-muted-foreground">
                               {formatAddress(order.customer_address)}
                             </div>
                             {order.notes && (
                               <div className="text-xs text-blue-600 italic">
                                 Ghi chú: {order.notes}
                               </div>
                             )}
                             <div className="flex flex-wrap gap-1 mt-1">
                               {otherTags.map((tag: any, index: number) => tag && (
                                 <Badge 
                                   key={index}
                                   variant="outline"
                                   className="text-xs"
                                   style={{ borderColor: tag.color, color: tag.color }}
                                 >
                                   {tag.name}
                                 </Badge>
                               ))}
                             </div>
                           </div>
                         </TableCell>
                         
                          {/* Products Column */}
                          <TableCell className="p-0 border-r border-slate-200 text-center">
                            <div className="divide-y divide-slate-100">
                              {order.items?.map((item: any, index: number) => (
                                <div key={index} className="text-sm py-5 px-5">
                                  <div className="font-medium text-slate-900 truncate" title={item.product_name || 'N/A'}>{item.product_name || 'N/A'}</div>
                                </div>
                              ))}
                              {(!order.items || order.items.length === 0) && (
                                <div className="text-sm text-muted-foreground">Không có sản phẩm</div>
                              )}
                            </div>
                          </TableCell>
                          
                          {/* Remove SL column - now included in products */}
                           
                           {/* Price Column */}
                           <TableCell className="p-0 border-r border-slate-200 text-center">
                              <div className="divide-y divide-slate-100">
                                {order.items?.map((item: any, index: number) => (
                                  <div key={index} className="text-sm py-5 px-5">
                                    <div className="font-medium text-slate-900">{formatVndNoSymbol(item.unit_price)}</div>
                                  </div>
                                ))}
                                {(!order.items || order.items.length === 0) && (
                                  <div className="text-sm text-muted-foreground">-</div>
                                )}
                              </div>
                            </TableCell>
                           
                           {/* Quantity Column */}
                           <TableCell className="p-0 border-r border-slate-200 text-center">
                             <div className="divide-y divide-slate-100">
                               {order.items?.map((item: any, index: number) => (
                                 <div key={index} className="text-sm py-5 px-5">
                                   <div className="font-medium text-slate-900">{item.quantity || 0}</div>
                                 </div>
                               ))}
                               {(!order.items || order.items.length === 0) && (
                                 <div className="text-sm text-muted-foreground">-</div>
                               )}
                             </div>
                           </TableCell>
                           
                            {/* Payment Column */}
                          <TableCell className="py-3 border-r border-slate-200 text-center">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900 flex items-center gap-1 justify-center">
                                  <Banknote className="w-3 h-3" />
                                  {formatVndNoSymbol(order.initial_payment || order.paid_amount)}
                                </div>
                                <div className="text-sm font-medium text-purple-600">
                                  {formatVndNoSymbol(order.total_amount - (order.initial_payment || order.paid_amount))}
                                </div>
                              </div>
                            </TableCell>
                         
                          {/* Quick Notes Column */}
                          <TableCell className="py-3 border-r border-slate-200">
                            <div className="max-w-xs">
                              <Input
                                defaultValue={order.notes || ""}
                                placeholder="Thêm ghi chú..."
                                className="text-sm border-none p-1 h-auto bg-transparent hover:bg-muted/50 focus:bg-background focus:border-border"
                                onBlur={(e) => handleQuickNote(order.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                              />
                            </div>
                          </TableCell>
                          
                           {/* Creator Column */}
                          <TableCell className="py-3 border-r border-slate-200">
                             <CreatorDisplay createdBy={order.created_by} creatorInfo={order.creator_info} />
                           </TableCell>
                          
                          {/* Completed At Column */}
                          <TableCell className="py-3 border-r border-slate-200 text-center">
                            {(() => {
                              const completedAt = order.completed_at || order.updated_at;
                              const showCompleted = ['delivered','completed'].includes(order.status);
                              return showCompleted && completedAt
                                ? format(new Date(completedAt), 'dd/MM/yyyy HH:mm')
                                : '-';
                            })()}
                          </TableCell>
                          
                          {/* Status Column */}
                          <TableCell className="py-4 border-r border-slate-200 min-w-[88px] sm:min-w-[104px]">
                            <Select
                              value={order.status || 'pending'}
                              onValueChange={(newStatus) => handleUpdateOrderStatus(order.id, newStatus)}
                            >
                              <SelectTrigger className="min-w-[88px] sm:min-w-[104px] h-auto p-0 border-none bg-transparent hover:bg-transparent focus:bg-transparent justify-center">
                                <div className="cursor-pointer inline-flex whitespace-nowrap truncate max-w-[88px] sm:max-w-[104px] text-xs sm:text-sm">
                                  {getStatusBadge(order.status)}
                                </div>
                              </SelectTrigger>
                              <SelectContent className="min-w-[128px] sm:min-w-[144px]">
                                {ORDER_STATUSES.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {ORDER_STATUS_LABELS_VI[status]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                         
                         {/* Actions Column */}
                          <TableCell className="text-center py-3">
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                 <MoreHorizontal className="w-4 h-4" />
                               </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setShowOrderViewDialog(true);
                                  }}
                                  className="cursor-pointer hover:bg-muted"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Xem chi tiết
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setShowOrderDetailDialog(true);
                                  }}
                                  className="cursor-pointer hover:bg-muted"
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Sửa đơn
                                </DropdownMenuItem>
                               <DropdownMenuItem 
                                 onClick={() => {
                                   setSelectedOrder(order);
                                   setShowPaymentDialog(true);
                                 }}
                                 className="cursor-pointer hover:bg-muted"
                               >
                                 <CreditCard className="w-4 h-4 mr-2" />
                                 Thanh toán
                               </DropdownMenuItem>
                               <DropdownMenuItem 
                                 onClick={() => {
                                   setSelectedOrder(order);
                                   setShowTagsManager(true);
                                 }}
                                 className="cursor-pointer hover:bg-muted"
                               >
                                 <Tag className="w-4 h-4 mr-2" />
                                 Quản lý nhãn
                               </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleCreateExportSlip(order)}
                                  className="cursor-pointer hover:bg-muted"
                                >
                                  <Package className="w-4 h-4 mr-2" />
                                  Tạo phiếu xuất kho
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setOrderToDelete(order);
                                    setShowDeleteDialog(true);
                                  }}
                                  className="cursor-pointer hover:bg-muted text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Xóa đơn hàng
                                </DropdownMenuItem>
                             </DropdownMenuContent>
                           </DropdownMenu>
                         </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Hiển thị</span>
              <Select 
                value={itemsPerPage.toString()} 
                onValueChange={(value) => {
                  setCurrentPage(1);
                  setItemsPerPage(Number(value));
                  // Will auto-fetch via useEffect below
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                trong tổng số {totalOrders} đơn hàng
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Trước
              </Button>
              <span className="text-sm text-muted-foreground">
                Trang {currentPage} / {Math.max(1, Math.ceil(totalOrders / itemsPerPage))}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= Math.ceil(totalOrders / itemsPerPage)}
              >
                Sau
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Order Dialog */}
      <CreateOrderForm
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onOrderCreated={() => {
          fetchOrders();
          setShowCreateDialog(false);
        }}
      />

      {/* Order View Dialog (Read-only) */}
      <OrderViewDialog
        order={selectedOrder}
        open={showOrderViewDialog}
        onOpenChange={setShowOrderViewDialog}
      />

      {/* Order Detail Dialog (Editable) */}
      <OrderDetailDialog
        order={selectedOrder}
        open={showOrderDetailDialog}
        onOpenChange={setShowOrderDetailDialog}
        onOrderUpdated={() => {
          fetchOrders();
          if (selectedOrder) {
            orderApi.getOrder(selectedOrder.id).then(setSelectedOrder).catch(() => {});
          }
        }}
      />

      {/* Order Tags Manager */}
      {showTagsManager && selectedOrder && (
        <OrderTagsManager
          orderId={selectedOrder.id}
          open={showTagsManager}
          onOpenChange={setShowTagsManager}
          onTagsUpdated={() => {
            fetchOrders();
            // Also refresh the selected order data
            if (selectedOrder) {
              orderApi.getOrder(selectedOrder.id).then(updatedOrder => {
                setSelectedOrder(updatedOrder);
              }).catch(error => {
                // If individual order fetch fails, just refresh the list
                fetchOrders();
              });
            }
          }}
          currentTags={selectedOrder.tags?.map(tagName => {
            const allPredefinedTags = [
              { id: 'tag_chua_doi_soat', name: 'Chưa đối soát', color: '#ef4444' },
              { id: 'tag_da_doi_soat', name: 'Đã đối soát', color: '#10b981' },
              { id: 'tag_khach_moi', name: 'Khách mới', color: '#3b82f6' },
              { id: 'tag_khach_quay_lai', name: 'Khách hàng quay lại', color: '#8b5cf6' },
              { id: 'tag_uu_tien', name: 'Ưu tiên', color: '#f59e0b' },
              { id: 'tag_loi', name: 'Lỗi', color: '#dc2626' },
            ];
            return allPredefinedTags.find(tag => tag.name === tagName);
          }).filter(Boolean) || []}
        />
      )}

      {/* Payment Dialog */}
      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        order={selectedOrder}
        onUpdate={() => {
          fetchOrders();
        }}
      />

      {/* Export Slip Creation Dialog */}
      <Dialog open={showExportSlipDialog} onOpenChange={setShowExportSlipDialog}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo phiếu xuất kho</DialogTitle>
            <DialogDescription>
              {selectedOrderForExport ? (
                <>Tạo phiếu xuất kho cho đơn hàng <strong>{selectedOrderForExport.order_number}</strong></>
              ) : (
                'Chọn đơn hàng để tạo phiếu xuất kho'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedOrderForExport && (
              <OrderSpecificExportSlipCreation 
                orderId={selectedOrderForExport.id}
                onExportSlipCreated={() => {
                  setShowExportSlipDialog(false);
                  setSelectedOrderForExport(null);
                  toast({
                    title: "Thành công",
                    description: `Đã tạo phiếu xuất kho cho đơn hàng ${selectedOrderForExport.order_number}`,
                  });
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open);
        if (!open) {
          setOrderToDelete(null);
          setSelectedOrders([]);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa đơn hàng</DialogTitle>
            <DialogDescription>
              {orderToDelete ? (
                <>Bạn có chắc chắn muốn xóa đơn hàng <strong>{orderToDelete.order_number}</strong>? Hành động này không thể hoàn tác.</>
              ) : (
                <>Bạn có chắc chắn muốn xóa {selectedOrders.length} đơn hàng đã chọn? Hành động này không thể hoàn tác.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setOrderToDelete(null);
                setSelectedOrders([]);
              }}
            >
              Hủy
            </Button>
            <Button 
              variant="destructive" 
              onClick={orderToDelete ? handleDeleteSingleOrder : handleDeleteOrders}
              disabled={loading}
            >
              {loading ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
       </Dialog>
       </div>
     </div>
   );
 };

const Orders: React.FC = () => {
  return (
    <PermissionGuard requiredPermissions={['ORDERS_VIEW']}>
      <OrdersContent />
    </PermissionGuard>
  );
};

export default Orders;

