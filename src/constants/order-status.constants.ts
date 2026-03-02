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

// Purchase order statuses (for import/purchase orders)
export const PURCHASE_ORDER_STATUSES = [
  'new',
  'pending',
  'waiting_for_goods',
  'partially_imported',
  'imported',
  'completed',
  'cancelled',
] as const;

export type PurchaseOrderStatus = typeof PURCHASE_ORDER_STATUSES[number];

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

// Vietnamese labels for purchase order statuses
export const PURCHASE_ORDER_STATUS_LABELS_VI: Record<PurchaseOrderStatus, string> = {
  new: 'Mới',
  pending: 'Chờ xử lý',
  waiting_for_goods: 'Đang chờ hàng',
  partially_imported: 'Đã nhập kho một phần',
  imported: 'Đã nhập kho',
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

// Badge variants for purchase order statuses
export const PURCHASE_ORDER_STATUS_VARIANTS: Record<PurchaseOrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  new: 'secondary',
  pending: 'secondary',
  waiting_for_goods: 'default',
  partially_imported: 'default',
  imported: 'default',
  completed: 'default',
  cancelled: 'destructive',
};

// Optional custom classes for badges (tailwind classes)
export const ORDER_STATUS_CLASSES: Partial<Record<OrderStatus, string>> = {
  new: 'bg-[#E3F2FD] text-blue-800 border-blue-100',
  pending: 'bg-[#1976D2] text-white border-blue-500',
  picking: 'bg-[#FB8C00] text-white border-orange-500',
  picked: 'bg-[#8E24AA] text-white border-purple-500',
  delivered: 'bg-[#2E7D32] text-white border-green-500',
  delivery_failed: 'bg-[#D32F2F] text-white border-red-500',
  completed: 'bg-[#1B5E20] text-white border-green-500',
  cancelled: 'bg-[#757575] text-white border-gray-500',
};

// Custom classes for purchase order statuses
export const PURCHASE_ORDER_STATUS_CLASSES: Partial<Record<PurchaseOrderStatus, string>> = {
  new: 'bg-[#E3F2FD] text-blue-800 border-blue-100',
  pending: 'bg-[#1976D2] text-white border-blue-500',
  waiting_for_goods: 'bg-[#FB8C00] text-white border-orange-500',
  partially_imported: 'bg-[#8E24AA] text-white border-purple-500',
  imported: 'bg-[#2E7D32] text-white border-green-500',
  completed: 'bg-[#1B5E20] text-white border-green-500',
  cancelled: 'bg-[#757575] text-white border-gray-500',
};

// Helper function to find status key by label (Vietnamese value)
const findStatusKeyByLabel = (label: string): OrderStatus | null => {
  for (const [key, value] of Object.entries(ORDER_STATUS_LABELS_VI)) {
    if (value === label) {
      return key as OrderStatus;
    }
  }
  return null;
};

// Helper function to find purchase status key by label (Vietnamese value)
const findPurchaseStatusKeyByLabel = (label: string): PurchaseOrderStatus | null => {
  for (const [key, value] of Object.entries(PURCHASE_ORDER_STATUS_LABELS_VI)) {
    if (value === label) {
      return key as PurchaseOrderStatus;
    }
  }
  return null;
};

// Helper function to normalize status (convert label to key if needed)
const normalizeStatus = (status: string): OrderStatus | null => {
  // First check if it's already a key
  if (ORDER_STATUSES.includes(status as OrderStatus)) {
    return status as OrderStatus;
  }
  // Then check if it's a label (value) and find the corresponding key
  const key = findStatusKeyByLabel(status);
  return key;
};

// Helper function to normalize purchase status (convert label to key if needed)
const normalizePurchaseStatus = (status: string): PurchaseOrderStatus | null => {
  // First check if it's already a key
  if (PURCHASE_ORDER_STATUSES.includes(status as PurchaseOrderStatus)) {
    return status as PurchaseOrderStatus;
  }
  // Then check if it's a label (value) and find the corresponding key
  const key = findPurchaseStatusKeyByLabel(status);
  return key;
};

// Helper function to get status config
export const getOrderStatusConfig = (status: string, isPurchaseOrder: boolean = false): { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string } => {
  if (isPurchaseOrder) {
    const normalizedStatus = normalizePurchaseStatus(status);
    
    if (normalizedStatus) {
      const className = PURCHASE_ORDER_STATUS_CLASSES[normalizedStatus];
      return {
        label: PURCHASE_ORDER_STATUS_LABELS_VI[normalizedStatus],
        variant: PURCHASE_ORDER_STATUS_VARIANTS[normalizedStatus],
        ...(className && { className }), // Only include className if it exists
      };
    }
  } else {
    const normalizedStatus = normalizeStatus(status);
    
    if (normalizedStatus) {
      const className = ORDER_STATUS_CLASSES[normalizedStatus];
      return {
        label: ORDER_STATUS_LABELS_VI[normalizedStatus],
        variant: ORDER_STATUS_VARIANTS[normalizedStatus],
        ...(className && { className }), // Only include className if it exists
      };
    }
  }
  
  // Fallback for unknown status
  return {
    label: status,
    variant: 'outline',
  };
};

// Check if a status is a valid order status
// Check both key (e.g., 'pending') and value/label (e.g., 'Chờ xử lý')
export const isValidOrderStatus = (status: string): status is OrderStatus => {
  // Check if status is a key in ORDER_STATUSES
  if (ORDER_STATUSES.includes(status as OrderStatus)) {
    return true;
  }
  // Check if status is a value (label) in ORDER_STATUS_LABELS_VI
  const statusKey = findStatusKeyByLabel(status);
  return statusKey !== null;
};

// Check if a status is a valid purchase order status
export const isValidPurchaseOrderStatus = (status: string): status is PurchaseOrderStatus => {
  // Check if status is a key in PURCHASE_ORDER_STATUSES
  if (PURCHASE_ORDER_STATUSES.includes(status as PurchaseOrderStatus)) {
    return true;
  }
  // Check if status is a value (label) in PURCHASE_ORDER_STATUS_LABELS_VI
  const statusKey = findPurchaseStatusKeyByLabel(status);
  return statusKey !== null;
};

