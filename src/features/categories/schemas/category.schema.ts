import * as yup from 'yup';

export const createCategorySchema = yup.object({
  name: yup.string().trim().required('Tên danh mục không được để trống'),
  description: yup.string().trim().optional(),
});

export type CreateCategorySchemaType = yup.InferType<typeof createCategorySchema>;

export const updateCategorySchema = yup.object({
  id: yup.string().optional(),
  name: yup.string().trim().required('Tên danh mục không được để trống'),
  description: yup.string().trim().optional(),
  isActive: yup.boolean().optional(),
});

export type UpdateCategorySchemaType = yup.InferType<typeof updateCategorySchema>;


export const CategorySchema = yup.object({
  id: yup.string().required('ID không được để trống').defined(),
  name: yup.string().trim().required('Tên danh mục không được để trống'),
  description: yup.string().trim().optional(),
  isActive: yup.boolean().optional(),
  isDeleted: yup.boolean().optional(),
  createdAt: yup.date().optional(),
  updatedAt: yup.date().optional(),
  deletedAt: yup.date().optional(),
});

export type CategorySchemaType = Omit<yup.InferType<typeof CategorySchema>, 'id'> & { id: string };
