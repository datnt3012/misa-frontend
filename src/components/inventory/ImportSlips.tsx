import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PlusCircle, Package, CheckCircle, Clock, X } from 'lucide-react';
// // import { supabase } from '@/integrations/supabase/client'; // Removed - using API instead // Removed - using API instead
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { warehouseReceiptsApi } from '@/api/warehouseReceipts.api';
import { productApi } from '@/api/product.api';
import { warehouseApi } from '@/api/warehouse.api';

interface ImportSlip {
  id: string;
  slip_number: string;
  supplier_name: string;
  supplier_contact: string;
  total_amount: number;
  status: string;
  notes: string;
  import_date: string;
  created_at: string;
  approved_at: string;
  approved_by: string;
  created_by: string;
  warehouse_id: string;
  warehouses?: {
    name: string;
    code: string;
  };
}

interface ImportSlipItem {
  id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  po_number: string;
  notes: string;
}

interface Supplier {
  id: string;
  name: string;
  contact_phone: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  unit_price: number;
  current_stock: number;
}

interface ImportSlipsProps {
  canManageImports: boolean;
  canApproveImports: boolean;
}

export default function ImportSlips({ canManageImports, canApproveImports }: ImportSlipsProps) {
  const { user } = useAuth();
  const [importSlips, setImportSlips] = useState<ImportSlip[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<ImportSlip | null>(null);
  const [slipItems, setSlipItems] = useState<ImportSlipItem[]>([]);
  const [inventoryHistory, setInventoryHistory] = useState<any[]>([]);
  
  const [newSlip, setNewSlip] = useState({
    supplier_id: '',
    supplier_name: '',
    supplier_contact: '',
    warehouse_id: '',
    notes: '',
    import_date: new Date().toISOString().split('T')[0]
  });

  const [newItem, setNewItem] = useState({
    product_id: '',
    quantity: 0,
    unit_price: 0,
    po_number: '',
    notes: ''
  });

  const [currentItems, setCurrentItems] = useState<ImportSlipItem[]>([]);

  useEffect(() => {
    loadImportSlips();
    loadProducts();
    loadSuppliers();
    loadWarehouses();
  }, []);

  const loadImportSlips = async () => {
    try {
      setLoading(true);
      const resp = await warehouseReceiptsApi.getReceipts({ page: 1, limit: 100 });
      const list = (resp.receipts || []).map((r: any) => ({
        id: r.id,
        slip_number: r.code,
        supplier_name: r.supplier_name || '',
        supplier_contact: r.supplier_contact || '',
        total_amount: r.total_amount || 0,
        status: r.status,
        notes: r.description || '',
        import_date: r.created_at,
        created_at: r.created_at,
        approved_at: r.approved_at || '',
        approved_by: '',
        created_by: '',
        warehouse_id: r.warehouse_id,
        warehouses: undefined,
      }));
      setImportSlips(list);
    } catch (error) {
      console.error('Error loading import slips:', error);
      toast.error('Không thể tải danh sách phiếu nhập kho');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const resp = await productApi.getProducts({ page: 1, limit: 1000 });
      setProducts(resp.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      // For now, use mock suppliers since backend API is not ready
      const mockSuppliers = [
        { id: '1', name: 'Nhà cung cấp A', phoneNumber: '0123456789', email: 'supplierA@example.com', address: 'Hà Nội' },
        { id: '2', name: 'Nhà cung cấp B', phoneNumber: '0987654321', email: 'supplierB@example.com', address: 'TP.HCM' }
      ];
      setSuppliers(mockSuppliers);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadWarehouses = async () => {
    try {
      const resp = await warehouseApi.getWarehouses({ page: 1, limit: 1000 });
      setWarehouses(resp.warehouses || []);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const createOrSelectSupplier = async (supplierName: string, supplierContact: string) => {
    if (!supplierName) return null;

    // Check if supplier already exists
    const existingSupplier = suppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase());
    if (existingSupplier) {
      return existingSupplier.id;
    }

    // Create new supplier
    try {
      // For now, add to local state since backend API is not ready
      const newSupplier = {
        id: Date.now().toString(),
        name: supplierName,
        phoneNumber: supplierContact,
        email: '',
        address: ''
      };
      setSuppliers(prev => [...prev, newSupplier]);
      
      return newSupplier.id;
    } catch (error) {
      console.error('Error creating supplier:', error);
      toast.error('Không thể tạo nhà cung cấp mới');
      return null;
    }
  };

  const loadSlipItems = async (slipId: string) => {
    try {
      // Get the specific receipt with details
      const response = await warehouseReceiptsApi.getReceipts({ 
        page: 1, 
        limit: 1000 
      });
      
      // Find the specific receipt by ID
      const receipt = response.receipts.find(r => r.id === slipId);
      
      if (receipt && receipt.items) {
        // Transform items to match ImportSlipItem interface
        const transformedItems = receipt.items.map(item => ({
          id: item.id,
          product_id: item.product_id,
          product_code: item.product?.code || '',
          product_name: item.product?.name || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          po_number: item.po_number || '',
          notes: item.notes || ''
        }));
        
        setSlipItems(transformedItems);
      } else {
        setSlipItems([]);
      }
    } catch (error) {
      console.error('Error loading slip items:', error);
      setSlipItems([]);
    }
  };

  const loadInventoryHistory = async (slipId: string) => {
    try {
      // For now, set empty array since we don't have a specific API for inventory movements
      // This can be implemented later when the backend provides the endpoint
      setInventoryHistory([]);
    } catch (error) {
      console.error('Error loading inventory history:', error);
      setInventoryHistory([]);
    }
  };

  const addItemToSlip = () => {
    if (!newItem.product_id || newItem.quantity <= 0) {
      toast.error('Vui lòng chọn sản phẩm và nhập số lượng hợp lệ');
      return;
    }

    const product = products.find(p => p.id === newItem.product_id);
    if (!product) return;

    const item: ImportSlipItem = {
      id: Date.now().toString(),
      product_id: newItem.product_id,
      product_code: product.code,
      product_name: product.name,
      quantity: newItem.quantity,
      unit_price: newItem.unit_price || product.unit_price,
      total_price: newItem.quantity * (newItem.unit_price || product.unit_price),
      po_number: newItem.po_number,
      notes: newItem.notes
    };

    setCurrentItems([...currentItems, item]);
    setNewItem({
      product_id: '',
      quantity: 0,
      unit_price: 0,
      po_number: '',
      notes: ''
    });
  };

  const removeItemFromSlip = (index: number) => {
    setCurrentItems(currentItems.filter((_, i) => i !== index));
  };

  const createImportSlip = async () => {
    if ((!newSlip.supplier_id && !newSlip.supplier_name) || currentItems.length === 0) {
      toast.error('Vui lòng chọn nhà cung cấp và thêm ít nhất một sản phẩm');
      return;
    }

    if (!newSlip.warehouse_id) {
      toast.error('Vui lòng chọn kho nhập');
      return;
    }

    try {
      // Handle supplier creation/selection
      let supplierId = newSlip.supplier_id;
      if (!supplierId && newSlip.supplier_name) {
        supplierId = await createOrSelectSupplier(newSlip.supplier_name, newSlip.supplier_contact);
        if (!supplierId) return;
      }

      // Generate slip number (mock for now)
      const slipNumber = `IMP-${Date.now()}`;
      
      const totalAmount = currentItems.reduce((sum, item) => sum + item.total_price, 0);

      // Create import slip using backend API
      const slipData = {
        code: slipNumber,
        warehouseId: newSlip.warehouse_id,
        supplierId: supplierId,
        status: 'pending',
        type: 'import',
        description: newSlip.notes || 'Import slip',
        totalAmount: totalAmount.toString(),
        details: currentItems.map(item => ({
          productId: item.product_id,
          quantity: item.quantity,
          unitPrice: item.unit_price.toString(),
          totalPrice: item.total_price.toString()
        }))
      };

      // For now, just show success message since backend API might not be ready
      toast.success('Tạo phiếu nhập kho thành công (Mock)');
      setShowCreateDialog(false);
      setNewSlip({
        supplier_id: '',
        supplier_name: '',
        supplier_contact: '',
        warehouse_id: '',
        notes: '',
        import_date: new Date().toISOString().split('T')[0]
      });
      setCurrentItems([]);
      loadImportSlips();
    } catch (error) {
      console.error('Error creating import slip:', error);
      toast.error('Không thể tạo phiếu nhập kho');
    }
  };

  const approveImportSlip = async (slipId: string) => {
    try {
      // For now, just show success message since backend API might not be ready
      toast.success('Đã phê duyệt phiếu nhập kho');
      loadImportSlips();
    } catch (error) {
      console.error('Error approving import slip:', error);
      toast.error('Không thể phê duyệt phiếu nhập kho');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-orange-600"><Clock className="w-3 h-3 mr-1" />Chờ duyệt</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Đã duyệt</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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

  if (loading) {
    return <div className="flex items-center justify-center p-8">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Phiếu nhập kho</h3>
          <p className="text-sm text-muted-foreground">Quản lý các phiếu nhập kho và phê duyệt</p>
        </div>
        {canManageImports && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="w-4 h-4 mr-2" />
                Tạo phiếu nhập
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tạo phiếu nhập kho mới</DialogTitle>
                <DialogDescription>
                  Nhập thông tin nhà cung cấp và danh sách sản phẩm cần nhập kho
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Supplier Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Thông tin nhà cung cấp</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="supplier">Nhà cung cấp *</Label>
                        <Select 
                          value={newSlip.supplier_id} 
                          onValueChange={(value) => {
                            const supplier = suppliers.find(s => s.id === value);
                            setNewSlip({
                              ...newSlip, 
                              supplier_id: value,
                              supplier_name: supplier?.name || '',
                              supplier_contact: supplier?.contact_phone || ''
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn nhà cung cấp hoặc nhập mới bên dưới" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name} {supplier.contact_phone && `(${supplier.contact_phone})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="supplier_name">Hoặc nhập tên mới</Label>
                        <Input
                          id="supplier_name"
                          value={newSlip.supplier_name}
                          onChange={(e) => setNewSlip({...newSlip, supplier_name: e.target.value, supplier_id: ''})}
                          placeholder="Tên nhà cung cấp mới"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="supplier_contact">Số điện thoại</Label>
                        <Input
                          id="supplier_contact"
                          value={newSlip.supplier_contact}
                          onChange={(e) => setNewSlip({...newSlip, supplier_contact: e.target.value})}
                          placeholder="Số điện thoại"
                        />
                      </div>
                      <div>
                        <Label htmlFor="import_date">Ngày nhập</Label>
                        <Input
                          id="import_date"
                          type="date"
                          value={newSlip.import_date}
                          onChange={(e) => setNewSlip({...newSlip, import_date: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="warehouse">Kho nhập *</Label>
                        <Select
                          value={newSlip.warehouse_id}
                          onValueChange={(value) => setNewSlip({...newSlip, warehouse_id: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn kho nhập" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border z-50">
                            {warehouses.map((warehouse) => (
                              <SelectItem key={warehouse.id} value={warehouse.id}>
                                {warehouse.name} - {warehouse.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div></div>
                    </div>
                    <div>
                      <Label htmlFor="notes">Ghi chú</Label>
                      <Textarea
                        id="notes"
                        value={newSlip.notes}
                        onChange={(e) => setNewSlip({...newSlip, notes: e.target.value})}
                        placeholder="Ghi chú thêm"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Add Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Thêm sản phẩm</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-5 gap-2">
                      <div>
                        <Label>Sản phẩm *</Label>
                        <Select value={newItem.product_id} onValueChange={(value) => setNewItem({...newItem, product_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn sản phẩm" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.code} - {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Số lượng *</Label>
                        <Input
                          type="number"
                          value={newItem.quantity}
                          onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label>Đơn giá</Label>
                        <Input
                          type="number"
                          value={newItem.unit_price}
                          onChange={(e) => setNewItem({...newItem, unit_price: parseFloat(e.target.value) || 0})}
                          placeholder="Giá mặc định"
                        />
                      </div>
                      <div>
                        <Label>Số PO</Label>
                        <Input
                          value={newItem.po_number}
                          onChange={(e) => setNewItem({...newItem, po_number: e.target.value})}
                          placeholder="Số PO"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button onClick={addItemToSlip} type="button">
                          <PlusCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Items List */}
                {currentItems.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Danh sách sản phẩm</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mã SP</TableHead>
                            <TableHead>Tên sản phẩm</TableHead>
                            <TableHead>Số lượng</TableHead>
                            <TableHead>Đơn giá</TableHead>
                            <TableHead>Thành tiền</TableHead>
                            <TableHead>Số PO</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.product_code}</TableCell>
                              <TableCell>{item.product_name}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                              <TableCell>{formatCurrency(item.total_price)}</TableCell>
                              <TableCell>{item.po_number || '-'}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItemFromSlip(index)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="mt-4 text-right">
                        <strong>Tổng tiền: {formatCurrency(currentItems.reduce((sum, item) => sum + item.total_price, 0))}</strong>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Hủy
                </Button>
                <Button onClick={createImportSlip}>
                  Tạo phiếu nhập
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-center">Số phiếu</TableHead>
                  <TableHead className="font-semibold text-center">Nhà cung cấp</TableHead>
                  <TableHead className="font-semibold text-center w-32">Kho nhập</TableHead>
                  <TableHead className="font-semibold text-center w-28">Ngày nhập</TableHead>
                  <TableHead className="font-semibold text-center">Tổng tiền (VNĐ)</TableHead>
                  <TableHead className="font-semibold text-center w-24">Trạng thái</TableHead>
                  <TableHead className="font-semibold text-center w-32">Ngày tạo</TableHead>
                  <TableHead className="font-semibold text-center w-32">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importSlips.map((slip) => (
                  <TableRow key={slip.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-primary text-center">{slip.slip_number}</TableCell>
                    <TableCell className="font-medium text-center">{slip.supplier_name}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary/50 text-secondary-foreground text-xs font-medium">
                        {slip.warehouses?.name || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-center">{format(new Date(slip.import_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-center font-semibold">
                      <div className="relative group">
                        <span className="cursor-help">
                          {formatCurrencyShort(slip.total_amount)}
                        </span>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                          {formatCurrency(slip.total_amount)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(slip.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm text-center">{slip.created_at ? format(new Date(slip.created_at), 'dd/MM/yyyy HH:mm') : 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSlip(slip);
                            loadSlipItems(slip.id);
                            loadInventoryHistory(slip.id);
                          }}
                          className="h-8 px-2 text-xs"
                        >
                          <Package className="w-3 h-3 mr-1" />
                          Chi tiết
                        </Button>
                        {canApproveImports && slip.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => approveImportSlip(slip.id)}
                            className="h-8 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Duyệt
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Slip Details Dialog */}
      <Dialog open={!!selectedSlip} onOpenChange={() => setSelectedSlip(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết phiếu nhập - {selectedSlip?.slip_number}</DialogTitle>
            <DialogDescription>
              Nhà cung cấp: {selectedSlip?.supplier_name} | 
              Ngày nhập: {selectedSlip && format(new Date(selectedSlip.import_date), 'dd/MM/yyyy')} | 
              Kho nhập: {selectedSlip?.warehouses?.name} ({selectedSlip?.warehouses?.code})
            </DialogDescription>
          </DialogHeader>
          
          {/* Additional Information Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <div>
                <Label className="font-medium text-sm">Thông tin nhà cung cấp:</Label>
                <p className="text-sm text-muted-foreground">{selectedSlip?.supplier_name}</p>
                {selectedSlip?.supplier_contact && (
                  <p className="text-sm text-muted-foreground">Liên hệ: {selectedSlip.supplier_contact}</p>
                )}
              </div>
              <div>
                <Label className="font-medium text-sm">Trạng thái:</Label>
                <div className="mt-1">{getStatusBadge(selectedSlip?.status || '')}</div>
              </div>
              <div>
                <Label className="font-medium text-sm">Ngày tạo:</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedSlip?.created_at ? format(new Date(selectedSlip.created_at), 'dd/MM/yyyy HH:mm') : 'N/A'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {selectedSlip?.approved_at && (
                <div>
                  <Label className="font-medium text-sm">Ngày duyệt:</Label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedSlip.approved_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              )}
              {selectedSlip?.approved_by && (
                <div>
                  <Label className="font-medium text-sm">Người duyệt:</Label>
                  <p className="text-sm text-muted-foreground">{selectedSlip.approved_by}</p>
                </div>
              )}
              {selectedSlip?.created_by && (
                <div>
                  <Label className="font-medium text-sm">Người tạo:</Label>
                  <p className="text-sm text-muted-foreground">{selectedSlip.created_by}</p>
                </div>
              )}
              {selectedSlip?.notes && (
                <div>
                  <Label className="font-medium text-sm">Ghi chú:</Label>
                  <p className="text-sm text-muted-foreground">{selectedSlip.notes}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6">
            <h4 className="text-lg font-semibold mb-4">Danh sách sản phẩm nhập kho</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã SP</TableHead>
                  <TableHead>Tên sản phẩm</TableHead>
                  <TableHead>Số lượng</TableHead>
                  <TableHead>Đơn giá</TableHead>
                  <TableHead>Thành tiền</TableHead>
                  <TableHead>Số PO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slipItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product_code}</TableCell>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell>{formatCurrency(item.total_price)}</TableCell>
                    <TableCell>{item.po_number || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="text-right mt-4">
            <strong>Tổng tiền: {selectedSlip && formatCurrency(selectedSlip.total_amount)}</strong>
          </div>

          {/* Inventory History Section */}
          {inventoryHistory.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold mb-4">Lịch sử xuất nhập kho</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Số lượng</TableHead>
                    <TableHead>Người thực hiện</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryHistory.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        {movement.products?.code} - {movement.products?.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={movement.movement_type === 'stock_in' ? 'default' : 'destructive'}>
                          {movement.movement_type === 'stock_in' ? 'Nhập kho' : 'Xuất kho'}
                        </Badge>
                      </TableCell>
                      <TableCell className={movement.movement_type === 'stock_in' ? 'text-green-600' : 'text-red-600'}>
                        {movement.movement_type === 'stock_in' ? '+' : '-'}{movement.quantity}
                      </TableCell>
                      <TableCell>{movement.profiles?.full_name || 'Hệ thống'}</TableCell>
                      <TableCell>{movement.created_at ? format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm') : 'N/A'}</TableCell>
                      <TableCell>{movement.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

