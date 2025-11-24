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

// Icon mapping for different modules
const getResourceIcon = (module: string) => {
  const iconMap: Record<string, any> = {
    // Core Business Modules
    'Dashboard': TrendingUp,
    'Orders': ShoppingCart,
    'Customers': Users,
    'Suppliers': Building2,
    
    // Product & Inventory Management
    'Products': Package,
    'Categories': Package,
    'Inventory': Package,
    'Stock': Package,
    'Stock Levels': Package,
    'Warehouses': Building2,
    'Warehouse': Building2,
    'Warehouse Receipts': Package,
    
    // Reports & Analytics
    'Reports': TrendingUp,
    'Revenue': TrendingUp,
    
    // System Administration
    'Users': Users,
    'Roles': Shield,
    'Permissions': Shield,
    'Organizations': Building2,
    'Settings': Settings,
    'Other': Shield,
    'Export Slips': Package,
  };
  return iconMap[module] || Shield;
};

const getModuleDisplayName = (module: string) => {
  const displayNameMap: Record<string, string> = {
    // Core Business Modules
    'Dashboard': 'Tổng quan',
    'Orders': 'Đơn hàng',
    'Customers': 'Khách hàng',
    'Suppliers': 'Nhà cung cấp',

    // Product & Inventory Management
    'Products': 'Sản phẩm',
    'Categories': 'Loại sản phẩm',
    'Inventory': 'Kho',
    'Stock': 'Tồn kho',
    'Stock Levels': 'Số lượng tồn',
    'Warehouses': 'Kho hàng',
    'Warehouse': 'Kho hàng',
    'Warehouse Receipts': 'Phiếu nhập kho',
    'Export Slips': 'Phiếu xuất kho',

    // Reports & Analytics
    'Reports': 'Báo cáo',
    'Revenue': 'Doanh thu',

    // System Administration
    'Users': 'Người dùng',
    'Roles': 'Vai trò',
    'Permissions': 'Quyền hạn',
    'Settings': 'Cài đặt',
    'Other': 'Khác',
  };

  return displayNameMap[module] || module;
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
      
      // Filter out notification permissions - only keep permissions that don't start with NOTIFY_ or NOTIFICATIONS_
      const filteredPermissions = (permissionsData || []).filter(
        (p: Permission) => {
          const codeUpper = p.code.toUpperCase();
          return !codeUpper.startsWith('NOTIFY_') && !codeUpper.startsWith('NOTIFICATIONS_');
        }
      );
      setPermissions(filteredPermissions);
      
      // Debug: Log permissions to check if ORDERS_UPDATE_STATUS exists
      if (process.env.NODE_ENV === 'development') {
        const ordersPermissions = filteredPermissions.filter((p: Permission) => p.code?.startsWith('ORDERS_'));
        console.log('🔍 Orders permissions from backend:', ordersPermissions.map((p: Permission) => p.code));
        const updateStatusPermission = filteredPermissions.find((p: Permission) => p.code === 'ORDERS_UPDATE_STATUS');
        console.log('🔍 ORDERS_UPDATE_STATUS permission:', updateStatusPermission ? 'Found' : 'Not found');
      }
      
      // Update global permission name cache with filtered permissions (excluding notifications)
      // This ensures error messages can display translated permission names
      if (filteredPermissions && Array.isArray(filteredPermissions) && filteredPermissions.length > 0) {
        try {
          const { updatePermissionNameCacheFromRole } = await import('@/utils/permissionNames');
          updatePermissionNameCacheFromRole(filteredPermissions);
          console.log('✅ Updated global permission name cache from RolePermissionsManager');
        } catch (e) {
          console.warn('Could not update permission name cache:', e);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể tải dữ liệu",
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
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể tải danh sách vai trò",
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
      const createdRole = await usersApi.createRole(newRole);
      
      // Assign permissions to the created role
      if (newRole.permissions.length > 0) {
        await usersApi.assignPermissionsToRole(createdRole.id, newRole.permissions);
      }
      
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
      
      // Update permissions for the role
      if (editRole.permissions.length > 0) {
        await usersApi.assignPermissionsToRole(selectedRole.id, editRole.permissions);
      }
      
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

  // Group permissions by module extracted from code (MODULE_ACTION format)
  const getPermissionCategories = () => {
    const categories: Record<string, Permission[]> = {};
    
    permissions.forEach(permission => {
      if (!permission.isDeleted && permission.isActive) {
        // Extract module from permission code (MODULE_ACTION format)
        let module = extractModuleFromCode(permission.code);
        
        // Normalize module name one more time to ensure grouping
        // This handles cases where extractModuleFromCode might return variants
        module = normalizeModuleName(module);
        
        // Skip hidden permissions
        if (module === 'HIDDEN') {
          return;
        }
        // Hide Organizations permissions category from UI
        if (module === 'Organizations') {
          return;
        }
        // Hide Profiles permissions category from UI
        if (module === 'Profiles') {
          return;
        }
        if (!categories[module]) {
          categories[module] = [];
        }
        categories[module].push(permission);
      }
    });
    
    // Sort categories with warehouse-related groups together
    const sortedCategories: Record<string, Permission[]> = {};
    const categoryKeys = Object.keys(categories);
    
    // Define warehouse-related groups in order
    const warehouseGroups = ['Warehouses', 'Warehouse Receipts', 'Export Slips'];
    
    // Separate warehouse groups from other groups
    const warehouseKeys = categoryKeys.filter(key => warehouseGroups.includes(key));
    const otherKeys = categoryKeys.filter(key => !warehouseGroups.includes(key));
    
    // Sort warehouse keys according to defined order
    const sortedWarehouseKeys = warehouseGroups.filter(key => warehouseKeys.includes(key));
    
    // Sort other keys alphabetically
    const sortedOtherKeys = otherKeys.sort();
    
    // Combine: warehouse groups first, then others
    const finalOrder = [...sortedWarehouseKeys, ...sortedOtherKeys];
    
    finalOrder.forEach(key => {
      sortedCategories[key] = categories[key];
    });
    
    return sortedCategories;
  };

  // Extract module from permission code (MODULE_ACTION format)
  const extractModuleFromCode = (code: string): string => {
    const codeUpper = code.toUpperCase();
    
    // Handle special cases with multiple parts - check these FIRST before general splitting
    // Must check longer prefixes first to avoid matching shorter ones
    if (codeUpper.startsWith('WAREHOUSE_RECEIPTS_')) {
      return formatModuleName('WAREHOUSE_RECEIPTS');
    }
    if (codeUpper.startsWith('EXPORT_SLIPS_') || codeUpper.startsWith('EXPORT_SLIP_')) {
      return formatModuleName('EXPORT_SLIPS');
    }
    if (codeUpper.startsWith('STOCK_LEVELS_') || codeUpper.startsWith('STOCK_LEVEL_')) {
      return formatModuleName('STOCK_LEVELS');
    }
    
    // Handle ORDERS permissions (including ORDERS_UPDATE_STATUS)
    // Split by underscore and take the first part as module
    const parts = code.split('_');
    if (parts.length >= 2) {
      // For codes like ORDERS_UPDATE_STATUS, take the first part (ORDERS)
      // For codes like ORDERS_UPDATE, also take the first part (ORDERS)
      const module = parts[0].toUpperCase();
      
      // Special handling: Group related permissions together
      // EXPORT_* (not EXPORT_SLIPS_*) → Export Slips
      if (module === 'EXPORT') {
        return formatModuleName('EXPORT_SLIPS');
      }
      
      // WAREHOUSE_* (not WAREHOUSE_RECEIPTS_*) → Warehouse Receipts
      // But WAREHOUSES_* (plural) should stay as Warehouses
      if (module === 'WAREHOUSE') {
        // Check if second part is RECEIPTS (already handled above, but double-check)
        if (parts.length >= 2 && parts[1].toUpperCase() !== 'RECEIPTS') {
          return formatModuleName('WAREHOUSE_RECEIPTS');
        }
      }
      
      // STOCK_* (not STOCK_LEVELS_*) → Stock Levels
      if (module === 'STOCK') {
        return formatModuleName('STOCK_LEVELS');
      }
      
      // Convert to human-readable format
      return formatModuleName(parts[0]);
    }
    
    // If no underscore, try to extract from resource field as fallback
    const permission = permissions.find(p => p.code === code);
    if (permission?.resource) {
      // Use normalizeModuleName first to ensure grouping
      const normalizedResource = normalizeModuleName(permission.resource);
      if (normalizedResource !== permission.resource) {
        return normalizedResource;
      }
      // Then format normally
      return formatModuleName(permission.resource);
    }
    
    // If still no module found, put in "Other" category
    return 'Other';
  };

  // Normalize module name to ensure variants are grouped together
  const normalizeModuleName = (module: string): string => {
    if (!module) return module;
    
    // Normalize: remove spaces, dashes, underscores, convert to uppercase for comparison
    const normalized = module.toUpperCase().replace(/[\s\-_]/g, '');
    
    // STOCK related → Stock Levels
    if (normalized === 'STOCK' || normalized.startsWith('STOCKLEVEL') || normalized.startsWith('STOCKLEVELS')) {
      return 'Stock Levels';
    }
    
    // EXPORT related → Export Slips
    if (normalized === 'EXPORT' || normalized.startsWith('EXPORTSLIP') || normalized.startsWith('EXPORTSLIPS')) {
      return 'Export Slips';
    }
    
    // WAREHOUSE (but not WAREHOUSES) → Warehouse Receipts
    if (normalized === 'WAREHOUSE' || (normalized.startsWith('WAREHOUSE') && !normalized.startsWith('WAREHOUSES'))) {
      return 'Warehouse Receipts';
    }
    
    return module;
  };

  // Format module name to be more human-readable in English
  const formatModuleName = (module: string): string => {
    // First normalize to group variants
    const normalized = normalizeModuleName(module);
    if (normalized !== module) {
      return normalized;
    }
    
    const moduleUpper = module.toUpperCase().replace(/[\s\-_]/g, '');
    
    const moduleMap: Record<string, string> = {
      // Core Business Modules
      'DASHBOARD': 'Dashboard',
      'ORDERS': 'Orders',
      'CUSTOMERS': 'Customers',
      'SUPPLIERS': 'Suppliers',
      
      // Product & Inventory Management
      'PRODUCTS': 'Products',
      'CATEGORIES': 'Categories',
      'INVENTORY': 'Inventory',
      'STOCKLEVELS': 'Stock Levels',
      'STOCKLEVEL': 'Stock Levels',
      'STOCK': 'Stock Levels',
      'WAREHOUSES': 'Warehouses',
      'WAREHOUSERECEIPTS': 'Warehouse Receipts',
      'EXPORTSLIPS': 'Export Slips',
      'EXPORTSLIP': 'Export Slips',
      
      // Reports & Analytics
      'REPORTS': 'Reports',
      'REVENUE': 'Revenue',
      
      // System Administration
      'USERS': 'Users',
      'ROLES': 'Roles',
      'PERMISSIONS': 'Permissions',
      'ORGANIZATIONS': 'Organizations',
      'SETTINGS': 'Settings',
    };
    
    const mapped = moduleMap[moduleUpper];
    if (mapped) {
      return mapped;
    }
    
    // Fallback: try normalize again in case it wasn't caught
    const normalizedAgain = normalizeModuleName(module);
    if (normalizedAgain !== module) {
      return normalizedAgain;
    }
    
    return module.charAt(0).toUpperCase() + module.slice(1).toLowerCase();
  };

  // Convert backend permission to frontend format
  const convertBackendToFrontend = (permission: Permission): string => {
    // Keep EXPORT_SLIPS_VIEW as is (no mapping needed)
    return permission.code;
  };

  // Convert frontend permission to backend format
  const convertFrontendToBackend = (frontendPermission: string): string => {
    // Keep all permissions as is (no mapping needed)
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
                  <Label htmlFor="role-name">Tên vai trò <span className="text-red-500">*</span></Label>
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
                            {getModuleDisplayName(category)}
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
                          {categoryPermissions
                            .sort((a, b) => {
                              // Sort by permission type: VIEW, READ, MANAGE, etc.
                              const getPermissionOrder = (code: string) => {
                                if (code.includes('_VIEW')) return 1;
                                if (code.includes('_READ')) return 2;
                                if (code.includes('_MANAGE')) return 3;
                                if (code.includes('_CREATE')) return 4;
                                if (code.includes('_UPDATE')) return 5;
                                if (code.includes('_DELETE')) return 6;
                                if (code.includes('_APPROVE')) return 7;
                                if (code.includes('_EXPORT')) return 8;
                                return 9;
                              };
                              
                              const orderA = getPermissionOrder(a.code);
                              const orderB = getPermissionOrder(b.code);
                              
                              if (orderA !== orderB) {
                                return orderA - orderB;
                              }
                              
                              // If same order, sort by name
                              return a.name.localeCompare(b.name);
                            })
                            .map((permission) => {
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
                <Label htmlFor="edit-role-name">Tên vai trò <span className="text-red-500">*</span></Label>
                <Input
                  id="edit-role-name"
                  value={editRole.name}
                  onChange={(e) => setEditRole(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nhập tên vai trò"
                  minLength={2}
                  maxLength={100}
                />
                {selectedRole?.code && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Mã vai trò: <code className="bg-muted px-1 rounded">{selectedRole.code}</code> (không thay đổi)
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
                          {getModuleDisplayName(category)}
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
                        {categoryPermissions
                          .sort((a, b) => {
                            // Sort by permission type: VIEW, READ, MANAGE, etc.
                            const getPermissionOrder = (code: string) => {
                              if (code.includes('_VIEW')) return 1;
                              if (code.includes('_READ')) return 2;
                              if (code.includes('_MANAGE')) return 3;
                              if (code.includes('_CREATE')) return 4;
                              if (code.includes('_UPDATE')) return 5;
                              if (code.includes('_DELETE')) return 6;
                              if (code.includes('_APPROVE')) return 7;
                              if (code.includes('_EXPORT')) return 8;
                              return 9;
                            };
                            
                            const orderA = getPermissionOrder(a.code);
                            const orderB = getPermissionOrder(b.code);
                            
                            if (orderA !== orderB) {
                              return orderA - orderB;
                            }
                            
                            // If same order, sort by name
                            return a.name.localeCompare(b.name);
                          })
                          .map((permission) => {
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
                          {getModuleDisplayName(category)} ({roleCategoryPermissions.length} quyền)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-3">
                          {roleCategoryPermissions
                            .sort((a, b) => {
                              // Sort by permission type: VIEW, READ, MANAGE, etc.
                              const getPermissionOrder = (code: string) => {
                                if (code.includes('_VIEW')) return 1;
                                if (code.includes('_READ')) return 2;
                                if (code.includes('_MANAGE')) return 3;
                                if (code.includes('_CREATE')) return 4;
                                if (code.includes('_UPDATE')) return 5;
                                if (code.includes('_DELETE')) return 6;
                                if (code.includes('_APPROVE')) return 7;
                                if (code.includes('_EXPORT')) return 8;
                                return 9;
                              };
                              
                              const orderA = getPermissionOrder(a.code);
                              const orderB = getPermissionOrder(b.code);
                              
                              if (orderA !== orderB) {
                                return orderA - orderB;
                              }
                              
                              // If same order, sort by name
                              return a.name.localeCompare(b.name);
                            })
                            .map((permission) => (
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
