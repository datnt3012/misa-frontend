import { API } from "@/shared/api";
import { request } from "@/shared/api/request";
import { 
    CategoriesFilterParams, 
    CreateCategorySchemaType, 
    UpdateCategorySchemaType, 
    CategorySchemaType
} from "./schemas";

export const CATEGORIES_API = {
    // Get all categories
    GET_CATEGORIES: (params?: CategoriesFilterParams, signal?: AbortSignal) => {
        return request<{ code: number; message: string; data: { rows: CategorySchemaType[]; count: number } }>("get", API.CATEGORIES.ROOT, {
            params,
            signal
        }).then((res) => res.data);
    },

    // Get category by ID
    GET_CATEGORY_BY_ID: (id: string, signal?: AbortSignal) => {
        return request<CategorySchemaType>("get", API.CATEGORIES.BY_ID(id), { 
            signal 
        }).then((res) => res.data);
    },

    // Create a new category
    CREATE_CATEGORY: (data: CreateCategorySchemaType, signal?: AbortSignal) => {
        return request("post", API.CATEGORIES.ROOT, { 
            data, 
            signal 
        }).then((res) => res.data);
    },

    // Update category by ID
    UPDATE_CATEGORY: (id: string, data: UpdateCategorySchemaType, signal?: AbortSignal) => {
        return request("patch", API.CATEGORIES.BY_ID(id), { 
            data, 
            signal 
        }).then((res) => res.data);
    },

    // Delete category by ID
    DELETE_CATEGORY: (id: string, signal?: AbortSignal) => {
        return request("delete", API.CATEGORIES.BY_ID(id), { 
            signal 
        }).then((res) => res.data);
    },
};