import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Eye, Edit, Tag, DollarSign, ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal, CreditCard, Package, Banknote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PaymentDialog } from "@/components/PaymentDialog";
import { useAuth } from "@/hooks/useAuth";
import CreateOrderForm from "@/components/orders/CreateOrderForm";
import { OrderDetailDialog } from "@/components/orders/OrderDetailDialog";
import { OrderTagsManager } from "@/components/orders/OrderTagsManager";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Component to display creator name
const CreatorDisplay: React.FC<{ createdBy: string }> = ({ createdBy }) => {
  const [creatorName, setCreatorName] = useState<string>("");

  useEffect(() => {
    const getCreatorName = async () => {
      if (!createdBy) {
        setCreatorName("-");
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', createdBy)
          .single();

        if (!error && data?.full_name) {
          setCreatorName(data.full_name);
        } else {
          setCreatorName("-");
        }
      } catch (error) {
        console.error('Error fetching creator name:', error);
        setCreatorName("-");
      }
    };

    getCreatorName();
  }, [createdBy]);

  return <div className="text-sm">{creatorName}</div>;
};

const Orders: React.FC = () => {
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
  const { toast } = useToast();
  const { user } = useAuth();

  // Handle creating export slip
  const handleCreateExportSlip = async (order: any) => {
    try {
      // Check if export slip already exists
      const { data: existingSlip } = await supabase
        .from('export_slips')
        .select('id')
        .eq('order_id', order.id)
        .single();

      if (existingSlip) {
        toast({
          title: "Thông báo",
          description: "Phiếu xuất kho đã tồn tại cho đơn hàng này",
          variant: "default",
        });
        return;
      }

      // Create new export slip
      const { error } = await supabase
        .from('export_slips')
        .insert({
          order_id: order.id,
          slip_number: `PX${Date.now()}`,
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: "Thành công",
        description: "Đã tạo phiếu xuất kho",
        variant: "default",
      });

      fetchOrders();
    } catch (error) {
      console.error('Error creating export slip:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tạo phiếu xuất kho",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchCreators();
    const interval = setInterval(fetchOrders, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [sortField, sortDirection]);

  const fetchCreators = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      
      if (error) throw error;
      setCreators(data || []);
    } catch (error) {
      console.error('Error fetching creators:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (
            id,
            name,
            phone,
            address,
            customer_code
          ),
          order_items (
            id,
            product_id,
            product_code,
            product_name,
            quantity,
            unit_price,
            total_price
          ),
          order_tag_assignments (
            order_tags (
              id,
              name,
              color
            )
          )
        `)
        .order(sortField, { ascending: sortDirection === "asc" });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách đơn hàng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
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
      await supabase
        .from('orders')
        .update({ notes: note })
        .eq('id', orderId);
      
      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, notes: note } : order
      ));
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật ghi chú",
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
    
    const orderDate = new Date(order.created_at);
    const matchesStartDate = !startDate || orderDate >= new Date(startDate);
    const matchesEndDate = !endDate || orderDate <= new Date(endDate + 'T23:59:59');
    
    return matchesSearch && matchesStatus && matchesCreator && matchesStartDate && matchesEndDate;
  });

  // Calculate totals
  const totals = filteredOrders.reduce((acc, order) => ({
    totalAmount: acc.totalAmount + (order.total_amount || 0),
    paidAmount: acc.paidAmount + (order.paid_amount || 0),
    debtAmount: acc.debtAmount + (order.debt_amount || 0),
  }), { totalAmount: 0, paidAmount: 0, debtAmount: 0 });

  return (
    <div className="space-y-6">
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

      {/* Orders Table */}
      <Card className="shadow-sm border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-slate-50/50">
                  <TableHead className="w-12 py-3 border-r border-slate-200">
                    <input type="checkbox" className="rounded" />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100/50 py-3 font-medium text-slate-700 border-r border-slate-200" 
                    onClick={() => handleSort("order_number")}
                  >
                    <div className="flex items-center gap-1">
                      ID
                      {getSortIcon("order_number")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100/50 py-3 font-medium text-slate-700 border-r border-slate-200" 
                    onClick={() => handleSort("customer_name")}
                  >
                    <div className="flex items-center gap-1">
                      Khách hàng
                      {getSortIcon("customer_name")}
                    </div>
                  </TableHead>
                   <TableHead className="py-3 font-medium text-slate-700 border-r border-slate-200 text-center">Sản phẩm</TableHead>
                   <TableHead className="py-3 font-medium text-slate-700 border-r border-slate-200 text-center">Giá</TableHead>
                   <TableHead className="py-3 font-medium text-slate-700 border-r border-slate-200 text-center">SL</TableHead>
                   <TableHead className="py-3 font-medium text-slate-700 border-r border-slate-200 text-center">Thanh toán</TableHead>
                   <TableHead className="py-3 font-medium text-slate-700 border-r border-slate-200">Ghi chú</TableHead>
                   <TableHead className="py-3 font-medium text-slate-700 border-r border-slate-200">Người tạo đơn</TableHead>
                   <TableHead className="py-3 font-medium text-slate-700 border-r border-slate-200">Trạng thái</TableHead>
                  <TableHead className="text-right py-3 font-medium text-slate-700">Thao tác</TableHead>
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
                    const tags = order.order_tag_assignments?.map((assignment: any) => assignment.order_tags) || [];
                    const hasReconciliation = tags.some((tag: any) => tag.name === 'Đã đối soát');
                    
                    return (
                      <TableRow key={order.id} className="hover:bg-slate-50/50 border-b border-slate-100">
                        <TableCell className="py-4 border-r border-slate-200">
                          <input type="checkbox" className="rounded" />
                        </TableCell>
                         {/* ID Column */}
                         <TableCell className="py-4 border-r border-slate-200">
                           <div className="space-y-2">
                             <div className="font-mono text-sm font-medium text-blue-600">
                               {order.order_number}
                             </div>
                             <div className="text-xs text-muted-foreground">
                               {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                             </div>
                             <div>
                               <Badge 
                                 variant={hasReconciliation ? "default" : "secondary"}
                                 className={cn(
                                   "text-xs",
                                   hasReconciliation 
                                     ? "bg-blue-100 text-blue-800 hover:bg-blue-100" 
                                     : "bg-red-100 text-red-800 hover:bg-red-100"
                                 )}
                               >
                                 {hasReconciliation ? "Đã đối soát" : "Chưa đối soát"}
                               </Badge>
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
                             <div className="flex flex-wrap gap-1 mt-1">
                               {tags.map((tag: any, index: number) => tag && (
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
                               {order.order_items?.map((item: any, index: number) => (
                                 <div key={index} className="text-sm py-1 border-b border-slate-100 last:border-b-0">
                                   <div className="font-medium text-slate-900">{item.product_name}</div>
                                 </div>
                               ))}
                             </div>
                           </TableCell>
                          
                          {/* Remove SL column - now included in products */}
                           
                            {/* Price Column */}
                            <TableCell className="py-4 border-r border-slate-200 align-top text-center">
                              <div className="space-y-3">
                                {order.order_items?.map((item: any, index: number) => (
                                  <div key={index} className="text-sm py-1 border-b border-slate-100 last:border-b-0">
                                    <div className="font-medium text-slate-900">{formatCurrency(item.unit_price)}</div>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                           
                            {/* Quantity Column */}
                            <TableCell className="py-4 border-r border-slate-200 align-top text-center">
                              <div className="space-y-3">
                                {order.order_items?.map((item: any, index: number) => (
                                  <div key={index} className="text-sm py-1 border-b border-slate-100 last:border-b-0">
                                    <div className="font-medium text-slate-900">{item.quantity}</div>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                           
                            {/* Payment Column */}
                            <TableCell className="py-4 border-r border-slate-200 text-center">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900 flex items-center gap-1 justify-center">
                                  <Banknote className="w-3 h-3" />
                                  {formatCurrency(order.paid_amount)}
                                </div>
                                <div className="text-sm font-medium text-purple-600">
                                  {formatCurrency(order.total_amount - order.paid_amount)}
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
                             <CreatorDisplay createdBy={order.created_by} />
                           </TableCell>
                          
                          {/* Remove date column - now in ID */}
                          
                           {/* Status Column */}
                           <TableCell className="py-4 border-r border-slate-200">
                             {getStatusBadge(order.status)}
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
      />

      {/* Order Tags Manager */}
      {showTagsManager && selectedOrder && (
        <OrderTagsManager
          orderId={selectedOrder.id}
          open={showTagsManager}
          onOpenChange={setShowTagsManager}
          onTagsUpdated={() => {
            fetchOrders();
          }}
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
    </div>
  );
};

export default Orders;