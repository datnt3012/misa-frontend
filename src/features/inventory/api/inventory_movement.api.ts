import { request } from "@/shared/api/request";
import { API } from "@/shared/api";
import { BackendPaginatedResponse } from "@/shared/schemas";
import { InventoryMovementFilterSchemaType, InventoryMovement } from "../schemas";

export const INVENTORY_MOVEMENT_API = {
    GET_MOVEMENTS: (params?: InventoryMovementFilterSchemaType, signal?: AbortSignal) => {
        return request<BackendPaginatedResponse<InventoryMovement>>("get", API.INVENTORY_MOVEMENTS.ROOT, {
            params,
            signal,
        }).then((res) => res.data);
    },
}