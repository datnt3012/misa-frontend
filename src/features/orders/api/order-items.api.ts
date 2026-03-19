import { request } from "@/shared/api/request";
import { CreateOrderItemSchemaType, UpdateOrderItemSchemaType } from "../schemas";

export const ORDER_ITEMS_API = {
    CREATE: (orderId: string, data: CreateOrderItemSchemaType) =>
        request('post', `/orders/${orderId}/details`, { data }).then((res) => res.data),

    UPDATE: (orderId: string, detailId: string, data: UpdateOrderItemSchemaType) =>
        request('patch', `/orders/${orderId}/details/${detailId}`, { data }).then((res) => res.data),

    DELETE: (orderId: string, detailId: string) =>
        request('delete', `/orders/${orderId}/details/${detailId}`).then((res) => res.data),
};