import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PermissionGuard } from '@/components/PermissionGuard';
import { getErrorMessage } from '@/lib/error-utils';
import { useProductList } from '@/features/products/hooks';
import { ProductFilter } from '@/features/products/components/ProductFilter';
import { ProductPageHeader } from '@/features/products/components/ProductPageHeader';
import { ProductBulkActions } from '@/features/products/components/ProductBulkActions';
import { ProductDataTable, ProductDialogActions } from '@/features/products/components/ProductDataTable';
import { ProductFilterSchemaType, ProductSchemaType } from '@/features/products/schemas';
import { useDeleteProducts } from '@/features/products/hooks';

const ProductsPageContent: React.FC = () => {
  const location = useLocation();
  const { toast } = useToast();

  // ── Filters ────────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<ProductFilterSchemaType>({
    keyword: '',
    page: 1,
    limit: 50,
  });

  const { data, isLoading, isFetching } = useProductList(filters);
  const products = data?.rows ?? [];

  // ── Selection ──────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutateAsync: deleteProducts } = useDeleteProducts();

  // ── Scroll to top on route change ─────────────────────────────────────────
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  const handleFilterChange = (newFilters: Partial<ProductFilterSchemaType>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleBulkDelete = async () => {
    try {
      await deleteProducts(selectedIds);
      setSelectedIds([]);
      toast({ title: 'Thành công', description: `Đã xóa ${selectedIds.length} sản phẩm` });
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: getErrorMessage(error, 'Không thể xóa sản phẩm'),
        variant: 'destructive',
      });
    }
  };

  const dialogActions: ProductDialogActions = {
    openView: (product: ProductSchemaType) => {
      console.log('View product', product);
    },
    openEdit: (product: ProductSchemaType) => {
      console.log('Edit product', product);
    },
    openDelete: (product: ProductSchemaType) => {
      console.log('Delete product', product);
    },
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="w-full mx-auto space-y-6 p-4 md:p-8">
        <ProductPageHeader
          onCreateClick={() => console.log('Create product')}
          description="Theo dõi và quản lý danh sách sản phẩm của bạn."
        />

        <ProductFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          defaultExpanded={false}
        />

        <ProductBulkActions
          selectedCount={selectedIds.length}
          onDelete={handleBulkDelete}
          onClearSelection={() => setSelectedIds([])}
        />

        <Card className="shadow-premium border-none overflow-hidden">
          <CardContent className="p-0">
            <ProductDataTable
              products={products}
              isLoading={isLoading || isFetching}
              total={data?.count ?? 0}
              pagination={{ page: filters.page || 1, limit: filters.limit || 50 }}
              onPaginationChange={(p) => handleFilterChange(p)}
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
              onSort={(field) => console.log('Sort', field)}
              getSortIcon={() => null}
              dialogActions={dialogActions}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const ProductsPage = () => (
  <PermissionGuard requiredPermissions={['PRODUCTS_VIEW']}>
    <ProductsPageContent />
  </PermissionGuard>
);
