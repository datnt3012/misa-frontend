import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Search, Download, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import React from "react";
import { productApi, ProductWithStock, Product } from "@/api/product.api";
import { Category } from "@/api/categories.api";
import { convertPermissionCodesInMessage } from "@/utils/permissionMessageConverter";
interface InventoryStockProps {
  warehouses: any[];
  categories: Category[];
  canViewCostPrice: boolean;
}
type ProductWithStockExtended = ProductWithStock & { categoryName?: string };
const InventoryStock: React.FC<InventoryStockProps> = ({
  warehouses,
  categories,
  canViewCostPrice
}) => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [allProducts, setAllProducts] = useState<Product[]>([]); // Store all products for filter options
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterWarehouse, setFilterWarehouse] = useState("all");
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  // Load products from API with pagination
  const loadProducts = React.useCallback(async () => {
    try {
      setLoadingProducts(true);
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };
      if (debouncedSearchTerm) {
        params.keyword = debouncedSearchTerm;
      }
      if (filterCategory !== 'all') {
        params.category = filterCategory;
      }
      // Apply warehouse filter
      if (filterWarehouse !== 'all') {
        params.warehouse = filterWarehouse;
      }
      // Apply status filter - convert UI filter to API format
      if (filterStatus !== 'all') {
        if (filterStatus === 'in-stock') {
          params.stockStatus = 'in_stock';
        } else if (filterStatus === 'low-stock') {
          params.stockStatus = 'low_stock';
        } else if (filterStatus === 'out-of-stock') {
          params.stockStatus = 'out_of_stock';
        }
      }
      
      const response = await productApi.getProducts(params);
      setProducts(response.products || []);
      setTotalProducts(response.total || 0);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể tải danh sách sản phẩm';
      toast({
        title: "Lỗi",
        description: convertPermissionCodesInMessage(errorMessage),
        variant: "destructive",
      });
      setProducts([]);
      setTotalProducts(0);
    } finally {
      setLoadingProducts(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearchTerm, filterCategory, filterStatus, filterWarehouse, toast]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load all products for filter options (without filters, just first page to get categories and warehouses)
  const loadAllProductsForOptions = React.useCallback(async () => {
    try {
      const response = await productApi.getProducts({ 
        page: 1, 
        limit: 1000 
      });
      setAllProducts(response.products || []);
    } catch (error: any) {
      // Silently fail - filter options will be empty
      setAllProducts([]);
    }
  }, []);

  // Load all products for filter options on mount
  useEffect(() => {
    loadAllProductsForOptions();
  }, [loadAllProductsForOptions]);

  // Load products when pagination or filters change
  useEffect(() => {
    loadProducts();
  }, [currentPage, itemsPerPage, debouncedSearchTerm, filterCategory, filterStatus, filterWarehouse, loadProducts]);
  const findCategoryByValue = (value?: string | null) => {
    if (!value) return undefined;
    const trimmed = value.toString().trim();
    if (!trimmed) return undefined;
    return categories.find(
      (cat) => cat.id === trimmed || cat.name.toLowerCase() === trimmed.toLowerCase()
    );
  };
  const getCategoryId = (value?: string | null) => findCategoryByValue(value)?.id || (value ?? '') as string;
  const getCategoryName = (value?: string | null) => findCategoryByValue(value)?.name || (value ?? '') as string;
  
  // Helper function to check if a stock level matches the status filter
  const matchesStatusFilter = (quantity: number, lowStockThreshold: number | null | undefined, statusFilter: string): boolean => {
    if (statusFilter === 'all') return true;
    
    const threshold = lowStockThreshold != null ? Number(lowStockThreshold) : null;
    
    if (statusFilter === 'out-of-stock') {
      return quantity === 0;
    }
    
    if (statusFilter === 'low-stock') {
      // low_stock: 0 < quantity <= lowStockThreshold (chỉ khi product có lowStockThreshold)
      return threshold != null && threshold > 0 && quantity > 0 && quantity <= threshold;
    }
    
    if (statusFilter === 'in-stock') {
      // in_stock: quantity > lowStockThreshold (nếu có threshold) hoặc quantity > 0 (nếu không có threshold)
      if (threshold != null && threshold > 0) {
        return quantity > threshold;
      }
      return quantity > 0;
    }
    
    return true;
  };

  // Create products with stock information - one row per warehouse
  // Use useMemo to ensure it recalculates when products change
  const productsWithStock: ProductWithStockExtended[] = React.useMemo(() => {
    const hasActiveStockFilter = filterStatus !== 'all' || filterWarehouse !== 'all';
    
    return products.flatMap(product => {
      const categoryId = getCategoryId(product.category);
      const categoryName = getCategoryName(product.category);
      
      // Get stock levels from product.stockLevel (from API)
      let productStockLevels = product.stockLevel || [];
      
      // Filter stock levels by status if status filter is active
      if (filterStatus !== 'all') {
        const threshold = product.lowStockThreshold != null ? Number(product.lowStockThreshold) : null;
        productStockLevels = productStockLevels.filter(stock => {
          return matchesStatusFilter(stock.quantity, threshold, filterStatus);
        });
      }
      
      // Filter stock levels by warehouse if warehouse filter is active
      if (filterWarehouse !== 'all') {
        productStockLevels = productStockLevels.filter(stock => {
          return stock.warehouse?.id === filterWarehouse;
        });
      }
      
      // If no stock levels after filtering, return empty array if filter is active
      if (productStockLevels.length === 0) {
        // If stock filter is active, don't show products without matching stock
        if (hasActiveStockFilter) {
          return [];
        }
        // If no filter, show product with zero stock
        return [{
          ...product,
          category: categoryId,
          categoryName,
          current_stock: 0,
          location: 'Chưa có tồn kho',
          updated_at: product.updatedAt,
          warehouse_id: '',
          warehouse_name: '',
          warehouse_code: ''
        }];
      }
      
      // Create one row for each warehouse
      return productStockLevels.map(stock => ({
        ...product,
        category: categoryId,
        categoryName,
        current_stock: stock.quantity,
        location: stock.warehouse ? `${stock.warehouse.name}${stock.warehouse.code ? ` (${stock.warehouse.code})` : ''}` : 'Không xác định',
        updated_at: stock.updatedAt,
        warehouse_id: stock.warehouse?.id || '',
        warehouse_name: stock.warehouse?.name || '',
        warehouse_code: stock.warehouse?.code || '',
        // Use lowStockThreshold from product
        lowStockThreshold: (() => {
          const threshold = product.lowStockThreshold;
          if (threshold == null) return null;
          const num = Number(threshold);
          return isNaN(num) ? null : num;
        })()
      }));
    });
  }, [products, categories, filterStatus, filterWarehouse]);
  const getStatusBadge = (stock: number, lowStockThreshold?: number | null) => {
    // out_of_stock: quantity = 0
    if (stock === 0) {
      return <Badge variant="destructive" className="whitespace-nowrap">Hết hàng</Badge>;
    }
    
    // low_stock: 0 < quantity <= lowStockThreshold (chỉ khi product có lowStockThreshold)
    if (lowStockThreshold != null && lowStockThreshold > 0 && stock > 0 && stock <= lowStockThreshold) {
      return <Badge variant="outline" className="text-orange-600 border-orange-600 whitespace-nowrap">Sắp hết</Badge>;
    }
    
    // in_stock: quantity > lowStockThreshold (nếu có threshold) hoặc quantity > 0 (nếu không có threshold)
    // If no threshold or stock > threshold, show "Còn hàng"
    return <Badge variant="secondary" className="text-green-600 border-green-600 whitespace-nowrap">Còn hàng</Badge>;
  };
  // Filter productsWithStock - status and warehouse are already filtered by API
  // Category is already filtered by products API
  // Only need to filter by search term (client-side for instant feedback)
  const filteredProducts = productsWithStock.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });
  // Get unique categories and warehouses for filters from all data (not filtered)
  // This ensures filter options don't change when filters are applied
  const uniqueCategories = React.useMemo(() => {
    // Use categories from props if available, otherwise extract from allProducts
    if (categories && categories.length > 0) {
      return categories
        .filter(cat => cat.isActive)
        .map(cat => ({ id: cat.id, name: cat.name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    // Fallback: extract from allProducts
    return Array.from(new Map(
      allProducts
        .map(p => {
          const id = p.category;
          const name = findCategoryByValue(p.category)?.name || p.category || '';
          return id ? [id, { id, name }] : null;
        })
        .filter(Boolean) as [string, { id: string; name: string }][]
    ).values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, allProducts]);

  const usedWarehouses = React.useMemo(() => {
    // Get warehouses from allProducts.stockLevel to ensure all options are available
    const warehouseIds = new Set(
      allProducts.flatMap(p => (p.stockLevel || []).map(sl => sl.warehouse?.id).filter(Boolean))
    );
    return warehouses.filter(w => warehouseIds.has(w.id));
  }, [warehouses, allProducts]);
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
          aValue = a.categoryName || '';
          bValue = b.categoryName || '';
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
          aValue = a.warehouse_name || a.location || '';
          bValue = b.warehouse_name || b.location || '';
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
  // Pagination logic
  // When status or warehouse filter is active, use client-side pagination
  // Otherwise, use API pagination (products are already paginated from API)
  const hasActiveStockFilter = filterStatus !== 'all' || filterWarehouse !== 'all';
  
  let totalItems: number;
  let totalPages: number;
  let paginatedProducts: ProductWithStockExtended[];
  
  if (hasActiveStockFilter) {
    // Client-side pagination: paginate sortedProducts
    totalItems = sortedProducts.length;
    totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    paginatedProducts = sortedProducts.slice(startIndex, endIndex);
  } else {
    // API pagination: products are already paginated from API
    // Use totalProducts from API for pagination info
    totalItems = totalProducts || 0;
    totalPages = Math.ceil(totalItems / itemsPerPage);
    // Products are already paginated from API, so use sortedProducts directly
    paginatedProducts = sortedProducts;
  }
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };
  const handleCategoryChange = (value: string) => {
    setFilterCategory(value);
    setCurrentPage(1); // Reset to first page when filtering
    // Clear products to prevent showing old data while loading
    setProducts([]);
  };
  const handleStatusChange = (value: string) => {
    setFilterStatus(value);
    setCurrentPage(1); // Reset to first page when filtering
    // Clear products to prevent showing old data while loading
    setProducts([]);
  };
  const handleWarehouseChange = (value: string) => {
    setFilterWarehouse(value);
    setCurrentPage(1); // Reset to first page when filtering
    // Clear products to prevent showing old data while loading
    setProducts([]);
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
      return null;
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
    const exportData = sortedProducts.map((product, index) => {
      const exportItem: any = {
        'STT': index + 1,
        'Mã sản phẩm': product.code,
        'Tên sản phẩm': product.name,
        'Loại': product.categoryName || '',
        'Tồn kho': product.current_stock,
        'Đơn vị': product.unit || 'cái',
        'Giá bán': product.price || 0,
        'Kho': product.warehouse_name || product.location || '',
        'Trạng thái': product.current_stock === 0 ? 'Hết hàng' : 
                     (product.current_stock > 1 && product.current_stock < 100) ? 'Sắp hết' : 'Còn hàng',
        'Cập nhật': product.updated_at ? new Date(product.updated_at).toLocaleDateString('vi-VN') : ''
      };
      if (canViewCostPrice) {
        exportItem['Giá vốn'] = product.costPrice || 0;
      }
      return exportItem;
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
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
    XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo tồn kho');
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN').replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false }).replace(/:/g, '-');
    const filename = `Bao_cao_ton_kho_${dateStr}_${timeStr}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast({
      title: "Thành công",
      description: `Đã xuất ${exportData.length} sản phẩm ra file Excel`,
    });
  };
  if (loadingProducts) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Báo Cáo Tồn Kho</CardTitle>
          <CardDescription>Đang tải dữ liệu tồn kho...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Đang tải dữ liệu tồn kho...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Báo Cáo Tồn Kho</CardTitle>
        <CardDescription>Theo dõi tình trạng tồn kho theo thời gian thực</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo tên hoặc mã sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={filterStatus} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Lọc theo trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="in-stock">Còn hàng</SelectItem>
                <SelectItem value="low-stock">Sắp hết</SelectItem>
                <SelectItem value="out-of-stock">Hết hàng</SelectItem>
              </SelectContent>
            </Select>
            <Combobox
              options={[
                { label: "Tất cả loại", value: "all" },
                ...uniqueCategories.map((category) => ({
                  label: category.name,
                  value: category.id
                }))
              ]}
              value={filterCategory}
              onValueChange={handleCategoryChange}
              placeholder="Lọc theo loại"
              searchPlaceholder="Tìm loại sản phẩm..."
              emptyMessage="Không có loại sản phẩm nào"
            />
            <Combobox
              options={[
                { label: "Tất cả kho", value: "all" },
                ...usedWarehouses.map((warehouse) => ({
                  label: warehouse.name,
                  value: warehouse.id
                }))
              ]}
              value={filterWarehouse}
              onValueChange={handleWarehouseChange}
              placeholder="Lọc theo kho"
              searchPlaceholder="Tìm kho..."
              emptyMessage="Không có kho nào"
            />
            <Button 
              variant="outline" 
              onClick={exportToExcel}
              className="w-full sm:w-auto sm:ml-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Xuất Excel
            </Button>
          </div>
        </div>
        {/* Pagination and items per page controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Hiển thị:</span>
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn số lượng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground whitespace-nowrap">/ trang</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Hiển thị {startIndex + 1}-{Math.min(endIndex, totalItems)} trong tổng số {totalItems} sản phẩm
          </div>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('code')}
                >
                  <div className="flex items-center">
                    Mã SP
                    {getSortIcon('code')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Tên Sản Phẩm
                    {getSortIcon('name')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none text-center"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center">
                    Loại
                    {getSortIcon('category')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none text-center"
                  onClick={() => handleSort('current_stock')}
                >
                  <div className="flex items-center">
                    Tồn Kho
                    {getSortIcon('current_stock')}
                  </div>
                </TableHead>
                {canViewCostPrice && (
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('cost_price')}
                  >
                    <div className="flex items-center">
                      Giá Vốn
                      {getSortIcon('cost_price')}
                    </div>
                  </TableHead>
                )}
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('unit_price')}
                >
                  <div className="flex items-center">
                    Giá Bán
                    {getSortIcon('unit_price')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('warehouse')}
                >
                  <div className="flex items-center">
                    Tên Kho
                    {getSortIcon('warehouse')}
                  </div>
                </TableHead>
                <TableHead>Trạng Thái</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('updated_at')}
                >
                  <div className="flex items-center">
                    Cập Nhật
                    {getSortIcon('updated_at')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingProducts ? (
                <TableRow>
                  <TableCell colSpan={canViewCostPrice ? 9 : 8} className="text-center py-8">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-muted-foreground">Đang tải dữ liệu...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canViewCostPrice ? 9 : 8} className="text-center py-8 text-muted-foreground">
                    {sortedProducts.length === 0 ? "Chưa có sản phẩm nào" : "Không có sản phẩm nào trong trang này"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map((product) => (
                  <TableRow key={`${product.id}-${product.warehouse_id || 'no-warehouse'}`}>
                    <TableCell className="font-medium">{product.code}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell className="text-center">{product.categoryName || '-'}</TableCell>
                    <TableCell className="text-center">
                      <span className={`font-medium ${
                        product.current_stock === 0 ? 'text-red-600' : 
                        product.current_stock < 10 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(product.current_stock)}
                      </span>
                    </TableCell>
                    {canViewCostPrice && (
                      <TableCell className="text-center">
                        <div className="relative group">
                          <span className="cursor-help">
                            {formatCurrencyShort(product.costPrice || 0)}
                          </span>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            {formatCurrency(product.costPrice || 0)}
                          </div>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <div className="relative group">
                        <span className="cursor-help">
                          {formatCurrencyShort(product.price || 0)}
                        </span>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                          {formatCurrency(product.price || 0)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {product.warehouse_name || product.location || '-'}
                    </TableCell>
                    <TableCell className=" text-center whitespace-nowrap">
                      {getStatusBadge(product.current_stock, product.lowStockThreshold)}
                    </TableCell>
                    <TableCell className="text-center">
                      {product.updated_at ? new Date(product.updated_at).toLocaleDateString('vi-VN') : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) handlePageChange(currentPage - 1);
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
                          handlePageChange(1);
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
                          handlePageChange(pageNum);
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
                          handlePageChange(totalPages);
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
                      if (currentPage < totalPages) handlePageChange(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
        {!canViewCostPrice && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Chỉ Kế toán trưởng và Giám đốc mới có thể xem giá vốn sản phẩm.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
export default InventoryStock;