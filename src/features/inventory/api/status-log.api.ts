import { request } from "@/shared/api/request";
import { API } from "@/shared/api";
import { BackendPaginatedResponse } from "@/shared/schemas";
import { InventoryLogFilterSchemaType, WarehouseReceiptStatusLog } from "../schemas";

export const WAREHOUSE_RECEIPT_STATUS_LOG_API = {
    GET_STATUS_LOGS: (params?: InventoryLogFilterSchemaType, signal?: AbortSignal) => {
        return request<BackendPaginatedResponse<WarehouseReceiptStatusLog>>("get", API.WAREHOUSE_RECEIPTS.STATUS_LOGS, {
            params,
            signal,
        }).then((res) => res.data);
    },
}