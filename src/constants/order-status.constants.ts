// Order status constants matching backend
export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'picked',
  'shipped',
  'delivered',
  'cancelled',
  'completed',
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

// Vietnamese labels for order statuses (matching backend ORDER_STATUS_LABELS_VI)
export const ORDER_STATUS_LABELS_VI: Record<OrderStatus, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  picked: 'Đã lấy hàng',
  shipped: 'Đã giao',
  delivered: 'Đã nhận',
  cancelled: 'Đã hủy',
  completed: 'Đã hoàn thành',
};

// Badge variants for each status
export const ORDER_STATUS_VARIANTS: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: 'secondary',
  confirmed: 'default',
  processing: 'default',
  picked: 'default',
  shipped: 'default',
  delivered: 'default',
  cancelled: 'destructive',
  completed: 'default',
};

// Helper function to get status config
export const getOrderStatusConfig = (status: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
  const orderStatus = status as OrderStatus;
  if (ORDER_STATUSES.includes(orderStatus)) {
    return {
      label: ORDER_STATUS_LABELS_VI[orderStatus],
      variant: ORDER_STATUS_VARIANTS[orderStatus],
    };
  }
  return {
    label: status,
    variant: 'outline',
  };
};

// Check if a status is a valid order status
export const isValidOrderStatus = (status: string): status is OrderStatus => {
  return ORDER_STATUSES.includes(status as OrderStatus);
};

