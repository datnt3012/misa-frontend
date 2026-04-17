import { useStatusLogsQuery } from "../hooks/useInventoryLogQuery";
import { InventoryLogFilterSchemaType } from "../schemas";
import { useMemo, useState, useCallback, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { WarehouseReceiptStatusLog as InvTransLog } from "../schemas/status-log.schema";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/shared/components/Pagination";
import { CircleArrowDown, CircleArrowUp } from "lucide-react";
import { ReceiptStatusLabel, ReceiptStatusClassName, WarehouseReceiptTypeLabel, WarehouseReceiptTypeClassName, ReceiptStatus, WarehouseReceiptType, WarehouseReceiptTypeSign, WarehouseReceiptTypeQuantityClassName } from "../constants";
import { Input } from "@/components/ui/input";
import { Autocomplete } from "@/shared/components/autocomplete";
import { useWarehouseList } from "@/features/warehouses";


const filterDefault = {
    page: 1,
    limit: 25,
    keyword: '',
}

export const InventoryHistory = () => {
    const [filter, setFilter] = useState<InventoryLogFilterSchemaType>(filterDefault);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const { data, isLoading, error } = useStatusLogsQuery(filter);
    const { data: warehouse, isLoading: isLoadingWarehouse, error: warehouseError } = useWarehouseList({ page: 1, limit: 1000 });
    const logRecords = data?.data.rows || [];
    const warehouseOptions = useMemo(() => {
        if (isLoadingWarehouse) return [];
        return warehouse?.data.rows.map((item) => ({
            value: item.id,
            label: item.name,
        }));
    }, [warehouse, isLoadingWarehouse]);

    // Debounced keyword search
    const handleKeywordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            setFilter(prev => ({ ...prev, keyword: value, page: 1 }));
        }, 500);
    }, []);

    const columns = useMemo(() => [
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
            render: (record: InvTransLog) => {
                const quantity = `${WarehouseReceiptTypeSign[record.receiptType]} ${record.quantity}`;
                const className = WarehouseReceiptTypeQuantityClassName[record.receiptType];
                return (
                    <span className={`block ${className}`}>{quantity}</span>
                )
            },
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
                <span className="block">
                    {record.performedByName}
                </span>
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
            render: (record: InvTransLog) => {
                const formatDate = (date: string) => {
                    return new Date(date).toLocaleString("vi-VN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                    });
                };
                return (
                    <span className="block">{formatDate(record.performedAt)}</span>
                )
            }
        },
        {
            key: 'note',
            label: 'Ghi chú',
            align: 'text-left',
            width: 'w-80',
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
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div className="flex justify-between items-center my-8 gap-2">
                <div className="w-full">
                    <h1 className="text-2xl font-bold">Lịch sử xuất nhập kho</h1>
                    {/* <p className="text-sm text-muted-foreground">Theo dõi tất cả các giao dịch xuất nhập kho trong hệ thống</p> */}
                </div>
                <Input
                    className="w-full"
                    placeholder="Tìm kiếm theo mã phiếu, sản phẩm, kho, người tạo,..."
                    defaultValue={filter.keyword}
                    onChange={handleKeywordChange}
                />
                <div className="flex gap-2">
                    <Autocomplete
                        className="w-80"
                        options={Object.entries(WarehouseReceiptType).map(([key, value]) => ({ label: WarehouseReceiptTypeLabel[value], value }))}
                        value={filter.receiptType}
                        placeholder="Chọn loại giao dịch"
                        onChange={(value) => setFilter({ ...filter, receiptType: value, page: 1 })}
                    />
                    <Autocomplete
                        className="w-80"
                        options={warehouseOptions}
                        value={filter.warehouseId}
                        placeholder="Chọn kho hàng"
                        onChange={(value) => setFilter({ ...filter, warehouseId: value, page: 1 })}
                    />
                </div>
            </div>
            <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm flex flex-col pb-2">
                <div className="overflow-auto min-h-0 flex-1 relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-20 rounded-lg">
                            <div className="space-y-2">
                                <Skeleton className="w-full h-12" />
                                <Skeleton className="w-full h-12" />
                                <Skeleton className="w-full h-12" />
                            </div>
                        </div>
                    )}
                    <table className="w-full border-collapse text-sm">
                        <thead className="sticky top-0 z-10 bg-slate-50 shadow-[inset_0_-1px_0_0_#e2e8f0]">
                            <tr className="h-14 text-slate-600">
                                <th className="border-r border-gray-200 px-4 py-2 last:border-r-0 font-semibold text-left text-[13px] whitespace-nowrap"></th>
                                {columns.map((column) => (
                                    <th key={column.key} className="border-r border-gray-200 px-4 py-2 last:border-r-0 font-semibold text-left text-[13px] whitespace-nowrap">{column.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {logRecords.map((record, index) => (
                                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="text-center border-r border-b border-gray-200 px-4 py-3 last:border-r-0 text-sm">
                                        {((filter.page - 1) * filter.limit) + index + 1}
                                    </td>
                                    {columns.map((column) => (
                                        <td key={column.key} className={`${column.align} ${column.width} border-r border-b border-gray-200 px-4 py-3 last:border-r-0 text-sm`}>{column.render(record)}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="m-4">
                <PaginationBar
                    filters={{ page: filter.page, limit: filter.limit }}
                    total={data?.data?.count ?? 0}
                    onFiltersChange={(f) => setFilter({ ...filter, page: f.page, limit: f.limit })}
                />
            </div>
        </div>
    );
}