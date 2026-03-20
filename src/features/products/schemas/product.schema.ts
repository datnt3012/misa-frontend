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
  id: yup.string().required('ID không được để trống').defined(),
  name: yup.string().required('Tên sản phẩm không được để trống').defined(),
  code: yup.string().optional(),
  barcode: yup.string().optional(),
  description: yup.string().optional(),
  manufacturer: yup.string().optional(),
  categoryId: yup.string().optional(),
  categoryName: yup.string().optional(),
  unit: yup.string().optional(),
  sellingPrice: yup.number().optional(),
  costPrice: yup.number().optional(),
  vatRate: yup.number().optional(),
  stockQuantity: yup.number().optional(),
  isActive: yup.boolean().optional(),
  isDeleted: yup.boolean().optional(),
  createdAt: yup.string().optional(),
  updatedAt: yup.string().optional(),
});

export type CreateProductSchemaType = yup.InferType<typeof CreateProductSchema>;
export type UpdateProductSchemaType = yup.InferType<typeof UpdateProductSchema>;
export type ProductSchemaType = yup.InferType<typeof ProductSchema>;

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
