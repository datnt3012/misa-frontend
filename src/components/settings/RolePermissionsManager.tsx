import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Shield, Plus, Edit, Trash2, Save, X, Users, Settings, Package, ShoppingCart, TrendingUp, Building2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usersApi, UserRole, Permission } from '@/api/users.api';

// Icon mapping for different resources
const getResourceIcon = (resource: string) => {
  const iconMap: Record<string, any> = {
    'products': Package,
    'inventory': Package,
    'orders': ShoppingCart,
    'customers': Users,
    'suppliers': Building2,
    'revenue': TrendingUp,
    'users': Users,
    'roles': Shield,
    'settings': Settings,
    'warehouses': Building2,
    'categories': Package,
    'organizations': Building2,
    'profiles': Users,
  };
  return iconMap[resource] || Shield;
};

interface RolePermissionsManagerProps {
  onRoleUpdate?: () => void;
}

const RolePermissionsManager: React.FC<RolePermissionsManagerProps> = ({ onRoleUpdate }) => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<UserRole | null>(null);
  const [selectedRoleForDetails, setSelectedRoleForDetails] = useState<UserRole | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  // Form states
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] as string[] });
  const [editRole, setEditRole] = useState({ name: '', description: '', permissions: [] as string[] });
  
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permissionsData] = await Promise.all([
        usersApi.getUserRoles(),
        usersApi.getPermissions()
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải dữ liệu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      setLoading(true);
      const rolesData = await usersApi.getUserRoles();
      console.log('🔍 Loaded roles data:', rolesData);
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách vai trò",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) {
      toast({
        title: "Lỗi",
        description: "Tên vai trò là bắt buộc",
        variant: "destructive",
      });
      return;
    }

    if (newRole.permissions.length === 0) {
      toast({
        title: "Cảnh báo",
        description: "Vui lòng chọn ít nhất một quyền cho vai trò",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await usersApi.createRole(newRole);
      toast({
        title: "Thành công",
        description: `Đã tạo vai trò "${newRole.name}" với ${newRole.permissions.length} quyền`,
      });
      setIsCreateDialogOpen(false);
      setNewRole({ name: '', description: '', permissions: [] });
      loadRoles();
      onRoleUpdate?.();
    } catch (error: any) {
      console.error('Error creating role:', error);
      const errorMessage = error?.response?.data?.message || error?.message || "Không thể tạo vai trò";
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole || !editRole.name.trim()) {
      toast({
        title: "Lỗi",
        description: "Tên vai trò là bắt buộc",
        variant: "destructive",
      });
      return;
    }

    if (editRole.permissions.length === 0) {
      toast({
        title: "Cảnh báo",
        description: "Vui lòng chọn ít nhất một quyền cho vai trò",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await usersApi.updateRole(selectedRole.id, editRole);
      toast({
        title: "Thành công",
        description: `Đã cập nhật vai trò "${editRole.name}" với ${editRole.permissions.length} quyền`,
      });
      setIsEditDialogOpen(false);
      setSelectedRole(null);
      loadRoles();
      onRoleUpdate?.();
    } catch (error: any) {
      console.error('Error updating role:', error);
      const errorMessage = error?.response?.data?.message || error?.message || "Không thể cập nhật vai trò";
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    try {
      setLoading(true);
      await usersApi.deleteRole(roleToDelete.id);
      toast({
        title: "Thành công",
        description: `Đã xóa vai trò "${roleToDelete.name}"`,
      });
      setIsDeleteDialogOpen(false);
      setRoleToDelete(null);
      loadRoles();
      onRoleUpdate?.();
    } catch (error: any) {
      console.error('Error deleting role:', error);
      const errorMessage = error?.response?.data?.message || error?.message || "Không thể xóa vai trò";
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (role: UserRole) => {
    console.log('🔍 Opening edit dialog for role:', role);
    console.log('🔍 Role permissions:', role.permissions);
    setSelectedRole(role);
    setEditRole({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || [],
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (role: UserRole) => {
    setRoleToDelete(role);
    setIsDeleteDialogOpen(true);
  };

  const togglePermission = (permissionKey: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditRole(prev => ({
        ...prev,
        permissions: prev.permissions.includes(permissionKey)
          ? prev.permissions.filter(p => p !== permissionKey)
          : [...prev.permissions, permissionKey]
      }));
    } else {
      setNewRole(prev => ({
        ...prev,
        permissions: prev.permissions.includes(permissionKey)
          ? prev.permissions.filter(p => p !== permissionKey)
          : [...prev.permissions, permissionKey]
      }));
    }
  };

  const selectAllPermissions = (category: string, isEdit: boolean = false) => {
    const categoryPermissions = getPermissionCategories()[category]?.map(p => convertBackendToFrontend(p)) || [];
    if (isEdit) {
      setEditRole(prev => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...categoryPermissions])]
      }));
    } else {
      setNewRole(prev => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...categoryPermissions])]
      }));
    }
  };

  const deselectAllPermissions = (category: string, isEdit: boolean = false) => {
    const categoryPermissions = getPermissionCategories()[category]?.map(p => convertBackendToFrontend(p)) || [];
    if (isEdit) {
      setEditRole(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => !categoryPermissions.includes(p))
      }));
    } else {
      setNewRole(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => !categoryPermissions.includes(p))
      }));
    }
  };

  const getRoleDisplayName = (roleName: string) => {
    switch (roleName) {
      case 'owner_director':
        return 'Giám đốc/Chủ sở hữu';
      case 'chief_accountant':
        return 'Kế toán trưởng';
      case 'accountant':
        return 'Kế toán';
      case 'inventory':
        return 'Quản kho';
      case 'shipper':
        return 'Giao hàng';
      default:
        return roleName;
    }
  };

  // Group permissions by resource (category)
  const getPermissionCategories = () => {
    const categories: Record<string, Permission[]> = {};
    
    permissions.forEach(permission => {
      if (!permission.isDeleted && permission.isActive) {
        const resource = permission.resource;
        if (!categories[resource]) {
          categories[resource] = [];
        }
        categories[resource].push(permission);
      }
    });
    return categories;
  };

  // Convert backend permission to frontend format
  const convertBackendToFrontend = (permission: Permission): string => {
    // Use the actual code from the API response
    return permission.code;
  };

  // Convert frontend permission to backend format
  const convertFrontendToBackend = (frontendPermission: string): string => {
    // The frontend permission is already the backend code
    return frontendPermission;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quản lý quyền vai trò</h2>
          <p className="text-muted-foreground">Tùy chỉnh quyền truy cập cho từng vai trò trong hệ thống</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Tạo vai trò mới
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tạo vai trò mới</DialogTitle>
              <DialogDescription>
                Tạo vai trò mới và cấu hình quyền truy cập
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role-name">Tên vai trò *</Label>
                  <Input
                    id="role-name"
                    value={newRole.name}
                    onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nhập tên vai trò"
                    minLength={2}
                    maxLength={100}
                  />
                  {newRole.name && (
                    <p className="text-sm text-muted-foreground">
                      Mã vai trò sẽ là: <code className="bg-muted px-1 rounded">
                        {newRole.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}
                      </code>
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="role-description">Mô tả</Label>
                  <Input
                    id="role-description"
                    value={newRole.description}
                    onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Mô tả vai trò"
                  />
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-base font-medium">Quyền truy cập</Label>
                <div className="space-y-4 mt-4">
                  {Object.entries(getPermissionCategories()).map(([category, categoryPermissions]) => (
                    <Card key={category}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            {React.createElement(getResourceIcon(category), { className: "w-4 h-4" })}
                            {category}
                          </CardTitle>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => selectAllPermissions(category)}
                            >
                              Chọn tất cả
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deselectAllPermissions(category)}
                            >
                              Bỏ chọn tất cả
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-3">
                          {categoryPermissions.map((permission) => {
                            const frontendKey = convertBackendToFrontend(permission);
                            return (
                              <div key={permission.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`new-${permission.id}`}
                                  checked={newRole.permissions.includes(frontendKey)}
                                  onCheckedChange={() => togglePermission(frontendKey)}
                                />
                                <Label htmlFor={`new-${permission.id}`} className="text-sm">
                                  {permission.name}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleCreateRole} disabled={loading}>
                {loading ? "Đang tạo..." : "Tạo vai trò"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>



      {/* Roles List */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách vai trò</CardTitle>
          <CardDescription>
            Quản lý và cấu hình quyền cho các vai trò trong hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên vai trò</TableHead>
                <TableHead>Mã vai trò</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Số quyền</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    {getRoleDisplayName(role.name)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {role.code || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>{role.description || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {role.permissions?.length || 0} quyền
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRoleForDetails(role);
                          setIsDetailsDialogOpen(true);
                        }}
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        Xem chi tiết
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(role)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Sửa
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(role)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Xóa
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa vai trò</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin và quyền truy cập cho vai trò
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                  <Label htmlFor="edit-role-name">Tên vai trò *</Label>
                  <Input
                    id="edit-role-name"
                    value={editRole.name}
                    onChange={(e) => setEditRole(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nhập tên vai trò"
                    minLength={2}
                    maxLength={100}
                  />
                  {editRole.name && (
                    <p className="text-sm text-muted-foreground">
                      Mã vai trò sẽ là: <code className="bg-muted px-1 rounded">
                        {editRole.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}
                      </code>
                    </p>
                  )}
              </div>
              <div>
                <Label htmlFor="edit-role-description">Mô tả</Label>
                <Input
                  id="edit-role-description"
                  value={editRole.description}
                  onChange={(e) => setEditRole(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Mô tả vai trò"
                />
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-base font-medium">Quyền truy cập</Label>
              <div className="space-y-4 mt-4">
                {Object.entries(getPermissionCategories()).map(([category, categoryPermissions]) => (
                  <Card key={category}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          {React.createElement(getResourceIcon(category), { className: "w-4 h-4" })}
                          {category}
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => selectAllPermissions(category, true)}
                          >
                            Chọn tất cả
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deselectAllPermissions(category, true)}
                          >
                            Bỏ chọn tất cả
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-3">
                        {categoryPermissions.map((permission) => {
                          const frontendKey = convertBackendToFrontend(permission);
                          return (
                            <div key={permission.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-${permission.id}`}
                                checked={editRole.permissions.includes(frontendKey)}
                                onCheckedChange={() => togglePermission(frontendKey, true)}
                              />
                              <Label htmlFor={`edit-${permission.id}`} className="text-sm">
                                {permission.name}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleUpdateRole} disabled={loading}>
              {loading ? "Đang cập nhật..." : "Cập nhật vai trò"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa vai trò</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa vai trò "{roleToDelete?.name}"? 
              <br />
              <strong>Mã vai trò:</strong> {roleToDelete?.code}
              <br />
              <strong>Số quyền:</strong> {roleToDelete?.permissions?.length || 0}
              <br />
              <br />
              <span className="text-destructive font-medium">
                Hành động này không thể hoàn tác.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDeleteRole} disabled={loading}>
              {loading ? "Đang xóa..." : "Xóa vai trò"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết vai trò: {selectedRoleForDetails?.name}</DialogTitle>
            <DialogDescription>
              {selectedRoleForDetails?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-medium">Tên vai trò</Label>
                <p className="text-sm text-muted-foreground">{selectedRoleForDetails?.name}</p>
              </div>
              <div>
                <Label className="font-medium">Số quyền</Label>
                <p className="text-sm text-muted-foreground">{selectedRoleForDetails?.permissions?.length || 0} quyền</p>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-base font-medium">Danh sách quyền</Label>
              <div className="space-y-4 mt-4">
                {Object.entries(getPermissionCategories()).map(([category, categoryPermissions]) => {
                  const rolePermissions = selectedRoleForDetails?.permissions || [];
                  const roleCategoryPermissions = categoryPermissions.filter(p => 
                    rolePermissions.includes(convertBackendToFrontend(p))
                  );
                  
                  if (roleCategoryPermissions.length === 0) return null;
                  
                  return (
                    <Card key={category}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          {React.createElement(getResourceIcon(category), { className: "w-4 h-4" })}
                          {category} ({roleCategoryPermissions.length} quyền)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-3">
                          {roleCategoryPermissions.map((permission) => (
                            <div key={permission.id} className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm">{permission.name}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolePermissionsManager;
