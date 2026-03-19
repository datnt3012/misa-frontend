import { request } from "@/shared/api/request";
import { CreateOrderSchemaType, OrderFilterSchemaType, UpdateOrderSchemaType } from "../schemas";

export const ORDER_API = {
    GET_ALL: (params: OrderFilterSchemaType, otps?: { signal?: AbortSignal }) =>
        request('get', '/orders', { params, signal: otps?.signal }).then((res) => res.data),

    GET_BY_ID: (id: string, otps?: { signal?: AbortSignal }) =>
        request('get', `/orders/${id}`, { signal: otps?.signal }).then((res) => res.data),

    CREATE: (data: CreateOrderSchemaType, otps?: { signal?: AbortSignal }) =>
        request('post', '/orders', { data, signal: otps?.signal }).then((res) => res.data),

    UPDATE: (id: string, data: UpdateOrderSchemaType, otps?: { signal?: AbortSignal }) =>
        request('put', `/orders/${id}`, { data, signal: otps?.signal }).then((res) => res.data),

    UPDATE_STATUS: (id: string, data: { status: string }, otps?: { signal?: AbortSignal }) =>
        request('put', `/orders/${id}/status`, { data, signal: otps?.signal }).then((res) => res.data),

    DELETE: (id: string, otps?: { signal?: AbortSignal }) =>
        request('delete', `/orders/${id}`, { signal: otps?.signal }).then((res) => res.data),
}