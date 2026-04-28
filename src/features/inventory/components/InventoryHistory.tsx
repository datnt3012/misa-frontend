import { useInventoryMovementQuery } from "../hooks/useInventoryMovementQuery";
import { InventoryMovementFilterSchemaType } from "../schemas";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { InventoryMovement as InvTransLog } from "../schemas/inventory-movement.schema";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/shared/components/Pagination";
import { CircleArrowDown, CircleArrowUp } from "lucide-react";
import {
    MovementType,
    MovementTypeLabel,
    MovementTypeClassName,
    ReferenceType,
    ReferenceTypeLabel
} from "../constants";
import { Input } from "@/components/ui/input";
import { Autocomplete } from "@/shared/components/autocomplete";
import { useWarehouseList } from "@/features/warehouses";
import { Link } from "react-router-dom";


const filterDefault = {
    page: 1,
    limit: 25,
    keyword: '',
}

export const InventoryHistory = () => {
    const [filter, setFilter] = useState<InventoryMovementFilterSchemaType>(filterDefault);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const { data, isLoading, error } = useInventoryMovementQuery(filter);
    const { data: warehouse, isLoading: isLoadingWarehouse } = useWarehouseList({ page: 1, limit: 1000 });
    const rows = data?.data.rows || [];
    const warehouseOptions = useMemo(() => {
        if (isLoadingWarehouse) return [];
        return warehouse?.data.rows.map((item) => ({
            value: item.id,
            label: item.name,
        }));
    }, [warehouse, isLoadingWarehouse]);

    useEffect(() => {
        console.log('inventory movements: ', rows);
    }, [rows]);

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
            key: 'referenceCode',
            label: 'Mã tham chiếu',
            align: 'text-left',
            render: (record: InvTransLog) => {
                let tab = '';
                if (record.referenceType === ReferenceType.WAREHOUSE_EXPORT || record.referenceType === ReferenceType.CANCEL_EXPORT) {
                    tab = 'exports';
                } else if (record.referenceType === ReferenceType.WAREHOUSE_RECEIPT || record.referenceType === ReferenceType.CANCEL_RECEIPT) {
                    tab = 'imports';
                } else if (record.referenceType === ReferenceType.STOCK_TRANSFER_OUT || record.referenceType === ReferenceType.STOCK_TRANSFER_IN) {
                    tab = 'moving';
                }

                if (tab) {
                    return (
                        <Link to={`/export-import?tab=${tab}&search=${record.referenceCode}`} className="block font-medium text-blue-600 hover:underline">
                            {record.referenceCode}
                        </Link>
                    )
                }
                return <span className="block font-medium">{record.referenceCode}</span>
            },
        },
        {
            key: 'referenceType',
            label: 'Loại tham chiếu',
            align: 'text-left',
            render: (record: InvTransLog) => (
                <span className="block">{ReferenceTypeLabel[record.referenceType] || record.referenceType}</span>
            ),
        },
        {
            key: 'product',
            label: 'Sản phẩm',
            align: 'text-left',
            render: (record: InvTransLog) => (
                <div className="flex flex-col">
                    <span className="font-medium text-slate-700">{record.product?.name || '-'}</span>
                    <span className="text-xs text-slate-400">{record.product?.code || '-'}</span>
                </div>
            ),
        },
        {
            key: 'warehouse',
            label: 'Nhà kho',
            align: 'text-left',
            render: (record: InvTransLog) => (
                <div className="flex flex-col">
                    <span className="font-medium text-slate-700">{record.warehouse?.name || '-'}</span>
                    <span className="text-xs text-slate-400">{record.warehouse?.code || '-'}</span>
                </div>
            ),
        },
        {
            key: 'movementType',
            label: 'Loại giao dịch',
            align: 'text-center',
            render: (record: InvTransLog) => {
                const icon = record.movementType === MovementType.OUT ? <CircleArrowDown className="w-4 h-4" /> : <CircleArrowUp className="w-4 h-4" />;
                return (
                    <div className="flex items-center justify-center">
                        <Badge variant='outline' className={`flex items-center gap-2 w-fit ${MovementTypeClassName[record.movementType]}`}>
                            {icon}
                            <span>{MovementTypeLabel[record.movementType]}</span>
                        </Badge>
                    </div>
                )
            },
        },
        {
            key: 'quantityBefore',
            label: 'SL tồn kho ban đầu',
            align: 'text-right',
            render: (record: InvTransLog) => (
                <span className="block">{record.quantityBefore}</span>
            ),
        },
        {
            key: 'quantity',
            label: 'SL điều chỉnh',
            align: 'text-right',
            render: (record: InvTransLog) => {
                const sign = record.movementType === MovementType.IN ? '+' : '-';
                const className = record.movementType === MovementType.IN ? 'text-green-600' : 'text-red-600';
                return (
                    <span className={`block font-medium ${className}`}>{sign} {record.quantity}</span>
                )
            },
        },
        {
            key: 'quantityAfter',
            label: 'SL tồn kho sau điều chỉnh',
            align: 'text-right',
            render: (record: InvTransLog) => (
                <span className="block font-bold">{record.quantityAfter}</span>
            ),
        },
        {
            key: 'createdAt',
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
                    <span className="block">{formatDate(record.createdAt)}</span>
                )
            }
        },
        {
            key: 'note',
            label: 'Ghi chú',
            align: 'text-left',
            width: 'w-60',
            render: (record: InvTransLog) => (
                <span className="block text-muted-foreground italic">{record.note || '-'}</span>
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
                </div>
                <Input
                    className="w-full"
                    placeholder="Tìm kiếm theo mã tham chiếu, ghi chú..."
                    defaultValue={filter.keyword}
                    onChange={handleKeywordChange}
                />
                <div className="flex gap-2">
                    <Autocomplete
                        className="w-60"
                        options={Object.entries(MovementType).map(([key, value]) => ({ label: MovementTypeLabel[value], value }))}
                        value={filter.movementType}
                        placeholder="Loại giao dịch"
                        onChange={(value) => setFilter({ ...filter, movementType: value as any, page: 1 })}
                    />
                    <Autocomplete
                        className="w-60"
                        options={warehouseOptions}
                        value={filter.warehouseId}
                        placeholder="Chọn kho hàng"
                        onChange={(value) => setFilter({ ...filter, warehouseId: value, page: 1 })}
                    />
                </div>
            </div>
            <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm flex flex-col pb-2">
                <div className="overflow-auto min-h-0 flex-1 relative">
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
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + 1} className="text-center py-10 text-muted-foreground">
                                        Không tìm thấy lịch sử giao dịch
                                    </td>
                                </tr>
                            ) : (
                                rows.map((record, index) => (
                                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="text-center border-r border-b border-gray-200 px-4 py-3 last:border-r-0 text-sm">
                                            {((filter.page - 1) * (filter.limit || 25)) + index + 1}
                                        </td>
                                        {columns.map((column) => (
                                            <td key={column.key} className={`${column.align} ${column.width || ''} border-r border-b border-gray-200 px-4 py-3 last:border-r-0 text-sm`}>
                                                {column.render(record)}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="m-4">
                <PaginationBar
                    filters={{ page: filter.page || 1, limit: filter.limit || 25 }}
                    total={data?.data?.count ?? 0}
                    onFiltersChange={(f) => setFilter({ ...filter, page: f.page, limit: f.limit })}
                />
            </div>
        </div>
    );
}