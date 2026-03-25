import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, CreditCard, FileText, Package, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "../../utils/formatters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    ORDER_STATUS_LABELS_VI, ORDER_STATUSES,
    PURCHASE_ORDER_STATUS_LABELS_VI, PURCHASE_ORDER_STATUSES,
} from "@/constants/order-status.constants";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SlipCreatingDialog } from "@/components/inventory/SlipCreatingDialog";
import { PaymentDialog } from "@/components/PaymentDialog";
import { Badge } from "@/components/ui/badge";
import { useOrderDetail, useUpdateOrderStatus } from "../../hooks";
import { format } from "date-fns";
import { useHistoryEntityQuery } from "@/features/histories/useHistoryQuery";
import { HISTORY_ENTITY_TYPE } from "@/features/histories/constants";
import { useQueryClient } from "@tanstack/react-query";
import { ORDER_QUERY_KEYS, useOrderPaymentHistory } from "../../hooks/useOrderQuery";
import { getPaymentMethodLabel, PAYMENTS_QUERY_KEY } from "@/features/payments/constants";
import { ORDER_TYPES } from "../../schemas";
import { useNavigate } from "react-router-dom";
import { OrderFormHeader } from "./shared/OrderFormHeader";

interface ViewFormProps {
    orderId: string;
    onBack?: () => void;
}

const ViewOrderForm: React.FC<ViewFormProps> = ({ orderId, onBack }) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { data: paymentHistory } = useOrderPaymentHistory(orderId);
    const { data: orderDetails, isLoading: isLoadingOrder } = useOrderDetail(orderId);
    const { data: historyEntity } = useHistoryEntityQuery({
        entityId: orderId,
        entityType: HISTORY_ENTITY_TYPE.ORDER,
    });
    const { mutateAsync: updateOrderStatus } = useUpdateOrderStatus();
    const [showSlipDialog, setShowSlipDialog] = useState(false);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);

    const isPurchase = orderDetails?.type === ORDER_TYPES[1];

    const totalQuantity =
        orderDetails?.details?.reduce((sum, item) => sum + (item.quantity || 0), 0) ?? 0;

    const totalVat =
        orderDetails?.details?.reduce(
            (sum, item) =>
                sum + (item.unitPrice * item.quantity * (Number(item.vatPercentage) || 0)) / 100,
            0
        ) ?? 0;

    const totalCost =
        orderDetails?.expenses?.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) ?? 0;

    const priceOfAllProducts =
        orderDetails?.details?.reduce(
            (sum, item) => sum + item.unitPrice * item.quantity,
            0
        ) ?? 0;

    const totalAmountInclVat = priceOfAllProducts + totalVat;
    const finalAmount = totalAmountInclVat + totalCost;
    const settledAmount =
        paymentHistory?.payments?.reduce(
            (sum, payment) => sum + (Number(payment.amount) || 0),
            0
        ) ?? 0;
    const outstandingAmount = Math.max(0, finalAmount - settledAmount);

    const handleUpdateStatus = async (status: string) => {
        await updateOrderStatus({ orderId, status });
        invalidateData();
    };

    const invalidateData = () => {
        queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.detail(orderId) });
        queryClient.invalidateQueries({ queryKey: [...PAYMENTS_QUERY_KEY, orderId] });
    };

    const formatDateTime = (dateString: string) => {
        if (!dateString) return "N/A";
        return format(new Date(dateString), "dd/MM/yyyy HH:mm");
    };

    if (isLoadingOrder) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }
    if (!orderDetails) {
        return (
            <div className="text-center py-20 text-muted-foreground">Không tìm thấy đơn hàng</div>
        );
    }

    return (
        <>
            <OrderFormHeader
                onBack={onBack}
                title={isPurchase ? "Đơn mua hàng" : "Đơn bán hàng"}
                subtitle={
                    (isPurchase ? "Thông tin chi tiết đơn mua hàng" : "Thông tin chi tiết đơn bán hàng") +
                    " & Lịch sử"
                }
                badgeLabel="Chi tiết đơn hàng"
                codeLabel={orderDetails.code ? `#${orderDetails.code}` : undefined}
            />
            <div className="animate-in fade-in duration-500 pb-20 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3 space-y-6">
                        {/* Customer Info */}
                        <Card className="shadow-premium border-none">
                            <CardHeader className="pb-3 flex flex-row items-center gap-2 border-b border-slate-50">
                                <Building2 className="w-4 h-4 text-blue-600" />
                                <CardTitle className="text-sm font-bold uppercase tracking-tight text-slate-500">
                                    Khách hàng
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 items-start gap-2">
                                        <Label className="text-xs text-muted-foreground pt-1">Tên công ty:</Label>
                                        <div className="col-span-2 text-sm font-bold text-slate-900">
                                            {orderDetails.companyName || orderDetails?.customer?.name}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 items-start gap-2">
                                        <Label className="text-xs text-muted-foreground pt-1">Email công ty:</Label>
                                        <div className="col-span-2 text-sm text-blue-600 underline">
                                            {orderDetails.vatEmail || orderDetails.customer?.email || "-"}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 items-start gap-2">
                                        <Label className="text-xs text-muted-foreground pt-1">Tên người đặt hàng:</Label>
                                        <div className="col-span-2 text-sm font-medium">
                                            {orderDetails.customer?.name}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 items-start gap-2">
                                        <Label className="text-xs text-muted-foreground pt-1">Mã số thuế:</Label>
                                        <div className="col-span-2 text-sm font-mono font-medium">
                                            {orderDetails.taxCode || "-"}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 items-start gap-2">
                                        <Label className="text-xs text-muted-foreground pt-1">Địa chỉ công ty:</Label>
                                        <div className="col-span-2 text-sm leading-relaxed">
                                            {orderDetails.companyAddress || orderDetails.customer?.address || "-"}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 items-start gap-2">
                                        <Label className="text-xs text-muted-foreground pt-1">Số điện thoại:</Label>
                                        <div className="col-span-2 text-sm font-medium">
                                            {orderDetails.customer?.phoneNumber || "-"}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Shipping */}
                        <Card className="shadow-premium border-none">
                            <CardHeader className="pb-3 flex flex-row items-center gap-2 border-b border-slate-50">
                                <Package className="w-4 h-4 text-amber-600" />
                                <CardTitle className="text-sm font-bold uppercase tracking-tight text-slate-500">
                                    Vận chuyển
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                                    <div className="grid grid-cols-3 items-start gap-2">
                                        <Label className="text-xs text-muted-foreground pt-1">Người nhận:</Label>
                                        <div className="col-span-2 text-sm font-bold text-slate-900">
                                            {orderDetails.receiverName || "-"}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 items-start gap-2">
                                        <Label className="text-xs text-muted-foreground pt-1">SĐT người nhận:</Label>
                                        <div className="col-span-2 text-sm font-medium">
                                            {orderDetails.receiverPhone || "-"}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 md:grid-cols-6 items-start gap-2">
                                    <Label className="text-xs text-muted-foreground pt-1">Địa chỉ:</Label>
                                    <div className="col-span-2 md:col-span-5 text-sm leading-relaxed">
                                        {orderDetails.receiverAddress || "-"}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Products Table */}
                        <Card className="shadow-premium border-none overflow-hidden">
                            <CardHeader className="pb-3 border-b border-slate-50">
                                <CardTitle className="text-sm font-bold uppercase tracking-tight text-slate-500 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-emerald-600" /> Sản phẩm
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="w-10 text-center">#</TableHead>
                                            <TableHead>Tên SP</TableHead>
                                            <TableHead className="w-32">Hãng SX</TableHead>
                                            <TableHead className="w-20 text-center">SL</TableHead>
                                            <TableHead className="w-32 text-left">Đơn giá</TableHead>
                                            <TableHead className="w-32 text-left">Thuế (VAT)</TableHead>
                                            <TableHead className="w-32 text-left">Tổng tiền (có VAT)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orderDetails.details?.map((item, idx) => {
                                            const itemTotal = item.vatTotalPrice ?? item.totalPrice ?? 0;
                                            const itemBase = item.totalPrice ?? 0;
                                            const itemVat = itemTotal - itemBase;
                                            return (
                                                <TableRow
                                                    key={item.id || idx}
                                                    className="hover:bg-slate-50/80 transition-colors"
                                                >
                                                    <TableCell className="text-left text-slate-400 font-medium">{idx + 1}</TableCell>
                                                    <TableCell className="py-3">
                                                        <div className="font-bold text-slate-900">[{item.product.code}]</div>
                                                        <div className="text-sm text-slate-600 leading-snug">
                                                            {item.product.name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {item.product.manufacturer || "-"}
                                                    </TableCell>
                                                    <TableCell className="text-left font-medium text-sm">{item.quantity}</TableCell>
                                                    <TableCell className="text-left font-medium text-sm">
                                                        {formatCurrency(item.unitPrice || 0)}
                                                    </TableCell>
                                                    <TableCell className="text-left">
                                                        <div className="text-sm text-slate-900 font-medium">
                                                            {formatCurrency(itemVat)}
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs text-slate-400 mt-0.5 bg-slate-50"
                                                        >
                                                            {item.vatPercentage ?? 0}% VAT
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-left font-bold text-sm text-slate-900">
                                                        {formatCurrency(itemTotal)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                    <tfoot>
                                        <TableRow className="bg-slate-50/30">
                                            <TableCell colSpan={3} className="pl-6 font-bold text-slate-900 text-left">
                                                Tổng
                                            </TableCell>
                                            <TableCell className="text-left font-bold text-slate-900">
                                                {totalQuantity}
                                            </TableCell>
                                            <TableCell />
                                            <TableCell className="text-left font-bold text-slate-900">
                                                {formatCurrency(orderDetails.totalVat)}
                                            </TableCell>
                                            <TableCell className="text-left font-bold text-slate-900">
                                                {formatCurrency(totalAmountInclVat)}
                                            </TableCell>
                                        </TableRow>
                                    </tfoot>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Status */}
                        <Card className="shadow-premium border-none">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Trạng thái đơn hàng
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 space-y-4">
                                <Select
                                    value={
                                        typeof orderDetails.status === "object"
                                            ? orderDetails.status?.code
                                            : orderDetails.status
                                    }
                                    onValueChange={handleUpdateStatus}
                                >
                                    <SelectTrigger className="w-full h-10 font-semibold border-slate-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(isPurchase ? PURCHASE_ORDER_STATUSES : ORDER_STATUSES).map((s: string) => (
                                            <SelectItem key={s} value={s}>
                                                {(isPurchase ? PURCHASE_ORDER_STATUS_LABELS_VI : ORDER_STATUS_LABELS_VI)[s]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="grid grid-cols-1 gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-sm h-9 justify-start font-medium"
                                        onClick={() => navigate(`/orders/${orderDetails.id}/edit`)}
                                    >
                                        <Pencil className="w-3.5 h-3.5 mr-2 text-slate-400" /> Chỉnh sửa đơn hàng
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-sm h-9 justify-start font-medium"
                                        onClick={() => setShowSlipDialog(true)}
                                    >
                                        <FileText className="w-3.5 h-3.5 mr-2 text-slate-400" /> Tạo phiếu xuất kho
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-sm h-9 justify-start font-medium"
                                        onClick={() => setShowPaymentDialog(true)}
                                    >
                                        <Plus className="w-3.5 h-3.5 mr-2 text-slate-400" /> Thêm thanh toán
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment Info */}
                        <Card className="shadow-premium border-none">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Thông tin thanh toán
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">Phương thức</span>
                                    <div className="flex items-center gap-1.5 font-bold text-sm uppercase">
                                        <CreditCard className="w-3 h-3" />
                                        {getPaymentMethodLabel(orderDetails.paymentMethod || "cash")}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-sm text-slate-500">Đã thanh toán</span>
                                    <span className="text-sm font-bold text-emerald-600">
                                        {formatCurrency(settledAmount)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center border-t border-slate-50 pt-2">
                                    <span className="text-sm text-slate-500">Còn lại</span>
                                    <span className="text-sm font-bold text-red-500">
                                        {formatCurrency(outstandingAmount)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Cost Breakdown */}
                        <Card className="shadow-premium border-none bg-slate-50/50">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Chi phí đơn hàng
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">Tạm tính</span>
                                    <span className="text-sm font-medium">{formatCurrency(priceOfAllProducts)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">Thuế (VAT)</span>
                                    <span className="text-sm font-medium">{formatCurrency(totalVat)}</span>
                                </div>
                                {orderDetails.expenses && orderDetails.expenses.length > 0 && (
                                    <div className="space-y-1 pt-1">
                                        <div className="text-xs text-slate-400 font-bold uppercase border-b border-slate-100 pb-1 mb-1">
                                            Chi phí khác
                                        </div>
                                        {orderDetails.expenses.map((exp, i) => (
                                            <div key={i} className="flex justify-between items-center">
                                                <span className="text-xs text-slate-400 italic">• {exp.name}</span>
                                                <span className="text-xs text-slate-400 font-medium">
                                                    {formatCurrency(Number(exp.amount))}
                                                </span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between items-center pt-1 font-bold">
                                            <span className="text-sm text-slate-900">Tổng chi phí</span>
                                            <span className="text-sm text-slate-900">{formatCurrency(totalCost)}</span>
                                        </div>
                                    </div>
                                )}
                                <Separator className="bg-slate-200" />
                                <div className="flex justify-between items-end pt-1">
                                    <span className="text-sm font-bold text-slate-900 uppercase">Tổng cộng</span>
                                    <span className="text-lg font-black text-slate-900 leading-none">
                                        {formatCurrency(finalAmount)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tags */}
                        <Card className="shadow-premium border-none">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Nhãn đơn hàng
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="flex flex-wrap gap-1.5">
                                    {orderDetails.tags && orderDetails.tags.length > 0 ? (
                                        orderDetails.tags.map((tag, i) => (
                                            <Badge
                                                key={i}
                                                variant="secondary"
                                                className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 border-none"
                                            >
                                                {tag}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-sm text-slate-400 italic">Không có nhãn</span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Activity Log */}
                        <Card className="shadow-premium border-none">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Lịch sử hoạt động
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Xem lịch sử hoạt động của đơn hàng
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="space-y-4 pt-2">
                                    {historyEntity?.data?.slice(0, 5).map((log) => (
                                        <div
                                            key={log.id}
                                            className="relative pl-5 border-l border-slate-100 pb-1 last:pb-0"
                                        >
                                            <div className="absolute left-[-4.5px] top-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white" />
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-bold text-slate-800 leading-tight">
                                                    {log.title}
                                                </p>
                                                <p className="text-xs text-slate-400 leading-tight">
                                                    {log.user?.username || "Hệ thống"} •{" "}
                                                    {formatDateTime(log.createdAt.toString())}
                                                </p>
                                                {log.message && (
                                                    <p className="text-xs text-slate-500 italic mt-1 bg-slate-50 p-1 rounded leading-tight">
                                                        {log.message}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {(historyEntity?.data?.length ?? 0) > 5 && (
                                        <Button variant="link" className="text-xs h-auto p-0 text-blue-500">
                                            Xem tất cả ({historyEntity?.data?.length})
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <SlipCreatingDialog
                open={showSlipDialog}
                onOpenChange={setShowSlipDialog}
                slipType="export"
                orderId={orderId}
                onSlipCreated={() => {
                    setShowSlipDialog(false);
                    invalidateData();
                }}
            />

            <PaymentDialog
                open={showPaymentDialog}
                onOpenChange={setShowPaymentDialog}
                order={orderDetails}
                onUpdate={invalidateData}
            />
        </>
    );
};

export default ViewOrderForm;
