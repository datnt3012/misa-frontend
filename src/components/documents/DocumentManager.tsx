import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, Download, Trash2, Plus, Eye } from "lucide-react";

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
  uploader_profile?: {
    full_name: string;
  };
}

interface DocumentManagerProps {
  orderId: string;
  onUpdate?: () => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ orderId, onUpdate }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('contract');
  const { toast } = useToast();

  useEffect(() => {
    loadDocuments();
  }, [orderId]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('order_documents')
        .select(`
          *,
          uploader_profile:profiles(full_name)
        `)
        .eq('order_id', orderId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments((data as any[])?.map(item => ({
        ...item,
        uploader_profile: item.uploader_profile || { full_name: 'Không xác định' }
      })) || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    try {
      setUploading(true);

      // Create unique file name
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${orderId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, uploadFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);

      // Save document record
      const { error: docError } = await supabase
        .from('order_documents')
        .insert({
          order_id: orderId,
          document_type: documentType,
          file_name: uploadFile.name,
          file_url: urlData.publicUrl,
          file_size: uploadFile.size,
          mime_type: uploadFile.type
        });

      if (docError) throw docError;

      toast({
        title: "Thành công",
        description: "Đã tải lên tài liệu",
      });

      setUploadDialog(false);
      setUploadFile(null);
      loadDocuments();
      onUpdate?.();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải lên tài liệu",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (document: Document) => {
    try {
      // Delete from storage
      const fileName = document.file_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('contracts')
          .remove([fileName]);
      }

      // Delete record
      const { error } = await supabase
        .from('order_documents')
        .delete()
        .eq('id', document.id);

      if (error) throw error;

      toast({
        title: "Thành công",
        description: "Đã xóa tài liệu",
      });

      loadDocuments();
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa tài liệu",
        variant: "destructive",
      });
    }
  };

  const getDocumentTypeBadge = (type: string) => {
    const types = {
      contract: { label: 'Hợp đồng', variant: 'default' as const },
      purchase_order: { label: 'Đơn đặt hàng', variant: 'secondary' as const },
      invoice: { label: 'Hóa đơn', variant: 'outline' as const },
      receipt: { label: 'Biên lai', variant: 'outline' as const },
      other: { label: 'Khác', variant: 'secondary' as const }
    };

    const config = types[type as keyof typeof types] || types.other;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Tài liệu đính kèm
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Đang tải...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Tài liệu đính kèm
            </div>
            <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm tài liệu
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tải lên tài liệu</DialogTitle>
                  <DialogDescription>
                    Thêm tài liệu liên quan đến đơn hàng này
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="document-type">Loại tài liệu</Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contract">Hợp đồng</SelectItem>
                        <SelectItem value="purchase_order">Đơn đặt hàng</SelectItem>
                        <SelectItem value="invoice">Hóa đơn</SelectItem>
                        <SelectItem value="receipt">Biên lai</SelectItem>
                        <SelectItem value="other">Khác</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="document-file">Chọn file</Label>
                    <Input
                      id="document-file"
                      type="file"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Hỗ trợ: PDF, DOC, DOCX, JPG, PNG (tối đa 10MB)
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setUploadDialog(false)}>
                    Hủy
                  </Button>
                  <Button 
                    onClick={handleUpload} 
                    disabled={!uploadFile || uploading}
                  >
                    {uploading ? (
                      <>
                        <Upload className="w-4 h-4 mr-2 animate-spin" />
                        Đang tải...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Tải lên
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>
            Quản lý tất cả tài liệu liên quan đến đơn hàng
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có tài liệu nào</p>
              <p className="text-sm">Nhấn "Thêm tài liệu" để tải lên file</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div 
                  key={doc.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{doc.file_name}</p>
                        {getDocumentTypeBadge(doc.document_type)}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>
                          Tải lên bởi: {doc.uploader_profile?.full_name || 'Không xác định'} • 
                          {formatDateTime(doc.uploaded_at)}
                        </p>
                        <p>Kích thước: {formatFileSize(doc.file_size)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a 
                        href={doc.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a 
                        href={doc.file_url} 
                        download={doc.file_name}
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};