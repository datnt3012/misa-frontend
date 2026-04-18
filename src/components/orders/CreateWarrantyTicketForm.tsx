import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, parseISO } from "date-fns";
import { warehouseApi } from "@/api/warehouse.api";
import { warrantyTicketApi } from "@/api/warrantyTicket.api";
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
    showOrderSelector?: boolean;
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

const CreateWarrantyTicketForm: React.FC<CreateWarrantyTicketFormProps> = ({ open, onOpenChange, onOrderCreated, orderId, orderData, showOrderSelector }) => {
    const { toast } = useToast();
    const [orderDetailData, setOrderDetailData] = useState<any>(null);
    const [isLoadingOrder, setIsLoadingOrder] = useState(false);
    const [localOrderId, setLocalOrderId] = useState<number | undefined>(orderId);
    const [availableOrders, setAvailableOrders] = useState<any[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    const currentOrderId = showOrderSelector ? localOrderId : orderId;
    const selectedOrder = availableOrders.find(o => o.id === currentOrderId);

    // Fetch orders for selector
    useEffect(() => {
        if (!open || !showOrderSelector) return;
        
        const fetchOrdersList = async () => {
            setLoadingOrders(true);
            try {
                const response = await orderApi.getOrders({ page: 1, limit: 500, type: 'sale', serialManage: true });
                console.log("Orders API response:", response);
                const apiData = response?.data || response;
                const ordersData = apiData?.orders || apiData?.rows || (Array.isArray(apiData) ? apiData : []);
                console.log("Available orders:", ordersData);
                setAvailableOrders(ordersData);
            } catch (error) {
                console.error("Error fetching orders:", error);
                setAvailableOrders([]);
            } finally {
                setLoadingOrders(false);
            }
        };
        
        fetchOrdersList();
    }, [open, showOrderSelector]);

    // Update order detail when order is selected (only for non-selector mode)
    useEffect(() => {
        if (!open || !currentOrderId) {
            return;
        }
        
        // For selector mode, find from available orders list
        if (showOrderSelector) {
            if (availableOrders.length > 0) {
                const orderFromList = availableOrders.find(o => o.id === currentOrderId || o.id.toString() === currentOrderId.toString());
                if (orderFromList) {
                    console.log("Found order from list:", orderFromList);
                    setOrderDetailData(orderFromList);
                    setIsLoadingOrder(false);
                }
            }
            return;
        }
        
        // For non-selector mode, fetch from API
        const fetchOrderDetail = async () => {
            setIsLoadingOrder(true);
            try {
                const response = await orderApi.getOrder(currentOrderId.toString());
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
    }, [open, currentOrderId, showOrderSelector]);

    // Use the fetched detail data, fallback to orderData prop if available
    // Handle both wrapped format { data: {...} } and direct format
    let currentOrderData = orderDetailData?.data || orderDetailData || orderData?.data || orderData;
    
    // If it's wrapped in a response format { code, data, message }, extract data
    if (currentOrderData?.data && currentOrderData?.code !== undefined) {
        currentOrderData = currentOrderData.data;
    }

    const orderItems = useMemo(() => {
        if (!currentOrderData) return [];
        const items = currentOrderData.items || currentOrderData.details || [];
        if (!Array.isArray(items)) return [];
            
        return items
            .map((item: any, index: number) => {
                const manageSerials = item.manageSerials ?? false;
                
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
                productId: item.product_id || item.product?.id || "",
                orderDetailId: item.id || item.order_detail_id || "",
                productCode: item.product_code || item.product?.code || item.code || "",
                productName: item.product_name || item.name || item.product?.name || "Sản phẩm",
                productDesc: item.description || item.product?.description || item.product_description || "",
                quantity: Number(item.quantity || item.qty || 0),
                serials: serials,
                manageSerials: manageSerials,
                warranty_months: item.warranty_months ?? item.warrantyMonths ?? 1,
                warrantyStatus: warrantyStatus,
                warrantyExpiredAt: item.warranty_expires_at || item.warranty_expiry_date || item.expiry_date,
                purchasedQty: Number(item.quantity || item.qty || 0),
                isEligible: manageSerials || serials.length > 0,
            };
        })
        .filter((item) => item.isEligible);
    }, [currentOrderData]);

    const allItemKeys = useMemo(() => orderItems.map((item) => item.key), [orderItems]);

    const [selectedItemKeys, setSelectedItemKeys] = useState<string[]>([]);
    const [warrantyQuantities, setWarrantyQuantities] = useState<Record<string, number>>({});
    const [selectedSerials, setSelectedSerials] = useState<Record<string, string[]>>({});
    const [manualSerials, setManualSerials] = useState<Record<string, string>>({});
    const [manualWarrantyMonths, setManualWarrantyMonths] = useState<Record<string, number>>({});
    const [warehouse, setWarehouse] = useState("");
    const [staff, setStaff] = useState("");
    const [reason, setReason] = useState("");
    const [showExpiredConfirm, setShowExpiredConfirm] = useState(false);
    const [expiredSerials, setExpiredSerials] = useState<{ productName: string; serialNumber: string; expiredDate: string }[]>([]);
    const [pendingSerialWarranties, setPendingSerialWarranties] = useState<any[]>([]);
    const [pendingOrderId, setPendingOrderId] = useState<string>("");
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
        setManualSerials({});
        setManualWarrantyMonths(
            orderItems.reduce((acc: Record<string, number>, item: any) => {
                acc[item.key] = item.warranty_months || 1;
                return acc;
            }, {})
        );
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

    const handleCreate = async () => {
        if (!currentOrderData?.id) {
            toast({
                title: "Lỗi",
                description: "Không tìm thấy thông tin đơn hàng",
                variant: "destructive"
            });
            return;
        }

        const selectedItems = orderItems.filter(item => selectedItemKeys.includes(item.key));
        
        if (selectedItems.length === 0) {
            toast({
                title: "Lỗi",
                description: "Vui lòng chọn ít nhất một sản phẩm",
                variant: "destructive"
            });
            return;
        }

        if (!warehouse) {
            toast({
                title: "Lỗi",
                description: "Vui lòng chọn kho nhận bảo hành",
                variant: "destructive"
            });
            return;
        }

        if (!staff) {
            toast({
                title: "Lỗi",
                description: "Vui lòng chọn người phụ trách",
                variant: "destructive"
            });
            return;
        }

        if (!reason || !reason.trim()) {
            toast({
                title: "Lỗi",
                description: "Vui lòng nhập lý do bảo hành",
                variant: "destructive"
            });
            return;
        }

        // Validate each selected item
        for (const item of selectedItems) {
            const selectedSerialList = selectedSerials[item.key] || [];
            const manualSerialList = manualSerials[item.key] ? manualSerials[item.key].split(',').map(s => s.trim()).filter(s => s) : [];
            const allSerials = [...selectedSerialList, ...manualSerialList];
            const qty = warrantyQuantities[item.key] || item.purchasedQty;

            // Validate warranty quantity <= purchased quantity
            if (qty > item.purchasedQty) {
                toast({
                    title: "Lỗi",
                    description: `Số lượng bảo hành (${qty}) không được vượt quá số lượng mua (${item.purchasedQty}) của sản phẩm ${item.productName}`,
                    variant: "destructive"
                });
                return;
            }

            // For manageSerials items, validate serial count = warranty quantity
            if (item.manageSerials && allSerials.length !== qty) {
                toast({
                    title: "Lỗi",
                    description: `Số lượng serial (${allSerials.length}) phải bằng số lượng bảo hành (${qty}) của sản phẩm ${item.productName}`,
                    variant: "destructive"
                });
                return;
            }

            // For manageSerials items, must have at least one serial
            if (item.manageSerials && allSerials.length === 0) {
                toast({
                    title: "Lỗi",
                    description: `Vui lòng nhập serial cho sản phẩm ${item.productName}`,
                    variant: "destructive"
                });
                return;
            }
        }

        try {
            const serialWarranties: { productId: string; orderDetailId: string; serialNumbers: string[]; warrantyMonths: number }[] = [];
            
            const expiredList: { productName: string; serialNumber: string; expiredDate: string }[] = [];
            
            for (const item of selectedItems) {
                const selectedSerialList = selectedSerials[item.key] || [];
                const manualSerialList = manualSerials[item.key] ? manualSerials[item.key].split(',').map(s => s.trim()).filter(s => s) : [];
                const allSerials = [...selectedSerialList, ...manualSerialList];
                const qty = warrantyQuantities[item.key] || item.purchasedQty;

                if (item.manageSerials && allSerials.length > 0 && qty > 0) {
                    const warrantyMonths = manualWarrantyMonths[item.key] ?? item.warranty_months ?? 1;
                    const slicedSerials = allSerials.slice(0, qty);
                    
                    for (const serial of item.serials || []) {
                        if (slicedSerials.includes(serial.serial_number) && serial.warrantyEndDate) {
                            const endDate = new Date(serial.warrantyEndDate);
                            const now = new Date();
                            if (endDate < now) {
                                expiredList.push({
                                    productName: item.productName,
                                    serialNumber: serial.serial_number,
                                    expiredDate: format(new Date(serial.warrantyEndDate), "dd/MM/yyyy")
                                });
                            }
                        }
                    }
                    
                    serialWarranties.push({
                        productId: item.productId,
                        orderDetailId: item.orderDetailId || "",
                        serialNumbers: slicedSerials,
                        warrantyMonths: warrantyMonths
                    });
                }
            }

            if (serialWarranties.length === 0) {
                toast({
                    title: "Lỗi",
                    description: "Vui lòng nhập ít nhất một serial",
                    variant: "destructive"
                });
                return;
            }

            if (expiredList.length > 0) {
                setExpiredSerials(expiredList);
                setPendingSerialWarranties(serialWarranties);
                setPendingOrderId(currentOrderData.id);
                setShowExpiredConfirm(true);
                return;
            }

            const response = await warrantyTicketApi.createWarrantyTicket({
                orderId: currentOrderData.id,
                warehouseId: warehouse,
                personInCharge: staff,
                note: reason,
                status: "new",
                serialWarranties: serialWarranties
            });
            const ticketData = response?.data || response;
            console.log("Warranty ticket created:", ticketData);
            console.log("Response full:", response);
            const warehouseName = warehouses.find(w => w.id === warehouse)?.name || "N/A";
            const productCount = serialWarranties.reduce((sum: number, sw: any) => sum + (sw.serialNumbers?.length || 0), 0);
            const ticketCode = ticketData?.warrantyTicketCode || ticketData?.code || "N/A";
            
            onOrderCreated();
            onOpenChange(false);
            
            // Show toast after dialog is fully closed
            setTimeout(() => {
                toast({
                    title: "Tạo phiếu bảo hành thành công",
                    description: `Mã phiếu: ${ticketCode} | Số sản phẩm: ${productCount} | Kho: ${warehouseName}`,
                    action: ticketData?.id ? (
                        <ToastAction 
                            altText="Xem chi tiết phiếu bảo hành"
                            onClick={() => {
                                // Clear history state before navigating to avoid dialog reopening
                                window.history.replaceState(null, '', '/warranty');
                                window.location.href = `/warranty?id=${ticketData.id}`;
                            }}
                        >
                            Xem chi tiết
                        </ToastAction>
                    ) : undefined,
                });
            }, 100);
        } catch (error: any) {
            console.error("Error creating warranty ticket:", error);
            const errorMessage = error?.response?.data?.message || error?.message || "Không thể tạo phiếu bảo hành";
            toast({
                title: "Lỗi",
                description: errorMessage,
                variant: "destructive"
            });
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-7xl max-h-[85vh] overflow-y-auto">
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
                        {showOrderSelector ? (
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Chọn đơn hàng <span className="text-red-500">*</span></label>
                                <Combobox
                                    options={availableOrders.map(o => ({
                                        label: `${o.order_number || o.code || o.id} - ${o.customer_name || o.customer?.name || 'Khách hàng'}`,
                                        value: o.id.toString()
                                    }))}
                                    value={localOrderId ? localOrderId.toString() : ""}
                                    onValueChange={(value) => {
                                        const val = typeof value === 'string' ? value : (Array.isArray(value) ? value[0] : '');
                                        console.log("Selected order value:", val);
                                        
                                        // Find order from list using string comparison
                                        const strVal = String(val);
                                        const selectedOrderData = availableOrders.find(o => String(o.id) === strVal);
                                        console.log("Found order data:", selectedOrderData);
                                        
                                        setOrderDetailData(selectedOrderData || null);
                                        setLocalOrderId(selectedOrderData?.id);
                                    }}
                                    placeholder={loadingOrders ? "Đang tải..." : "Chọn đơn hàng"}
                                    searchPlaceholder="Tìm đơn hàng..."
                                    disabled={loadingOrders}
                                />
                            </div>
                        ) : (
                        <div className="text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-2"> <FileText className="h-4 w-4" /> Đơn hàng: <strong>{currentOrderData?.order_number ?? `#${orderId ?? "-"}`}</strong></div>
                            <div className="flex items-center gap-2"><UserIcon className="h-4 w-4" /> {currentOrderData?.customer_name ? `${currentOrderData.customer_name}` : ""}</div>
                            <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {currentOrderData?.customer_phone ? `${currentOrderData.customer_phone}` : ""}</div>
                        </div>
                        )}

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
                                        <TableHead className="px-3 py-2 text-left text-sm font-semibold text-slate-600"><div className="text-center">Sản phẩm</div></TableHead>
                                        <TableHead className="text-center px-3 py-2 text-sm font-semibold text-slate-600"><div className="text-center">SL đã mua</div></TableHead>
                                        <TableHead className="text-center px-3 py-2 text-sm font-semibold text-slate-600"><div className="text-center">SL bảo hành</div></TableHead>
                                        <TableHead className="px-3 py-2 text-sm font-semibold text-slate-600 w-[450px]"><div className="text-center">Mã Serial</div></TableHead>
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
                                                    {isChecked ? (
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
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center text-sm text-slate-700">
                                                    {isChecked ? (
                                                        (() => {
                                                            try {
                                                                const hasSerials = Array.isArray(item.serials) && item.serials.length > 0;
                                                                const isManageSerials = !!item.manageSerials;
                                                                const isNewSerial = isManageSerials && !hasSerials;
                                                                
                                                                if (isManageSerials && hasSerials) {
                                                                    return (
                                                                <div className="w-full">
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
                                                                                        Chưa kích hoạt bảo hành
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
                                                                    {(selectedSerials[item.key] || []).length > 0 && (
                                                                        <div className="text-xs text-muted-foreground mt-1 text-center">
                                                                            Đã chọn: {(selectedSerials[item.key] || []).length}
                                                                        </div>
                                                                    )}
                                                                </div>);
                                                                } else if (isNewSerial) {
                                                                    const manualCount = manualSerials[item.key] ? manualSerials[item.key].split(',').filter(s => s.trim()).length : 0;
                                                                    return (
                                                                <div className="w-full space-y-1">
                                                                    <div className="flex gap-2 items-end">
                                                                        <div className="flex-1">
                                                                            <label className="text-xs text-muted-foreground block">Serial</label>
                                                                            <Input
                                                                                value={manualSerials[item.key] || ""}
                                                                                onChange={(e) => setManualSerials(prev => ({ ...prev, [item.key]: e.target.value }))}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') {
                                                                                        e.preventDefault();
                                                                                        const current = manualSerials[item.key] || "";
                                                                                        setManualSerials(prev => ({ ...prev, [item.key]: current + (current && !current.endsWith(',') && current.trim() ? ',' : '') + ' ' }));
                                                                                    }
                                                                                }}
                                                                                placeholder="Nhập serial..."
                                                                                className="h-7 text-sm"
                                                                            />
                                                                        </div>
                                                                        <div className="w-20">
                                                                            <label className="text-xs text-muted-foreground block">Tháng BH</label>
                                                                            <Input
                                                                                type="number"
                                                                                min={1}
                                                                                max={120}
                                                                                value={manualWarrantyMonths[item.key] ?? item.warranty_months ?? 1}
                                                                                onChange={(e) => {
                                                                                    const val = parseInt(e.target.value) || 1;
                                                                                    setManualWarrantyMonths(prev => ({ ...prev, [item.key]: val }));
                                                                                }}
                                                                                placeholder="12"
                                                                                className="h-7 text-sm text-center"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    {manualCount > 0 && (
                                                                        <div className="text-xs text-muted-foreground text-center">
                                                                            Đã nhập: {manualCount}
                                                                        </div>
                                                                    )}
                                                                </div>);
                                                                } else {
                                                                    return "-";
                                                                }
                                                            } catch (error) {
                                                                return "-";
                                                            }
                                                        })()
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
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

        <Dialog open={showExpiredConfirm} onOpenChange={setShowExpiredConfirm}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-yellow-500">⚠️</span> Cảnh báo
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        Các sản phẩm sau đã hết hạn bảo hành:
                    </p>
                    <ul className="mt-2 space-y-1 list-disc list-inside text-sm text-muted-foreground">
                        {expiredSerials.map((item, idx) => (
                            <li key={idx} className="text-red-600">
                                {item.productName} — Hết hạn từ {item.expiredDate}
                            </li>
                        ))}
                    </ul>
                    <p className="mt-3 text-sm text-foreground">
                        Bạn có muốn tiếp tục tạo phiếu bảo hành không?{" "}
                        <span className="text-muted-foreground text-xs">(Có thể áp dụng phí bảo hành cho sản phẩm hết hạn)</span>
                    </p>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowExpiredConfirm(false)}>Hủy</Button>
                    <Button onClick={async () => {
                        try {
                            const response = await warrantyTicketApi.createWarrantyTicket({
                                orderId: pendingOrderId,
                                warehouseId: warehouse,
                                personInCharge: staff,
                                note: reason,
                                status: "new",
                                serialWarranties: pendingSerialWarranties
                            });
                            const ticketData = response?.data || response;
                            const warehouseName = warehouses.find(w => w.id === warehouse)?.name || "N/A";
                            const productCount = pendingSerialWarranties.reduce((sum: number, sw: any) => sum + (sw.serialNumbers?.length || 0), 0);
                            const ticketCode = ticketData?.warrantyTicketCode || ticketData?.code || "N/A";
                            
                            toast({
                                title: "Tạo phiếu bảo hành thành công",
                                description: `Mã phiếu: ${ticketCode} | Số sản phẩm: ${productCount} | Kho: ${warehouseName}`,
                                action: ticketData?.id ? (
                                    <ToastAction 
                                        altText="Xem chi tiết phiếu bảo hành"
                                        onClick={() => window.location.href = `/warranty?id=${ticketData.id}`}
                                    >
                                        Xem chi tiết
                                    </ToastAction>
                                ) : undefined,
                            });
                            
                            onOrderCreated();
                            setShowExpiredConfirm(false);
                            onOpenChange(false);
                        } catch (error: any) {
                            console.error("Error creating warranty ticket:", error);
                            toast({
                                title: "Lỗi",
                                description: error?.response?.data?.message || error?.message || "Không thể tạo phiếu bảo hành",
                                variant: "destructive"
                            });
                        }
                    }}>Tiếp tục tạo phiếu</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
};

export default CreateWarrantyTicketForm;
