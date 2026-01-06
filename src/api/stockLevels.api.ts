import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

export interface StockLevel {
  id: string;
  warehouseId: string;
  productId: string;
  quantity: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  warehouse?: {
    id: string;
    name: string;
    code: string;
    address: string;
  };
  product?: {
    id: string;
    code: string;
    name: string;
    description?: string;
    category: string;
    unit: string;
    price: number;
    costPrice?: number;
    lowStockThreshold?: number | null;
  };
}

export interface CreateStockLevelRequest {
  warehouseId: string;
  productId: string;
  quantity: number;
  isDeleted?: boolean;
}

export interface UpdateStockLevelRequest {
  warehouseId?: string;
  productId?: string;
  quantity?: number;
  isDeleted?: boolean;
}

const normalize = (row: any): StockLevel => ({
  id: row.id,
  warehouseId: row.warehouseId || row.warehouse?.id,
  productId: row.productId || row.product?.id,
  quantity: Number(row.quantity || 0),
  isDeleted: Boolean(row.isDeleted),
  createdAt: row.createdAt || row.created_at,
  updatedAt: row.updatedAt || row.updated_at,
  deletedAt: row.deletedAt || row.deleted_at,
  warehouse: row.warehouse ? {
    id: row.warehouse.id,
    name: row.warehouse.name,
    code: row.warehouse.code,
    address: row.warehouse.address,
  } : undefined,
  product: row.product ? {
    id: row.product.id,
    code: row.product.code,
    name: row.product.name,
    description: row.product.description,
    category: row.product.category,
    unit: row.product.unit,
    price: Number(row.product.price || 0),
    costPrice: Number(row.product.costPrice || row.product.cost_price || 0),
    lowStockThreshold: row.product.lowStockThreshold != null ? Number(row.product.lowStockThreshold) : null,
  } : undefined,
});

export const stockLevelsApi = {
  // Get all stock levels
  getStockLevels: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    warehouseId?: string;
    productId?: string;
    minQuantity?: number;
    maxQuantity?: number;
    includeDeleted?: boolean;
    stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  }): Promise<{ stockLevels: StockLevel[]; total: number; page: number; limit: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.search) queryParams.append('keyword', params.search);
    if (params?.warehouseId) queryParams.append('warehouseId', params.warehouseId);
    if (params?.productId) queryParams.append('productId', params.productId);
    if (params?.minQuantity) queryParams.append('minQuantity', String(params.minQuantity));
    if (params?.maxQuantity) queryParams.append('maxQuantity', String(params.maxQuantity));
    if (params?.includeDeleted) queryParams.append('includeDeleted', String(params.includeDeleted));
    if (params?.stockStatus) queryParams.append('stockStatus', params.stockStatus);

    const url = queryParams.toString()
      ? `${API_ENDPOINTS.STOCK_LEVELS.LIST}?${queryParams.toString()}`
      : API_ENDPOINTS.STOCK_LEVELS.LIST;

    const response = await api.get<any>(url);
    const data = response?.data || response;

    if (data && Array.isArray(data.rows)) {
      return {
        stockLevels: data.rows.map(normalize),
        total: Number(data.count ?? data.rows.length ?? 0),
        page: Number(data.page ?? params?.page ?? 1),
        limit: Number(data.limit ?? params?.limit ?? data.rows.length ?? 0),
      };
    }

    return {
      stockLevels: (response?.stockLevels || []).map(normalize),
      total: Number(response?.total ?? 0),
      page: Number(response?.page ?? params?.page ?? 1),
      limit: Number(response?.limit ?? params?.limit ?? 0),
    };
  },

  // Get stock level by ID
  getStockLevel: async (id: string): Promise<StockLevel> => {
    const response = await api.get<any>(API_ENDPOINTS.STOCK_LEVELS.UPDATE(id));
    return normalize(response.data || response);
  },

  // Create new stock level
  createStockLevel: async (data: CreateStockLevelRequest): Promise<StockLevel> => {
    const response = await api.post<any>(API_ENDPOINTS.STOCK_LEVELS.CREATE, data);
    return normalize(response.data || response);
  },

  // Update stock level
  updateStockLevel: async (id: string, data: UpdateStockLevelRequest): Promise<StockLevel> => {
    const response = await api.patch<any>(API_ENDPOINTS.STOCK_LEVELS.UPDATE(id), data);
    return normalize(response.data || response);
  },

  // Delete stock level
  deleteStockLevel: async (id: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(API_ENDPOINTS.STOCK_LEVELS.DELETE(id));
  },

  // Update stock level quantity (for warehouse receipt approval)
  updateStockQuantity: async (warehouseId: string, productId: string, quantity: number): Promise<StockLevel> => {
    // First, try to find existing stock level
    const existingStockLevels = await stockLevelsApi.getStockLevels({
      warehouseId,
      productId,
      limit: 1
    });

    if (existingStockLevels.stockLevels.length > 0) {
      // Update existing stock level
      const existingStock = existingStockLevels.stockLevels[0];
      const newQuantity = existingStock.quantity + quantity;
      return await stockLevelsApi.updateStockLevel(existingStock.id, {
        quantity: newQuantity
      });
    } else {
      // Create new stock level
      return await stockLevelsApi.createStockLevel({
        warehouseId,
        productId,
        quantity
      });
    }
  },
};
