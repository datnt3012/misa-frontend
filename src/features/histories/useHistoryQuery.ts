import { useQuery } from "@tanstack/react-query";
import { FilterHistorySchemaType } from "./history.schema";
import { HISTORY_API } from "./history.api";
import { HISTORIES_QUERY_KEY } from "./constants";

export const useHistoryEntityQuery = (params: FilterHistorySchemaType) => {
    return useQuery({
        queryKey: [HISTORIES_QUERY_KEY, params],
        queryFn: () => HISTORY_API.GET_HISTORY_ENTITY(params),
        enabled: !!params.entityId && !!params.entityType,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
    });
}