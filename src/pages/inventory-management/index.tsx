import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, AlertTriangle, CheckCircle, Warehouse as WarehouseIcon, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouteBasedLazyData } from "@/hooks/useLazyData";
import { Loading } from "@/components/ui/loading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { productApi, type Product, type ProductWithStock } from "@/api/product.api";
import { warehouseApi, type Warehouse } from "@/api/warehouse.api";
import { convertPermissionCodesInMessage } from "@/utils/permissionMessageConverter";

import React from "react";
import { InventoryReport, ProductManagement, WarehouseManagement } from "./view";


const InventoryContent = () => {

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterWarehouse, setFilterWarehouse] = useState("all");
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [warehouseSortConfig, setWarehouseSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
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
    // Temporarily commented - BE not ready for address components
    // addressData: {
    //   province_code: '',
    //   province_name: '',
    //   district_code: '',
    //   district_name: '',
    //   ward_code: '',
    //   ward_name: '',
    //   address_detail: ''
    // }
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

  // Đã xóa kiểm tra quyền - để backend xử lý ủy quyền
  const canViewCostPrice = true; // Luôn hiển thị giá vốn - backend sẽ xử lý kiểm soát truy cập
  const canManageWarehouses = true; // Luôn cho phép quản lý kho - backend sẽ xử lý kiểm soát truy cập
  const canManageProducts = true; // Luôn cho phép quản lý sản phẩm - backend sẽ xử lý kiểm soát truy cập

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
        price: newProduct.price
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inventory">Báo cáo tồn kho</TabsTrigger>
            <TabsTrigger value="products">Danh sách sản phẩm</TabsTrigger>
            <TabsTrigger value="warehouses">
              <WarehouseIcon className="w-4 h-4 mr-2" />
              Quản lý kho
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-6">
            <InventoryReport
              products={products}
              warehouses={warehouses}
              canViewCostPrice={canViewCostPrice}
            />
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <ProductManagement
              products={products}
              warehouses={warehouses}
              canViewCostPrice={canViewCostPrice}
              canManageProducts={canManageProducts}
              loadData={loadData}
            />
          </TabsContent>

          <TabsContent value="warehouses" className="space-y-6">
            <WarehouseManagement
              warehouses={sortedWarehouses}
              canManageWarehouses={canManageWarehouses}
            />
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

