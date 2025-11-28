import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Plus, Download, ArrowUpDown, ArrowUp, ArrowDown, Edit, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
// // import { supabase } from "@/integrations/supabase/client"; // Removed - using API instead // Removed - using API instead
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import React from "react";
import { productApi, type ProductImportError } from "@/api/product.api";
import { categoriesApi } from "@/api/categories.api";
import { convertPermissionCodesInMessage } from "@/utils/permissionMessageConverter";
import { CurrencyInput } from "@/components/ui/currency-input";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";

interface ProductListProps {
  products: any[];
  warehouses: any[];
  canViewCostPrice: boolean;
  canManageProducts: boolean;
  onProductsUpdate: () => void;
}

const ProductList: React.FC<ProductListProps> = ({
  products,
  warehouses,
  canViewCostPrice,
  canManageProducts,
  onProductsUpdate
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryComboOpen, setCategoryComboOpen] = useState(false);
  const [editCategoryComboOpen, setEditCategoryComboOpen] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [editCategorySearchTerm, setEditCategorySearchTerm] = useState('');
  const [newProduct, setNewProduct] = useState({
    name: '',
    code: '',
    category: '',
    costPrice: 0,
    price: 0,
    unit: 'cái',
    barcode: '',
    lowStockThreshold: 0,
    manufacturer: '',
    description: ''
  });
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isEditProductDialogOpen, setIsEditProductDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<ProductImportError[]>([]);
  const [importSummary, setImportSummary] = useState<{ imported: number; failed: number; totalRows: number } | null>(null);

  const sortedCategories = React.useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const findCategoryByValue = React.useCallback(
    (value?: string | null) => {
      if (!value) return undefined;
      const trimmed = typeof value === "string" ? value.trim() : value;
      if (!trimmed) return undefined;
      return categories.find(
        (cat) =>
          cat.id === trimmed ||
          (typeof trimmed === "string" &&
            cat.name.toLowerCase() === trimmed.toLowerCase())
      );
    },
    [categories]
  );

  const getCategoryNameFromValue = React.useCallback(
    (value?: string | null) => {
      if (!value) return "";
      const match = findCategoryByValue(value);
      return match?.name ?? (typeof value === "string" ? value : "");
    },
    [findCategoryByValue]
  );

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const productCategory = findCategoryByValue(product.category);
    const matchesCategory = filterCategory === "all" || 
                           (productCategory?.id && productCategory.id === filterCategory);
    
    return matchesSearch && matchesCategory;
  });

  // Load categories from categories API
  const loadCategories = React.useCallback(async () => {
    try {
      // Load categories from categories API
      const response = await categoriesApi.getCategories({ page: 1, limit: 1000 });
      const activeCategories = response.categories.filter(cat => cat.isActive);
      setCategories(activeCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback: extract unique categories from products
      const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories.map(name => ({ id: name, name })));
    }
  }, [products]);

  React.useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  React.useEffect(() => {
    if (categoryComboOpen) {
      setCategorySearchTerm('');
      if (!categories.length) {
        loadCategories();
      }
    }
  }, [categoryComboOpen]);

  React.useEffect(() => {
    if (editCategoryComboOpen) {
      setEditCategorySearchTerm('');
      if (!categories.length) {
        loadCategories();
      }
    }
  }, [editCategoryComboOpen]);

  const ensureCategoryId = React.useCallback(async (categoryValue?: string | null) => {
    if (!categoryValue) return null;
    const trimmed = typeof categoryValue === "string" ? categoryValue.trim() : categoryValue;
    if (!trimmed) return null;

    const existingCategory = findCategoryByValue(trimmed);
    if (existingCategory) {
      return existingCategory.id;
    }

    try {
      const newCategory = await categoriesApi.createCategory({
        name: typeof trimmed === "string" ? trimmed : String(trimmed),
        description: `Category created from product form`
      });
      await loadCategories();
      return newCategory.id;
    } catch (error: any) {
      console.error('Error saving category:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Không thể tạo danh mục mới';
      toast({ title: 'Lỗi', description: convertPermissionCodesInMessage(errorMessage), variant: 'destructive' });
      return null;
    }
  }, [findCategoryByValue, loadCategories, toast]);

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
          aValue = getCategoryNameFromValue(a.category) || '';
          bValue = getCategoryNameFromValue(b.category) || '';
          break;
        case 'cost_price':
          aValue = a.cost_price;
          bValue = b.cost_price;
          break;
        case 'unit_price':
          aValue = a.unit_price;
          bValue = b.unit_price;
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
  }, [filteredProducts, sortConfig, getCategoryNameFromValue]);

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

  const resetImportState = React.useCallback(() => {
    setImportFile(null);
    setImportErrors([]);
    setImportSummary(null);
  }, []);

  const handleImportDialogToggle = React.useCallback((open: boolean) => {
    setIsImportDialogOpen(open);
    if (!open) {
      resetImportState();
    }
  }, [resetImportState]);

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

  const addProduct = async () => {
    if (!newProduct.name) {
      toast({ title: 'Lỗi', description: 'Tên sản phẩm là bắt buộc', variant: 'destructive' });
      return;
    }
    // Giá bán không còn bắt buộc
    if (newProduct.price && newProduct.price <= 0) {
      toast({ title: 'Lỗi', description: 'Giá bán phải lớn hơn 0 nếu có', variant: 'destructive' });
      return;
    }

    try {
      setIsAddingProduct(true);

      const categoryId = await ensureCategoryId(newProduct.category);

      const productData: any = {
        name: newProduct.name,
        ...(newProduct.code && { code: newProduct.code }), // Only include code if provided
        category: categoryId ?? undefined,
        unit: newProduct.unit,
      };

      // Optional price - only include if provided and > 0
      if (newProduct.price && newProduct.price > 0) {
        productData.price = newProduct.price;
      }

      // Optional costPrice - only include if provided
      if (newProduct.costPrice && newProduct.costPrice > 0) {
        productData.costPrice = newProduct.costPrice;
      }

      // lowStockThreshold - include if provided (can be 0 or positive number)
      if (newProduct.lowStockThreshold !== undefined && newProduct.lowStockThreshold !== null && newProduct.lowStockThreshold >= 0) {
        productData.lowStockThreshold = newProduct.lowStockThreshold;
      }

      // manufacturer - include if provided (non-empty string)
      if (newProduct.manufacturer && newProduct.manufacturer.trim()) {
        productData.manufacturer = newProduct.manufacturer.trim();
      }

      // description - include if provided (non-empty string)
      if (newProduct.description && newProduct.description.trim()) {
        productData.description = newProduct.description.trim();
      }

      // barcode - include if provided (non-empty string)
      if (newProduct.barcode && newProduct.barcode.trim()) {
        productData.barcode = newProduct.barcode.trim();
      }

      const response = await productApi.createProduct(productData);

      toast({ title: 'Thành công', description: (response as any)?.message || 'Đã thêm sản phẩm vào danh mục!' });
      onProductsUpdate();
      setNewProduct({
        name: '',
        code: '',
        category: '',
        costPrice: 0,
        price: 0,
        unit: 'cái',
        barcode: '',
        lowStockThreshold: 0,
        manufacturer: '',
        description: ''
      });
      setIsAddProductDialogOpen(false);
    } catch (error: any) {
      console.error('Error adding product:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Có lỗi khi thêm sản phẩm';
      toast({ title: 'Lỗi', description: convertPermissionCodesInMessage(errorMessage), variant: 'destructive' });
    } finally {
      setIsAddingProduct(false);
    }
  };

  const startEditProduct = (product: any) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      code: product.code,
      category: findCategoryByValue(product.category)?.id || product.category || '',
      costPrice: product.costPrice || 0,
      price: product.price || 0,
      unit: product.unit || 'cái',
      barcode: product.barcode || '',
      lowStockThreshold: product.lowStockThreshold || 0,
      manufacturer: product.manufacturer || '',
      description: product.description || ''
    });
    setIsEditProductDialogOpen(true);
  };

  const updateProduct = async () => {
    if (!newProduct.name) {
      toast({ title: 'Lỗi', description: 'Tên sản phẩm là bắt buộc', variant: 'destructive' });
      return;
    }
    // Giá bán không còn bắt buộc
    if (newProduct.price && newProduct.price <= 0) {
      toast({ title: 'Lỗi', description: 'Giá bán phải lớn hơn 0 nếu có', variant: 'destructive' });
      return;
    }

    try {
      setIsEditingProduct(true);

      const categoryId = await ensureCategoryId(newProduct.category);

      const updateData: any = {
        name: newProduct.name,
        ...(newProduct.code && { code: newProduct.code }), // Only include code if provided
        category: categoryId ?? undefined,
        unit: newProduct.unit,
      };

      // Optional price - only include if provided and > 0
      if (newProduct.price && newProduct.price > 0) {
        updateData.price = newProduct.price;
      }

      // Optional costPrice - only include if provided
      if (newProduct.costPrice && newProduct.costPrice > 0) {
        updateData.costPrice = newProduct.costPrice;
      }

      // lowStockThreshold - include if provided (can be 0 or positive number)
      if (newProduct.lowStockThreshold !== undefined && newProduct.lowStockThreshold !== null && newProduct.lowStockThreshold >= 0) {
        updateData.lowStockThreshold = newProduct.lowStockThreshold;
      }

      // manufacturer - include if provided (non-empty string)
      if (newProduct.manufacturer && newProduct.manufacturer.trim()) {
        updateData.manufacturer = newProduct.manufacturer.trim();
      }

      // description - include if provided (non-empty string)
      if (newProduct.description && newProduct.description.trim()) {
        updateData.description = newProduct.description.trim();
      }

      // barcode - include if provided (non-empty string)
      if (newProduct.barcode && newProduct.barcode.trim()) {
        updateData.barcode = newProduct.barcode.trim();
      }

      const response = await productApi.updateProduct(editingProduct.id, updateData);

      toast({ title: 'Thành công', description: (response as any)?.message || 'Đã cập nhật sản phẩm!' });
      onProductsUpdate();
      setEditingProduct(null);
      setNewProduct({
        name: '',
        code: '',
        category: '',
        costPrice: 0,
        price: 0,
        unit: 'cái',
        barcode: '',
        lowStockThreshold: 0,
        manufacturer: '',
        description: ''
      });
      setIsEditProductDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating product:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Có lỗi khi cập nhật sản phẩm';
      toast({ title: 'Lỗi', description: convertPermissionCodesInMessage(errorMessage), variant: 'destructive' });
    } finally {
      setIsEditingProduct(false);
    }
  };

  const deleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${productName}"?`)) {
      return;
    }

    try {
      const response = await productApi.deleteProduct(productId);

      toast({ title: 'Thành công', description: response.message || 'Đã xóa sản phẩm!' });
      onProductsUpdate();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Có lỗi khi xóa sản phẩm';
      toast({ title: 'Lỗi', description: convertPermissionCodesInMessage(errorMessage), variant: 'destructive' });
    }
  };

  const formatCurrency = (amount: number) => {
    
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0
    }).format(amount);
  };

  const downloadProductImportTemplate = async () => {
    try {
      const { blob, filename } = await productApi.downloadImportTemplate();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename; // Use filename from backend
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({ title: 'Thành công', description: 'Đã tải file mẫu từ server' });
    } catch (error: any) {
      console.error('Error downloading template:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Không thể tải file mẫu';
      toast({ title: 'Lỗi', description: convertPermissionCodesInMessage(errorMessage), variant: 'destructive' });
    }
  };

  const handleImportProducts = async () => {
    if (!importFile) {
      toast({ title: 'Lỗi', description: 'Vui lòng chọn file Excel', variant: 'destructive' });
      return;
    }

    try {
      setIsImporting(true);
      setImportErrors([]);
      setImportSummary(null);

      const response = await productApi.importProducts({ file: importFile });
      
      // Handle response structure: response.data contains the actual data
      const responseData = response.data || response;
      const imported = responseData.imported ?? 0;
      const failed = responseData.failed ?? 0;
      const totalRows = responseData.totalRows ?? imported + failed;
      const errors = responseData.errors || [];
      const message = response.message || '';

      onProductsUpdate();

      // If there are errors, show them in the dialog
      if (errors.length > 0) {
        setImportErrors(errors);
        setImportSummary({ imported, failed, totalRows });
        toast({
          title: imported === 0 ? 'Không thể import' : 'Hoàn thành với cảnh báo',
          description: message || (imported === 0
            ? `Không import được dòng nào. Có ${errors.length} lỗi cần xử lý.`
            : `Đã import ${imported}/${totalRows} dòng. Có ${errors.length} lỗi cần xử lý.`),
          variant: imported === 0 ? 'destructive' : 'default',
        });
        // Keep dialog open to show errors
        return;
      } else {
        // No errors, all successful
        toast({
          title: 'Thành công',
          description: message || `Đã import ${imported} sản phẩm.`,
        });
        setIsImportDialogOpen(false);
        resetImportState();
      }
    } catch (error: any) {
      console.error('Error importing products:', error);
      const apiErrors: ProductImportError[] = error.response?.data?.errors || [];
      if (apiErrors.length > 0) {
        const imported = error.response?.data?.imported ?? 0;
        const failed = error.response?.data?.failed ?? apiErrors.length;
        const totalRows = error.response?.data?.totalRows ?? imported + failed;
        setImportErrors(apiErrors);
        setImportSummary({ imported, failed, totalRows });
      }

      const errorMessage = error.response?.data?.message || error.message || 'Không thể import sản phẩm';
      toast({
        title: 'Lỗi',
        description: convertPermissionCodesInMessage(errorMessage),
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const exportToExcel = () => {
    const exportData = sortedProducts.map((product, index) => {
      const exportItem: any = {
        'STT': index + 1,
        'Mã sản phẩm': product.code,
        'Tên sản phẩm': product.name,
        'Loại': getCategoryNameFromValue(product.category) || '',
        'Đơn vị': product.unit || 'cái',
        'Hãng sản xuất': product.manufacturer || '',
        'Barcode': product.barcode || '',
        'Mô tả': product.description || '',
        'Giá bán (VND)': product.price || 0,
        'Cập nhật': product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('vi-VN') : ''
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
      { wch: 10 },  // Đơn vị
      { wch: 20 },  // Hãng sản xuất
      { wch: 15 },  // Barcode
      { wch: 30 },  // Mô tả
    ];

    if (canViewCostPrice) {
      colWidths.push({ wch: 15 }); // Giá vốn
    }
    
    colWidths.push(
      { wch: 15 },  // Giá bán
      { wch: 12 }   // Cập nhật
    );

    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách sản phẩm');

    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN').replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false }).replace(/:/g, '-');
    const filename = `Danh_sach_san_pham_${dateStr}_${timeStr}.xlsx`;

    XLSX.writeFile(wb, filename);
    toast({ title: 'Thành công', description: `Đã xuất ${exportData.length} sản phẩm ra file Excel` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Danh Sách Sản Phẩm</CardTitle>
        <CardDescription>Quản lý thông tin sản phẩm trong hệ thống</CardDescription>
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
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Lọc theo loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                {sortedCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2 sm:ml-auto">
              {canManageProducts && (
                <Dialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" />
                      Thêm sản phẩm
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Thêm Sản Phẩm Mới</DialogTitle>
                      <DialogDescription>
                        Nhập thông tin sản phẩm vào danh mục
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="product-name" className="text-right">Tên sản phẩm <span className="text-red-500">*</span></Label>
                        <Input 
                          id="product-name" 
                          className="col-span-3"
                          value={newProduct.name}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Nhập tên sản phẩm"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="product-code" className="text-right">Mã sản phẩm <span className="text-red-500">*</span></Label>
                        <Input 
                          id="product-code" 
                          className="col-span-3"
                          value={newProduct.code}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, code: e.target.value }))}
                          placeholder="Nhập mã sản phẩm"
                        />
                      </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="product-category" className="text-right">Loại sản phẩm <span className="text-red-500">*</span></Label>
                  <div className="col-span-3">
                    <Popover open={categoryComboOpen} onOpenChange={setCategoryComboOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={categoryComboOpen}
                          className="w-full justify-between"
                        >
                          {getCategoryNameFromValue(newProduct.category) || "Chọn hoặc nhập loại sản phẩm..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Tìm kiếm hoặc nhập loại mới..." 
                            value={categorySearchTerm}
                            onValueChange={setCategorySearchTerm}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {categorySearchTerm ? (
                                <div className="p-2">
                                  <div className="text-sm text-muted-foreground mb-2">Không tìm thấy loại này</div>
                                  <Button 
                                    size="sm" 
                                    className="w-full"
                                    onClick={() => {
                                      if (categorySearchTerm.trim()) {
                                        setNewProduct(prev => ({ ...prev, category: categorySearchTerm.trim() }));
                                      }
                                      setCategoryComboOpen(false);
                                      setCategorySearchTerm('');
                                    }}
                                  >
                                    Sử dụng "{categorySearchTerm}"
                                  </Button>
                                </div>
                              ) : (
                                "Nhập tên loại sản phẩm..."
                              )}
                            </CommandEmpty>
                            <CommandGroup>
                              {sortedCategories.map((category) => (
                                <CommandItem
                                  key={category.id}
                                  value={category.name}
                                  onSelect={() => {
                                    setNewProduct(prev => ({ ...prev, category: category.id }));
                                    setCategoryComboOpen(false);
                                    setCategorySearchTerm('');
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${newProduct.category === category.id ? "opacity-100" : "opacity-0"}`}
                                  />
                                  {category.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unit" className="text-right">Đơn vị tính <span className="text-red-500">*</span></Label>
                        <Input 
                          id="unit" 
                          className="col-span-3"
                          value={newProduct.unit}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, unit: e.target.value }))}
                          placeholder="Đơn vị (cái, kg, m...)"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="lowStockThreshold" className="text-right">Ngưỡng hàng sắp hết</Label>
                        <NumberInput 
                          id="lowStockThreshold" 
                          className="col-span-3"
                          value={newProduct.lowStockThreshold}
                          onChange={(value) => setNewProduct(prev => ({ ...prev, lowStockThreshold: value }))}
                          placeholder="0"
                          min={0}
                        />
                        <div className="col-span-1"></div>
                        <p className="col-span-3 text-xs text-muted-foreground">Cảnh báo khi tồn kho &lt;= giá trị này</p>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="manufacturer" className="text-right">Hãng sản xuất</Label>
                        <Input 
                          id="manufacturer" 
                          className="col-span-3"
                          value={newProduct.manufacturer}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, manufacturer: e.target.value }))}
                          placeholder="Nhập hãng sản xuất (tùy chọn)"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">Mô tả sản phẩm</Label>
                        <Textarea 
                          id="description" 
                          className="col-span-3"
                          value={newProduct.description}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Nhập mô tả sản phẩm (tùy chọn)"
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="barcode" className="text-right">Barcode</Label>
                        <Input 
                          id="barcode" 
                          className="col-span-3"
                          value={newProduct.barcode}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, barcode: e.target.value }))}
                          placeholder="Mã vạch (tùy chọn)"
                        />
                      </div>
                      {canViewCostPrice && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="cost-price" className="text-right">Giá vốn</Label>
                          <CurrencyInput 
                            id="cost-price" 
                            className="col-span-3"
                            value={newProduct.costPrice}
                            onChange={(value) => setNewProduct(prev => ({ ...prev, costPrice: value }))}
                            placeholder="0"
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="sell-price" className="text-right">Giá bán</Label>
                        <CurrencyInput 
                          id="sell-price" 
                          className="col-span-3"
                          value={newProduct.price}
                          onChange={(value) => setNewProduct(prev => ({ ...prev, price: value }))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        onClick={addProduct}
                        disabled={isAddingProduct}
                      >
                        {isAddingProduct ? 'Đang thêm...' : 'Thêm Sản Phẩm'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              <Button 
                variant="outline" 
                onClick={exportToExcel}
                className="w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                Xuất Excel
              </Button>
              {canManageProducts && (
                <Dialog open={isImportDialogOpen} onOpenChange={handleImportDialogToggle}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Upload className="w-4 h-4 mr-2" />
                      Import Excel
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Import Sản Phẩm Từ Excel</DialogTitle>
                      <DialogDescription>
                        Tải file Excel mẫu hoặc chọn file để import sản phẩm mới
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={downloadProductImportTemplate}
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
                      <div className="rounded-md border border-muted/40 bg-muted/10 p-3 text-sm text-muted-foreground">
                        Đã xử lý {importSummary.totalRows} dòng: thành công {importSummary.imported}, lỗi {importSummary.failed}.
                      </div>
                    )}
                    {importErrors.length > 0 && (
                      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                        <p className="text-sm font-medium text-destructive">Chi tiết lỗi:</p>
                        <ul className="text-sm text-destructive space-y-1 max-h-40 overflow-y-auto">
                          {importErrors.slice(0, 5).map((error, index) => (
                            <li key={`${error.row ?? 'unknown'}-${error.code ?? 'no-code'}-${index}`}>
                              Dòng {error.row ?? 'N/A'}{error.code ? ` (Mã: ${error.code})` : ''}: {error.reason}
                            </li>
                          ))}
                        </ul>
                        {importErrors.length > 5 && (
                          <p className="text-xs text-destructive/80">
                            Hiển thị 5 lỗi đầu tiên. Vui lòng kiểm tra file để xem đầy đủ.
                          </p>
                        )}
                      </div>
                    )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {
                        handleImportDialogToggle(false);
                      }}>
                        Hủy
                      </Button>
                      <Button 
                        onClick={handleImportProducts}
                        disabled={!importFile || isImporting}
                      >
                        {isImporting ? 'Đang import...' : 'Import Sản Phẩm'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>

        {/* Edit Product Dialog */}
        {canManageProducts && (
          <Dialog open={isEditProductDialogOpen} onOpenChange={setIsEditProductDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Chỉnh Sửa Sản Phẩm</DialogTitle>
                <DialogDescription>
                  Cập nhật thông tin sản phẩm
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-product-name" className="text-right">Tên sản phẩm <span className="text-red-500">*</span></Label>
                  <Input 
                    id="edit-product-name" 
                    className="col-span-3"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nhập tên sản phẩm"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-product-code" className="text-right">Mã sản phẩm (tùy chọn)</Label>
                  <Input 
                    id="edit-product-code" 
                    className="col-span-3"
                    value={newProduct.code}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Để trống để hệ thống tự tạo"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-product-category" className="text-right">Loại sản phẩm</Label>
                  <div className="col-span-3">
                    <Popover open={editCategoryComboOpen} onOpenChange={setEditCategoryComboOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={editCategoryComboOpen}
                          className="w-full justify-between"
                        >
                          {getCategoryNameFromValue(newProduct.category) || "Chọn hoặc nhập loại sản phẩm..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Tìm kiếm hoặc nhập loại mới..." 
                            value={editCategorySearchTerm}
                            onValueChange={setEditCategorySearchTerm}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {editCategorySearchTerm ? (
                                <div className="p-2">
                                  <div className="text-sm text-muted-foreground mb-2">Không tìm thấy loại này</div>
                                  <Button 
                                    size="sm" 
                                    className="w-full"
                                    onClick={() => {
                                      if (editCategorySearchTerm.trim()) {
                                        setNewProduct(prev => ({ ...prev, category: editCategorySearchTerm.trim() }));
                                      }
                                      setEditCategoryComboOpen(false);
                                      setEditCategorySearchTerm('');
                                    }}
                                  >
                                    Sử dụng "{editCategorySearchTerm}"
                                  </Button>
                                </div>
                              ) : (
                                "Nhập tên loại sản phẩm..."
                              )}
                            </CommandEmpty>
                            <CommandGroup>
                              {sortedCategories.map((category) => (
                                <CommandItem
                                  key={category.id}
                                  value={category.name}
                                  onSelect={() => {
                                    setNewProduct(prev => ({ ...prev, category: category.id }));
                                    setEditCategoryComboOpen(false);
                                    setEditCategorySearchTerm('');
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${newProduct.category === category.id ? "opacity-100" : "opacity-0"}`}
                                  />
                                  {category.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-unit" className="text-right">Đơn vị tính <span className="text-red-500">*</span></Label>
                  <Input 
                    id="edit-unit" 
                    className="col-span-3"
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="Đơn vị (cái, kg, m...)"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-lowStockThreshold" className="text-right">Ngưỡng hàng sắp hết</Label>
                  <NumberInput 
                    id="edit-lowStockThreshold" 
                    className="col-span-3"
                    value={newProduct.lowStockThreshold}
                    onChange={(value) => setNewProduct(prev => ({ ...prev, lowStockThreshold: value }))}
                    placeholder="0"
                    min={0}
                  />
                  <div className="col-span-1"></div>
                  <p className="col-span-3 text-xs text-muted-foreground">Cảnh báo khi tồn kho &lt;= giá trị này</p>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-manufacturer" className="text-right">Hãng sản xuất</Label>
                  <Input 
                    id="edit-manufacturer" 
                    className="col-span-3"
                    value={newProduct.manufacturer}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, manufacturer: e.target.value }))}
                    placeholder="Nhập hãng sản xuất (tùy chọn)"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-description" className="text-right">Mô tả sản phẩm</Label>
                  <Textarea 
                    id="edit-description" 
                    className="col-span-3"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Nhập mô tả sản phẩm (tùy chọn)"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-barcode" className="text-right">Barcode</Label>
                  <Input 
                    id="edit-barcode" 
                    className="col-span-3"
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, barcode: e.target.value }))}
                    placeholder="Mã vạch (tùy chọn)"
                  />
                </div>
                {canViewCostPrice && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-cost-price" className="text-right">Giá vốn</Label>
                    <CurrencyInput 
                      id="edit-cost-price" 
                      className="col-span-3"
                      value={newProduct.costPrice}
                      onChange={(value) => setNewProduct(prev => ({ ...prev, costPrice: value }))}
                      placeholder="0"
                    />
                  </div>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-sell-price" className="text-right">Giá bán</Label>
                  <CurrencyInput 
                    id="edit-sell-price" 
                    className="col-span-3"
                    value={newProduct.price}
                    onChange={(value) => setNewProduct(prev => ({ ...prev, price: value }))}
                    placeholder="0"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditProductDialogOpen(false);
                    setEditingProduct(null);
                    setNewProduct({
                      name: '',
                      code: '',
                      category: '',
                      costPrice: 0,
                      price: 0,
                      unit: 'cái',
                      barcode: '',
                      lowStockThreshold: 0,
                      manufacturer: '',
                      description: ''
                    });
                  }}
                >
                  Hủy
                </Button>
                <Button 
                  type="submit" 
                  onClick={updateProduct}
                  disabled={isEditingProduct}
                >
                  {isEditingProduct ? 'Đang cập nhật...' : 'Cập nhật'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

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
                <TableHead>Đơn Vị</TableHead>
                <TableHead>Hãng Sản Xuất</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Mô Tả</TableHead>
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
                  onClick={() => handleSort('updated_at')}
                >
                  <div className="flex items-center">
                    Cập Nhật
                    {getSortIcon('updated_at')}
                  </div>
                </TableHead>
                {canManageProducts && (
                  <TableHead className="text-center">Thao Tác</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManageProducts ? (canViewCostPrice ? 11 : 10) : (canViewCostPrice ? 10 : 9)} className="text-center py-8 text-muted-foreground">
                    {sortedProducts.length === 0 ? "Chưa có sản phẩm nào" : "Không có sản phẩm nào trong trang này"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.code}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{getCategoryNameFromValue(product.category) || '-'}</TableCell>
                    <TableCell>{product.unit || 'cái'}</TableCell>
                    <TableCell>{product.manufacturer || '-'}</TableCell>
                    <TableCell>{product.barcode || '-'}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={product.description || ''}>
                        {product.description || '-'}
                      </div>
                    </TableCell>
                    {canViewCostPrice && (
                      <TableCell>{formatCurrency(product.costPrice || 0)}</TableCell>
                    )}
                    <TableCell>
                      {(() => {
                        const price = product.price || 0;
                        return formatCurrency(price);
                      })()}
                    </TableCell>
                    <TableCell>
                      {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('vi-VN') : '-'}
                    </TableCell>
                    {canManageProducts && (
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditProduct(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteProduct(product.id, product.name)}
                          >
                            <Trash2 className="h-4 w-4" />
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
      </CardContent>
    </Card>
  );
};

export default ProductList;

