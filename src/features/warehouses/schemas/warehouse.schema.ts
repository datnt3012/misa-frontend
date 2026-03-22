import { AddressInfoSchema } from '@/shared/schemas';
import * as yup from 'yup';

export const CreateWarehouseSchema = yup.object({
  name: yup.string().required("Tên sản phẩm không được để trống"),
  address: yup.string().optional(),
  addressInfo: AddressInfoSchema.nullable().optional(),
  description: yup.string().optional(),
});

export const UpdateWarehouseSchema = yup.object({
});

export const WarehouseSchema = yup.object({
  id: yup.string().required("ID không được để trống"),
  code: yup.string().trim().required("Mã sản phẩm không được để trống"),
  name: yup.string().trim().required("Tên sản phẩm không được để trống"),
  address: yup.string().trim().nullable().optional(),
  addressInfo: AddressInfoSchema.nullable().optional(),
  description: yup.string().trim().nullable().optional(),
  isDeleted: yup.boolean().optional(),
  createdAt: yup.string().optional(),
  updatedAt: yup.string().optional(),
  deletedAt: yup.string().optional(),
  stockLevels: yup.array().optional(),
  warehouseReceipts: yup.array().optional(),
});

export const ProductStockLevelSchema = yup.object({
  id: yup.string().required("ID không được để trống"),
  quantity: yup.number().required("Số lượng không được để trống"),
  stockStatus: yup.string().optional(),
  warehouse: yup.object().nullable().optional(),
  isDeleted: yup.boolean().optional(),
  createdAt: yup.string().optional(),
  updatedAt: yup.string().optional(),
  deletedAt: yup.string().optional(),
});

export type CreateWarehouseSchemaType = yup.InferType<typeof CreateWarehouseSchema>;
export type UpdateWarehouseSchemaType = yup.InferType<typeof UpdateWarehouseSchema>;
export type WarehouseSchemaType = yup.InferType<typeof WarehouseSchema>;
export type ProductStockLevelSchemaType = yup.InferType<typeof ProductStockLevelSchema>;
