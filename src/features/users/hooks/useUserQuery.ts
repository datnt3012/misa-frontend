import { useQuery } from '@tanstack/react-query';
import { UserFilterParams } from '../schemas';
import { USER_API } from '../api/user.api';

export const USER_QUERY_KEYS = {
    all: ['users'] as const,
    list: (params: UserFilterParams) => [...USER_QUERY_KEYS.all, 'list', params] as const,
    detail: (id: string) => [...USER_QUERY_KEYS.all, 'detail', id] as const,
    email: (email: string) => [...USER_QUERY_KEYS.all, 'email', email] as const,
    preferences: () => [...USER_QUERY_KEYS.all, 'preferences'] as const,
};

export const useUserList = (params: UserFilterParams) => {
    return useQuery({
        queryKey: USER_QUERY_KEYS.list(params),
        queryFn: ({ signal }) => USER_API.GET_USERS(params, signal),
        placeholderData: (prev) => prev,
        refetchInterval: 300_000,
        staleTime: 60_000,
        retry: 2,
    });
};

export const useUserById = (id: string | null) => {
    return useQuery({
        queryKey: USER_QUERY_KEYS.detail(id ?? ''),
        queryFn: ({ signal }) => USER_API.GET_USER_BY_ID(id!, signal),
        enabled: !!id,
        refetchInterval: 300_000,
        staleTime: 60_000,
        retry: 2,
    });
};

export const useUserByEmail = (email: string | null) => {
    return useQuery({
        queryKey: USER_QUERY_KEYS.email(email ?? ''),
        queryFn: ({ signal }) => USER_API.GET_USER_BY_EMAIL(email!, signal),
        enabled: !!email,
        refetchInterval: 300_000,
        staleTime: 60_000,
        retry: 2,
    });
};

export const useUserPreferences = () => {
    return useQuery({
        queryKey: USER_QUERY_KEYS.preferences(),
        queryFn: ({ signal }) => USER_API.GET_PREFERENCES({ type: 'email' }, signal),
        refetchInterval: 300_000,
        staleTime: 60_000,
        retry: 2,
    });
};
