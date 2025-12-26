import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Search, Plus, Eye, Edit, Tag, DollarSign, ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal, CreditCard, Package, Banknote, Trash2, Download, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { orderApi } from "@/api/order.api";
import { orderTagsApi, OrderTag as ApiOrderTag } from "@/api/orderTags.api";
import { categoriesApi } from "@/api/categories.api";
import { MultiplePaymentDialog } from "@/components/MultiplePaymentDialog";
import { paymentsApi } from "@/api/payments.api";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGuard } from "@/components/PermissionGuard";
import CreateOrderForm from "@/components/orders/CreateOrderForm";
import { OrderDetailDialog } from "@/components/orders/OrderDetailDialog";
import { PaymentDialog } from "@/components/PaymentDialog";
import { OrderViewDialog } from "@/components/orders/OrderViewDialog";
import { OrderTagsManager } from "@/components/orders/OrderTagsManager";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrderSpecificExportSlipCreation } from "@/components/inventory/OrderSpecificExportSlipCreation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import CreatorDisplay from "@/components/orders/CreatorDisplay";
import { Loading } from "@/components/ui/loading";
import { getErrorMessage } from "@/lib/error-utils";
import { getOrderStatusConfig, ORDER_STATUSES, ORDER_STATUS_LABELS_VI } from "@/constants/order-status.constants";
import apiClient from "@/lib/api";
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
const OrdersContent: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string | undefined>();
  const [endDate, setEndDate] = useState<string | undefined>();
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [creators, setCreators] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetailDialog, setShowOrderDetailDialog] = useState(false);
  const [showOrderViewDialog, setShowOrderViewDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showMultiplePaymentDialog, setShowMultiplePaymentDialog] = useState(false);
  const [showTagsManager, setShowTagsManager] = useState(false);
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [showExportSlipDialog, setShowExportSlipDialog] = useState(false);
  const [selectedOrderForExport, setSelectedOrderForExport] = useState<any>(null);
  const [availableTags, setAvailableTags] = useState<ApiOrderTag[]>([]);
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
  // Bulk payment preview state - moved to MultiplePaymentDialog
  // Summary state from API
  const [summary, setSummary] = useState<{
    totalAmount: number;
    totalInitialPayment: number;
    totalPaidAmount?: number;
    totalDebt: number;
    totalExpenses: number;
  } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const location = useLocation();
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
      const params: any = { page: currentPage, limit: itemsPerPage };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.categories = categoryFilter;
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (creatorFilter !== 'all') params.creatorFilter = creatorFilter;
      const resp = await orderApi.getOrders(params);
      setOrders(resp.orders || []);
      setTotalOrders(resp.total || 0);
      // Load payments for all orders to calculate accurate paid amounts
      if (resp.orders && resp.orders.length > 0) {
        loadPaymentsForOrders(resp.orders.map(o => o.id));
      }
      // Set summary from API if available
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
  }, [currentPage, itemsPerPage, statusFilter, categoryFilter, debouncedSearchTerm, startDate, endDate, creatorFilter, toast]);
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
  // Handle creating export slip
  const handleCreateExportSlip = (order: any) => {
    setSelectedOrderForExport(order);
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
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, statusFilter, categoryFilter, debouncedSearchTerm, startDate, endDate, creatorFilter, fetchOrders]); // Fetch when pagination or filters change
  useEffect(() => {
    loadOrderTagsCatalog();
  }, [loadOrderTagsCatalog]);
  // Removed automatic refresh - only reload on user actions
  const fetchCreators = async () => {
    setCreators([]); // Not implemented on BE yet
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
      // Use the new endpoint specifically for status updates
      const response = await orderApi.updateOrderStatus(orderId, newStatus);
      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      toast({
        title: "Thành công",
        description: "Đã cập nhật trạng thái đơn hàng",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể cập nhật trạng thái",
        variant: "destructive",
      });
    }
  };
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
      // Get filename from Content-Disposition header, or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `delivery_note_${order.order_number}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
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
      // Get filename from Content-Disposition header, or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `delivery_note_${order.order_number}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }
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
    setStatusFilter("all");
    setCategoryFilter("all");
    setStartDate(undefined);
    setEndDate(undefined);
    setCreatorFilter("all");
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
  const getStatusBadge = (status: string) => {
    const config = getOrderStatusConfig(status);
    // Thu nhỏ chữ cho status "delivery_failed" vì label quá dài
    const isLongLabel = status === 'delivery_failed';
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
  if (loading) {
    return <Loading message="Đang tải danh sách đơn hàng..." />;
  }
  return (
    <div className="min-h-screen bg-background p-6 sm:p-6 md:p-7">
        <div className="w-full mx-auto space-y-3 sm:space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Danh Sách Đơn Hàng</h1>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              THÊM MỚI
            </Button>
          </div>
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <Input
                placeholder="Nhập ID đơn sản (API ID)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                {ORDER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {ORDER_STATUS_LABELS_VI[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Combobox
              options={[
                { label: "Tất cả loại", value: "all" },
                ...categories.map((category) => ({
                  label: category.name,
                  value: category.id
                }))
              ]}
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              placeholder="Chọn loại sản phẩm"
              searchPlaceholder="Tìm loại sản phẩm..."
              emptyMessage="Không có loại sản phẩm nào"
              className="w-40"
            />
            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Từ ngày:</label>
              <Input
                type="date"
                className="w-40"
                value={startDate || ""}
                onChange={(e) => setStartDate(e.target.value || undefined)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Đến ngày:</label>
              <Input
                type="date"
                className="w-40"
                value={endDate || ""}
                onChange={(e) => setEndDate(e.target.value || undefined)}
              />
            </div>
            {/* Creator Filter */}
            <Combobox
              options={[
                { label: "Tất cả người tạo", value: "all" },
                ...creators.map((creator) => ({
                  label: creator.full_name,
                  value: creator.id
                }))
              ]}
              value={creatorFilter}
              onValueChange={setCreatorFilter}
              placeholder="Người tạo đơn"
              searchPlaceholder="Tìm người tạo..."
              emptyMessage="Không có người tạo nào"
              className="w-48"
            />
            {/* Reset Filters Button */}
            <Button
              onClick={handleResetFilters}
              variant="outline"
              className="ml-auto"
            >
              Đặt lại
            </Button>
          </div>
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
              <div className="text-sm text-muted-foreground">Đã trả</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totals.debtAmount)}</div>
              <div className="text-sm text-muted-foreground">Còn nợ</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(totals.totalExpenses)}</div>
              <div className="text-sm text-muted-foreground">Tổng chi phí</div>
            </div>
          </div>
        </CardContent>
      </Card>
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
          <div className="overflow-x-auto">
            <Table className="min-w-full text-xs sm:text-sm">
              <TableHeader>
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
                      Khách hàng
                      {getSortIcon("customer_name")}
                    </div>
                  </TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[80px] sm:min-w-[90px]">Sản phẩm</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[80px] sm:min-w-[90px]">Giá</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[64px] sm:min-w-[70px]">Số lượng</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[96px] sm:min-w-[110px]">Chi phí</TableHead>
                   <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[96px] sm:min-w-[110px]">Tổng giá trị</TableHead>
                    <TableHead className="py-1 sm:py-2 font-medium text-slate-700 border-r border-slate-200 text-center min-w-[96px] sm:min-w-[110px]">Thanh toán</TableHead>
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
                      <TableRow key={order.id} className="hover:bg-slate-50/50 border-b border-slate-100">
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
                             <div className="flex gap-1 flex-wrap">
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
                             <div className="font-medium">{order.customer_name}</div>
                             <div className="text-sm text-muted-foreground">
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
                                <div key={index} className="text-sm py-5 px-5">
                                  <div className="font-medium text-slate-900 truncate" title={item.product_name || 'N/A'}>{item.product_name || 'N/A'}</div>
                                </div>
                              ))}
                              {(!order.items || order.items.length === 0) && (
                                <div className="text-sm text-muted-foreground">Không có sản phẩm</div>
                              )}
                            </div>
                          </TableCell>
                           {/* Price Column */}
                           <TableCell className="p-0 border-r border-slate-200 text-center">
                              <div className="divide-y divide-slate-100">
                                {order.items?.map((item: any, index: number) => (
                                  <div key={index} className="text-sm py-5 px-5">
                                    <div className="font-medium text-slate-900">{formatVndNoSymbol(item.unit_price)}</div>
                                  </div>
                                ))}
                                {(!order.items || order.items.length === 0) && (
                                  <div className="text-sm text-muted-foreground">-</div>
                                )}
                              </div>
                            </TableCell>
                           {/* Quantity Column */}
                           <TableCell className="p-0 border-r border-slate-200 text-center">
                             <div className="divide-y divide-slate-100">
                               {order.items?.map((item: any, index: number) => (
                                 <div key={index} className="text-sm py-5 px-5">
                                   <div className="font-medium text-slate-900">{item.quantity || 0}</div>
                                 </div>
                               ))}
                               {(!order.items || order.items.length === 0) && (
                                 <div className="text-sm text-muted-foreground">-</div>
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
                                    const debtAmount =
                                      (order as any).remainingDebt ??
                                      order.remainingDebt ??
                                      Math.max(0, totalAmount - paidAmount);
                                    return formatVndNoSymbol(debtAmount);
                                  })()}
                                </div>
                              </div>
                           </TableCell>
                          {/* Quick Notes Column */}
                          <TableCell className="relative p-3 border-r border-slate-200 w-64 sm:w-40">
                            <textarea
                              defaultValue={order.notes || ""}
                              placeholder="Thêm ghi chú..."
                              className="absolute inset-0 w-full h-full border-none bg-transparent text-sm p-2 py-7 leading-[1.5] hover:bg-muted/50 focus:bg-background focus:border-border whitespace-normal break-words resize-none"
                              onBlur={(e) => handleQuickNote(order.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                            />
                          </TableCell>
                           {/* Creator Column */}
                          <TableCell className="py-3 border-r border-slate-200">
                             <CreatorDisplay createdBy={order.created_by} creatorInfo={order.creator_info} />
                           </TableCell>
                          {/* Completed At Column */}
                          <TableCell className="py-3 border-r border-slate-200 text-center">
                            {(() => {
                              const completedAt = order.completed_at || order.updated_at;
                              const showCompleted = ['delivered','completed'].includes(order.status);
                              return showCompleted && completedAt
                                ? format(new Date(completedAt), 'dd/MM/yyyy HH:mm')
                                : '-';
                            })()}
                          </TableCell>
                          {/* Status Column */}
                          <TableCell className="py-4 border-r border-slate-200 min-w-[88px] sm:min-w-[104px]">
                            <Select
                              value={order.status || 'pending'}
                              onValueChange={(newStatus) => handleUpdateOrderStatus(order.id, newStatus)}
                              disabled={!hasPermission('ORDERS_UPDATE_STATUS')}
                            >
                              <SelectTrigger className="min-w-[88px] sm:min-w-[104px] h-auto p-0 border-none bg-transparent hover:bg-transparent focus:bg-transparent justify-center">
                                <div className="cursor-pointer inline-flex whitespace-nowrap truncate max-w-[88px] sm:max-w-[104px] text-xs sm:text-sm">
                                  {getStatusBadge(order.status)}
                                </div>
                              </SelectTrigger>
                              <SelectContent className="min-w-[128px] sm:min-w-[144px]">
                                {ORDER_STATUSES.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {ORDER_STATUS_LABELS_VI[status]}
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
                                    setShowOrderViewDialog(true);
                                  }}
                                  className="cursor-pointer hover:bg-muted"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Xem chi tiết
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setShowOrderDetailDialog(true);
                                  }}
                                  className="cursor-pointer hover:bg-muted"
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Sửa đơn
                                </DropdownMenuItem>
                               <DropdownMenuItem 
                                 onClick={() => {
                                   setSelectedOrder(order);
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
                                 Xuất biên bản giao hàng
                               </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleCreateExportSlip(order)}
                                  className="cursor-pointer hover:bg-muted"
                                >
                                  <Package className="w-4 h-4 mr-2" />
                                  Tạo phiếu xuất kho
                                </DropdownMenuItem>
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
        onOpenChange={setShowCreateDialog}
        onOrderCreated={() => {
          fetchOrders();
          setShowCreateDialog(false);
        }}
      />
      {/* Order View Dialog (Read-only) */}
      <OrderViewDialog
        order={selectedOrder}
        open={showOrderViewDialog}
        onOpenChange={setShowOrderViewDialog}
      />
      {/* Order Detail Dialog (Editable) */}
      <OrderDetailDialog
        order={selectedOrder}
        open={showOrderDetailDialog}
        onOpenChange={(open) => {
          setShowOrderDetailDialog(open);
          if (!open) {
            setSelectedOrder(null);
          }
        }}
        onOrderUpdated={() => {
          fetchOrders();
          if (selectedOrder) {
            orderApi.getOrder(selectedOrder.id).then(setSelectedOrder).catch(() => {});
          }
        }}
        onOpenPaymentDialog={() => {
          setShowPaymentDialog(true);
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
        onOpenChange={setShowPaymentDialog}
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
        onOpenChange={setShowMultiplePaymentDialog}
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
      {/* Export Slip Creation Dialog */}
      <Dialog open={showExportSlipDialog} onOpenChange={setShowExportSlipDialog}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo phiếu xuất kho</DialogTitle>
            <DialogDescription>
              {selectedOrderForExport ? (
                <>Tạo phiếu xuất kho cho đơn hàng <strong>{selectedOrderForExport.order_number}</strong></>
              ) : (
                'Chọn đơn hàng để tạo phiếu xuất kho'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedOrderForExport && (
              <OrderSpecificExportSlipCreation 
                orderId={selectedOrderForExport.id}
                onExportSlipCreated={() => {
                  setShowExportSlipDialog(false);
                  setSelectedOrderForExport(null);
                  toast({
                    title: "Thành công",
                    description: `Đã tạo phiếu xuất kho cho đơn hàng ${selectedOrderForExport.order_number}`,
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
