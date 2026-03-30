import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Eye, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { DataTable } from '@/shared/components/data-tables/DataTable';
import { formatCurrency } from '../utils/formatters';
import { ProductSchemaType } from '../schemas';

export interface ProductDialogActions {
  openView: (product: ProductSchemaType) => void;
  openEdit: (product: ProductSchemaType) => void;
  openDelete: (product: ProductSchemaType) => void;
}

interface ProductDataTableProps {
  products: ProductSchemaType[];
  isLoading: boolean;
  total: number;
  pagination: { page: number; limit: number };
  onPaginationChange: (p: { page: number; limit: number }) => void;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onSort: (field: string) => void;
  getSortIcon: (field: string) => React.ReactNode;
  dialogActions: ProductDialogActions;
}

export const ProductDataTable: React.FC<ProductDataTableProps> = ({
  products,
  isLoading,
  total,
  pagination,
  onPaginationChange,
  selectedIds,
  onSelectedIdsChange,
  onSort,
  getSortIcon,
  dialogActions,
}) => {
  const columns = [
    {
      key: 'code',
      label: (
        <button onClick={() => onSort('code')} className="flex items-center gap-1 font-medium">
          Mã SP {getSortIcon('code')}
        </button>
      ),
      render: (product: ProductSchemaType) => (
        <div className="font-mono text-sm font-medium text-blue-600 text-center whitespace-nowrap">
          {product.code || '-'}
        </div>
      ),
    },
    {
      key: 'name',
      label: (
        <button onClick={() => onSort('name')} className="flex items-center gap-1 font-medium">
          Tên sản phẩm {getSortIcon('name')}
        </button>
      ),
      render: (product: ProductSchemaType) => (
        <div className="space-y-1">
          <div className="font-medium truncate" title={product.name}>
            {product.name}
          </div>
          {product.barcode && (
            <div className="text-xs text-muted-foreground font-mono">{product.barcode}</div>
          )}
        </div>
      ),
    },
    {
      key: 'categoryName',
      label: <span className="font-medium">Danh mục</span>,
      render: (product: ProductSchemaType) => (
        <div className="text-sm text-center">{product.categoryName || '-'}</div>
      ),
    },
    {
      key: 'manufacturer',
      label: <span className="font-medium">Nhà sản xuất</span>,
      render: (product: ProductSchemaType) => (
        <div className="text-sm text-center">{product.manufacturer || '-'}</div>
      ),
    },
    {
      key: 'unit',
      label: <span className="font-medium">Đơn vị</span>,
      render: (product: ProductSchemaType) => (
        <div className="text-sm text-center">{product.unit || '-'}</div>
      ),
    },
    {
      key: 'costPrice',
      label: <span className="font-medium">Giá nhập</span>,
      render: (product: ProductSchemaType) => (
        <div className="text-sm font-medium text-center">{formatCurrency(product.costPrice)}</div>
      ),
    },
    {
      key: 'sellingPrice',
      label: <span className="font-medium">Giá bán</span>,
      render: (product: ProductSchemaType) => (
        <div className="text-sm font-semibold text-emerald-700 text-center">
          {formatCurrency(product.sellingPrice)}
        </div>
      ),
    },
    {
      key: 'stockQuantity',
      label: <span className="font-medium">Tồn kho</span>,
      render: (product: ProductSchemaType) => (
        <div className="text-sm font-medium text-center">{product.stockQuantity ?? '-'}</div>
      ),
    },
    {
      key: 'isActive',
      label: <span className="font-medium">Trạng thái</span>,
      render: (product: ProductSchemaType) => (
        <div className="text-center">
          {product.isActive !== false ? (
            <Badge className="bg-green-100 text-green-800 border-green-200">Đang kinh doanh</Badge>
          ) : (
            <Badge variant="secondary" className="bg-gray-100 text-gray-600">Ngừng kinh doanh</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: <span className="font-medium">Thao tác</span>,
      render: (product: ProductSchemaType) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
            <DropdownMenuItem
              onClick={() => dialogActions.openView(product)}
              className="cursor-pointer hover:bg-muted"
            >
              <Eye className="w-4 h-4 mr-2" />Xem chi tiết
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => dialogActions.openEdit(product)}
              className="cursor-pointer hover:bg-muted"
            >
              <Edit className="w-4 h-4 mr-2" />Chỉnh sửa
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => dialogActions.openDelete(product)}
              className="cursor-pointer hover:bg-muted text-red-600 focus:text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />Xóa sản phẩm
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={products}
      isLoading={isLoading}
      total={total}
      filters={pagination}
      onFiltersChange={onPaginationChange}
      selectedIds={selectedIds}
      onSelectedIdsChange={onSelectedIdsChange}
    />
  );
};
