import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, Check, X, AlertTriangle } from 'lucide-react';

interface ImportRecord {
  row: number;
  productName: string;
  productCode: string;
  category: string;
  quantity: number;
  costPrice: number;
  sellPrice: number;
  location: string;
  status: 'valid' | 'error';
  error?: string;
}

interface ExcelImportProps {
  onImportComplete: (data: any[]) => void;
}

const ExcelImport: React.FC<ExcelImportProps> = ({ onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const downloadTemplate = () => {
    // Create CSV template
    const headers = [
      'Tên sản phẩm',
      'Mã sản phẩm', 
      'Danh mục',
      'Số lượng',
      'Giá vốn',
      'Giá bán',
      'Vị trí kho'
    ];
    
    const sampleData = [
      ['Áo thun nam basic', 'AT001', 'Thời trang', '50', '150000', '250000', 'Kho A-01'],
      ['Quần jeans nữ', 'QJ002', 'Thời trang', '30', '200000', '350000', 'Kho B-02'],
      ['Giày thể thao', 'GT003', 'Giày dép', '25', '300000', '500000', 'Kho C-01']
    ];

    const csvContent = [headers, ...sampleData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_nhap_kho.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (validTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
      } else {
        toast({
          title: "Lỗi định dạng",
          description: "Chỉ hỗ trợ file CSV và Excel (.xlsx, .xls)",
          variant: "destructive",
        });
      }
    }
  };

  const processFile = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('File phải có ít nhất 1 hàng dữ liệu');
      }

      // Skip header row
      const dataLines = lines.slice(1);
      const processedData: ImportRecord[] = [];

      dataLines.forEach((line, index) => {
        const row = index + 2; // +2 because we skipped header and arrays are 0-indexed
        const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
        
        if (values.length < 7) {
          processedData.push({
            row,
            productName: values[0] || '',
            productCode: values[1] || '',
            category: values[2] || '',
            quantity: 0,
            costPrice: 0,
            sellPrice: 0,
            location: values[6] || '',
            status: 'error',
            error: 'Thiếu dữ liệu (cần 7 cột)'
          });
          return;
        }

        const [name, code, category, qty, cost, sell, location] = values;
        const quantity = parseInt(qty) || 0;
        const costPrice = parseFloat(cost) || 0;
        const sellPrice = parseFloat(sell) || 0;

        let status: 'valid' | 'error' = 'valid';
        let error = '';

        // Validation
        if (!name) error = 'Thiếu tên sản phẩm';
        else if (!code) error = 'Thiếu mã sản phẩm';
        else if (quantity <= 0) error = 'Số lượng phải > 0';
        else if (costPrice <= 0) error = 'Giá vốn phải > 0';
        else if (sellPrice <= 0) error = 'Giá bán phải > 0';
        else if (sellPrice <= costPrice) error = 'Giá bán phải > giá vốn';

        if (error) status = 'error';

        processedData.push({
          row,
          productName: name,
          productCode: code,
          category: category || 'Chưa phân loại',
          quantity,
          costPrice,
          sellPrice,
          location: location || 'Chưa xác định',
          status,
          error
        });
      });

      setPreviewData(processedData);
      setShowPreview(true);
    } catch (error) {
      toast({
        title: "Lỗi xử lý file",
        description: error instanceof Error ? error.message : "Không thể đọc file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmImport = () => {
    const validRecords = previewData.filter(record => record.status === 'valid');
    
    if (validRecords.length === 0) {
      toast({
        title: "Không có dữ liệu hợp lệ",
        description: "Vui lòng sửa lỗi và thử lại",
        variant: "destructive",
      });
      return;
    }

    onImportComplete(validRecords);
    
    toast({
      title: "Nhập dữ liệu thành công",
      description: `Đã nhập ${validRecords.length} sản phẩm vào kho`,
    });

    // Reset form
    setFile(null);
    setPreviewData([]);
    setShowPreview(false);
  };

  const validCount = previewData.filter(r => r.status === 'valid').length;
  const errorCount = previewData.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Nhập Kho Từ File Excel/CSV
          </CardTitle>
          <CardDescription>
            Tải lên file Excel hoặc CSV để nhập nhiều sản phẩm cùng lúc
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Download Template */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <h4 className="font-medium text-blue-900">Tải file mẫu</h4>
              <p className="text-sm text-blue-700">Tải file CSV mẫu để xem định dạng chuẩn</p>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Tải file mẫu
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Chọn file Excel/CSV</Label>
            <div className="flex items-center gap-4">
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="flex-1"
              />
              <Button 
                onClick={processFile} 
                disabled={!file || isProcessing}
                className="min-w-[120px]"
              >
                {isProcessing ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Xử lý file
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Lưu ý:</strong> File phải có đầy đủ 7 cột theo thứ tự: 
              Tên sản phẩm, Mã sản phẩm, Danh mục, Số lượng, Giá vốn, Giá bán, Vị trí kho
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Preview Data */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Xem trước dữ liệu</span>
              <div className="flex gap-2">
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <Check className="w-3 h-3 mr-1" />
                  Hợp lệ: {validCount}
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive">
                    <X className="w-3 h-3 mr-1" />
                    Lỗi: {errorCount}
                  </Badge>
                )}
              </div>
            </CardTitle>
            <CardDescription>
              Kiểm tra dữ liệu trước khi nhập vào hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Hàng</TableHead>
                    <TableHead>Tên sản phẩm</TableHead>
                    <TableHead>Mã SP</TableHead>
                    <TableHead>Danh mục</TableHead>
                    <TableHead>SL</TableHead>
                    <TableHead>Giá vốn</TableHead>
                    <TableHead>Giá bán</TableHead>
                    <TableHead>Vị trí</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((record, index) => (
                    <TableRow key={index} className={record.status === 'error' ? 'bg-red-50' : ''}>
                      <TableCell>{record.row}</TableCell>
                      <TableCell>{record.productName}</TableCell>
                      <TableCell className="font-mono">{record.productCode}</TableCell>
                      <TableCell>{record.category}</TableCell>
                      <TableCell>{record.quantity}</TableCell>
                      <TableCell>{record.costPrice.toLocaleString('vi-VN')} ₫</TableCell>
                      <TableCell>{record.sellPrice.toLocaleString('vi-VN')} ₫</TableCell>
                      <TableCell>{record.location}</TableCell>
                      <TableCell>
                        {record.status === 'valid' ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <Check className="w-3 h-3 mr-1" />
                            Hợp lệ
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <X className="w-3 h-3 mr-1" />
                            {record.error}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Hủy
              </Button>
              <Button 
                onClick={confirmImport}
                disabled={validCount === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Xác nhận nhập {validCount} sản phẩm
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExcelImport;