import { useQuery } from "@tanstack/react-query"
import { WAREHOUSE_RECEIPT_QUERY_KEY } from "../constants"
import { WarehouseReceiptFilterSchemaType } from "../schemas/filter-warehouse-receipt.schema"
import { WAREHOUSE_RECEIPT_API } from "../api/warehouse-receipt.api"

export const useWareHouseReceiptQuery = (params: WarehouseReceiptFilterSchemaType) => {
    return useQuery({
        queryKey: WAREHOUSE_RECEIPT_QUERY_KEY.list(params),
        queryFn: ({ signal }) => WAREHOUSE_RECEIPT_API.GET_WAREHOUSE_RECEIPTS(params, signal),
        placeholderData: (prev) => prev,
        refetchInterval: 300_000,
        staleTime: 60_000,
        retry: 2,
    })
}

export const useWareHouseReceiptByOrderIdQuery = (orderId: string) => {
    return useQuery({
        queryKey: WAREHOUSE_RECEIPT_QUERY_KEY.byOrderId(orderId),
        queryFn: ({ signal }) => WAREHOUSE_RECEIPT_API.GET_WAREHOUSE_RECEIPTS_BY_ORDER_ID(orderId, signal),
        placeholderData: (prev) => prev,
        refetchInterval: 300_000,
        staleTime: 60_000,
        retry: 2,
    })
}