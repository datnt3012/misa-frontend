import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { warehouseReceiptsApi, type WarehouseReceipt, type WarehouseReceiptItemDetail } from "@/api/warehouseReceipts.api";
import { CheckCircle, Package, Printer, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SlipDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slipId: string;
  slipType: 'import' | 'export';
  slip?: WarehouseReceipt; // Optional: pass slip data directly to avoid reloading
  onUpdate?: () => void;
}

const formatCurrency = (amount: number | string) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0
  }).format(numAmount || 0);
};

const formatCurrencyShort = (amount: number | string) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!numAmount) return '0';
  if (numAmount >= 1000000000) {
    return (numAmount / 1000000000).toFixed(1) + ' tỷ';
  }
  if (numAmount >= 1000000) {
    return (numAmount / 1000000).toFixed(1) + ' tr';
  }
  if (numAmount >= 1000) {
    return (numAmount / 1000).toFixed(0) + ' k';
  }
  return numAmount.toString();
};

const formatDateTime = (dateString?: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('vi-VN');
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('vi-VN');
};

const getStatusBadge = (status: string, type: 'import' | 'export') => {
  const statusLabels: Record<string, { label: string; className: string }> = {
    pending: { label: 'Chờ duyệt', className: 'bg-yellow-100 text-yellow-800' },
    picked: { label: 'Đã lấy hàng', className: 'bg-blue-100 text-blue-800' },
    exported: { label: 'Đã xuất kho', className: 'bg-green-100 text-green-800' },
    approved: { label: 'Đã duyệt', className: 'bg-green-100 text-green-800' },
    completed: { label: 'Hoàn thành', className: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Hủy', className: 'bg-red-100 text-red-800' },
    rejected: { label: 'Từ chối', className: 'bg-red-100 text-red-800' },
    in_progress: { label: 'Đang xử lý', className: 'bg-blue-100 text-blue-800' },
  };
  
  const statusInfo = statusLabels[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
  
  return (
    <Badge variant="secondary" className={statusInfo.className}>
      {type === 'export' && status === 'picked' && <Package className="w-3 h-3 mr-1" />}
      {type === 'export' && status === 'exported' && <CheckCircle className="w-3 h-3 mr-1" />}
      {statusInfo.label}
    </Badge>
  );
};

// Helper function to format full address
const formatFullAddress = (address?: string, addressInfo?: any) => {
  if (!address && !addressInfo) return '';
  
  const parts: string[] = [];
  if (addressInfo?.wardName) parts.push(addressInfo.wardName);
  if (addressInfo?.districtName) parts.push(addressInfo.districtName);
  if (addressInfo?.provinceName) parts.push(addressInfo.provinceName);
  if (address) parts.push(address);
  
  return parts.join(', ');
};

export const SlipDetailDialog: React.FC<SlipDetailDialogProps> = ({ 
  open, 
  onOpenChange, 
  slipId, 
  slipType,
  slip: initialSlip,
  onUpdate 
}) => {
  const [slip, setSlip] = useState<WarehouseReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (open && slipId) {
      // Use passed slip data if available, otherwise load from API
      if (initialSlip) {
        setSlip(initialSlip);
        return; // Don't fetch if we have initial data
      }
      loadSlipDetails();
    } else if (!open) {
      // Reset slip when dialog closes
      setSlip(null);
    }
  }, [open, slipId, initialSlip]);

  // Update slip when initialSlip prop changes (for external data updates)
  useEffect(() => {
    if (initialSlip) {
      setSlip(initialSlip);
      console.log(initialSlip);
    }
  }, [initialSlip]);

  const loadSlipDetails = async () => {
    try {
      setLoading(true);
      const receipt = await warehouseReceiptsApi.getReceipt(slipId);
      console.log('Receipt from API:', receipt);
      console.log('Customer in receipt:', receipt?.customer);
      console.log('Order in receipt:', receipt?.order);
      setSlip(receipt);
    } catch (error) {
      console.error('Error loading slip details:', error);
    } finally {
      setLoading(false);
    }
  };

  const { toast } = useToast();

  const handleExportSlip = async (format: 'pdf' | 'xlsx') => {
    if (!slip) return;
    
    try {
      setExporting(true);
      const { blob, filename } = await warehouseReceiptsApi.exportReceipt(slip.id, format);
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      toast({
        title: 'Thành công',
        description: `Đã xuất ${format.toUpperCase()} thành công`
      });
    } catch (error: any) {
      console.error('Error exporting slip:', error);
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể xuất phiếu',
        variant: 'destructive'
      });
    } finally {
      setExporting(false);
    }
  };

  const isImportSlip = slipType === 'import';
  const isExportSlip = slipType === 'export';

  const exportCustomerName =
    slip?.order?.customerName ||
    slip?.order?.customer?.name ||
    slip?.customer?.name ||
    slip?.order?.companyName ||
    slip?.order?.company_name ||
    slip?.order?.customer_name ||
    '-';

  const exportCustomerPhone =
    slip?.order?.customerPhone ||
    slip?.order?.customer?.phoneNumber ||
    slip?.order?.receiverPhone ||
    slip?.order?.customer_phone ||
    slip?.order?.receiver_phone ||
    slip?.customer?.phoneNumber ||
    '-';

  const exportCustomerAddress =
    slip?.order?.customer_address ||
    slip?.order?.receiver_address ||
    slip?.order?.customer?.address ||
    slip?.order?.companyAddress ||
    slip?.order?.company_address ||
    slip?.customer?.address ||
    '-';

  // Get items from normalized response (uses 'items' field, not 'details')
  const slipItems = slip?.items || slip?.details || [];

  // Calculate totals
  const totalAmount = slipItems.reduce((sum: number, item: any) => {
    return sum + (parseFloat(String(item.totalPrice || item.total_price || 0)) || 0);
  }, 0);

  const totalVatAmount = slipItems.reduce((sum: number, item: any) => {
    return sum + (parseFloat(String(item.vatTotalPrice || item.vat_total_price || 0)) || 0);
  }, 0);

  // For export slips: get order value and actual export value
  const orderVatTotalAmount = slip?.order?.vatTotalAmount ?? slip?.order?.vat_total_amount ?? 0;
  const orderTotalAmount = slip?.order?.totalAmount ?? slip?.order?.total_amount ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[130vh] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle>
              {isImportSlip ? 'Chi tiết phiếu nhập' : 'Chi tiết phiếu xuất kho'} - {slip?.code}
            </DialogTitle>
            <DialogDescription>
              {isImportSlip ? (
                <>
                  Nhà cung cấp: {slip?.supplier?.name || slip?.supplier_name || '-'} | 
                  Ngày nhập: {slip?.completed_at ? formatDate(slip.completed_at) : '-'} | 
                  Kho nhập: {slip?.warehouse?.name || '-'} ({slip?.warehouse?.code || '-'})
                </>
              ) : (
                <>
                  Khách hàng: {exportCustomerName} | 
                  Ngày xuất: {slip?.completed_at ? formatDate(slip.completed_at) : '-'} | 
                  Kho xuất: {slip?.warehouse?.name || '-'} ({slip?.warehouse?.code || '-'})
                </>
              )}
            </DialogDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportSlip('pdf')}
              disabled={exporting}
            >
              <Printer className="w-3 h-3 mr-1" />
              In PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportSlip('xlsx')}
              disabled={exporting}
            >
              <FileDown className="w-3 h-3 mr-1" />
              Xuất Excel
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p>Đang tải chi tiết...</p>
          </div>
        ) : slip ? (
          <div className="space-y-6">
            {/* Additional Information Section */}
            <div className="grid grid-cols-1 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="grid grid-cols-2 gap-4 flex justify-center items-top">
                {/* Order Info - for export slips */}
                {isExportSlip && slip.order && (
                  <>
                    <div>
                      <Label className="font-medium text-sm">Số hợp đồng:</Label>
                      <p className="text-sm text-muted-foreground">{slip.order.contract_code || '-'}</p>
                    </div>
                    <div>
                      <Label className="font-medium text-sm">Đơn hàng:</Label>
                      <p className="text-sm text-muted-foreground">{slip.order.order_number}</p>
                    </div>
                  </>
                )}

                {/* Import slip specific info */}
                {isImportSlip && (
                  <>
                    <div>
                      <Label className="font-medium text-sm">Đơn hàng:</Label>
                      <p className="text-sm text-muted-foreground">{slip.order?.order_number || '-'}</p>
                    </div>
                  </>
                )}

                <div>
                  <Label className="font-medium text-sm">Trạng thái:</Label>
                  <div className="mt-1">{getStatusBadge(slip.status, slipType)}</div>
                </div>

                {/* Warehouse */}
                {slip.warehouse && (
                  <div>
                    <Label className="font-medium text-sm">{isImportSlip ? 'Kho nhập:' : 'Kho xuất:'}</Label>
                    <p className="text-sm text-muted-foreground">{slip.warehouse.name} ({slip.warehouse.code})</p>
                  </div>
                )}

                <div>
                  <Label className="font-medium text-sm">Ngày tạo:</Label>
                  <p className="text-sm text-muted-foreground">
                    {slip.created_at ? formatDateTime(slip.created_at) : 'N/A'}
                  </p>
                </div>

                {/* Supplier info for import slips */}
                {isImportSlip && slip.supplier && (
                  <div>
                    <Label className="font-medium text-sm">Thông tin nhà cung cấp:</Label>
                    <p className="text-sm text-muted-foreground">{slip.supplier.name}</p>
                    {slip.supplier.phoneNumber && (
                      <p className="text-sm text-muted-foreground">Liên hệ: {slip.supplier.phoneNumber}</p>
                    )}
                  </div>
                )}

                {/* Customer info for export slips */}
                {isExportSlip && slip.order && (
                  <>
                    <div>
                      <Label className="font-medium text-sm">Khách hàng:</Label>
                      <p className="text-sm text-muted-foreground">{exportCustomerName}</p>
                    </div>
                    {exportCustomerPhone !== '-' && (
                      <div>
                        <Label className="font-medium text-sm">Số điện thoại:</Label>
                        <p className="text-sm text-muted-foreground">{exportCustomerPhone}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Customer address for export slips */}
              {isExportSlip && slip.order && (slip.order.customer_address || slip.order.receiver_address || slip.order.companyAddress || slip.order.customer_addressInfo || slip.order.receiver_addressInfo) && (
                <div className="col-span-2">
                  <Label className="font-medium text-sm">
                    {slip.order.customer_address || slip.order.companyAddress ? 'Địa chỉ khách hàng:' : 'Địa chỉ giao hàng:'}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {formatFullAddress(
                      exportCustomerAddress,
                      slip.order.receiver_addressInfo || slip.order.customer_addressInfo
                    ) || '-'}
                  </p>
                </div>
              )}

              {/* Order value and actual export value for export slips */}
              {isExportSlip && (
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label className="font-medium text-sm">Tổng giá trị đơn hàng:</Label>
                    <p className="text-sm font-medium text-green-600">
                      {formatCurrency(orderTotalAmount)} VNĐ
                    </p>
                  </div>
                  <div>
                    <Label className="font-medium text-sm">Tổng giá trị thực xuất:</Label>
                    <p className="text-sm font-medium text-blue-600">
                      {formatCurrency(totalVatAmount)} VNĐ
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2 mt-2">
                {slip.completed_at && (
                  <div>
                    <Label className="font-medium text-sm">
                      {isImportSlip ? 'Ngày nhập kho:' : 'Ngày xuất kho:'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(slip.completed_at)}
                    </p>
                  </div>
                )}
                {slip.approved_by && (
                  <div>
                    <Label className="font-medium text-sm">Người duyệt:</Label>
                    <p className="text-sm text-muted-foreground">
                      {typeof slip.approved_by === 'object' && slip.approved_by !== null ? 
                        (slip.approved_by.firstName ? `${slip.approved_by.firstName} ${slip.approved_by.lastName || ''}` : slip.approved_by.username || slip.approved_by.email) : 
                        String(slip.approved_by)}
                    </p>
                  </div>
                )}
                {slip.created_by && (
                  <div>
                    <Label className="font-medium text-sm">Người tạo:</Label>
                    <p className="text-sm text-muted-foreground">
                      {typeof slip.created_by === 'object' && slip.created_by !== null ? 
                        (slip.created_by.firstName ? `${slip.created_by.firstName} ${slip.created_by.lastName || ''}` : slip.created_by.username || slip.created_by.email) : 
                        String(slip.created_by)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Products Table */}
            <div>
              <h4 className="text-lg font-semibold mb-4">
                Danh sách sản phẩm {isImportSlip ? 'nhập kho' : 'xuất kho'}
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    {isExportSlip && <TableHead className="text-center">Tên sản phẩm</TableHead>}
                    <TableHead className="text-center">Mã SP</TableHead>
                    {isExportSlip && <TableHead className="text-center">SL Yêu cầu</TableHead>}
                    <TableHead className="text-center">{isExportSlip ? 'SL Thực xuất' : 'Số lượng'}</TableHead>
                    <TableHead className="text-center">Đơn giá</TableHead>
                    <TableHead className="text-center">VAT (%)</TableHead>
                    <TableHead className="text-center">Thành tiền</TableHead>
                    <TableHead className="text-center">Tổng (VAT)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(slip.details || []).map((item: WarehouseReceiptItemDetail, index: number) => {
                    // For export slips, try to get requested quantity from order
                    const orderItems = slip.order?.order_items || [];
                    const orderItem = orderItems.find(
                      (oi: any) => oi.product_code === item.product?.code || oi.product_code === item.product?.code
                    );
                    const requestedQuantity = orderItem?.quantity || item.quantity;
                    
                    return (
                      <TableRow key={index}>
                        {isExportSlip && (
                          <TableCell className="text-center font-medium">
                            <div className="truncate max-w-[200px]" title={item.product?.name || ''}>
                              {item.product?.name || '-'}
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          <div className="truncate" title={item.product?.code || ''}>
                            {item.product?.code || '-'}
                          </div>
                        </TableCell>
                        {isExportSlip && (
                          <TableCell className="text-center font-medium text-green-600">
                            {requestedQuantity}
                          </TableCell>
                        )}
                        <TableCell className="text-center font-medium text-blue-600">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="relative group inline-block">
                            <span className="cursor-help">
                              {formatCurrency(item.unitPrice)}
                            </span>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                              {formatCurrency(item.unitPrice)} VNĐ
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{item.vatPercentage || '0'}%</TableCell>
                        <TableCell className="text-center">
                          <div className="relative group inline-block">
                            <span className="cursor-help">
                              {formatCurrency(item.totalPrice)}
                            </span>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                              {formatCurrency(item.totalPrice)} VNĐ
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          <div className="relative group inline-block">
                            <span className="cursor-help">
                              {formatCurrency(item.vatTotalPrice)}
                            </span>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                              {formatCurrency(item.vatTotalPrice)} VNĐ
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Notes */}
            {slip.description && (
              <div className="mt-4 bg-muted/30 rounded-lg p-4">
                <Label className="font-medium text-sm">Ghi chú:</Label>
                <p className="text-sm text-muted-foreground">{slip.description}</p>
              </div>
            )}

            {/* Approval Notes */}
            {slip.approval_notes && (
              <div className="mt-4 bg-blue-50 rounded-lg p-4">
                <Label className="font-medium text-sm">Ghi chú duyệt:</Label>
                <p className="text-sm text-muted-foreground">{slip.approval_notes}</p>
              </div>
            )}

            {/* Totals */}
            <div className="text-right mt-4 space-y-1">
              <div>
                <span className="text-muted-foreground">Tổng tiền: </span>
                <strong className="text-lg">{formatCurrency(slip.totalAmount || slip.total_amount || totalAmount)} VNĐ</strong>
              </div>
              {isExportSlip && totalVatAmount > 0 && (
                <div>
                  <span className="text-muted-foreground">Tổng tiền (VAT): </span>
                  <strong className="text-lg">{formatCurrency(totalVatAmount)} VNĐ</strong>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p>Không tìm thấy thông tin phiếu</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
