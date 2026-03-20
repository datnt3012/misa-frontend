import { API } from '@/shared/api';
import { request } from '@/shared/api/request';
import {
  CreateProductSchemaType,
  ProductFilterSchemaType,
  UpdateProductSchemaType,
  ProductSchemaType,
} from '../schemas';
import type { ProductImportJobSnapshot } from '../schemas/product.schema';

export const PRODUCT_API = {
  // ── List / Detail ──────────────────────────────────────────────────────────

  GET_PRODUCTS: (params: Partial<ProductFilterSchemaType>, signal?: AbortSignal) =>
    request<{ rows: ProductSchemaType[]; count: number; summary?: Record<string, unknown> }>(
      'get',
      API.PRODUCTS.ROOT,
      { params, signal }
    ).then((res) => res.data),

  GET_PRODUCT_BY_ID: (id: string, signal?: AbortSignal) =>
    request<ProductSchemaType>('get', API.PRODUCTS.BY_ID(id), { signal }).then((res) => res.data),

  GET_PRODUCT_BY_BARCODE: (barcode: string, signal?: AbortSignal) =>
    request<ProductSchemaType>('get', API.PRODUCTS.BY_BARCODE(barcode), { signal }).then(
      (res) => res.data
    ),

  GET_MANUFACTURERS: (signal?: AbortSignal) =>
    request<{ code: number; message: string; data: string[] }>('get', API.PRODUCTS.MANUFACTURERS, { signal }).then((res) => res.data),

  // ── CRUD ──────────────────────────────────────────────────────────────────

  CREATE_PRODUCT: (data: CreateProductSchemaType, signal?: AbortSignal) =>
    request<ProductSchemaType>('post', API.PRODUCTS.ROOT, { data, signal }).then((res) => res.data),

  UPDATE_PRODUCT: (id: string, data: UpdateProductSchemaType, signal?: AbortSignal) =>
    request<ProductSchemaType>('patch', API.PRODUCTS.BY_ID(id), { data, signal }).then(
      (res) => res.data
    ),

  DELETE_PRODUCT: (id: string, signal?: AbortSignal) =>
    request<{ message: string }>('delete', API.PRODUCTS.BY_ID(id), { signal }).then(
      (res) => res.data
    ),

  RESTORE_PRODUCT: (id: string, signal?: AbortSignal) =>
    request<ProductSchemaType>('post', API.PRODUCTS.RESTORE(id), { signal }).then(
      (res) => res.data
    ),

  // ── Export ────────────────────────────────────────────────────────────────

  EXPORT_PRODUCTS: (
    params?: { warehouse_id?: string; category?: string },
    signal?: AbortSignal
  ) =>
    request<Blob>('get', API.PRODUCTS.EXPORT, { params, signal, responseType: 'blob' }).then(
      (res) => res.data
    ),

  // ── Import (sync) ─────────────────────────────────────────────────────────

  IMPORT_EXCEL: (file: File, warehouse_id?: string, signal?: AbortSignal) => {
    const formData = new FormData();
    formData.append('file', file);
    if (warehouse_id) formData.append('warehouse_id', warehouse_id);
    return request<{
      totalRows?: number;
      imported?: number;
      failed?: number;
      errors?: Array<{ row?: number; code?: string; reason: string }>;
    }>('post', API.PRODUCTS.IMPORT_EXCEL, { data: formData, signal }).then((res) => res.data);
  },

  // ── Import (async / background job) ──────────────────────────────────────

  IMPORT_EXCEL_ASYNC: (file: File, warehouse_id?: string, signal?: AbortSignal) => {
    const formData = new FormData();
    formData.append('file', file);
    if (warehouse_id) formData.append('warehouse_id', warehouse_id);
    return request<ProductImportJobSnapshot>('post', API.PRODUCTS.IMPORT_EXCEL_ASYNC, {
      data: formData,
      signal,
    }).then((res) => res.data);
  },

  LIST_IMPORT_JOBS: (
    params?: { onlyActive?: boolean; page?: number; limit?: number },
    signal?: AbortSignal
  ) =>
    request<{ rows: ProductImportJobSnapshot[]; count: number }>(
      'get',
      API.PRODUCTS.IMPORT_STATUS,
      { params, signal }
    ).then((res) => res.data),

  GET_IMPORT_JOB_STATUS: (jobId: string, signal?: AbortSignal) =>
    request<ProductImportJobSnapshot>('get', API.PRODUCTS.IMPORT_JOB_STATUS(jobId), {
      signal,
    }).then((res) => res.data),

  CANCEL_IMPORT_JOB: (jobId: string, signal?: AbortSignal) =>
    request<ProductImportJobSnapshot>('delete', API.PRODUCTS.IMPORT_JOB_STATUS(jobId), {
      signal,
    }).then((res) => res.data),

  // ── Import template ───────────────────────────────────────────────────────

  DOWNLOAD_IMPORT_TEMPLATE: (signal?: AbortSignal) =>
    request<Blob>('get', API.PRODUCTS.IMPORT_TEMPLATE, { signal, responseType: 'blob' }).then(
      (res) => res.data
    ),
};
