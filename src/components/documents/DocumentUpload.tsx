import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, X, Download } from "lucide-react";
// // import { supabase } from "@/integrations/supabase/client"; // Removed - using API instead // Removed - using API instead
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface DocumentUploadProps {
  orderId?: string;
  existingDocuments?: any[];
  onDocumentUploaded?: (document: any) => void;
  onDocumentDeleted?: (documentId: string) => void;
  label?: string;
  documentType?: string;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  orderId,
  existingDocuments = [],
  onDocumentUploaded,
  onDocumentDeleted,
  label = "Tài liệu",
  documentType = "general"
}) => {
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState(existingDocuments);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Lỗi",
        description: "Chỉ hỗ trợ file PDF, JPG, PNG",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: "Lỗi",
        description: "File không được vượt quá 25MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('order-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('order-documents')
        .getPublicUrl(fileName);

      // Save document info to database if orderId is provided
      let documentRecord = null;
      if (orderId) {
        const { data, error } = await supabase
          .from('order_documents')
          .insert({
            order_id: orderId,
            document_type: documentType,
            file_name: file.name,
            file_url: publicUrl,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id
          })
          .select()
          .single();

        if (error) throw error;
        documentRecord = data;
      }

      const newDocument = documentRecord || {
        id: Date.now().toString(),
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        mime_type: file.type,
        uploaded_at: new Date().toISOString()
      };

      setDocuments([...documents, newDocument]);
      onDocumentUploaded?.(newDocument);

      toast({
        title: "Thành công",
        description: "Đã tải lên tài liệu",
      });

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tải lên tài liệu",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (document: any) => {
    try {
      // Delete from storage
      const fileName = document.file_url?.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('order-documents')
          .remove([`${user?.id}/${fileName}`]);
      }

      // Delete from database if it has an ID
      if (document.id && orderId) {
        const { error } = await supabase
          .from('order_documents')
          .delete()
          .eq('id', document.id);

        if (error) throw error;
      }

      setDocuments(documents.filter(d => d.id !== document.id));
      onDocumentDeleted?.(document.id);

      toast({
        title: "Thành công",
        description: "Đã xóa tài liệu",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa tài liệu",
        variant: "destructive",
      });
    }
  };

  const downloadDocument = (document: any) => {
    const link = document.createElement('a');
    link.href = document.file_url;
    link.download = document.file_name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') {
      return <FileText className="w-4 h-4 text-red-500" />;
    }
    if (mimeType.startsWith('image/')) {
      return <FileText className="w-4 h-4 text-blue-500" />;
    }
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{label}</Label>
        <div className="mt-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Đang tải lên..." : "Chọn file (PDF, JPG, PNG)"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Tối đa 5MB. Hỗ trợ PDF, JPG, PNG
        </p>
      </div>

      {documents.length > 0 && (
        <div className="space-y-2">
          <Label>Tài liệu đã tải lên</Label>
          {documents.map((document) => (
            <Card key={document.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getFileIcon(document.mime_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {document.file_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {formatFileSize(document.file_size || 0)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(document.uploaded_at || document.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadDocument(document)}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDocument(document)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

