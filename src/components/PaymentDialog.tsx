import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
// // import { supabase } from "@/integrations/supabase/client"; // Removed - using API instead // Removed - using API instead
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { paymentsApi } from "@/api/payments.api";
import { getErrorMessage } from "@/lib/error-utils";
import { API_CONFIG } from "@/config/api";
import { DollarSign, Clock, Upload, X, FileText, Image, Eye } from "lucide-react";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onUpdate: () => void;
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  open,
  onOpenChange,
  order,
  onUpdate
}) => {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [bankAccount, setBankAccount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadingFilesForPayment, setUploadingFilesForPayment] = useState<string | null>(null);
  const [filesToUploadForPayment, setFilesToUploadForPayment] = useState<Record<string, File[]>>({});
  const [fileMetadataCache, setFileMetadataCache] = useState<Record<string, {
    fileName: string;
    fileSize?: number;
    mimeType?: string;
    extension?: string;
  }>>({});
  const [bankAccounts, setBankAccounts] = useState<string[]>([
    'MB Bank',
    'TP Bank', 
    'Vietcombank',
    'Techcombank',
    'VietinBank',
    'BIDV',
    'Sacombank'
  ]);
  const { toast } = useToast();
  const { user } = useAuth();

  const totalAmount = Number(order?.total_amount || order?.tongTien) || 0;
  const paidAmount = Number(order?.initial_payment || order?.paid_amount) || 0;
  const debtAmount = Math.max(0, totalAmount - paidAmount);

  useEffect(() => {
    if (open && order?.id) {
      loadPaymentHistory();
    }
  }, [open, order?.id]);

  const loadPaymentHistory = async () => {
    try {
      const payments = await paymentsApi.getPaymentsByOrder(order.id);
      
      // Sort payments by date (newest first)
      const sortedPayments = [...payments].sort((a, b) => {
        const dateA = new Date(a.payment_date).getTime();
        const dateB = new Date(b.payment_date).getTime();
        return dateB - dateA; // Descending order (newest first)
      });
      
      setPaymentHistory(sortedPayments);
      
      // Pre-fetch file metadata for all files
      const filePaths: string[] = [];
      sortedPayments.forEach((payment) => {
        const paths = Array.isArray(payment.filePaths) 
          ? payment.filePaths 
          : payment.filePaths 
            ? [payment.filePaths] 
            : [];
        filePaths.push(...paths);
      });

      // Fetch metadata for all files in parallel (silently, don't block on errors)
      if (filePaths.length > 0) {
        // Fire and forget - don't wait for metadata to load
        filePaths.forEach((filePath) => {
          if (filePath && filePath.trim()) {
            getFileMetadata(filePath).catch((error) => {
              // Silently ignore - metadata is optional, fallback will be used
              // Only log if it's not a 404 (endpoint not available)
              if (!error?.message?.includes('404') && !error?.message?.includes('Not Found')) {
                // Metadata is optional; ignore errors silently
              }
            });
          }
        });
      }
    } catch (error: any) {
      console.error('[PaymentDialog] Error loading payment history:', error);
      // Don't show error toast - just log and continue with empty array
      setPaymentHistory([]);
    }
  };

  const handleAddPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) === 0) {
      toast({
        title: "Thông báo",
        description: "Vui lòng nhập số tiền thanh toán",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(paymentAmount);
      
      // Step 1: Create payment (JSON only)
      let createdPayment;
      try {
        createdPayment = await paymentsApi.createPayment({
          order_id: order.id,
          amount: amount,
          payment_method: paymentMethod as 'cash' | 'bank_transfer' | 'card' | 'other',
          payment_date: new Date().toISOString(),
          notes: paymentNotes || undefined,
          created_by: user?.id,
        });
      } catch (paymentError: any) {
        console.error('[PaymentDialog] Error creating payment:', paymentError);
        toast({
          title: "Lỗi",
          description: getErrorMessage(paymentError, "Không thể tạo payment record"),
          variant: "destructive",
        });
        return;
      }
      
      // Step 2: Upload files if any (separate API call)
      if (uploadedFiles.length > 0 && createdPayment?.id) {
        try {
          await paymentsApi.uploadFiles(createdPayment.id, uploadedFiles);
        } catch (uploadError: any) {
          console.error('[PaymentDialog] Error uploading files:', uploadError);
          toast({
            title: "Cảnh báo",
            description: "Payment đã được tạo nhưng không thể upload file. Vui lòng thử upload lại sau.",
            variant: "default",
          });
        }
      }
      
      // Step 3: Update order's initialPayment (for backward compatibility)
      try {
        const { orderApi } = await import('@/api/order.api');
        const currentInitialPayment = order.initial_payment || 0;
        const newInitialPayment = currentInitialPayment + amount;
        
        await orderApi.updateOrder(order.id, {
          initialPayment: newInitialPayment
        });
      } catch (orderUpdateError: any) {
        console.warn('[PaymentDialog] Could not update order initialPayment:', orderUpdateError);
        // Non-critical error, continue
      }

      toast({
        title: "Thành công",
        description: amount >= 0 
          ? `Đã thêm thanh toán: ${formatCurrency(amount)}`
          : `Đã điều chỉnh thanh toán: ${formatCurrency(amount)}`,
      });

      onUpdate();
      
      // Refresh payment history after a short delay to allow backend to process
      setTimeout(() => {
        loadPaymentHistory();
      }, 500);
      
      // Reset form
      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentMethod('cash');
      setBankAccount('');
      setUploadedFiles([]);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể thêm thanh toán"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (paymentId: string, filePath: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa file này?')) {
      return;
    }

    try {
      await paymentsApi.deleteFile(paymentId, filePath);
      toast({
        title: "Thành công",
        description: "Đã xóa file",
      });
      
      // Remove from metadata cache
      setFileMetadataCache(prev => {
        const newCache = { ...prev };
        delete newCache[filePath];
        return newCache;
      });
      
      // Refresh payment history
      loadPaymentHistory();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể xóa file"),
        variant: "destructive",
      });
    }
  };

  const handleUploadFilesForPayment = async (paymentId: string) => {
    const files = filesToUploadForPayment[paymentId];
    if (!files || files.length === 0) {
      toast({
        title: "Thông báo",
        description: "Vui lòng chọn file để upload",
        variant: "destructive",
      });
      return;
    }

    setUploadingFilesForPayment(paymentId);
    try {
      await paymentsApi.uploadFiles(paymentId, files);
      toast({
        title: "Thành công",
        description: "Đã upload file",
      });
      
      // Clear files for this payment
      setFilesToUploadForPayment(prev => {
        const newState = { ...prev };
        delete newState[paymentId];
        return newState;
      });
      
      // Clear metadata cache for this payment's files (they will be re-fetched)
      // Refresh payment history will fetch new metadata
      // Refresh payment history
      loadPaymentHistory();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể upload file"),
        variant: "destructive",
      });
    } finally {
      setUploadingFilesForPayment(null);
    }
  };

  // Helper to construct file download URL
  const getFileDownloadUrl = (filePath: string): string => {
    // Construct download URL using API base URL
    // Backend should serve files from the file path directly or via /files endpoint
    // If filePath is already a full URL, return it
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    
    // Use API base URL from environment or default
    const baseUrl = API_CONFIG.BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3274/api/v0';
    
    // Construct URL: backend serves files via /files/{path}
    return `${baseUrl}/files/${encodeURIComponent(filePath)}`;
  };

  // Get file metadata from API (?info=true)
  const getFileMetadata = async (filePath: string): Promise<{
    fileName: string;
    fileSize?: number;
    mimeType?: string;
    extension?: string;
  } | null> => {
    // Check cache first
    if (fileMetadataCache[filePath]) {
      return fileMetadataCache[filePath];
    }

    // Skip if filePath is empty or invalid
    if (!filePath || filePath.trim() === '') {
      return null;
    }

    try {
      const fileUrl = getFileDownloadUrl(filePath);
      const metadataUrl = `${fileUrl}${fileUrl.includes('?') ? '&' : '?'}info=true`;
      
      const response = await fetch(metadataUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
      });

      // Handle 404 gracefully - endpoint might not be available yet
       if (response.status === 404) {
         return null;
       }

      if (!response.ok) {
        // For other errors, log but don't throw
        console.warn('[PaymentDialog] Failed to fetch metadata:', response.status, response.statusText, 'for:', filePath);
        return null;
      }

      const data = await response.json();
      
      if (data?.success && data?.data) {
        const metadata = {
          fileName: data.data.fileName || data.data.filename || '',
          fileSize: data.data.fileSize || data.data.file_size,
          mimeType: data.data.mimeType || data.data.mime_type,
          extension: data.data.extension,
        };

        // Only cache if we have a fileName
        if (metadata.fileName) {
          setFileMetadataCache(prev => ({
            ...prev,
            [filePath]: metadata,
          }));
          return metadata;
        }
      }

      return null;
    } catch (error: any) {
      // Don't log as error if it's just a network error or endpoint not available
       if (error?.message?.includes('Failed to fetch') || error?.message?.includes('404')) {
         // Metadata endpoint not available; use fallback parsing
       } else {
        console.warn('[PaymentDialog] Error fetching file metadata:', error, 'for:', filePath);
      }
      return null;
    }
  };

  // Get file name from header (when fetching file)
  const getFileNameFromHeader = async (filePath: string): Promise<string | null> => {
    if (!filePath || filePath.trim() === '') {
      return null;
    }

    try {
      const fileUrl = getFileDownloadUrl(filePath);
      
      const response = await fetch(fileUrl, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
      });

      if (response.ok) {
        const fileName = response.headers.get('X-File-Name');
        if (fileName) {
          return decodeURIComponent(fileName);
        }
      }

      return null;
    } catch (error: any) {
      // Silently fail - header method is optional
      console.debug('[PaymentDialog] Could not get file name from header for:', filePath);
      return null;
    }
  };

  // Synchronous version for display (uses cache or fallback parsing)
  const getDisplayFileNameSync = (filePath: string, paymentId: string): string => {
    // Check cache first - this is the best source
    if (fileMetadataCache[filePath]?.fileName) {
      return fileMetadataCache[filePath].fileName;
    }

    // Fallback: parse from path
    if (!filePath || typeof filePath !== 'string') {
      return 'Tệp tin';
    }

    // Normalize path - handle both forward and back slashes, remove leading/trailing slashes
    let normalizedPath = filePath.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    
    // Extract filename from path (last part after /)
    // Handle cases like "uploads/payments/id/file.pdf" or just "file.pdf"
    const parts = normalizedPath.split('/').filter(p => p && p.trim());
    
    // Always take the last part as filename
    let rawName = parts.length > 0 ? parts[parts.length - 1] : normalizedPath;
    
    // Decode URL encoding if present
    try {
      rawName = decodeURIComponent(rawName);
    } catch (e) {
      // If decode fails, use raw name as-is
    }
    
    if (!rawName || rawName.trim() === '') {
      return 'Tệp tin';
    }

    // Extract extension
    const dotIndex = rawName.lastIndexOf('.');
    const extension = dotIndex >= 0 ? rawName.slice(dotIndex) : '';
    let nameWithoutExt = dotIndex >= 0 ? rawName.slice(0, dotIndex) : rawName;

    // Clean up the name: remove payment ID, timestamp, and random suffix
    // Format examples:
    // - "invoice-abc123-1234567890-987654.pdf" -> "invoice.pdf"
    // - "document-5b30d173-9661-4cd5-8c86-f4bfe7b63dab-1762505253482-233534523.pdf" -> "document.pdf"
    
    // Pattern 1: Remove UUID-like pattern followed by timestamp and random number
    // Matches: -{uuid}-{timestamp}-{random}
    const fullPattern = /-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\d{10,}-\d+$/i;
    if (fullPattern.test(nameWithoutExt)) {
      nameWithoutExt = nameWithoutExt.replace(fullPattern, '');
      if (nameWithoutExt.trim()) {
        return nameWithoutExt.trim() + extension;
      }
    }

    // Pattern 2: Remove payment ID pattern if paymentId is provided
    if (paymentId) {
      const paymentToken = `-${paymentId}-`;
      const tokenIndex = nameWithoutExt.lastIndexOf(paymentToken);
      if (tokenIndex !== -1 && tokenIndex > 0) {
        const beforeToken = nameWithoutExt.slice(0, tokenIndex);
        if (beforeToken.trim()) {
          nameWithoutExt = beforeToken;
        }
      }
    }

    // Pattern 3: Remove trailing UUID-like pattern (20+ hex chars with dashes)
    const uuidPattern = /-[0-9a-f-]{20,}$/i;
    if (uuidPattern.test(nameWithoutExt)) {
      nameWithoutExt = nameWithoutExt.replace(uuidPattern, '');
    }

    // Pattern 4: Remove trailing timestamp (long numbers, 10+ digits)
    const timestampPattern = /-\d{10,}$/;
    if (timestampPattern.test(nameWithoutExt)) {
      nameWithoutExt = nameWithoutExt.replace(timestampPattern, '');
    }

    // Pattern 5: Remove trailing random number (shorter numbers that might be random)
    // Only if it looks like a suffix (preceded by dash and the name has other content)
    const randomPattern = /-\d{6,9}$/;
    if (randomPattern.test(nameWithoutExt) && nameWithoutExt.length > 15) {
      nameWithoutExt = nameWithoutExt.replace(randomPattern, '');
    }

    // Clean up: remove trailing dashes and trim
    nameWithoutExt = nameWithoutExt.replace(/-+$/, '').trim();

    // Return cleaned name with extension, or fallback to raw filename
    const finalName = nameWithoutExt ? nameWithoutExt + extension : rawName;
    return finalName || 'Tệp tin';
  };

  const handleViewFile = async (filePath: string) => {
    const fileUrl = getFileDownloadUrl(filePath);
    if (!fileUrl) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy đường dẫn tệp",
        variant: "destructive",
      });
      return;
    }

    // Open file in new tab
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
    
    // Try to update cache with header name (if not already cached)
    if (!fileMetadataCache[filePath]) {
      getFileNameFromHeader(filePath).then((fileName) => {
        if (fileName) {
          setFileMetadataCache(prev => ({
            ...prev,
            [filePath]: { fileName },
          }));
        }
      }).catch((error) => {
        console.warn('[PaymentDialog] Could not get file name from header:', error);
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPaymentMethodText = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'tiền mặt',
      bank_transfer: 'chuyển khoản',
      card: 'thẻ',
      other: 'khác'
    };
    return methods[method] || method;
  };

  const newPaidAmount = paidAmount + parseFloat(paymentAmount || '0');
  const newDebtAmount = totalAmount - newPaidAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm Thanh Toán</DialogTitle>
          <DialogDescription>
            Đơn hàng {order?.order_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Payment Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Thông tin thanh toán hiện tại
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Tổng tiền:</span>
                <span className="font-medium">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Đã thanh toán:</span>
                <span className="font-medium text-green-600">{formatCurrency(paidAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Còn nợ:</span>
                <span className={`font-medium ${debtAmount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {formatCurrency(debtAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Add Payment */}
          <div className="space-y-4">
            <h4 className="font-medium">Thêm thanh toán mới</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment-amount">Số tiền thanh toán</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Nhập số tiền (cho phép số âm để điều chỉnh)"
                />
              </div>
              <div>
                <Label htmlFor="payment-method">Phương thức</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Tiền mặt</SelectItem>
                    <SelectItem value="bank_transfer">Chuyển khoản</SelectItem>
                    <SelectItem value="card">Thẻ</SelectItem>
                    <SelectItem value="other">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Bank Account Selection for Bank Transfer */}
            {paymentMethod === 'bank_transfer' && (
              <div>
                <Label htmlFor="bank-account">Tài khoản ngân hàng</Label>
                <Select value={bankAccount} onValueChange={setBankAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn tài khoản ngân hàng" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((bank) => (
                      <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="payment-notes">Ghi chú thanh toán</Label>
              <Textarea
                id="payment-notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Ghi chú về khoản thanh toán này..."
              />
            </div>

            {/* File Upload */}
            <div>
              <Label>Tải lên hóa đơn/chứng từ</Label>
              <div className="mt-2">
                <Input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => {
                    if (e.target.files) {
                      setUploadedFiles(Array.from(e.target.files));
                    }
                  }}
                  className="hidden"
                  id="payment-files"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById('payment-files')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Chọn file (ảnh, PDF, Word)
                </Button>
                
                {/* Show uploaded files */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          {file.type.startsWith('image/') ? (
                            <Image className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                          <span className="text-sm">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(file.size / 1024 / 1024).toFixed(1)} MB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUploadedFiles(files => files.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* New Payment Summary */}
            {paymentAmount && parseFloat(paymentAmount) !== 0 && (
              <Card className="bg-blue-50">
                <CardContent className="pt-4">
                  <h5 className="font-medium mb-2">Sau khi thanh toán:</h5>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Đã thanh toán:</span>
                      <span className="font-medium text-green-600">{formatCurrency(newPaidAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Còn nợ:</span>
                      <span className={`font-medium ${newDebtAmount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {formatCurrency(newDebtAmount)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Payment History - Always show */}
          <Separator />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Lịch sử thanh toán
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading && paymentHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Đang tải lịch sử thanh toán...
                </div>
              ) : paymentHistory.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Ngày giờ</TableHead>
                        <TableHead className="text-right">Số tiền</TableHead>
                        <TableHead>Phương thức</TableHead>
                        <TableHead>Ghi chú</TableHead>
                        <TableHead className="w-[220px]">Tệp tin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentHistory.map((payment) => {
                        const filePathsRaw = Array.isArray(payment.filePaths) 
                          ? payment.filePaths 
                          : payment.filePaths 
                            ? [payment.filePaths] 
                            : [];
                        const hasFiles = filePathsRaw.length > 0;
                        const filesToUpload = filesToUploadForPayment[payment.id] || [];
                        
                        return (
                          <TableRow key={payment.id}>
                            <TableCell className="text-sm">
                              <div>
                                <div>{new Date(payment.payment_date).toLocaleDateString('vi-VN')}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(payment.payment_date).toLocaleTimeString('vi-VN', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-medium ${payment.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {payment.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(payment.amount))} đ
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {getPaymentMethodText(payment.payment_method)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {payment.notes || payment.note || '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="space-y-2">
                                {/* Display existing files */}
                                {hasFiles && (
                                  <div className="space-y-1">
                                    {filePathsRaw.map((filePath: string, idx: number) => {
                                      // Ensure we're working with the file path, not the full path
                                      const displayName = getDisplayFileNameSync(filePath, payment.id);
                                      
                                      // Debug log to see what we're working with
                                       if (process.env.NODE_ENV === 'development') {
                                         // In development we could log file info if needed
                                       }
                                       
                                      return (
                                        <div key={idx} className="flex items-center gap-1 text-xs">
                                          <FileText className="w-3 h-3 flex-shrink-0" />
                                          <Button
                                            type="button"
                                            variant="link"
                                            size="sm"
                                            className="h-auto p-0 text-xs text-blue-600 hover:underline min-w-0"
                                            onClick={() => handleViewFile(filePath)}
                                          >
                                            <span className="inline-flex items-center gap-1 min-w-0">
                                              <Eye className="w-3 h-3 flex-shrink-0" />
                                              <span className="truncate max-w-[120px] block" title={displayName}>
                                                {displayName}
                                              </span>
                                            </span>
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0"
                                            onClick={() => handleDeleteFile(payment.id, filePath)}
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                
                                {/* Upload files for existing payment */}
                                <div className="flex flex-col gap-1">
                                  <Input
                                    type="file"
                                    multiple
                                    accept="image/*,.pdf,.doc,.docx"
                                    className="hidden"
                                    id={`payment-files-${payment.id}`}
                                    onChange={(e) => {
                                      if (e.target.files) {
                                        setFilesToUploadForPayment(prev => ({
                                          ...prev,
                                          [payment.id]: Array.from(e.target.files || [])
                                        }));
                                      }
                                    }}
                                  />
                                  {filesToUpload.length > 0 ? (
                                    <div className="space-y-1">
                                      {filesToUpload.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-1 text-xs">
                                          <FileText className="w-3 h-3" />
                                          <span className="truncate max-w-[100px]">{file.name}</span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0"
                                            onClick={() => {
                                              setFilesToUploadForPayment(prev => ({
                                                ...prev,
                                                [payment.id]: prev[payment.id]?.filter((_, i) => i !== idx) || []
                                              }));
                                            }}
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ))}
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-xs"
                                        onClick={() => handleUploadFilesForPayment(payment.id)}
                                        disabled={uploadingFilesForPayment === payment.id}
                                      >
                                        {uploadingFilesForPayment === payment.id ? 'Uploading...' : 'Upload'}
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-xs"
                                      onClick={() => document.getElementById(`payment-files-${payment.id}`)?.click()}
                                    >
                                      <Upload className="w-3 h-3 mr-1" />
                                      Thêm file
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {/* Payment History Summary */}
                  <div className="border-t bg-muted/50 p-3">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Tổng đã thanh toán:</span>
                      <span className="text-green-600">
                        {formatCurrency(paymentHistory.reduce((sum, p) => sum + (p.amount >= 0 ? p.amount : 0), 0))} đ
                      </span>
                    </div>
                    {paymentHistory.some(p => p.amount < 0) && (
                      <div className="flex justify-between text-sm font-medium mt-1">
                        <span>Tổng điều chỉnh:</span>
                        <span className="text-red-600">
                          {formatCurrency(Math.abs(paymentHistory.reduce((sum, p) => sum + (p.amount < 0 ? p.amount : 0), 0)))} đ
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Chưa có lịch sử thanh toán nào</p>
                  <p className="text-xs mt-1">Các thanh toán sẽ được hiển thị tại đây</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Hủy
          </Button>
          <Button onClick={handleAddPayment} disabled={loading}>
            {loading ? "Đang xử lý..." : "Thêm thanh toán"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

