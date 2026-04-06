import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { useDialogUrl } from "@/hooks/useDialogUrl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToastAction } from "@/components/ui/toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Plus, Eye, Edit, Tag, DollarSign, ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal, CreditCard, Package, Banknote, Trash2, Download, FileDown, Filter, RotateCw, Loader, ShoppingCart, ShoppingBag, Shield, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { orderApi } from "@/api/order.api";
import { orderTagsApi, OrderTag as ApiOrderTag } from "@/api/orderTags.api";
import { categoriesApi } from "@/api/categories.api";
import { usersApi } from "@/api/users.api";
import { warehouseReceiptsApi } from "@/api/warehouseReceipts.api";
import { MultiplePaymentDialog } from "@/components/MultiplePaymentDialog";
import { paymentsApi } from "@/api/payments.api";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGuard } from "@/components/PermissionGuard";
import CreateOrderForm from "@/components/orders/CreateOrderForm";
import CreateWarrantyTicketForm from "@/components/orders/CreateWarrantyTicketForm";
import { PaymentDialog } from "@/components/PaymentDialog";
import { OrderViewDialog } from "@/components/orders/OrderViewDialog";
import { OrderTagsManager } from "@/components/orders/OrderTagsManager";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrderSpecificSlipCreation } from "@/components/inventory/OrderSpecificSlipCreation";
import { format, set } from "date-fns";
import { cn } from "@/lib/utils";
import CreatorDisplay from "@/components/orders/CreatorDisplay";
import { Loading } from "@/components/ui/loading";
import { getErrorMessage } from "@/lib/error-utils";
import { getOrderStatusConfig, ORDER_STATUSES, ORDER_STATUS_LABELS_VI, PURCHASE_ORDER_STATUSES, PURCHASE_ORDER_STATUS_LABELS_VI } from "@/constants/order-status.constants";
import apiClient from "@/lib/api";
import { CurrencyInput } from "@/components/ui/currency-input";
import { productApi } from "@/api/product.api";
import { MultiSelect } from "@/components/ui/multi-select";
import { string } from "yup";
// import { }

const normalizeTagLabel = (value?: string | null) => value?.toString().trim().toLowerCase() || "";
const RECONCILED_TAG_NAMES = ["đã đối soát", "reconciled"];
const PENDING_TAG_NAMES = ["chưa đối soát", "pending reconciliation"];
const tagMatchesNames = (tag: ApiOrderTag, names: string[]) => {
  const normalizedTargets = names.map(normalizeTagLabel);
  const candidates = [tag.name, tag.raw_name, tag.display_name];
  return candidates.some(candidate => normalizedTargets.includes(normalizeTagLabel(candidate)));
};
const isReconciledDisplayTag = (tag: ApiOrderTag) => tagMatchesNames(tag, RECONCILED_TAG_NAMES);
const isPendingDisplayTag = (tag: ApiOrderTag) => tagMatchesNames(tag, PENDING_TAG_NAMES);
// Helper function to get display name for tag
const getTagDisplayName = (tag: ApiOrderTag) => {
  return tag.display_name || tag.name || tag.raw_name || tag.id;
};

// Hook để đồng bộ chiều cao các item trong cùng một row
const useSyncRowHeights = (orderId: string, itemCount: number) => {
  useEffect(() => {
    if (itemCount === 0) return;

    const syncHeights = () => {
      // Tìm tất cả các row item trong cùng một order
      const rowSelector = `[data-order-id="${orderId}"] [data-item-row]`;
      const rows = document.querySelectorAll<HTMLElement>(rowSelector);
      
      if (rows.length === 0) return;

      // Nhóm các item theo index (item-row-index)
      const itemsByIndex: { [key: number]: HTMLElement[] } = {};
      
      rows.forEach((row) => {
        const index = parseInt(row.getAttribute('data-item-index') || '0');
        if (!itemsByIndex[index]) {
          itemsByIndex[index] = [];
        }
        itemsByIndex[index].push(row);
      });

      // Đồng bộ chiều cao cho mỗi nhóm
      Object.values(itemsByIndex).forEach((items) => {
        let maxHeight = 0;
        
        // Reset height để tính lại
        items.forEach((item) => {
          item.style.height = 'auto';
        });

        // Tìm chiều cao lớn nhất
        items.forEach((item) => {
          const height = item.offsetHeight;
          if (height > maxHeight) {
            maxHeight = height;
          }
        });

        // Áp dụng chiều cao lớn nhất cho tất cả
        items.forEach((item) => {
          item.style.height = `${maxHeight}px`;
        });
      });
    };

    // Sync ngay lập tức và sau khi render
    const timer = setTimeout(syncHeights, 0);
    const rafTimer = requestAnimationFrame(syncHeights);
    
    // Sync khi window resize
    window.addEventListener('resize', syncHeights);
    
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafTimer);
      window.removeEventListener('resize', syncHeights);
    };
  }, [orderId, itemCount]);
};

// Component để đồng bộ chiều cao các row
const RowHeightSync: React.FC<{ orderId: string; itemCount: number }> = ({ orderId, itemCount }) => {
  useSyncRowHeights(orderId, itemCount);
  return null;
};

const OrdersContent: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string | undefined>();
  const [endDate, setEndDate] = useState<string | undefined>();
  const [completedStartDate, setCompletedStartDate] = useState<string | undefined>();
  const [completedEndDate, setCompletedEndDate] = useState<string | undefined>();
  const [minTotalAmount, setMinTotalAmount] = useState<number | undefined>();
  const [maxTotalAmount, setMaxTotalAmount] = useState<number | undefined>();
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [creators, setCreators] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderViewDialog, setShowOrderViewDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editOrderData, setEditOrderData] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showMultiplePaymentDialog, setShowMultiplePaymentDialog] = useState(false);
  const [showTagsManager, setShowTagsManager] = useState(false);
  const [showWarrantyDialog, setShowWarrantyDialog] = useState(false);
  const [selectedOrderForWarranty, setSelectedOrderForWarranty] = useState<any>(null);
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [orderType, setOrderType] = useState<'sale' | 'purchase'>('sale');
  const [searchParams, setSearchParams] = useSearchParams();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [showExportSlipDialog, setShowExportSlipDialog] = useState(false);
  const [selectedOrderForExport, setSelectedOrderForExport] = useState<any>(null);
  // Payment warning dialog state
  const [showPaymentWarningDialog, setShowPaymentWarningDialog] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{orderId: string, status: string} | null>(null);
  const [selectedSlipType, setSelectedSlipType] = useState<string | undefined>(undefined);
  const [availableTags, setAvailableTags] = useState<ApiOrderTag[]>([]);
  const [manufacturerFilter, setManufacturerFilter] = useState("all");
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [paymentMethodFilters, setpaymentMethodFilters] = useState("all");
  const [bankFilter, setBankFilter] = useState("all");
  const [banks, setBanks] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  // Export delivery note states
  const [showExportDeliveryDialog, setShowExportDeliveryDialog] = useState(false);
  const [selectedOrderForDeliveryExport, setSelectedOrderForDeliveryExport] = useState<any>(null);
  const [exportingDeliveryPDF, setExportingDeliveryPDF] = useState(false);
  const [exportingDeliveryXLSX, setExportingDeliveryXLSX] = useState(false);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalOrders, setTotalOrders] = useState(0);
  // Cache for total payments per order
  const [orderPaymentsCache, setOrderPaymentsCache] = useState<Record<string, number>>({});
  const [loadingPayments, setLoadingPayments] = useState<Set<string>>(new Set());
  // Cache for linked slips (export/import slips) per order
  const [orderHasLinkedSlipsCache, setOrderHasLinkedSlipsCache] = useState<Record<string, boolean>>({});
  const [checkingLinkedSlips, setCheckingLinkedSlips] = useState<Set<string>>(new Set());
  // Bulk payment preview state - moved to MultiplePaymentDialog
  // Summary state from API
  const [summary, setSummary] = useState<{
    totalAmount: number;
    totalInitialPayment: number;
    totalPaidAmount?: number;
    totalDebt: number;
    totalExpenses: number;
  } | null>(null);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  // Use useCallback for search handler to prevent input focus loss during re-renders
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value.trim());
  }, []);
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { openDialog, closeDialog, getDialogState } = useDialogUrl('orders');
  const location = useLocation();
  const navigate = useNavigate();
  // Ref to track if we're currently closing a dialog to prevent reopening
  const isClosingDialogRef = useRef(false);
  const loadOrderTagsCatalog = useCallback(async () => {
    try {
      // Only load tags with type 'order'
      const tags = await orderTagsApi.getAllTags({ type: 'order' });
      setAvailableTags(tags);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể tải danh sách nhãn"),
        variant: "destructive",
      });
    }
  }, [toast]);
  // Fetch orders function
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page: currentPage, limit: itemsPerPage, includeAllocationStatus: true };
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter !== 'all') params.categories = categoryFilter;
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (minTotalAmount !== undefined) params.minTotalAmount = minTotalAmount;
      if (maxTotalAmount !== undefined) params.maxTotalAmount = maxTotalAmount;
      if (completedStartDate) params.completedStartDate = completedStartDate;
      if (completedEndDate) params.completedEndDate = completedEndDate;
      if (creatorFilter !== 'all') params.createdBy = creatorFilter;
      if (manufacturerFilter !== 'all') params.manufacturers = manufacturerFilter;
      if (paymentMethodFilters !== 'all') params.paymentMethods = paymentMethodFilters;
      if (paymentMethodFilters === 'bank_transfer' && bankFilter !== 'all') params.bank = bankFilter;
      if (orderType) params.type = orderType;

      const resp = await orderApi.getOrders(params);
      setOrders(resp.orders || []);
      setTotalOrders(resp.total || 0);
      if (resp.summary) {
        setSummary({
          totalAmount: resp.summary.totalAmount,
          totalInitialPayment: resp.summary.totalInitialPayment,
          totalPaidAmount: resp.summary.totalPaidAmount,
          totalDebt: resp.summary.totalDebt,
          totalExpenses: resp.summary.totalExpenses,
        });
      } else {
        // Fallback: calculate from orders if summary not available
        const fallbackSummary = resp.orders.reduce(
          (acc, order: any) => {
            const totalAmount = order.totalAmount ?? order.total_amount ?? 0;
            const paidAmount = order.totalPaidAmount ?? order.total_paid_amount ?? order.paid_amount ?? order.initial_payment ?? 0;
            const debtAmount = order.remainingDebt ?? order.remaining_debt ?? order.debt_amount ?? Math.max(0, totalAmount - paidAmount);
            const totalExpenses = order.totalExpenses ?? 0;
            return {
              totalAmount: acc.totalAmount + totalAmount,
              totalInitialPayment: acc.totalInitialPayment + (order.initial_payment ?? 0),
              totalPaidAmount: acc.totalPaidAmount + paidAmount,
              totalDebt: acc.totalDebt + debtAmount,
              totalExpenses: acc.totalExpenses + totalExpenses,
            };
          },
          { totalAmount: 0, totalInitialPayment: 0, totalPaidAmount: 0, totalDebt: 0, totalExpenses: 0 }
        );
        setSummary(fallbackSummary);
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể tải danh sách đơn hàng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, 
    itemsPerPage, 
    statusFilter, 
    categoryFilter, 
    debouncedSearchTerm, 
    startDate, 
    endDate, 
    completedStartDate,
    completedEndDate,
    minTotalAmount, 
    maxTotalAmount, 
    creatorFilter,
    manufacturerFilter,
    paymentMethodFilters,
    bankFilter,
    orderType,
    toast]);
    
  // Load payments for orders and cache total paid amounts
  const loadPaymentsForOrders = useCallback(async (orderIds: string[]) => {
    if (!orderIds || orderIds.length === 0) return;
    // Filter out orders we already have cached
    const uncachedOrderIds = orderIds.filter(id => !orderPaymentsCache[id] && !loadingPayments.has(id));
    if (uncachedOrderIds.length === 0) return;
    // Mark as loading
    setLoadingPayments(prev => {
      const newSet = new Set(prev);
      uncachedOrderIds.forEach(id => newSet.add(id));
      return newSet;
    });
    try {
      // Load payments for all orders in parallel
      const paymentPromises = uncachedOrderIds.map(async (orderId) => {
        try {
          const payments = await paymentsApi.getPaymentsByOrder(orderId);
          // Calculate total paid amount from payments (same logic as OrderViewDialog)
          const totalPaid = payments.length > 0
            ? payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
            : 0;
          return { orderId, totalPaid };
        } catch (error) {
          return { orderId, totalPaid: 0 };
        }
      });
      const results = await Promise.all(paymentPromises);
      // Update cache
      setOrderPaymentsCache(prev => {
        const newCache = { ...prev };
        results.forEach(({ orderId, totalPaid }) => {
          newCache[orderId] = totalPaid;
        });
        return newCache;
      });
    } catch (error) {
    } finally {
      // Remove from loading set
      setLoadingPayments(prev => {
        const newSet = new Set(prev);
        uncachedOrderIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  }, [orderPaymentsCache, loadingPayments]);

  // Check if an order has linked export or import slips with valid status
  // For export slips: status must be 'picked' or 'exported'
  // For import slips: status must be 'approved'
  const checkOrderHasLinkedSlips = useCallback(async (orderId: string) => {
    // Return cached result if already checked
    if (orderHasLinkedSlipsCache[orderId] !== undefined) {
      return orderHasLinkedSlipsCache[orderId];
    }
    // Skip if already checking
    if (checkingLinkedSlips.has(orderId)) {
      return false;
    }
    // Mark as checking
    setCheckingLinkedSlips(prev => {
      const newSet = new Set(prev);
      newSet.add(orderId);
      return newSet;
    });
    try {
      // Check for export slips with status 'picked' or 'exported'
      const exportSlipsResponse = await warehouseReceiptsApi.getReceipts({ orderId, limit: 100, type: 'export,purchase_return_note' });
      const validExportSlips = exportSlipsResponse?.receipts?.filter(
        (slip: any) => slip.status === 'picked' || slip.status === 'exported'
      ) || [];
      const hasValidExportSlips = validExportSlips.length > 0;
      
      if (hasValidExportSlips) {
        setOrderHasLinkedSlipsCache(prev => ({ ...prev, [orderId]: true }));
        return true;
      }
      
      // Check for import slips (warehouse receipts) with status 'approved'
      const importSlipsResponse = await warehouseReceiptsApi.getReceipts({ orderId, limit: 100 });
      const validImportSlips = importSlipsResponse?.receipts?.filter(
        (receipt: any) => receipt.status === 'approved'
      ) || [];
      const hasValidImportSlips = validImportSlips.length > 0;
      
      const hasLinked = hasValidExportSlips || hasValidImportSlips;
      setOrderHasLinkedSlipsCache(prev => ({ ...prev, [orderId]: hasLinked }));
      return hasLinked;
    } catch (error) {
      // On error, assume no linked slips
      setOrderHasLinkedSlipsCache(prev => ({ ...prev, [orderId]: false }));
      return false;
    } finally {
      setCheckingLinkedSlips(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  }, [orderHasLinkedSlipsCache, checkingLinkedSlips]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoriesApi.getCategories({ page: 1, limit: 1000 });
        // Filter out deleted categories
        const activeCategories = response.categories.filter(cat => cat.isActive);
        setCategories(activeCategories);
      } catch (error) {
      }
    };
    fetchCategories();
  }, []);

  // Read URL and auto-open dialog if present
  useEffect(() => {
    // Don't auto-open if we're currently closing a dialog
    if (isClosingDialogRef.current) {
      return;
    }

    const dialogState = getDialogState();
    if (dialogState.isOpen && dialogState.entityId) {
      // Prevent opening if dialog is already open for the same order
      const isViewOpen = showOrderViewDialog && selectedOrder?.id === dialogState.entityId && dialogState.dialogType === 'view';
      
      if (isViewOpen) {
        return; // Already open, don't reopen
      }

      // Find the order by ID
      const order = orders.find(o => o.id === dialogState.entityId);
      if (order) {
        setSelectedOrder(order);
        if (dialogState.dialogType === 'view') {
          setShowOrderViewDialog(true);
        }
      } else if (orders.length > 0) {
        // Orders loaded but this one not found, try to fetch it
        orderApi.getOrder(dialogState.entityId)
          .then(order => {
            setSelectedOrder(order);
            if (dialogState.dialogType === 'view') {
              setShowOrderViewDialog(true);
            }
          })
          .catch(() => {
            // Order not found, close dialog
            closeDialog();
          });
      }
      // If orders not loaded yet, wait for them to load
    }
  }, [getDialogState, orders, showOrderViewDialog, selectedOrder, closeDialog]);

  // Handle creating export slip
  const handleCreateExportSlip = (order: any, slipType?: string) => {
    setSelectedOrderForExport(order);
    setSelectedSlipType(slipType);
    setShowExportSlipDialog(true);
  };

  // Handle checkbox selection
  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(order => order.id));
    }
  };

  // Handle delete orders
  const handleDeleteOrders = async () => {
    if (selectedOrders.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn đơn hàng cần xóa",
        variant: "destructive",
      });
      return;
    }
    try {
      setLoading(true);
      const deletePromises = selectedOrders.map(orderId =>
        orderApi.deleteOrder(orderId)
      );
      const responses = await Promise.all(deletePromises);
      toast({
        title: "Thành công",
        description: `Đã xóa ${selectedOrders.length} đơn hàng`,
      });
      setSelectedOrders([]);
      setShowDeleteDialog(false);
      fetchOrders();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể xóa đơn hàng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle delete single order
  const handleDeleteSingleOrder = async () => {
    if (!orderToDelete) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy đơn hàng cần xóa",
        variant: "destructive",
      });
      return;
    }
    try {
      setLoading(true);
      const response = await orderApi.deleteOrder(orderToDelete.id);
      toast({
        title: "Thành công",
        description: response.message || `Đã xóa đơn hàng ${orderToDelete.order_number}`,
      });
      setOrderToDelete(null);
      setShowDeleteDialog(false);
      fetchOrders();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể xóa đơn hàng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Scroll to top when component mounts or route changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Fetch when pagination or filters change
  useEffect(() => {
    fetchOrders();
  }, [currentPage, 
    itemsPerPage, 
    statusFilter, 
    categoryFilter, 
    debouncedSearchTerm, 
    startDate, 
    endDate, 
    completedStartDate, 
    completedEndDate,
    minTotalAmount,
    maxTotalAmount, 
    creatorFilter,
    manufacturerFilter,
    paymentMethodFilters,
    bankFilter,
    orderType,
  ]);

  useEffect(() => {
    loadOrderTagsCatalog();
  }, [loadOrderTagsCatalog]);

  // Fetch creators for filter
  const fetchCreators = async () => {
    try {
      const usersResp = await usersApi.getUsers({ page: 1, limit: 1000 });
      setCreators(usersResp.users || []);
    } catch (error) {
      console.error('Error fetching creators:', error);
      setCreators([]);
    }
  };

  useEffect(() => {
    fetchCreators();
    fetchManufacturers();
    fetchBanks();
  }, []);

  // Check for linked slips when orders are loaded
  useEffect(() => {
    if (!orders || orders.length === 0) return;
    
    // Check each order that hasn't been checked yet
    orders.forEach(order => {
      if (order.id && orderHasLinkedSlipsCache[order.id] === undefined && !checkingLinkedSlips.has(order.id)) {
        checkOrderHasLinkedSlips(order.id);
      }
    });
  }, [orders, orderHasLinkedSlipsCache, checkingLinkedSlips, checkOrderHasLinkedSlips]);

  const fetchManufacturers = async () => {
    try {
      const data = await productApi.getManufacturers();
      setManufacturers(data || []);
    } catch (error) {
      console.error('Error fetching manufacturers:', error);
      setManufacturers([]);
    }
  };

  const fetchBanks = async () => {
    try {
      const data = await orderApi.getBanks();
      setBanks(data || []);
    } catch (error) {
      console.error('Error fetching banks:', error);
      setBanks([]);
    }
  };
  
  const formatCurrency = (amount: number | string | undefined | null) => {
    const numAmount = Number(amount) || 0;
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0
    }).format(numAmount);
  };
  // Format VND without currency symbol for per-item unit prices
  const formatVndNoSymbol = (amount: number | string | undefined | null) => {
    const numAmount = Number(amount) || 0;
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0
    }).format(numAmount);
  };
  // Mask phone number - hide 4 middle digits
  const maskPhoneNumber = (phone: string) => {
    if (!phone || phone.length < 8) return phone;
    const start = phone.slice(0, 3);
    const end = phone.slice(-3);
    const middle = '*'.repeat(4);
    return `${start}${middle}${end}`;
  };
  // Format address to show only district - city
  const formatAddress = (address: string) => {
    if (!address) return "";
    // Extract district/province from address string
    const parts = address.split(',').map(part => part.trim());
    if (parts.length >= 2) {
      return `${parts[parts.length - 2]} - ${parts[parts.length - 1]}`;
    }
    return address;
  };
  const mapOrderTags = useCallback((tagNames?: string[]): ApiOrderTag[] => {
    if (!Array.isArray(tagNames)) return [];
    return tagNames
      .map((tagName) => {
        if (!tagName) return null;
        // Check if tagName looks like a UUID (ID format)
        // UUID format: 8-4-4-4-12 hex characters
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tagName);
        // If it's a UUID, prioritize finding by ID (API returns IDs in order.tags)
        if (isUUID) {
          const matchedById = availableTags.find((tag) => tag.id === tagName);
          if (matchedById) {
            return matchedById;
          }
          // If not found by ID, create a fallback tag with the UUID as ID
          // This will be resolved later in OrderTagsManager when allTags is loaded
          return {
            id: tagName,
            name: tagName, // Temporary, will be resolved later
            display_name: tagName,
            raw_name: tagName,
            color: "#94a3b8",
          } as ApiOrderTag;
        }
        // If not a UUID, try to find by name/display_name/raw_name
        const matchedByName = availableTags.find((tag) =>
          tagMatchesNames(tag, [tagName])
        );
        if (matchedByName) {
          return matchedByName;
        }
        // Fallback: create a tag with prefix
        const fallbackId = `tag_${normalizeTagLabel(tagName) || Date.now().toString()}`;
        return {
          id: fallbackId,
          name: tagName,
          display_name: tagName,
          raw_name: tagName,
          color: "#94a3b8",
        } as ApiOrderTag;
      })
      .filter((tag): tag is ApiOrderTag => Boolean(tag));
  }, [availableTags]);
  // Handle quick note update
  const handleQuickNote = async (orderId: string, note: string) => {
    try {
      await orderApi.updateOrder(orderId, { note: note });
      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, notes: note } : order
      ));
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể cập nhật ghi chú",
        variant: "destructive",
      });
    }
  };
  // Handle order status update (requires ORDERS_UPDATE_STATUS permission)
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      // Check permission first
      if (!hasPermission('ORDERS_UPDATE_STATUS')) {
        toast({
          title: "Không có quyền",
          description: "Bạn không có quyền cập nhật trạng thái đơn hàng",
          variant: "destructive",
        });
        return;
      }
      
      // Check if trying to cancel an order with payments
      if (newStatus === 'cancelled') {
        const order = orders.find(o => o.id === orderId);
        const paidAmount = orderPaymentsCache[orderId] || 
          order?.paid_amount || 
          order?.initial_payment || 
          order?.total_paid_amount ||
          0;
        
        if (paidAmount > 0) {
          // Show warning dialog
          setPendingStatusUpdate({ orderId, status: newStatus });
          setShowPaymentWarningDialog(true);
          return;
        }
      }
      
      // Proceed with status update
      const response = await orderApi.updateOrderStatus(orderId, newStatus);
      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      toast({
        title: "Thành công",
        description: "Đã cập nhật trạng thái đơn hàng",
      });
    } catch (error: any) {
      // Extract error details if available
      const errorDetails = error.response?.data?.details;
      const warehouseReceipts = errorDetails?.warehouseReceipts || {};
      const exportCodes = warehouseReceipts?.export || [];
      const returnCodes = warehouseReceipts?.sale_return_note || [];
      const orderType = errorDetails?.orderType || 'sale';
      
      // Create navigation actions for export and return slips - open in new tab
      let toastAction: React.ReactNode = undefined;
      
      // For export slips (DO) - navigate to exports tab in new window
      const exportSearchQuery = exportCodes.join(',');
      const exportAction = exportCodes.length > 0 ? (
        <ToastAction 
          altText="Xem phiếu xuất" 
          onClick={() => window.open(`/export-import?tab=exports&search=${encodeURIComponent(exportSearchQuery)}`, '_blank')}
        >
          Phiếu xuất ({exportCodes.length})
        </ToastAction>
      ) : null;
      
      // For return slips (SRN) - navigate to imports tab in new window
      const returnSearchQuery = returnCodes.join(',');
      const returnAction = returnCodes.length > 0 ? (
        <ToastAction 
          altText="Xem phiếu hoàn" 
          onClick={() => window.open(`/export-import?tab=imports&search=${encodeURIComponent(returnSearchQuery)}`, '_blank')}
        >
          Phiếu hoàn ({returnCodes.length})
        </ToastAction>
      ) : null;
      
      // Combine actions if both exist - wrap in flex container for side by side
      if (exportAction && returnAction) {
        toastAction = (
          <div className="flex flex-row gap-2 w-full">
            {exportAction}
            {returnAction}
          </div>
        );
      } else if (exportAction) {
        toastAction = exportAction;
      } else if (returnAction) {
        toastAction = returnAction;
      }
      
      // Use stacked layout when there are actions
      const toastOptions: any = {
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể cập nhật trạng thái",
        variant: "destructive",
        action: toastAction,
      };
      
      // Add layout="stacked" if there are actions
      if (toastAction) {
        (toastOptions as any).layout = "stacked";
      }
      
      toast(toastOptions);
    }
  };

  const getFilenameFromContentDisposition = (cd?: string) => {
    if (!cd) return null;
  
    // Ưu tiên filename* (RFC 5987)
    const utf8Match = cd.match(/filename\*\=UTF-8''([^;]+)/i);
    if (utf8Match) {
      return decodeURIComponent(utf8Match[1]);
    }
  
    // Fallback filename="..."
    const asciiMatch = cd.match(/filename="([^"]+)"/i);
    if (asciiMatch) {
      return asciiMatch[1];
    }
  
    return null;
  }

  // Export delivery note to PDF
  const exportDeliveryNoteToPDF = async (order: any) => {
    try {
      setExportingDeliveryPDF(true);
      const url = `/orders/${order.id}/export?type=pdf`;
      const response = await apiClient.get(url, {
        responseType: 'blob',
      });
      const blob = response.data;
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const contentDisposition = response.headers['content-disposition'];
      let filename = `delivery_note_${order.order_number}.pdf`;
      const parsedFilename = getFilenameFromContentDisposition(contentDisposition);
      if (parsedFilename) {
        filename = parsedFilename;
      }
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      toast({
        title: "Thành công",
        description: `Đã xuất biên bản giao hàng ${order.order_number} ra file PDF`,
      });
      setShowExportDeliveryDialog(false);
    } catch (error: any) {
      let errorMessage = "Không thể xuất file PDF";
      if (error?.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          errorMessage = json.message || json.error || errorMessage;
        } catch {
          errorMessage = `Lỗi từ server: ${error.response.status} ${error.response.statusText}`;
        }
      }
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setExportingDeliveryPDF(false);
    }
  };
  // Export delivery note to XLSX
  const exportDeliveryNoteToXLSX = async (order: any) => {
    try {
      setExportingDeliveryXLSX(true);

      const url = `/orders/${order.id}/export?type=xlsx`;
      const response = await apiClient.get(url, {
        responseType: 'blob',
      });

      const blob = response.data;
      const downloadUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;

      const cd = response.headers['content-disposition'];
      const parsedFilename = getFilenameFromContentDisposition(cd);

      const filename =
        parsedFilename ?? `delivery_note_${order.order_number}.xlsx`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Thành công",
        description: `Đã xuất biên bản giao hàng ${order.order_number} ra file Excel`,
      });

      setShowExportDeliveryDialog(false);
    } catch (error: any) {
      let errorMessage = "Không thể xuất file Excel";

      if (error?.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          errorMessage = json.message || json.error || errorMessage;
        } catch {
          errorMessage = `Lỗi từ server: ${error.response.status} ${error.response.statusText}`;
        }
      }

      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setExportingDeliveryXLSX(false);
    }
  };
  // Handle sort icon click
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter([]);
    setCategoryFilter("all");
    setStartDate(undefined);
    setEndDate(undefined);
    setMinTotalAmount(undefined);
    setMaxTotalAmount(undefined);
    setCompletedStartDate(undefined);
    setCompletedEndDate(undefined);
    setCreatorFilter("all");
    setFiltersCollapsed(false);
    setpaymentMethodFilters("all");
    setBankFilter("all");
    setManufacturerFilter("all");
    setCurrentPage(1);
  };
  const handleMultiplePayments = () => {
    if (selectedOrders.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ít nhất một đơn hàng",
        variant: "destructive",
      });
      return;
    }
    setShowMultiplePaymentDialog(true);
  }
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4" />;
    }
    return sortDirection === "asc" ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };
  const getStatusBadge = (status: string, isPurchaseOrder: boolean = false) => {
    const config = getOrderStatusConfig(status, isPurchaseOrder);
    // Thu nhỏ chữ cho status "delivery_failed" vì label quá dài
    const isLongLabel = status === 'delivery_failed' || status === 'Giao hàng thất bại' || status === 'partially_imported' || status === 'Đã nhập kho một phần';
    const className = cn(
      config.className,
      isLongLabel ? 'text-[10px] px-1.5 py-0.5' : ''
    );
    return (
      <Badge 
        variant={config.variant} 
        className={className}
      >
        {config.label}
      </Badge>
    );
  };
  // Use summary from API if available, otherwise calculate from orders
  // Prefer backend aggregated fields (totalAmount, totalPaidAmount, remainingDebt)
  const totals = summary ? {
    totalAmount: summary.totalAmount,
    paidAmount: summary.totalPaidAmount || summary.totalInitialPayment, // Use totalPaidAmount if available
    debtAmount: summary.totalDebt,
    totalExpenses: summary.totalExpenses || 0,
  } : orders.reduce(
    (acc, order: any) => {
      const totalAmount = order.totalAmount ?? order.total_amount ?? 0;
      const paidAmount =
        order.totalPaidAmount ??
        order.total_paid_amount ??
        order.paid_amount ??
        order.initial_payment ??
        0;
      const debtAmount =
        order.remainingDebt ??
        order.remaining_debt ??
        order.debt_amount ??
        Math.max(0, totalAmount - paidAmount);
      const totalExpenses = order.totalExpenses ?? 0;
      return {
        totalAmount: acc.totalAmount + totalAmount,
        paidAmount: acc.paidAmount + paidAmount,
        debtAmount: acc.debtAmount + debtAmount,
        totalExpenses: acc.totalExpenses + totalExpenses,
      };
    },
    { totalAmount: 0, paidAmount: 0, debtAmount: 0, totalExpenses: 0 }
  );
  // Show loading if loading
  // Don't return early - show inline loading to preserve input focus
  const isInitialLoading = loading && orders.length === 0;
  
  // Handle confirmed payment warning - proceed with status update
  const handleConfirmedStatusUpdate = async () => {
    if (pendingStatusUpdate) {
      setShowPaymentWarningDialog(false);
      try {
        const { orderId, status } = pendingStatusUpdate;
        const response = await orderApi.updateOrderStatus(orderId, status);
        setOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, status: status } : order
        ));
        toast({
          title: "Thành công",
          description: "Đã cập nhật trạng thái đơn hàng",
        });
      } catch (error: any) {
        // Handle error - same as in handleUpdateOrderStatus
        const errorDetails = error.response?.data?.details;
        const warehouseReceipts = errorDetails?.warehouseReceipts || {};
        const exportCodes = warehouseReceipts?.export || [];
        const returnCodes = warehouseReceipts?.sale_return_note || [];
        
        let toastAction: React.ReactNode = undefined;
        const exportSearchQuery = exportCodes.join(',');
        const exportAction = exportCodes.length > 0 ? (
          <ToastAction 
            altText="Xem phiếu xuất" 
            onClick={() => window.open(`/export-import?tab=exports&search=${encodeURIComponent(exportSearchQuery)}`, '_blank')}
          >
            Phiếu xuất ({exportCodes.length})
          </ToastAction>
        ) : null;
        
        const returnSearchQuery = returnCodes.join(',');
        const returnAction = returnCodes.length > 0 ? (
          <ToastAction 
            altText="Xem phiếu hoàn" 
            onClick={() => window.open(`/export-import?tab=imports&search=${encodeURIComponent(returnSearchQuery)}`, '_blank')}
          >
            Phiếu hoàn ({returnCodes.length})
          </ToastAction>
        ) : null;
        
        if (exportAction && returnAction) {
          toastAction = (
            <div className="flex flex-row gap-2 w-full">
              {exportAction}
              {returnAction}
            </div>
          );
        } else if (exportAction) {
          toastAction = exportAction;
        } else if (returnAction) {
          toastAction = returnAction;
        }
        
        const toastOptions: any = {
          title: "Lỗi",
          description: error.response?.data?.message || error.message || "Không thể cập nhật trạng thái",
          variant: "destructive",
          action: toastAction,
        };
        
        if (toastAction) {
          (toastOptions as any).layout = "stacked";
        }
        
        toast(toastOptions);
      } finally {
        setPendingStatusUpdate(null);
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-background p-6 sm:p-6 md:p-7">
      {/* Payment Warning Dialog */}
      <AlertDialog open={showPaymentWarningDialog} onOpenChange={setShowPaymentWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cảnh báo thanh toán</AlertDialogTitle>
            <AlertDialogDescription>
              Đơn hàng này đã có thanh toán liên kết. Nếu hủy đơn, bạn cần hoàn tiền cho khách hàng. Bạn có chắc chắn muốn hủy đơn hàng không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingStatusUpdate(null)}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedStatusUpdate}>Tiếp tục hủy</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="w-full mx-auto space-y-3 sm:space-y-4">
      {/* Filters */}
      <Card>
        {/* Search Box */}
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search  className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
                <Input
                  placeholder="Nhập từ khoá tìm kiếm..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-64 pl-8"
                />
              </div>
            </div>
            {/* Status Filter */}
            <MultiSelect
              className="w-60"
              options={(orderType === 'purchase' ? PURCHASE_ORDER_STATUSES : ORDER_STATUSES).map((status) => ({
                value: status,
                label: orderType === 'purchase' ? PURCHASE_ORDER_STATUS_LABELS_VI[status as keyof typeof PURCHASE_ORDER_STATUS_LABELS_VI] : ORDER_STATUS_LABELS_VI[status as keyof typeof ORDER_STATUS_LABELS_VI]
              }))}
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder="Tất cả trạng thái"
              selectAllLabel="Chọn tất cả"
            />
            {/* Creator Filter */}
            <Combobox
              options={[
                { label: "Tất cả người tạo", value: "all" },
                ...creators.map((creator) => {
                  const fullName = `${creator.firstName || ''} ${creator.lastName || ''}`.trim();
                  const displayName = fullName || creator.email || creator.username || 'Không xác định';
                  return {
                    label: displayName,
                    value: creator.id
                  };
                })
              ]}
              value={creatorFilter}
              onValueChange={setCreatorFilter}
              placeholder="Người tạo đơn"
              searchPlaceholder="Tìm người tạo..."
              emptyMessage="Không có người tạo nào"
              className="w-48"
              multiple={true}
            />
            {/* Collapse Filter Button */}
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => setFiltersCollapsed(!filtersCollapsed)}
            >
              <Filter className="w-4 h-4" />
              {filtersCollapsed ? "Thu gọn" : "Mở rộng"}
              {filtersCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            {/* Reset Filters Button */}
            <Button
              onClick={handleResetFilters}
              variant="outline"
              disabled={loading}
            >
              {!loading ? (<RotateCw className="h-4 w-4" />) : (<Loader className="h-4 w-4" />)}
            </Button>
            <div className="flex ml-auto items-center">
              <Button
                onClick={() => {
                  openDialog('create');
                  setShowCreateDialog(true);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                THÊM MỚI
              </Button>
            </div>
          </div>
          {/* Collapsible Filters Row */}
          {filtersCollapsed && (
            <div className="grid grid-cols-3 gap-3 gap-y-6 justify-items-center items-center mt-4">
              {/* Created Date Filters */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Ngày tạo:</label>
                <Input
                  type="date"
                  className="w-40"
                  value={startDate || ""}
                  onChange={(e) => setStartDate(e.target.value || undefined)}
                />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">-</label>
                  <Input
                    type="date"
                    className="w-40"
                    value={endDate || ""}
                    onChange={(e) => setEndDate(e.target.value || undefined)}
                  />
                </div>
              </div>
              {/*Completed Date Filters */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Ngày hoàn thành:</label>
                <Input
                  type="date"
                  className="w-40"
                  value={completedStartDate || ""}
                  onChange={(e) => setCompletedStartDate(e.target.value || undefined)}
                />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">-</label>
                  <Input
                    type="date"
                    className="w-40"
                    value={completedEndDate || ""}
                    onChange={(e) => setCompletedEndDate(e.target.value || undefined)}
                  />
                </div>
              </div>
              {/* Amount Filters */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Tổng tiền:</label>
                <CurrencyInput
                  className="w-40"
                  value={minTotalAmount || ""}
                  onChange={(value) => setMinTotalAmount(value || undefined)}
                />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">-</label>
                  <CurrencyInput
                    className="w-40"
                    value={maxTotalAmount || ""}
                    onChange={(value) => setMaxTotalAmount(value || undefined)}
                  />
                </div>
              </div>
              {/* Payment Method Filter */}
              <div className="flex items-center gap-2">
                <Combobox
                  options={[
                    { label: "Tất cả phương thức thanh toán", value: "all" },
                    ...[
                      {id: 'cash', name: 'Tiền mặt'},
                      {id: 'credit_card', name: 'Thẻ tín dụng'},
                      {id: 'bank_transfer', name: 'Chuyển khoản'}
                    ].map((pm) => ({
                      label: pm.name,
                      value: pm.id
                    }))
                  ]}
                  value={paymentMethodFilters}
                  onValueChange={(value) => {
                    setpaymentMethodFilters(value as string);
                    // Reset bank filter when payment method changes
                    if (typeof value === 'string' && value !== 'bank_transfer' && !value.includes('bank_transfer')) {
                      setBankFilter('all');
                    }
                  }}
                  placeholder="Tất cả cách phương thức thanh toán"
                  searchPlaceholder="Tìm..."
                  emptyMessage="Không có phương thức nào"
                  className="w-40"
                  multiple={true}
                />
                {/* Bank Filter - Only show when payment method is bank_transfer */}
                {(paymentMethodFilters === 'bank_transfer' || paymentMethodFilters.includes('bank_transfer')) && (
                  <Combobox
                    options={[
                      { label: "Tất cả ngân hàng", value: "all" },
                      ...banks.map((bank) => ({
                        label: bank.name,
                        value: bank.code
                      }))
                    ]}
                    value={bankFilter}
                    onValueChange={setBankFilter}
                    placeholder="Ngân hàng"
                    searchPlaceholder="Tìm..."
                    emptyMessage="Không có NH"
                    className="w-40"
                    multiple={true}
                  />
                )}
              </div>
              {/* Category Filter */}
              <Combobox
                options={[
                  { label: "Tất cả loại sản phẩm", value: "all" },
                  ...categories.map((category) => ({
                    label: category.name,
                    value: category.id
                  }))
                ]}
                value={categoryFilter}
                onValueChange={setCategoryFilter}
                placeholder="Loại sản phẩm"
                searchPlaceholder="Tìm..."
                emptyMessage="Không có loại"
                className="w-40"
                multiple={true}
              />
              {/* Manifacturers Filter */}
              <Combobox
                options={[
                  { label: "Tất cả nhà sản xuất", value: "all" },
                  ...manufacturers.map((m) => ({
                    label: m,
                    value: m
                  }))
                ]}
                value={manufacturerFilter}
                onValueChange={setManufacturerFilter}
                placeholder="Nhà sản xuất"
                searchPlaceholder="Tìm nhà sản xuất..."
                emptyMessage="Không có nhà sản xuất nào"
                className="w-60"
                multiple={true}
              />
            </div>
          )}
        </CardContent>
      </Card>
      {/* Summary Row */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <div className="text-sm text-muted-foreground">Đơn hàng</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(totals.totalAmount)}</div>
              <div className="text-sm text-muted-foreground">Tổng tiền</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.paidAmount)}</div>
              <div className="text-sm text-muted-foreground">{orderType === 'sale' ? 'Đã trả' : 'Đã chi'}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totals.debtAmount)}</div>
              <div className="text-sm text-muted-foreground">{orderType === 'sale' ? 'Còn nợ' : 'Còn phải trả'}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(totals.totalExpenses)}</div>
              <div className="text-sm text-muted-foreground">Tổng chi phí</div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Order Type Tabs */}
      <Tabs value={orderType} onValueChange={(value) => setOrderType(value as 'sale' | 'purchase')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sale" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Bán hàng
          </TabsTrigger>
          <TabsTrigger value="purchase" className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Mua hàng
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {/* Action Bar */}
      {selectedOrders.length > 0 && (
        <Card className="shadow-sm border bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-700">
                  Đã chọn {selectedOrders.length} đơn hàng
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                    onClick={() => handleMultiplePayments()}
                    size="sm"
                    className="bg-blue-500 text-white hover:bg-blue-400 transition-colors duration-200"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Thanh toán gộp
                </Button>
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  variant="destructive"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Xóa
                </Button>
                <Button
                  onClick={() => setSelectedOrders([])}
                  variant="outline"
                  size="sm"
                >
                  Bỏ chọn
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Orders Table */}
      <Card className="shadow-sm border">
        <CardContent className="p-0">
          <div 
            className="overflow-x-scroll overflow-y-auto max-h-[calc(100vh-400px)]" 
            style={{ scrollbarGutter: 'stable' }}
          >
            <div className="table-wrapper" style={{ display: 'inline-block', minWidth: '100%' }}>
              <Table className="min-w-full text-xs sm:text-sm">
              <TableHeader className="sticky top-0 z-10 bg-slate-50/50">
                <TableRow className="border-b bg-slate-50/50">
                  <TableHead className="w-10 sm:w-12 py-1 sm:py-2 border-r border-slate-200">
                    <input 
                      type="checkbox" 
                      className="rounded" 
                      checked={selectedOrders.length === orders.length && orders.length > 0}
                      onChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100/50 py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 min-w-[96px] sm:min-w-[110px] text-center" 
                    onClick={() => handleSort("order_number")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      ID
                      {getSortIcon("order_number")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100/50 py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 min-w-[120px] sm:min-w-[140px] text-center" 
                    onClick={() => handleSort("customer_name")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {orderType === 'purchase' ? 'Nhà cung cấp': 'Khách hàng'}
                      {getSortIcon("customer_name")}
                    </div>
                  </TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[80px] sm:min-w-[90px]">Sản phẩm</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[80px] sm:min-w-[90px]">Hãng sản xuất</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[80px] sm:min-w-[90px]">Giá</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[64px] sm:min-w-[70px]">Số lượng</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[80px] sm:min-w-[90px]">Thuế suất</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[96px] sm:min-w-[110px]">Chi phí</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[96px] sm:min-w-[110px]">Tổng giá trị chưa có thuế GTGT</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[96px] sm:min-w-[110px]">Tổng tiền thuế GTGT</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[96px] sm:min-w-[110px]">Tổng giá trị có thuế GTGT</TableHead>
                    <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[96px] sm:min-w-[110px]">Thanh toán</TableHead>
                    <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[96px] sm:min-w-[110px]">Số hợp đồng</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 min-w-[112px] sm:min-w-[130px] text-center">Ghi chú</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 min-w-[100px] sm:min-w-[110px] text-center">Người tạo đơn</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 min-w-[112px] sm:min-w-[130px] text-center">Ngày hoàn thành</TableHead>
                  <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 min-w-[88px] sm:min-w-[104px] text-center whitespace-nowrap">Trạng thái</TableHead>
                  <TableHead className="text-center py-1 sm:py-2 font-medium text-slate-700 min-w-[80px] sm:min-w-[90px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-6">
                      Đang tải...
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-6">
                      Không có đơn hàng nào
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => {
                    const tags = mapOrderTags(order.tags || []);
                    const specialTags = tags.filter((tag) => isReconciledDisplayTag(tag) || isPendingDisplayTag(tag));
                    const otherTags = tags.filter((tag) => !specialTags.includes(tag));
                    const hasReconciliation = specialTags.some((tag) => isReconciledDisplayTag(tag));
                    return (
                      <TableRow key={order.id} className="hover:bg-slate-50/50 border-b border-slate-100" data-order-id={order.id}>
                        <RowHeightSync orderId={order.id} itemCount={order.items?.length || 0} />
                        <TableCell className="py-3 border-r border-slate-200">
                          <input 
                            type="checkbox" 
                            className="rounded" 
                            checked={selectedOrders.includes(order.id)}
                            onChange={() => handleSelectOrder(order.id)}
                          />
                        </TableCell>
                         {/* ID Column */}
                         <TableCell className="py-3 border-r border-slate-200">
                           <div className="space-y-2 whitespace-nowrap text-center">
                             <div className="font-mono text-sm font-medium text-blue-600">
                               {order.order_number}
                             </div>
                             <div className="text-xs text-muted-foreground">
                               {order.created_at ? format(new Date(order.created_at), 'dd/MM/yyyy HH:mm') : 'N/A'}
                             </div>
                             <div className="flex gap-1 flex-wrap justify-center">
                               {specialTags.length > 0 ? (
                                 specialTags.map((tag: any, idx: number) => (
                                   <Badge
                                     key={idx}
                                     variant={tag.name === 'Đã đối soát' ? 'default' : 'secondary'}
                                     className={cn(
                                       'text-xs',
                                       tag.name === 'Đã đối soát'
                                         ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                                         : 'bg-red-100 text-red-800 hover:bg-red-100'
                                     )}
                                   >
                                     {getTagDisplayName(tag)}
                                   </Badge>
                                 ))
                               ) : (
                                 <Badge 
                                   variant={hasReconciliation ? 'default' : 'secondary'}
                                   className={cn(
                                     'text-xs',
                                     hasReconciliation 
                                       ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' 
                                       : 'bg-red-100 text-red-800 hover:bg-red-100'
                                   )}
                                 >
                                   {hasReconciliation ? 'Đã đối soát' : 'Chưa đối soát'}
                                 </Badge>
                               )}
                             </div>
                           </div>
                         </TableCell>
                         {/* Customer Column */}
                         <TableCell className="py-3 border-r border-slate-200 text-center w-48 sm:w-60 max-w-sm">
                           <div className="space-y-1 whitespace-nowrap">
                             <div className="text-sm font-medium text-blue-600 cursor-pointer hover:underline">
                               {maskPhoneNumber(order.customer_phone || "")}
                             </div>
                             <div className="font-medium truncate" title={order.customer_name}>{order.customer_name}</div>
                             <div className="text-sm text-muted-foreground truncate" title={formatAddress(order.customer_address)}>
                               {formatAddress(order.customer_address)}
                             </div>
                             <div className="flex flex-wrap gap-1 mt-1 text-center justify-center">
                               {otherTags.map((tag: any, index: number) => tag && (
                                 <Badge 
                                   key={index}
                                   variant="outline"
                                   className="text-xs"
                                   style={{ borderColor: tag.color, color: tag.color }}
                                 >
                                   {tag.name}
                                 </Badge>
                               ))}
                             </div>
                           </div>
                         </TableCell>
                          {/* Products Column */}
                          <TableCell className="p-0 border-r border-slate-200 text-center">
                            <div className="divide-y divide-slate-100">
                              {order.items?.map((item: any, index: number) => (
                                <div key={index} data-item-row data-item-index={index} className="text-sm py-5 px-5 min-h-[60px] flex flex-col items-center justify-center gap-1">
                                  <div className="font-medium text-slate-900 truncate w-full" title={item.product_name || 'N/A'}>{item.product_name || 'N/A'}</div>
                                </div>
                              ))}
                              {(!order.items || order.items.length === 0) && (
                                <div className="text-sm text-muted-foreground min-h-[60px] flex items-center justify-center">Không có sản phẩm</div>
                              )}
                            </div>
                          </TableCell>
                          {/* Manufacturer Column */}
                          <TableCell className="p-0 border-r border-slate-200 text-center">
                            <div className="divide-y divide-slate-100">
                              {order.items?.map((item: any, index: number) => (
                                <div key={index} data-item-row data-item-index={index} className="text-sm py-5 px-5 min-h-[60px] flex items-center justify-center">
                                  <div className="font-medium text-slate-900 truncate w-full" title={item.manufacturer || '-'}>{item.manufacturer || '-'}</div>
                                </div>
                              ))}
                              {(!order.items || order.items.length === 0) && (
                                <div className="text-sm text-muted-foreground min-h-[60px] flex items-center justify-center">-</div>
                              )}
                            </div>
                          </TableCell>
                           {/* Price Column */}
                           <TableCell className="p-0 border-r border-slate-200 text-center">
                              <div className="divide-y divide-slate-100">
                                {order.items?.map((item: any, index: number) => {
                                 return (
                                   <div key={index} data-item-row data-item-index={index} className="text-sm py-5 px-5 min-h-[60px] text-center flex items-center justify-center">
                                     <div className="font-medium text-slate-900">{formatVndNoSymbol(item.unit_price)}</div>
                                  </div>
                                );
                              })}
                                {(!order.items || order.items.length === 0) && (
                                  <div className="text-sm text-muted-foreground min-h-[60px] flex items-center justify-center">-</div>
                                )}
                              </div>
                            </TableCell>
                           {/* Quantity Column */}
                           <TableCell className="p-0 border-r border-slate-200 text-center">
                             <div className="divide-y divide-slate-100">
                               {order.items?.map((item: any, index: number) => {
                                 const allocation = order.allocationStatus?.allocations?.find((a: any) => a.productId === item.product_id);
                                 return (
                                   <div key={index} data-item-row data-item-index={index} className="text-sm py-5 px-5 min-h-[60px] flex flex-col items-center justify-center gap-1">
                                     <div className="font-medium text-slate-900">{item.quantity || 0}</div>
                                     {allocation?.returnedQuantity > 0 && (
                                       <div className="text-xs text-red-500 whitespace-nowrap">
                                         - {allocation.returnedQuantity}
                                       </div>
                                     )}
                                   </div>
                                 );
                               })}
                               {(!order.items || order.items.length === 0) && (
                                 <div className="text-sm text-muted-foreground min-h-[60px] flex items-center justify-center">-</div>
                               )}
                             </div>
                           </TableCell>
                           {/* Vat Column */}
                           <TableCell className="p-0 border-r border-slate-200 text-center">
                             <div className="divide-y divide-slate-100">
                               {order.items?.map((item: any, index: number) => (
                                 <div key={index} data-item-row data-item-index={index} className="text-sm py-5 px-5 min-h-[60px] flex items-center justify-center">
                                    <div className="font-medium text-slate-900 text-center leading-tight space-y-0">
                                      <div className="leading-none">{formatVndNoSymbol(item.unit_vat_price)}</div>
                                      <div className="text-xs text-slate-500 leading-none">({item.vat_percentage}%)</div>
                                    </div>
                                 </div>
                               ))}
                               {(!order.items || order.items.length === 0) && (
                                 <div className="text-sm text-muted-foreground min-h-[60px] flex items-center justify-center">-</div>
                               )}
                             </div>
                           </TableCell>
                           {/* Expenses Column - use backend totalExpenses if available */}
                           <TableCell className="py-3 border-r border-slate-200 text-center">
                             <div className="text-sm font-medium text-orange-600">
                               {formatVndNoSymbol(
                                 (order as any).totalExpenses ??
                                 order.totalExpenses ??
                                 order.expenses?.reduce(
                                   (sum: number, exp: any) => sum + (Number(exp.amount) || 0),
                                   0
                                 ) ??
                                 0
                               )}
                             </div>
                           </TableCell>
                          {/* Total Amount Column - use backend aggregated totalAmount */}
                           <TableCell className="py-3 border-r border-slate-200 text-center">
                             <div className="text-sm font-semibold text-slate-900">
                               {formatVndNoSymbol(
                                 // Backend totalAmount already includes products + expenses
                                 (order as any).totalAmount ?? order.total_amount ?? 0
                               )}
                             </div>
                             {(order.allocationStatus?.totals?.returnedValue > 0) && (
                               <div className="text-xs text-red-500">
                                 - {formatVndNoSymbol(order.allocationStatus?.totals?.returnedValue || 0)}
                               </div>
                             )}
                           </TableCell>
                           {/* Vat Price Column - use backend aggregated vatPercentage * totalVat */}
                           <TableCell className="py-3 border-r border-slate-200 text-center">
                             <div className="text-sm font-semibold text-slate-900">
                               {formatVndNoSymbol(
                                 (order as any).totalVat ?? order.total_vat ?? 0
                               )}
                             </div>
                            {(order.allocationStatus?.totals?.deductionVat > 0) && (
                              <div className="text-xs text-red-500">
                                - {formatVndNoSymbol(order.allocationStatus?.totals?.deductionVat || 0)}
                              </div>
                            )}
                           </TableCell>
                           {/* Total VAT Price Column - use backend aggregated vatTotalAmount*/}
                           <TableCell className="py-3 border-r border-slate-200 text-center">
                             <div className="text-sm font-semibold text-slate-900">
                               {formatVndNoSymbol(
                                 // Backend totalAmount already includes products + expenses
                                 (order as any).totalVatAmount ?? order.total_vat_amount ?? 0
                               )}
                             </div>
                            {(order.allocationStatus?.totals?.deductionAmount > 0) && (
                              <div className="text-xs text-red-500">
                                - {formatVndNoSymbol(order.allocationStatus?.totals?.deductionAmount || 0)}
                              </div>
                            )}
                           </TableCell>
                           {/* Payment Column - use backend totalPaidAmount / remainingDebt */}
                           <TableCell className="py-3 border-r border-slate-200 text-center">
                              <div className="space-y-1">
                                {/* Số đã thanh toán: totalPaidAmount từ backend */}
                                <div className="text-sm font-medium text-slate-900 flex items-center gap-1 justify-center">
                                  <Banknote className="w-3 h-3" />
                                  {(() => {
                                    const paidAmount =
                                      (order as any).totalPaidAmount ??
                                      order.totalPaidAmount ??
                                      order.paid_amount ??
                                      order.initial_payment ??
                                      0;
                                    return formatVndNoSymbol(paidAmount);
                                  })()}
                                </div>
                                {/* Số còn nợ: remainingDebt từ backend, fallback = totalAmount - totalPaidAmount */}
                                <div className="text-sm font-medium text-red-600">
                                  {(() => {
                                    const totalAmount =
                                      (order as any).totalAmount ?? order.totalAmount ?? order.total_amount ?? 0;
                                    const paidAmount =
                                      (order as any).totalPaidAmount ??
                                      order.totalPaidAmount ??
                                      order.paid_amount ??
                                      order.initial_payment ??
                                      0;
                                    const returnedAmount = order.allocationStatus?.totals?.deductionAmount ?? 0;
                                    const debtAmount =
                                      (order as any).remainingDebt ??
                                      order.remainingDebt ??
                                      Math.max(0, totalAmount - paidAmount - returnedAmount);
                                    return formatVndNoSymbol(debtAmount);
                                  })()}
                                </div>
                              </div>
                           </TableCell>
                           {/* Contract Code Column */}
                           <TableCell className="py-3 border-r border-slate-200 text-center">
                             <div className="text-sm font-medium text-slate-900">{order.contract_code || '-'}</div>
                           </TableCell>
                          {/* Quick Notes Column */}
                          <TableCell className="relative p-0 border-r border-slate-200 w-64 sm:w-40 h-20">
                            <div
                              className="absolute inset-0 w-full h-full flex items-center justify-center text-center 
                              text-sm p-2 overflow-auto hover:bg-muted/50 focus:bg-background 
                              focus:outline-none focus:ring-1 focus:ring-ring break-words"
                              contentEditable
                              suppressContentEditableWarning={true}
                              onBlur={(e) => handleQuickNote(order.id, e.currentTarget.textContent)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                }
                              }}
                            >
                              {order.notes || ""}
                            </div>
                          </TableCell>
                           {/* Creator Column */}
                          <TableCell className="py-3 border-r border-slate-200">
                             <CreatorDisplay createdBy={order.created_by} creatorInfo={order.creator_info} />
                           </TableCell>
                          {/* Completed At Column */}
                          <TableCell className="py-3 border-r border-slate-200 text-center">
                            {(() => {
                              const completedAt = order.completed_at || order.updated_at;
                              const showCompleted = ['delivered','completed'].includes(order.status?.code);
                              return showCompleted && completedAt
                                ? format(new Date(completedAt), 'dd/MM/yyyy HH:mm')
                                : '-';
                            })()}
                          </TableCell>
                          {/* Status Column */}
                          <TableCell className="py-4 border-r border-slate-200 min-w-[120px] sm:min-w-[140px]">
                            <Select
                              value={typeof order.status === 'object' ? order.status?.code : order.status || 'pending'}
                              onValueChange={(newStatus) => handleUpdateOrderStatus(order.id, newStatus)}
                              disabled={!hasPermission('ORDERS_UPDATE_STATUS')}
                            >
                              <SelectTrigger className="min-w-[120px] sm:min-w-[140px] h-auto p-0 border-none bg-transparent hover:bg-transparent focus:bg-transparent justify-center">
                                <div className="cursor-pointer inline-flex whitespace-nowrap text-xs sm:text-sm">
                                  {getStatusBadge(typeof order.status === 'object' ? order.status?.code : order.status, order.type === 'purchase')}
                                </div>
                              </SelectTrigger>
                              <SelectContent className="min-w-[128px] sm:min-w-[144px]">
                                {(order.type === 'purchase' ? PURCHASE_ORDER_STATUSES : ORDER_STATUSES).map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {order.type === 'purchase' ? PURCHASE_ORDER_STATUS_LABELS_VI[status as keyof typeof PURCHASE_ORDER_STATUS_LABELS_VI] : ORDER_STATUS_LABELS_VI[status as keyof typeof ORDER_STATUS_LABELS_VI]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                         {/* Actions Column */}
                          <TableCell className="text-center py-3">
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                 <MoreHorizontal className="w-4 h-4" />
                               </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    openDialog('view', order.id);
                                    setShowOrderViewDialog(true);
                                  }}
                                  className="cursor-pointer hover:bg-muted"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Xem chi tiết
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={async () => {
                                    setSelectedOrder(order);
                                    try {
                                      // Fetch order detail first to get full data including warranty_months
                                      const orderDetail = await orderApi.getOrder(order.id);
                                      setEditOrderData(orderDetail);
                                    } catch (error) {
                                      console.error('Error fetching order detail:', error);
                                      setEditOrderData(order);
                                    }
                                    openDialog('edit', order.id);
                                    setShowCreateDialog(true);
                                  }}
                                  className="cursor-pointer hover:bg-muted"
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Sửa đơn
                                </DropdownMenuItem>
                               <DropdownMenuItem 
                                 onClick={() => {
                                   setSelectedOrder(order);
                                   openDialog('payment', order.id);
                                   setShowPaymentDialog(true);
                                 }}
                                 className="cursor-pointer hover:bg-muted"
                               >
                                 <CreditCard className="w-4 h-4 mr-2" />
                                 Thanh toán
                               </DropdownMenuItem>
                               <DropdownMenuItem 
                                 onClick={() => {
                                   setSelectedOrder(order);
                                   setShowTagsManager(true);
                                 }}
                                 className="cursor-pointer hover:bg-muted"
                               >
                                 <Tag className="w-4 h-4 mr-2" />
                                 Quản lý nhãn
                               </DropdownMenuItem>
                               <DropdownMenuItem 
                                 onClick={() => {
                                   setSelectedOrderForDeliveryExport(order);
                                   setShowExportDeliveryDialog(true);
                                 }}
                                 className="cursor-pointer hover:bg-muted"
                               >
                                 <Download className="w-4 h-4 mr-2" />
                                 {order.type === 'purchase' ? 'Xuất biên bản mua hàng' : 'Xuất biên bản giao hàng'}
                               </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleCreateExportSlip(order, order.type === 'purchase' ? 'import' : 'export')}
                                  className="cursor-pointer hover:bg-muted"
                                >
                                  <Package className="w-4 h-4 mr-2" />
                                  {order.type === 'purchase' ? 'Tạo phiếu nhập kho' : 'Tạo phiếu xuất kho'}
                                </DropdownMenuItem>
                                {(orderHasLinkedSlipsCache[order.id] !== false) && (
                                <DropdownMenuItem 
                                  onClick={() => handleCreateExportSlip(order, order.type === 'purchase' ? 'purchase_return' : 'sale_return')}
                                  className="cursor-pointer hover:bg-muted"
                                >
                                  <RotateCw className="w-4 h-4 mr-2" />
                                  {order.type === 'purchase' ? 'Tạo phiếu trả hàng NCC' : 'Tạo phiếu hoàn hàng'}
                                </DropdownMenuItem>
                                )}
                                {(() => {
                                  const hasSerials = order.items?.some((item: any) => 
                                    Array.isArray(item.serials) && item.serials.length > 0
                                  );
                                  const orderStatus = typeof order.status === 'object' ? order.status?.code : order.status;
                                  const canCreateWarranty = hasSerials && (orderStatus === 'picked' || orderStatus === 'completed');
                                  
                                  if (!canCreateWarranty) return null;
                                  
                                  return (
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setSelectedOrderForWarranty(order);
                                        setShowWarrantyDialog(true);
                                      }}
                                      className="cursor-pointer hover:bg-muted"
                                    >
                                      <Shield className="w-4 h-4 mr-2" />
                                      Tạo phiếu bảo hành
                                    </DropdownMenuItem>
                                  );
                                })()}
                                {(() => {
                                  const orderType = order.type || order.order_type;
                                  if (orderType === 'purchase') return null;
                                  
                                  return (
                                    <DropdownMenuItem 
                                      onClick={async () => {
                                        try {
                                          const result = await orderApi.activateWarranty(order.id);
                                          toast({
                                            title: "Thành công",
                                            description: `Đã kích hoạt bảo hành cho ${result.activatedCount} serial`,
                                          });
                                          fetchOrders();
                                        } catch (error) {
                                          toast({
                                            title: "Lỗi",
                                            description: error.response?.data?.message || error.message || "Không thể kích hoạt bảo hành",
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                      className="cursor-pointer hover:bg-muted"
                                    >
                                      <Zap className="w-4 h-4 mr-2" />
                                      Kích hoạt bảo hành
                                    </DropdownMenuItem>
                                  );
                                })()}
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setOrderToDelete(order);
                                    setShowDeleteDialog(true);
                                  }}
                                  className="cursor-pointer hover:bg-muted text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Xóa đơn hàng
                                </DropdownMenuItem>
                             </DropdownMenuContent>
                           </DropdownMenu>
                         </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </div>
          </div>
          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Hiển thị</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                setCurrentPage(1);
                setItemsPerPage(Number(value));
                // Will auto-fetch via useEffect below
              }}>
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder="Số lượng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                trong tổng số {totalOrders} đơn hàng
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Trước
              </Button>
              <span className="text-sm text-muted-foreground">
                Trang {currentPage} / {Math.max(1, Math.ceil(totalOrders / itemsPerPage))}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= Math.ceil(totalOrders / itemsPerPage)}
              >
                Sau
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Create Order Dialog */}
      <CreateOrderForm
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) {
            isClosingDialogRef.current = true;
            closeDialog();
            setEditOrderData(null);
            setTimeout(() => {
              isClosingDialogRef.current = false;
            }, 100);
          }
        }}
        onOrderCreated={() => {
          fetchOrders();
          isClosingDialogRef.current = true;
          closeDialog();
          setShowCreateDialog(false);
          setEditOrderData(null);
          setTimeout(() => {
            isClosingDialogRef.current = false;
          }, 100);
        }}
        orderId={editOrderData?.id}
        orderData={editOrderData}
      />
      {/* Order View Dialog (Read-only) */}
      <OrderViewDialog
        order={selectedOrder}
        open={showOrderViewDialog}
        onOpenChange={(open) => {
          setShowOrderViewDialog(open);
          if (!open) {
            isClosingDialogRef.current = true;
            closeDialog();
            setSelectedOrder(null);
            // Reset flag after a short delay to allow URL to update
            setTimeout(() => {
              isClosingDialogRef.current = false;
            }, 100);
          }
        }}
      />

      {/* Order Tags Manager */}
      {showTagsManager && selectedOrder && (
        <OrderTagsManager
          orderId={selectedOrder.id}
          open={showTagsManager}
          onOpenChange={setShowTagsManager}
          onTagsUpdated={() => {
            fetchOrders();
            loadOrderTagsCatalog();
            // Also refresh the selected order data
            if (selectedOrder) {
              orderApi.getOrder(selectedOrder.id).then(updatedOrder => {
                setSelectedOrder(updatedOrder);
              }).catch(() => {
                fetchOrders();
              });
            }
          }}
          currentTags={mapOrderTags(selectedOrder.tags || [])}
          availableTags={availableTags}
        />
      )}
      {/* Payment Dialog */}
      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={(open) => {
          setShowPaymentDialog(open);
          if (open && selectedOrder?.id) {
            openDialog('payment', selectedOrder.id);
          } else if (!open) {
            isClosingDialogRef.current = true;
            closeDialog();
            setTimeout(() => {
              isClosingDialogRef.current = false;
            }, 100);
          }
        }}
        order={selectedOrder}
        onUpdate={() => {
          fetchOrders();
          // Refresh payments cache for this order
          if (selectedOrder?.id) {
            // Clear cache for this order so it will be reloaded
            setOrderPaymentsCache(prev => {
              const newCache = { ...prev };
              delete newCache[selectedOrder.id];
              return newCache;
            });
            // Reload payments for this order
            loadPaymentsForOrders([selectedOrder.id]);
          }
        }}
      />
      {/* Multiple Payment Dialog */}
      <MultiplePaymentDialog
        open={showMultiplePaymentDialog}
        onOpenChange={(open) => {
          setShowMultiplePaymentDialog(open);
          if (!open) {
            isClosingDialogRef.current = true;
            closeDialog();
            setTimeout(() => {
              isClosingDialogRef.current = false;
            }, 100);
          }
        }}
        orderIds={selectedOrders}
        orders={orders}
        onUpdate={() => {
          fetchOrders();
          // Refresh payments cache for all selected orders
          if (selectedOrders.length > 0) {
            // Clear cache for these orders so they will be reloaded
            setOrderPaymentsCache(prev => {
              const newCache = { ...prev };
              selectedOrders.forEach(orderId => {
                delete newCache[orderId];
              });
              return newCache;
            });
            // Reload payments for these orders
            loadPaymentsForOrders(selectedOrders);
          }
          setSelectedOrders([]);
        }}
        onRemoveOrder={(orderId) => {
          setSelectedOrders(prev => prev.filter(id => id !== orderId));
        }}
      />

      {/* Warranty Ticket Dialog */}
      <CreateWarrantyTicketForm
        open={showWarrantyDialog}
        onOpenChange={(open) => {
          setShowWarrantyDialog(open);
          if (!open) {
            setSelectedOrderForWarranty(null);
            isClosingDialogRef.current = true;
            closeDialog();
            setTimeout(() => {
              isClosingDialogRef.current = false;
            }, 100);
          }
        }}
        onOrderCreated={() => {
          fetchOrders();
          setShowWarrantyDialog(false);
          setSelectedOrderForWarranty(null);
          toast({
            title: "Thành công",
            description: "Đã tạo phiếu bảo hành cho đơn hàng." 
          });
        }}
        orderId={selectedOrderForWarranty?.id}
        orderData={selectedOrderForWarranty}
      />

      {/* Export Slip Creation Dialog */}
      <Dialog open={showExportSlipDialog} onOpenChange={setShowExportSlipDialog}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{
              selectedOrderForExport ? (
                selectedSlipType === 'import' ? 'Tạo phiếu nhập kho' :
                selectedSlipType === 'export' ? 'Tạo phiếu xuất kho' :
                selectedSlipType === 'sale_return' ? 'Tạo phiếu hoàn hàng' :
                selectedSlipType === 'purchase_return' ? 'Tạo phiếu trả hàng NCC' :
                (selectedOrderForExport.type === 'purchase' ? 'Tạo phiếu nhập kho' : 'Tạo phiếu xuất kho')
              ) : 'Tạo phiếu'
            }</DialogTitle>
            <DialogDescription>
              {selectedOrderForExport ? (
                <>
                  {selectedSlipType === 'import' ? 'Tạo phiếu nhập kho' :
                   selectedSlipType === 'export' ? 'Tạo phiếu xuất kho' :
                   selectedSlipType === 'sale_return' ? 'Tạo phiếu hoàn hàng' :
                   selectedSlipType === 'purchase_return' ? 'Tạo phiếu trả hàng NCC' :
                   (selectedOrderForExport.type === 'purchase' ? 'Tạo phiếu nhập kho' : 'Tạo phiếu xuất kho')
                  } cho đơn hàng <strong>{selectedOrderForExport.order_number}</strong>
                </>
              ) : (
                'Chọn đơn hàng để tạo phiếu'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedOrderForExport && (
              <OrderSpecificSlipCreation 
                orderId={selectedOrderForExport.id}
                orderType={selectedOrderForExport.type}
                slipType={selectedSlipType}
                onExportSlipCreated={() => {
                  setShowExportSlipDialog(false);
                  const orderNumber = selectedOrderForExport.order_number;
                  // Determine slip type label
                  const getSlipTypeLabel = (type?: string) => {
                    if (type === 'import') return 'phiếu nhập kho';
                    if (type === 'export') return 'phiếu xuất kho';
                    if (type === 'sale_return') return 'phiếu hoàn hàng';
                    if (type === 'purchase_return') return 'phiếu trả hàng NCC';
                    return selectedOrderForExport.type === 'purchase' ? 'phiếu nhập kho' : 'phiếu xuất kho';
                  };
                  const slipTypeLabel = getSlipTypeLabel(selectedSlipType);
                  setSelectedOrderForExport(null);
                  setSelectedSlipType(undefined);
                  toast({
                    title: "Thành công",
                    description: `Đã tạo ${slipTypeLabel} cho đơn hàng ${orderNumber}`,
                  });
                  // Backend cập nhật trạng thái đơn hàng sau khi tạo phiếu xuất kho,
                  // cần refetch danh sách để hiển thị đúng trạng thái mới
                  fetchOrders();
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open);
        if (!open) {
          setOrderToDelete(null);
          setSelectedOrders([]);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa đơn hàng</DialogTitle>
            <DialogDescription>
              {orderToDelete ? (
                <>Bạn có chắc chắn muốn xóa đơn hàng <strong>{orderToDelete.order_number}</strong>? Hành động này không thể hoàn tác.</>
              ) : (
                <>Bạn có chắc chắn muốn xóa {selectedOrders.length} đơn hàng đã chọn? Hành động này không thể hoàn tác.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setOrderToDelete(null);
                setSelectedOrders([]);
              }}
            >
              Hủy
            </Button>
            <Button 
              variant="destructive" 
              onClick={orderToDelete ? handleDeleteSingleOrder : handleDeleteOrders}
              disabled={loading}
            >
              {loading ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
       </Dialog>
       {/* Export Delivery Note Dialog */}
       <Dialog open={showExportDeliveryDialog} onOpenChange={setShowExportDeliveryDialog}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Xuất biên bản giao hàng</DialogTitle>
             <DialogDescription>
               {selectedOrderForDeliveryExport ? (
                 <>Chọn định dạng xuất cho đơn hàng <strong>{selectedOrderForDeliveryExport.order_number}</strong></>
               ) : (
                 'Chọn định dạng xuất'
               )}
             </DialogDescription>
           </DialogHeader>
           <div className="py-4 space-y-3">
             <Button 
               onClick={() => selectedOrderForDeliveryExport && exportDeliveryNoteToPDF(selectedOrderForDeliveryExport)}
               disabled={exportingDeliveryPDF || exportingDeliveryXLSX}
               className="w-full"
               variant="outline"
             >
               <FileDown className="w-4 h-4 mr-2" />
               {exportingDeliveryPDF ? 'Đang xuất PDF...' : 'Xuất PDF'}
             </Button>
             <Button 
               onClick={() => selectedOrderForDeliveryExport && exportDeliveryNoteToXLSX(selectedOrderForDeliveryExport)}
               disabled={exportingDeliveryPDF || exportingDeliveryXLSX}
               className="w-full"
               variant="outline"
             >
               <FileDown className="w-4 h-4 mr-2" />
               {exportingDeliveryXLSX ? 'Đang xuất Excel...' : 'Xuất Excel'}
             </Button>
           </div>
           <DialogFooter>
             <Button 
               variant="outline" 
               onClick={() => setShowExportDeliveryDialog(false)}
             >
               Đóng
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
       </div>
     </div>
   );
 };

 const Orders: React.FC = () => {
   return (
     <PermissionGuard requiredPermissions={['ORDERS_VIEW']}>
       <OrdersContent />
     </PermissionGuard>
   );
 };

 export default Orders;

