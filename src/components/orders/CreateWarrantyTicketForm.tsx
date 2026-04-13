import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, parseISO } from "date-fns";
import { warehouseApi } from "@/api/warehouse.api";
import { usersApi } from "@/api/users.api";
import { orderApi } from "@/api/order.api";
import type { User } from "@/api/users.api";
import {
  User as UserIcon,
  FileText,
  Phone
} from "lucide-react";

interface CreateWarrantyTicketFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOrderCreated: () => void;
    orderId?: number;
    orderData?: any;
}

const formatDays = (dateString: string | Date) => {
    try {
        const dt = typeof dateString === "string" ? parseISO(dateString) : dateString;
        
        // Set end of warranty date (23:59:59)
        const warrantyEnd = new Date(dt);
        warrantyEnd.setHours(23, 59, 59, 999);
        
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const diff = differenceInDays(warrantyEnd, now);
        
        if (Number.isNaN(diff)) return null;
        
        if (diff >= 0) {
            return { type: "active", text: `Còn ${diff} ngày`, daysRemaining: diff };
        } else {
            return { 
                type: "expired", 
                text: `Hết hạn từ ${format(dt, "dd/MM/yyyy")}`, 
                daysRemaining: diff,
                expiredDate: format(dt, "yyyy-MM-dd")
            };
        }
    } catch {
        return null;
    }
};

const calculateWarrantyEndDate = (startDateStr: string | undefined, months: number | undefined): string | null => {
    if (!startDateStr || !months) return null;
    try {
        const startDate = parseISO(startDateStr);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + months);
        return endDate.toISOString();
    } catch {
        return null;
    }
};

const CreateWarrantyTicketForm: React.FC<CreateWarrantyTicketFormProps> = ({ open, onOpenChange, onOrderCreated, orderId, orderData }) => {
    const { toast } = useToast();
    const [orderDetailData, setOrderDetailData] = useState<any>(null);
    const [isLoadingOrder, setIsLoadingOrder] = useState(false);

    // Fetch order detail when dialog opens
    useEffect(() => {
        if (!open || !orderId) {
            setOrderDetailData(null);
            return;
        }

        const fetchOrderDetail = async () => {
            setIsLoadingOrder(true);
            try {
                const response = await orderApi.getOrder(orderId.toString());
                setOrderDetailData(response);
            } catch (error) {
                console.error("Error fetching order detail:", error);
                toast({
                    title: "Lỗi",
                    description: "Không thể tải thông tin chi tiết đơn hàng",
                    variant: "destructive"
                });
            } finally {
                setIsLoadingOrder(false);
            }
        };

        fetchOrderDetail();
    }, [open, orderId]);

    // Use the fetched detail data, fallback to orderData prop if available
    const currentOrderData = orderDetailData || orderData;

    const orderItems = useMemo(() => {
        if (!currentOrderData?.items || !Array.isArray(currentOrderData.items)) return [];
        return currentOrderData.items.map((item: any, index: number) => {
            // Process serials - now each serial may have warranty info
            const serials = Array.isArray(item.serials) ? item.serials.map((s: any) => {
                if (typeof s === 'string') {
                    return { serial_number: s };
                }
                const serialNumber = s.serial_number || s.serialNumber || s;
                const warrantyStartDate = s.warrantyStartDate || s.warranty_start_date;
                const warrantyMonths = s.warrantyMonths ?? s.warranty_months;
                const warrantyEndDate = s.warrantyEndDate || s.warranty_end_date || calculateWarrantyEndDate(warrantyStartDate, warrantyMonths);
                return {
                    serial_number: serialNumber,
                    warrantyMonths: warrantyMonths,
                    warrantyStartDate: warrantyStartDate,
                    warrantyEndDate: warrantyEndDate,
                    warrantyActived: s.warrantyActived ?? s.warrantyActive
                };
            }) : [];
            
            // Calculate warranty status for each serial
            const warrantyStatus = serials.map((s: any) => {
                const endDate = s.warrantyEndDate;
                if (!endDate) return { serial: s.serial_number, text: 'Không xác định', type: 'unknown' as const, daysRemaining: null };
                
                const days = formatDays(endDate);
                return {
                    serial: s.serial_number,
                    text: days?.text || 'Không xác định',
                    type: days?.type || 'unknown' as const,
                    daysRemaining: days?.daysRemaining ?? null,
                    warrantyEndDate: endDate
                };
            });
            
            return {
                key: item.id?.toString() || item.product_id?.toString() || index.toString(),
                productCode: item.product_code || item.product?.code || item.code || "",
                productName: item.product_name || item.name || item.product?.name || "Sản phẩm",
                productDesc: item.description || item.product?.description || item.product_description || "",
                quantity: Number(item.quantity || item.qty || 0),
                serials: serials,
                warrantyStatus: warrantyStatus,
                warrantyExpiredAt: item.warranty_expires_at || item.warranty_expiry_date || item.expiry_date,
                purchasedQty: Number(item.quantity || item.qty || 0),
            };
        });
    }, [currentOrderData]);

    const allItemKeys = useMemo(() => orderItems.map((item) => item.key), [orderItems]);

    const [selectedItemKeys, setSelectedItemKeys] = useState<string[]>([]);
    const [warrantyQuantities, setWarrantyQuantities] = useState<Record<string, number>>({});
    const [selectedSerials, setSelectedSerials] = useState<Record<string, string[]>>({});
    const [warehouse, setWarehouse] = useState("");
    const [staff, setStaff] = useState("");
    const [reason, setReason] = useState("");
    const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        if (!open) return;
        setSelectedItemKeys(allItemKeys);
        setWarrantyQuantities(
            orderItems.reduce((acc: Record<string, number>, item: any) => {
                acc[item.key] = item.purchasedQty;
                return acc;
            }, {})
        );
        // Initialize selected serials - select all by default
        setSelectedSerials(
            orderItems.reduce((acc: Record<string, string[]>, item: any) => {
                if (item.serials && item.serials.length > 0) {
                    acc[item.key] = item.serials.map((s: any) => s.serial_number);
                } else {
                    acc[item.key] = [];
                }
                return acc;
            }, {})
        );
        setWarehouse("");
        setStaff("");
        setReason("");
    }, [open, allItemKeys, orderItems, currentOrderData]);

    // Fetch warehouses and users data
    useEffect(() => {
        if (!open) return;
        
        const fetchData = async () => {
            try {
                // Fetch warehouses
                const warehousesResponse = await warehouseApi.getWarehouses({ limit: 100 });
                setWarehouses(warehousesResponse.warehouses.map(w => ({ id: w.id, name: w.name })));
                
                // Fetch users
                const usersResponse = await usersApi.getUsers({ limit: 100, isActive: true });
                setUsers(usersResponse.users);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        
        fetchData();
    }, [open]);

    const toggleItem = (key: string) => {
        setSelectedItemKeys((prev) =>
            prev.includes(key) ? prev.filter((it) => it !== key) : [...prev, key]
        );
    };

    const assignAll = (checked: boolean) => {
        if (checked) {
            setSelectedItemKeys(allItemKeys);
            const next: Record<string, number> = {};
            orderItems.forEach((item) => {
                next[item.key] = item.purchasedQty;
            });
            setWarrantyQuantities(next);
            return;
        }
        setSelectedItemKeys([]);
    };

    const handleCreate = () => {
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Tạo phiếu bảo hành</DialogTitle>
                </DialogHeader>
                
                {isLoadingOrder ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                            <p className="text-sm text-muted-foreground">Đang tải thông tin đơn hàng...</p>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-2"> <FileText className="h-4 w-4" /> Đơn hàng: <strong>{currentOrderData?.order_number ?? `#${orderId ?? "-"}`}</strong></div>
                            <div className="flex items-center gap-2"><UserIcon className="h-4 w-4" /> {currentOrderData?.customer_name ? `${currentOrderData.customer_name}` : ""}</div>
                            <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {currentOrderData?.customer_phone ? `${currentOrderData.customer_phone}` : ""}</div>
                        </div>

                        <div className="mt-4 p-2 border rounded-lg bg-white">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedItemKeys.length === allItemKeys.length && allItemKeys.length > 0}
                                        onChange={(e) => assignAll(e.target.checked)}
                                        className="h-4 w-4"
                                    />
                                    <span className="text-sm font-medium">Chọn tất cả sản phẩm</span>
                                </div>
                                <span className="text-sm text-muted-foreground">{selectedItemKeys.length}/{allItemKeys.length} mục đã chọn</span>
                            </div>

                            <Table className="border border-border/40 rounded-lg overflow-hidden mb-4">
                                <TableHeader className="bg-slate-50 border-b border-slate-200">
                                    <TableRow>
                                        <TableHead className="w-10 px-3 py-2"></TableHead>
                                        <TableHead className="px-3 py-2 text-left text-sm font-semibold text-slate-600">Sản phẩm</TableHead>
                                        <TableHead className="text-center px-3 py-2 text-sm font-semibold text-slate-600">SL đã mua</TableHead>
                                        <TableHead className="text-center px-3 py-2 text-sm font-semibold text-slate-600">SL bảo hành</TableHead>
                                        <TableHead className="px-3 py-2 text-sm font-semibold text-slate-600 w-1/3"><div className="text-center">Mã Serial</div></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orderItems.map((item) => {
                                        const status = formatDays(item.warrantyExpiredAt);
                                        const isChecked = selectedItemKeys.includes(item.key);
                                        return (
                                            <TableRow key={item.key} className={status?.type === "expired" ? "bg-rose-50" : ""}>
                                                <TableCell>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => toggleItem(item.key)}
                                                        className="h-4 w-4"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="w-full">
                                                        <div className="font-semibold text-sm text-slate-700">
                                                            {item.productCode ? (item.productCode + " - ") : ""}
                                                            {item.productName ? (item.productName) : ""}
                                                        </div>
                                                        {item.productDesc ? (
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                {item.productDesc}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-semibold text-slate-900">{item.purchasedQty.toLocaleString("vi-VN")}</TableCell>
                                                <TableCell className="text-center font-semibold text-slate-900">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={item.purchasedQty}
                                                        value={warrantyQuantities[item.key] ?? item.purchasedQty}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            setWarrantyQuantities(prev => ({ ...prev, [item.key]: val }));
                                                        }}
                                                        className="w-20 h-8 text-center mx-auto"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center text-sm text-slate-700">
                                                    {Array.isArray(item.serials) && item.serials.length > 0 ? (
                                                        <Combobox
                                                            multiple
                                                            joinString={false}
                                                            options={item.serials.map((s: any) => {
                                                                const warrantyInfo = s.warrantyEndDate ? formatDays(s.warrantyEndDate) : null;
                                                                return {
                                                                    label: s.serial_number,
                                                                    value: s.serial_number,
                                                                    badge: warrantyInfo ? (
                                                                        warrantyInfo.type === "active" ? (
                                                                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
                                                                                Còn {warrantyInfo.daysRemaining} ngày
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 border-red-200">
                                                                                Đã hết hạn từ ngày {format(parseISO(warrantyInfo.expiredDate), "dd/MM/yyyy")}
                                                                            </Badge>
                                                                        )
                                                                    ) : (
                                                                        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-200">
                                                                            Chưa có bảo hành
                                                                        </Badge>
                                                                    )
                                                                };
                                                            })}
                                                            value={selectedSerials[item.key] || []}
                                                            onValueChange={(values) => {
                                                                const newValue = Array.isArray(values) ? values : (values ? [values] : []);
                                                                setSelectedSerials(prev => ({ ...prev, [item.key]: newValue }));
                                                            }}
                                                            placeholder="Chọn serial..."
                                                            searchPlaceholder="Tìm serial..."
                                                        />
                                                    ) : "-"}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Kho nhận bảo hành <span className="text-red-500">*</span></label>
                                    <Combobox
                                        options={warehouses.map(w => ({ label: w.name, value: w.id }))}
                                        value={warehouse}
                                        onValueChange={(value) => setWarehouse(Array.isArray(value) ? value[0] : value)}
                                        placeholder="Chọn kho"
                                        searchPlaceholder="Tìm kiếm kho..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Người phụ trách <span className="text-red-500">*</span></label>
                                    <Combobox
                                        options={users.map(u => ({ 
                                            label: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username, 
                                            value: u.id 
                                        }))}
                                        value={staff}
                                        onValueChange={(value) => setStaff(Array.isArray(value) ? value[0] : value)}
                                        placeholder="Chọn nhân viên"
                                        searchPlaceholder="Tìm kiếm nhân viên..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Lý do bảo hành / Mô tả lỗi <span className="text-red-500">*</span></label>
                                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={5} placeholder="Mô tả chi tiết tình trạng lỗi của sản phẩm..." />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
                            <Button onClick={handleCreate}>Tạo phiếu bảo hành</Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default CreateWarrantyTicketForm;
