import { PermissionGuard } from "@/components/PermissionGuard";
import ProductList from "@/components/inventory/ProductList";

const ProductManagement = (props) => {
    const { products, warehouses, canViewCostPrice, canManageProducts, loadData } = props;

    return (
        <PermissionGuard requiredPermissions={['PRODUCTS_VIEW']}>
            <ProductList
                products={products}
                warehouses={warehouses}
                canViewCostPrice={canViewCostPrice}
                canManageProducts={canManageProducts}
                onProductsUpdate={loadData}
            />
        </PermissionGuard>
    );
};
export default ProductManagement;