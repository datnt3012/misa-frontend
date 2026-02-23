import React, { useState, useEffect, useCallback } from 'react';
import { useDialogUrl } from '@/hooks/useDialogUrl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { MultiSelect } from '@/components/ui/multi-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { PlusCircle, Package, CheckCircle, Clock, X, XCircle, Trash2, Search, ChevronRight, Filter, RotateCw, Loader, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { warehouseReceiptsApi, type WarehouseReceipt as WarehouseReceiptType } from '@/api/warehouseReceipts.api';
import { productApi } from '@/api/product.api';
import { warehouseApi } from '@/api/warehouse.api';
import { NumberInput } from '@/components/ui/number-input';

interface MovingSlipItem {
  id?: string;
  product_id: string;
  product?: {
    id: string;
    code: string;
    name: string;
    description?: string;
    category?: string;
    unit?: string;
  };
  quantity: number;
  notes?: string;
}

interface MovingSlip {
  id: string;
  code: string;
  warehouse_id: string;
  new_warehouse_id?: string;
  status: string;
  notes?: string;
  created_at: string;
  completed_at?: string;
  approved_by?: string;
  description?: string;
  updated_at?: string;
  created_by: string;
  created_by_name?: string;
  items?: MovingSlipItem[];
  total_amount?: number;
}

const MovingSlips: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  // Use the page route as entityType so dialog URL state matches the current pathname
  const { openDialog, closeDialog, isDialogOpen } = useDialogUrl('export-import');
  const { hasPermission } = usePermissions();

  // State
  const [loading, setLoading] = useState(false);
  const [slips, setSlips] = useState<MovingSlip[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [displayLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedSlip, setSelectedSlip] = useState<MovingSlip | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState<string[]>([]);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [slipItems, setSlipItems] = useState<MovingSlipItem[]>([]);
  
  const [newSlip, setNewSlip] = useState({
    source_warehouse_id: undefined as string | undefined,
    destination_warehouse_id: undefined as string | undefined,
    notes: ''
  });
  
  const [newItem, setNewItem] = useState({
    product_id: '',
    quantity: 0,
    notes: ''
  });

  // Load warehouses and products
  useEffect(() => {
    const loadData = async () => {
      try {
        const [warehousesRes, productsRes] = await Promise.all([
          warehouseApi.getWarehouses(),
          productApi.getProducts({ page: 1, limit: 1000 })
        ]);
        setWarehouses(warehousesRes.warehouses || []);
        setProducts(productsRes.products || []);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  // Load moving slips
  const loadMovingSlips = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: displayLimit,
        type: 'moving',
        search: searchTerm || undefined
      };
      if (statusFilter.length > 0) params.status = statusFilter.join(',');
      if (warehouseFilter.length > 0) params.warehouseId = warehouseFilter.join(',');

      const response = await warehouseReceiptsApi.getReceipts(params);
      setSlips(response.receipts as MovingSlip[]);
      setTotal(response.total);
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể tải danh sách phiếu chuyển kho',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, displayLimit, searchTerm, statusFilter, warehouseFilter, toast]);

  useEffect(() => {
    loadMovingSlips();
  }, [loadMovingSlips]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!showCreateDialog) {
      setNewSlip({
        source_warehouse_id: undefined,
        destination_warehouse_id: undefined,
        notes: ''
      });
      setNewItem({
        product_id: '',
        quantity: 0,
        notes: ''
      });
      setSlipItems([]);
    }
  }, [showCreateDialog]);

  // Add item to slip
  const handleAddItem = () => {
    if (!newItem.product_id || newItem.quantity <= 0) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn sản phẩm và nhập số lượng',
        variant: 'destructive'
      });
      return;
    }

    const product = products.find(p => p.id === newItem.product_id);
    if (product) {
      const newItemData: MovingSlipItem = {
        product_id: newItem.product_id,
        product: {
          id: product.id,
          code: product.code || '',
          name: product.name || '',
          unit: product.unit
        },
        quantity: newItem.quantity,
        notes: newItem.notes
      };
      setSlipItems([...slipItems, newItemData]);
      setNewItem({
        product_id: '',
        quantity: 0,
        notes: ''
      });
    }
  };

  // Remove item from slip
  const handleRemoveItem = (index: number) => {
    setSlipItems(slipItems.filter((_, i) => i !== index));
  };

  // Create moving slip
  const handleCreateSlip = async () => {
    if (!newSlip.source_warehouse_id || !newSlip.destination_warehouse_id) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn kho nguồn và kho đích',
        variant: 'destructive'
      });
      return;
    }

    if (newSlip.source_warehouse_id === newSlip.destination_warehouse_id) {
      toast({
        title: 'Lỗi',
        description: 'Kho nguồn và kho đích không được giống nhau',
        variant: 'destructive'
      });
      return;
    }

    if (slipItems.length === 0) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng thêm ít nhất một sản phẩm',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSubmitting(true);
        const createData = {
          type: 'moving',
          status: 'pending',
          warehouseId: newSlip.source_warehouse_id,
          newWarehouseId: newSlip.destination_warehouse_id,
          description: newSlip.notes,
          details: slipItems.map(item => ({
            productId: item.product_id,
            quantity: item.quantity,
            unitPrice: 0 // Moving doesn't require unit price
          }))
        };

      const result = await warehouseReceiptsApi.createReceipt(createData as any);
      toast({
        title: 'Thành công',
        description: 'Phiếu chuyển kho đã được tạo'
      });
      setShowCreateDialog(false);
      loadMovingSlips();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể tạo phiếu chuyển kho',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Approve slip
  const handleApproveSlip = async (slip: MovingSlip) => {
    try {
      setSubmitting(true);
      await warehouseReceiptsApi.approveReceipt(slip.id);
      toast({
        title: 'Thành công',
        description: 'Phiếu chuyển kho đã được duyệt'
      });
      loadMovingSlips();
      closeDialog();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể duyệt phiếu',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Reject slip
  const handleRejectSlip = async (slip: MovingSlip) => {
    try {
      setSubmitting(true);
      await warehouseReceiptsApi.rejectReceipt(slip.id);
      toast({
        title: 'Thành công',
        description: 'Phiếu chuyển kho đã được từ chối'
      });
      loadMovingSlips();
      closeDialog();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể từ chối phiếu',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // View slip details
  const handleViewSlip = async (slip: MovingSlip) => {
    try {
      setLoading(true);
      const receipt = await warehouseReceiptsApi.getReceipt(slip.id);
      // Ensure warehouses list exists so we can resolve names in dialog
      if (!warehouses || warehouses.length === 0) {
        try {
          const wh = await warehouseApi.getWarehouses({ page: 1, limit: 1000 });
          setWarehouses(wh.warehouses || []);
        } catch (err) {
          // ignore - we'll fallback to slip data
        }
      }
      setSelectedSlip(receipt as MovingSlip);
      openDialog('detail', slip.id);
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message || 'Không thể tải chi tiết phiếu', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(Number(value) || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-orange-600"><Clock className="w-3 h-3 mr-1" />Chờ duyệt</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Đã duyệt</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600"><XCircle className="w-3 h-3 mr-1" />Đã từ chối</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalPages = Math.ceil(total / displayLimit);
  const sourceWarehouse = warehouses.find(w => w.id === newSlip.source_warehouse_id);
  const destWarehouse = warehouses.find(w => w.id === newSlip.destination_warehouse_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Phiếu Chuyển Kho</h2>
          <p className="text-muted-foreground">Quản lý phiếu chuyển hàng giữa các kho</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PlusCircle className="w-4 h-4" />
              Tạo Phiếu Chuyển
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tạo Phiếu Chuyển Kho</DialogTitle>
              <DialogDescription>
                Tạo phiếu chuyển hàng từ kho này sang kho khác
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Warehouse Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kho Nguồn *</Label>
                  <Select value={newSlip.source_warehouse_id || ''} onValueChange={(value) => setNewSlip({...newSlip, source_warehouse_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn kho nguồn" />
                    </SelectTrigger>
                    <SelectContent>
                      {newSlip.source_warehouse_id && <SelectItem value={newSlip.source_warehouse_id}>{warehouses.find(w => w.id === newSlip.source_warehouse_id)?.name}</SelectItem>}
                      {warehouses.filter(w => w.id !== newSlip.source_warehouse_id).map(w => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kho Đích *</Label>
                  <Select value={newSlip.destination_warehouse_id || ''} onValueChange={(value) => setNewSlip({...newSlip, destination_warehouse_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn kho đích" />
                    </SelectTrigger>
                    <SelectContent>
                      {newSlip.destination_warehouse_id && <SelectItem value={newSlip.destination_warehouse_id}>{warehouses.find(w => w.id === newSlip.destination_warehouse_id)?.name}</SelectItem>}
                      {warehouses.filter(w => w.id !== newSlip.destination_warehouse_id).map(w => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Show direction */}
              {sourceWarehouse && destWarehouse && (
                <Alert>
                  <ArrowRight className="h-4 w-4" />
                  <AlertDescription>
                    {sourceWarehouse.name} <ArrowRight className="inline w-4 h-4 mx-2" /> {destWarehouse.name}
                  </AlertDescription>
                </Alert>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>Ghi Chú</Label>
                <Textarea
                  placeholder="Nhập ghi chú (nếu có)"
                  value={newSlip.notes}
                  onChange={(e) => setNewSlip({...newSlip, notes: e.target.value})}
                  rows={3}
                />
              </div>

              {/* Add Items */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-semibold">Thêm Sản Phẩm</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Sản Phẩm *</Label>
                    <Combobox
                      options={products.map(p => ({ label: `${p.code} - ${p.name}`, value: p.id }))}
                      value={newItem.product_id}
                      onValueChange={(value) => setNewItem({...newItem, product_id: value as string})}
                      placeholder="Chọn sản phẩm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Số Lượng *</Label>
                    <NumberInput
                      value={newItem.quantity}
                      onChange={(value) => setNewItem({...newItem, quantity: value})}
                      placeholder="Nhập số lượng"
                      min={0}
                      step={1}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleAddItem}
                      variant="outline"
                      className="w-full"
                      type="button"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Items List */}
                {slipItems.length > 0 && (
                  <div className="mt-4">
                    <Table>
                      <TableHeader>
                          <TableRow>
                            <TableHead className="text-center">Sản Phẩm</TableHead>
                            <TableHead className="text-center">Số Lượng</TableHead>
                            <TableHead className="text-center">Đơn Vị</TableHead>
                            <TableHead className="text-center"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {slipItems.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-center">{item.product?.code} - {item.product?.name}</TableCell>
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell className="text-center">{item.product?.unit || '-'}</TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveItem(idx)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Hủy
              </Button>
              <Button onClick={handleCreateSlip} disabled={submitting}>
                {submitting ? 'Đang tạo...' : 'Tạo Phiếu'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tìm kiếm</Label>
              <Input
                placeholder="Tìm kiếm theo số phiếu..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Trạng Thái</Label>
              <MultiSelect
                options={[
                  { value: 'pending', label: 'Chờ duyệt' },
                  { value: 'approved', label: 'Đã duyệt' },
                  { value: 'rejected', label: 'Đã từ chối' },
                ]}
                value={statusFilter}
                onValueChange={(v) => {
                  if (typeof v === 'string') {
                    setStatusFilter(v ? v.split(',') : []);
                  } else {
                    setStatusFilter(v as string[]);
                  }
                  setCurrentPage(1);
                }}
                placeholder="Chọn trạng thái"
              />
            </div>
            <div className="space-y-2">
              <Label>Kho</Label>
              <MultiSelect
                options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                value={warehouseFilter}
                onValueChange={(v) => {
                  if (typeof v === 'string') {
                    setWarehouseFilter(v ? v.split(',') : []);
                  } else {
                    setWarehouseFilter(v as string[]);
                  }
                  setCurrentPage(1);
                }}
                placeholder="Chọn kho"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Danh Sách Phiếu Chuyển</CardTitle>
          <CardDescription>
            Tổng: {total} phiếu | Trang {currentPage}/{totalPages || 1}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Loader className="w-6 h-6 animate-spin" />
            </div>
          ) : slips.length === 0 ? (
            <div className="text-center p-8">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Không có phiếu chuyển kho nào</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Số Phiếu</TableHead>
                  <TableHead className="text-center">Kho Nguồn</TableHead>
                  <TableHead className="text-center">Kho Đích</TableHead>
                  <TableHead className="text-center">Số Lượng SP</TableHead>
                  <TableHead className="text-center">Trạng Thái</TableHead>
                  <TableHead className="text-center">Người Tạo</TableHead>
                  <TableHead className="text-center">Ngày Tạo</TableHead>
                  <TableHead className="text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slips.map((slip) => (
                  <TableRow key={slip.id}>
                    <TableCell className="font-medium text-center">{slip.code}</TableCell>
                    <TableCell className="text-center">{warehouses.find(w => w.id === slip.warehouse_id)?.name || '-'}</TableCell>
                    <TableCell className="text-center">{slip.new_warehouse_id ? warehouses.find(w => w.id === slip.new_warehouse_id)?.name || '-' : '-'}</TableCell>
                    <TableCell className="text-center">{slip.items?.length || 0}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(slip.status)}</TableCell>
                    <TableCell className="text-center">{slip.created_by_name || slip.created_by}</TableCell>
                    <TableCell className="text-center">
                      {slip.created_at ? format(new Date(slip.created_at), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewSlip(slip)}
                          className="h-8 px-2 text-xs whitespace-nowrap"
                        >
                          <Package className="w-3 h-3 mr-1" />
                          Chi tiết
                        </Button>
                        {hasPermission('WAREHOUSE_RECEIPTS_APPROVE') && slip.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApproveSlip(slip)}
                              className="h-8 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 whitespace-nowrap"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Duyệt
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectSlip(slip)}
                              className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 whitespace-nowrap"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Từ chối
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationPrevious
                    onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    // Show first, last, and pages around current
                    if (totalPages <= 7) {
                      return i + 1;
                    }
                    if (i === 0) return 1;
                    if (i === 6) return totalPages;
                    const start = Math.max(2, currentPage - 2);
                    const end = Math.min(totalPages - 1, currentPage + 2);
                    const pages = Array.from({ length: end - start + 1 }, (_, j) => start + j);
                    return pages[i - 1];
                  }).filter((page, idx, arr) => arr.indexOf(page) === idx && page).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page as number)}
                        isActive={page === currentPage}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationNext
                    onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDialogOpen('detail')} onOpenChange={(open) => {
        if (!open) {
          closeDialog();
          setSelectedSlip(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi Tiết Phiếu Chuyển - {selectedSlip?.code}</DialogTitle>
            <DialogDescription>
              {selectedSlip && (
                <>
                  Kho nguồn: {(() => {
                    const from = warehouses.find(w => w.id === selectedSlip.warehouse_id)?.name;
                    return from || (selectedSlip as any).warehouse?.name || (selectedSlip as any).warehouses?.name || '-';
                  })()} {' '}
                  → Kho đích: {(() => {
                    const to = selectedSlip.new_warehouse_id ? warehouses.find(w => w.id === selectedSlip.new_warehouse_id)?.name : undefined;
                    return to || (selectedSlip as any).new_warehouse?.name || (selectedSlip as any).new_warehouses?.name || '-';
                  })()}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedSlip && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-2">
                  <div>
                    <Label className="font-medium text-sm">Mã phiếu:</Label>
                    <p className="text-sm text-muted-foreground">{selectedSlip.code}</p>
                  </div>
                  <div>
                    <Label className="font-medium text-sm">Trạng thái:</Label>
                    <div className="mt-1">{getStatusBadge(selectedSlip.status)}</div>
                  </div>
                  <div>
                    <Label className="font-medium text-sm">Ngày tạo:</Label>
                    <p className="text-sm text-muted-foreground">{selectedSlip.created_at ? format(new Date(selectedSlip.created_at), 'dd/MM/yyyy HH:mm') : 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {selectedSlip.completed_at && (
                    <div>
                      <Label className="font-medium text-sm">Ngày duyệt:</Label>
                      <p className="text-sm text-muted-foreground">{format(new Date(selectedSlip.completed_at), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                  )}
                  {selectedSlip.approved_by && (
                    <div>
                      <Label className="font-medium text-sm">Người duyệt:</Label>
                      <p className="text-sm text-muted-foreground">{selectedSlip.approved_by}</p>
                    </div>
                  )}
                  <div>
                    <Label className="font-medium text-sm">Ghi chú:</Label>
                    <p className="text-sm text-muted-foreground">{selectedSlip.description || selectedSlip.notes || '-'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Sản Phẩm</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Mã SP</TableHead>
                      <TableHead className="text-center">Tên SP</TableHead>
                      <TableHead className="text-center">Số Lượng</TableHead>
                      <TableHead className="text-center">Đơn Vị</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSlip.items?.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-center">{item.product?.code}</TableCell>
                        <TableCell className="text-center">{item.product?.name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-center">{item.product?.unit || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedSlip.status === 'pending' && (
                <DialogFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRejectSlip(selectedSlip)}
                    disabled={submitting}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    {submitting ? 'Đang xử lý...' : 'Từ chối'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApproveSlip(selectedSlip)}
                    disabled={submitting}
                    className="text-green-600"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {submitting ? 'Đang xử lý...' : 'Duyệt Phiếu'}
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MovingSlips;
