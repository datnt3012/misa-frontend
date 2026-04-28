import { useQuery } from "@tanstack/react-query"
import { InventoryMovementFilterSchemaType } from "../schemas"
import { INVENTORY_MOVEMENT_QUERY_KEY } from "../constants";
import { INVENTORY_MOVEMENT_API } from "../api/inventory_movement.api";

export const useInventoryMovementQuery = (params: InventoryMovementFilterSchemaType) => {
    return useQuery({
        queryKey: INVENTORY_MOVEMENT_QUERY_KEY.list(params),
        queryFn: ({ signal }) => INVENTORY_MOVEMENT_API.GET_MOVEMENTS(params, signal),
        placeholderData: (prev) => prev,
        refetchInterval: 300_000,
        staleTime: 60_000,
        retry: 2,
    })
}