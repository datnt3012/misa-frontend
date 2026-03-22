import { API } from "@/shared/api";
import { request } from "@/shared/api/request";
import {
    SuppliersFilterSchemaType,
    CreateSupplierSchemaType,
    UpdateSupplierSchemaType,
    SupplierSchemaType
} from "./schemas";
import { BackendPaginatedResponse } from "@/shared/schemas";

export const SUPPLIERS_API = {
    // Get all categories
    GET_ALL: (params?: SuppliersFilterSchemaType, signal?: AbortSignal) => {
        //BackendPaginatedResponse
        return request<BackendPaginatedResponse<SupplierSchemaType>>("get", API.SUPPLIERS.ROOT, {
            params,
            signal
        }).then((res) => res.data);
    },

    // Get category by ID
    GET_BY_ID: (id: string, signal?: AbortSignal) => {
        return request<SupplierSchemaType>("get", API.SUPPLIERS.BY_ID(id), {
            signal
        }).then((res) => res.data);
    },

    // Create a new category
    CREATE_CATEGORY: (data: CreateSupplierSchemaType, signal?: AbortSignal) => {
        return request("post", API.SUPPLIERS.ROOT, {
            data,
            signal
        }).then((res) => res.data);
    },

    // Update category by ID
    UPDATE_CATEGORY: (id: string, data: UpdateSupplierSchemaType, signal?: AbortSignal) => {
        return request("patch", API.SUPPLIERS.BY_ID(id), {
            data,
            signal
        }).then((res) => res.data);
    },

    // Delete category by ID
    DELETE_CATEGORY: (id: string, signal?: AbortSignal) => {
        return request("delete", API.SUPPLIERS.BY_ID(id), {
            signal
        }).then((res) => res.data);
    },
};