import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, Building2, Phone, Mail, MapPin, AlertTriangle } from 'lucide-react';
import { PermissionGuard } from '@/components/PermissionGuard';
import { supplierApi } from '@/api/supplier.api';

interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_phone: string;
  email: string;
  address: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateSupplierRequest {
  name: string;
  code?: string;
  phoneNumber: string;
  email: string;
  address: string;
}

interface UpdateSupplierRequest {
  name?: string;
  code?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
}

const SuppliersContent: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [newSupplier, setNewSupplier] = useState<CreateSupplierRequest>({
    name: '',
    code: '',
    phoneNumber: '',
    email: '',
    address: ''
  });
  const { toast } = useToast();

  // Load suppliers on component mount
  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const response = await supplierApi.getSuppliers({ page: 1, limit: 1000 });
      setSuppliers(response.suppliers || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast({
        title: "Lỗi tải dữ liệu",
        description: "Không thể tải danh sách nhà cung cấp",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplier.name.trim()) {
      toast({
        title: "Lỗi",
        description: "Tên nhà cung cấp không được để trống",
        variant: "destructive",
      });
      return;
    }

    if (!newSupplier.phoneNumber.trim()) {
      toast({
        title: "Lỗi",
        description: "Số điện thoại không được để trống",
        variant: "destructive",
      });
      return;
    }

    try {
      await supplierApi.createSupplier(newSupplier);
      toast({
        title: "Thành công",
        description: "Tạo nhà cung cấp thành công",
      });
      setShowCreateDialog(false);
      setNewSupplier({ name: '', code: '', phoneNumber: '', email: '', address: '' });
      loadSuppliers();
    } catch (error: any) {
      console.error('Error creating supplier:', error);
      toast({
        title: "Lỗi tạo nhà cung cấp",
        description: error?.response?.data?.message || "Không thể tạo nhà cung cấp",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSupplier = async () => {
    if (!editingSupplier) return;

    if (!editingSupplier.name.trim()) {
      toast({
        title: "Lỗi",
        description: "Tên nhà cung cấp không được để trống",
        variant: "destructive",
      });
      return;
    }

    if (!editingSupplier.contact_phone.trim()) {
      toast({
        title: "Lỗi",
        description: "Số điện thoại không được để trống",
        variant: "destructive",
      });
      return;
    }

    try {
      const updateData: UpdateSupplierRequest = {
        name: editingSupplier.name,
        code: editingSupplier.code,
        phoneNumber: editingSupplier.contact_phone,
        email: editingSupplier.email,
        address: editingSupplier.address
      };

      await supplierApi.updateSupplier(editingSupplier.id, updateData);
      toast({
        title: "Thành công",
        description: "Cập nhật nhà cung cấp thành công",
      });
      setShowEditDialog(false);
      setEditingSupplier(null);
      loadSuppliers();
    } catch (error: any) {
      console.error('Error updating supplier:', error);
      toast({
        title: "Lỗi cập nhật nhà cung cấp",
        description: error?.response?.data?.message || "Không thể cập nhật nhà cung cấp",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSupplier = async (supplier: Supplier) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa nhà cung cấp "${supplier.name}"?`)) {
      return;
    }

    try {
      await supplierApi.deleteSupplier(supplier.id);
      toast({
        title: "Thành công",
        description: "Xóa nhà cung cấp thành công",
      });
      loadSuppliers();
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      toast({
        title: "Lỗi xóa nhà cung cấp",
        description: error?.response?.data?.message || "Không thể xóa nhà cung cấp",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (supplier: Supplier) => {
    setEditingSupplier({ ...supplier });
    setShowEditDialog(true);
  };

  // Filter suppliers based on search term
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_phone.includes(searchTerm) ||
    supplier.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý Nhà cung cấp</h1>
          <p className="text-muted-foreground">
            Quản lý thông tin các nhà cung cấp trong hệ thống
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Thêm nhà cung cấp
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Thêm nhà cung cấp mới</DialogTitle>
              <DialogDescription>
                Nhập thông tin nhà cung cấp mới vào form bên dưới.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên nhà cung cấp *</Label>
                <Input
                  id="name"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  placeholder="Nhập tên nhà cung cấp"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code">Mã nhà cung cấp</Label>
                <Input
                  id="code"
                  value={newSupplier.code}
                  onChange={(e) => setNewSupplier({ ...newSupplier, code: e.target.value })}
                  placeholder="Nhập mã nhà cung cấp (tự động nếu để trống)"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Số điện thoại *</Label>
                <Input
                  id="phone"
                  value={newSupplier.phoneNumber}
                  onChange={(e) => setNewSupplier({ ...newSupplier, phoneNumber: e.target.value })}
                  placeholder="Nhập số điện thoại"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                  placeholder="Nhập email"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Địa chỉ</Label>
                <Input
                  id="address"
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  placeholder="Nhập địa chỉ"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Hủy
              </Button>
              <Button onClick={handleCreateSupplier}>
                Tạo nhà cung cấp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Tìm kiếm nhà cung cấp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Tìm kiếm theo tên, mã, số điện thoại, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Danh sách nhà cung cấp
          </CardTitle>
          <CardDescription>
            Tổng cộng {filteredSuppliers.length} nhà cung cấp
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Đang tải dữ liệu...</p>
              </div>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {searchTerm ? 'Không tìm thấy nhà cung cấp nào phù hợp với từ khóa tìm kiếm.' : 'Chưa có nhà cung cấp nào trong hệ thống.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã</TableHead>
                    <TableHead>Tên nhà cung cấp</TableHead>
                    <TableHead>Số điện thoại</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Địa chỉ</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-mono">{supplier.code}</TableCell>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          {supplier.contact_phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplier.email ? (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            {supplier.email}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {supplier.address ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="max-w-48 truncate" title={supplier.address}>
                              {supplier.address}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={supplier.isDeleted ? "destructive" : "default"}>
                          {supplier.isDeleted ? "Đã xóa" : "Hoạt động"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(supplier)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSupplier(supplier)}
                            disabled={supplier.isDeleted}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa nhà cung cấp</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin nhà cung cấp.
            </DialogDescription>
          </DialogHeader>
          {editingSupplier && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Tên nhà cung cấp *</Label>
                <Input
                  id="edit-name"
                  value={editingSupplier.name}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                  placeholder="Nhập tên nhà cung cấp"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-code">Mã nhà cung cấp</Label>
                <Input
                  id="edit-code"
                  value={editingSupplier.code}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, code: e.target.value })}
                  placeholder="Nhập mã nhà cung cấp"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Số điện thoại *</Label>
                <Input
                  id="edit-phone"
                  value={editingSupplier.contact_phone}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, contact_phone: e.target.value })}
                  placeholder="Nhập số điện thoại"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingSupplier.email}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                  placeholder="Nhập email"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-address">Địa chỉ</Label>
                <Input
                  id="edit-address"
                  value={editingSupplier.address}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
                  placeholder="Nhập địa chỉ"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleUpdateSupplier}>
              Cập nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

const Suppliers: React.FC = () => {
  return (
    <PermissionGuard requiredPermissions={['suppliers.view']}>
      <SuppliersContent />
    </PermissionGuard>
  );
};

export default Suppliers;
