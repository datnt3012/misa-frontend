import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  MoreHorizontal,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { categoriesApi, Category, CreateCategoryRequest, UpdateCategoryRequest } from '@/api/categories.api';
import { getErrorMessage } from '@/lib/error-utils';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { UnauthorizedPage } from '@/components/UnauthorizedPage';
import { LoadingWrapper } from '@/components/LoadingWrapper';
interface CategoriesContentProps {
  embedded?: boolean;
}
const CategoriesContent: React.FC<CategoriesContentProps> = ({ embedded = false }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState<CreateCategoryRequest>({
    name: '',
    description: ''
  });
  const [editCategory, setEditCategory] = useState<UpdateCategoryRequest>({
    name: '',
    description: ''
  });
  const { toast } = useToast();
  // Frontend permission checks for UI controls
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('CATEGORIES_CREATE');
  const canUpdate = hasPermission('CATEGORIES_UPDATE');
  const canDelete = hasPermission('CATEGORIES_DELETE');
  // Hybrid permission system: Frontend controls UI visibility, Backend blocks API calls
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const isActiveFilter = statusFilter === 'all' ? undefined : statusFilter === 'active';
      const response = await categoriesApi.getCategories({ 
        page: 1, 
        limit: 1000,
        ...(isActiveFilter !== undefined ? { isActive: isActiveFilter } : {})
      });
      setCategories(response.categories || []);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể tải danh sách loại sản phẩm",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);
  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên loại sản phẩm",
        variant: "destructive",
      });
      return;
    }
    try {
      const response = await categoriesApi.createCategory(newCategory);
      toast({
        title: "Thành công",
        description: "Đã thêm loại sản phẩm mới",
      });
      setNewCategory({ name: '', description: '' });
      setIsAddDialogOpen(false);
      fetchCategories();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể thêm loại sản phẩm",
        variant: "destructive",
      });
    }
  };
  const handleEditCategory = async () => {
    if (!editingCategory || !editCategory.name?.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên loại sản phẩm",
        variant: "destructive",
      });
      return;
    }
    try {
      const response = await categoriesApi.updateCategory(editingCategory.id, editCategory);
      toast({
        title: "Thành công",
        description: "Đã cập nhật loại sản phẩm",
      });
      setEditingCategory(null);
      setEditCategory({ name: '', description: '' });
      setIsEditDialogOpen(false);
      fetchCategories();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể cập nhật loại sản phẩm",
        variant: "destructive",
      });
    }
  };
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await categoriesApi.deleteCategory(categoryToDelete.id);
      toast({
        title: "Thành công",
        description: "Đã xóa loại sản phẩm",
      });
      setCategoryToDelete(null);
      setIsDeleteDialogOpen(false);
      fetchCategories();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể xóa loại sản phẩm",
        variant: "destructive",
      });
    }
  };
  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
      setEditCategory({
        name: category.name,
        description: category.description || ''
      });
    setIsEditDialogOpen(true);
  };
  const openDeleteDialog = (category: Category) => {
    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  };
  const handleToggleStatus = async (category: Category) => {
    if (!canUpdate) {
      toast({
        title: "Lỗi",
        description: "Bạn không có quyền cập nhật loại sản phẩm",
        variant: "destructive",
      });
      return;
    }
    try {
      const newStatus = !category.isActive;
      await categoriesApi.updateCategory(category.id, { isActive: newStatus });
      toast({
        title: "Thành công",
        description: newStatus 
          ? "Đã kích hoạt loại sản phẩm" 
          : "Đã vô hiệu hóa loại sản phẩm",
      });
      fetchCategories();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể cập nhật trạng thái loại sản phẩm",
        variant: "destructive",
      });
    }
  };
  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Đang tải loại sản phẩm...</p>
        </div>
      </div>
    );
  }
  return (
    <LoadingWrapper
      isLoading={loading}
      error={null}
      onRetry={fetchCategories}
      loadingMessage="Đang tải danh sách loại sản phẩm..."
    >
      <div className={embedded ? "space-y-6" : "container mx-auto px-4 py-6 space-y-6"}>
      {/* Header */}
      {!embedded && (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Loại sản phẩm</h1>
          <p className="text-muted-foreground">
            Quản lý các loại sản phẩm trong hệ thống
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm loại sản phẩm
          </Button>
        )}
      </div>
      )}
      {embedded && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Loại Sản Phẩm</h2>
            <p className="text-muted-foreground">
              Quản lý các loại sản phẩm trong hệ thống
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Thêm loại sản phẩm
            </Button>
          )}
        </div>
      )}
      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="text-sm font-medium mb-2 block">Tìm kiếm</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Tìm theo tên hoặc mô tả..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Label htmlFor="status" className="text-sm font-medium mb-2 block">Trạng thái</Label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="inactive">Không hoạt động</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Categories Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Danh sách loại sản phẩm ({filteredCategories.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Không có loại sản phẩm nào</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Không tìm thấy loại sản phẩm phù hợp với bộ lọc'
                  : 'Hãy thêm loại sản phẩm đầu tiên để bắt đầu'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm loại sản phẩm
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] text-center">Tên loại sản phẩm</TableHead>
                    <TableHead className="min-w-[250px] text-center">Mô tả</TableHead>
                    <TableHead className="w-[140px] text-center">Trạng thái</TableHead>
                    <TableHead className="w-[120px] text-center">Ngày tạo</TableHead>
                    {(canUpdate || canDelete) && (
                      <TableHead className="w-[120px] text-center">Thao tác</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        {category.description ? (
                          <span className="text-muted-foreground">{category.description}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Không có mô tả</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={`${canUpdate ? "cursor-pointer hover:opacity-80 transition-opacity" : ""} whitespace-nowrap px-4 py-1 text-sm font-semibold flex items-center gap-2`}
                          style={{
                            backgroundColor: category.isActive ? '#10b981' : '#ef4444',
                            color: 'white',
                            borderColor: category.isActive ? '#10b981' : '#ef4444',
                          }}
                          onClick={canUpdate ? () => handleToggleStatus(category) : undefined}
                          onKeyDown={canUpdate ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleToggleStatus(category);
                            }
                          } : undefined}
                          role={canUpdate ? "button" : undefined}
                          tabIndex={canUpdate ? 0 : undefined}
                          title={canUpdate ? (category.isActive ? "Nhấn để vô hiệu hóa" : "Nhấn để kích hoạt") : undefined}
                        >
                          {category.isActive ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Đang hoạt động
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Không hoạt động
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(category.createdAt).toLocaleDateString('vi-VN')}
                      </TableCell>
                      {(canUpdate || canDelete) && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canUpdate && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(category)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteDialog(category)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Thêm loại sản phẩm mới</DialogTitle>
            <DialogDescription>
              Tạo loại sản phẩm mới trong hệ thống
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-name" className="text-sm font-medium">Tên loại sản phẩm <span className="text-red-500">*</span></Label>
              <Input
                id="add-name"
                value={newCategory.name}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nhập tên loại sản phẩm..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-description" className="text-sm font-medium">Mô tả</Label>
              <Textarea
                id="add-description"
                value={newCategory.description || ''}
                onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Nhập mô tả loại sản phẩm..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleAddCategory}>
              Thêm loại sản phẩm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa loại sản phẩm</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin loại sản phẩm
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sm font-medium">Tên loại sản phẩm <span className="text-red-500">*</span></Label>
              <Input
                id="edit-name"
                value={editCategory.name || ''}
                onChange={(e) => setEditCategory(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nhập tên loại sản phẩm..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-sm font-medium">Mô tả</Label>
              <Textarea
                id="edit-description"
                value={editCategory.description || ''}
                onChange={(e) => setEditCategory(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Nhập mô tả loại sản phẩm..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleEditCategory}>
              Cập nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Category Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa loại sản phẩm</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa loại sản phẩm "{categoryToDelete?.name}"? 
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory}>
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
      </LoadingWrapper>
  );
};
export { CategoriesContent };
export default function Categories() {
    return (
      <PermissionGuard 
        requiredPermissions={['CATEGORIES_VIEW']}
        requireAll={false}
      >
      <CategoriesContent />
    </PermissionGuard>
  );
}