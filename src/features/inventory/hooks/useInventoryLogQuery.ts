
// export const INVENTORY_LOG_QUERY_KEYS = {
//   list: (params: Partial<Inven>) =>
//     ['orders', 'list', params] as const,
//   detail: (id: string) => ['orders', 'detail', id] as const,
//   payments: (id: string) => ['orders', 'payments', id] as const,
// };

// export const useOrderList = (params: Partial<OrderFilterSchemaType>) => {
//   return useQuery({
//     queryKey: ORDER_QUERY_KEYS.list(params),
//     queryFn: ({ signal }) => ORDER_API.GET_ORDERS(params, signal),
//     placeholderData: (prev) => prev,
//     refetchInterval: 300_000,
//     staleTime: 60_000,
//     retry: 2,
//   });
// };