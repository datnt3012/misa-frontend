import { useState, useEffect } from 'react';
import { CATEGORIES_API } from '@/features/categories/categories.api';
import { USER_API } from '@/features/users';
import { productApi } from '@/api/product.api';
import { ORDER_API } from '../api/order.api';
import { orderTagsApi, OrderTag as ApiOrderTag } from '@/api/orderTags.api';
import { useToast } from '@/hooks/use-toast';

export const useOrderCatalogs = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [banks, setBanks] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [availableTags, setAvailableTags] = useState<ApiOrderTag[]>([]);

  const refreshTags = () =>
    orderTagsApi.getAllTags({ type: 'order' }).then(setAvailableTags).catch(() => {});

  useEffect(() => {
    CATEGORIES_API.GET_CATEGORIES({ page: 1, limit: 1000 })
      .then((r) => setCategories((r.rows || []).filter((c: any) => c.isActive)))
      .catch(() => {});

    USER_API.GET_USERS({ page: 1, limit: 1000 })
      .then((r) => setCreators(r.rows || []))
      .catch(() => setCreators([]));

    productApi
      .getManufacturers()
      .then((d) => setManufacturers(d || []))
      .catch(() => setManufacturers([]));

    ORDER_API.GET_BANKS()
      .then((d) => setBanks(d || []))
      .catch(() => setBanks([]));

    orderTagsApi
      .getAllTags({ type: 'order' })
      .then(setAvailableTags)
      .catch(() =>
        toast({ title: 'Lỗi', description: 'Không thể tải danh sách nhãn', variant: 'destructive' })
      );
  }, []);

  return { categories, creators, manufacturers, banks, availableTags, refreshTags };
};

export type OrderCatalogsReturn = ReturnType<typeof useOrderCatalogs>;
