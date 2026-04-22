export const WARRANTY_STATUSES = ['new', 'received', 'in_progress', 'completed', 'cancelled'] as const;

export type WarrantyStatus = typeof WARRANTY_STATUSES[number];

export const WARRANTY_STATUS_NAMES: Record<WarrantyStatus, string> = {
  new: "Mới",
  received: "Đã tiếp nhận",
  in_progress: "Đang xử lý",
  completed: "Hoàn thành",
  cancelled: "Hủy",
};

export const WARRANTY_STATUS_COLORS: Record<WarrantyStatus, string> = {
  new: "bg-gray-100 text-gray-800",
  received: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};