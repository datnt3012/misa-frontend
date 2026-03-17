import { useState, useEffect } from 'react';
import { categoriesApi } from '@/api/categories.api';
import { usersApi } from '@/api/users.api';
import { productApi } from '@/api/product.api';
import { orderApi } from '@/api/order.api';
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
    categoriesApi
      .getCategories({ page: 1, limit: 1000 })
      .then((r) => setCategories(r.categories.filter((c: any) => c.isActive)))
      .catch(() => {});

    usersApi
      .getUsers({ page: 1, limit: 1000 })
      .then((r) => setCreators(r.users || []))
      .catch(() => setCreators([]));

    productApi
      .getManufacturers()
      .then((d) => setManufacturers(d || []))
      .catch(() => setManufacturers([]));

    orderApi
      .getBanks()
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
