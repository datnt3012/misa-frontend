import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDialogUrl } from '@/hooks/useDialogUrl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { NumberInput } from '@/components/ui/number-input';
import { CheckCircle, Package, FileText, Clock, Search, ChevronUp, ChevronDown, ChevronsUpDown, Truck, ArrowRight, XCircle, Download, PlusCircle, Plus, Trash2, ExternalLink, Upload, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { exportSlipsApi, type ExportSlip } from '@/api/exportSlips.api';
import { warehouseReceiptsApi, type WarehouseReceiptImportJobSnapshot, type WarehouseReceiptImportJobStatus } from '@/api/warehouseReceipts.api';
import { orderApi, type Order } from '@/api/order.api';
import { customerApi, type Customer } from '@/api/customer.api';
import { productApi } from '@/api/product.api';
import { warehouseApi } from '@/api/warehouse.api';
import { stockLevelsApi } from '@/api/stockLevels.api';
import { convertPermissionCodesInMessage } from '@/utils/permissionMessageConverter';
import { useToast } from '@/hooks/use-toast';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { AddressFormSeparate } from '@/components/common/AddressFormSeparate';
function ExportSlipsContent() {
  const navigate = useNavigate();
  const [exportSlips, setExportSlips] = useState<ExportSlip[]>([]);
  const [displayLimit, setDisplayLimit] = useState<number>(25);
  const [addressCache, setAddressCache] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<ExportSlip | null>(null);
  const [slipDetail, setSlipDetail] = useState<ExportSlip | null>(null);
  const [loadingSlipDetail, setLoadingSlipDetail] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderForAllocation, setSelectedOrderForAllocation] = useState<Order | null>(null);
  const [exportedQuantityByProduct, setExportedQuantityByProduct] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [banks, setBanks] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [loading, setLoading] = useState(false);
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
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  // Export slip form state
  const generateSlipCode = () => {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `EXP${timestamp}${random}`;
  };
  const [exportSlipForm, setExportSlipForm] = useState({
    code: generateSlipCode(),
    order_id: '',
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    contract_code: '',
    notes: '', // This will be required
    items: [] as Array<{
      product_id: string;
      product_code: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      current_stock?: number;
    }>,
    expenses: [{ name: 'Chi phí vận chuyển', amount: 0, note: '' }]
  });
  const { toast } = useToast();
  const { hasPermission, userRole } = usePermissions();
  const { openDialog, closeDialog, getDialogState } = useDialogUrl('export-slips');
  const isClosingDialogRef = useRef(false);
  const canDirectExport = hasPermission('ADMIN') || hasPermission('WAREHOUSE_ADMIN');
  const canApproveExports = hasPermission('WAREHOUSE_RECEIPTS_APPROVE');
  
  // Check if user can see "Đã xuất kho" option: Admin, Chief Accountant, Owner/Director, or has WAREHOUSE_RECEIPTS_APPROVE permission
  const canSeeExportedOption = () => {
    if (!userRole) return false;
    const roleName = userRole.name?.toLowerCase() || userRole.code?.toLowerCase() || '';
    const isAdmin = roleName.includes('admin') || roleName.includes('administrator');
    const isChiefAccountant = roleName === 'chief_accountant';
    const isOwnerDirector = roleName.includes('owner') || roleName === 'owner_director';
    const hasApprovePermission = hasPermission('WAREHOUSE_RECEIPTS_APPROVE');
    
    return isAdmin || isChiefAccountant || isOwnerDirector || hasApprovePermission;
  };
  
  // Get available status options based on current status and role
  const getAvailableStatusOptions = (currentStatus: string) => {
    const options = [];
    const canExport = canSeeExportedOption();
    
    // Show options for approved status (sau khi đã duyệt)
    if (currentStatus === 'approved') {
      options.push({ 
        value: 'picked', 
        label: 'Đã lấy hàng', 
        description: 'Xác nhận đã lấy hàng từ kho' 
      });
      // Only show "Đã xuất kho" when user has required permission
      if (canExport) {
        options.push({ 
          value: 'exported', 
          label: 'Đã xuất kho', 
          description: 'Xuất kho trực tiếp' 
        });
      }
    } else if (currentStatus === 'picked') {
      // Only show "Đã xuất kho" when user has required permission
      if (canExport) {
        options.push({ 
          value: 'exported', 
          label: 'Đã xuất kho', 
          description: 'Xác nhận hàng đã rời khỏi kho' 
        });
      }
    }
    // No options for 'pending', 'exported', 'rejected', or 'cancelled' status
    return options;
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
    fetchExportSlips();
    loadOrders();
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

  // Read URL and auto-open dialog if present
  useEffect(() => {
    if (isClosingDialogRef.current) {
      return;
    }

    const dialogState = getDialogState();
    if (dialogState.isOpen && dialogState.entityId) {
      const isDetailOpen = selectedSlip?.id === dialogState.entityId && dialogState.dialogType === 'view';
      
      if (isDetailOpen) {
        return;
      }

      const slip = exportSlips.find(s => s.id === dialogState.entityId);
      if (slip && dialogState.dialogType === 'view') {
        setSelectedSlip(slip);
        loadSlipDetail(slip.id);
      }
    } else if (dialogState.isOpen && dialogState.dialogType === 'create') {
      if (!showCreateDialog) {
        openDialog('create');
        setShowCreateDialog(true);
      }
    }
  }, [getDialogState, exportSlips, selectedSlip, showCreateDialog, closeDialog]);
  
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
  // Load data when create dialog opens and generate slip code
  useEffect(() => {
    if (showCreateDialog) {
      loadOrders();
      // Generate new slip code when opening dialog
      if (!exportSlipForm.code || exportSlipForm.code.trim() === '') {
        setExportSlipForm(prev => ({ ...prev, code: generateSlipCode() }));
      }
    }
  }, [showCreateDialog]);
  const fetchExportSlips = async () => {
    try {
      const resp = await exportSlipsApi.getSlips({ 
        page: currentPage, 
        limit: displayLimit,
        search: debouncedSearchTerm || undefined
      });
      // If order data is missing or incomplete, we'll need to fetch it separately
      // Sử dụng getOrderIncludeDeleted theo ID để không phụ thuộc vào pagination
      const slips = await Promise.all((resp.slips || []).map(async (s) => {
        let orderData = s.order;
        // Nếu thiếu order data hoặc thiếu contract_code, fetch lại từ API theo ID
        // Việc fetch theo ID đảm bảo luôn lấy được dữ liệu, không phụ thuộc vào pagination
        if (s.order_id && (!orderData || !orderData.contract_code)) {
          try {
            const orderResponse = await orderApi.getOrderIncludeDeleted(s.order_id);
            // Merge dữ liệu: ưu tiên dữ liệu mới từ API, fallback về dữ liệu cũ nếu có
            orderData = {
              order_number: orderResponse.order_number || orderData?.order_number || '',
              contract_code: orderResponse.contract_code || orderData?.contract_code || undefined,
              customer_name: orderResponse.customer_name || orderData?.customer_name || 'Không xác định',
              customer_address: orderResponse.customer_address || orderData?.customer_address || undefined,
              customer_phone: orderResponse.customer_phone || orderData?.customer_phone || undefined,
              customer_addressInfo: orderResponse.customer_addressInfo || orderResponse.addressInfo || orderData?.customer_addressInfo || undefined,
              total_amount: orderResponse.total_amount || orderData?.total_amount || 0,
              order_items: orderResponse.order_items || orderData?.order_items || undefined
            };
          } catch (error) {
            // Nếu fetch thất bại, vẫn giữ nguyên dữ liệu hiện có (nếu có)
            // Không throw error để không block việc hiển thị danh sách phiếu xuất kho
            console.warn(`Failed to fetch order details for order_id: ${s.order_id}`, error);
          }
        }
        return {
          id: s.id || '',
          code: s.code || '',
          order_id: s.order_id || '',
          warehouse_id: s.warehouse_id || undefined,
          warehouse_name: s.warehouse_name || undefined,
          status: s.status || 'pending',
          notes: s.notes || undefined,
          approval_notes: s.approval_notes || undefined,
          created_at: s.created_at || '',
          approved_at: s.approved_at || undefined,
          created_by: s.created_by || '',
          approved_by: s.approved_by || undefined,
          order: orderData ? {
            order_number: orderData.order_number || '',
            contract_code: orderData.contract_code || undefined,
            customer_name: orderData.customer_name || '',
            customer_address: orderData.customer_address || undefined,
            customer_phone: orderData.customer_phone || undefined,
            customer_addressInfo: orderData.customer_addressInfo || undefined,
            total_amount: orderData.total_amount || 0,
            order_items: orderData.order_items || undefined,
          } : undefined,
          export_slip_items: s.export_slip_items || [],
        };
      }));
      setExportSlips(slips);
      // Update pagination state
      setTotal(resp.total || 0);
      setTotalPages(Math.ceil((resp.total || 0) / displayLimit));
      // Update address cache for slips that now have addressInfo
      const newCache: Record<string, string> = {};
      for (const slip of slips) {
        if (slip.order?.customer_address && slip.order?.customer_addressInfo) {
          const fullAddress = formatFullAddress(slip.order.customer_address, slip.order.customer_addressInfo);
          newCache[slip.id] = fullAddress;
        } else if (slip.order?.customer_address) {
          // Even without addressInfo, cache the basic address
          newCache[slip.id] = slip.order.customer_address;
        }
      }
      setAddressCache(newCache);
      // No toast notification for empty export slips list
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể tải danh sách phiếu xuất kho. Vui lòng kiểm tra kết nối backend.",
        variant: "destructive",
      });
    }
  };

  // Load export slip detail by ID
  const loadSlipDetail = async (slipId: string) => {
    try {
      setLoadingSlipDetail(true);
      const detail = await exportSlipsApi.getSlip(slipId);
      
      // Nếu có order_id nhưng thiếu thông tin order hoặc thiếu contract_code, fetch thêm từ order API
      // Sử dụng getOrderIncludeDeleted theo ID để không phụ thuộc vào pagination
      if (detail.order_id && (!detail.order || !detail.order.contract_code)) {
        try {
          const orderResponse = await orderApi.getOrderIncludeDeleted(detail.order_id);
          // Merge dữ liệu: ưu tiên dữ liệu mới từ API, fallback về dữ liệu cũ nếu có
          detail.order = {
            order_number: orderResponse.order_number || detail.order?.order_number || '',
            contract_code: orderResponse.contract_code || detail.order?.contract_code || undefined,
            customer_name: orderResponse.customer_name || detail.order?.customer_name || 'Không xác định',
            customer_address: orderResponse.customer_address || detail.order?.customer_address || undefined,
            customer_phone: orderResponse.customer_phone || detail.order?.customer_phone || undefined,
            customer_addressInfo: orderResponse.customer_addressInfo || orderResponse.addressInfo || detail.order?.customer_addressInfo || undefined,
            total_amount: orderResponse.total_amount || detail.order?.total_amount || 0,
            order_items: orderResponse.order_items || detail.order?.order_items || undefined,
          };
        } catch (orderError) {
          // Nếu không fetch được order, vẫn giữ nguyên detail hiện tại
          // Không throw error để không block việc hiển thị dialog chi tiết
          console.warn(`Failed to fetch order details for order_id: ${detail.order_id}`, orderError);
        }
      }
      
      setSlipDetail(detail);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể tải chi tiết phiếu xuất kho",
        variant: "destructive",
      });
      setSlipDetail(null);
    } finally {
      setLoadingSlipDetail(false);
    }
  };

  // Approve export slip using warehouseReceiptsApi
  const approveExportSlip = async (slipId: string) => {
    try {
      await warehouseReceiptsApi.approveReceipt(slipId);
      toast({
        title: "Thành công",
        description: "Đã phê duyệt phiếu xuất kho",
      });
      fetchExportSlips();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể phê duyệt phiếu xuất kho",
        variant: "destructive",
      });
    }
  };

  // Reject export slip using warehouseReceiptsApi
  const rejectExportSlip = async (slipId: string) => {
    try {
      await warehouseReceiptsApi.rejectReceipt(slipId);
      toast({
        title: "Thành công",
        description: "Đã từ chối phiếu xuất kho",
      });
      fetchExportSlips();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể từ chối phiếu xuất kho",
        variant: "destructive",
      });
    }
  };

  // Handle status updates based on role permissions
  const handleStatusUpdate = async (slipId: string, newStatus: string, notes: string = '') => {
    try {
      let response;
      switch (newStatus) {
        case 'picked':
          response = await exportSlipsApi.markAsPicked(slipId, notes);
          break;
        case 'exported':
          response = await exportSlipsApi.markAsExported(slipId, notes);
          break;
        default:
          throw new Error('Trạng thái không hợp lệ');
      }
      toast({
        title: "Thành công",
        description: response.message || `Đã cập nhật trạng thái thành ${newStatus === 'picked' ? 'Đã lấy hàng' : 'Đã xuất kho'}`,
      });
      fetchExportSlips();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể cập nhật trạng thái",
        variant: "destructive",
      });
    }
  };
  // Direct export (Admin/Giám đốc only)
  const handleDirectExport = async (slipId: string, notes: string = '') => {
    try {
      const response = await exportSlipsApi.directExport(slipId, notes);
      toast({
        title: "Thành công",
        description: response.message || "Đã xuất kho trực tiếp",
      });
      fetchExportSlips();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể xuất kho trực tiếp",
        variant: "destructive",
      });
    }
  };
  // Handle status update with selected status
  const handleStatusUpdateWithSelection = async (slipId: string, newStatus: string, notes: string = '') => {
    try {
      let response;
      switch (newStatus) {
        case 'picked':
          response = await exportSlipsApi.markAsPicked(slipId, notes);
          break;
        case 'exported':
          response = await exportSlipsApi.markAsExported(slipId, notes);
          break;
        case 'cancelled':
          response = await exportSlipsApi.markAsCancelled(slipId, notes);
          break;
        default:
          throw new Error('Trạng thái không hợp lệ');
      }
      const statusLabels: Record<string, string> = {
        'picked': 'Đã lấy hàng',
        'exported': 'Đã xuất kho',
        'cancelled': 'Hủy lấy hàng'
      };
      toast({
        title: "Thành công",
        description: response.message || `Đã cập nhật trạng thái thành ${statusLabels[newStatus] || newStatus}`,
      });
      fetchExportSlips();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể cập nhật trạng thái",
        variant: "destructive",
      });
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-orange-600"><Clock className="w-3 h-3 mr-1" />Chờ duyệt</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Đã duyệt</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" />Đã hủy</Badge>;
      case 'picked':
        return <Badge variant="outline" className="text-blue-600"><Package className="w-3 h-3 mr-1" />Đã lấy hàng</Badge>;
      case 'exported':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Đã xuất kho</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" />Hủy lấy hàng</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0
    }).format(amount);
  };
  const formatFullAddress = (address: string, addressInfo?: any) => {
    const wardName = addressInfo?.ward?.name || addressInfo?.wardName;
    const districtName = addressInfo?.district?.name || addressInfo?.districtName;
    const provinceName = addressInfo?.province?.name || addressInfo?.provinceName;
    const parts: string[] = [];
    if (address) parts.push(address);
    if (wardName) parts.push(wardName);
    if (districtName) parts.push(districtName);
    if (provinceName) parts.push(provinceName);
    return parts.join(', ');
  };
  // Enhanced address formatting with fallback to order API
  const formatAddressWithFallback = async (slip: ExportSlip) => {
    if (slip.order?.customer_addressInfo) {
      return formatFullAddress(slip.order.customer_address || '', slip.order.customer_addressInfo);
    }
    // If no addressInfo in export slip, try to get from order API
    if (slip.order_id) {
      try {
        const orderDetails = await orderApi.getOrderIncludeDeleted(slip.order_id);
        if (orderDetails.customer_addressInfo) {
          return formatFullAddress(slip.order?.customer_address || '', orderDetails.customer_addressInfo);
        }
      } catch (error) {
      }
    }
    return slip.order?.customer_address || '';
  };
  // Permission checks removed - let backend handle authorization
  const loadOrders = async () => {
    try {
      const [ordersResp, customersResp, productsResp, warehousesResp, banksResp] = await Promise.all([
        orderApi.getOrders({
          page: 1,
          limit: 100,
          // Remove status filter to show all orders for now
        }),
        customerApi.getCustomers({ page: 1, limit: 1000 }),
        productApi.getProducts({ page: 1, limit: 1000 }),
        warehouseApi.getWarehouses({ page: 1, limit: 1000 }),
        orderApi.getBanks()
      ]);
      setOrders(ordersResp.orders || []);
      setCustomers(customersResp.customers || []);
      setProducts(productsResp.products || []);
      setWarehouses(warehousesResp.warehouses || []);
      setBanks(banksResp || []);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải dữ liệu",
        variant: "destructive",
      });
    }
  };
  // Form management functions
  const addItem = () => {
    setExportSlipForm(prev => ({
      ...prev,
      items: [...prev.items, {
        product_id: '',
        product_code: '',
        product_name: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0
      }]
    }));
  };
  const removeItem = (index: number) => {
    setExportSlipForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };
  const updateItem = (index: number, field: string, value: any) => {
    setExportSlipForm(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      // Auto-calculate when product, quantity, or unit_price changes
      if (field === 'product_id' || field === 'quantity' || field === 'unit_price') {
        if (field === 'product_id') {
          const product = products.find(p => p.id === value);
          if (product) {
            items[index].product_code = product.code;
            items[index].product_name = product.name;
            items[index].unit_price = product.price;
          }
        }
        const subtotal = items[index].quantity * items[index].unit_price;
        items[index].total_price = subtotal;
      }
      // Fetch stock level when product changes (warehouse is selected globally)
      if (field === 'product_id') {
        const productId = value;
        if (productId && selectedWarehouse) {
          fetchStockLevel(index, productId, selectedWarehouse);
        } else {
          // Clear stock if product is cleared
          items[index].current_stock = undefined;
        }
      }
      return { ...prev, items };
    });
  };
  const fetchStockLevel = async (index: number, productId: string, warehouseId: string) => {
    if (!productId || !warehouseId) return;
    try {
      const stockLevels = await stockLevelsApi.getStockLevels({
        productId,
        warehouseId,
        limit: 1
      });
      const currentStock = stockLevels.stockLevels.length > 0 ? stockLevels.stockLevels[0].quantity : 0;
      setExportSlipForm(prev => {
        const items = [...prev.items];
        items[index].current_stock = currentStock;
        return { ...prev, items };
      });
    } catch (error) {
      setExportSlipForm(prev => {
        const items = [...prev.items];
        items[index].current_stock = 0;
        return { ...prev, items };
      });
    }
  };
  
  // Fetch stock levels for all items when warehouse changes
  useEffect(() => {
    if (selectedWarehouse) {
      exportSlipForm.items.forEach((item, index) => {
        if (item.product_id) {
          void fetchStockLevel(index, item.product_id, selectedWarehouse);
        }
      });
    } else {
      // Clear stock levels when warehouse is cleared
      setExportSlipForm(prev => ({
        ...prev,
        items: prev.items.map(item => ({ ...item, current_stock: undefined }))
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWarehouse]);
  const addExpense = () => {
    setExportSlipForm(prev => ({
      ...prev,
      expenses: [...prev.expenses, { name: '', amount: 0, note: '' }]
    }));
  };
  const removeExpense = (index: number) => {
    setExportSlipForm(prev => ({
      ...prev,
      expenses: prev.expenses.filter((_, i) => i !== index)
    }));
  };
  const updateExpense = (index: number, field: 'name' | 'amount' | 'note', value: any) => {
    setExportSlipForm(prev => {
      const expenses = [...prev.expenses];
      expenses[index] = { ...expenses[index], [field]: value };
      return { ...prev, expenses };
    });
  };
  // Get available products for a specific row (excluding already selected products)
  const getAvailableProductsForRow = (currentIndex: number) => {
    const selectedProductIds = exportSlipForm.items
      .map((item, index) => index !== currentIndex ? item.product_id : null)
      .filter(id => id); // Remove nulls and current row
    return products.filter(product => !selectedProductIds.includes(product.id));
  };
  const calculateTotals = () => {
    const itemsSubtotal = exportSlipForm.items.reduce((sum, item) => sum + item.total_price, 0);
    const expensesTotal = exportSlipForm.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const subtotal = itemsSubtotal + expensesTotal;
    return { subtotal };
  };
  const createExportSlip = async () => {
    // Validate required notes field
    if (!exportSlipForm.notes || !exportSlipForm.notes.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập mô tả cho phiếu xuất kho",
        variant: "destructive",
      });
      return;
    }
    // Validate items
    if (exportSlipForm.items.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng thêm ít nhất một sản phẩm",
        variant: "destructive",
      });
      return;
    }
    // Validate warehouse is selected
    if (!selectedWarehouse) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn kho xuất hàng",
        variant: "destructive",
      });
      return;
    }
    // Validate all items have required fields
    const invalidItems = exportSlipForm.items.filter(item =>
      !item.product_id || !item.product_name || !item.product_code || !item.quantity
    );
    if (invalidItems.length > 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin sản phẩm",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      // Generate code if not provided or use provided code
      const code = exportSlipForm.code?.trim() || generateSlipCode();
      // Prepare items with warehouse_id for each item (using selected warehouse)
      const items = exportSlipForm.items.map(item => ({
        product_id: item.product_id,
        requested_quantity: item.quantity,
        unit_price: item.unit_price,
        warehouse_id: selectedWarehouse // Use the selected warehouse for all items
      }));
      const response = await exportSlipsApi.createSlip({
        order_id: exportSlipForm.order_id || undefined, // Optional order ID
        warehouse_id: selectedWarehouse, // Use selected warehouse
        supplier_id: '', // Not needed for export slips
        code: code,
        notes: exportSlipForm.notes,
        items: items
      });
      toast({
        title: "Thành công",
        description: `Đã tạo phiếu xuất kho ${response.code || code} thành công`,
      });
      isClosingDialogRef.current = true;
      closeDialog();
      setShowCreateDialog(false);
      setTimeout(() => {
        isClosingDialogRef.current = false;
      }, 100);
      setExportSlipForm({
        code: generateSlipCode(),
        order_id: '',
        customer_id: '',
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        contract_code: '',
        notes: '',
        items: [],
        expenses: [{ name: 'Chi phí vận chuyển', amount: 0, note: '' }]
      });
      setSelectedWarehouse('');
      setSelectedOrderForAllocation(null);
      setExportedQuantityByProduct({});
      fetchExportSlips();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể tạo phiếu xuất kho",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-gray-600" />
      : <ChevronDown className="w-4 h-4 text-gray-600" />;
  };
  const downloadImportTemplate = async () => {
    try {
      // Sử dụng API mới cho template phiếu xuất kho
      const { blob, filename } = await warehouseReceiptsApi.downloadExportReceiptTemplate();
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
      
      // Sử dụng async API cho import phiếu xuất kho
      const job = await warehouseReceiptsApi.importExportExcelAsync(importFile);
      
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

  // Refresh import jobs - always filter for export type only
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
      // Always filter for export type only
      const response = await warehouseReceiptsApi.listImportJobs({
        onlyActive,
        sortBy: options?.sortBy || 'createdAt',
        sortOrder: options?.sortOrder || 'DESC',
        page,
        limit,
        type: 'export' // Filter for export receipts only
      });

      const processedJobs = response.jobs;

      const isActiveCall = options?.onlyActive === true;

      if (isActiveCall) {
        // Filter jobs by type to ensure only export jobs are shown
        const filteredJobs = processedJobs.filter(job => 
          job.type === 'export' || !job.type // Include jobs without type for backward compatibility
        );
        setActiveJobs(filteredJobs);
        // Start polling if there are active jobs
        const hasActiveJobs = filteredJobs.some(job => job.status === 'queued' || job.status === 'processing');
        if (hasActiveJobs) {
          setIsPollingActive(true);
        }
      } else {
        // Filter jobs by type to ensure only export jobs are shown
        const filteredJobs = processedJobs.filter(job => 
          job.type === 'export' || !job.type // Include jobs without type for backward compatibility
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
                description: job.message || `Đã import ${job.imported ?? 0} phiếu xuất kho.`,
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
        description: job.message || `Đã import ${job.imported ?? 0} phiếu xuất kho.`,
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
    
    // Reload export slips list and job history when job completes
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      try {
        // Reload export slips list to show newly imported receipts
        await fetchExportSlips();
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
  }, [toast, fetchExportSlips, refreshImportJobs, jobHistoryPage, jobHistoryItemsPerPage]);

  // Polling function for active jobs - similar to product import
  const pollActiveJobs = useCallback(async () => {
    try {
      const response = await warehouseReceiptsApi.listImportJobs({
        onlyActive: true,
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      });

      // Use backend status directly (do not infer status from processedRows/totalRows)
      // Filter jobs by type to ensure only export jobs are shown
      const processedJobs = response.jobs.filter(job => 
        job.type === 'export' || !job.type // Include jobs without type for backward compatibility
      );

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
          limit: 10
        });
        
        // Filter jobs by type to ensure only export jobs are shown
        const filteredJobs = allJobsResponse.jobs.filter(job => 
          job.type === 'export' || !job.type // Include jobs without type for backward compatibility
        );
        
        // Find jobs that were previously active but are now completed/failed/cancelled
        filteredJobs.forEach(job => {
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

  // Refresh export slips when jobs complete
  useEffect(() => {
    const completedJobs = activeJobs.filter(job => 
      (job.status === 'completed' && job.imported > 0) ||
      (job.status === 'completed' && job.failed === 0 && job.totalRows > 0)
    );
    if (completedJobs.length > 0) {
      fetchExportSlips();
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
    (job.type === 'export' || !job.type) // Only export jobs, or jobs without type (backward compatibility)
  );
  const completedJobs = importJobs.filter(job => 
    (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') &&
    (job.type === 'export' || !job.type) // Only export jobs, or jobs without type (backward compatibility)
  );

  const exportToExcel = () => {
    // Prepare data for export
    const exportData = filteredAndSortedSlips.map((slip, index) => {
      // Get product details for each slip
      const productDetails = slip.order?.order_items?.map((item) => {
        const exportItem = slip.export_slip_items?.find(
          ei => ei.product_code === item.product_code
        );
        return {
          'Mã SP': item.product_code,
          'Tên sản phẩm': item.product_name,
          'SL Yêu cầu': item.quantity,
          'Đơn giá': item.unit_price,
          'Thành tiền': (exportItem?.actual_quantity || 0) * item.unit_price,
        };
      }) || [];
      return {
        'STT': index + 1,
        'Số phiếu': slip.code,
        'Đơn hàng': slip.order?.order_number || '',
        'Khách hàng': slip.order?.customer_name || '',
        'Địa chỉ': slip.order?.customer_address ? formatFullAddress(slip.order.customer_address, slip.order.customer_addressInfo) : '',
        'SĐT': slip.order?.customer_phone || '',
        'Trạng thái': slip.status === 'pending' ? 'Chờ' : 
                     slip.status === 'picked' ? 'Đã lấy hàng' :
                     slip.status === 'exported' ? 'Đã xuất kho' :
                     slip.status === 'cancelled' ? 'Hủy lấy hàng' : slip.status,
        'Tổng giá trị': slip.export_slip_items?.reduce((sum, item) => sum + (item.actual_quantity * item.unit_price), 0) || 0,
        'Ngày tạo': slip.created_at ? new Date(slip.created_at).toLocaleString('vi-VN') : '',
        'Chi tiết sản phẩm': productDetails.map(p => `${p['Tên sản phẩm']} (${p['SL Yêu cầu']})`).join('; '),
      };
    });
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    // Set column widths
    const colWidths = [
      { wch: 5 },   // STT
      { wch: 18 },  // Số phiếu
      { wch: 15 },  // Đơn hàng
      { wch: 25 },  // Khách hàng
      { wch: 40 },  // Địa chỉ
      { wch: 15 },  // SĐT
      { wch: 15 },  // Trạng thái
      { wch: 15 },  // Tổng giá trị
      { wch: 20 },  // Ngày tạo
      { wch: 60 },  // Chi tiết sản phẩm
    ];
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách phiếu xuất kho');
    // Generate filename with timestamp
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN').replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false }).replace(/:/g, '-');
    const filename = `Danh_sach_phieu_xuat_kho_${dateStr}_${timeStr}.xlsx`;
    // Write file
    XLSX.writeFile(wb, filename);
    toast({
      title: "Thành công",
      description: `Đã xuất ${exportData.length} phiếu xuất kho ra file Excel`,
    });
  };
  // Filter and sort export slips (client-side sorting since API doesn't support it yet)
  const filteredAndSortedSlips = exportSlips
    .sort((a, b) => {
      let aValue: any, bValue: any;
      switch (sortField) {
        case 'slip_number':
          aValue = a.code;
          bValue = b.code;
          break;
        case 'order_number':
          aValue = a.order?.order_number || '';
          bValue = b.order?.order_number || '';
          break;
        case 'contract_code':
          aValue = a.order?.contract_code || '';
          bValue = b.order?.contract_code || '';
          break;
        case 'customer_name':
          aValue = a.order?.customer_name || '';
          bValue = b.order?.customer_name || '';
          break;
        case 'total_amount':
          aValue = a.order?.total_amount || 0;
          bValue = b.order?.total_amount || 0;
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
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quản Lý Phiếu Xuất Kho</h1>
          <p className="text-muted-foreground">
            Danh sách và duyệt phiếu xuất kho hàng hóa
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (open) {
            openDialog('create');
          } else {
            isClosingDialogRef.current = true;
            closeDialog();
            setTimeout(() => {
              isClosingDialogRef.current = false;
            }, 100);
            // Reset allocation state when closing dialog
            setSelectedOrderForAllocation(null);
            setExportedQuantityByProduct({});
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              openDialog('create');
              setShowCreateDialog(true);
            }}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Tạo phiếu xuất
            </Button>
          </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Tạo phiếu xuất kho mới</DialogTitle>
                    <DialogDescription>
                      Nhập thông tin chi tiết cho phiếu xuất kho mới
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6">
                    {/* Slip Code */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Mã phiếu xuất kho</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Input
                          id="slip-code"
                          value={exportSlipForm.code}
                          onChange={(e) => setExportSlipForm(prev => ({ ...prev, code: e.target.value }))}
                          placeholder="Nhập mã phiếu xuất kho (3-20 ký tự)"
                          maxLength={20}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Mã phiếu phải từ 3-20 ký tự
                        </p>
                      </CardContent>
                    </Card>
                    {/* Order Selection (Optional) */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                          <span>Đơn hàng (không bắt buộc)</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              isClosingDialogRef.current = true;
      closeDialog();
      setShowCreateDialog(false);
      setTimeout(() => {
        isClosingDialogRef.current = false;
      }, 100);
                              navigate('/orders');
                            }}
                            className="flex items-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Tạo đơn hàng
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label htmlFor="order-select">Chọn đơn hàng</Label>
                            {exportSlipForm.order_id && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setExportSlipForm(prev => ({
                                    ...prev,
                                    order_id: '',
                                    customer_id: '',
                                    customer_name: '',
                                    customer_phone: '',
                                    customer_email: '',
                                    contract_code: '',
                                  }));
                                  setSelectedOrderForAllocation(null);
                                  setExportedQuantityByProduct({});
                                }}
                                className="h-6 px-2 text-xs"
                              >
                                Xóa lựa chọn
                              </Button>
                            )}
                          </div>
                          <Combobox
                            options={[
                              { label: "Chọn đơn hàng (tùy chọn)", value: "" },
                              ...orders.map((order) => ({
                                label: `${order.order_number} - ${order.customer_name || 'Không xác định'}`,
                                value: order.id
                              }))
                            ]}
                            value={exportSlipForm.order_id}
                            onValueChange={async (value) => {
                              // Auto-fill customer information from selected order
                              const selectedOrder = orders.find(order => order.id === value);
                              if (selectedOrder) {
                                setExportSlipForm(prev => ({
                                  ...prev,
                                  order_id: value,
                                  customer_id: selectedOrder.customer_id || selectedOrder.customer?.id || '',
                                  customer_name: selectedOrder.customer_name || selectedOrder.customer?.name || '',
                                  customer_phone: selectedOrder.customer_phone || selectedOrder.customer?.phone || '',
                                  customer_email: selectedOrder.customer_email || selectedOrder.customer?.email || '',
                                }));
                                
                                // Load full order details and calculate exported quantities
                                try {
                                  const fullOrderData = await orderApi.getOrderIncludeDeleted(value);
                                  setSelectedOrderForAllocation(fullOrderData);
                                  
                                  // Update contract_code from order
                                  setExportSlipForm(prev => ({
                                    ...prev,
                                    contract_code: fullOrderData.contract_code || ''
                                  }));
                                  
                                  // Calculate exported quantities (excluding cancelled slips)
                                  let exportedQuantityByProduct: Record<string, number> = {};
                                  try {
                                    let page = 1;
                                    const allSlips: Awaited<ReturnType<typeof exportSlipsApi.getSlips>>['slips'] = [];
                                    
                                    while (true) {
                                      const response = await exportSlipsApi.getSlips({ page, limit: 1000, orderId: value });
                                      const slipsForOrder = response.slips.filter(slip => slip.order_id === value);
                                      allSlips.push(...slipsForOrder);
                                      
                                      if (response.slips.length < 100 || page > 10) {
                                        break;
                                      }
                                      page++;
                                    }
                                    
                                    allSlips.forEach(slip => {
                                      if (slip.status === 'cancelled') {
                                        return;
                                      }
                                      
                                      if (slip.export_slip_items && Array.isArray(slip.export_slip_items)) {
                                        slip.export_slip_items.forEach(slipItem => {
                                          const productId = slipItem.product_id;
                                          if (!productId || productId.trim() === '') {
                                            return;
                                          }
                                          const current = exportedQuantityByProduct[productId] || 0;
                                          exportedQuantityByProduct[productId] = current + (slipItem.requested_quantity || 0);
                                        });
                                      }
                                    });
                                  } catch (e) {
                                    console.error("Failed to load export slips for order", e);
                                  }
                                  
                                  setExportedQuantityByProduct(exportedQuantityByProduct);
                                } catch (error: any) {
                                  console.error("Failed to load order details", error);
                                  setSelectedOrderForAllocation(null);
                                  setExportedQuantityByProduct({});
                                }
                              } else {
                                setExportSlipForm(prev => ({ ...prev, order_id: value }));
                                setSelectedOrderForAllocation(null);
                                setExportedQuantityByProduct({});
                              }
                            }}
                            placeholder="Chọn đơn hàng (tùy chọn)"
                            searchPlaceholder="Tìm đơn hàng..."
                            emptyMessage="Không có đơn hàng nào"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="contract_code">Mã hợp đồng</Label>
                            <Input
                              id="contract_code"
                              value={exportSlipForm.contract_code}
                              onChange={(e) => setExportSlipForm(prev => ({ ...prev, contract_code: e.target.value }))}
                              placeholder="Nhập mã hợp đồng"
                            />
                          </div>
                          <div>
                            <Label htmlFor="customer_id">Khách hàng</Label>
                            <Combobox
                              options={[
                                { label: "Chọn khách hàng", value: "" },
                                ...customers.map((customer) => ({
                                  label: `${customer.name} (${customer.customer_code})`,
                                  value: customer.id
                                }))
                              ]}
                              value={exportSlipForm.customer_id}
                              onValueChange={(value) => {
                                const customer = customers.find(c => c.id === value);
                                setExportSlipForm(prev => ({
                                  ...prev,
                                  customer_id: value,
                                  customer_name: customer?.name || "",
                                  customer_phone: customer?.phoneNumber || "",
                                  customer_email: customer?.email || "",
                                }));
                              }}
                              placeholder="Chọn khách hàng"
                              searchPlaceholder="Tìm khách hàng..."
                              emptyMessage="Không có khách hàng nào"
                            />
                          </div>
                          <div>
                            <Label htmlFor="customer_name">Tên khách hàng</Label>
                            <Input
                              id="customer_name"
                              value={exportSlipForm.customer_name}
                              onChange={(e) => setExportSlipForm(prev => ({ ...prev, customer_name: e.target.value }))}
                              placeholder="Nhập tên khách hàng"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="customer_phone">Số điện thoại</Label>
                            <Input
                              id="customer_phone"
                              value={exportSlipForm.customer_phone}
                              onChange={(e) => setExportSlipForm(prev => ({ ...prev, customer_phone: e.target.value }))}
                              placeholder="Nhập số điện thoại"
                            />
                          </div>
                          <div>
                            <Label htmlFor="customer_email">Email</Label>
                            <Input
                              id="customer_email"
                              type="email"
                              value={exportSlipForm.customer_email}
                              onChange={(e) => setExportSlipForm(prev => ({ ...prev, customer_email: e.target.value }))}
                              placeholder="Nhập email khách hàng"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {/* Allocation status - only show when order is selected */}
                    {selectedOrderForAllocation && (
                      <div className="p-4 sticky -top-8 z-10 bg-white -mx-6 -mt-6 mb-6 shadow-sm">
                        <h4 className="font-semibold text-gray-900 mb-3">Trạng thái phân bổ</h4>
                        <div>
                          {selectedOrderForAllocation.order_items?.map(item => {
                            const exportedQuantity = exportedQuantityByProduct[item.product_id] || 0;
                            const remainingQuantity = item.quantity - exportedQuantity;
                            
                            return (
                              <div key={item.id} className="grid grid-cols-2 gap-4 w-full bg-gray-50 p-5 rounded-md items-center">
                                <div className="">
                                  <div className="font-medium">{item.product_code} - <b>{item.product_name}</b></div>
                                </div>
                                <div className="text-right grid grid-cols-2 gap-4 justify-self-end">
                                  <div className="text-medium text-muted-foreground">{exportedQuantity}/{item.quantity}</div>
                                  {remainingQuantity > 0 ? (
                                    <Badge variant="default" className="bg-yellow-100 text-yellow-800 w-fit">
                                      Còn {remainingQuantity}
                                    </Badge>
                                  ) : (
                                    <Badge variant="default" className="bg-green-100 text-green-800 w-fit">
                                      Đủ
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Warehouse Selection */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Kho hàng <span className="text-red-500">*</span></CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Combobox
                          options={[
                            { label: "Chọn kho", value: "" },
                            ...warehouses.map((warehouse) => ({
                              label: `${warehouse.name} (${warehouse.code})`,
                              value: warehouse.id
                            }))
                          ]}
                          value={selectedWarehouse}
                          onValueChange={(value) => setSelectedWarehouse(value)}
                          placeholder="Chọn kho xuất hàng"
                          searchPlaceholder="Tìm kho..."
                          emptyMessage="Không có kho nào"
                          className="w-full"
                        />
                      </CardContent>
                    </Card>
                    {/* Products */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                          <span>Sản phẩm</span>
                          <Button onClick={addItem} size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Thêm sản phẩm
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Table className="border border-border/30 rounded-lg overflow-hidden">
                          <TableHeader>
                            <TableRow className="bg-slate-50 border-b-2 border-slate-200">
                              <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                                Sản phẩm <span className="text-red-500">*</span>
                              </TableHead>
                              <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                                Số lượng <span className="text-red-500">*</span>
                              </TableHead>
                              <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                                Đơn giá <span className="text-red-500">*</span>
                              </TableHead>
                              <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                                Thành tiền
                              </TableHead>
                              <TableHead className="font-semibold text-slate-700"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {exportSlipForm.items.map((item, index) => (
                              <TableRow
                                key={index}
                                className="border-b border-slate-100 hover:bg-slate-50/50 h-20"
                              >
                                <TableCell className="border-r border-slate-100 align-top pt-4">
                                  <div className="space-y-1">
                                    <Combobox
                                      options={getAvailableProductsForRow(index).map((product) => ({
                                        label: `${product.name} (${product.code})`,
                                        value: product.id
                                      }))}
                                      value={item.product_id}
                                      onValueChange={(value) => updateItem(index, "product_id", value)}
                                      placeholder="Chọn sản phẩm"
                                      searchPlaceholder="Tìm sản phẩm..."
                                      emptyMessage={getAvailableProductsForRow(index).length === 0 ? "Không còn sản phẩm nào để chọn" : "Không có sản phẩm nào"}
                                      className="w-[200px]"
                                    />
                                    {item.current_stock !== undefined && selectedWarehouse && (
                                      <div className="text-xs mt-1">
                                        {item.current_stock === 0 ? (
                                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                                            Hết hàng tại kho này
                                          </Badge>
                                        ) : (
                                          <span className="text-gray-600">
                                            Tồn kho: {item.current_stock}
                                          </span>
                                        )}
                                        {item.quantity > item.current_stock && item.current_stock > 0 && (
                                          <span className="text-red-500 ml-1">⚠️</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="border-r border-slate-100 align-top pt-4">
                                  <div className="space-y-1">
                                    <NumberInput
                                      value={item.quantity}
                                      onChange={(value) => updateItem(index, "quantity", value)}
                                      min={1}
                                      className="w-20"
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className="border-r border-slate-100 align-top pt-4">
                                  <CurrencyInput
                                    value={item.unit_price}
                                    onChange={(value) => updateItem(index, "unit_price", value)}
                                    className="w-32"
                                  />
                                </TableCell>
                                <TableCell className="border-r border-slate-100 align-top pt-7">
                                  {item.total_price.toLocaleString("vi-VN")}
                                </TableCell>
                                <TableCell className="align-top pt-4">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeItem(index)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                          </Table>
                      </CardContent>
                    </Card>
                    {/* Additional Expenses */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                          <span>Chi phí</span>
                          <Button onClick={addExpense} size="sm" variant="outline">
                            <Plus className="w-4 h-4 mr-2" />
                            Thêm chi phí
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {exportSlipForm.expenses.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            Chưa có chi phí nào. Nhấn <span className="font-medium">Thêm chi phí</span> để bắt đầu.
                          </div>
                        ) : (
                          <>
                            <Table className="border border-border/30 rounded-lg overflow-hidden">
                              <TableHeader>
                                <TableRow className="bg-slate-50 border-b-2 border-slate-200">
                                  <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                                    Tên chi phí
                                  </TableHead>
                                  <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                                    Số tiền
                                  </TableHead>
                                  <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                                    Ghi chú
                                  </TableHead>
                                  <TableHead className="font-semibold text-slate-700"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {exportSlipForm.expenses.map((expense, index) => (
                                  <TableRow key={index} className="border-b border-slate-100 hover:bg-slate-50/50">
                                    <TableCell className="border-r border-slate-100 align-top pt-4">
                                      <Input
                                        value={expense.name}
                                        onChange={(e) => updateExpense(index, "name", e.target.value)}
                                        placeholder="Ví dụ: Phí vận chuyển"
                                      />
                                    </TableCell>
                                    <TableCell className="border-r border-slate-100 align-top pt-4">
                                      <CurrencyInput
                                        value={expense.amount}
                                        onChange={(value) => updateExpense(index, "amount", value)}
                                        className="w-32"
                                      />
                                    </TableCell>
                                    <TableCell className="border-r border-slate-100 align-top pt-4">
                                      <Input
                                        value={expense.note || ""}
                                        onChange={(e) => updateExpense(index, "note", e.target.value)}
                                        placeholder="Ghi chú (không bắt buộc)"
                                      />
                                    </TableCell>
                                    <TableCell className="align-top pt-4">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => removeExpense(index)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            <div className="mt-3 flex justify-end">
                              <div className="text-sm font-medium">
                                Tổng chi phí:{" "}
                                <span className="font-semibold text-blue-600">
                                  {exportSlipForm.expenses
                                    .reduce((sum, exp) => sum + (exp.amount || 0), 0)
                                    .toLocaleString("vi-VN")}{" "}
                                  đ
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                    {/* Notes (Required) */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Mô tả phiếu xuất <span className="text-red-500">*</span></CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          value={exportSlipForm.notes}
                          onChange={(e) => setExportSlipForm(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Nhập mô tả chi tiết cho phiếu xuất kho"
                          rows={3}
                        />
                      </CardContent>
                    </Card>
                    {/* Summary */}
                    {(() => {
                      const { subtotal } = calculateTotals();
                      return (
                        <Card>
                          <CardHeader>
                            <CardTitle>Tổng kết</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex justify-between text-lg font-bold">
                              <span>Tổng tiền:</span>
                              <span>{subtotal.toLocaleString('vi-VN')} đ</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Hủy
                    </Button>
                    <Button onClick={createExportSlip} disabled={loading}>
                      {loading ? "Đang tạo..." : "Tạo phiếu xuất"}
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
                  <Select value={jobHistoryItemsPerPage.toString()} onValueChange={(value) => {
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
                  }}>
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="Số lượng" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                    </SelectContent>
                  </Select>
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Danh Sách Phiếu Xuất Kho
              </CardTitle>
              <CardDescription>
                Tất cả phiếu xuất kho được tạo từ đơn hàng
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {canDirectExport && (
                <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Nhập từ Excel
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Nhập Phiếu Xuất Kho Từ Excel</DialogTitle>
                      <DialogDescription>
                        Tải file Excel mẫu hoặc chọn file để nhập phiếu xuất kho
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
                        <Label htmlFor="import-file-export">Chọn file Excel</Label>
                        <Input
                          id="import-file-export"
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
        <CardContent>
          {/* Search Bar */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo số phiếu, đơn hàng hoặc khách hàng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[1200px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 select-none font-semibold text-center min-w-[120px]"
                  onClick={() => handleSort('slip_number')}
                >
                  <div className="flex items-center gap-1">
                    Số phiếu
                    {getSortIcon('slip_number')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 select-none font-semibold text-center min-w-[120px]"
                  onClick={() => handleSort('order_number')}
                >
                  <div className="flex items-center gap-1">
                    Đơn hàng
                    {getSortIcon('order_number')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 select-none font-semibold text-center min-w-[180px]"
                  onClick={() => handleSort('customer_name')}
                >
                  <div className="flex items-center gap-1">
                    Khách hàng
                    {getSortIcon('customer_name')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 select-none font-semibold text-center min-w-[130px]"
                  onClick={() => handleSort('total_amount')}
                >
                  <div className="flex items-center gap-1">
                    Giá trị
                    {getSortIcon('total_amount')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 select-none font-semibold text-center min-w-[120px]"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Trạng thái
                    {getSortIcon('status')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 select-none font-semibold text-center min-w-[150px]"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-1">
                    Ngày tạo
                    {getSortIcon('created_at')}
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-center min-w-[200px]">Ghi chú</TableHead>
                <TableHead className="font-semibold text-center min-w-[180px]">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-muted-foreground">Đang tải dữ liệu...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedSlips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    {searchTerm ? 'Không tìm thấy phiếu xuất kho nào' : 'Chưa có phiếu xuất kho nào'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedSlips.map((slip) => (
                <TableRow key={slip.id}>
                  <TableCell className="font-medium text-center min-w-[120px]">
                    <div className="truncate" title={slip.code}>{slip.code}</div>
                  </TableCell>
                  <TableCell className="text-center min-w-[120px]">
                    <div className="truncate" title={slip.order?.order_number || ''}>{slip.order?.order_number || '-'}</div>
                  </TableCell>
                  <TableCell className="text-center min-w-[180px]">
                    <div className="truncate" title={slip.order?.customer_name || ''}>{slip.order?.customer_name || '-'}</div>
                  </TableCell>
                  <TableCell className="text-center min-w-[130px] font-semibold">
                    <div className="relative group">
                      <span className="cursor-help">
                        {formatCurrency(slip.export_slip_items?.reduce((sum, item) => sum + (item.actual_quantity * item.unit_price), 0) || 0)}
                      </span>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        {formatCurrency(slip.export_slip_items?.reduce((sum, item) => sum + (item.actual_quantity * item.unit_price), 0) || 0)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center min-w-[120px]">{getStatusBadge(slip.status)}</TableCell>
                  <TableCell className="text-center min-w-[150px] text-muted-foreground text-sm">
                    {new Date(slip.created_at).toLocaleString('vi-VN')}
                  </TableCell>
                  <TableCell className="text-center min-w-[200px]">
                    <div className="truncate max-w-xs mx-auto" title={slip.notes || ''}>
                      {slip.notes || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-center min-w-[180px]">
                    <div className="flex space-x-2 justify-center">
                      {/* Chi tiết button - always show */}
                      <Dialog open={selectedSlip?.id === slip.id} onOpenChange={(open) => {
                          if (open) {
                            openDialog('view', slip.id);
                            setSelectedSlip(slip);
                            loadSlipDetail(slip.id);
                          } else {
                            isClosingDialogRef.current = true;
                            closeDialog();
                            setSelectedSlip(null);
                            setSlipDetail(null);
                            setTimeout(() => {
                              isClosingDialogRef.current = false;
                            }, 100);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <FileText className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Chi tiết phiếu xuất kho</DialogTitle>
                            <DialogDescription>
                              Thông tin chi tiết phiếu {slipDetail?.code || slip.code}
                            </DialogDescription>
                          </DialogHeader>
                          {loadingSlipDetail ? (
                            <div className="flex items-center justify-center py-8">
                              <p>Đang tải chi tiết phiếu xuất kho...</p>
                            </div>
                          ) : (
                          <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="font-medium">Số phiếu:</Label>
                                  <p className="text-sm">{slipDetail?.code || slip.code}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Số hợp đồng:</Label>
                                  <p className="text-sm">{slipDetail?.order?.contract_code || slip.order?.contract_code}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Đơn hàng:</Label>
                                  <p className="text-sm">{slipDetail?.order?.order_number || slip.order?.order_number}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Khách hàng:</Label>
                                  <p className="text-sm">{slipDetail?.order?.customer_name || slip.order?.customer_name}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Trạng thái:</Label>
                                  <div className="text-sm">{getStatusBadge(slipDetail?.status || slip.status)}</div>
                              </div>
                              {(slipDetail?.warehouse_name || slip.warehouse_name) && (
                                <div>
                                  <Label className="font-medium">Kho xuất:</Label>
                                  <p className="text-sm">{slipDetail?.warehouse_name || slip.warehouse_name}</p>
                                </div>
                              )}
                                {(slipDetail?.order?.customer_address || slip.order?.customer_address) && (
                                <div className="col-span-2">
                                  <Label className="font-medium">Địa chỉ giao hàng:</Label>
                                  <p className="text-sm">
                                    {(() => {
                                        const orderData = slipDetail?.order || slip.order;
                                        const slipId = slipDetail?.id || slip.id;
                                        if (orderData?.customer_address) {
                                          const cachedAddress = addressCache[slipId];
                                          const directAddress = formatFullAddress(orderData.customer_address, orderData.customer_addressInfo);
                                      return cachedAddress || directAddress;
                                        }
                                        return '-';
                                    })()}
                                  </p>
                                </div>
                              )}
                                {(slipDetail?.order?.customer_phone || slip.order?.customer_phone) && (
                                <div>
                                  <Label className="font-medium">Số điện thoại:</Label>
                                    <p className="text-sm">{slipDetail?.order?.customer_phone || slip.order?.customer_phone}</p>
                                </div>
                              )}
                              <div>
                                <Label className="font-medium">Tổng giá trị đơn hàng:</Label>
                                <p className="text-sm font-medium text-green-600">
                                    {formatCurrency((slipDetail?.order?.total_amount || slip.order?.total_amount) || 0)}
                                </p>
                              </div>
                              <div>
                                <Label className="font-medium">Tổng giá trị thực xuất:</Label>
                                <p className="text-sm font-medium text-blue-600">
                                    {formatCurrency((slipDetail?.export_slip_items || slip.export_slip_items)?.reduce((sum, item) => sum + (item.actual_quantity * item.unit_price), 0) || 0)}
                                </p>
                              </div>
                            </div>
                            {/* Product List */}
                              {((slipDetail?.order?.order_items && slipDetail.order.order_items.length > 0) || (slipDetail?.export_slip_items && slipDetail.export_slip_items.length > 0) || 
                                (slip.order?.order_items && slip.order.order_items.length > 0) || (slip.export_slip_items && slip.export_slip_items.length > 0)) && (
                              <div>
                                <Label className="font-medium block mb-3">
                                    {(slipDetail?.order?.order_items || slip.order?.order_items) && (slipDetail?.order?.order_items?.length || slip.order?.order_items?.length) > 0
                                    ? "Danh sách sản phẩm cần xuất:"
                                    : "Danh sách sản phẩm đã xuất:"}
                                </Label>
                                <div className="border rounded-md overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="text-center">Tên sản phẩm</TableHead>
                                        <TableHead className="text-center">Mã SP</TableHead>
                                          <TableHead className="text-center">Số lượng cần xuất</TableHead>
                                          <TableHead className="text-center">Số lượng thực xuất</TableHead>
                                        <TableHead className="text-center">Đơn giá</TableHead>
                                        <TableHead className="text-center">Thành tiền</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(() => {
                                          // Lấy export_slip_items (chỉ những item thực sự được xuất)
                                          const exportSlipItems = slipDetail?.export_slip_items || slip.export_slip_items || [];
                                          
                                          // Lấy order_items để lấy requestedQuantity
                                          const orderItems = slipDetail?.order?.order_items || slip.order?.order_items || [];
                                          
                                          // Chỉ hiển thị những item có trong export_slip_items
                                          return exportSlipItems.map((exportItem, index) => {
                                            // Tìm order_item tương ứng để lấy requestedQuantity từ đơn hàng
                                            const orderItem = orderItems.find(
                                              item => item.product_code === exportItem.product_code
                                            );
                                            
                                            // Ưu tiên lấy requestedQuantity từ order_item, nếu không có thì dùng từ exportItem
                                            const requestedQuantity = orderItem?.quantity || exportItem.requested_quantity || exportItem.actual_quantity;
                                            const actualQuantity = exportItem.actual_quantity;
                                            
                                            // Lấy thông tin sản phẩm từ order_item nếu có, nếu không thì dùng từ exportItem
                                            const productName = orderItem?.product_name || exportItem.product_name;
                                            const productCode = exportItem.product_code;
                                            const unitPrice = orderItem?.unit_price || exportItem.unit_price;
                                            
                                            return (
                                              <TableRow key={index}>
                                                <TableCell className="text-center font-medium">
                                                  <div className="truncate" title={productName}>{productName}</div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                  <div className="truncate" title={productCode}>{productCode}</div>
                                                </TableCell>
                                                <TableCell className="text-center font-medium text-green-600">{requestedQuantity}</TableCell>
                                                <TableCell className="text-center font-medium text-blue-600">{actualQuantity}</TableCell>
                                                <TableCell className="text-center">{formatCurrency(unitPrice)}</TableCell>
                                                <TableCell className="text-center font-medium">
                                                  {formatCurrency(actualQuantity * unitPrice)}
                                                </TableCell>
                                              </TableRow>
                                            );
                                          });
                                        })()}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}
                            {/* Notes */}
                            {(slipDetail?.notes || slip.notes) && (
                              <div>
                                <Label className="font-medium">Ghi chú:</Label>
                                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                                  <p className="text-sm">{slipDetail?.notes || slip.notes}</p>
                                </div>
                              </div>
                            )}
                            {(slipDetail?.approval_notes || slip.approval_notes) && (
                              <div>
                                <Label className="font-medium">Ghi chú duyệt:</Label>
                                <div className="mt-1 p-3 bg-blue-50 rounded-md">
                                  <p className="text-sm">{slipDetail?.approval_notes || slip.approval_notes}</p>
                                </div>
                              </div>
                            )}
                            {/* Documents - Temporarily disabled */}
                            <div>
                              <Label className="font-medium block mb-3">Tài liệu đính kèm:</Label>
                              <div className="text-sm text-muted-foreground">
                                Chưa có tài liệu đính kèm nào
                              </div>
                            </div>
                          </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      {/* Approval buttons - Only show when status is pending and user has permission */}
                      {canApproveExports && slip.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => approveExportSlip(slip.id)}
                            className="h-8 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 whitespace-nowrap"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Duyệt
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rejectExportSlip(slip.id)}
                            className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 whitespace-nowrap"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Từ chối
                          </Button>
                        </>
                      )}
                      {/* Status Update Dropdown - Only show when status is approved or picked */}
                      {getAvailableStatusOptions(slip.status).length > 0 && (slip.status === 'approved' || slip.status === 'picked') && (
                        <Select onValueChange={(newStatus) => {
                          handleStatusUpdateWithSelection(slip.id, newStatus, '');
                        }}>
                          <SelectTrigger className="w-40 h-8 text-xs bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200 hover:border-blue-300 focus:ring-2 focus:ring-blue-200 transition-all duration-200 shadow-sm">
                            <SelectValue placeholder="Cập nhật trạng thái" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableStatusOptions(slip.status).map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
            <div className="flex flex-col items-center mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground mb-4">
                Hiển thị {((currentPage - 1) * displayLimit) + 1} - {Math.min(currentPage * displayLimit, total)} trong tổng số {total} phiếu xuất kho
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
    </div>
  );
}
export default function ExportSlips() {
  return (
    <PermissionGuard 
      requiredPermissions={['EXPORT_SLIPS_VIEW']}
      requireAll={false}
    >
      <ExportSlipsContent />
    </PermissionGuard>
  );
}
