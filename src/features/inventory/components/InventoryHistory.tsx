import { Card, CardContent } from "@/components/ui/card";
import { useStatusLogsQuery } from "../hooks/useInventoryLogQuery";
import { InventoryLogFilterSchemaType } from "../schemas";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { WarehouseReceiptStatusLog as InvTransLog } from "../schemas/status-log.schema";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/shared/components/Pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CircleArrowDown, CircleArrowUp } from "lucide-react";
import { format } from "date-fns";
import { ReceiptStatusLabel, ReceiptStatusClassName, WarehouseReceiptTypeLabel, WarehouseReceiptTypeClassName, ReceiptStatus, WarehouseReceiptType } from "../constants";
import { Input } from "@/components/ui/input";
import { Autocomplete } from "@/shared/components/autocomplete";

const filterDefault = {
    page: 1,
    limit: 25,
    keyword: '',
}

export const InventoryHistory = () => {
    const [filter, setFilter] = useState<InventoryLogFilterSchemaType>(filterDefault);
    const { data, isLoading, error } = useStatusLogsQuery(filter);
    const logRecords = data?.data.rows || [];
    const { page, limit, count, totalPage } = data?.data || {};

    const columns = useMemo(() => [
        // {
        //     key: 'index',
        //     label: 'STT',
        //     className: 'w-[60px] text-left',
        //     render: (record: InvTransLog, index: number) => (
        //         <span className="block">{index}</span>
        //     ),
        // },
        {
            key: 'receiptCode',
            label: 'Mã phiếu',
            align: 'text-left',
            render: (record: InvTransLog) => (
                <span className="block">{record.receiptCode}</span>
            ),
        },
        {
            key: 'product',
            label: 'Sản phẩm',
            align: 'text-left',
            render: (record: InvTransLog) => (
                <div className="flex flex-col items-start gap-2">
                    <span className="block">{record.productName}</span>
                    <span className="block text-muted-foreground">{record.productCode}</span>
                </div>
            ),
        },
        {
            key: 'receiptType',
            label: 'Loại giao dịch',
            align: 'text-center',
            render: (record: InvTransLog) => {
                const icon = record.receiptType === 'export' ? <CircleArrowDown className="w-4 h-4" /> : <CircleArrowUp className="w-4 h-4" />;
                return (
                    <div className="flex items-center justify-center">
                        <Badge variant='outline' className={`flex items-center gap-2 w-fit ${WarehouseReceiptTypeClassName[record.receiptType]}`}>
                            {icon}
                            <span>{WarehouseReceiptTypeLabel[record.receiptType]}</span>
                        </Badge>
                    </div>
                )
            },
        },
        {
            key: 'quantity',
            label: 'Số lượng',
            align: 'text-right',
            render: (record: InvTransLog) => (
                <span className="block">{record.quantity}</span>
            ),
        },
        {
            key: 'warehouse',
            label: 'Kho',
            align: 'text-left',
            render: (record: InvTransLog) => (
                <div className="flex flex-col items-start gap-2">
                    <span className="block">{record.warehouseName}</span>
                    <span className="block text-muted-foreground">{record.warehouseCode}</span>
                </div>
            ),
        },
        {
            key: 'performedBy',
            label: 'Người tạo',
            align: 'text-left',
            render: (record: InvTransLog) => (
                <span className="block">{record.performedBy}</span>
            ),
        },
        {
            key: 'status',
            label: 'Trạng thái',
            align: 'text-left',
            render: (record: InvTransLog) => {
                const status = record.status;
                const className = ReceiptStatusClassName[status];
                const statusText = ReceiptStatusLabel[status];
                return (
                    <div className="flex items-center justify-center">
                        <Badge
                            variant='outline'
                            className={className}
                        >
                            {statusText}
                        </Badge>
                    </div>
                )
            }
        },
        {
            key: 'performedAt',
            label: 'Thời gian',
            align: 'text-left',
            render: (record: InvTransLog) => (
                <span className="block">{format(record.performedAt, 'dd/MM/yyyy HH:mm:ss')}</span>
            ),
        },
        {
            key: 'note',
            label: 'Ghi chú',
            align: 'text-left',
            render: (record: InvTransLog) => (
                <span className="block">{record.note}</span>
            ),
        },
    ], [])

    if (isLoading) {
        return <div className="space-y-4">
            <Skeleton className="w-full h-12" />
            <Skeleton className="w-full h-12" />
            <Skeleton className="w-full h-12" />
            <Skeleton className="w-full h-12" />
            <Skeleton className="w-full h-12" />
        </div>
    }

    if (error) {
        return <div>Error: {error.message}</div>
    }

    return (
        <div className="min-h-[calc(100vh-63px)]">
            {/* Header */}
            <div className="flex justify-between items-center my-8">
                <div>
                    <h1 className="text-2xl font-bold">Lịch sử xuất nhập kho</h1>
                    <p className="text-sm text-muted-foreground">Theo dõi tất cả các giao dịch xuất nhập kho trong hệ thống</p>
                </div>
                <div>
                    <Input
                        placeholder="Tìm kiếm..."
                        value={filter.keyword}
                        onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
                    />
                    <Autocomplete
                        options={Object.entries(WarehouseReceiptType).map(([key, value]) => ({ label: WarehouseReceiptTypeLabel[value], value }))}
                        value={filter.receiptType}
                        onChange={(value) => setFilter({ ...filter, receiptType: value })}
                    />
                    <Autocomplete
                        options={Object.entries(ReceiptStatus).map(([key, value]) => ({ label: ReceiptStatusLabel[value], value }))}
                        value={filter.warehouseId}
                        onChange={(value) => setFilter({ ...filter, warehouseId: value })}
                    />
                </div>
            </div>
            <Card className="my-4">
                <CardContent className="p-0">
                    <Table className="w-full border-collapse text-sm">
                        <TableHeader className="border-b">
                            <TableRow>
                                {columns.map((column) => (
                                    <TableHead key={column.key} className="border-x-2 border-gray-500/10 first:border-l-0 last:border-r-0">{column.label}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logRecords.map((record) => (
                                <TableRow key={record.id}>
                                    {columns.map((column) => (
                                        <TableCell key={column.key} className={`${column.align} border-x-2 border-gray-500/10 first:border-l-0 last:border-r-0`}>{column.render(record)}</TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <PaginationBar
                filters={{ page: filter.page, limit: filter.limit }}
                total={data?.data?.count ?? 0}
                onFiltersChange={(f) => setFilter({ ...filter, page: f.page, limit: f.limit })}
            />
        </div>
    );
}