
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

/**
 * Receipt Action Enum
 */
export const ReceiptAction = {
    CREATE: 'create',
    APPROVE: 'approve',
    REJECT: 'reject',
    UPDATE: 'update',
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

export type WarehouseReceiptTypeType = (typeof WarehouseReceiptType)[keyof typeof WarehouseReceiptType];
