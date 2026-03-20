import { API } from "@/shared/api";
import { request } from "@/shared/api/request";
import { 
    CreateUserRequest, 
    EmailPreferences, 
    UpdateUserRequest, 
    User, 
    UserFilterParams, 
    UserPreferencesResponse 
} from "../schemas";

export const USER_API = {
    // Get all users with pagination and filters
    GET_USERS: (params?: UserFilterParams, signal?: AbortSignal) => {
        return request<{ code: number; message: string; data: { rows: User[]; count: number } }>("get", API.USERS.ROOT, {
            params,
            signal,
        }).then((res) => res.data);
    },

    // Create a new user
    CREATE_USER: (data: CreateUserRequest) => {
        return request<User>("post", API.USERS.ROOT, {
            data,
        }).then((res) => res.data);
    },

    // Get user by email
    GET_USER_BY_EMAIL: (email: string, signal?: AbortSignal) => {
        return request<User>("get", API.USERS.BY_EMAIL(email), {
            signal,
        }).then((res) => res.data);
    },

    // Get preferences of the authenticated user
    GET_PREFERENCES: (params?: { type?: string }, signal?: AbortSignal) => {
        return request<UserPreferencesResponse>("get", API.USERS.GET_PREFERENCES, {
            params,
            signal,
        }).then((res) => res.data);
    },

    // Change email preferences of the authenticated user
    UPDATE_EMAIL_PREFERENCES: (data: EmailPreferences) => {
        return request<{ message: string }>("patch", API.USERS.EMAIL_PREFERENCES, {
            data,
        }).then((res) => res.data);
    },

    // Get user by ID
    GET_USER_BY_ID: (id: string, signal?: AbortSignal) => {
        return request<User>("get", API.USERS.BY_ID(id), {
            signal,
        }).then((res) => res.data);
    },

    // Update user by ID
    UPDATE_USER: (id: string, data: UpdateUserRequest) => {
        return request<User>("patch", API.USERS.BY_ID(id), {
            data,
        }).then((res) => res.data);
    },

    // Delete user by ID
    DELETE_USER: (id: string) => {
        return request<{ message: string }>("delete", API.USERS.BY_ID(id))
            .then((res) => res.data);
    },

    // Restore deleted user
    RESTORE_USER: (id: string) => {
        return request<User>("post", API.USERS.RESTORE(id))
            .then((res) => res.data);
    },
};
