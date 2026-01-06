import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Search, TrendingUp, TrendingDown, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { warehouseReceiptsApi, WarehouseReceipt } from "@/api/warehouseReceipts.api";
import { warehouseApi } from "@/api/warehouse.api";
import { usersApi } from "@/api/users.api";
import { convertPermissionCodesInMessage } from "@/utils/permissionMessageConverter";
import { useAuth } from "@/hooks/useAuth";
interface InventoryMovement {
  id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  movement_type: string;
  reference_type: string;
  reference_id: string;
  warehouse_id: string;
  warehouse_name: string;
  warehouse_code: string;
  notes: string;
  created_at: string;
  created_by: string;
  created_by_name?: string;
  status: string;
  slip_number: string;
}
const InventoryHistory = () => {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterWarehouse, setFilterWarehouse] = useState("all");
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [userCache, setUserCache] = useState<{ [key: string]: string }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const wasInputFocusedRef = useRef(false);
  const { toast } = useToast();
  const { user } = useAuth();
  // Function to get user name from API
  const getUserName = async (userId: string): Promise<string> => {
    if (!userId || userId === 'Hệ thống') return 'Hệ thống';
    // Check cache first
    if (userCache[userId]) return userCache[userId];
    try {
      const userData = await usersApi.getUserById(userId);
      // Try different field names that might exist
      const firstName = userData.firstName || userData.first_name || userData.name || userData.fullName || userData.full_name;
      const lastName = userData.lastName || userData.last_name;
      const userName = firstName && lastName 
        ? `${firstName} ${lastName}`.trim()
        : firstName || lastName || userData.email || 'Không xác định';
      // Cache the result
      setUserCache(prev => ({ ...prev, [userId]: userName }));
      return userName;
    } catch (error) {
      return 'Không xác định';
    }
  };
  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadMovements = async () => {
    try {
      // Only show loading on initial load (when no movements exist yet)
      // Don't set loading when user is searching/filtering to avoid losing focus
      const isInitialLoad = movements.length === 0;
      if (isInitialLoad) {
        setLoading(true);
      } else {
        // Don't change loading state when already have data to avoid re-render
        // This prevents input from losing focus
      }
      const params: any = {
        page: currentPage,
        limit: itemsPerPage
      };
      
      // Add search if provided
      if (debouncedSearchTerm) {
        params.search = debouncedSearchTerm;
      }
      
      // Add type filter if not "all"
      if (filterType !== "all") {
        params.type = filterType === "in" ? "import" : "export";
      }
      
      // Add warehouse filter if not "all"
      if (filterWarehouse !== "all") {
        params.warehouse_id = filterWarehouse;
      }
      
      const response = await warehouseReceiptsApi.getReceipts(params);
      
      // Transform warehouse receipts to inventory movements
      const transformedMovements: InventoryMovement[] = [];
      response.receipts.forEach(receipt => {
        if (receipt.items && receipt.items.length > 0) {
          receipt.items.forEach(item => {
            // Determine movement type based on receipt type and quantity
            let movementType = 'in'; // Default to import
            if (receipt.type === 'export') {
              movementType = 'out';
            } else if (receipt.type === 'import') {
              movementType = 'in';
            } else {
              // Fallback: check quantity sign
              movementType = item.quantity > 0 ? 'in' : 'out';
            }
            
            transformedMovements.push({
              id: `${receipt.id}-${item.id}`,
              product_id: item.product_id,
              product_code: item.product?.code || '',
              product_name: item.product?.name || '',
              quantity: item.quantity,
              movement_type: movementType,
              reference_type: 'warehouse_receipt',
              reference_id: receipt.id,
              warehouse_id: receipt.warehouse_id,
              warehouse_name: '',
              warehouse_code: '',
              notes: receipt.description || '',
              created_at: receipt.created_at,
              created_by: receipt.created_by || user?.id || 'Hệ thống',
              created_by_name: receipt.created_by_name || 'Đang tải...',
              status: receipt.status,
              slip_number: receipt.code
            });
          });
        }
      });
      // Sort by created_at descending
      transformedMovements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Update pagination state first
      setTotal(response.total || 0);
      setTotalPages(Math.ceil((response.total || 0) / itemsPerPage));
      
      // Load user names for all movements before setting movements
      const uniqueUserIds = [...new Set(transformedMovements.map(m => m.created_by).filter(Boolean))];
      const userNamesMap: { [key: string]: string } = {};
      for (const userId of uniqueUserIds) {
        if (userId && userId !== 'Hệ thống') {
          try {
            const userName = await getUserName(userId);
            userNamesMap[userId] = userName;
          } catch (error) {
          }
        }
      }
      
      // Update movements with user names in one batch
      const movementsWithUserNames = transformedMovements.map(movement => ({
        ...movement,
        created_by_name: userNamesMap[movement.created_by] || movement.created_by_name || 'Đang tải...'
      }));
      
      // Batch all state updates together to minimize re-renders
      setMovements(movementsWithUserNames);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Có lỗi khi tải lịch sử xuất nhập kho';
      toast({ title: 'Lỗi', description: convertPermissionCodesInMessage(errorMessage), variant: 'destructive' });
    } finally {
      // Only set loading to false on initial load
      // When already have data, don't change loading state to avoid re-render
      const isInitialLoad = movements.length === 0;
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };
  const loadWarehouses = async () => {
    try {
      const response = await warehouseApi.getWarehouses({ page: 1, limit: 1000 });
      setWarehouses(response.warehouses || []);
    } catch (error) {
    }
  };
  useEffect(() => {
    loadWarehouses();
  }, []);
  
  useEffect(() => {
    loadMovements();
  }, [currentPage, debouncedSearchTerm, filterType, filterWarehouse, itemsPerPage]);
  
  // Restore focus after movements update if input has value
  // Use useLayoutEffect to restore focus synchronously before browser paint
  useLayoutEffect(() => {
    // If input has value, always try to restore focus after movements update
    // This ensures user can continue typing even after API calls
    if (searchInputRef.current && searchTerm && document.activeElement !== searchInputRef.current) {
      // Check if input was recently focused (within last 2 seconds)
      // or if it currently has focus (shouldn't happen but just in case)
      const shouldRestore = wasInputFocusedRef.current || 
                           (searchInputRef.current === document.activeElement);
      
      if (shouldRestore) {
        searchInputRef.current.focus();
        // Move cursor to end
        const length = searchInputRef.current.value.length;
        searchInputRef.current.setSelectionRange(length, length);
      }
    }
  }, [movements, searchTerm]);
  const getWarehouseById = (id?: string) => {
    if (!id) return undefined;
    return warehouses.find(w => w.id === id);
  };
  const getMovementTypeBadge = (type: string, quantity: number) => {
    if (type === 'out') {
      return (
        <Badge variant="secondary" className="text-red-600 border-red-600">
          <TrendingDown className="w-3 h-3 mr-1" />
          Xuất kho
        </Badge>
      );
    } else if (type === 'in') {
      return (
        <Badge variant="secondary" className="text-green-600 border-green-600">
          <TrendingUp className="w-3 h-3 mr-1" />
          Nhập kho
        </Badge>
      );
    } else if (quantity < 0) {
      return (
        <Badge variant="secondary" className="text-red-600 border-red-600">
          <TrendingDown className="w-3 h-3 mr-1" />
          Xuất kho
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline">
          <Package className="w-3 h-3 mr-1" />
          Điều chỉnh
        </Badge>
      );
    }
  };
  const getReferenceDisplay = (referenceType: string, referenceId: string, slipNumber: string) => {
    if (!referenceType) return "Điều chỉnh thủ công";
    switch (referenceType) {
      case 'warehouse_receipt':
        return `Phiếu nhập ${slipNumber}`;
      case 'order':
        return `Đơn hàng #${referenceId.slice(-8)}`;
      case 'export_slip':
        return `Phiếu xuất #${referenceId.slice(-8)}`;
      case 'adjustment':
        return "Điều chỉnh kho";
      case 'import':
        return "Nhập hàng";
      default:
        return referenceType;
    }
  };
  // Filtering is now done on the server side, but we keep this for any client-side filtering if needed
  const filteredMovements = movements;
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0
    }).format(amount);
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Lịch Sử Xuất Nhập Kho</CardTitle>
            <CardDescription>
              Theo dõi tất cả các giao dịch xuất nhập kho trong hệ thống
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="items-per-page" className="text-sm font-medium whitespace-nowrap">
              Hiển thị:
            </Label>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => {
              setItemsPerPage(parseInt(value));
              setCurrentPage(1); // Reset to first page when limit changes
            }}>
              <SelectTrigger className="w-20" id="items-per-page">
                <SelectValue placeholder="Số lượng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && movements.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <div className="text-muted-foreground">Đang tải lịch sử...</div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Tìm kiếm theo sản phẩm, mã hoặc số phiếu..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => { wasInputFocusedRef.current = true; }}
                    onBlur={() => { wasInputFocusedRef.current = false; }}
                    className="pl-10 w-full"
                  />
            </div>
            <div className="flex gap-4 flex-shrink-0">
              <Select value={filterType} onValueChange={(value) => { setFilterType(value); setCurrentPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Lọc theo loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="in">Nhập kho</SelectItem>
                  <SelectItem value="out">Xuất kho</SelectItem>
                </SelectContent>
              </Select>
              <Combobox
                options={[
                  { label: "Tất cả kho", value: "all" },
                  ...warehouses.map((warehouse) => ({
                    label: warehouse.name,
                    value: warehouse.id
                  }))
                ]}
                value={filterWarehouse}
                onValueChange={(value) => { setFilterWarehouse(value); setCurrentPage(1); }}
                placeholder="Lọc theo kho"
                searchPlaceholder="Tìm kho..."
                emptyMessage="Không có kho nào"
                className="w-[200px]"
              />
            </div>
          </div>
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sản phẩm</TableHead>
                <TableHead>Loại giao dịch</TableHead>
                <TableHead className="text-right">Số lượng</TableHead>
                <TableHead>Kho</TableHead>
                <TableHead>Số phiếu</TableHead>
                <TableHead>Người thực hiện</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground h-32">
                    Không có dữ liệu lịch sử xuất nhập kho
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{movement.product_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Mã: {movement.product_code}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getMovementTypeBadge(movement.movement_type, movement.quantity)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={movement.movement_type === 'out' ? "text-red-600" : "text-green-600"}>
                        {movement.movement_type === 'out' ? "-" : "+"}{Math.abs(movement.quantity).toLocaleString('vi-VN')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {(() => {
                          const wh = getWarehouseById(movement.warehouse_id);
                          return wh ? `${wh.name}${wh.code ? ` (${wh.code})` : ''}` : 'Không xác định';
                        })()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-primary">
                        {movement.slip_number}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {movement.created_by_name || 'Đang tải...'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        movement.status === 'approved' ? 'default' :
                        movement.status === 'pending' ? 'secondary' :
                        movement.status === 'rejected' ? 'destructive' : 'outline'
                      }>
                        {movement.status === 'approved' ? 'Đã duyệt' :
                         movement.status === 'pending' ? 'Chờ duyệt' :
                         movement.status === 'rejected' ? 'Đã từ chối' : movement.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {movement.created_at ? format(new Date(movement.created_at), "dd/MM/yyyy HH:mm", { locale: vi }) : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {movement.notes || "-"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {filteredMovements.length > 0 && (
          <div className="flex flex-col items-center gap-4 mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
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
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={currentPage === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <div className="text-sm text-muted-foreground">
              Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, total)} trong tổng số {total} giao dịch
            </div>
          </div>
        )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
export default InventoryHistory;
