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
import { Search, Plus, Package, AlertTriangle, CheckCircle, Upload, Warehouse, Trash2, Edit, MapPin, ArrowUpDown, ArrowUp, ArrowDown, Download, TrendingDown } from "lucide-react";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import * as XLSX from 'xlsx';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ExcelImport from "@/components/inventory/ExcelImport";
import AddressComponent from "@/components/common/AddressComponent";
import ProductList from "@/components/inventory/ProductList";
import InventoryStock from "@/components/inventory/InventoryStock";
import ImportSlips from "@/components/inventory/ImportSlips";
import InventoryHistory from "@/components/inventory/InventoryHistory";

import React from "react";

const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterWarehouse, setFilterWarehouse] = useState("all");
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [activeTab, setActiveTab] = useState("inventory");
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [newWarehouse, setNewWarehouse] = useState({ 
    name: "", 
    code: "", 
    description: "", 
    address: "",
    addressData: {
      province_code: '',
      province_name: '',
      district_code: '',
      district_name: '',
      ward_code: '',
      ward_name: '',
      address_detail: ''
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
    sellPrice: 0,
    unit: 'cái',
    barcode: '',
    status: 'active'
  });
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const { userRole } = useAuth();

  // Check if user can see cost prices - Admin có thể xem tất cả
  const canViewCostPrice = userRole === 'chief_accountant' || userRole === 'owner_director' || userRole === 'admin';
  
  // Check if user can manage warehouses (admin, owner_director, inventory)
  const canManageWarehouses = userRole === 'owner_director' || userRole === 'inventory' || userRole === 'admin';
  
  // Check if user can manage products (admin, owner_director, chief_accountant only) - Loại bỏ 'accountant' 
  const canManageProducts = userRole === 'owner_director' || userRole === 'chief_accountant' || userRole === 'admin';
  
  // Check permissions for import slips
  const canManageImports = userRole === 'inventory' || userRole === 'admin' || userRole === 'owner_director';
  const canApproveImports = userRole === 'accountant' || userRole === 'chief_accountant' || userRole === 'owner_director' || userRole === 'admin';

  // Load products from Supabase
  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Có lỗi khi tải danh sách sản phẩm');
    }
  };

  useEffect(() => {
    loadProducts();
    loadWarehouses();
  }, []);

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
          aValue = a.cost_price;
          bValue = b.cost_price;
          break;
        case 'unit_price':
          aValue = a.unit_price;
          bValue = b.unit_price;
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

  // Get sort icon
  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const loadWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const createWarehouse = async () => {
    if (!newWarehouse.name || !newWarehouse.code) {
      toast.error("Tên kho và mã kho là bắt buộc");
      return;
    }

    try {
      const { error } = await supabase
        .from('warehouses')
        .insert([{
          name: newWarehouse.name,
          code: newWarehouse.code,
          description: newWarehouse.description,
          address: newWarehouse.address,
          province_code: newWarehouse.addressData.province_code,
          province_name: newWarehouse.addressData.province_name,
          district_code: newWarehouse.addressData.district_code,
          district_name: newWarehouse.addressData.district_name,
          ward_code: newWarehouse.addressData.ward_code,
          ward_name: newWarehouse.addressData.ward_name,
          address_detail: newWarehouse.addressData.address_detail,
        }]);

      if (error) throw error;

      toast.success("Đã tạo kho mới");
      setNewWarehouse({ 
        name: "", 
        code: "", 
        description: "", 
        address: "",
        addressData: {
          province_code: '',
          province_name: '',
          district_code: '',
          district_name: '',
          ward_code: '',
          ward_name: '',
          address_detail: ''
        }
      });
      loadWarehouses();
    } catch (error: any) {
      console.error('Error creating warehouse:', error);
      toast.error(error.message || "Không thể tạo kho");
    }
  };

  const deleteWarehouse = async (id: string) => {
    try {
      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Đã xóa kho");
      loadWarehouses();
    } catch (error: any) {
      console.error('Error deleting warehouse:', error);
      toast.error(error.message || "Không thể xóa kho");
    }
  };

  const startEditWarehouse = (warehouse: any) => {
    setEditingWarehouse(warehouse);
    setNewWarehouse({
      name: warehouse.name,
      code: warehouse.code,
      description: warehouse.description || "",
      address: warehouse.address || "",
      addressData: {
        province_code: warehouse.province_code || '',
        province_name: warehouse.province_name || '',
        district_code: warehouse.district_code || '',
        district_name: warehouse.district_name || '',
        ward_code: warehouse.ward_code || '',
        ward_name: warehouse.ward_name || '',
        address_detail: warehouse.address_detail || ''
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
      addressData: {
        province_code: '',
        province_name: '',
        district_code: '',
        district_name: '',
        ward_code: '',
        ward_name: '',
        address_detail: ''
      }
    });
    setIsEditingWarehouse(false);
  };

  const updateWarehouse = async () => {
    if (!newWarehouse.name || !newWarehouse.code) {
      toast.error("Tên kho và mã kho là bắt buộc");
      return;
    }

    try {
      const { error } = await supabase
        .from('warehouses')
        .update({
          name: newWarehouse.name,
          code: newWarehouse.code,
          description: newWarehouse.description,
          address: newWarehouse.address,
          province_code: newWarehouse.addressData.province_code,
          province_name: newWarehouse.addressData.province_name,
          district_code: newWarehouse.addressData.district_code,
          district_name: newWarehouse.addressData.district_name,
          ward_code: newWarehouse.addressData.ward_code,
          ward_name: newWarehouse.addressData.ward_name,
          address_detail: newWarehouse.addressData.address_detail,
        })
        .eq('id', editingWarehouse.id);

      if (error) throw error;

      toast.success("Đã cập nhật thông tin kho");
      cancelEditWarehouse();
      loadWarehouses();
    } catch (error: any) {
      console.error('Error updating warehouse:', error);
      toast.error(error.message || "Không thể cập nhật kho");
    }
  };

  const handleImportComplete = async (importedData: any[]) => {
    console.log('Imported data:', importedData);
    
    try {
      // Save imported products to Supabase
      for (const item of importedData) {
        if (item.status === 'valid') {
          await supabase.from('products').insert({
            name: item.productName,
            code: item.productCode,
            category: item.category,
            current_stock: item.quantity,
            cost_price: item.costPrice,
            unit_price: item.sellPrice,
            location: item.location,
            min_stock_level: 10
          });
        }
      }
      
      toast.success('Đã nhập sản phẩm thành công!');
      loadProducts(); // Refresh products list
    } catch (error) {
      console.error('Error importing products:', error);
      toast.error('Có lỗi khi nhập sản phẩm');
    }
  };

  const addProduct = async () => {
    if (!newProduct.name || !newProduct.code) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      setIsAddingProduct(true);

      const { error } = await supabase.from('products').insert({
        name: newProduct.name,
        code: newProduct.code,
        category: newProduct.category,
        current_stock: 0, // Module A: Thêm sản phẩm chỉ thêm vào danh mục, chưa nhập kho
        cost_price: newProduct.costPrice,
        unit_price: newProduct.sellPrice,
        unit: newProduct.unit,
        barcode: newProduct.barcode || null,
        status: newProduct.status,
        min_stock_level: 10
      });

      if (error) {
        throw error;
      }

      toast.success('Đã thêm sản phẩm vào danh mục!');
      loadProducts(); // Refresh products list
      setNewProduct({
        name: '',
        code: '',
        category: '',
        costPrice: 0,
        sellPrice: 0,
        unit: 'cái',
        barcode: '',
        status: 'active'
      });
      setIsAddProductDialogOpen(false);
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Có lỗi khi thêm sản phẩm');
    } finally {
      setIsAddingProduct(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
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
        'Giá bán (VND)': product.unit_price || 0,
        'Kho': warehouse?.name || product.location || '',
        'Trạng thái': product.current_stock === 0 ? 'Hết hàng' : 
                     product.current_stock < 10 ? 'Sắp hết' : 'Còn hàng',
        'Cập nhật': product.updated_at ? new Date(product.updated_at).toLocaleDateString('vi-VN') : ''
      };

      // Only add cost price if user can view it
      if (canViewCostPrice) {
        exportItem['Giá vốn (VND)'] = product.cost_price || 0;
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
    
    toast.success(`Đã xuất ${exportData.length} sản phẩm ra file Excel`);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">Quản Lý Tồn Kho</h1>
          <p className="text-muted-foreground">Theo dõi và quản lý hàng tồn kho</p>
        </div>

        {/* Thống kê nhanh */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Sản Phẩm</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
          
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
        </div>

        {/* Tabs for different sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="inventory">Báo cáo tồn kho</TabsTrigger>
            <TabsTrigger value="products">Danh sách sản phẩm</TabsTrigger>
            <TabsTrigger value="warehouses">
              <Warehouse className="w-4 h-4 mr-2" />
              Quản lý kho
            </TabsTrigger>
            <TabsTrigger value="imports">
              <Package className="w-4 h-4 mr-2" />
              Nhập kho
            </TabsTrigger>
            <TabsTrigger value="history">
              <Search className="w-4 h-4 mr-2" />
              Lịch sử xuất nhập kho
            </TabsTrigger>
            <TabsTrigger value="import">
              <Upload className="w-4 h-4 mr-2" />
              Nhập từ Excel/CSV
            </TabsTrigger>
          </TabsList>

          {/* Inventory Stock Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <InventoryStock 
              products={products}
              warehouses={warehouses}
              canViewCostPrice={canViewCostPrice}
            />
          </TabsContent>

          {/* Products List Tab */}
          <TabsContent value="products" className="space-y-6">
            <ProductList 
              products={products}
              warehouses={warehouses}
              canViewCostPrice={canViewCostPrice}
              canManageProducts={canManageProducts}
              onProductsUpdate={loadProducts}
            />
          </TabsContent>

          {/* Warehouses Management Tab */}
          <TabsContent value="warehouses" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Warehouse className="w-5 h-5" />
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
                        <Label htmlFor="warehouse-code">Mã kho *</Label>
                        <Input
                          id="warehouse-code"
                          value={newWarehouse.code}
                          onChange={(e) => setNewWarehouse(prev => ({ ...prev, code: e.target.value }))}
                          placeholder="Nhập mã kho"
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
                        <AddressComponent
                          value={newWarehouse.addressData}
                          onChange={(addressData) => {
                            setNewWarehouse(prev => ({ 
                              ...prev, 
                              addressData,
                              address: `${addressData.address_detail}, ${addressData.ward_name}, ${addressData.district_name}, ${addressData.province_name}`.replace(/^, |, $/g, '')
                            }));
                          }}
                          required
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
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                       <TableHead>Mã Kho</TableHead>
                         <TableHead>Tên Kho</TableHead>
                         <TableHead>Mô Tả</TableHead>
                         <TableHead>Địa Chỉ</TableHead>
                         <TableHead>Ngày Tạo</TableHead>
                         {canManageWarehouses && <TableHead>Thao Tác</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {warehouses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={canManageWarehouses ? 6 : 5} className="text-center py-8 text-muted-foreground">
                            Chưa có kho nào
                          </TableCell>
                        </TableRow>
                      ) : (
                        warehouses.map((warehouse) => (
                          <TableRow key={warehouse.id}>
                            <TableCell className="font-medium">{warehouse.code}</TableCell>
                            <TableCell>{warehouse.name}</TableCell>
                            <TableCell>{warehouse.description || '-'}</TableCell>
                            <TableCell>{warehouse.address || '-'}</TableCell>
                            <TableCell>
                              {new Date(warehouse.created_at).toLocaleDateString('vi-VN')}
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
          </TabsContent>

          {/* Import Slips Tab */}
          <TabsContent value="imports" className="space-y-6">
            <ImportSlips 
              canManageImports={canManageImports}
              canApproveImports={canApproveImports}
            />
          </TabsContent>

          {/* Inventory History Tab */}
          <TabsContent value="history" className="space-y-6">
            <InventoryHistory />
          </TabsContent>


          {/* Excel Import Tab */}
          <TabsContent value="import" className="space-y-6">
            <ExcelImport onImportComplete={handleImportComplete} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Inventory;