import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { PlusCircle, Package, CheckCircle, Clock, X, XCircle, Trash2, Download, Upload, Search, ChevronRight, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
// // import { supabase } from '@/integrations/supabase/client'; // Removed - using API instead // Removed - using API instead
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { warehouseReceiptsApi, type WarehouseReceiptImportJobSnapshot, type WarehouseReceiptImportJobStatus } from '@/api/warehouseReceipts.api';
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
  const [displayLimit, setDisplayLimit] = useState<number>(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
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
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<Array<{ row: number; code?: string; reason: string }>>([]);
  const [importSummary, setImportSummary] = useState<{ imported: number; failed: number; totalRows: number } | null>(null);
  // Import job state
  const [importJobs, setImportJobs] = useState<WarehouseReceiptImportJobSnapshot[]>([]);
  const [activeJobs, setActiveJobs] = useState<WarehouseReceiptImportJobSnapshot[]>([]);
  const [jobHistoryPagination, setJobHistoryPagination] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  const [jobStatusTab, setJobStatusTab] = useState<'running' | 'history'>('running');
  const [jobHistoryPage, setJobHistoryPage] = useState(1);
  const [jobHistoryItemsPerPage, setJobHistoryItemsPerPage] = useState(3);
  const [jobHistorySort, setJobHistorySort] = useState<'newest' | 'oldest'>('newest');
  const [expandedJobErrors, setExpandedJobErrors] = useState<Set<string>>(new Set());
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const pollingRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const previousJobStatusesRef = React.useRef<Record<string, WarehouseReceiptImportJobStatus>>({});
  const [isPollingActive, setIsPollingActive] = useState(false);
  const { toast } = useToast();
  const getWarehouseById = (id?: string) => {
    if (!id) return undefined;
    return warehouses.find(w => w.id === id);
  };
  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadImportSlips();
    loadProducts();
    loadSuppliers();
    loadWarehouses();
    // Load active jobs on mount
    refreshImportJobs({ onlyActive: true });
    // Load job history on mount
    refreshImportJobs({
      onlyActive: false,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
      page: 1,
      limit: jobHistoryItemsPerPage
    });
  }, [displayLimit, currentPage, debouncedSearchTerm, sortField, sortDirection]);
  
  // Load job history when tab is activated or parameters change
  useEffect(() => {
    if (jobStatusTab === 'history') {
      refreshImportJobs({
        onlyActive: false,
        sortBy: 'createdAt',
        sortOrder: jobHistorySort === 'newest' ? 'DESC' : 'ASC',
        page: jobHistoryPage,
        limit: jobHistoryItemsPerPage
      });
    }
  }, [jobStatusTab, jobHistorySort, jobHistoryPage, jobHistoryItemsPerPage]);
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
      const resp = await warehouseReceiptsApi.getReceipts({ 
        page: currentPage, 
        limit: displayLimit, 
        type: 'import',
        search: debouncedSearchTerm || undefined
      });
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
      // Update pagination state
      setTotal(resp.total || 0);
      setTotalPages(Math.ceil((resp.total || 0) / displayLimit));
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
      // Get the specific receipt with details by ID
      const receipt = await warehouseReceiptsApi.getReceipt(slipId);
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
      const receipt = await warehouseReceiptsApi.getReceipt(slipId);
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
  // Sort import slips (client-side sorting since API doesn't support it yet, but filtering is done by API via search parameter)
  const filteredAndSortedSlips = importSlips.sort((a, b) => {
      let aValue: any, bValue: any;
      switch (sortField) {
        case 'slip_number':
          aValue = a.slip_number;
          bValue = b.slip_number;
          break;
        case 'supplier_name':
          aValue = a.supplier_name;
          bValue = b.supplier_name;
          break;
        case 'total_amount':
          aValue = a.total_amount || 0;
          bValue = b.total_amount || 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
      }
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };
  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };
  const downloadImportTemplate = async () => {
    try {
      // Sử dụng API mới cho template phiếu nhập kho
      const { blob, filename } = await warehouseReceiptsApi.downloadImportReceiptTemplate();
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({ title: 'Thành công', description: 'Đã tải mẫu từ hệ thống' });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể tải mẫu';
      toast({ title: 'Lỗi', description: convertPermissionCodesInMessage(errorMessage), variant: 'destructive' });
    }
  };

  const handleImportExcel = async () => {
    if (!importFile) {
      toast({ title: 'Lỗi', description: 'Vui lòng chọn file Excel', variant: 'destructive' });
      return;
    }
    try {
      setIsImporting(true);
      setImportErrors([]);
      setImportSummary(null);
      
      // Sử dụng async API cho import phiếu nhập kho
      const job = await warehouseReceiptsApi.importImportExcelAsync(importFile);
      
      toast({
        title: 'Đã bắt đầu import',
        description: `Job #${job.jobId.slice(-6)} đã được tạo. Tiến trình sẽ được xử lý trong nền.`,
      });
      
      // Add job to active jobs immediately
      setActiveJobs([job]);
      
      // Start polling immediately
      setIsPollingActive(true);
      
      // Refresh jobs list để hiển thị job mới
      await refreshImportJobs({ onlyActive: true });
      
      // Chuyển sang tab "Đang chạy" để user có thể thấy job
      setJobStatusTab('running');
      
      // Close dialog và reset form
      setIsImportDialogOpen(false);
      setImportFile(null);
      setImportErrors([]);
      setImportSummary(null);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể import file Excel';
      toast({
        title: 'Lỗi',
        description: convertPermissionCodesInMessage(errorMessage),
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Job status labels
  const IMPORT_STATUS_LABELS: Record<WarehouseReceiptImportJobStatus, string> = {
    queued: 'Đang chờ xử lý',
    processing: 'Đang xử lý',
    completed: 'Hoàn thành',
    failed: 'Thất bại',
    cancelled: 'Đã hủy',
  };

  const getJobStatusLabel = (job: WarehouseReceiptImportJobSnapshot): string => {
    return IMPORT_STATUS_LABELS[job.status] ?? job.status;
  };

  // Refresh import jobs - always filter for import type only
  const refreshImportJobs = useCallback(async (options?: {
    onlyActive?: boolean;
    showNotifications?: boolean;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }) => {
    const { onlyActive = false, showNotifications = false, page, limit } = options || {};
    try {
      // Always filter for import type only
      const response = await warehouseReceiptsApi.listImportJobs({
        onlyActive,
        sortBy: options?.sortBy || 'createdAt',
        sortOrder: options?.sortOrder || 'DESC',
        page,
        limit,
        type: 'import' // Always filter for import receipts only
      });

      const processedJobs = response.jobs;

      const isActiveCall = options?.onlyActive === true;

      if (isActiveCall) {
        // Filter jobs by type to ensure only import jobs are shown
        const filteredJobs = processedJobs.filter(job => 
          job.type === 'import' || !job.type // Include jobs without type for backward compatibility
        );
        setActiveJobs(filteredJobs);
        // Start polling if there are active jobs
        const hasActiveJobs = filteredJobs.some(job => job.status === 'queued' || job.status === 'processing');
        if (hasActiveJobs) {
          setIsPollingActive(true);
        }
      } else {
        // Filter jobs by type to ensure only import jobs are shown
        const filteredJobs = processedJobs.filter(job => 
          job.type === 'import' || !job.type // Include jobs without type for backward compatibility
        );
        // Use total and totalPages from API response, not from filtered jobs length
        setJobHistoryPagination({
          total: response.total,
          page: response.page,
          limit: response.limit,
          totalPages: response.totalPages
        });
        setImportJobs(filteredJobs);
      }

      // Show notifications for status changes
      if (showNotifications) {
        processedJobs.forEach(job => {
          const prevStatus = previousJobStatusesRef.current[job.jobId];
          if (prevStatus && prevStatus !== job.status) {
            if (job.status === 'completed') {
              toast({
                title: 'Hoàn thành',
                description: job.message || `Đã import ${job.imported ?? 0} phiếu nhập kho.`,
              });
            } else if (job.status === 'failed') {
              toast({
                title: 'Import thất bại',
                description: job.message || 'Có lỗi khi xử lý file import',
                variant: 'destructive',
              });
            } else if (job.status === 'cancelled') {
              toast({
                title: 'Đã hủy import',
                description: job.message || 'Tiến trình import đã được hủy',
              });
            }
          }
          previousJobStatusesRef.current[job.jobId] = job.status;
        });
      }
    } catch (error: any) {
      if (!onlyActive) {
        toast({
          title: 'Lỗi',
          description: convertPermissionCodesInMessage(error.response?.data?.message || error.message || 'Không thể tải danh sách tiến trình import'),
          variant: 'destructive',
        });
      }
    }
  }, [toast]);

  // Handle job status notification and reload data
  const handleJobStatusNotification = useCallback(async (job: WarehouseReceiptImportJobSnapshot) => {
    const status = job.status;
    
    // Show appropriate toast notifications based on status
    if (status === 'completed') {
      toast({
        title: 'Hoàn thành',
        description: job.message || `Đã import ${job.imported ?? 0} phiếu nhập kho.`,
      });
    } else if (status === 'failed') {
      toast({
        title: 'Import thất bại',
        description: job.message || 'Có lỗi khi xử lý file import',
        variant: 'destructive',
      });
    } else if (status === 'cancelled') {
      toast({
        title: 'Đã hủy import',
        description: job.message || 'Tiến trình import đã được hủy',
      });
    }
    
    // Reload import slips list and job history when job completes
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      try {
        // Reload import slips list to show newly imported receipts
        await loadImportSlips();
        // Refresh job history
        await refreshImportJobs({
          onlyActive: false,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
          page: jobHistoryPage,
          limit: jobHistoryItemsPerPage
        });
      } catch (error) {
        // Error reloading data
        console.error('Error reloading data after job completion:', error);
      }
    }
  }, [toast, loadImportSlips, refreshImportJobs, jobHistoryPage, jobHistoryItemsPerPage]);

  // Polling function for active jobs - similar to product import
  const pollActiveJobs = useCallback(async () => {
    try {
      const response = await warehouseReceiptsApi.listImportJobs({
        onlyActive: true,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        type: 'import' // Filter for import receipts only
      });

      // Use backend status directly (do not infer status from processedRows/totalRows)
      const processedJobs = response.jobs;

      // Update active jobs state
      setActiveJobs(processedJobs);

      // Check pagination total to decide whether to continue polling
      const hasActiveJobs = response.total > 0;

      if (hasActiveJobs) {
        // Continue polling in next 3 seconds
        setIsPollingActive(true);
      } else {
        // When active jobs become empty, check if any jobs just completed
        // by fetching all jobs and finding those that were previously active
        const allJobsResponse = await warehouseReceiptsApi.listImportJobs({
          onlyActive: false,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
          limit: 10,
          type: 'import' // Filter for import receipts only
        });
        
        // Find jobs that were previously active but are now completed/failed/cancelled
        allJobsResponse.jobs.forEach(job => {
          const prevStatus = previousJobStatusesRef.current[job.jobId];
          if (prevStatus && (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled')) {
            handleJobStatusNotification(job);
          }
        });
        
        // Stop polling if no active jobs
        setIsPollingActive(false);
      }

      // Show notifications for status changes in current active jobs
      processedJobs.forEach(job => {
        const prevStatus = previousJobStatusesRef.current[job.jobId];
        if (prevStatus && prevStatus !== job.status || job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
          handleJobStatusNotification(job);
        }
        previousJobStatusesRef.current[job.jobId] = job.status;
      });

    } catch (error) {
      // On error, stop polling to avoid infinite retries
      setIsPollingActive(false);
    }
  }, [handleJobStatusNotification]);

  // Stop polling function
  const stopImportPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Ensure active jobs are fetched at least once on page load.
  // If backend already has a running job (status: queued/processing), we should show the progress bar immediately.
  // Use a ref to prevent infinite loop
  const pollActiveJobsRef = React.useRef(pollActiveJobs);
  React.useEffect(() => {
    pollActiveJobsRef.current = pollActiveJobs;
  }, [pollActiveJobs]);
  
  React.useEffect(() => {
    pollActiveJobsRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Start/stop polling based on isPollingActive state
  useEffect(() => {
    if (isPollingActive) {
      if (!pollingRef.current) {
        // Start polling immediately
        pollActiveJobsRef.current();
        pollingRef.current = setInterval(() => {
          pollActiveJobsRef.current();
        }, 3000);
      }
    } else {
      if (pollingRef.current) {
        stopImportPolling();
      }
    }
  }, [isPollingActive, stopImportPolling]);
  
  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopImportPolling();
    };
  }, [stopImportPolling]);

  // Refresh import slips when jobs complete
  useEffect(() => {
    const completedJobs = activeJobs.filter(job => 
      (job.status === 'completed' && job.imported > 0) ||
      (job.status === 'completed' && job.failed === 0 && job.totalRows > 0)
    );
    if (completedJobs.length > 0) {
      loadImportSlips();
    }
  }, [activeJobs]);

  // Cancel job
  const handleCancelJob = useCallback(async (jobId: string) => {
    try {
      setCancellingJobId(jobId);
      await warehouseReceiptsApi.cancelImportJob(jobId);
      await refreshImportJobs({ onlyActive: true, showNotifications: true });
      toast({
        title: 'Thành công',
        description: 'Đã hủy tiến trình import',
      });
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: convertPermissionCodesInMessage(error.response?.data?.message || error.message || 'Không thể hủy tiến trình'),
        variant: 'destructive',
      });
    } finally {
      setCancellingJobId(null);
    }
  }, [refreshImportJobs, toast]);

  const toggleJobErrors = (jobId: string) => {
    setExpandedJobErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const handleJobCardSelect = (jobId: string) => {
    setActiveJobId(activeJobId === jobId ? null : jobId);
  };

  // Filter jobs by type and status
  const runningJobs = activeJobs.filter(job => 
    (job.status === 'queued' || job.status === 'processing') &&
    (job.type === 'import' || !job.type) // Only import jobs, or jobs without type (backward compatibility)
  );
  const completedJobs = importJobs.filter(job => 
    (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') &&
    (job.type === 'import' || !job.type) // Only import jobs, or jobs without type (backward compatibility)
  );

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
                              <TableCell className="text-center">
                                <div className="truncate" title={item.product_code}>{item.product_code}</div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="truncate" title={item.product_name}>{item.product_name}</div>
                              </TableCell>
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
      {/* Import Job History Card */}
      <Card>
        <CardHeader>
          <CardTitle>Tiến Trình nhập từ Excel</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={jobStatusTab} onValueChange={(value) => setJobStatusTab(value as 'running' | 'history')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="running">Đang chạy ({runningJobs.length})</TabsTrigger>
              <TabsTrigger value="history">Lịch sử ({jobHistoryPagination?.total || completedJobs.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="running" className="mt-4 space-y-3">
              {runningJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Không có tiến trình nhập nào đang chạy. Bạn có thể bắt đầu nhập bằng nút "Nhập từ Excel".
                </p>
              ) : (
                runningJobs.map((job) => (
                  <div
                    key={job.jobId}
                    onClick={() => handleJobCardSelect(job.jobId)}
                    className={`rounded-md border border-border/60 bg-muted/10 p-3 space-y-2 cursor-pointer transition ${
                      activeJobId === job.jobId ? 'border-primary shadow-sm' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>Job #{job.jobId.slice(-6)}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{getJobStatusLabel(job)}</Badge>
                        {(job.status === 'queued' || job.status === 'processing') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelJob(job.jobId);
                            }}
                            disabled={cancellingJobId === job.jobId}
                          >
                            {cancellingJobId === job.jobId ? 'Đang hủy...' : 'Hủy'}
                          </Button>
                        )}
                      </div>
                    </div>
                    <Progress value={job.percent ?? 0} />
                    <div className="text-xs text-muted-foreground">
                      Đã xử lý {job.processedRows ?? 0}/{job.totalRows || '...'} dòng · Thành công {job.imported ?? 0} · Lỗi {job.failed ?? 0}
                    </div>
                    {job.errors && job.errors.length > 0 && (
                      <div className="text-xs text-destructive space-y-1">
                        {job.errors.slice(-2).map((error, index) => (
                          <div key={`${job.jobId}-err-${index}`}>
                            Dòng {error.row ?? 'N/A'}: {error.reason}
                          </div>
                        ))}
                        {job.errors.length > 2 && (
                          <div className="text-[10px] text-destructive/80">
                            ... và {job.errors.length - 2} lỗi khác
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </TabsContent>
            <TabsContent value="history" className="mt-4 space-y-3">
              {/* Job History Controls */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-medium whitespace-nowrap">Sắp xếp:</span>
                  <Select value={jobHistorySort} onValueChange={(value: 'newest' | 'oldest') => {
                    setJobHistorySort(value);
                    setJobHistoryPage(1);
                    refreshImportJobs({
                      onlyActive: false,
                      sortBy: 'createdAt',
                      sortOrder: value === 'newest' ? 'DESC' : 'ASC',
                      page: 1,
                      limit: jobHistoryItemsPerPage
                    });
                  }}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Chọn sắp xếp" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Mới nhất</SelectItem>
                      <SelectItem value="oldest">Cũ nhất</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-medium whitespace-nowrap">Hiển thị:</span>
                  <Combobox
                    options={[
                      { label: "3", value: "3" },
                      { label: "5", value: "5" },
                      { label: "10", value: "10" }
                    ]}
                    value={jobHistoryItemsPerPage.toString()}
                    onValueChange={(value) => {
                      const newLimit = parseInt(value);
                      setJobHistoryItemsPerPage(newLimit);
                      setJobHistoryPage(1);
                      refreshImportJobs({
                        onlyActive: false,
                        sortBy: 'createdAt',
                        sortOrder: jobHistorySort === 'newest' ? 'DESC' : 'ASC',
                        page: 1,
                        limit: newLimit
                      });
                    }}
                    placeholder="Chọn số lượng"
                    searchPlaceholder="Tìm số lượng..."
                    emptyMessage="Không có tùy chọn nào"
                  />
                </div>
              </div>
              {completedJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có lịch sử nhập.</p>
              ) : (
                <>
                  {/* Job History Items */}
                  <div className="space-y-3">
                    {completedJobs.map((job) => (
                      <div
                        key={job.jobId}
                        onClick={() => handleJobCardSelect(job.jobId)}
                        className={`rounded-md border border-border/60 p-3 space-y-1 text-sm cursor-pointer ${
                          activeJobId === job.jobId ? 'border-primary shadow-sm' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>Job #{job.jobId.slice(-6)}</span>
                          <Badge variant={job.status === 'completed' ? 'secondary' : job.status === 'failed' ? 'destructive' : 'outline'}>
                            {getJobStatusLabel(job)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Tổng: {job.totalRows ?? 0} · Thành công {job.imported ?? 0} · Lỗi {job.failed ?? 0}
                          {job.createdAt && (
                            <span className="ml-2">
                              · {new Date(job.createdAt).toLocaleString('vi-VN')}
                            </span>
                          )}
                        </div>
                        {job.errors && job.errors.length > 0 && (
                          <div className="space-y-1">
                            <div
                              className="flex items-center gap-1 text-xs text-destructive cursor-pointer hover:text-destructive/80"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleJobErrors(job.jobId);
                              }}
                            >
                              {expandedJobErrors.has(job.jobId) ? (
                                <ChevronDown className="w-3 h-3" />
                              ) : (
                                <ChevronRight className="w-3 h-3" />
                              )}
                              {job.errors.length} lỗi
                            </div>
                            {expandedJobErrors.has(job.jobId) && (
                              <div className="ml-4 space-y-1 text-xs text-destructive/90">
                                {job.errors.map((error, index) => (
                                  <div key={`${job.jobId}-error-${index}`}>
                                    Dòng {error.row ?? 'N/A'}{error.code ? ` (Mã: ${error.code})` : ''}: {error.reason}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Job History Pagination */}
                  {jobHistoryPagination && jobHistoryPagination.totalPages > 1 && (
                    <div className="flex flex-col items-center pt-4 border-t">
                      <div className="text-sm text-muted-foreground mb-4">
                        Trang {jobHistoryPage} / {jobHistoryPagination.totalPages}
                      </div>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              href="#" 
                              onClick={(e) => {
                                e.preventDefault();
                                if (jobHistoryPage > 1) {
                                  const newPage = jobHistoryPage - 1;
                                  setJobHistoryPage(newPage);
                                  refreshImportJobs({
                                    onlyActive: false,
                                    sortBy: 'createdAt',
                                    sortOrder: jobHistorySort === 'newest' ? 'DESC' : 'ASC',
                                    page: newPage,
                                    limit: jobHistoryItemsPerPage
                                  });
                                }
                              }}
                              className={jobHistoryPage === 1 ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                          {/* Show first page */}
                          {jobHistoryPage > 3 && (
                            <>
                              <PaginationItem>
                                <PaginationLink 
                                  href="#" 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setJobHistoryPage(1);
                                    refreshImportJobs({
                                      onlyActive: false,
                                      sortBy: 'createdAt',
                                      sortOrder: jobHistorySort === 'newest' ? 'DESC' : 'ASC',
                                      page: 1,
                                      limit: jobHistoryItemsPerPage
                                    });
                                  }}
                                >
                                  1
                                </PaginationLink>
                              </PaginationItem>
                              {jobHistoryPage > 4 && (
                                <PaginationItem>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              )}
                            </>
                          )}
                          {/* Show pages around current page */}
                          {Array.from({ length: Math.min(5, jobHistoryPagination.totalPages) }, (_, i) => {
                            let pageNum;
                            if (jobHistoryPagination.totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (jobHistoryPage <= 3) {
                              pageNum = i + 1;
                            } else if (jobHistoryPage >= jobHistoryPagination.totalPages - 2) {
                              pageNum = jobHistoryPagination.totalPages - 4 + i;
                            } else {
                              pageNum = jobHistoryPage - 2 + i;
                            }
                            if (pageNum < 1 || pageNum > jobHistoryPagination.totalPages) return null;
                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink 
                                  href="#" 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setJobHistoryPage(pageNum);
                                    refreshImportJobs({
                                      onlyActive: false,
                                      sortBy: 'createdAt',
                                      sortOrder: jobHistorySort === 'newest' ? 'DESC' : 'ASC',
                                      page: pageNum,
                                      limit: jobHistoryItemsPerPage
                                    });
                                  }}
                                  isActive={jobHistoryPage === pageNum}
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
                          {/* Show last page */}
                          {jobHistoryPage < jobHistoryPagination.totalPages - 2 && (
                            <>
                              {jobHistoryPage < jobHistoryPagination.totalPages - 3 && (
                                <PaginationItem>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              )}
                              <PaginationItem>
                                <PaginationLink 
                                  href="#" 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setJobHistoryPage(jobHistoryPagination.totalPages);
                                    refreshImportJobs({
                                      onlyActive: false,
                                      sortBy: 'createdAt',
                                      sortOrder: jobHistorySort === 'newest' ? 'DESC' : 'ASC',
                                      page: jobHistoryPagination.totalPages,
                                      limit: jobHistoryItemsPerPage
                                    });
                                  }}
                                >
                                  {jobHistoryPagination.totalPages}
                                </PaginationLink>
                              </PaginationItem>
                            </>
                          )}
                          <PaginationItem>
                            <PaginationNext 
                              href="#" 
                              onClick={(e) => {
                                e.preventDefault();
                                if (jobHistoryPage < jobHistoryPagination.totalPages) {
                                  const newPage = jobHistoryPage + 1;
                                  setJobHistoryPage(newPage);
                                  refreshImportJobs({
                                    onlyActive: false,
                                    sortBy: 'createdAt',
                                    sortOrder: jobHistorySort === 'newest' ? 'DESC' : 'ASC',
                                    page: newPage,
                                    limit: jobHistoryItemsPerPage
                                  });
                                }
                              }}
                              className={jobHistoryPage === jobHistoryPagination.totalPages ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
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
            <div className="flex items-center gap-2">
              {canManageImports && (
                <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Nhập từ Excel
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Nhập Phiếu Nhập Kho Từ Excel</DialogTitle>
                      <DialogDescription>
                        Tải file Excel mẫu hoặc chọn file để nhập phiếu nhập kho
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={downloadImportTemplate}
                          className="flex-1"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Tải File Mẫu
                        </Button>
                      </div>
                      <div>
                        <Label htmlFor="import-file">Chọn file Excel</Label>
                        <Input
                          id="import-file"
                          type="file"
                          accept=".xlsx,.xls"
                          disabled={isImporting}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setImportFile(file);
                              setImportErrors([]);
                              setImportSummary(null);
                            } else {
                              setImportFile(null);
                            }
                          }}
                        />
                      </div>
                      {importFile && (
                        <div className="text-sm text-muted-foreground">
                          Đã chọn: {importFile.name}
                        </div>
                      )}
                      {importSummary && (
                        <Alert>
                          <AlertDescription>
                            Đã xử lý {importSummary.totalRows} dòng: thành công {importSummary.imported}, lỗi {importSummary.failed}.
                          </AlertDescription>
                        </Alert>
                      )}
                      {importErrors.length > 0 && (
                        <Alert variant="destructive">
                          <AlertDescription>
                            <p className="font-medium mb-2">Chi tiết lỗi:</p>
                            <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                              {importErrors.slice(0, 10).map((error, index) => (
                                <li key={index}>
                                  Dòng {error.row ?? 'N/A'}{error.code ? ` (Mã: ${error.code})` : ''}: {error.reason}
                                </li>
                              ))}
                            </ul>
                            {importErrors.length > 10 && (
                              <p className="text-xs mt-2">
                                Hiển thị 10 lỗi đầu tiên trong tổng số {importErrors.length} lỗi.
                              </p>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsImportDialogOpen(false);
                          setImportFile(null);
                          setImportErrors([]);
                          setImportSummary(null);
                        }}
                        disabled={isImporting}
                      >
                        Đóng
                      </Button>
                      <Button
                        onClick={handleImportExcel}
                        disabled={!importFile || isImporting}
                      >
                        {isImporting ? 'Đang import...' : 'Bắt đầu Import'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              <Button
                variant="outline"
                onClick={() => exportToExcel()}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Xuất Excel
              </Button>
              <Label htmlFor="display-limit" className="text-sm font-medium">
                Hiển thị:
              </Label>
              <Select value={displayLimit.toString()} onValueChange={(value) => {
                setDisplayLimit(parseInt(value));
                setCurrentPage(1); // Reset to first page when limit changes
              }}>
                <SelectTrigger className="w-20">
                  <SelectValue placeholder="Số lượng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Search Bar */}
          <div className="flex gap-4 mb-6 p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo số phiếu, nhà cung cấp, kho hoặc ghi chú..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[1200px] w-full">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead 
                    className="font-semibold text-center min-w-[120px] cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort('slip_number')}
                  >
                    <div className="flex items-center gap-1 justify-center">
                      Số phiếu
                      {getSortIcon('slip_number')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-semibold text-center min-w-[180px] cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort('supplier_name')}
                  >
                    <div className="flex items-center gap-1 justify-center">
                      Nhà cung cấp
                      {getSortIcon('supplier_name')}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-center min-w-[150px]">Kho nhập</TableHead>
                  <TableHead className="font-semibold text-center min-w-[110px]">Ngày nhập</TableHead>
                  <TableHead 
                    className="font-semibold text-center min-w-[130px] cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort('total_amount')}
                  >
                    <div className="flex items-center gap-1 justify-center">
                      Tổng tiền (VNĐ)
                      {getSortIcon('total_amount')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-semibold text-center min-w-[120px] cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1 justify-center">
                      Trạng thái
                      {getSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-semibold text-center min-w-[150px] cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1 justify-center">
                      Ngày tạo
                      {getSortIcon('created_at')}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-center min-w-[200px]">Ghi chú</TableHead>
                  <TableHead className="font-semibold text-center min-w-[180px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedSlips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      {searchTerm ? 'Không tìm thấy phiếu nhập kho nào' : 'Chưa có phiếu nhập kho nào'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedSlips.map((slip) => (
                    <TableRow key={slip.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-primary text-center">
                      <div className="truncate" title={slip.slip_number}>{slip.slip_number}</div>
                    </TableCell>
                    <TableCell className="font-medium text-center">
                      <div className="truncate" title={slip.supplier_name || ''}>{slip.supplier_name || '-'}</div>
                    </TableCell>
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center mt-4 pt-4 border-t px-4">
              <div className="text-sm text-muted-foreground mb-4">
                Hiển thị {((currentPage - 1) * displayLimit) + 1} - {Math.min(currentPage * displayLimit, total)} trong tổng số {total} phiếu nhập kho
              </div>
              <Pagination>
                <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
                        }}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {/* Show first page */}
                    {currentPage > 3 && (
                      <>
                        <PaginationItem>
                          <PaginationLink 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(1);
                            }}
                          >
                            1
                          </PaginationLink>
                        </PaginationItem>
                        {currentPage > 4 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                      </>
                    )}
                    {/* Show pages around current page */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      if (pageNum < 1 || pageNum > totalPages) return null;
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(pageNum);
                            }}
                            isActive={currentPage === pageNum}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    {/* Show last page */}
                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                        <PaginationItem>
                          <PaginationLink 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(totalPages);
                            }}
                          >
                            {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      </>
                    )}
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                        }}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
            </div>
          )}
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
                    <TableCell className="text-center">
                      <div className="truncate" title={item.product_code}>{item.product_code}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="truncate" title={item.product_name}>{item.product_name}</div>
                    </TableCell>
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
