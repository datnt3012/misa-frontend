import { API } from '@/shared/api';
import { request } from '@/shared/api/request';
import {
  CreateWarehouseSchemaType,
  WarehouseFilterSchemaType,
  UpdateWarehouseSchemaType,
  WarehouseSchemaType,
} from '../schemas';
import { BackendPaginatedResponse } from '@/shared/schemas';

export const WAREHOUSE_API = {
  // ── List / Detail ──────────────────────────────────────────────────────────

  GET_WAREHOUSES: (params: Partial<WarehouseFilterSchemaType>, signal?: AbortSignal) =>
    request<BackendPaginatedResponse<WarehouseSchemaType>>(
      'get',
      API.WAREHOUSES.ROOT,
      { params, signal }
    ).then((res) => res.data),

  GET_WAREHOUSE_BY_ID: (id: string, signal?: AbortSignal) =>
    request<WarehouseSchemaType>('get', API.WAREHOUSES.BY_ID(id), { signal }).then((res) => res.data),

  CREATE_WAREHOUSE: (data: CreateWarehouseSchemaType, signal?: AbortSignal) =>
    request<WarehouseSchemaType>('post', API.WAREHOUSES.ROOT, { data, signal }).then((res) => res.data),

  UPDATE_WAREHOUSE: (id: string, data: UpdateWarehouseSchemaType, signal?: AbortSignal) =>
    request<WarehouseSchemaType>('patch', API.WAREHOUSES.BY_ID(id), { data, signal }).then(
      (res) => res.data
    ),

  DELETE_WAREHOUSE: (id: string, signal?: AbortSignal) =>
    request<{ message: string }>('delete', API.WAREHOUSES.BY_ID(id), { signal }).then(
      (res) => res.data
    ),

  RESTORE_WAREHOUSE: (id: string, signal?: AbortSignal) =>
    request<WarehouseSchemaType>('post', API.WAREHOUSES.RESTORE(id), { signal }).then(
      (res) => res.data
    ),
};
