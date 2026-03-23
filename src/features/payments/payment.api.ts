import { API } from "@/shared/api";
import { request } from "@/shared/api/request";
import {
    CreatePaymentSchemaType,
    UpdatePaymentSchemaType,
    PaymentSchemaType,
    CreateMultiplePaymentSchemaType
} from "./schemas";
import { BackendPaginatedResponse } from "@/shared/schemas";

export const PAYMENTS_API = {
    GET_PAYMENTS: (params?: { orderId: string }, signal?: AbortSignal) => {
        return request<BackendPaginatedResponse<PaymentSchemaType[]>>("get", API.CATEGORIES.ROOT, {
            params,
            signal
        }).then((res) => res.data);
    },

    GET_PAYMENT_BY_ID: (id: string, signal?: AbortSignal) => {
        return request<PaymentSchemaType>("get", API.CATEGORIES.BY_ID(id), {
            signal
        }).then((res) => res.data);
    },

    CREATE_PAYMENT: (data: CreatePaymentSchemaType, signal?: AbortSignal) => {
        return request("post", API.CATEGORIES.ROOT, {
            data,
            signal
        }).then((res) => res.data);
    },

    CREATE_MULTIPLE_PAYMENT: (data: CreateMultiplePaymentSchemaType, signal?: AbortSignal) => {
        return request("post", API.CATEGORIES.ROOT, {
            data,
            signal
        }).then((res) => res.data);
    },

    UPDATE_PAYMENT: (id: string, data: UpdatePaymentSchemaType, signal?: AbortSignal) => {
        return request("patch", API.CATEGORIES.BY_ID(id), {
            data,
            signal
        }).then((res) => res.data);
    },

    DELETE_PAYMENT: (id: string, signal?: AbortSignal) => {
        return request("delete", API.CATEGORIES.BY_ID(id), {
            signal
        }).then((res) => res.data);
    },
};