import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";

import { Warehouse as WarehouseIcon, Trash2, Edit, ArrowUpDown, ArrowUp, ArrowDown, Plus } from "lucide-react";

import { PermissionGuard } from "@/components/PermissionGuard";
import { warehouseApi } from "@/api";
import { convertPermissionCodesInMessage } from "@/utils/permissionMessageConverter";
import { useToast } from "@/hooks/use-toast";
import { useForm, Controller } from "react-hook-form";
import { format_form_warehouse, Warehouse, warehouseSchema } from "@/types/warehouse";
import { yupResolver } from '@hookform/resolvers/yup';
import { TextField } from "@/views/TextField/TextField";
import { TextareaCustom } from "@/views/Textarea/Textarea";

const WarehouseManagement = (props) => {
    const { canManageWarehouses } = props;
    const { toast } = useToast();

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

    const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
    const [isEditingWarehouse, setIsEditingWarehouse] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState("");
    const [warehouseSortConfig, setWarehouseSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const formFields = format_form_warehouse; // Cấu hình các trường form (mảng)

    const { handleSubmit, formState: { errors }, control } = useForm({
        resolver: yupResolver(warehouseSchema),
        defaultValues: {
            name: '',
            code: '',
            address: '',
            description: ''
        }
    });

    const sortedWarehouses = useMemo(() => {
        if (!warehouseSortConfig) return warehouses;

        return [...warehouses].sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (warehouseSortConfig.key) {
                case 'code':
                    aValue = a.code;
                    bValue = b.code;
                    break;
                case 'name':
                    aValue = a.name;
                    bValue = b.name;
                    break;
                case 'description':
                    aValue = a.description || '';
                    bValue = b.description || '';
                    break;
                case 'address':
                    aValue = a.address || '';
                    bValue = b.address || '';
                    break;
                case 'createdAt':
                    aValue = new Date(a.createdAt);
                    bValue = new Date(b.createdAt);
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) {
                return warehouseSortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return warehouseSortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [warehouses, warehouseSortConfig]);

    const getWarehouseSortIcon = (key: string) => {
        if (!warehouseSortConfig || warehouseSortConfig.key !== key) {
            return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
        }
        return warehouseSortConfig.direction === 'asc'
            ? <ArrowUp className="h-4 w-4 ml-1" />
            : <ArrowDown className="h-4 w-4 ml-1" />;
    };

    // Handle warehouse sorting
    const handleWarehouseSort = (key: string) => {
        setWarehouseSortConfig(prevConfig => {
            if (!prevConfig || prevConfig.key !== key) {
                return { key, direction: 'asc' };
            }
            if (prevConfig.direction === 'asc') {
                return { key, direction: 'desc' };
            }
            return null; // Remove sorting
        });
    };


    const createWarehouse = async () => {
        // try {
        //     const createResp: any = await warehouseApi.createWarehouse({
        //         name: newWarehouse.name,
        //         ...(newWarehouse.code && { code: newWarehouse.code }), // Only include code if provided
        //         description: newWarehouse.description,
        //         address: newWarehouse.address,
        //         // Temporarily commented - BE not ready for address components
        //         // province_code: newWarehouse.addressData.province_code,
        //         // province_name: newWarehouse.addressData.province_name,
        //         // district_code: newWarehouse.addressData.district_code,
        //         // district_name: newWarehouse.addressData.district_name,
        //         // ward_code: newWarehouse.addressData.ward_code,
        //         // ward_name: newWarehouse.addressData.ward_name,
        //         // address_detail: newWarehouse.addressData.address_detail,
        //     });

        //     toast({ title: "Thành công", description: createResp?.message || "Đã tạo kho mới" });
        //     setNewWarehouse({
        //         name: "",
        //         code: "",
        //         description: "",
        //         address: "",
        //         // Temporarily commented - BE not ready for address components
        //         // addressData: {
        //         //   province_code: '',
        //         //   province_name: '',
        //         //   district_code: '',
        //         //   district_name: '',
        //         //   ward_code: '',
        //         //   ward_name: '',
        //         //   address_detail: ''
        //         // }
        //     });
        // } catch (error: any) {
        //     toast({ title: "Lỗi", description: convertPermissionCodesInMessage(error.response?.data?.message || error.message || "Không thể tạo kho"), variant: "destructive" });
        // }
    };

    const deleteWarehouse = async (id: string) => {
        try {
            const resp = await warehouseApi.deleteWarehouse(id);

            toast({ title: "Thành công", description: resp.message || "Đã xóa kho" });
        } catch (error: any) {
            toast({ title: "Lỗi", description: convertPermissionCodesInMessage(error.response?.data?.message || error.message || "Không thể xóa kho"), variant: "destructive" });
        }
    };

    const startEditWarehouse = (warehouse: any) => {
        setEditingWarehouse(warehouse);
        // setNewWarehouse({
        //     name: warehouse.name,
        //     code: warehouse.code,
        //     description: warehouse.description || "",
        //     address: warehouse.address || "",
        //     // Temporarily commented - BE not ready for address components
        //     // addressData: {
        //     //   province_code: warehouse.province_code || '',
        //     //   province_name: warehouse.province_name || '',
        //     //   district_code: warehouse.district_code || '',
        //     //   district_name: warehouse.district_name || '',
        //     //   ward_code: warehouse.ward_code || '',
        //     //   ward_name: warehouse.ward_name || '',
        //     //   address_detail: warehouse.address_detail || ''
        //     // }
        // });
        setIsEditingWarehouse(true);
    };

    const cancelEditWarehouse = () => {
        setEditingWarehouse(null);
        // setNewWarehouse({
        //     name: "",
        //     code: "",
        //     description: "",
        //     address: "",
        //     // Temporarily commented - BE not ready for address components
        //     // addressData: {
        //     //   province_code: '',
        //     //   province_name: '',
        //     //   district_code: '',
        //     //   district_name: '',
        //     //   ward_code: '',
        //     //   ward_name: '',
        //     //   address_detail: ''
        //     // }
        // });
        setIsEditingWarehouse(false);
    };

    const updateWarehouse = async () => {
        // if (!newWarehouse.name) {
        //     toast({ title: "Lỗi", description: "Tên kho là bắt buộc", variant: "destructive" });
        //     return;
        // }

        // try {
        //     const updateResp: any = await warehouseApi.updateWarehouse(editingWarehouse.id, {
        //         name: newWarehouse.name,
        //         ...(newWarehouse.code && { code: newWarehouse.code }), // Only include code if provided
        //         description: newWarehouse.description,
        //         address: newWarehouse.address,
        //     });

        //     toast({ title: "Thành công", description: updateResp?.message || "Đã cập nhật thông tin kho" });
        //     cancelEditWarehouse();
        // } catch (error: any) {
        //     toast({ title: "Lỗi", description: convertPermissionCodesInMessage(error.response?.data?.message || error.message || "Không thể cập nhật kho"), variant: "destructive" });
        // }
    };

    const onSubmit = (data: Warehouse) => {
        console.log('✅ Warehouse data:', data);
    };


    return (
        <PermissionGuard requiredPermissions={['WAREHOUSES_VIEW']}>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <WarehouseIcon className="w-5 h-5" />
                        Quản Lý Kho
                    </CardTitle>
                    <CardDescription>Tạo và quản lý các kho hàng</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Add New Warehouse Form */}
                    {canManageWarehouses && (
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <div className="border rounded-lg p-4 bg-muted/50">
                                <h4 className="font-medium mb-4">
                                    {isEditingWarehouse ? 'Chỉnh sửa kho' : 'Thêm kho mới'}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {formFields.map((field) => {
                                        if (field.type === 'TextField') {
                                            return (
                                                <Controller
                                                    key={field.name}
                                                    name={field.name as any}
                                                    control={control}
                                                    render={({ field: { onChange, value } }) => (
                                                        <TextField
                                                            label={field.label}
                                                            name={field.name}
                                                            value={value || ''}
                                                            onChange={onChange}
                                                            error={errors[field.name as keyof typeof errors]?.message as string}
                                                            required={field.required}
                                                            placeholder={field.placeholder}
                                                            className={`col-span-${field.width}`}
                                                        />
                                                    )}
                                                />
                                            )
                                        }
                                        if (field.type === 'Textarea') {
                                            return (
                                                <Controller
                                                    key={field.name}
                                                    name={field.name as any}
                                                    control={control}
                                                    render={({ field: { onChange, value } }) => (
                                                        <TextareaCustom
                                                            label={field.label}
                                                            name={field.name}
                                                            value={value || ''}
                                                            onChange={onChange}
                                                            error={errors[field.name as keyof typeof errors]?.message as string}
                                                            required={field.required}
                                                            placeholder={field.placeholder}
                                                            className={`col-span-${field.width}`}
                                                        />
                                                    )}
                                                />
                                            )
                                        }
                                    })}
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    {isEditingWarehouse ? (
                                        <>
                                            <Button variant="outline" onClick={cancelEditWarehouse}>
                                                Hủy
                                            </Button>
                                            <Button onClick={updateWarehouse}>
                                                <Edit className="w-4 h-4 mr-2" />
                                                Cập nhật
                                            </Button>
                                        </>
                                    ) : (
                                        <Button onClick={createWarehouse}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Tạo Kho
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </form>
                    )}

                    {/* Warehouses List */}
                    <div className="rounded-md border overflow-x-auto">
                        <Table className="min-w-full">
                            <TableHeader>
                                <TableRow>
                                    <TableHead
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleWarehouseSort('code')}
                                    >
                                        Mã Kho
                                        {getWarehouseSortIcon('code')}
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleWarehouseSort('name')}
                                    >
                                        Tên Kho
                                        {getWarehouseSortIcon('name')}
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleWarehouseSort('description')}
                                    >
                                        Mô Tả
                                        {getWarehouseSortIcon('description')}
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleWarehouseSort('address')}
                                    >
                                        Địa Chỉ
                                        {getWarehouseSortIcon('address')}
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleWarehouseSort('createdAt')}
                                    >
                                        Ngày Tạo
                                        {getWarehouseSortIcon('createdAt')}
                                    </TableHead>
                                    {canManageWarehouses && <TableHead>Thao Tác</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* {sortedWarehouses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={canManageWarehouses ? 6 : 5} className="text-center py-8 text-muted-foreground">
                                            Chưa có kho nào
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedWarehouses.map((warehouse) => (
                                        <TableRow key={warehouse.id}>
                                            <TableCell className="font-medium">{warehouse.code}</TableCell>
                                            <TableCell>{warehouse.name}</TableCell>
                                            <TableCell>{warehouse.description || '-'}</TableCell>
                                            <TableCell>{warehouse.address || '-'}</TableCell>
                                            <TableCell>
                                                {new Date(warehouse.createdAt).toLocaleDateString('vi-VN')}
                                            </TableCell>
                                            {canManageWarehouses && (
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => startEditWarehouse(warehouse)}
                                                            className="text-blue-600 hover:text-blue-700"
                                                        >
                                                            <Edit className="w-4 h-4 mr-1" />
                                                            Sửa
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => deleteWarehouse(warehouse.id)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-1" />
                                                            Xóa
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                )} */}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </PermissionGuard>
    );
};
export default WarehouseManagement;