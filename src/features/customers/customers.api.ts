import { API } from "@/shared/api";
import { request } from "@/shared/api/request";
import {
    CustomersFilterSchemaType,
    CreateCustomerSchemaType,
    UpdateCustomerSchemaType,
    CustomerSchemaType
} from "./schemas";
import { BackendPaginatedResponse } from "@/shared/schemas";

export const CUSTOMERS_API = {
    // Get all categories
    GET_ALL: (params?: CustomersFilterSchemaType, signal?: AbortSignal) => {
        //BackendPaginatedResponse
        return request<BackendPaginatedResponse<CustomerSchemaType>>("get", API.CUSTOMERS.ROOT, {
            params,
            signal
        }).then((res) => res.data);
    },

    // Get category by ID
    GET_BY_ID: (id: string, signal?: AbortSignal) => {
        return request<CustomerSchemaType>("get", API.CUSTOMERS.BY_ID(id), {
            signal
        }).then((res) => res.data);
    },

    // Create a new category
    CREATE_CATEGORY: (data: CreateCustomerSchemaType, signal?: AbortSignal) => {
        return request("post", API.CUSTOMERS.ROOT, {
            data,
            signal
        }).then((res) => res.data);
    },

    // Update category by ID
    UPDATE_CATEGORY: (id: string, data: UpdateCustomerSchemaType, signal?: AbortSignal) => {
        return request("patch", API.CUSTOMERS.BY_ID(id), {
            data,
            signal
        }).then((res) => res.data);
    },

    // Delete category by ID
    DELETE_CATEGORY: (id: string, signal?: AbortSignal) => {
        return request("delete", API.CUSTOMERS.BY_ID(id), {
            signal
        }).then((res) => res.data);
    },
};