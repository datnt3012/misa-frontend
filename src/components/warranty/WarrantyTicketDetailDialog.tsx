import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format, parseISO, differenceInDays } from "date-fns";
import { vi } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Combobox } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ProcessWarrantyDialog } from "@/components/warranty/ProcessWarrantyDialog";
import { warrantyTicketApi } from "@/api/warrantyTicket.api";
import { usersApi } from "@/api/users.api";
import type { User } from "@/api/users.api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WARRANTY_STATUS_NAMES, WARRANTY_STATUS_COLORS } from "@/constants/warranty.constants";

import {
  ArrowLeft,
  Printer,
  MoreHorizontal,
  User,
  Phone,
  FileText,
  MapPin,
  UserCog,
  FileEdit,
  Clock,
} from "lucide-react";

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
        type: "expired",
      };
    }
  } catch {
    return { text: "Chưa kích hoạt", type: "unknown" };
  }
};

interface WarrantyTicketDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketDetail: any;
  loading: boolean;
  onRefresh?: () => void;
}

interface ProductItem {
  id: string;
  productName: string;
  productCode: string;
  quantity: number;
  processedQuantity: number;
  serials: any[];
}

export const WarrantyTicketDetailDialog: React.FC<WarrantyTicketDetailDialogProps> = ({
  open,
  onOpenChange,
  ticketDetail,
  loading,
  onRefresh,
}) => {
  const [expandedProducts] = useState<Set<string>>(new Set());
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingPersonInCharge, setEditingPersonInCharge] = useState(false);
  const [updatingPersonInCharge, setUpdatingPersonInCharge] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (editingPersonInCharge && users.length === 0) {
      const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
          const response = await usersApi.getUsers({ limit: 100, isActive: true });
          setUsers(response.users || []);
        } catch (error) {
          console.error("Error fetching users:", error);
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [editingPersonInCharge]);

  const handleUpdatePersonInCharge = async (userId: string) => {
    if (!userId) return;
    try {
      setUpdatingPersonInCharge(true);
      await warrantyTicketApi.updateWarrantyTicket(ticketDetail.id, { personInCharge: userId });
      toast({ title: "Thành công", description: "Đã cập nhật người phụ trách" });
      setEditingPersonInCharge(false);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast({ title: "Lỗi", description: error?.response?.data?.message || "Không thể cập nhật người phụ trách", variant: "destructive" });
    } finally {
      setUpdatingPersonInCharge(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusKey = status?.code || status;
    return WARRANTY_STATUS_COLORS[statusKey as keyof typeof WARRANTY_STATUS_COLORS] || "bg-gray-100 text-gray-800";
  };

  const getStatusName = (status: string) => {
    const statusKey = status?.code || status;
    return WARRANTY_STATUS_NAMES[statusKey as keyof typeof WARRANTY_STATUS_NAMES] || status || "Không xác định";
  };

  const handlePrint = () => {
    window.print();
  };

  if (!ticketDetail) return null;

  const customerName = ticketDetail.customer?.name || ticketDetail.order?.customer_name || "-";

  const customerPhone = ticketDetail.customer?.phoneNumber || ticketDetail.order?.customer_phone || "-";
  const orderCode = ticketDetail.order?.order_number || ticketDetail.order?.code || "-";
  const orderId = ticketDetail.order?.id;
  const warehouseName = ticketDetail.warehouseId?.name || ticketDetail.warehouse?.name || "-";
  const personInCharge = ticketDetail.personInCharge
    ? `${ticketDetail.personInCharge.firstName || ""} ${ticketDetail.personInCharge.lastName || ""}`.trim() ||
      ticketDetail.personInCharge.username ||
      "-"
    : "-";
  const note = ticketDetail.note || "-";

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto p-8">
        <DialogHeader>
          <DialogTitle className="sr-only">Chi tiết phiếu bảo hành</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">{ticketDetail.code || ticketDetail.warrantyTicketCode || ticketDetail.id}</span>
                    <Badge className={getStatusColor(ticketDetail.status)}>{getStatusName(ticketDetail.status)}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Ngày tạo: {ticketDetail.createdAt ? format(new Date(ticketDetail.createdAt), "dd/MM/yyyy HH:mm", { locale: vi }) : "-"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ticketDetail.status !== 'completed' && ticketDetail.status !== 'cancelled' && (
                  <Button variant="outline" onClick={() => setShowProcessDialog(true)}>
                    <FileEdit className="h-4 w-4 mr-2" />
                    Xử lý bảo hành
                  </Button>
                )}
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  In phiếu
                </Button>
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Customer Info Card */}
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Thông tin khách hàng</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground w-20">Tên KH:</span>
                      <span className="font-medium">{customerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground w-20">Điện thoại:</span>
                      <span>{customerPhone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground w-20">Mã đơn:</span>
                      {orderId ? (
                        <Link to={`/orders/${orderId}`} className="text-primary hover:underline">
                          {orderCode}
                        </Link>
                      ) : (
                        <span>{orderCode}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ticket Info Card */}
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Thông tin phiếu</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground w-20">Kho:</span>
                      <span className="font-medium">{warehouseName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCog className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground w-20">Phụ trách:</span>
                      {editingPersonInCharge ? (
                        <div className="flex-1 max-w-xs">
                          <Combobox
                            options={users.map(u => ({ 
                              label: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username, 
                              value: u.id 
                            }))}
                            value={ticketDetail.personInCharge?.id || ""}
                            onValueChange={(value) => handleUpdatePersonInCharge(value)}
                            placeholder="Chọn người phụ trách"
                            searchPlaceholder="Tìm kiếm..."
                            disabled={loadingUsers || updatingPersonInCharge}
                          />
                        </div>
                      ) : (
                        <button 
                          onClick={() => setEditingPersonInCharge(true)}
                          className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                        >
                          {personInCharge}
                        </button>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      <FileEdit className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm text-muted-foreground w-20">Lý do:</span>
                      <span className="flex-1">{note}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Products Table */}
            <div>
              <div className="text-sm font-medium mb-2">Sản phẩm bảo hành</div>
              {(() => {
                const total = (ticketDetail.details || []).length;
                const processed = (ticketDetail.details || []).filter((d: any) => d.processed === true || !!d.processStatus).length;
                const remaining = total - processed;
                return (
                  <div className="flex gap-4 mb-2 text-sm">
                    <span>Tổng: <strong>{total}</strong></span>
                    <span className="text-green-600">Đã xử lý: <strong>{processed}</strong></span>
                    <span className="text-yellow-600">Còn lại: <strong>{remaining}</strong></span>
                  </div>
                );
              })()}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-center w-12">STT</TableHead>
                      <TableHead className="text-left">Sản phẩm</TableHead>
                      <TableHead className="text-center w-20">SL BH</TableHead>
                      <TableHead className="text-center w-24">Đã xử lý</TableHead>
                      <TableHead className="text-center w-24">Còn lại</TableHead>
                      <TableHead className="text-left w-48">Serial</TableHead>
                      <TableHead className="text-center w-32">Hạn BH</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(ticketDetail.details || []).map((detail: any, index: number) => {
                      const serialNumber = detail.serialNumber || "-";
                      const productName = detail.productName || detail.product?.name || "-";
                      const isProcessed = detail.processed === true || !!detail.processStatus;
                      const processedAt = detail.processedAt;
                      const warrantyStartDate = detail.warrantyStartDate;
                      const warrantyMonths = detail.warrantyMonths || 12;
                      const isExpanded = expandedProducts.has(detail.id || index.toString());

                      return (
                        <React.Fragment key={detail.id || index}>
                          <TableRow>
                            <TableCell className="text-center">{index + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{productName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium">1</TableCell>
                            <TableCell className="text-center">
                              {isProcessed ? (
                                <span className="text-green-600 font-medium">1</span>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={isProcessed ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                                {isProcessed ? 0 : 1}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <span className="font-mono">{serialNumber}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {warrantyStartDate && (
                                <Badge
                                  className={formatWarrantyRemaining(detail).type === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}
                                >
                                  {formatWarrantyRemaining(detail).text}
                                </Badge>
                              )}
                            </TableCell>
                            </TableRow>
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* History Section */}
            <Card>
              <CardHeader className="py-3">
                <CardDescription className="font-medium text-foreground">
                  Theo dõi các thay đổi của phiếu bảo hành
                </CardDescription>
              </CardHeader>
              <CardContent>
                {((ticketDetail.history || ticketDetail.histories || []) as any[]).length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Chưa có lịch sử hoạt động
                  </div>
                ) : (
                  <div className="space-y-4">
                    {((ticketDetail.history || ticketDetail.histories || []) as any[]).map((item: any, index: number) => (
                      <div key={item.id || index} className="relative">
                        {index < ((ticketDetail.history || ticketDetail.histories || []) as any[]).length - 1 && (
                          <div className="absolute left-5 top-12 w-0.5 h-full bg-gray-200" />
                        )}
                        <div className="flex gap-4">
                          <Avatar className="w-10 h-10 border-2 border-background">
                            <AvatarFallback className="text-xs">
                              {(item.user?.username || item.user?.email || 'U').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="w-4 h-4" />
                              <span>{item.user?.username || item.user?.email || 'Hệ thống'}</span>
                              <span>•</span>
                              <Clock className="w-4 h-4" />
                              <span>{item.createdAt ? format(parseISO(item.createdAt), "dd/MM/yyyy HH:mm", { locale: vi }) : '-'}</span>
                            </div>
                            {item.content || item.message || item.title || item.action ? (
                              <div className="bg-gray-50 rounded-md p-3 mt-2">
                                <p className="text-sm text-gray-700">
                                  {item.content || item.message || item.title || item.action}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>

    <ProcessWarrantyDialog
        open={showProcessDialog}
        onOpenChange={(open) => setShowProcessDialog(open)}
        ticketDetail={ticketDetail}
        onRefresh={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </>
  );
};

export default WarrantyTicketDetailDialog;