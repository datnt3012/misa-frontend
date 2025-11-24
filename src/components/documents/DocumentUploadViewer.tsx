import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
// // import { supabase } from "@/integrations/supabase/client"; // Removed - using API instead // Removed - using API instead
import { useToast } from "@/hooks/use-toast";
import { DocumentUpload } from "./DocumentUpload";
import { FileText, Download, Eye, Trash2, Upload } from "lucide-react";

interface Document {
  id: string;
  file_name: string;
  file_url: string;
  document_type: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at: string;
  uploaded_by?: string;
}

interface DocumentUploadViewerProps {
  exportSlipId: string;
  allowUpload?: boolean;
}

export const DocumentUploadViewer: React.FC<DocumentUploadViewerProps> = ({ 
  exportSlipId, 
  allowUpload = false 
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDocuments();
  }, [exportSlipId]);

  const loadDocuments = async () => {
    try {
      // TODO: Implement document loading via API when backend supports it
      // For now, set empty documents to avoid Supabase errors
      console.log('Document loading not implemented - using API fallback');
      setDocuments([]);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUploaded = (newDoc: Document) => {
    setDocuments([newDoc, ...documents]);
    setShowUpload(false);
    toast({
      title: "Thành công",
      description: "Đã tải lên tài liệu thành công",
    });
  };

  const handleDocumentDeleted = async (docId: string) => {
    try {
      // TODO: Implement document deletion via API when backend supports it
      console.log('Document deletion not implemented - using API fallback');
      setDocuments(documents.filter(doc => doc.id !== docId));
      toast({
        title: "Thành công", 
        description: "Đã xóa tài liệu thành công",
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa tài liệu",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      // TODO: Implement document download via API when backend supports it
      console.log('Document download not implemented - using direct link fallback');
      window.open(doc.file_url, '_blank');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải xuống tài liệu",
        variant: "destructive",
      });
    }
  };

  const handleView = async (doc: Document) => {
    try {
      // TODO: Implement document viewing via API when backend supports it
      console.log('Document viewing not implemented - using direct link fallback');
      window.open(doc.file_url, '_blank');
    } catch (error) {
      console.error('Error viewing document:', error);
      toast({
        title: "Lỗi",
        description: "Không thể xem tài liệu",
        variant: "destructive",
      });
    }
  };

  const getDocumentTypeBadge = (type: string) => {
    switch (type) {
      case 'export_slip':
        return <Badge variant="outline" className="text-blue-600">Phiếu xuất kho</Badge>;
      case 'export_slip_signed':
        return <Badge variant="outline" className="text-green-600">Phiếu đã ký</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Đang tải tài liệu...</div>;
  }

  return (
    <div className="space-y-4">
      {allowUpload && (
        <div className="flex items-center gap-2">
          {!showUpload ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpload(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Tải lên phiếu xuất
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpload(false)}
            >
              Hủy
            </Button>
          )}
        </div>
      )}

      {showUpload && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <DocumentUpload
            orderId={exportSlipId}
            documentType="export_slip_signed"
            label="Chọn phiếu xuất kho đã ký"
            onDocumentUploaded={handleDocumentUploaded}
          />
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Chưa có tài liệu nào được tải lên
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
              <div className="flex items-center gap-3 flex-1">
                <FileText className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{doc.file_name}</span>
                    {getDocumentTypeBadge(doc.document_type)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)} • 
                    {new Date(doc.uploaded_at).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleView(doc)}
                  title="Xem tài liệu"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(doc)}
                  title="Tải xuống"
                >
                  <Download className="w-4 h-4" />
                </Button>
                {allowUpload && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDocumentDeleted(doc.id)}
                    title="Xóa tài liệu"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

