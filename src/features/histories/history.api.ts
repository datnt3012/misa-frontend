import { API } from "@/shared/api";
import { request } from "@/shared/api/request";
import { OrderSchemaType } from "../orders/schemas";
import { OrderFilterSchemaType } from "../orders/schemas";
import { FilterHistorySchemaType, HistorySchemaType } from "./history.schema";
import { BackendResponse } from "@/shared/schemas";

export const HISTORY_API = {
    // GET_ALL_HISTORY: (params: FilterHistorySchemaType, signal?: AbortSignal) => {
    //     return request<{ code: number; message: string; data: { rows: OrderSchemaType[]; count: number; summary?: any } }>("get", API.ORDERS.ROOT, {
    //         params,
    //         signal
    //     }).then((res) => res.data);
    // },

    GET_HISTORY_ENTITY: (params: FilterHistorySchemaType, signal?: AbortSignal) => {
        return request<BackendResponse<HistorySchemaType[]>>("get", API.HISTORY.ROOT + "/entity/" + params.entityType + "/" + params.entityId, {
            signal
        }).then((res) => res.data);
    },
}