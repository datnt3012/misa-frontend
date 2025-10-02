import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [filterType, setFilterType] = useState("all");
  const [filterWarehouse, setFilterWarehouse] = useState("all");
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [userCache, setUserCache] = useState<{ [key: string]: string }>({});
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
      console.error('Error fetching user:', error);
      return 'Không xác định';
    }
  };

  const loadMovements = async () => {
    try {
      setLoading(true);
      const response = await warehouseReceiptsApi.getReceipts({ 
        page: 1, 
        limit: 1000 
      });
      
      
      // Transform warehouse receipts to inventory movements
      const transformedMovements: InventoryMovement[] = [];
      
      response.receipts.forEach(receipt => {
        if (receipt.items && receipt.items.length > 0) {
          receipt.items.forEach(item => {
            transformedMovements.push({
              id: `${receipt.id}-${item.id}`,
              product_id: item.product_id,
              product_code: item.product?.code || '',
              product_name: item.product?.name || '',
              quantity: item.quantity,
              movement_type: 'in', // Warehouse receipts are always imports
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
      
      setMovements(transformedMovements);
      
      // Load user names for all movements
      const uniqueUserIds = [...new Set(transformedMovements.map(m => m.created_by).filter(Boolean))];
      for (const userId of uniqueUserIds) {
        if (userId && userId !== 'Hệ thống') {
          try {
            const userName = await getUserName(userId);
            // Update the movement with the fetched user name
            setMovements(prev => prev.map(movement => 
              movement.created_by === userId 
                ? { ...movement, created_by_name: userName }
                : movement
            ));
          } catch (error) {
            console.error(`Error loading user ${userId}:`, error);
          }
        }
      }
    } catch (error: any) {
      console.error('Error loading inventory movements:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Có lỗi khi tải lịch sử xuất nhập kho';
      toast({ title: 'Lỗi', description: convertPermissionCodesInMessage(errorMessage), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouses = async () => {
    try {
      const response = await warehouseApi.getWarehouses({ page: 1, limit: 1000 });
      setWarehouses(response.warehouses || []);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  useEffect(() => {
    loadMovements();
    loadWarehouses();
  }, []);

  const getWarehouseById = (id?: string) => {
    if (!id) return undefined;
    return warehouses.find(w => w.id === id);
  };

  const getMovementTypeBadge = (type: string, quantity: number) => {
    if (type === 'in' || quantity > 0) {
      return (
        <Badge variant="secondary" className="text-green-600 border-green-600">
          <TrendingUp className="w-3 h-3 mr-1" />
          Nhập kho
        </Badge>
      );
    } else if (type === 'out' || quantity < 0) {
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

  const filteredMovements = movements.filter(movement => {
    const matchesSearch = 
      movement.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.slip_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || 
                       (filterType === "in" && (movement.movement_type === 'in' || movement.quantity > 0)) ||
                       (filterType === "out" && (movement.movement_type === 'out' || movement.quantity < 0));
    
    const matchesWarehouse = filterWarehouse === "all" || 
                            movement.warehouse_id === filterWarehouse;
    
    return matchesSearch && matchesType && matchesWarehouse;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center items-center h-32">
            <div className="text-muted-foreground">Đang tải lịch sử...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lịch Sử Xuất Nhập Kho</CardTitle>
        <CardDescription>
          Theo dõi tất cả các giao dịch xuất nhập kho trong hệ thống
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo sản phẩm, mã hoặc số phiếu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Lọc theo loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="in">Nhập kho</SelectItem>
              <SelectItem value="out">Xuất kho</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Lọc theo kho" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả kho</SelectItem>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                    <TableCell className="text-right">
                      <span className={movement.quantity > 0 ? "text-green-600" : "text-red-600"}>
                        {movement.quantity > 0 ? "+" : ""}{movement.quantity.toLocaleString('vi-VN')}
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
          <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
            <span>Hiển thị {filteredMovements.length} giao dịch gần nhất</span>
            <span>Cập nhật lần cuối: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: vi })}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryHistory;

