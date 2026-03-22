import { API } from "@/shared/api";
import { request } from "@/shared/api/request";
import { LocationSchemaType } from "@/shared/schemas";

export const ADMINISTRATIVE_API = {
    GET_PROVINCES: (params?: {
        noPagination: boolean,
        level?: number,
        version?: number,
        limit?: number
    }, signal?: AbortSignal) => {
        return request<{ code: number; message: string; data: { rows: LocationSchemaType[] } }>("get", API.ADMINISTRATIVE.ROOT, {
            params,
            signal
        }).then((res) => res.data);
    },

    GET_WARDS: (params?: {
        noPagination: boolean,
        level?: number,
        version?: number,
        parentCode?: string | number,
        limit?: number
    }, signal?: AbortSignal) => {
        return request<{ code: number; message: string; data: { rows: LocationSchemaType[] } }>("get", API.ADMINISTRATIVE.ROOT, {
            params,
            signal
        }).then((res) => res.data);
    },
}
