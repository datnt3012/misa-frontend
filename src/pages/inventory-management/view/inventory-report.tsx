import InventoryStock from "@/components/inventory/InventoryStock";
import { PermissionGuard } from "@/components/PermissionGuard";


const InventoryReport = (props) => {
    const { products, warehouses, canViewCostPrice } = props;

    return (
        <PermissionGuard
            requiredPermissions={['INVENTORY_VIEW', 'PRODUCTS_VIEW', 'WAREHOUSES_VIEW']}
            requireAll={true}
        >
            <InventoryStock
                products={products}
                warehouses={warehouses}
                canViewCostPrice={canViewCostPrice}
            />
        </PermissionGuard>
    );
}

export default InventoryReport;