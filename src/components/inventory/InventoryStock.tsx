import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import * as XLSX from 'xlsx';
import { toast } from "sonner";
import React from "react";
import { stockLevelsApi, StockLevel } from "@/api/stockLevels.api";
import { ProductWithStock } from "@/api/product.api";

interface InventoryStockProps {
  products: any[];
  warehouses: any[];
  canViewCostPrice: boolean;
}

const InventoryStock: React.FC<InventoryStockProps> = ({
  products,
  warehouses,
  canViewCostPrice
}) => {
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Load stock levels
  const loadStockLevels = async () => {
    try {
      setLoading(true);
      const response = await stockLevelsApi.getStockLevels({ 
        page: 1, 
        limit: 1000,
        includeDeleted: false 
      });
      setStockLevels(response.stockLevels || []);
    } catch (error) {
      console.error('Error loading stock levels:', error);
      toast.error('Không thể tải dữ liệu tồn kho');
    } finally {
      setLoading(false);
    }
  };

  // Load stock levels on component mount
  useEffect(() => {
    loadStockLevels();
  }, []);

  // Create products with stock information - one row per warehouse
  const productsWithStock: ProductWithStock[] = products.flatMap(product => {
    // Find stock levels for this product
    const productStockLevels = stockLevels.filter(stock => stock.productId === product.id);
    
    // If no stock levels, return one row with zero stock
    if (productStockLevels.length === 0) {
      return [{
        ...product,
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
      current_stock: stock.quantity,
      location: stock.warehouse ? `${stock.warehouse.name} (${stock.warehouse.code})` : 'Không xác định',
      updated_at: stock.updatedAt,
      warehouse_id: stock.warehouseId,
      warehouse_name: stock.warehouse?.name || '',
      warehouse_code: stock.warehouse?.code || ''
    }));
  });
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterWarehouse, setFilterWarehouse] = useState("all");
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const getStatusBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge variant="destructive">Hết hàng</Badge>;
    } else if (stock < 10) {
      return <Badge variant="outline" className="text-orange-600 border-orange-600">Sắp hết</Badge>;
    } else {
      return <Badge variant="secondary" className="text-green-600 border-green-600">Còn hàng</Badge>;
    }
  };

  const filteredProducts = productsWithStock.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || 
                         (filterStatus === "in-stock" && product.current_stock >= 10) ||
                         (filterStatus === "low-stock" && product.current_stock > 0 && product.current_stock < 10) ||
                         (filterStatus === "out-of-stock" && product.current_stock === 0);
    
    const matchesCategory = filterCategory === "all" || 
                           (product.category && product.category.toLowerCase().includes(filterCategory.toLowerCase()));

    const matchesWarehouse = filterWarehouse === "all" || product.warehouse_id === filterWarehouse;
    
    return matchesSearch && matchesStatus && matchesCategory && matchesWarehouse;
  });

  // Get unique categories and warehouses for filters
  const uniqueCategories = [...new Set(productsWithStock.map(p => p.category).filter(Boolean))].sort();
  const usedWarehouses = warehouses.filter(w => 
    productsWithStock.some(p => p.warehouse_id === w.id)
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
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
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
        'Loại': product.category || '',
        'Tồn kho': product.current_stock,
        'Đơn vị': product.unit || 'cái',
        'Giá bán (VND)': product.price || 0,
        'Kho': product.warehouse_name || product.location || '',
        'Trạng thái': product.current_stock === 0 ? 'Hết hàng' : 
                     product.current_stock < 10 ? 'Sắp hết' : 'Còn hàng',
        'Cập nhật': product.updated_at ? new Date(product.updated_at).toLocaleDateString('vi-VN') : ''
      };

      if (canViewCostPrice) {
        exportItem['Giá vốn (VND)'] = product.costPrice || 0;
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
    toast.success(`Đã xuất ${exportData.length} sản phẩm ra file Excel`);
  };

  if (loading) {
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
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Lọc theo trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="in-stock">Còn hàng</SelectItem>
                <SelectItem value="low-stock">Sắp hết</SelectItem>
                <SelectItem value="out-of-stock">Hết hàng</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Lọc theo loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                {uniqueCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Lọc theo kho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả kho</SelectItem>
                {usedWarehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
            <span className="text-sm text-muted-foreground">Hiển thị:</span>
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">/ trang</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Hiển thị {startIndex + 1}-{Math.min(endIndex, sortedProducts.length)} trong tổng số {sortedProducts.length} sản phẩm
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
                  className="cursor-pointer hover:bg-muted/50 select-none"
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
                  <div className="flex items-center justify-center">
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
                      Giá Vốn (VNĐ)
                      {getSortIcon('cost_price')}
                    </div>
                  </TableHead>
                )}
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('unit_price')}
                >
                  <div className="flex items-center">
                    Giá Bán (VNĐ)
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
              {paginatedProducts.length === 0 ? (
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
                    <TableCell>{product.category || '-'}</TableCell>
                    <TableCell className="text-center">
                      <span className={`font-medium ${
                        product.current_stock === 0 ? 'text-red-600' : 
                        product.current_stock < 10 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {product.current_stock}
                      </span>
                    </TableCell>
                    {canViewCostPrice && (
                      <TableCell>
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
                    <TableCell>
                      <div className="relative group">
                        <span className="cursor-help">
                          {formatCurrencyShort(product.price || 0)}
                        </span>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                          {formatCurrency(product.price || 0)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.warehouse_name || product.location || '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(product.current_stock)}
                    </TableCell>
                    <TableCell>
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