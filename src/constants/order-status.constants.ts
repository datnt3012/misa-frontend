// Order status constants matching backend
export const ORDER_STATUSES = [
  'new',
  'pending',
  'picking',
  'picked',
  'delivered',
  'delivery_failed',
  'completed',
  'cancelled',
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

// Vietnamese labels for order statuses (matching backend ORDER_STATUS_LABELS_VI)
export const ORDER_STATUS_LABELS_VI: Record<OrderStatus, string> = {
  new: 'Mới',
  pending: 'Chờ xử lý',
  picking: 'Đang lấy hàng',
  picked: 'Đã lấy hàng',
  delivered: 'Đã giao hàng',
  delivery_failed: 'Giao hàng thất bại',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

// Badge variants for each status
export const ORDER_STATUS_VARIANTS: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  new: 'secondary',
  pending: 'secondary',
  picking: 'default',
  picked: 'default',
  delivered: 'default',
  delivery_failed: 'destructive',
  completed: 'default',
  cancelled: 'destructive',
};

// Optional custom classes for badges (tailwind classes)
export const ORDER_STATUS_CLASSES: Partial<Record<OrderStatus, string>> = {
  completed: 'bg-green-100 text-green-800 border border-green-200 hover:bg-green-100 hover:text-green-800',
};

// Helper function to get status config
export const getOrderStatusConfig = (status: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string } => {
  const orderStatus = status as OrderStatus;
  if (ORDER_STATUSES.includes(orderStatus)) {
    return {
      label: ORDER_STATUS_LABELS_VI[orderStatus],
      variant: ORDER_STATUS_VARIANTS[orderStatus],
      className: ORDER_STATUS_CLASSES[orderStatus],
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

