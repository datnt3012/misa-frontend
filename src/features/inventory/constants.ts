import { InventoryLogFilterSchemaType } from "./schemas";

export const INVENTORY_LOG_QUERY_KEY = {
    list: (params: Partial<InventoryLogFilterSchemaType>) => ['inventory-logs', 'list', params] as const,
} as const;

/**
 * Receipt Status Enum
 */
export const ReceiptStatus = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    PICKED: 'picked',
    EXPORTED: 'exported',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
} as const;

export type ReceiptStatusType = (typeof ReceiptStatus)[keyof typeof ReceiptStatus];

export const ReceiptStatusLabel = {
    [ReceiptStatus.PENDING]: 'Chờ xử lý',
    [ReceiptStatus.APPROVED]: 'Đã duyệt',
    [ReceiptStatus.REJECTED]: 'Đã từ chối',
    [ReceiptStatus.PICKED]: 'Đã lấy hàng',
    [ReceiptStatus.EXPORTED]: 'Đã xuất kho',
    [ReceiptStatus.CANCELLED]: 'Đã hủy',
    [ReceiptStatus.COMPLETED]: 'Đã hoàn thành',
} as const;

export const ReceiptStatusClassName = {
    [ReceiptStatus.PENDING]: 'border-yellow-500 text-yellow-500 bg-yellow-500/10',
    [ReceiptStatus.APPROVED]: 'border-green-500 text-green-500 bg-green-500/10',
    [ReceiptStatus.REJECTED]: 'border-red-500 text-red-500 bg-red-500/10',
    [ReceiptStatus.PICKED]: 'border-blue-500 text-blue-500 bg-blue-500/10',
    [ReceiptStatus.EXPORTED]: 'border-purple-500 text-purple-500 bg-purple-500/10',
    [ReceiptStatus.CANCELLED]: 'border-red-500 text-red-500 bg-red-500/10',
    [ReceiptStatus.COMPLETED]: 'border-green-500 text-green-500 bg-green-500/10',
} as const;

/**
 * Receipt Action Enum
 */
export const ReceiptAction = {
    CREATE: 'create',
    APPROVE: 'approve',
    REJECT: 'reject',
    UPDATE: 'update',
} as const;

export const ReceiptActionLabel = {
    [ReceiptAction.CREATE]: 'Tạo',
    [ReceiptAction.APPROVE]: 'Duyệt',
    [ReceiptAction.REJECT]: 'Từ chối',
    [ReceiptAction.UPDATE]: 'Cập nhật',
} as const;

export type ReceiptActionType = (typeof ReceiptAction)[keyof typeof ReceiptAction];

/**
 * Warehouse Receipt Type Enum
 */
export const WarehouseReceiptType = {
    IMPORT: 'import',
    EXPORT: 'export',
    MOVING: 'moving',
    STOCK_TRANSFER_OUT: 'stock_transfer_out',
    STOCK_TRANSFER_IN: 'stock_transfer_in',
    SALE_RETURN_NOTE: 'sale_return_note',
    PURCHASE_RETURN_NOTE: 'purchase_return_note',
} as const;

export const WarehouseReceiptTypeLabel = {
    [WarehouseReceiptType.IMPORT]: 'Nhập kho',
    [WarehouseReceiptType.EXPORT]: 'Xuất kho',
    [WarehouseReceiptType.MOVING]: 'Chuyển kho',
    [WarehouseReceiptType.STOCK_TRANSFER_OUT]: 'Chuyển kho',
    [WarehouseReceiptType.STOCK_TRANSFER_IN]: 'Chuyển kho',
    [WarehouseReceiptType.SALE_RETURN_NOTE]: 'Trả hàng',
    [WarehouseReceiptType.PURCHASE_RETURN_NOTE]: 'Trả hàng',
} as const;

export const WarehouseReceiptTypeClassName = {
    [WarehouseReceiptType.IMPORT]: 'border-green-500 text-green-500 bg-green-500/10',
    [WarehouseReceiptType.EXPORT]: 'border-red-500 text-red-500 bg-red-500/10',
    [WarehouseReceiptType.MOVING]: 'border-yellow-500 text-yellow-500 bg-yellow-500/10',
    [WarehouseReceiptType.STOCK_TRANSFER_OUT]: 'border-yellow-500 text-yellow-500 bg-yellow-500/10',
    [WarehouseReceiptType.STOCK_TRANSFER_IN]: 'border-yellow-500 text-yellow-500 bg-yellow-500/10',
    [WarehouseReceiptType.SALE_RETURN_NOTE]: 'border-blue-500 text-blue-500 bg-blue-500/10',
    [WarehouseReceiptType.PURCHASE_RETURN_NOTE]: 'border-purple-500 text-purple-500 bg-purple-500/10',
} as const;

export type WarehouseReceiptTypeType = (typeof WarehouseReceiptType)[keyof typeof WarehouseReceiptType];
