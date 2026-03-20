import { API } from "@/shared/api";
import { request } from "@/shared/api/request";
import { CreateOrderItemSchemaType, UpdateOrderItemSchemaType } from "../schemas";

export const ORDER_ITEMS_API = {
    // Create a new order item
    CREATE_ORDER_ITEM: (orderId: string, data: CreateOrderItemSchemaType, signal?: AbortSignal) => {
        return request('post', API.ORDERS.DETAILS.ROOT(orderId), { 
            data, 
            signal 
        }).then((res) => res.data);
    },

    // Update an order item
    UPDATE_ORDER_ITEM: (orderId: string, detailId: string, data: UpdateOrderItemSchemaType, signal?: AbortSignal) => {
        return request('patch', API.ORDERS.DETAILS.BY_ID(orderId, detailId), { 
            data, 
            signal 
        }).then((res) => res.data);
    },

    // Delete an order item
    DELETE_ORDER_ITEM: (orderId: string, detailId: string, signal?: AbortSignal) => {
        return request('delete', API.ORDERS.DETAILS.BY_ID(orderId, detailId), { 
            signal 
        }).then((res) => res.data);
    },
};