import * as yup from 'yup';

// Pagination — dùng chung cho tất cả API có phân trang

export const paginationSchema = yup.object({
  keyword: yup.string().optional(),
  page: yup.number().integer().min(1).default(1),
  limit: yup.number().integer().min(1).default(10),
});

export type PaginationSchemaType = yup.InferType<typeof paginationSchema>;

export const sortParamsSchema = yup.object({
  sortBy: yup.string().optional(),
  sortOrder: yup.string().oneOf(['ASC', 'DESC', 'asc', 'desc']).optional(),
});

export type SortParams = yup.InferType<typeof sortParamsSchema>;

export const paginationMetaSchema = yup.object({
  total: yup.number().required(),
  page: yup.number().required(),
  limit: yup.number().required(),
  totalPages: yup.number().optional(),
});

export type PaginationMeta = yup.InferType<typeof paginationMetaSchema>;

export interface PaginatedResponse<T> extends PaginationMeta {
  data: T[];
}

// Dạng response backend trả về { rows, count, page, limit }
export interface BackendPaginatedResponse<T> {
  message: string;
  code: number;
  data: {
    rows: T[];
    count: number;
    page: number;
    limit: number;
    totalPage?: number;
  }
}

export interface BackendResponse<T> {
  code: number;
  message: string;
  data: T;
}

