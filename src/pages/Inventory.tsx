import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Package, AlertTriangle, CheckCircle, Upload, Warehouse as WarehouseIcon, Trash2, Edit, MapPin, ArrowUpDown, ArrowUp, ArrowDown, Download } from "lucide-react";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import * as XLSX from 'xlsx';
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouteBasedLazyData } from "@/hooks/useLazyData";
import { PermissionGuard } from "@/components/PermissionGuard";
import { Loading } from "@/components/ui/loading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddressFormSeparate } from "@/components/common/AddressFormSeparate";
import ProductList from "@/components/inventory/ProductList";
import InventoryStock from "@/components/inventory/InventoryStock";
import { productApi, type Product, type ProductWithStock, type ProductImportError, type ProductImportJobSnapshot, type ProductImportJobStatus } from "@/api/product.api";
import { categoriesApi, type Category } from "@/api/categories.api";
import { warehouseApi, type Warehouse } from "@/api/warehouse.api";
import { stockLevelsApi, type StockLevel } from "@/api/stockLevels.api";
import { dashboardApi } from "@/api/dashboard.api";
import { convertPermissionCodesInMessage } from "@/utils/permissionMessageConverter";
import { CategoriesContent } from "@/pages/Categories";
import { useSearchParams } from "react-router-dom";
import React from "react";
const InventoryContent = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterWarehouse, setFilterWarehouse] = useState("all");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [productFilterCategory, setProductFilterCategory] = useState("all");
  const [currentSearchParams, setCurrentSearchParams] = useState<{ keyword?: string; category?: string } | null>(null);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);
  const [warehouseSortConfig, setWarehouseSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams.get('tab');
    return tabFromUrl && ['inventory', 'products', 'warehouses', 'categories'].includes(tabFromUrl) 
      ? tabFromUrl 
      : "inventory";
  });
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [inventoryOverview, setInventoryOverview] = useState<{
    inventoryData: any[];
    lowStockProducts: any[];
    productStockData: any[];
    totalProducts: number;
    counts: {
      inStock: number;
      lowStock: number;
      outOfStock: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorStates, setErrorStates] = useState({
    products: null as string | null,
    warehouses: null as string | null,
    stockLevels: null as string | null,
    inventoryOverview: null as string | null
  });
  // Import job state and polling logic (moved from ProductList to persist across tab switches)
  const [importJobs, setImportJobs] = useState<ProductImportJobSnapshot[]>([]);
  const [jobHistoryPagination, setJobHistoryPagination] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const pollingRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const previousJobStatusesRef = React.useRef<Record<string, ProductImportJobStatus>>({});
  const [isPollingActive, setIsPollingActive] = useState(false);
  // Permission checks
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const canViewProducts = hasPermission('PRODUCTS_READ');
  const canViewWarehouses = hasPermission('WAREHOUSES_READ') || true; // Temporarily bypass for testing
  // Toast hook - must be declared before functions that use it
  const { toast } = useToast();
  // Clear error states when permissions are available
  useEffect(() => {
    if (canViewProducts && canViewWarehouses) {
      setErrorStates(prev => ({ ...prev, products: null, warehouses: null }));
    }
  }, [canViewProducts, canViewWarehouses]);
  // Trigger data fetch when permissions are loaded (only once)
  useEffect(() => {
    if (!permissionsLoading && canViewProducts && !isInitialLoadDone) {
      loadData(currentSearchParams || undefined);
      setIsInitialLoadDone(true);
    }
  }, [permissionsLoading, canViewProducts, isInitialLoadDone]); // Removed currentSearchParams from deps

  // Reload products when search params change
  useEffect(() => {
    if (!permissionsLoading && canViewProducts) {
      loadData(currentSearchParams || undefined);
    }
  }, [currentSearchParams]); // Only depends on currentSearchParams

  // Load warehouses when warehouses tab is active
  useEffect(() => {
    if (activeTab === 'warehouses' && canViewWarehouses && !permissionsLoading) {
      loadWarehouses();
    }
  }, [activeTab, canViewWarehouses, permissionsLoading]);
  // Import job polling functions (moved from ProductList)
  const stopImportPolling = React.useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);
  const handleJobStatusNotification = React.useCallback(async (job: ProductImportJobSnapshot) => {
    const status = job.status as ProductImportJobStatus;
    if (status === 'completed') {
      // Refresh product list after successful import
      try {
        await loadData(currentSearchParams || undefined);
      } catch (error) {
      }
      if (job.errors && job.errors.length > 0) {
        toast({
          title: 'Hoàn thành với cảnh báo',
          description: job.message || `Đã nhập ${job.imported ?? 0}/${job.totalRows ?? 0} dòng. Có ${job.errors.length} lỗi cần xử lý.`,
        });
      } else {
        toast({
          title: 'Thành công',
          description: job.message || `Đã nhập ${job.imported ?? 0} sản phẩm.`,
        });
      }
    } else if (status === 'failed') {
      toast({
        title: 'Nhập thất bại',
        description: job.message || 'Có lỗi khi xử lý file nhập',
        variant: 'destructive',
      });
    } else if (status === 'cancelled') {
      toast({
        title: 'Đã hủy nhập',
        description: job.message || 'Tiến trình nhập đã được hủy theo yêu cầu',
      });
    }
  }, [toast]);
  const refreshImportJobs = React.useCallback(async (options?: {
    onlyActive?: boolean;
    showNotifications?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const { onlyActive = false, showNotifications = false, page, limit } = options || {};
    try {
      const response = await productApi.listImportJobs({
        onlyActive,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        page,
        limit
      });
      // If we're fetching active jobs and get empty result, it means all jobs are completed
      // Stop polling and fetch all jobs to update history
      if (onlyActive && response.jobs.length === 0 && isPollingActive) {
        setIsPollingActive(false);
        // Fetch all jobs to update history
        const allJobsResponse = await productApi.listImportJobs({
          onlyActive: false,
          sortBy: 'createdAt',
          sortOrder: 'DESC'
        });
        setImportJobs(prev => {
          const jobMap = new Map<string, ProductImportJobSnapshot>();
          prev.forEach(job => {
            jobMap.set(job.jobId, job);
          });
          allJobsResponse.jobs.forEach(job => {
            const previous = jobMap.get(job.jobId);
            const mergedJob = { ...previous, ...job };
            // For completed, failed, or cancelled jobs, ensure percent is 100%
            if ((job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') &&
                (mergedJob.percent === undefined || mergedJob.percent === null || mergedJob.percent < 100)) {
              mergedJob.percent = 100;
            }
            // Ensure percent never exceeds 100
            if (mergedJob.percent && mergedJob.percent > 100) {
              mergedJob.percent = 100;
            }
            const prevStatus = previousJobStatusesRef.current[job.jobId];
            if (showNotifications && prevStatus && prevStatus !== job.status) {
              handleJobStatusNotification(mergedJob);
            }
            previousJobStatusesRef.current[job.jobId] = job.status;
            jobMap.set(job.jobId, mergedJob);
          });
          const mergedList = Array.from(jobMap.values());
          return mergedList;
        });
        return;
      }
      setImportJobs(prev => {
        // For history calls (onlyActive = false), replace all jobs with new results
        // For polling calls (onlyActive = true), merge with existing jobs
        const isHistoryCall = options?.onlyActive === false;
        if (isHistoryCall) {
          // Replace jobs for history pagination
          setJobHistoryPagination({
            total: response.total,
            page: response.page,
            limit: response.limit,
            totalPages: Math.ceil(response.total / response.limit)
          });
          return response.jobs.map(job => {
            // Ensure percent is 100% for completed/failed/cancelled jobs
            if ((job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') &&
                (job.percent === undefined || job.percent === null || job.percent < 100)) {
              job.percent = 100;
            }
            // Ensure percent never exceeds 100
            if (job.percent && job.percent > 100) {
              job.percent = 100;
            }
            return job;
          });
        } else {
          // Merge jobs for polling updates
          const jobMap = new Map<string, ProductImportJobSnapshot>();
          prev.forEach(job => {
            jobMap.set(job.jobId, job);
          });
          response.jobs.forEach(job => {
            const previous = jobMap.get(job.jobId);
            const mergedJob = { ...previous, ...job };
            // For completed, failed, or cancelled jobs, ensure percent is 100%
            if ((job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') &&
                (mergedJob.percent === undefined || mergedJob.percent === null || mergedJob.percent < 100)) {
              mergedJob.percent = 100;
            }
            // Ensure percent never exceeds 100
            if (mergedJob.percent && mergedJob.percent > 100) {
              mergedJob.percent = 100;
            }
            const prevStatus = previousJobStatusesRef.current[job.jobId];
            if (showNotifications && prevStatus && prevStatus !== job.status) {
              handleJobStatusNotification(mergedJob);
            }
            previousJobStatusesRef.current[job.jobId] = job.status;
            jobMap.set(job.jobId, mergedJob);
          });
          const mergedList = Array.from(jobMap.values());
          return mergedList;
        }
      });
    } catch (error: any) {
      if (!onlyActive) {
        toast({
          title: 'Lỗi',
          description: convertPermissionCodesInMessage(error.response?.data?.message || error.message || 'Không thể tải danh sách tiến trình nhập'),
          variant: 'destructive',
        });
      }
    }
  }, [handleJobStatusNotification, toast, isPollingActive]);
  // Initialize import jobs on component mount
  React.useEffect(() => {
    refreshImportJobs();
  }, [refreshImportJobs]);
  // Check for active jobs and update polling state
  React.useEffect(() => {
    // Only consider jobs that are truly active (not completed, failed, cancelled, or cancel requested)
    // Also continue polling if job is processing but hasn't processed all rows yet
    const activeJobs = importJobs.filter(job => {
      const isActiveStatus = job.status === 'queued' || job.status === 'processing';
      const isNotTerminal = job.status !== 'completed' && job.status !== 'failed' && job.status !== 'cancelled';
      // Continue polling if job is still processing and hasn't completed all rows
      const isIncomplete = job.status === 'processing' &&
                          job.totalRows &&
                          job.processedRows !== undefined &&
                          job.processedRows < job.totalRows;
      return (isActiveStatus && isNotTerminal) || isIncomplete;
    });
    const shouldPoll = activeJobs.length > 0;
    if (shouldPoll !== isPollingActive) {
      setIsPollingActive(shouldPoll);
    }
  }, [importJobs, isPollingActive]);
  // Separate effect for starting/stopping polling
  React.useEffect(() => {
    if (isPollingActive) {
      if (!pollingRef.current) {
        // Fetch active jobs initially
        refreshImportJobs({ onlyActive: true });
        pollingRef.current = setInterval(() => {
          refreshImportJobs({ onlyActive: true, showNotifications: true });
        }, 3000);
      }
    } else {
      if (pollingRef.current) {
        // When stopping polling, fetch all jobs once to ensure history is updated
        refreshImportJobs({ onlyActive: false });
        stopImportPolling();
      }
    }
  }, [isPollingActive, refreshImportJobs, stopImportPolling]);
  // Cleanup polling on unmount
  React.useEffect(() => {
    return () => {
      stopImportPolling();
    };
  }, [stopImportPolling]);
  // Load warehouses specifically for warehouses tab
  const loadWarehouses = async () => {
    try {
      if (!canViewWarehouses) {
        setErrorStates(prev => ({ 
          ...prev, 
          warehouses: 'Không có quyền xem dữ liệu kho (cần Read Warehouses)' 
        }));
        return;
      }
      const response = await warehouseApi.getWarehouses({ page: 1, limit: 1000 });
      setWarehouses(response.warehouses || []);
      setErrorStates(prev => ({ ...prev, warehouses: null }));
    } catch (error: any) {
      if (error?.response?.status === 403) {
        const errorMessage = error.response?.data?.message || 'Không có quyền truy cập dữ liệu kho (cần Read Warehouses)';
        setErrorStates(prev => ({ 
          ...prev, 
          warehouses: errorMessage
        }));
        toast({ title: "Lỗi", description: convertPermissionCodesInMessage(errorMessage), variant: "destructive" });
      } else {
        toast({ title: "Lỗi", description: convertPermissionCodesInMessage(error.response?.data?.message || error.message || 'Không thể tải danh sách kho'), variant: "destructive" });
      }
    }
  };
  const [newWarehouse, setNewWarehouse] = useState<{
    name: string;
    code: string;
    description: string;
    address: string;
    addressInfo: {
      provinceCode?: string;
      districtCode?: string;
      wardCode?: string;
      provinceName?: string;
      districtName?: string;
      wardName?: string;
    };
  }>({ 
    name: "", 
    code: "", 
    description: "", 
    address: "",
    addressInfo: {
      provinceCode: undefined,
      districtCode: undefined,
      wardCode: undefined,
      provinceName: undefined,
      districtName: undefined,
      wardName: undefined
    }
  });
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [isEditingWarehouse, setIsEditingWarehouse] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [newProduct, setNewProduct] = useState({
    name: '',
    code: '',
    category: '',
    costPrice: 0,
    price: 0,
    unit: 'cái',
    barcode: '',
    status: 'active'
  });
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const { user } = useAuth();
  // Permission checks removed - let backend handle authorization
  const canViewCostPrice = true; // Always show cost price - backend will handle access control
  const canManageWarehouses = true; // Always allow warehouse management - backend will handle access control
  const canManageProducts = true; // Always allow product management - backend will handle access control
  const loadData = async (searchParams?: { keyword?: string; category?: string }) => {
    try {
      // Don't fetch data if permissions are still loading
      if (permissionsLoading) {
        return;
      }
      const promises: Promise<any>[] = [];
      const promiseLabels: string[] = [];
      // Check permissions and set error states if no permissions
      if (!canViewProducts) {
        setErrorStates(prev => ({
          ...prev,
          products: 'Không có quyền xem dữ liệu sản phẩm (cần Read Products)'
        }));
      } else {
        const productParams: any = { page: 1, limit: 1000 };
        if (searchParams?.keyword) {
          productParams.keyword = searchParams.keyword;
        }
        if (searchParams?.category && searchParams.category !== 'all') {
          productParams.category = searchParams.category;
        }
        promises.push(
          productApi.getProducts(productParams).catch(error => {
            if (error?.response?.status === 403) {
              setErrorStates(prev => ({
                ...prev,
                products: 'Không có quyền truy cập dữ liệu sản phẩm (cần Read Products)'
              }));
            }
            return { products: [] };
          })
        );
        promiseLabels.push('products');
      }
      if (!canViewWarehouses) {
        setErrorStates(prev => ({ 
          ...prev, 
          warehouses: 'Không có quyền xem dữ liệu kho (cần Read Warehouses)' 
        }));
      } else {
        promises.push(
          warehouseApi.getWarehouses({ page: 1, limit: 1000 }).catch(error => {
            if (error?.response?.status === 403) {
              setErrorStates(prev => ({ 
                ...prev, 
                warehouses: 'Không có quyền truy cập dữ liệu kho (cần Read Warehouses)' 
              }));
            }
            return { warehouses: [] };
          })
        );
        promiseLabels.push('warehouses');
      }
      // Load stock levels for summary cards
      promises.push(
        stockLevelsApi.getStockLevels({ 
          page: 1, 
          limit: 1000,
          includeDeleted: false 
        }).catch(error => {
          if (error?.response?.status === 403) {
            setErrorStates(prev => ({ 
              ...prev, 
              stockLevels: 'Không có quyền truy cập dữ liệu tồn kho' 
            }));
          }
          return { stockLevels: [] };
        })
      );
      promiseLabels.push('stockLevels');
      // Load categories for mapping category IDs -> names
      promises.push(
        categoriesApi.getCategories({ page: 1, limit: 1000 }).catch(error => {
          return { categories: [] };
        })
      );
      promiseLabels.push('categories');
      // Load inventory overview from dashboard API (same as dashboard uses)
      promises.push(
        dashboardApi.getInventoryOverview().catch(error => {
          if (error?.response?.status === 403) {
            setErrorStates(prev => ({ 
              ...prev, 
              inventoryOverview: 'Không có quyền truy cập dữ liệu tồn kho' 
            }));
          }
          return {
            inventoryData: [],
            lowStockProducts: [],
            productStockData: [],
            totalProducts: 0,
            counts: {
              inStock: 0,
              lowStock: 0,
              outOfStock: 0,
            }
          };
        })
      );
      promiseLabels.push('inventoryOverview');
      if (promises.length > 0) {
        const responses = await Promise.all(promises);
        // Process responses
        let productsResponse = { products: [] };
        let warehousesResponse = { warehouses: [] };
        let stockLevelsResponse = { stockLevels: [] };
        let categoriesResponse = { categories: [] as Category[] };
        let inventoryOverviewResponse = {
          inventoryData: [],
          lowStockProducts: [],
          productStockData: [],
          totalProducts: 0,
          counts: {
            inStock: 0,
            lowStock: 0,
            outOfStock: 0,
          }
        };
        responses.forEach((response, index) => {
          const label = promiseLabels[index];
          if (label === 'products') {
            productsResponse = response;
          } else if (label === 'warehouses') {
            warehousesResponse = response;
          } else if (label === 'stockLevels') {
            stockLevelsResponse = response;
          } else if (label === 'categories') {
            categoriesResponse = response;
          } else if (label === 'inventoryOverview') {
            inventoryOverviewResponse = response;
          }
        });
        // Store inventory overview data
        setInventoryOverview(inventoryOverviewResponse);
        // Store stock levels
        setStockLevels(stockLevelsResponse.stockLevels || []);
        // Store categories (active and inactive)
        setCategories(categoriesResponse.categories || []);
        // Transform products to include stock information (mock data for now)
        const productsWithStock: ProductWithStock[] = (productsResponse.products || []).map(product => ({
          ...product,
          current_stock: Math.floor(Math.random() * 100), // Mock stock data
          location: `Kho A (KHO-A)`, // Mock location
          updated_at: product.updatedAt,
          warehouse_id: 'warehouse-1',
          warehouse_name: 'Kho A',
          warehouse_code: 'KHO-A'
        }));
        setProducts(productsWithStock);
        setWarehouses(warehousesResponse.warehouses || []);
      } else {
        // No permissions to load any data
        setProducts([]);
        setWarehouses([]);
        setCategories([]);
      }
    } catch (error) {
      // Don't show toast here - let the lazy loading error handling show the proper error interface
      throw error; // Re-throw for lazy loading error handling
    }
  };
  // Function to handle product updates with search parameters
  const handleProductsUpdate = (searchParams?: { keyword?: string; category?: string }) => {
    // Force a refresh by always updating the search params, even if they're the same
    // This ensures the useEffect triggers and loadData is called
    const newParams = searchParams || null;
    setCurrentSearchParams(newParams);
    // Also directly call loadData to ensure immediate refresh
    if (!permissionsLoading && canViewProducts) {
      loadData(newParams || undefined);
    }
  };

  // Lazy loading configuration
  const lazyData = useRouteBasedLazyData({
    inventory: {
      loadFunction: () => {
        if (!permissionsLoading && canViewProducts) {
          return loadData(currentSearchParams || undefined);
        }
      }
    }
  });
  const getStatusBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge variant="destructive">Hết hàng</Badge>;
    } else if (stock > 1 && stock < 100) {
      return <Badge variant="outline" className="text-orange-600 border-orange-600">Sắp hết</Badge>;
    } else {
      return <Badge variant="secondary" className="text-green-600 border-green-600">Còn hàng</Badge>;
    }
  };
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || 
                         (filterStatus === "in-stock" && product.current_stock >= 100) ||
                         (filterStatus === "low-stock" && product.current_stock > 1 && product.current_stock < 100) ||
                         (filterStatus === "out-of-stock" && product.current_stock === 0);
    const matchesCategory = filterCategory === "all" || 
                           (product.category && product.category.toLowerCase().includes(filterCategory.toLowerCase()));
    const matchesWarehouse = filterWarehouse === "all" ||
                            warehouses.find(w => 
                              (product.location?.includes(`(${w.code})`) || product.location?.includes(w.code)) &&
                              w.id === filterWarehouse
                            );
    return matchesSearch && matchesStatus && matchesCategory && matchesWarehouse;
  });
  // Get unique categories and warehouses for filters
  const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
  const usedWarehouses = warehouses.filter(w => 
    products.some(p => 
      p.location?.includes(`(${w.code})`) || p.location?.includes(w.code)
    )
  );
  // Sorting logic
  const sortedProducts = React.useMemo(() => {
    if (!sortConfig) return filteredProducts;
    return [...filteredProducts].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      switch (sortConfig.key) {
        case 'code':
          aValue = a.code;
          bValue = b.code;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'category':
          aValue = a.category || '';
          bValue = b.category || '';
          break;
        case 'current_stock':
          aValue = a.current_stock;
          bValue = b.current_stock;
          break;
        case 'cost_price':
          aValue = a.costPrice;
          bValue = b.costPrice;
          break;
        case 'unit_price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'warehouse':
          const warehouseA = warehouses.find(w => 
            a.location?.includes(`(${w.code})`) || a.location?.includes(w.code)
          );
          const warehouseB = warehouses.find(w => 
            b.location?.includes(`(${w.code})`) || b.location?.includes(w.code)
          );
          aValue = warehouseA?.name || a.location || '';
          bValue = warehouseB?.name || b.location || '';
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at);
          bValue = new Date(b.updated_at);
          break;
        default:
          return 0;
      }
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredProducts, sortConfig, warehouses]);
  // Warehouse sorting logic
  const sortedWarehouses = React.useMemo(() => {
    if (!warehouseSortConfig) return warehouses;
    return [...warehouses].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      switch (warehouseSortConfig.key) {
        case 'code':
          aValue = a.code;
          bValue = b.code;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'description':
          aValue = a.description || '';
          bValue = b.description || '';
          break;
        case 'address':
          aValue = a.address || '';
          bValue = b.address || '';
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        default:
          return 0;
      }
      if (aValue < bValue) {
        return warehouseSortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return warehouseSortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [warehouses, warehouseSortConfig]);
  // Pagination logic
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex);
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // Reset to first page
  };
  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig(prevConfig => {
      if (!prevConfig || prevConfig.key !== key) {
        return { key, direction: 'asc' };
      }
      if (prevConfig.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null; // Remove sorting
    });
  };
  // Handle warehouse sorting
  const handleWarehouseSort = (key: string) => {
    setWarehouseSortConfig(prevConfig => {
      if (!prevConfig || prevConfig.key !== key) {
        return { key, direction: 'asc' };
      }
      if (prevConfig.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null; // Remove sorting
    });
  };
  // Get sort icon
  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };
  // Get warehouse sort icon
  const getWarehouseSortIcon = (key: string) => {
    if (!warehouseSortConfig || warehouseSortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return warehouseSortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };
  const createWarehouse = async () => {
    if (!newWarehouse.name) {
      toast({ title: "Lỗi", description: "Tên kho là bắt buộc", variant: "destructive" });
      return;
    }
    // Validate address
    if (!newWarehouse.address || !newWarehouse.address.trim()) {
      toast({ title: "Lỗi", description: "Địa chỉ chi tiết là bắt buộc", variant: "destructive" });
      return;
    }
    if (!newWarehouse.addressInfo?.provinceCode || !newWarehouse.addressInfo?.districtCode || !newWarehouse.addressInfo?.wardCode) {
      toast({ title: "Lỗi", description: "Vui lòng chọn đầy đủ Tỉnh/TP, Quận/Huyện và Phường/Xã", variant: "destructive" });
      return;
    }
    try {
      const createResp: any = await warehouseApi.createWarehouse({
        name: newWarehouse.name,
        ...(newWarehouse.code && { code: newWarehouse.code }),
        description: newWarehouse.description,
        address: newWarehouse.address,
        addressInfo: {
          provinceCode: newWarehouse.addressInfo?.provinceCode || undefined,
          districtCode: newWarehouse.addressInfo?.districtCode || undefined,
          wardCode: newWarehouse.addressInfo?.wardCode || undefined
        }
      });
      toast({ title: "Thành công", description: "Đã tạo kho mới" });
      setNewWarehouse({
        name: "",
        code: "",
        description: "",
        address: "",
        addressInfo: {
          provinceCode: undefined,
          districtCode: undefined,
          wardCode: undefined,
          provinceName: undefined,
          districtName: undefined,
          wardName: undefined
        }
      });
      setIsEditingWarehouse(false);
      setEditingWarehouse(null);
      loadData(currentSearchParams || undefined);
      // Close the warehouse creation form
      setIsEditingWarehouse(false);
    } catch (error: any) {
      toast({ title: "Lỗi", description: convertPermissionCodesInMessage(error.response?.data?.message || error.message || "Không thể tạo kho"), variant: "destructive" });
    }
  };
  const deleteWarehouse = async (id: string) => {
    try {
      const resp = await warehouseApi.deleteWarehouse(id);
      toast({ title: "Thành công", description: resp.message || "Đã xóa kho" });
      loadData(currentSearchParams || undefined); // Reload data
    } catch (error: any) {
      toast({ title: "Lỗi", description: convertPermissionCodesInMessage(error.response?.data?.message || error.message || "Không thể xóa kho"), variant: "destructive" });
    }
  };
  const startEditWarehouse = (warehouse: any) => {
    setEditingWarehouse(warehouse);
    setNewWarehouse({
      name: warehouse.name,
      code: warehouse.code,
      description: warehouse.description || "",
      address: warehouse.address || "",
      addressInfo: {
        provinceCode: warehouse.addressInfo?.provinceCode ?? warehouse.addressInfo?.province?.code ?? '',
        districtCode: warehouse.addressInfo?.districtCode ?? warehouse.addressInfo?.district?.code ?? '',
        wardCode: warehouse.addressInfo?.wardCode ?? warehouse.addressInfo?.ward?.code ?? '',
        provinceName: warehouse.addressInfo?.province?.name ?? warehouse.addressInfo?.provinceName ?? '',
        districtName: warehouse.addressInfo?.district?.name ?? warehouse.addressInfo?.districtName ?? '',
        wardName: warehouse.addressInfo?.ward?.name ?? warehouse.addressInfo?.wardName ?? ''
      }
    });
    setIsEditingWarehouse(true);
  };
  const cancelEditWarehouse = () => {
    setEditingWarehouse(null);
    setNewWarehouse({ 
      name: "", 
      code: "", 
      description: "", 
      address: "",
      addressInfo: {
        provinceCode: undefined,
        districtCode: undefined,
        wardCode: undefined,
        provinceName: undefined,
        districtName: undefined,
        wardName: undefined
      }
    });
    setIsEditingWarehouse(false);
  };
  const updateWarehouse = async () => {
    if (!newWarehouse.name) {
      toast({ title: "Lỗi", description: "Tên kho là bắt buộc", variant: "destructive" });
      return;
    }
    try {
      const updateResp: any = await warehouseApi.updateWarehouse(editingWarehouse.id, {
        name: newWarehouse.name,
        ...(newWarehouse.code && { code: newWarehouse.code }),
        description: newWarehouse.description,
        address: newWarehouse.address,
        addressInfo: {
          provinceCode: newWarehouse.addressInfo?.provinceCode || undefined,
          districtCode: newWarehouse.addressInfo?.districtCode || undefined,
          wardCode: newWarehouse.addressInfo?.wardCode || undefined
        }
      });
      toast({ title: "Thành công", description: "Đã cập nhật thông tin kho" });
      cancelEditWarehouse();
      loadData(currentSearchParams || undefined);
      // Ensure editing form is closed
      setIsEditingWarehouse(false);
    } catch (error: any) {
      toast({ title: "Lỗi", description: convertPermissionCodesInMessage(error.response?.data?.message || error.message || "Không thể cập nhật kho"), variant: "destructive" });
    }
  };
  const handleImportComplete = async (importedData: any[]) => {
    loadData(currentSearchParams || undefined);
  };
  const addProduct = async () => {
    if (!newProduct.name) {
      toast({ title: "Lỗi", description: 'Tên sản phẩm là bắt buộc', variant: "destructive" });
      return;
    }
    if (!newProduct.price || newProduct.price <= 0) {
      toast({ title: "Lỗi", description: 'Giá bán phải lớn hơn 0', variant: "destructive" });
      return;
    }
    try {
      setIsAddingProduct(true);
      const createProductResp: any = await productApi.createProduct({
        name: newProduct.name,
        ...(newProduct.code && { code: newProduct.code }), // Only include code if provided
        category: newProduct.category,
        unit: newProduct.unit,
        price: newProduct.price,
        ...(newProduct.costPrice && { costPrice: newProduct.costPrice }) // Include costPrice if provided
      });
      toast({ title: "Thành công", description: createProductResp?.message || 'Đã thêm sản phẩm vào danh mục!' });
      loadData(currentSearchParams || undefined); // Refresh data
      setNewProduct({
        name: '',
        code: '',
        category: '',
        costPrice: 0,
        price: 0,
        unit: 'cái',
        barcode: '',
        status: 'active'
      });
      setIsAddProductDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Lỗi", description: convertPermissionCodesInMessage(error.response?.data?.message || error.message || 'Có lỗi khi thêm sản phẩm'), variant: "destructive" });
    } finally {
      setIsAddingProduct(false);
    }
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0
    }).format(amount);
  };
  const exportToExcel = () => {
    // Prepare data for export
    const exportData = sortedProducts.map((product, index) => {
      const warehouse = warehouses.find(w => 
        product.location?.includes(`(${w.code})`) || product.location?.includes(w.code)
      );
      const exportItem: any = {
        'STT': index + 1,
        'Mã sản phẩm': product.code,
        'Tên sản phẩm': product.name,
        'Loại': product.category || '',
        'Tồn kho': product.current_stock,
        'Đơn vị': product.unit || 'cái',
        'Giá bán': product.price || 0,
        'Kho': warehouse?.name || product.location || '',
        'Trạng thái': product.current_stock === 0 ? 'Hết hàng' : 
                     (product.current_stock > 1 && product.current_stock < 100) ? 'Sắp hết' : 'Còn hàng',
        'Cập nhật': product.updated_at ? new Date(product.updated_at).toLocaleDateString('vi-VN') : ''
      };
      // Only add cost price if user can view it
      if (canViewCostPrice) {
        exportItem['Giá vốn'] = product.costPrice || 0;
      }
      return exportItem;
    });
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    // Set column widths
    const colWidths = [
      { wch: 5 },   // STT
      { wch: 15 },  // Mã sản phẩm
      { wch: 30 },  // Tên sản phẩm
      { wch: 15 },  // Loại
      { wch: 10 },  // Tồn kho
      { wch: 10 },  // Đơn vị
    ];
    if (canViewCostPrice) {
      colWidths.push({ wch: 15 }); // Giá vốn
    }
    colWidths.push(
      { wch: 15 },  // Giá bán
      { wch: 20 },  // Kho
      { wch: 12 },  // Trạng thái
      { wch: 12 }   // Cập nhật
    );
    ws['!cols'] = colWidths;
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách sản phẩm');
    // Generate filename with current date
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN').replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false }).replace(/:/g, '-');
    const filename = `Danh_sach_san_pham_${dateStr}_${timeStr}.xlsx`;
    // Write and download file
    XLSX.writeFile(wb, filename);
    toast({ title: "Thành công", description: `Đã xuất ${exportData.length} sản phẩm ra file Excel` });
  };
  // Component to show permission error for summary cards
  const PermissionErrorCard = ({ title, error }: { title: string; error: string | null }) => {
    if (!error) return null;
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Lock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  };
  const inventoryState = lazyData.getDataState('inventory');
  if (inventoryState.isLoading) {
    return (
      <Loading 
        message="Đang tải dữ liệu kho..."
      />
    );
  }
  if (inventoryState.error) {
    return (
      <Loading 
        error={inventoryState.error}
        onRetry={() => {
          if (!permissionsLoading && canViewProducts) {
            loadData(currentSearchParams || undefined);
          }
        }}
        isUnauthorized={inventoryState.error.includes('403') || inventoryState.error.includes('401')}
      />
    );
  }
  return (
    <div className="min-h-screen bg-background space-y-4 p-6 sm:p-6 md:p-7">
      <div className="mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">Quản Lý Tồn Kho</h1>
          <p className="text-muted-foreground">Theo dõi và quản lý hàng tồn kho</p>
        </div>
        {/* Thống kê nhanh */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {errorStates.products ? (
            <PermissionErrorCard title="Tổng Sản Phẩm" error={errorStates.products} />
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Sản Phẩm</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{products.length}</div>
              </CardContent>
            </Card>
          )}
          {(() => {
            // Read counts directly from API response (same as dashboard)
            let inStockCount = 0;
            let lowStockCount = 0;
            let outOfStockCount = 0;
            if (inventoryOverview && !errorStates.inventoryOverview && inventoryOverview.counts) {
              // Use counts from API response
              inStockCount = inventoryOverview.counts.inStock || 0;
              lowStockCount = inventoryOverview.counts.lowStock || 0;
              outOfStockCount = inventoryOverview.counts.outOfStock || 0;
            } else {
              // Fallback to client-side calculation if API data not available
              const productStockMap = new Map<string, number>();
              stockLevels.forEach(stock => {
                const currentTotal = productStockMap.get(stock.productId) || 0;
                productStockMap.set(stock.productId, currentTotal + stock.quantity);
              });
              inStockCount = products.filter(p => {
                const totalStock = productStockMap.get(p.id) || 0;
                const threshold = p.lowStockThreshold ?? 100;
                return totalStock > threshold;
              }).length;
              lowStockCount = products.filter(p => {
                const totalStock = productStockMap.get(p.id) || 0;
                const threshold = p.lowStockThreshold ?? 100;
                return totalStock > 0 && totalStock <= threshold;
              }).length;
              outOfStockCount = products.filter(p => {
                const totalStock = productStockMap.get(p.id) || 0;
                return totalStock === 0;
              }).length;
            }
            return (
              <>
                {errorStates.products || errorStates.stockLevels || errorStates.inventoryOverview ? (
                  <PermissionErrorCard title="Còn Hàng" error={errorStates.products || errorStates.stockLevels || errorStates.inventoryOverview} />
                ) : (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Còn Hàng</CardTitle>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {inStockCount}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {errorStates.products || errorStates.stockLevels || errorStates.inventoryOverview ? (
                  <PermissionErrorCard title="Sắp Hết" error={errorStates.products || errorStates.stockLevels || errorStates.inventoryOverview} />
                ) : (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Sắp Hết</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {lowStockCount}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {errorStates.products || errorStates.stockLevels || errorStates.inventoryOverview ? (
                  <PermissionErrorCard title="Hết Hàng" error={errorStates.products || errorStates.stockLevels || errorStates.inventoryOverview} />
                ) : (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Hết Hàng</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {outOfStockCount}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </div>
        {/* Tabs for different sections */}
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          setSearchParams({ tab: value });
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="inventory">Báo cáo tồn kho</TabsTrigger>
            <TabsTrigger value="products">Danh sách sản phẩm</TabsTrigger>
            <TabsTrigger value="categories">Loại Sản Phẩm</TabsTrigger>
            <TabsTrigger value="warehouses">
              <WarehouseIcon className="w-4 h-4 mr-2" />
              Quản lý kho
            </TabsTrigger>
          </TabsList>
           {/* Inventory Stock Tab */}
           <TabsContent value="inventory" className="space-y-6">
             <PermissionGuard 
               requiredPermissions={['STOCK_LEVELS_VIEW', 'PRODUCTS_VIEW', 'WAREHOUSES_VIEW']}
               requireAll={true}
             >
               <InventoryStock 
                 products={products}
                 warehouses={warehouses}
                 categories={categories}
                 canViewCostPrice={canViewCostPrice}
               />
             </PermissionGuard>
           </TabsContent>
          {/* Products List Tab */}
          <TabsContent value="products" className="space-y-6">
            <PermissionGuard requiredPermissions={['PRODUCTS_VIEW']}>
              <ProductList
                products={products}
                warehouses={warehouses}
                canViewCostPrice={canViewCostPrice}
                canManageProducts={canManageProducts}
                onProductsUpdate={handleProductsUpdate}
                importJobs={importJobs}
                activeJobId={activeJobId}
                onActiveJobIdChange={setActiveJobId}
                onImportJobsChange={setImportJobs}
                onRefreshImportJobs={refreshImportJobs}
                jobHistoryPagination={jobHistoryPagination}
              />
            </PermissionGuard>
          </TabsContent>
          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <PermissionGuard requiredPermissions={['CATEGORIES_VIEW']}>
              <CategoriesContent embedded={true} />
            </PermissionGuard>
          </TabsContent>
          {/* Warehouses Management Tab */}
          <TabsContent value="warehouses" className="space-y-6">
            <PermissionGuard requiredPermissions={['WAREHOUSES_VIEW']}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <WarehouseIcon className="w-5 h-5" />
                  Quản Lý Kho
                </CardTitle>
                <CardDescription>Tạo và quản lý các kho hàng</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add New Warehouse Form */}
                {canManageWarehouses && (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <h4 className="font-medium mb-4">
                      {isEditingWarehouse ? 'Chỉnh sửa kho' : 'Thêm kho mới'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="warehouse-name">Tên kho <span className="text-red-500">*</span></Label>
                        <Input
                          id="warehouse-name"
                          value={newWarehouse.name}
                          onChange={(e) => setNewWarehouse(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Nhập tên kho"
                        />
                      </div>
                      <div>
                        <Label htmlFor="warehouse-code">Mã kho (tùy chọn)</Label>
                        <Input
                          id="warehouse-code"
                          value={newWarehouse.code}
                          onChange={(e) => setNewWarehouse(prev => ({ ...prev, code: e.target.value }))}
                          placeholder="Để trống để hệ thống tự tạo"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="warehouse-description">Mô tả</Label>
                        <Textarea
                          id="warehouse-description"
                          value={newWarehouse.description}
                          onChange={(e) => setNewWarehouse(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Mô tả kho"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Địa chỉ kho <span className="text-red-500">*</span></Label>
                        <AddressFormSeparate
                          key={isEditingWarehouse ? `edit-${editingWarehouse?.id}` : 'create'}
                          value={{
                            address: newWarehouse.address || '',
                            provinceCode: newWarehouse.addressInfo?.provinceCode,
                            districtCode: newWarehouse.addressInfo?.districtCode,
                            wardCode: newWarehouse.addressInfo?.wardCode,
                            provinceName: newWarehouse.addressInfo?.provinceName,
                            districtName: newWarehouse.addressInfo?.districtName,
                            wardName: newWarehouse.addressInfo?.wardName
                          }}
                          onChange={(data) => {
                            setNewWarehouse(prev => ({
                              ...prev,
                              address: data.address || '',
                              addressInfo: {
                                provinceCode: data.provinceCode || undefined,
                                districtCode: data.districtCode || undefined,
                                wardCode: data.wardCode || undefined,
                                provinceName: data.provinceName || undefined,
                                districtName: data.districtName || undefined,
                                wardName: data.wardName || undefined
                              }
                            }));
                          }}
                          required={true}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      {isEditingWarehouse ? (
                        <>
                          <Button variant="outline" onClick={cancelEditWarehouse}>
                            Hủy
                          </Button>
                          <Button onClick={updateWarehouse}>
                            <Edit className="w-4 h-4 mr-2" />
                            Cập nhật
                          </Button>
                        </>
                      ) : (
                        <Button onClick={createWarehouse}>
                          <Plus className="w-4 h-4 mr-2" />
                          Tạo Kho
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                {/* Warehouses List */}
                <div className="rounded-md border overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                         <TableHead 
                           className="cursor-pointer hover:bg-muted/50"
                           onClick={() => handleWarehouseSort('code')}
                         >
                           Mã Kho
                           {getWarehouseSortIcon('code')}
                         </TableHead>
                         <TableHead 
                           className="cursor-pointer hover:bg-muted/50"
                           onClick={() => handleWarehouseSort('name')}
                         >
                           Tên Kho
                           {getWarehouseSortIcon('name')}
                         </TableHead>
                         <TableHead 
                           className="cursor-pointer hover:bg-muted/50"
                           onClick={() => handleWarehouseSort('description')}
                         >
                           Mô Tả
                           {getWarehouseSortIcon('description')}
                         </TableHead>
                         <TableHead 
                           className="cursor-pointer hover:bg-muted/50"
                           onClick={() => handleWarehouseSort('address')}
                         >
                           Địa Chỉ
                           {getWarehouseSortIcon('address')}
                         </TableHead>
                         <TableHead 
                           className="cursor-pointer hover:bg-muted/50"
                           onClick={() => handleWarehouseSort('createdAt')}
                         >
                           Ngày Tạo
                           {getWarehouseSortIcon('createdAt')}
                         </TableHead>
                         {canManageWarehouses && <TableHead>Thao Tác</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedWarehouses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={canManageWarehouses ? 6 : 5} className="text-center py-8 text-muted-foreground">
                            Chưa có kho nào
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedWarehouses.map((warehouse) => (
                          <TableRow key={warehouse.id}>
                            <TableCell className="font-medium">{warehouse.code}</TableCell>
                            <TableCell>{warehouse.name}</TableCell>
                            <TableCell>{warehouse.description || '-'}</TableCell>
                            <TableCell>{warehouse.address || '-'}</TableCell>
                            <TableCell>
                              {new Date(warehouse.createdAt).toLocaleDateString('vi-VN')}
                             </TableCell>
                             {canManageWarehouses && (
                               <TableCell>
                                 <div className="flex gap-2">
                                   <Button
                                     variant="outline"
                                     size="sm"
                                     onClick={() => startEditWarehouse(warehouse)}
                                     className="text-blue-600 hover:text-blue-700"
                                   >
                                     <Edit className="w-4 h-4 mr-1" />
                                     Sửa
                                   </Button>
                                   <Button
                                     variant="outline"
                                     size="sm"
                                     onClick={() => deleteWarehouse(warehouse.id)}
                                     className="text-red-600 hover:text-red-700"
                                   >
                                     <Trash2 className="w-4 h-4 mr-1" />
                                     Xóa
                                   </Button>
                                 </div>
                               </TableCell>
                             )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            </PermissionGuard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
const Inventory = () => {
  return <InventoryContent />;
};
export default Inventory;
