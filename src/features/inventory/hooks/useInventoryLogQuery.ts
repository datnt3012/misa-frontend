import { useQuery } from "@tanstack/react-query"
import { InventoryLogFilterSchemaType } from "../schemas"
import { WAREHOUSE_RECEIPT_STATUS_LOG_API } from '../api/status-log.api';
import { INVENTORY_LOG_QUERY_KEY } from "../constants";

export const useStatusLogsQuery = (params: InventoryLogFilterSchemaType) => {
    return useQuery({
        queryKey: INVENTORY_LOG_QUERY_KEY.list(params),
        queryFn: ({ signal }) => WAREHOUSE_RECEIPT_STATUS_LOG_API.GET_STATUS_LOGS(params, signal),
        placeholderData: (prev) => prev,
        refetchInterval: 300_000,
        staleTime: 60_000,
        retry: 2,
    })
}