import React, { useState, useEffect } from 'react';
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

const CategoriesContent: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deleted'>('active');
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

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoriesApi.getCategories({ page: 1, limit: 1000 });
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể tải danh sách danh mục",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên danh mục",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await categoriesApi.createCategory(newCategory);
      toast({
        title: "Thành công",
        description: response.message || "Đã thêm danh mục mới",
      });
      setNewCategory({ name: '', description: '' });
      setIsAddDialogOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể thêm danh mục",
        variant: "destructive",
      });
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !editCategory.name?.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên danh mục",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await categoriesApi.updateCategory(editingCategory.id, editCategory);
      toast({
        title: "Thành công",
        description: response.message || "Đã cập nhật danh mục",
      });
      setEditingCategory(null);
      setEditCategory({ name: '', description: '' });
      setIsEditDialogOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể cập nhật danh mục",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      const response = await categoriesApi.deleteCategory(categoryToDelete.id);
      toast({
        title: "Thành công",
        description: response.message || "Đã xóa danh mục",
      });
      setCategoryToDelete(null);
      setIsDeleteDialogOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể xóa danh mục",
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

  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && !category.isDeleted) ||
                         (statusFilter === 'deleted' && category.isDeleted);
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Đang tải danh mục...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Danh mục</h1>
          <p className="text-muted-foreground">
            Quản lý các danh mục sản phẩm trong hệ thống
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm danh mục
          </Button>
        )}
      </div>

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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="deleted">Đã xóa</SelectItem>
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
            Danh sách danh mục ({filteredCategories.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Không có danh mục nào</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Không tìm thấy danh mục phù hợp với bộ lọc'
                  : 'Hãy thêm danh mục đầu tiên để bắt đầu'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm danh mục
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Tên danh mục</TableHead>
                    <TableHead className="min-w-[250px]">Mô tả</TableHead>
                    <TableHead className="w-[140px]">Trạng thái</TableHead>
                    <TableHead className="w-[120px]">Ngày tạo</TableHead>
                    {(canUpdate || canDelete) && (
                      <TableHead className="w-[120px] text-right">Thao tác</TableHead>
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
                        <Badge variant={!category.isDeleted ? "default" : "secondary"}>
                          {!category.isDeleted ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Đang hoạt động
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Đã xóa
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
            <DialogTitle>Thêm danh mục mới</DialogTitle>
            <DialogDescription>
              Tạo danh mục sản phẩm mới trong hệ thống
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-name" className="text-sm font-medium">Tên danh mục *</Label>
              <Input
                id="add-name"
                value={newCategory.name}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nhập tên danh mục..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-description" className="text-sm font-medium">Mô tả</Label>
              <Textarea
                id="add-description"
                value={newCategory.description || ''}
                onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Nhập mô tả danh mục..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleAddCategory}>
              Thêm danh mục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa danh mục</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin danh mục sản phẩm
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sm font-medium">Tên danh mục *</Label>
              <Input
                id="edit-name"
                value={editCategory.name || ''}
                onChange={(e) => setEditCategory(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nhập tên danh mục..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-sm font-medium">Mô tả</Label>
              <Textarea
                id="edit-description"
                value={editCategory.description || ''}
                onChange={(e) => setEditCategory(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Nhập mô tả danh mục..."
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
            <AlertDialogTitle>Xác nhận xóa danh mục</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa danh mục "{categoryToDelete?.name}"? 
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
  );
};

export default function Categories() {
  return (
    <PermissionGuard 
      requiredPermissions={['CATEGORIES_VIEW', 'CATEGORIES_READ']}
      requireAll={true}
    >
      <CategoriesContent />
    </PermissionGuard>
  );
}
