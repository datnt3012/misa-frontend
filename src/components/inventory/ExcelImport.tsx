import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, Check, X, AlertTriangle } from 'lucide-react';
import { warehouseReceiptsApi } from '@/api/warehouseReceipts.api';
import { warehouseApi } from '@/api/warehouse.api';
import { productApi } from '@/api/product.api';
import { supplierApi } from '@/api/supplier.api';
import { generateImportSlipCode } from '@/utils/importSlipUtils';
import * as XLSX from 'xlsx';

interface ImportRecord {
  row: number;
  warehouseCode: string;
  supplierCode: string;
  productCode: string;
  productName?: string; // Loaded from database
  category?: string; // Loaded from database
  quantity: number;
  costPrice: number;
  sellPrice: number;
  unit: string;
  notes: string;
  location: string;
  warehouseId?: string;
  supplierId?: string;
  productId?: string;
  status: 'valid' | 'error';
  error?: string;
}

interface ExcelImportProps {
  onImportComplete?: (data: any[]) => void;
}

const ExcelImport: React.FC<ExcelImportProps> = ({ onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  // Load warehouses and products on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [warehousesResponse, productsResponse, suppliersResponse] = await Promise.all([
          warehouseApi.getWarehouses({ page: 1, limit: 1000 }),
          productApi.getProducts({ page: 1, limit: 1000 }),
          supplierApi.getSuppliers({ page: 1, limit: 1000 })
        ]);
        
        setWarehouses(warehousesResponse.warehouses || []);
        setProducts(productsResponse.products || []);
        setSuppliers(suppliersResponse.suppliers || []);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
  }, []);

  const downloadTemplate = () => {
    // Create Excel template
    const headers = [
      'Mã kho',
      'Mã nhà cung cấp',
      'Mã sản phẩm', 
      'Số lượng',
      'Giá vốn',
      'Giá bán'
    ];
    
    const sampleData = [
      ['WH000001', 'SUP160249502', 'PHN001', 50, 150000, 250000],
      ['WH000001', 'SUP160249502', 'PHN002', 30, 200000, 350000],
      ['WH000001', 'SUP160249502', 'PHN003', 25, 300000, 500000],
      ['WH000001', 'SUP160249502', 'PHN004', 15, 200000, 350000],
      ['WH000001', 'SUP160249502', 'PHN005', 20, 300000, 500000]
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

    // Set column widths
    const colWidths = [
      { wch: 12 }, // Mã kho
      { wch: 15 }, // Mã nhà cung cấp
      { wch: 15 }, // Mã sản phẩm
      { wch: 12 }, // Số lượng
      { wch: 15 }, // Giá vốn
      { wch: 15 }  // Giá bán
    ];
    ws['!cols'] = colWidths;

    // Style header row
    const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1:F1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      
      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "366092" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }

    // Add instructions sheet
    const instructionsData = [
      ['HƯỚNG DẪN SỬ DỤNG FILE MẪU'],
      [''],
      ['1. Cấu trúc file:'],
      ['   - Cột A: Tên sản phẩm (bắt buộc)'],
      ['   - Cột B: Mã sản phẩm (bắt buộc, phải tồn tại trong hệ thống)'],
      ['   - Cột C: Danh mục sản phẩm'],
      ['   - Cột D: Số lượng nhập (bắt buộc, > 0)'],
      ['   - Cột E: Giá vốn (bắt buộc, > 0)'],
      ['   - Cột F: Giá bán (bắt buộc, > giá vốn)'],
      [''],
      ['2. Lưu ý:'],
      ['   - Không được xóa hoặc thay đổi tiêu đề cột'],
      ['   - Mã sản phẩm phải chính xác và tồn tại trong hệ thống'],
      ['   - Số lượng và giá cả phải là số nguyên dương'],
      ['   - Giá bán phải lớn hơn giá vốn'],
      ['   - Có thể thêm/xóa dòng dữ liệu mẫu'],
      [''],
      ['3. Sau khi hoàn thành:'],
      ['   - Lưu file với định dạng Excel (.xlsx)'],
      ['   - Upload file lên hệ thống để tạo phiếu nhập kho']
    ];

    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    wsInstructions['!cols'] = [{ wch: 80 }];

    // Add sheets to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Dữ liệu nhập kho');
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Hướng dẫn');

    // Generate and download file
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN').replace(/\//g, '-');
    const filename = `Template_Nhap_Kho_${dateStr}.xlsx`;

    XLSX.writeFile(wb, filename);
    
    toast({
      title: "Tải file mẫu thành công",
      description: `Đã tải file ${filename}`,
    });
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
      let data: any[][] = [];
      
      // Check file type and process accordingly
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Process Excel file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      } else {
        // Process CSV file
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        data = lines.map(line => line.split(',').map(v => v.replace(/^"|"$/g, '').trim()));
      }
      
      if (data.length < 2) {
        throw new Error('File phải có ít nhất 1 hàng dữ liệu');
      }

      // Skip header row and filter out empty rows
      const dataLines = data.slice(1).filter(row => {
        // Check if row has any meaningful content
        return row.some(cell => cell && cell.toString().trim() !== '');
      });
      
      const processedData: ImportRecord[] = [];

      dataLines.forEach((values, index) => {
        const row = index + 2; // +2 because we skipped header and arrays are 0-indexed
        
        // Skip completely empty rows
        if (!values || values.length === 0 || values.every(cell => !cell || cell.toString().trim() === '')) {
          return;
        }
        
        if (values.length < 6) {
          processedData.push({
            row,
            warehouseCode: values[0] || '',
            supplierCode: values[1] || '',
            productCode: values[2] || '',
            quantity: 0,
            costPrice: 0,
            sellPrice: 0,
            unit: '',
            notes: '',
            location: '',
            status: 'error',
            error: `Thiếu dữ liệu (cần 6 cột, hiện có ${values.length} cột)`
          });
          return;
        }

        const [warehouseCode, supplierCode, code, qty, cost, sell] = values;
        
        // Skip rows that don't have product code
        if (!code || code.toString().trim() === '') {
          return;
        }
        
        const quantity = parseInt(qty) || 0;
        const costPrice = parseFloat(cost) || 0;
        const sellPrice = parseFloat(sell) || 0;

        let status: 'valid' | 'error' = 'valid';
        let error = '';

        // Find existing entities by codes
        const existingProduct = products.find(p => p.code === code);
        const existingWarehouse = warehouses.find(w => w.code === warehouseCode);
        const existingSupplier = suppliers.find(s => s.code === supplierCode);
        
        const productId = existingProduct?.id;
        const warehouseId = existingWarehouse?.id;
        const supplierId = existingSupplier?.id;

        // Validation
        if (!warehouseCode || warehouseCode.toString().trim() === '') error = 'Thiếu mã kho';
        else if (!supplierCode || supplierCode.toString().trim() === '') error = 'Thiếu mã nhà cung cấp';
        else if (!code || code.toString().trim() === '') error = 'Thiếu mã sản phẩm';
        else if (quantity <= 0) error = 'Số lượng phải > 0';
        else if (costPrice <= 0) error = 'Giá vốn phải > 0';
        else if (sellPrice <= 0) error = 'Giá bán phải > 0';
        else if (sellPrice <= costPrice) error = 'Giá bán phải > giá vốn';
        else if (!warehouseId) error = 'Kho không tồn tại trong hệ thống';
        else if (!supplierId) error = 'Nhà cung cấp không tồn tại trong hệ thống';
        else if (!productId) error = 'Sản phẩm không tồn tại trong hệ thống';

        if (error) status = 'error';

        processedData.push({
          row,
          warehouseCode: warehouseCode || '',
          supplierCode: supplierCode || '',
          productCode: code,
          productName: existingProduct?.name || '', // Load from database
          category: existingProduct?.category || 'Chưa phân loại', // Load from database
          quantity,
          costPrice,
          sellPrice,
          unit: 'cái', // Default unit
          notes: '', // No notes for Excel import
          location: '',
          warehouseId: warehouseId,
          supplierId: supplierId,
          productId,
          status,
          error
        });
      });

      setPreviewData(processedData);
      setShowPreview(true);
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Lỗi xử lý file",
        description: error instanceof Error ? error.message : "Không thể đọc file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmImport = async () => {
    const validRecords = previewData.filter(record => record.status === 'valid');
    
    if (validRecords.length === 0) {
      toast({
        title: "Không có dữ liệu hợp lệ",
        description: "Vui lòng sửa lỗi và thử lại",
        variant: "destructive",
      });
      return;
    }

    // Check if all records have valid warehouse and supplier IDs
    const invalidRecords = validRecords.filter(record => !record.warehouseId || !record.supplierId);
    
    if (invalidRecords.length > 0) {
      toast({
        title: "Lỗi dữ liệu",
        description: "Một số bản ghi có mã kho hoặc mã nhà cung cấp không hợp lệ",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    
    try {
      // Group records by warehouse and supplier to create separate receipts
      const groupedRecords = validRecords.reduce((groups, record) => {
        const key = `${record.warehouseId}-${record.supplierId}`;
        if (!groups[key]) {
          groups[key] = {
            warehouseId: record.warehouseId!,
            supplierId: record.supplierId!,
            records: []
          };
        }
        groups[key].records.push(record);
        return groups;
      }, {} as Record<string, { warehouseId: string; supplierId: string; records: any[] }>);

      // Create warehouse receipts for each group
      const receiptPromises = Object.values(groupedRecords).map(async (group) => {
        // Generate code using utility function
        const code = generateImportSlipCode();
        
        const receiptData = {
          warehouseId: group.warehouseId,
          supplierId: group.supplierId,
          code: code,
          description: `Nhập kho từ file Excel - ${file?.name || 'Unknown'}`,
          status: 'pending',
          type: 'import',
          details: group.records.map(record => ({
            productId: record.productId!,
            quantity: Number(record.quantity),
            unitPrice: Number(record.costPrice)
          }))
        };

        // Validate data before sending
        if (!receiptData.warehouseId || !receiptData.supplierId) {
          throw new Error('Missing warehouseId or supplierId');
        }
        
        if (!receiptData.details || receiptData.details.length === 0) {
          throw new Error('No details provided');
        }
        
        // Validate each detail
        for (const detail of receiptData.details) {
          if (!detail.productId || !detail.quantity || !detail.unitPrice) {
            throw new Error(`Invalid detail: ${JSON.stringify(detail)}`);
          }
        }
        
        const result = await warehouseReceiptsApi.createReceipt(receiptData);
        return result;
      });

      const receipts = await Promise.all(receiptPromises);
      
      toast({
        title: "Thành công",
        description: `Tạo ${receipts.length} phiếu nhập kho thành công với ${validRecords.length} sản phẩm`,
      });
      
      // Call callback if provided
      if (onImportComplete) {
        onImportComplete(validRecords);
      }

      // Reset form
      setFile(null);
      setPreviewData([]);
      setShowPreview(false);
      
    } catch (error: any) {
      console.error('Error creating warehouse receipt:', error);
      
      // Extract error message from API response
      let errorMessage = "Không thể tạo phiếu nhập kho";
      
      if (error?.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) {
          errorMessage = error.response.data.message.join(', ');
        } else {
          errorMessage = error.response.data.message;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Lỗi tạo phiếu nhập kho",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
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
              <h4 className="font-medium text-blue-900">Tải file mẫu Excel</h4>
              <p className="text-sm text-blue-700">Tải file Excel mẫu với hướng dẫn chi tiết</p>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Tải file mẫu Excel
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
              <strong>Lưu ý:</strong> File phải có đầy đủ 6 cột theo thứ tự: 
              Mã kho, Mã nhà cung cấp, Mã sản phẩm, Số lượng, Giá vốn, Giá bán. 
              Kho, nhà cung cấp và sản phẩm phải tồn tại trong hệ thống. Tên sản phẩm sẽ được tự động load từ mã sản phẩm. Tải file mẫu Excel để xem hướng dẫn chi tiết.
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
                    <TableHead>Mã kho</TableHead>
                    <TableHead>Mã NCC</TableHead>
                    <TableHead>Mã SP</TableHead>
                    <TableHead>Tên sản phẩm</TableHead>
                    <TableHead>Danh mục</TableHead>
                    <TableHead>SL</TableHead>
                    <TableHead>Giá vốn</TableHead>
                    <TableHead>Giá bán</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((record, index) => (
                    <TableRow key={index} className={record.status === 'error' ? 'bg-red-50' : ''}>
                      <TableCell>{record.row}</TableCell>
                      <TableCell className="font-mono">{record.warehouseCode}</TableCell>
                      <TableCell className="font-mono">{record.supplierCode}</TableCell>
                      <TableCell className="font-mono">{record.productCode}</TableCell>
                      <TableCell>{record.productName || 'Đang tải...'}</TableCell>
                      <TableCell>{record.category || 'Đang tải...'}</TableCell>
                      <TableCell>{record.quantity}</TableCell>
                      <TableCell>{record.costPrice.toLocaleString('vi-VN')}</TableCell>
                      <TableCell>{record.sellPrice.toLocaleString('vi-VN')}</TableCell>
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
                disabled={validCount === 0 || isImporting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isImporting ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Đang tạo phiếu nhập...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Xác nhận nhập {validCount} sản phẩm
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExcelImport;