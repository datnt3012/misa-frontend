import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Eye, Edit, Tag, DollarSign, ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal, CreditCard, Package, Banknote, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { orderApi } from "@/api/order.api";
import { PaymentDialog } from "@/components/PaymentDialog";
import { useAuth } from "@/hooks/useAuth";
import { PermissionGuard } from "@/components/PermissionGuard";
import CreateOrderForm from "@/components/orders/CreateOrderForm";
import { OrderDetailDialog } from "@/components/orders/OrderDetailDialog";
import { OrderTagsManager } from "@/components/orders/OrderTagsManager";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import CreatorDisplay from "@/components/orders/CreatorDisplay";
import { getErrorMessage } from "@/lib/error-utils";


const OrdersContent: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [creators, setCreators] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetailDialog, setShowOrderDetailDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showTagsManager, setShowTagsManager] = useState(false);
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Handle creating export slip
  const handleCreateExportSlip = async (order: any) => {
    try {
      // TODO: Implement export slip creation with backend API
      toast({
        title: "Thông báo",
        description: "Chức năng tạo phiếu xuất kho đang được phát triển",
        variant: "default",
      });

      fetchOrders();
    } catch (error) {
      console.error('Error creating export slip:', error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể tạo phiếu xuất kho",
        variant: "destructive",
      });
    }
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
        description: responses[0]?.message || `Đã xóa ${selectedOrders.length} đơn hàng`,
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
  }, [sortField, sortDirection]);

  // Removed automatic refresh - only reload on user actions

  const fetchCreators = async () => {
    setCreators([]); // Not implemented on BE yet
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 1000 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;
      const resp = await orderApi.getOrders(params);
      setOrders(resp.orders || []);
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
  };

  const formatCurrency = (amount: number | string | undefined | null) => {
    const numAmount = Number(amount) || 0;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
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
        description: response.message || "Đã cập nhật trạng thái đơn hàng",
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

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4" />;
    }
    return sortDirection === "asc" ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      'pending': { label: 'Chờ xử lý', variant: 'secondary' },
      'confirmed': { label: 'Đã xác nhận', variant: 'default' },
      'processing': { label: 'Đang xử lý', variant: 'default' },
      'picked': { label: 'Đã lấy hàng', variant: 'default' },
      'handover': { label: 'Bàn giao ĐVVC', variant: 'default' },
      'delivered': { label: 'Đã giao hàng', variant: 'default' },
      'completed': { label: 'Hoàn thành', variant: 'default' },
      'cancelled': { label: 'Đã hủy', variant: 'destructive' },
    };
    
    const statusInfo = statusMap[status] || { label: status, variant: 'secondary' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_phone?.includes(searchTerm);
      
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    const matchesCreator = creatorFilter === "all" || order.created_by === creatorFilter;
    
    const orderDate = order.created_at ? new Date(order.created_at) : new Date();
    const matchesStartDate = !startDate || orderDate >= new Date(startDate);
    const matchesEndDate = !endDate || orderDate <= new Date(endDate + 'T23:59:59');
    
    return matchesSearch && matchesStatus && matchesCreator && matchesStartDate && matchesEndDate;
  });


  // Calculate totals
  const totals = filteredOrders.reduce((acc, order) => ({
    totalAmount: acc.totalAmount + (order.total_amount || 0),
    paidAmount: acc.paidAmount + (order.initial_payment || order.paid_amount || 0),
    debtAmount: acc.debtAmount + (order.debt_amount || 0),
  }), { totalAmount: 0, paidAmount: 0, debtAmount: 0 });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
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
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="pending">Chờ xử lý</SelectItem>
                <SelectItem value="processing">Đang xử lý</SelectItem>
                <SelectItem value="delivered">Đã giao</SelectItem>
                <SelectItem value="completed">Hoàn thành</SelectItem>
                <SelectItem value="cancelled">Đã hủy</SelectItem>
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
          </div>
        </CardContent>
      </Card>

      {/* Summary Row */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{filteredOrders.length}</div>
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
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="border-b bg-slate-50/50">
                  <TableHead className="w-12 py-3 border-r border-slate-200">
                    <input 
                      type="checkbox" 
                      className="rounded" 
                      checked={selectedOrders.length === orders.length && orders.length > 0}
                      onChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100/50 py-3 font-medium text-slate-700 border-r border-slate-200 min-w-[120px]" 
                    onClick={() => handleSort("order_number")}
                  >
                    <div className="flex items-center gap-1">
                      ID
                      {getSortIcon("order_number")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100/50 py-3 font-medium text-slate-700 border-r border-slate-200 min-w-[150px]" 
                    onClick={() => handleSort("customer_name")}
                  >
                    <div className="flex items-center gap-1">
                      Khách hàng
                      {getSortIcon("customer_name")}
                    </div>
                  </TableHead>
                   <TableHead className="py-3 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[100px]">Sản phẩm</TableHead>
                   <TableHead className="py-3 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[100px]">Giá</TableHead>
                   <TableHead className="py-3 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[80px]">SL</TableHead>
                   <TableHead className="py-3 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[120px]">Thanh toán</TableHead>
                   <TableHead className="py-3 font-medium text-slate-700 border-r border-slate-200 min-w-[150px]">Ghi chú</TableHead>
                   <TableHead className="py-3 font-medium text-slate-700 border-r border-slate-200 min-w-[120px]">Người tạo đơn</TableHead>
                   <TableHead className="py-3 font-medium text-slate-700 border-r border-slate-200 min-w-[100px]">Trạng thái</TableHead>
                  <TableHead className="text-right py-3 font-medium text-slate-700 min-w-[100px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Đang tải...
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Không có đơn hàng nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
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
                        <TableCell className="py-4 border-r border-slate-200">
                          <input 
                            type="checkbox" 
                            className="rounded" 
                            checked={selectedOrders.includes(order.id)}
                            onChange={() => handleSelectOrder(order.id)}
                          />
                        </TableCell>
                         {/* ID Column */}
                         <TableCell className="py-4 border-r border-slate-200">
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
                         <TableCell className="py-4 border-r border-slate-200">
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
                           <TableCell className="py-4 border-r border-slate-200 align-top text-center">
                             <div className="space-y-3">
                               {order.items?.map((item: any, index: number) => (
                                 <div key={index} className="text-sm py-1 border-b border-slate-100 last:border-b-0">
                                   <div className="font-medium text-slate-900">{item.product_name || 'N/A'}</div>
                                 </div>
                               ))}
                               {(!order.items || order.items.length === 0) && (
                                 <div className="text-sm text-muted-foreground">Không có sản phẩm</div>
                               )}
                             </div>
                           </TableCell>
                          
                          {/* Remove SL column - now included in products */}
                           
                            {/* Price Column */}
                            <TableCell className="py-4 border-r border-slate-200 align-top text-center">
                              <div className="space-y-3">
                                {order.items?.map((item: any, index: number) => (
                                  <div key={index} className="text-sm py-1 border-b border-slate-100 last:border-b-0">
                                    <div className="font-medium text-slate-900">{formatCurrency(item.unit_price)}</div>
                                  </div>
                                ))}
                                {(!order.items || order.items.length === 0) && (
                                  <div className="text-sm text-muted-foreground">-</div>
                                )}
                              </div>
                            </TableCell>
                           
                            {/* Quantity Column */}
                            <TableCell className="py-4 border-r border-slate-200 align-top text-center">
                              <div className="space-y-3">
                                {order.items?.map((item: any, index: number) => (
                                  <div key={index} className="text-sm py-1 border-b border-slate-100 last:border-b-0">
                                    <div className="font-medium text-slate-900">{item.quantity || 0}</div>
                                  </div>
                                ))}
                                {(!order.items || order.items.length === 0) && (
                                  <div className="text-sm text-muted-foreground">-</div>
                                )}
                              </div>
                            </TableCell>
                           
                            {/* Payment Column */}
                            <TableCell className="py-4 border-r border-slate-200 text-center">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900 flex items-center gap-1 justify-center">
                                  <Banknote className="w-3 h-3" />
                                  {formatCurrency(order.initial_payment || order.paid_amount)}
                                </div>
                                <div className="text-sm font-medium text-purple-600">
                                  {formatCurrency(order.total_amount - (order.initial_payment || order.paid_amount))}
                                </div>
                              </div>
                            </TableCell>
                         
                          {/* Quick Notes Column */}
                          <TableCell className="py-4 border-r border-slate-200">
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
                           <TableCell className="py-4 border-r border-slate-200">
                             <CreatorDisplay createdBy={order.created_by} creatorInfo={order.creator_info} />
                           </TableCell>
                          
                          {/* Remove date column - now in ID */}
                          
                           {/* Status Column */}
                           <TableCell className="py-4 border-r border-slate-200">
                             <Select
                               value={order.status || 'pending'}
                               onValueChange={(newStatus) => handleUpdateOrderStatus(order.id, newStatus)}
                             >
                               <SelectTrigger className="w-auto h-auto p-0 border-none bg-transparent hover:bg-transparent focus:bg-transparent">
                                 <div className="cursor-pointer">
                                   {getStatusBadge(order.status)}
                                 </div>
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="pending">Chờ xử lý</SelectItem>
                                 <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                                 <SelectItem value="processing">Đang xử lý</SelectItem>
                                 <SelectItem value="picked">Đã lấy hàng</SelectItem>
                                 <SelectItem value="shipped">Đã giao</SelectItem>
                                 <SelectItem value="delivered">Đã nhận</SelectItem>
                                 <SelectItem value="cancelled">Đã hủy</SelectItem>
                               </SelectContent>
                             </Select>
                           </TableCell>
                         
                         {/* Actions Column */}
                         <TableCell className="text-right py-4">
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

      {/* Order Detail Dialog */}
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

