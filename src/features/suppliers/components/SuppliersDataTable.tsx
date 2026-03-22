// import { DataTableCard } from "@/shared/components/DataTableCard";
// import { useEffect, useMemo } from "react";
// import { Button } from "@/components/ui/button";
// import { CheckCircle, Edit, Trash, XCircle } from "lucide-react";
// import { Badge } from "@/components/ui/badge";
// import {
//     CustomerSchemaType as Customer
// } from "../schemas";

// interface CategoriesDataTableProps {
//     data: any;
//     onEdit?: (category: Customer) => void;
//     onDelete?: (category: Customer) => void;
//     onToggleStatus?: (category: Customer) => void;
//     isLoading?: boolean;
// }

// export const CustomersDataTable = ({ data, onEdit, onDelete, onToggleStatus, isLoading = false }: CategoriesDataTableProps) => {
//     const count = data ? data?.data?.count : 0;
//     const categories = data ? data?.data?.rows : [];

//     const columns = useMemo(() => {
//         return [
//             {
//                 key: 'index',
//                 label: 'STT',
//                 className: 'w-[60px] text-left',
//                 render: (_: Customer, index: number) => (
//                     <span className="block">{index}</span>
//                 ),
//             },
//             {
//                 key: 'name',
//                 label: 'Tên khách hàng',
//                 className: 'min-w-[180px] text-left',
//             },
//             {
//                 key: 'description',
//                 label: 'Mô tả',
//                 className: 'min-w-[200px] text-left',
//                 render: (record: Customer) => (
//                     <span className="text-muted-foreground">
//                         {record.description || 'Không có mô tả'}
//                     </span>
//                 ),
//             },
//             {
//                 key: 'isActive',
//                 label: 'Trạng thái',
//                 className: 'w-[160px] text-left',
//                 render: (record: Customer) => (
//                     <Badge
//                         variant="outline"
//                         className={`${onToggleStatus ? "cursor-pointer hover:opacity-80 transition-opacity" : ""} whitespace-nowrap px-4 py-1 text-sm font-semibold flex items-center gap-2`}
//                         style={{
//                             backgroundColor: record.isActive ? '#10b981' : '#ef4444',
//                             color: 'white',
//                             borderColor: record.isActive ? '#10b981' : '#ef4444',
//                         }}
//                         onClick={onToggleStatus ? () => onToggleStatus(record) : undefined}
//                         onKeyDown={onToggleStatus ? (e) => {
//                             if (e.key === 'Enter' || e.key === ' ') {
//                                 e.preventDefault();
//                                 onToggleStatus(record);
//                             }
//                         } : undefined}
//                         role={onToggleStatus ? "button" : undefined}
//                         tabIndex={onToggleStatus ? 0 : undefined}
//                         title={onToggleStatus ? (record.isActive ? "Nhấn để vô hiệu hóa" : "Nhấn để kích hoạt") : undefined}
//                     >
//                         {record.isActive ? (
//                             <>
//                                 <CheckCircle className="w-3 h-3 mr-1" />
//                                 Đang hoạt động
//                             </>
//                         ) : (
//                             <>
//                                 <XCircle className="w-3 h-3 mr-1" />
//                                 Không hoạt động
//                             </>
//                         )}
//                     </Badge>
//                 )
//             },
//             {
//                 key: 'createdAt',
//                 label: 'Ngày tạo',
//                 className: 'w-[120px] text-left',
//                 render: (record: Customer) => (
//                     <span className="text-muted-foreground">
//                         {new Date(record.createdAt).toLocaleDateString('vi-VN')}
//                     </span>
//                 ),
//             },
//             {
//                 key: 'actions',
//                 label: 'Thao tác',
//                 className: 'w-[100px] text-left',
//                 render: (record: Customer) => (
//                     <div className="flex gap-2 justify-end">
//                         {onEdit && (
//                             <Button variant="outline" size="sm" onClick={() => onEdit(record)}>
//                                 <Edit size={16} />
//                             </Button>
//                         )}
//                         {onDelete && (
//                             <Button variant="outline" size="sm" onClick={() => onDelete(record)}>
//                                 <Trash size={16} />
//                             </Button>
//                         )}
//                     </div>
//                 )
//             }
//         ];
//     }, [onEdit, onDelete, onToggleStatus]);

//     return (
//         <DataTableCard
//             title="Danh sách khách hàng"
//             description="Quản lý các khách hàng trong hệ thống"
//             columns={columns}
//             data={categories}
//             isLoading={isLoading}
//             total={count}
//             filters={{
//                 page: 1,
//                 limit: 50,
//             }}
//             onFiltersChange={(filters) => {
//                 // console.log(filters);
//             }}
//             onRowClick={(record) => {
//                 // console.log(record);
//             }}
//             selectedIds={[]}
//             onSelectedIdsChange={(ids) => {
//                 // console.log(ids);
//             }}
//         />
//     );
// };