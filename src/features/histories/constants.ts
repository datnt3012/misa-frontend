export const HISTORIES_QUERY_KEY = ["histories"];

export const HISTORY_ACTION_TYPE = {
    CREATE: "created",
    UPDATE: "updated",
    DELETE: "deleted",
    RESTORED: "restored",
    STATUS_CHANGED: "status_changed",
    PAYMENT_ADDED: "payment_added",
    STOCK_UPDATED: "stock_updated",
} as const;

export type HistoryActionType = (typeof HISTORY_ACTION_TYPE)[keyof typeof HISTORY_ACTION_TYPE];

export const HISTORY_ENTITY_TYPE = {
    ORDER: "order",
    QUOTATION: "quotation",
    CUSTOMER: "customer",
    PRODUCT: "product",
    WAREHOUSE: "warehouse",
    STOCK_LEVEL: "stock_level",
    WAREHOUSE_RECEIPT: "warehouse_receipt",
    EXPORT_SLIP: "export_slip",
    CATEGORY: "category",
    SUPPLIER: "supplier",
    USER: "user",
    ROLE: "role",
    PAYMENT: "payment",
} as const;

export type HistoryEntityType = (typeof HISTORY_ENTITY_TYPE)[keyof typeof HISTORY_ENTITY_TYPE];