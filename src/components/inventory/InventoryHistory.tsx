import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, TrendingUp, TrendingDown, Package } from "lucide-react";
// // import { supabase } from "@/integrations/supabase/client"; // Removed - using API instead // Removed - using API instead
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface InventoryMovement {
  id: string;
  product_id: string;
  quantity: number;
  movement_type: string;
  reference_type: string;
  reference_id: string;
  warehouse_id: string;
  notes: string;
  created_at: string;
  created_by: string;
  products: {
    name: string;
    code: string;
  };
  warehouses?: {
    name: string;
    code: string;
  };
}

const InventoryHistory = () => {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterWarehouse, setFilterWarehouse] = useState("all");
  const [warehouses, setWarehouses] = useState<any[]>([]);

  const loadMovements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          products!inner(name, code),
          warehouses(name, code)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error('Error loading inventory movements:', error);
      toast.error('Có lỗi khi tải lịch sử xuất nhập kho');
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  useEffect(() => {
    loadMovements();
    loadWarehouses();
  }, []);

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

  const getReferenceDisplay = (referenceType: string, referenceId: string) => {
    if (!referenceType) return "Điều chỉnh thủ công";
    
    switch (referenceType) {
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
      movement.products.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.products.code.toLowerCase().includes(searchTerm.toLowerCase());
    
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
              placeholder="Tìm kiếm theo sản phẩm, mã hoặc người thao tác..."
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
                <TableHead>Người thao tác</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground h-32">
                    Không có dữ liệu lịch sử xuất nhập kho
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{movement.products.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Mã: {movement.products.code}
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
                        {movement.warehouses?.name || "Không xác định"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        Hệ thống
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(movement.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
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

