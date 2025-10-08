import { format } from 'date-fns';
import * as Yup from 'yup';

export interface Warehouse {
    id: string;
    code: string;
    name: string;
    address: string;
    description?: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    stockLevels?: any;
    warehouseReceipts?: any;
}

export const format_table_warehouse = [
    { name: 'code', label: 'Mã kho', type: 'text', width: '20%' },
    { name: 'name', label: 'Tên kho', type: 'text', width: '25%' },
    { name: 'address', label: 'Địa chỉ', type: 'text', width: '30%' },
    { name: 'createdAt', label: 'Ngày tạo', type: 'date', width: '25%', format: (date: Date) => format(new Date(date), 'dd/MM/yyyy') },
];

export const format_form_warehouse = [
    { name: 'name', label: 'Tên kho', placeholder: 'Nhập tên kho', type: 'TextField', data: [], required: true, width: 6 },
    { name: 'code', label: 'Mã kho', placeholder: 'Nhập mã kho', type: 'TextField', data: [], required: false, width: 6 },
    { name: 'address', label: 'Địa chỉ', placeholder: 'Nhập địa chỉ', type: 'TextField', data: [], required: true, width: 12 },
    { name: 'description', label: 'Mô tả', placeholder: 'Nhập mô tả', type: 'Textarea', data: [], required: false, width: 12 },
];

export const warehouseSchema = Yup.object().shape({
    name: Yup.string()
        .required('Tên kho là bắt buộc')
        .min(6, 'Tên kho phải có ít nhất 6 ký tự')
        .max(50, 'Tên kho không được vượt quá 50 ký tự'),
    code: Yup.string()
        .min(3, 'Mã kho phải có ít nhất 3 ký tự')
        .max(10, 'Mã kho không được vượt quá 10 ký tự'),
    address: Yup.string()
        .required('Địa chỉ là bắt buộc')
        .min(6, 'Địa chỉ phải có ít nhất 6 ký tự')
        .max(100, 'Địa chỉ không được vượt quá 100 ký tự'),
    description: Yup.string()
        .max(200, 'Mô tả không được vượt quá 200 ký tự'),
});