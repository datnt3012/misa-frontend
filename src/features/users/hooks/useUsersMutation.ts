import { useMutation, useQueryClient } from '@tanstack/react-query';
import { USER_API } from '../api/user.api';
import { USER_QUERY_KEYS } from './useUserQuery';
import { CreateUserRequest, EmailPreferences, UpdateUserRequest } from '../schemas';

export const useUsersMutation = () => {
    const queryClient = useQueryClient();

    const createUser = useMutation({
        mutationFn: (data: CreateUserRequest) => USER_API.CREATE_USER(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
        },
    });

    const updateUser = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) => 
            USER_API.UPDATE_USER(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
            queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.detail(id) });
        },
    });

    const deleteUser = useMutation({
        mutationFn: (id: string) => USER_API.DELETE_USER(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
        },
    });

    const restoreUser = useMutation({
        mutationFn: (id: string) => USER_API.RESTORE_USER(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
        },
    });

    const updateEmailPreferences = useMutation({
        mutationFn: (data: EmailPreferences) => USER_API.UPDATE_EMAIL_PREFERENCES(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.preferences() });
        },
    });

    return {
        createUser,
        updateUser,
        deleteUser,
        restoreUser,
        updateEmailPreferences,
    };
};
