import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Plus, PlusCircle, Package, CheckCircle, Clock, X, XCircle, Trash2, Search, ChevronRight, Filter, RotateCw, Loader, ArrowRight, AlertCircle, Printer, FileDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { warehouseReceiptsApi, type WarehouseReceipt as WarehouseReceiptType } from '@/api/warehouseReceipts.api';
import { productApi } from '@/api/product.api';
import { warehouseApi } from '@/api/warehouse.api';
import { stockLevelsApi } from '@/api/stockLevels.api';
import { NumberInput } from '@/components/ui/number-input';
import { CurrencyInput } from '@/components/ui/currency-input';

interface MovingSlipItem {
  id?: string;
  product_id: string;
  product_code?: string;
  product_name?: string;
  product?: {
    id: string;
    code: string;
    name: string;
    description?: string;
    category?: string;
    unit?: string;
  };
  quantity: number;
  unit_price: number;
  total_price: number;
  current_stock?: number;
  notes?: string;
}

interface MovingSlip {
  id: string;
  code: string;
  warehouse_id: string;
  new_warehouse_id?: string;
  movingReceiptId?: string; // ID của phiếu gốc (dùng để nhóm phiếu chuyển đi và chuyển đến)
  type?: string; // stock_transfer_out | stock_transfer_in
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
  
  // Group slips by movingReceiptId - slips with same movingReceiptId are shown in one row
  const groupedSlips = useMemo(() => {
    const groups: { [key: string]: MovingSlip[] } = {};
    
    slips.forEach(slip => {
      const groupKey = slip.movingReceiptId || slip.id; // Use movingReceiptId if available, otherwise use own id
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(slip);
    });
    
    // Convert to array with group info
    return Object.entries(groups).map(([groupKey, groupSlips]) => ({
      groupKey,
      slips: groupSlips,
      // Use the first slip's info for display
      primarySlip: groupSlips[0],
      // Count total items across all slips in group
      totalItems: groupSlips.reduce((sum, s) => sum + (s.items?.length || 0), 0),
      // Check if all slips in group have the same status
      allSameStatus: groupSlips.every(s => s.status === groupSlips[0].status),
      // Get the status of the group (use the most relevant status)
      status: groupSlips[0].status
    }));
  }, [slips]);
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
        type: 'stock_transfer_out,stock_transfer_in',
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
      setSlipItems([]);
    }
  }, [showCreateDialog]);

  // Update stock levels when source warehouse changes
  useEffect(() => {
    if (newSlip.source_warehouse_id && slipItems.length > 0) {
      slipItems.forEach((item, index) => {
        if (item.product_id) {
          fetchStockLevel(index, item.product_id, newSlip.source_warehouse_id!);
        }
      });
    }
  }, [newSlip.source_warehouse_id]);

  // Add item to slip
  const addItem = () => {
    setSlipItems(prev => [...prev, {
      product_id: '',
      product_code: '',
      product_name: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      notes: ''
    }]);
  };

  // Remove item from slip
  const removeItem = (index: number) => {
    setSlipItems(prev => prev.filter((_, i) => i !== index));
  };

  // Update item in slip
  const updateItem = (index: number, field: keyof MovingSlipItem, value: any) => {
    setSlipItems(prev => {
      const items = [...prev];
      items[index] = { ...items[index], [field]: value };

      // Auto-fill product info when product_id changes
      if (field === 'product_id' && value) {
        const product = products.find(p => p.id === value);
        if (product) {
          items[index].product_code = product.code || '';
          items[index].product_name = product.name || '';
          items[index].product = {
            id: product.id,
            code: product.code || '',
            name: product.name || '',
            unit: product.unit
          };
          items[index].unit_price = product.price || product.costPrice || 0;
        }
        // Fetch stock level when product changes and source warehouse is selected
        if (value && newSlip.source_warehouse_id) {
          fetchStockLevel(index, value, newSlip.source_warehouse_id);
        }
      }

      // Recalculate total price when quantity or unit_price changes
      if (field === 'quantity' || field === 'unit_price') {
        items[index].total_price = (items[index].quantity || 0) * (items[index].unit_price || 0);
      }

      return items;
    });
  };

  // Get available products for a row (exclude already selected products)
  const getAvailableProductsForRow = (currentIndex: number) => {
    const selectedProductIds = slipItems
      .map((item, index) => index !== currentIndex ? item.product_id : null)
      .filter(id => id);
    return products.filter(product => !selectedProductIds.includes(product.id));
  };

  // Fetch stock level for a product in source warehouse
  const fetchStockLevel = async (index: number, productId: string, warehouseId: string) => {
    if (!productId || !warehouseId) return;
    try {
      const stockLevels = await stockLevelsApi.getStockLevels({
        productId,
        warehouseId,
        limit: 1
      });
      const currentStock = stockLevels.stockLevels.length > 0 ? stockLevels.stockLevels[0].quantity : 0;
      setSlipItems(prev => {
        const items = [...prev];
        items[index].current_stock = currentStock;
        return items;
      });
    } catch (error) {
      setSlipItems(prev => {
        const items = [...prev];
        items[index].current_stock = 0;
        return items;
      });
    }
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
            unitPrice: item.unit_price || 0
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
        description: error.response?.data?.message || error.message || 'Không thể tạo phiếu chuyển kho',
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
        description: error.response?.data?.message || error.message || 'Không thể duyệt phiếu',
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

  // Update slip status (picked, exported, cancelled)
  const handleUpdateSlipStatus = async (slip: MovingSlip, newStatus: string) => {
    try {
      setSubmitting(true);
      await warehouseReceiptsApi.updateReceipt(slip.id, { status: newStatus });
      const statusLabels: Record<string, string> = {
        'picked': 'Đã lấy hàng',
        'exported': 'Đã xuất kho',
        'cancelled': 'Hủy phiếu'
      };
      toast({
        title: 'Thành công',
        description: `Đã cập nhật trạng thái thành ${statusLabels[newStatus] || newStatus}`
      });
      loadMovingSlips();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.response?.data?.message || error.message || 'Không thể cập nhật trạng thái',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Get available status options for stock_transfer_out slip
  const getAvailableStatusOptions = (currentStatus: string) => {
    const options: { value: string; label: string }[] = [];
    
    if (currentStatus === 'approved') {
      options.push({ value: 'picked', label: 'Đã lấy hàng' });
      options.push({ value: 'exported', label: 'Đã xuất kho' });
    } else if (currentStatus === 'picked') {
      options.push({ value: 'exported', label: 'Đã xuất kho' });
    }
    
    return options;
  };

  // Export slip
  const handleExportSlip = async (slip: MovingSlip, type: 'pdf' | 'xlsx') => {
    try {
      setSubmitting(true);
      const { blob, filename } = await warehouseReceiptsApi.exportReceipt(slip.id, type);
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      toast({
        title: 'Thành công',
        description: `Đã xuất ${type.toUpperCase()} thành công`
      });
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể xuất phiếu',
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
      case 'picked':
        return <Badge variant="outline" className="text-blue-600"><Package className="w-3 h-3 mr-1" />Đã lấy hàng</Badge>;
      case 'exported':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Đã xuất kho</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" />Đã hủy</Badge>;
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
      <div className="flex justify-end items-center">
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 mt-4">
              <PlusCircle className="w-4 h-4" />
              Tạo Phiếu Chuyển
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tạo Phiếu Chuyển Kho</DialogTitle>
              <DialogDescription>
                Tạo phiếu chuyển hàng từ kho này sang kho khác
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Warehouse Selection */}
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="space-y-2 w-full">
                  <Label>Kho Nguồn <span className="text-red-500">*</span></Label>
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
                <div className="space-y-2 w-full flex justify-center"><ArrowRight className="inline w-6 h-6 mx-2" /></div>
                <div className="space-y-2 w-full">
                  <Label>Kho Đích <span className="text-red-500">*</span></Label>
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Sản phẩm</span>
                    <Button onClick={addItem} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Thêm sản phẩm
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {slipItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Chưa có sản phẩm nào. Click "Thêm sản phẩm" để bắt đầu.
                    </div>
                  ) : (
                    <Table className="border border-border/30 rounded-lg overflow-hidden">
                      <TableHeader>
                        <TableRow className="bg-slate-50 border-b-2 border-slate-200">
                          <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                            Sản phẩm <span className="text-red-500">*</span>
                          </TableHead>
                          <TableHead className="border-r border-slate-200 font-semibold text-slate-700">
                            Số lượng <span className="text-red-500">*</span>
                          </TableHead>
                          <TableHead className="font-semibold text-slate-700"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {slipItems.map((item, index) => (
                          <TableRow
                            key={index}
                            className="border-b border-slate-100 hover:bg-slate-50/50 h-20"
                          >
                            <TableCell className="border-r border-slate-100 align-top pt-4">
                              <div className="space-y-1 flex justify-center">
                                <Combobox
                                  options={getAvailableProductsForRow(index).map((product) => ({
                                    label: `${product.name} (${product.code})`,
                                    value: product.id
                                  }))}
                                  value={item.product_id}
                                  onValueChange={(value) => updateItem(index, 'product_id', value)}
                                  placeholder="Chọn sản phẩm"
                                  searchPlaceholder="Tìm sản phẩm..."
                                  emptyMessage={getAvailableProductsForRow(index).length === 0 ? 'Không còn sản phẩm nào để chọn' : 'Không có sản phẩm nào'}
                                  className="w-[200px] text-center"
                                />
                              </div>
                              <div className="space-y-1 flex justify-center">
                                {item.product_id && item.current_stock !== undefined && newSlip.source_warehouse_id && (
                                  <div className="text-xs mt-1">
                                    {item.current_stock === 0 ? (
                                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                                        Hết hàng tại kho này
                                      </Badge>
                                    ) : (
                                      <span className="text-gray-600">
                                        Tồn kho: {item.current_stock}
                                      </span>
                                    )}
                                    {item.quantity > item.current_stock && item.current_stock > 0 && (
                                      <span className="text-red-500 ml-1">⚠️</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="border-r border-slate-100 align-top pt-4">
                              <div className="space-y-1 flex justify-center">
                                <NumberInput
                                  value={item.quantity}
                                  onChange={(value) => updateItem(index, 'quantity', value)}
                                  min={1}
                                  className="w-20 text-center"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="align-top pt-4 flex justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeItem(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
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
                  <TableHead className="text-center">Kho Chuyển</TableHead>
                  <TableHead className="text-center">Trạng Thái</TableHead>
                  <TableHead className="text-center">Người Tạo</TableHead>
                  <TableHead className="text-center">Ngày Tạo</TableHead>
                  <TableHead className="text-center">Ngày Chuyển</TableHead>
                  <TableHead className="text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedSlips.map((group) => (
                  <TableRow key={group.groupKey}>
                    <TableCell className="font-medium text-center">
                      <div className="flex flex-col items-center">
                        {group.slips.map(s => (
                          <span key={s.id} className={group.slips.length > 1 ? "text-sm" : ""}>{s.code}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        {group.slips
                          .sort((a, b) => {
                            // ST-OUT (source) first, then ST-IN (destination)
                            if (a.type === 'stock_transfer_out' && b.type !== 'stock_transfer_out') return -1;
                            if (a.type !== 'stock_transfer_out' && b.type === 'stock_transfer_out') return 1;
                            return 0;
                          })
                          .map(s => {
                          // Each slip shows its own warehouse_id
                          const warehouseName = warehouses.find(w => w.id === s.warehouse_id)?.name;
                          // ST-OUT is source (Kho nguồn), ST-IN is destination (Kho đích)
                          const label = s.type === 'stock_transfer_in' 
                            ? <span className="text-green-600">(Kho đích)</span> 
                            : <span className="text-blue-600">(Kho nguồn)</span>;
                          
                          return (
                            <span key={s.id} className="text-sm">
                              {warehouseName || '-'} {label}
                            </span>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        {group.slips.map(s => (
                          <span key={s.id}>{getStatusBadge(s.status)}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        {group.slips.map(s => (
                          <span key={s.id} className="text-sm">
                            {s.created_by_name || s.created_by || '-'}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {group.primarySlip.created_at ? format(new Date(group.primarySlip.created_at), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        {group.slips.map(slip => (
                          <div key={slip.id} className="text-xs">
                            {slip.completed_at ? format(new Date(slip.completed_at), 'dd/MM/yyyy') : '-'}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        {group.slips.map(slip => (
                          <div key={slip.id} className="flex items-center space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewSlip(slip)}
                              className="h-8 px-2 text-xs whitespace-nowrap"
                            >
                              <Package className="w-3 h-3 mr-1" />
                              Chi tiết
                            </Button>
                            {/* Status Update Dropdown for stock_transfer_out slip */}
                            {slip.type === 'stock_transfer_out' && getAvailableStatusOptions(slip.status).length > 0 && (slip.status === 'approved' || slip.status === 'picked') && (
                              <Select
                                onValueChange={(newStatus) => handleUpdateSlipStatus(slip, newStatus)}
                              >
                                <SelectTrigger className="w-40 h-8 text-xs bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200 hover:border-blue-300 focus:ring-2 focus:ring-blue-200 transition-all duration-200 shadow-sm">
                                  <SelectValue placeholder="Cập nhật trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailableStatusOptions(slip.status).map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {/* Cancel button for stock_transfer_out slip - show for all statuses except cancelled/rejected/pending */}
                            {slip.type === 'stock_transfer_out' && slip.status !== 'cancelled' && slip.status !== 'rejected' && slip.status !== 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateSlipStatus(slip, 'cancelled')}
                                className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 whitespace-nowrap"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Hủy
                              </Button>
                            )}
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
                        ))}
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

              {/* Action Buttons */}
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportSlip(selectedSlip, 'pdf')}
                  disabled={submitting}
                >
                  <Printer className="w-3 h-3 mr-1" />
                  In PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportSlip(selectedSlip, 'xlsx')}
                  disabled={submitting}
                >
                  <FileDown className="w-3 h-3 mr-1" />
                  Xuất Excel
                </Button>
                {selectedSlip.status === 'pending' && (
                  <>
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
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MovingSlips;
