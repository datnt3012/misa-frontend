import * as yup from 'yup';

export const CreateProductSchema = yup.object({
  name: yup.string().required('Tên sản phẩm không được để trống').defined(),
  code: yup.string().optional(),
  barcode: yup.string().optional(),
  description: yup.string().optional(),
  manufacturer: yup.string().optional(),
  categoryId: yup.string().optional(),
  unit: yup.string().optional(),
  sellingPrice: yup.number().min(0, 'Giá bán không được âm').optional(),
  costPrice: yup.number().min(0, 'Giá nhập không được âm').optional(),
  vatRate: yup.number().min(0).max(100).optional(),
  isActive: yup.boolean().optional(),
});

export const UpdateProductSchema = yup.object({
  name: yup.string().optional(),
  code: yup.string().optional(),
  barcode: yup.string().optional(),
  description: yup.string().optional(),
  manufacturer: yup.string().optional(),
  categoryId: yup.string().optional(),
  unit: yup.string().optional(),
  sellingPrice: yup.number().min(0).optional(),
  costPrice: yup.number().min(0).optional(),
  vatRate: yup.number().min(0).max(100).optional(),
  isActive: yup.boolean().optional(),
});

export const ProductSchema = yup.object({
  id: yup.string().required("ID không được để trống"),
  code: yup.string().required("Mã sản phẩm không được để trống"),
  name: yup.string().required("Tên sản phẩm không được để trống"),
  description: yup.string().optional(),
  category: yup.string().optional(),
  unit: yup.string().optional(),
  price: yup.number().optional(),
  costPrice: yup.number().optional(),
  lowStockThreshold: yup.number().optional(),
  manufacturer: yup.string().optional(),
  barcode: yup.string().optional(),
  isDeleted: yup.boolean().optional(),
  createdAt: yup.string().optional(),
  updatedAt: yup.string().optional(),
  deletedAt: yup.string().optional(),
  isForeignCurrency: yup.boolean().optional(),
  exchangeRate: yup.number().optional(),
  originalCostPrice: yup.number().optional(),
  // stockLevel: yup.array().of(ProductStockLevelSchema).optional(),
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

export type CreateProductSchemaType = yup.InferType<typeof CreateProductSchema>;
export type UpdateProductSchemaType = yup.InferType<typeof UpdateProductSchema>;
export type ProductSchemaType = yup.InferType<typeof ProductSchema>;
export type ProductStockLevelSchemaType = yup.InferType<typeof ProductStockLevelSchema>;

// ── Import job types (mirrors old productApi) ─────────────────────────────
export type ProductImportJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ProductImportError {
  row?: number;
  code?: string;
  reason: string;
}

export interface ProductImportJobSnapshot {
  jobId: string;
  status: ProductImportJobStatus;
  totalRows: number;
  processedRows: number;
  imported: number;
  failed: number;
  percent: number;
  errors: ProductImportError[];
  startedAt?: string;
  completedAt?: string;
  message?: string;
}
