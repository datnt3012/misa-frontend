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
import { productApi, type Product, type ProductWithStock } from "@/api/product.api";
import { warehouseApi, type Warehouse } from "@/api/warehouse.api";
import { convertPermissionCodesInMessage } from "@/utils/permissionMessageConverter";

import React from "react";

const InventoryContent = () => {
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterWarehouse, setFilterWarehouse] = useState("all");
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);
  const [warehouseSortConfig, setWarehouseSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [activeTab, setActiveTab] = useState("inventory");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorStates, setErrorStates] = useState({
    products: null as string | null,
    warehouses: null as string | null
  });

  // Permission checks
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const canViewProducts = hasPermission('PRODUCTS_READ');
  const canViewWarehouses = hasPermission('WAREHOUSES_READ') || true; // Temporarily bypass for testing
  
  // Clear error states when permissions are available
  useEffect(() => {
    if (canViewProducts && canViewWarehouses) {
      setErrorStates({ products: null, warehouses: null });
    }
  }, [canViewProducts, canViewWarehouses]);

  // Trigger data fetch when permissions are loaded
  useEffect(() => {
    if (!permissionsLoading) {
      loadData();
    }
  }, [permissionsLoading, canViewProducts, canViewWarehouses]);

  // Load warehouses when warehouses tab is active
  useEffect(() => {
    if (activeTab === 'warehouses' && canViewWarehouses && !permissionsLoading) {
      loadWarehouses();
    }
  }, [activeTab, canViewWarehouses, permissionsLoading]);

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
      console.error('Error loading warehouses:', error);
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

  const [newWarehouse, setNewWarehouse] = useState({ 
    name: "", 
    code: "", 
    description: "", 
    address: "",
    addressInfo: {
      provinceCode: '',
      districtCode: '',
      wardCode: ''
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
  const { toast } = useToast();

  // Permission checks removed - let backend handle authorization
  const canViewCostPrice = true; // Always show cost price - backend will handle access control
  const canManageWarehouses = true; // Always allow warehouse management - backend will handle access control
  const canManageProducts = true; // Always allow product management - backend will handle access control

  const loadData = async () => {
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
        promises.push(
          productApi.getProducts({ page: 1, limit: 1000 }).catch(error => {
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

      if (promises.length > 0) {
        const responses = await Promise.all(promises);
        
        // Process responses
        let productsResponse = { products: [] };
        let warehousesResponse = { warehouses: [] };
        
        responses.forEach((response, index) => {
          const label = promiseLabels[index];
          if (label === 'products') {
            productsResponse = response;
          } else if (label === 'warehouses') {
            warehousesResponse = response;
          }
        });

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
      }
    } catch (error) {
      // Don't show toast here - let the lazy loading error handling show the proper error interface
      throw error; // Re-throw for lazy loading error handling
    }
  };

  // Lazy loading configuration
  const lazyData = useRouteBasedLazyData({
    inventory: {
      loadFunction: loadData
    }
  });



  const getStatusBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge variant="destructive">Hết hàng</Badge>;
    } else if (stock < 10) {
      return <Badge variant="outline" className="text-orange-600 border-orange-600">Sắp hết</Badge>;
    } else {
      return <Badge variant="secondary" className="text-green-600 border-green-600">Còn hàng</Badge>;
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || 
                         (filterStatus === "in-stock" && product.current_stock >= 10) ||
                         (filterStatus === "low-stock" && product.current_stock > 0 && product.current_stock < 10) ||
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
          provinceCode: '',
          districtCode: '',
          wardCode: ''
        }
      });
      loadData();
    } catch (error: any) {
      toast({ title: "Lỗi", description: convertPermissionCodesInMessage(error.response?.data?.message || error.message || "Không thể tạo kho"), variant: "destructive" });
    }
  };

  const deleteWarehouse = async (id: string) => {
    try {
      const resp = await warehouseApi.deleteWarehouse(id);

      toast({ title: "Thành công", description: resp.message || "Đã xóa kho" });
      loadData(); // Reload data
    } catch (error: any) {
      toast({ title: "Lỗi", description: convertPermissionCodesInMessage(error.response?.data?.message || error.message || "Không thể xóa kho"), variant: "destructive" });
    }
  };

  const startEditWarehouse = (warehouse: any) => {
    console.log('🔍 Editing warehouse:', warehouse);
    console.log('🔍 Warehouse addressInfo:', warehouse.addressInfo);
    
    setEditingWarehouse(warehouse);
    setNewWarehouse({
      name: warehouse.name,
      code: warehouse.code,
      description: warehouse.description || "",
      address: warehouse.address || "",
      addressInfo: {
        provinceCode: warehouse.addressInfo?.provinceCode ?? warehouse.addressInfo?.province?.code ?? '',
        districtCode: warehouse.addressInfo?.districtCode ?? warehouse.addressInfo?.district?.code ?? '',
        wardCode: warehouse.addressInfo?.wardCode ?? warehouse.addressInfo?.ward?.code ?? ''
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
        provinceCode: '',
        districtCode: '',
        wardCode: ''
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
      loadData();
    } catch (error: any) {
      toast({ title: "Lỗi", description: convertPermissionCodesInMessage(error.response?.data?.message || error.message || "Không thể cập nhật kho"), variant: "destructive" });
    }
  };

  const handleImportComplete = async (importedData: any[]) => {
    loadData();
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
      loadData(); // Refresh data
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
        'Giá bán (VND)': product.price || 0,
        'Kho': warehouse?.name || product.location || '',
        'Trạng thái': product.current_stock === 0 ? 'Hết hàng' : 
                     product.current_stock < 10 ? 'Sắp hết' : 'Còn hàng',
        'Cập nhật': product.updated_at ? new Date(product.updated_at).toLocaleDateString('vi-VN') : ''
      };

      // Only add cost price if user can view it
      if (canViewCostPrice) {
        exportItem['Giá vốn (VND)'] = product.costPrice || 0;
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
        onRetry={() => lazyData.reloadData('inventory')}
        isUnauthorized={inventoryState.error.includes('403') || inventoryState.error.includes('401')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
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
          
          {errorStates.products ? (
            <PermissionErrorCard title="Còn Hàng" error={errorStates.products} />
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Còn Hàng</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {products.filter(p => p.current_stock >= 10).length}
                </div>
              </CardContent>
            </Card>
          )}
          
          {errorStates.products ? (
            <PermissionErrorCard title="Sắp Hết" error={errorStates.products} />
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sắp Hết</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {products.filter(p => p.current_stock > 0 && p.current_stock < 10).length}
                </div>
              </CardContent>
            </Card>
          )}
          
          {errorStates.products ? (
            <PermissionErrorCard title="Hết Hàng" error={errorStates.products} />
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hết Hàng</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {products.filter(p => p.current_stock === 0).length}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tabs for different sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inventory">Báo cáo tồn kho</TabsTrigger>
            <TabsTrigger value="products">Danh sách sản phẩm</TabsTrigger>
            <TabsTrigger value="warehouses">
              <WarehouseIcon className="w-4 h-4 mr-2" />
              Quản lý kho
            </TabsTrigger>
          </TabsList>

           {/* Inventory Stock Tab */}
           <TabsContent value="inventory" className="space-y-6">
             <PermissionGuard 
               requiredPermissions={['INVENTORY_VIEW', 'PRODUCTS_VIEW', 'WAREHOUSES_VIEW']}
               requireAll={true}
             >
               <InventoryStock 
                 products={products}
                 warehouses={warehouses}
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
                onProductsUpdate={loadData}
              />
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
                        <Label htmlFor="warehouse-name">Tên kho *</Label>
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
                        <Label>Địa chỉ kho</Label>
                        <AddressFormSeparate
                          value={(() => {
                            const value = {
                              address: newWarehouse.address,
                              provinceCode: (editingWarehouse as any)?.addressInfo?.provinceCode ?? (editingWarehouse as any)?.addressInfo?.province?.code ?? newWarehouse.addressInfo?.provinceCode,
                              districtCode: (editingWarehouse as any)?.addressInfo?.districtCode ?? (editingWarehouse as any)?.addressInfo?.district?.code ?? newWarehouse.addressInfo?.districtCode,
                              wardCode: (editingWarehouse as any)?.addressInfo?.wardCode ?? (editingWarehouse as any)?.addressInfo?.ward?.code ?? newWarehouse.addressInfo?.wardCode,
                              provinceName: (editingWarehouse as any)?.addressInfo?.province?.name ?? newWarehouse.addressInfo?.provinceName,
                              districtName: (editingWarehouse as any)?.addressInfo?.district?.name ?? newWarehouse.addressInfo?.districtName,
                              wardName: (editingWarehouse as any)?.addressInfo?.ward?.name ?? newWarehouse.addressInfo?.wardName
                            };
                            console.log('🔍 AddressFormSeparate value:', value);
                            return value;
                          })()}
                          onChange={(data) => {
                            setNewWarehouse(prev => ({
                              ...prev,
                              address: data.address,
                              addressInfo: {
                                provinceCode: data.provinceCode,
                                districtCode: data.districtCode,
                                wardCode: data.wardCode
                              }
                            }));
                          }}
                          required={false}
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

