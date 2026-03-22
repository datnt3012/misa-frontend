import { API } from "@/shared/api";
import { request } from "@/shared/api/request";
import {
    CreateOrderSchemaType,
    OrderFilterSchemaType,
    UpdateOrderSchemaType,
    OrderSchemaType
} from "../schemas";

export const ORDER_API = {
    // Get all orders
    GET_ORDERS: (params: OrderFilterSchemaType, signal?: AbortSignal) => {
        return request<{ code: number; message: string; data: { rows: OrderSchemaType[]; count: number; summary?: any } }>("get", API.ORDERS.ROOT, {
            params,
            signal
        }).then((res) => res.data);
    },

    // Get order by ID
    GET_ORDER_BY_ID: (id: string, signal?: AbortSignal) => {
        return request<OrderSchemaType>('get', API.ORDERS.BY_ID(id), {
            signal
        }).then((res) => res.data);
    },

    // Get list of banks
    GET_BANKS: (signal?: AbortSignal) => {
        return request<Array<{ id: string; name: string; code?: string }>>('get', API.ORDERS.BANKS, {
            signal
        }).then((res) => res.data);
    },

    // Create a new order
    CREATE_ORDER: (data: CreateOrderSchemaType, signal?: AbortSignal) => {
        return request('post', API.ORDERS.ROOT, {
            data,
            signal
        }).then((res) => res.data);
    },

    // Update order by ID
    UPDATE_ORDER: (id: string, data: UpdateOrderSchemaType, signal?: AbortSignal) => {
        return request('patch', API.ORDERS.BY_ID(id), {
            data,
            signal
        }).then((res) => res.data);
    },

    // Update order status
    UPDATE_ORDER_STATUS: (id: string, data: { status: string }, signal?: AbortSignal) => {
        return request('patch', API.ORDERS.STATUS(id), {
            data,
            signal
        }).then((res) => res.data);
    },

    // Delete order by ID
    DELETE_ORDER: (id: string, signal?: AbortSignal) => {
        return request('delete', API.ORDERS.BY_ID(id), {
            signal
        }).then((res) => res.data);
    },

    // Get status options for orders
    GET_STATUS_OPTIONS: (signal?: AbortSignal) => {
        return request('get', API.ORDERS.STATUS_OPTIONS, {
            signal
        }).then((res) => res.data);
    },

    // Get payments for a specific order
    GET_PAYMENTS: (id: string, signal?: AbortSignal) => {
        return request('get', API.ORDERS.PAYMENTS(id), {
            signal
        }).then((res) => res.data);
    },

    // Preview bulk payment
    PREVIEW_BULK_PAYMENT: (data: { orderIds: string[]; totalAmount: number }, signal?: AbortSignal) => {
        return request('post', API.ORDERS.BULK_PAYMENT_PREVIEW, {
            data,
            signal
        }).then((res) => res.data);
    },

    // Export order to blob
    EXPORT_ORDER: (id: string, signal?: AbortSignal) => {
        return request('get', API.ORDERS.EXPORT(id), {
            signal,
            responseType: 'blob'
        }).then((res) => res.data);
    },

    // Restore deleted order
    RESTORE_ORDER: (id: string, signal?: AbortSignal) => {
        return request('post', API.ORDERS.RESTORE(id), {
            signal
        }).then((res) => res.data);
    },

    // Update order tags
    UPDATE_ORDER_TAGS: (id: string, data: { tags: string[] }, signal?: AbortSignal) => {
        return request('put', API.ORDERS.TAGS(id), {
            data,
            signal
        }).then((res) => res.data);
    },
};