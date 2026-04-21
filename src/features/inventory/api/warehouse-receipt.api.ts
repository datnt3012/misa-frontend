import { WarehouseReceiptFilterSchemaType, WareHouseReceiptSchemaType } from "../schemas";
import { request } from "@/shared/api";
import { BackendPaginatedResponse } from "@/shared/schemas";
import { WarehouseReceiptType } from "../types";

export const WAREHOUSE_RECEIPT_API = {
    GET_WAREHOUSE_RECEIPTS: async (params: Partial<WarehouseReceiptFilterSchemaType>, signal?: AbortSignal) => {
        const response = await request<BackendPaginatedResponse<WareHouseReceiptSchemaType>>('get', '/warehouse-receipts', { params, signal });
        return response.data;
    },
    GET_WAREHOUSE_RECEIPTS_BY_ORDER_ID: async (orderId: string, signal?: AbortSignal) => {
        const response = await request<BackendPaginatedResponse<WarehouseReceiptType>>('get', `/warehouse-receipts/order/${orderId}`, { signal });
        return response.data;
    },
}