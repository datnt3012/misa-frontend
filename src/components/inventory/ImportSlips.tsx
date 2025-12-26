import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PlusCircle, Package, CheckCircle, Clock, X, XCircle, Trash2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
// // import { supabase } from '@/integrations/supabase/client'; // Removed - using API instead // Removed - using API instead
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { warehouseReceiptsApi } from '@/api/warehouseReceipts.api';
import { productApi } from '@/api/product.api';
import { warehouseApi } from '@/api/warehouse.api';
import { supplierApi, Supplier } from '@/api/supplier.api';
import { AddressFormSeparate } from '@/components/common/AddressFormSeparate';
import { convertPermissionCodesInMessage } from '@/utils/permissionMessageConverter';
import { generateImportSlipCode } from '@/utils/importSlipUtils';
import { stockLevelsApi } from '@/api/stockLevels.api';
interface ImportSlip {
  id: string;
  slip_number: string;
  supplier_name: string;
  supplier_contact: string;
  total_amount: number;
  status: string;
  notes: string;
  import_date: string;
  created_at: string;
  approved_at: string;
  approved_by: string;
  created_by: string;
  warehouse_id: string;
  warehouses?: {
    name: string;
    code: string;
  };
}
interface ImportSlipItem {
   id: string;
   product_id: string;
   product_code: string;
   product_name: string;
   quantity: number;
   unit_price: number;
   total_price: number;
   po_number: string;
   notes: string;
   isForeignCurrency?: boolean;
   exchangeRate?: number;
}
// Supplier interface is now imported from supplier.api.ts
interface Product {
   id: string;
   code: string;
   name: string;
   unit_price?: number;
   current_stock?: number;
   price?: number;
   costPrice?: number;
   isForeignCurrency?: boolean;
   exchangeRate?: number;
   originalCostPrice?: number;
}
interface ImportSlipsProps {
  canManageImports: boolean;
  canApproveImports: boolean;
  externalShowCreateDialog?: boolean;
}
export default function ImportSlips({ canManageImports, canApproveImports }: ImportSlipsProps) {
  const { user } = useAuth();
  const [importSlips, setImportSlips] = useState<ImportSlip[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<ImportSlip | null>(null);
  const [slipItems, setSlipItems] = useState<ImportSlipItem[]>([]);
  const [inventoryHistory, setInventoryHistory] = useState<any[]>([]);
  const [newSlip, setNewSlip] = useState({
    supplier_id: '',
    supplier_name: '',
    supplier_contact: '',
    supplier_email: '',
    supplier_address: '',
    supplier_addressInfo: {
      provinceCode: '',
      districtCode: '',
      wardCode: '',
      provinceName: '',
      districtName: '',
      wardName: ''
    },
    warehouse_id: '',
    notes: '',
    import_date: new Date().toISOString().split('T')[0]
  });
  const [newItem, setNewItem] = useState({
    product_id: '',
    quantity: 0,
    unit_price: 0,
    po_number: '',
    notes: '',
    isForeignCurrency: false,
    exchangeRate: 1
  });
  const [currentItems, setCurrentItems] = useState<ImportSlipItem[]>([]);
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const { toast } = useToast();
  const getWarehouseById = (id?: string) => {
    if (!id) return undefined;
    return warehouses.find(w => w.id === id);
  };
  useEffect(() => {
    loadImportSlips();
    loadProducts();
    loadSuppliers();
    loadWarehouses();
  }, []);
  // Reset import slip form when create dialog opens
  React.useEffect(() => {
    if (showCreateDialog) {
      setNewSlip({
        supplier_id: '',
        supplier_name: '',
        supplier_contact: '',
        supplier_email: '',
        supplier_address: '',
        supplier_addressInfo: {
          provinceCode: '',
          districtCode: '',
          wardCode: '',
          provinceName: '',
          districtName: '',
          wardName: ''
        },
        warehouse_id: '',
        notes: '',
        import_date: new Date().toISOString().split('T')[0]
      });
      setNewItem({
        product_id: '',
        quantity: 0,
        unit_price: 0,
        po_number: '',
        notes: '',
        isForeignCurrency: false,
        exchangeRate: 1
      });
      setCurrentItems([]);
    }
  }, [showCreateDialog]);
  const loadImportSlips = async () => {
    try {
      setLoading(true);
      const resp = await warehouseReceiptsApi.getReceipts({ page: 1, limit: 100, type: 'import' });
      const list = (resp.receipts || []).map((r: any) => ({
        id: r.id,
        slip_number: r.code,
        supplier_name: r.supplier_name || '',
        supplier_contact: r.supplier_contact || '',
        total_amount: r.total_amount || 0,
        status: r.status,
        notes: r.description || '',
        import_date: r.created_at,
        created_at: r.created_at,
        approved_at: r.approved_at || '',
        approved_by: '',
        created_by: '',
        warehouse_id: r.warehouse_id,
        warehouses: undefined,
      }));
      setImportSlips(list);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể tải danh sách phiếu nhập kho';
      toast({ title: 'Lỗi', description: convertPermissionCodesInMessage(errorMessage), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  const loadProducts = async () => {
    try {
      const resp = await productApi.getProducts({ page: 1, limit: 1000 });
      setProducts(resp.products || []);
    } catch (error) {
    }
  };
  const loadSuppliers = async () => {
    try {
      const response = await supplierApi.getSuppliers({ page: 1, limit: 1000 });
      setSuppliers(response.suppliers || []);
    } catch (error: any) {
      // Fallback to empty array if API fails
      setSuppliers([]);
      const errorMessage = error.response?.data?.message || error.message || 'Không thể tải danh sách nhà cung cấp';
      toast({ title: 'Lỗi', description: convertPermissionCodesInMessage(errorMessage), variant: 'destructive' });
    }
  };
  const loadWarehouses = async () => {
    try {
      const resp = await warehouseApi.getWarehouses({ page: 1, limit: 1000 });
      setWarehouses(resp.warehouses || []);
    } catch (error) {
    }
  };
  const createOrSelectSupplier = async (supplierName: string, supplierContact: string, supplierEmail?: string, supplierAddress?: string) => {
    if (!supplierName) return null;
    // Check if supplier already exists
    const existingSupplier = suppliers.find(s => s?.name?.toLowerCase() === supplierName.toLowerCase());
    if (existingSupplier) {
      return existingSupplier.id;
    }
    // Create new supplier
    try {
      const newSupplier = await supplierApi.createSupplier({
        name: supplierName,
        phoneNumber: supplierContact,
        email: supplierEmail || `${supplierName.toLowerCase().replace(/\s+/g, '')}@supplier.com`,
        address: supplierAddress || 'Chưa cập nhật địa chỉ'
      });
      // Add to local state
      setSuppliers(prev => [...prev, newSupplier]);
      return newSupplier.id;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể tạo nhà cung cấp mới';
      toast({ title: 'Lỗi', description: convertPermissionCodesInMessage(errorMessage), variant: 'destructive' });
      return null;
    }
  };
  const loadSlipItems = async (slipId: string) => {
    try {
      // Get the specific receipt with details
      const response = await warehouseReceiptsApi.getReceipts({ 
        page: 1, 
        limit: 1000,
        type: 'import'
      });
      // Find the specific receipt by ID
      const receipt = response.receipts.find(r => r.id === slipId);
      if (receipt && receipt.items) {
        // Transform items to match ImportSlipItem interface
        const transformedItems = receipt.items.map(item => ({
          id: item.id,
          product_id: item.product_id,
          product_code: item.product?.code || '',
          product_name: item.product?.name || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          po_number: item.po_number || '',
          notes: item.notes || ''
        }));
        setSlipItems(transformedItems);
      } else {
        setSlipItems([]);
      }
    } catch (error) {
      setSlipItems([]);
    }
  };
  const loadInventoryHistory = async (slipId: string) => {
    try {
      // For now, set empty array since we don't have a specific API for inventory movements
      // This can be implemented later when the backend provides the endpoint
      setInventoryHistory([]);
    } catch (error) {
      setInventoryHistory([]);
    }
  };
  const addItemToSlip = () => {
    if (!newItem.product_id || newItem.quantity <= 0) {
      toast({ title: 'Lỗi', description: 'Vui lòng chọn sản phẩm và nhập số lượng hợp lệ', variant: 'destructive' });
      return;
    }
    const product = products.find(p => p.id === newItem.product_id);
    if (!product) return;
    const baseUnitPrice = newItem.unit_price || product.costPrice || product.unit_price || 0;
    const finalUnitPrice = newItem.isForeignCurrency
      ? baseUnitPrice * newItem.exchangeRate
      : baseUnitPrice;
    const item: ImportSlipItem = {
      id: Date.now().toString(),
      product_id: newItem.product_id,
      product_code: product.code,
      product_name: product.name,
      quantity: newItem.quantity,
      unit_price: finalUnitPrice,
      total_price: newItem.quantity * finalUnitPrice,
      po_number: newItem.po_number,
      notes: newItem.notes,
      isForeignCurrency: newItem.isForeignCurrency,
      exchangeRate: newItem.isForeignCurrency ? newItem.exchangeRate : undefined
    };
    setCurrentItems([...currentItems, item]);
    setNewItem({
      product_id: '',
      quantity: 0,
      unit_price: 0,
      po_number: '',
      notes: '',
      isForeignCurrency: false,
      exchangeRate: 1
    });
  };
  const removeItemFromSlip = (index: number) => {
    setCurrentItems(currentItems.filter((_, i) => i !== index));
  };
  // Get available products for import slip (excluding already selected products)
  const getAvailableProductsForImport = () => {
    const selectedProductIds = currentItems.map(item => item.product_id);
    return products.filter(product => !selectedProductIds.includes(product.id));
  };
  const createImportSlip = async () => {
    if ((!newSlip.supplier_id && !newSlip.supplier_name) || currentItems.length === 0) {
      toast({ title: 'Lỗi', description: 'Vui lòng chọn nhà cung cấp và thêm ít nhất một sản phẩm', variant: 'destructive' });
      return;
    }
    if (!newSlip.warehouse_id) {
      toast({ title: 'Lỗi', description: 'Vui lòng chọn kho nhập', variant: 'destructive' });
      return;
    }
    try {
      // Handle supplier creation/selection
      let supplierId = newSlip.supplier_id;
      if (!supplierId && newSlip.supplier_name) {
        supplierId = await createOrSelectSupplier(
          newSlip.supplier_name, 
          newSlip.supplier_contact,
          newSlip.supplier_email,
          newSlip.supplier_address
        );
        if (!supplierId) return;
      }
      // Generate slip number using utility function
      const slipNumber = generateImportSlipCode();
      const totalAmount = currentItems.reduce((sum, item) => sum + item.total_price, 0);
      // Create import slip using backend API
      const slipData = {
        warehouseId: newSlip.warehouse_id,
        supplierId: supplierId,
        code: slipNumber,
        description: newSlip.notes || undefined,
        status: 'pending',
        type: 'import',
        details: currentItems.map(item => ({
          productId: item.product_id,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          // Include foreign currency data if available for this item
          isForeignCurrency: item.isForeignCurrency,
          exchangeRate: item.isForeignCurrency ? item.exchangeRate : undefined
        }))
      };
      // Call real API
      const newReceipt = await warehouseReceiptsApi.createReceipt(slipData);
      toast({ title: 'Thành công', description: `Tạo phiếu nhập kho ${newReceipt.code} thành công` });
      setShowCreateDialog(false);
      setNewSlip({
        supplier_id: '',
        supplier_name: '',
        supplier_contact: '',
        supplier_email: '',
        supplier_address: '',
        supplier_addressInfo: {
          provinceCode: '',
          districtCode: '',
          wardCode: '',
          provinceName: '',
          districtName: '',
          wardName: ''
        },
        warehouse_id: '',
        notes: '',
        import_date: new Date().toISOString().split('T')[0]
      });
      setCurrentItems([]);
      loadImportSlips();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể tạo phiếu nhập kho';
      toast({ title: 'Lỗi', description: convertPermissionCodesInMessage(errorMessage), variant: 'destructive' });
    }
  };
  const approveImportSlip = async (slipId: string) => {
    try {
      // First, get the warehouse receipt details to check items
      const receiptDetails = await warehouseReceiptsApi.getReceipts({ 
        page: 1, 
        limit: 1000,
        type: 'import'
      });
      const receipt = receiptDetails.receipts.find(r => r.id === slipId);
      if (!receipt) {
        toast({ title: 'Lỗi', description: 'Không tìm thấy phiếu nhập kho', variant: 'destructive' });
        return;
      }
      // Check if receipt has items
      if (!receipt.items || receipt.items.length === 0) {
        toast({ title: 'Lỗi', description: 'Phiếu nhập kho không có sản phẩm nào', variant: 'destructive' });
        return;
      }
      // First, validate and update stock levels BEFORE approving
      for (const item of receipt.items) {
        // Validate data first
        if (!receipt.warehouse_id || receipt.warehouse_id.trim() === '') {
          throw new Error('Warehouse ID không được để trống');
        }
        if (!item.product_id) {
          throw new Error('Product ID không được để trống');
        }
        if (!item.quantity || item.quantity <= 0) {
          throw new Error('Số lượng phải lớn hơn 0');
        }
        // Update stock level
        await stockLevelsApi.updateStockQuantity(
          receipt.warehouse_id,
          item.product_id,
          item.quantity
        );
      }
      // Only approve the warehouse receipt if all stock updates succeed
      const approvedReceipt = await warehouseReceiptsApi.approveReceipt(slipId);
      toast({ title: 'Thành công', description: `Đã phê duyệt phiếu nhập kho ${approvedReceipt.code} và cập nhật tồn kho` });
      loadImportSlips();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể phê duyệt phiếu nhập kho';
      toast({ title: 'Lỗi', description: convertPermissionCodesInMessage(errorMessage), variant: 'destructive' });
    }
  };
  const rejectImportSlip = async (slipId: string) => {
    try {
      const response = await warehouseReceiptsApi.rejectReceipt(slipId);
      toast({ title: 'Thành công', description: 'Đã từ chối phiếu nhập kho' });
      loadImportSlips();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể từ chối phiếu nhập kho';
      toast({ title: 'Lỗi', description: convertPermissionCodesInMessage(errorMessage), variant: 'destructive' });
    }
  };
  const deleteImportSlip = async (slipId: string) => {
    try {
      const response = await warehouseReceiptsApi.deleteReceipt(slipId);
      toast({ title: 'Thành công', description: response.message || 'Đã xóa phiếu nhập kho' });
      loadImportSlips();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể xóa phiếu nhập kho';
      toast({ title: 'Lỗi', description: convertPermissionCodesInMessage(errorMessage), variant: 'destructive' });
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-orange-600"><Clock className="w-3 h-3 mr-1" />Chờ duyệt</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Đã duyệt</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600"><XCircle className="w-3 h-3 mr-1" />Đã từ chối</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };
  const formatCurrencyShort = (amount: number) => {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    } else {
      return `${amount.toLocaleString('vi-VN')}`;
    }
  };
  const exportToExcel = () => {
    // Prepare data for export
    const exportData = importSlips.map((slip, index) => {
      const warehouse = getWarehouseById(slip.warehouse_id);
      const statusText = slip.status === 'pending' ? 'Chờ duyệt' :
                        slip.status === 'approved' ? 'Đã duyệt' :
                        slip.status === 'rejected' ? 'Đã từ chối' : slip.status;
      return {
        'STT': index + 1,
        'Số phiếu': slip.slip_number,
        'Nhà cung cấp': slip.supplier_name,
        'Liên hệ': slip.supplier_contact || '',
        'Kho nhập': warehouse?.name || 'N/A',
        'Ngày nhập': slip.import_date ? format(new Date(slip.import_date), 'dd/MM/yyyy') : '',
        'Tổng tiền (VND)': slip.total_amount,
        'Trạng thái': statusText,
        'Ngày tạo': slip.created_at ? format(new Date(slip.created_at), 'dd/MM/yyyy HH:mm') : '',
        'Ghi chú': slip.notes || '',
      };
    });
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    // Set column widths
    const colWidths = [
      { wch: 5 },   // STT
      { wch: 18 },  // Số phiếu
      { wch: 25 },  // Nhà cung cấp
      { wch: 15 },  // Liên hệ
      { wch: 20 },  // Kho nhập
      { wch: 12 },  // Ngày nhập
      { wch: 18 },  // Tổng tiền
      { wch: 15 },  // Trạng thái
      { wch: 20 },  // Ngày tạo
      { wch: 40 },  // Ghi chú
    ];
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách phiếu nhập kho');
    // Generate filename with timestamp
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN').replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false }).replace(/:/g, '-');
    const filename = `Danh_sach_phieu_nhap_kho_${dateStr}_${timeStr}.xlsx`;
    // Write file
    XLSX.writeFile(wb, filename);
    toast({
      title: "Thành công",
      description: `Đã xuất ${exportData.length} phiếu nhập kho ra file Excel`,
    });
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
         <div className="mt-6 ml-7">
           <h1 className="text-3xl font-bold">Quản lý phiếu nhập kho</h1>
           <p className="mt-1 text-sm text-muted-foreground">Quản lý các phiếu nhập kho và phê duyệt</p>
         </div>
         <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
           <DialogTrigger asChild>
             <Button>
               <PlusCircle className="w-4 h-4 mr-2" />
               Tạo phiếu nhập
             </Button>
           </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tạo phiếu nhập kho mới</DialogTitle>
                <DialogDescription>
                  Nhập thông tin nhà cung cấp và danh sách sản phẩm cần nhập kho
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Supplier Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Thông tin nhà cung cấp</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="supplier">Nhà cung cấp <span className="text-red-500">*</span></Label>
                        <Combobox
                          options={suppliers.map((supplier, index) => ({
                            label: `${supplier?.name} ${supplier?.contact_phone && `(${supplier.contact_phone})`}`,
                            value: supplier?.id || ''
                          }))}
                          value={newSlip.supplier_id}
                          onValueChange={(value) => {
                            const supplier = suppliers.find(s => s?.id === value);
                            setNewSlip({
                              ...newSlip,
                              supplier_id: value,
                              supplier_name: supplier?.name || '',
                              supplier_contact: supplier?.contact_phone || '',
                              supplier_email: supplier?.email || '',
                              supplier_address: supplier?.address || '',
                              supplier_addressInfo: {
                                provinceCode: supplier?.addressInfo?.provinceCode || supplier?.addressInfo?.province?.code || '',
                                districtCode: supplier?.addressInfo?.districtCode || supplier?.addressInfo?.district?.code || '',
                                wardCode: supplier?.addressInfo?.wardCode || supplier?.addressInfo?.ward?.code || '',
                                provinceName: supplier?.addressInfo?.province?.name || '',
                                districtName: supplier?.addressInfo?.district?.name || '',
                                wardName: supplier?.addressInfo?.ward?.name || ''
                              }
                            });
                          }}
                          placeholder="Chọn nhà cung cấp hoặc nhập mới bên dưới"
                          searchPlaceholder="Tìm nhà cung cấp..."
                          emptyMessage="Không có nhà cung cấp nào"
                        />
                      </div>
                      <div>
                        <Label htmlFor="supplier_name">Hoặc nhập tên mới</Label>
                        <Input
                          id="supplier_name"
                          value={newSlip.supplier_name}
                          onChange={(e) => {
                            const newName = e.target.value;
                            // Auto-fill phone number if supplier exists
                            const existingSupplier = suppliers.find(s => 
                              s?.name?.toLowerCase() === newName.toLowerCase()
                            );
                            setNewSlip({
                              ...newSlip, 
                              supplier_name: newName, 
                              supplier_id: '',
                              supplier_contact: existingSupplier?.contact_phone || newSlip.supplier_contact,
                              supplier_email: existingSupplier?.email || newSlip.supplier_email,
                              supplier_address: existingSupplier?.address || newSlip.supplier_address
                            });
                            // Show suggestions if there are matching suppliers
                            setShowSupplierSuggestions(newName.length > 0 && !existingSupplier);
                          }}
                          onFocus={() => setShowSupplierSuggestions(newSlip.supplier_name.length > 0)}
                          onBlur={() => setTimeout(() => setShowSupplierSuggestions(false), 200)}
                          placeholder="Tên nhà cung cấp mới"
                        />
                        {/* Supplier suggestions dropdown */}
                        {showSupplierSuggestions && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {suppliers
                              .filter(s => s?.name?.toLowerCase()?.includes(newSlip.supplier_name.toLowerCase()))
                              .slice(0, 5)
                              .map((supplier) => (
                                <div
                                  key={supplier.id}
                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                  onClick={() => {
                                    setNewSlip({
                                      ...newSlip,
                                      supplier_name: supplier.name,
                                      supplier_id: supplier.id,
                                      supplier_contact: supplier.contact_phone,
                                      supplier_email: supplier.email || '',
                                      supplier_address: supplier.address || '',
                                      supplier_addressInfo: {
                                        provinceCode: supplier.addressInfo?.provinceCode || supplier.addressInfo?.province?.code || '',
                                        districtCode: supplier.addressInfo?.districtCode || supplier.addressInfo?.district?.code || '',
                                        wardCode: supplier.addressInfo?.wardCode || supplier.addressInfo?.ward?.code || '',
                                        provinceName: supplier.addressInfo?.province?.name || '',
                                        districtName: supplier.addressInfo?.district?.name || '',
                                        wardName: supplier.addressInfo?.ward?.name || ''
                                      }
                                    });
                                    setShowSupplierSuggestions(false);
                                  }}
                                >
                                  <div className="font-medium">{supplier.name}</div>
                                  <div className="text-gray-500 text-xs">{supplier.contact_phone}</div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="supplier_contact">Số điện thoại</Label>
                        <Input
                          id="supplier_contact"
                          value={newSlip.supplier_contact}
                          onChange={(e) => setNewSlip({...newSlip, supplier_contact: e.target.value})}
                          placeholder="Số điện thoại"
                        />
                      </div>
                      <div>
                        <Label htmlFor="supplier_email">Email</Label>
                        <Input
                          id="supplier_email"
                          type="email"
                          value={newSlip.supplier_email}
                          onChange={(e) => setNewSlip({...newSlip, supplier_email: e.target.value})}
                          placeholder="Email nhà cung cấp"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label>Địa chỉ</Label>
                        <AddressFormSeparate
                          value={{
                            address: newSlip.supplier_address,
                            provinceCode: newSlip.supplier_addressInfo?.provinceCode,
                            districtCode: newSlip.supplier_addressInfo?.districtCode,
                            wardCode: newSlip.supplier_addressInfo?.wardCode,
                            provinceName: newSlip.supplier_addressInfo?.provinceName,
                            districtName: newSlip.supplier_addressInfo?.districtName,
                            wardName: newSlip.supplier_addressInfo?.wardName
                          }}
                          onChange={(data) => {
                            setNewSlip(prev => ({
                              ...prev,
                              supplier_address: data.address,
                              supplier_addressInfo: {
                                provinceCode: data.provinceCode,
                                districtCode: data.districtCode,
                                wardCode: data.wardCode,
                                provinceName: data.provinceName,
                                districtName: data.districtName,
                                wardName: data.wardName
                              }
                            }));
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="import_date">Ngày nhập</Label>
                        <Input
                          id="import_date"
                          type="date"
                          value={newSlip.import_date}
                          onChange={(e) => setNewSlip({...newSlip, import_date: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="warehouse">Kho nhập <span className="text-red-500">*</span></Label>
                        <Combobox
                          options={warehouses.map((warehouse) => ({
                            label: `${warehouse.name} - ${warehouse.code}`,
                            value: warehouse.id
                          }))}
                          value={newSlip.warehouse_id}
                          onValueChange={(value) => setNewSlip({...newSlip, warehouse_id: value})}
                          placeholder="Chọn kho nhập"
                          searchPlaceholder="Tìm kho..."
                          emptyMessage="Không có kho nào"
                        />
                      </div>
                      <div></div>
                    </div>
                    <div>
                      <Label htmlFor="notes">Ghi chú</Label>
                      <Textarea
                        id="notes"
                        value={newSlip.notes}
                        onChange={(e) => setNewSlip({...newSlip, notes: e.target.value})}
                        placeholder="Ghi chú thêm"
                      />
                    </div>
                  </CardContent>
                </Card>
                {/* Add Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Thêm sản phẩm</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-6 gap-2">
                      <div>
                        <Label>Sản phẩm <span className="text-red-500">*</span></Label>
                        <Combobox
                          options={getAvailableProductsForImport().map((product) => ({
                            label: `${product.code} - ${product.name}`,
                            value: product.id
                          }))}
                          value={newItem.product_id}
                          onValueChange={(value) => {
                            const selectedProduct = products.find(p => p.id === value);
                            if (selectedProduct) {
                              // If product has foreign currency settings, populate accordingly
                              if (selectedProduct.isForeignCurrency && selectedProduct.exchangeRate) {
                                setNewItem({
                                  ...newItem,
                                  product_id: value,
                                  unit_price: selectedProduct.originalCostPrice || (selectedProduct.costPrice ? selectedProduct.costPrice / selectedProduct.exchangeRate : 0),
                                  isForeignCurrency: true,
                                  exchangeRate: selectedProduct.exchangeRate
                                });
                              } else {
                                // Regular product without foreign currency
                                setNewItem({
                                  ...newItem,
                                  product_id: value,
                                  unit_price: selectedProduct.costPrice || selectedProduct.unit_price || 0,
                                  isForeignCurrency: false,
                                  exchangeRate: 1
                                });
                              }
                            }
                          }}
                          placeholder="Chọn sản phẩm"
                          searchPlaceholder="Tìm sản phẩm..."
                          emptyMessage="Không có sản phẩm nào"
                        />
                      </div>
                      <div>
                        <Label>Số lượng <span className="text-red-500">*</span></Label>
                        <NumberInput
                          value={newItem.quantity}
                          onChange={(value) => setNewItem({...newItem, quantity: value})}
                          min={1}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label>Đơn giá <span className="text-red-500">*</span></Label>
                        <CurrencyInput
                          value={newItem.unit_price}
                          onChange={(value) => setNewItem({...newItem, unit_price: value})}
                          placeholder="Tự động điền khi chọn sản phẩm"
                        />
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="checkbox"
                            id="item-is-foreign-currency"
                            checked={newItem.isForeignCurrency}
                            onChange={(e) => setNewItem(prev => ({ ...prev, isForeignCurrency: e.target.checked }))}
                            className="h-4 w-4"
                          />
                          <Label htmlFor="item-is-foreign-currency" className="text-sm">Ngoại tệ</Label>
                        </div>
                      </div>
                      {newItem.isForeignCurrency && (
                        <div>
                          <Label>Tỷ giá</Label>
                          <NumberInput
                            id="item-exchange-rate"
                            value={newItem.exchangeRate}
                            onChange={(value) => setNewItem(prev => ({ ...prev, exchangeRate: value }))}
                            placeholder="1"
                            min={0.01}
                            step={0.01}
                          />
                        </div>
                      )}
                      <div className={newItem.isForeignCurrency ? "" : "col-span-2"}>
                        <Label>Số PO</Label>
                        <Input
                          value={newItem.po_number}
                          onChange={(e) => setNewItem({...newItem, po_number: e.target.value})}
                          placeholder="Số PO"
                        />
                      </div>
                      <div>
                        <div className="h-6"></div> {/* Spacer to match label height */}
                        <div className="flex justify-center">
                          <Button onClick={addItemToSlip} type="button" size="sm">
                            <PlusCircle className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="h-6"></div> {/* Spacer to match checkbox height */}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* Items List */}
                {currentItems.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Danh sách sản phẩm</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table className="min-w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-center">Mã SP</TableHead>
                            <TableHead className="text-center">Tên sản phẩm</TableHead>
                            <TableHead className="text-center">Số lượng</TableHead>
                            <TableHead className="text-center">Đơn giá</TableHead>
                            <TableHead className="text-center">Thành tiền</TableHead>
                            <TableHead className="text-center">Số PO</TableHead>
                            <TableHead className="text-center"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentItems.map((item, index) => (
                            <TableRow key={item.id || `item-${index}`}>
                              <TableCell className="text-center">{item.product_code}</TableCell>
                              <TableCell className="text-center">{item.product_name}</TableCell>
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell className="text-center">{formatCurrency(item.unit_price)}</TableCell>
                              <TableCell className="text-center">{formatCurrency(item.total_price)}</TableCell>
                              <TableCell className="text-center">{item.po_number || '-'}</TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItemFromSlip(index)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        </Table>
                      </div>
                      <div className="mt-4 text-right">
                        <strong>Tổng tiền: {formatCurrency(currentItems.reduce((sum, item) => sum + item.total_price, 0))}</strong>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Hủy
                </Button>
                <Button onClick={createImportSlip}>
                  Tạo phiếu nhập
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </div>
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Danh Sách Phiếu Nhập Kho
              </CardTitle>
              <CardDescription>
                Tất cả phiếu nhập kho trong hệ thống
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => exportToExcel()}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Xuất Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[1200px] w-full">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-center min-w-[120px]">Số phiếu</TableHead>
                  <TableHead className="font-semibold text-center min-w-[180px]">Nhà cung cấp</TableHead>
                  <TableHead className="font-semibold text-center min-w-[150px]">Kho nhập</TableHead>
                  <TableHead className="font-semibold text-center min-w-[110px]">Ngày nhập</TableHead>
                  <TableHead className="font-semibold text-center min-w-[130px]">Tổng tiền (VNĐ)</TableHead>
                  <TableHead className="font-semibold text-center min-w-[120px]">Trạng thái</TableHead>
                  <TableHead className="font-semibold text-center min-w-[150px]">Ngày tạo</TableHead>
                  <TableHead className="font-semibold text-center min-w-[200px]">Ghi chú</TableHead>
                  <TableHead className="font-semibold text-center min-w-[180px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importSlips.map((slip) => (
                  <TableRow key={slip.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-primary text-center">{slip.slip_number}</TableCell>
                    <TableCell className="font-medium text-center">{slip.supplier_name}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary/50 text-secondary-foreground text-xs font-medium">
                        {getWarehouseById(slip.warehouse_id)?.name || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-center">{format(new Date(slip.import_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-center font-semibold">
                      <div className="relative group">
                        <span className="cursor-help">
                          {formatCurrencyShort(slip.total_amount)}
                        </span>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                          {formatCurrency(slip.total_amount)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(slip.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm text-center">{slip.created_at ? format(new Date(slip.created_at), 'dd/MM/yyyy HH:mm') : 'N/A'}</TableCell>
                    <TableCell className="text-sm text-center">
                      <div className="truncate max-w-xs mx-auto" title={slip.notes || ''}>
                        {slip.notes || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSlip(slip);
                            loadSlipItems(slip.id);
                            loadInventoryHistory(slip.id);
                          }}
                          className="h-8 px-2 text-xs whitespace-nowrap"
                        >
                          <Package className="w-3 h-3 mr-1" />
                          Chi tiết
                        </Button>
                        {canApproveImports && slip.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => approveImportSlip(slip.id)}
                              className="h-8 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 whitespace-nowrap"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Duyệt
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => rejectImportSlip(slip.id)}
                              className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 whitespace-nowrap"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Từ chối
                            </Button>
                          </>
                        )}
                        {canApproveImports && slip.status === 'rejected' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteImportSlip(slip.id)}
                            className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 whitespace-nowrap"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Xóa
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Đang tải danh sách phiếu nhập kho...</p>
          </div>
        </div>
      )}
      {/* Slip Details Dialog */}
      <Dialog open={!!selectedSlip} onOpenChange={() => setSelectedSlip(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết phiếu nhập - {selectedSlip?.slip_number}</DialogTitle>
            <DialogDescription>
              Nhà cung cấp: {selectedSlip?.supplier_name} | 
              Ngày nhập: {selectedSlip && format(new Date(selectedSlip.import_date), 'dd/MM/yyyy')} | 
              Kho nhập: {getWarehouseById(selectedSlip?.warehouse_id)?.name} ({getWarehouseById(selectedSlip?.warehouse_id)?.code})
            </DialogDescription>
          </DialogHeader>
          {/* Additional Information Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <div>
                <Label className="font-medium text-sm">Thông tin nhà cung cấp:</Label>
                <p className="text-sm text-muted-foreground">{selectedSlip?.supplier_name}</p>
                {selectedSlip?.supplier_contact && (
                  <p className="text-sm text-muted-foreground">Liên hệ: {selectedSlip.supplier_contact}</p>
                )}
              </div>
              <div>
                <Label className="font-medium text-sm">Trạng thái:</Label>
                <div className="mt-1">{getStatusBadge(selectedSlip?.status || '')}</div>
              </div>
              <div>
                <Label className="font-medium text-sm">Ngày tạo:</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedSlip?.created_at ? format(new Date(selectedSlip.created_at), 'dd/MM/yyyy HH:mm') : 'N/A'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {selectedSlip?.approved_at && (
                <div>
                  <Label className="font-medium text-sm">Ngày duyệt:</Label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedSlip.approved_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              )}
              {selectedSlip?.approved_by && (
                <div>
                  <Label className="font-medium text-sm">Người duyệt:</Label>
                  <p className="text-sm text-muted-foreground">{selectedSlip.approved_by}</p>
                </div>
              )}
              {selectedSlip?.created_by && (
                <div>
                  <Label className="font-medium text-sm">Người tạo:</Label>
                  <p className="text-sm text-muted-foreground">{selectedSlip.created_by}</p>
                </div>
              )}
              {selectedSlip?.notes && (
                <div>
                  <Label className="font-medium text-sm">Ghi chú:</Label>
                  <p className="text-sm text-muted-foreground">{selectedSlip.notes}</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-6">
            <h4 className="text-lg font-semibold mb-4">Danh sách sản phẩm nhập kho</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Mã SP</TableHead>
                  <TableHead className="text-center">Tên sản phẩm</TableHead>
                  <TableHead className="text-center">Số lượng</TableHead>
                  <TableHead className="text-center">Đơn giá</TableHead>
                  <TableHead className="text-center">Thành tiền</TableHead>
                  <TableHead className="text-center">Số PO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slipItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center">{item.product_code}</TableCell>
                    <TableCell className="text-center">{item.product_name}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-center">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-center">{formatCurrency(item.total_price)}</TableCell>
                    <TableCell className="text-center">{item.po_number || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="text-right mt-4">
            <strong>Tổng tiền: {selectedSlip && formatCurrency(selectedSlip.total_amount)}</strong>
          </div>
          {/* Inventory History Section */}
          {inventoryHistory.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold mb-4">Lịch sử xuất nhập kho</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Số lượng</TableHead>
                    <TableHead>Người thực hiện</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryHistory.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        {movement.products?.code} - {movement.products?.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={movement.movement_type === 'stock_in' ? 'default' : 'destructive'}>
                          {movement.movement_type === 'stock_in' ? 'Nhập kho' : 'Xuất kho'}
                        </Badge>
                      </TableCell>
                      <TableCell className={movement.movement_type === 'stock_in' ? 'text-green-600' : 'text-red-600'}>
                        {movement.movement_type === 'stock_in' ? '+' : '-'}{movement.quantity}
                      </TableCell>
                      <TableCell>{movement.profiles?.full_name || 'Hệ thống'}</TableCell>
                      <TableCell>{movement.created_at ? format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm') : 'N/A'}</TableCell>
                      <TableCell>{movement.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
