 import React, { useState, useEffect } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { vi } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { warrantyTicketApi } from "@/api/warrantyTicket.api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileEdit, Plus, Minus } from "lucide-react";

const PROCESS_TYPES = [
  { id: "return_to_customer", label: "Trả khách" },
  { id: "transfer_old", label: "Chuyển hàng cũ" },
  { id: "return_to_manufacturer", label: "Hoàn trả hãng" },
  { id: "transfer_defective", label: "Chuyển hàng lỗi" },
];

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

interface ProcessWarrantyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketDetail: any;
  onRefresh?: () => void;
}

export const ProcessWarrantyDialog: React.FC<ProcessWarrantyDialogProps> = ({
  open,
  onOpenChange,
  ticketDetail,
  onRefresh,
}) => {
  const { toast } = useToast();
  const [processItems, setProcessItems] = useState<Array<{ id: string; type: string; serials: Set<string>; note: string }>>([
    { id: "1", type: "", serials: new Set(), note: "" }
  ]);
  const [processing, setProcessing] = useState(false);

  const addProcessItem = () => {
    setProcessItems((prev) => [
      ...prev,
      { id: Date.now().toString(), type: "", serials: new Set(), note: "" }
    ]);
  };

  const removeProcessItem = (id: string) => {
    setProcessItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateProcessItem = (id: string, field: "type" | "note", value: string) => {
    setProcessItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const toggleSerialInItem = (itemId: string, serialId: string) => {
    setProcessItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const newSerials = new Set(item.serials);
        if (newSerials.has(serialId)) {
          newSerials.delete(serialId);
        } else {
          newSerials.add(serialId);
        }
        return { ...item, serials: newSerials };
      })
    );
  };

  const handleConfirmProcess = async () => {
    const validItems = processItems.filter((item) => item.type && item.serials.size > 0);
    if (validItems.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn kiểu xử lý và ít nhất một serial",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const allDetails = validItems.flatMap(item =>
        Array.from(item.serials).map(detailId => {
          const detail = ticketDetail.details?.find((d: any) => d.id === detailId);
          return {
            detailId,
            serialNumber: detail?.serialNumber,
            processStatus: item.type,
            note: item.note,
          };
        })
      );
      
      await warrantyTicketApi.processWarranty(ticketDetail.id, {
        detail: allDetails,
        note: ""
      });
      toast({
        title: "Thành công",
        description: "Đã xử lý bảo hành",
      });
      setProcessItems([{ id: "1", type: "", serials: new Set(), note: "" }]);
      onOpenChange(false);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error?.response?.data?.message || "Không thể xử lý bảo hành",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!ticketDetail) return null;

  const customerName = ticketDetail.customer?.name || ticketDetail.order?.customer_name || "-";

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        setProcessItems([{ id: "1", type: "", serials: new Set(), note: "" }]);
      }
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            Xử lý bảo hành - {ticketDetail.code || ticketDetail.warrantyTicketCode || ticketDetail.id}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Product Info */}
          <div className="p-3 border rounded-lg bg-slate-50">
            <div className="font-medium">{customerName}</div>
            <div className="text-sm text-muted-foreground">
              {(() => {
                const total = ticketDetail.details?.length || 0;
                const processed = (ticketDetail.details || []).filter((d: any) => d.processed === true || !!d.processStatus).length;
                const remaining = total - processed;
                return (
                  <div className="flex gap-4">
                    <span>Tổng: <strong>{total}</strong></span>
                    <span className="text-green-600">Đã xử lý: <strong>{processed}</strong></span>
                    <span className="text-yellow-600">Còn lại: <strong>{remaining}</strong></span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Process Items List */}
          <div className="space-y-4">
            {processItems.map((item, index) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{index + 1}.</span>
                  </div>
                  <div className="flex-1">
                    <Combobox
                      options={[
                        { label: "Chọn kiểu xử lý", value: "" },
                        ...PROCESS_TYPES.filter((type) => 
                          !processItems.some((other) => other.id !== item.id && other.type === type.id)
                        ).map((type) => ({ label: type.label, value: type.id }))
                      ]}
                      value={item.type}
                      onValueChange={(value) => updateProcessItem(item.id, "type", value)}
                      placeholder="Chọn kiểu xử lý"
                      searchPlaceholder="Tìm kiểu xử lý..."
                      className="w-full max-w-xs"
                    />
                  </div>
                  {processItems.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeProcessItem(item.id)}>
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {item.type && (
                  <div className="border rounded-md max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Chọn</TableHead>
                          <TableHead>Sản phẩm</TableHead>
                          <TableHead>Serial</TableHead>
                          <TableHead className="text-center">Hạn BH</TableHead>
                          <TableHead className="text-center">Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ticketDetail.details?.map((detail: any) => {
                          const isProcessed = detail.processed === true || !!detail.processStatus;
                          const isChecked = item.serials.has(detail.id);
                          const isSelectedInOther = processItems.some((other) => other.id !== item.id && other.serials.has(detail.id));
                          const warrantyInfo = formatWarrantyRemaining(detail);
                          
                          return (
                            <TableRow key={detail.id} className={isProcessed || isSelectedInOther ? "opacity-50" : isChecked ? "bg-primary/5" : ""}>
                              <TableCell>
                                <input type="checkbox" checked={isChecked} disabled={isProcessed || isSelectedInOther} onChange={() => toggleSerialInItem(item.id, detail.id)} className="h-4 w-4" />
                              </TableCell>
                              <TableCell>{detail.productName || detail.product?.name || "-"}</TableCell>
                              <TableCell className="font-mono">{detail.serialNumber || "-"}</TableCell>
                              <TableCell className="text-center">
                                <Badge className={warrantyInfo.type === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{warrantyInfo.text}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {isProcessed ? <Badge className="bg-green-100 text-green-700">Đã xử lý</Badge> : <Badge className="bg-yellow-100 text-yellow-700">Chờ xử lý</Badge>}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {item.type && (
                  <div>
                    <label className="text-sm font-medium">Ghi chú</label>
                    <Textarea value={item.note} onChange={(e) => updateProcessItem(item.id, "note", e.target.value)} placeholder="Nhập ghi chú (không bắt buộc)..." className="mt-1" />
                  </div>
                )}
              </div>
            ))}

            <Button variant="outline" onClick={addProcessItem} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Thêm kiểu xử lý
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setProcessItems([{ id: "1", type: "", serials: new Set(), note: "" }]);
            onOpenChange(false);
          }}>
            Hủy
          </Button>
          <Button onClick={handleConfirmProcess} disabled={processing || !processItems.some((item) => item.type && item.serials.size > 0)}>
            {processing ? "Đang xử lý..." : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProcessWarrantyDialog;