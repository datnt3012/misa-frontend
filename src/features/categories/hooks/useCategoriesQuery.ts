import { useQuery } from '@tanstack/react-query';
import { CATEGORIES_API } from '../categories.api';
import { CategoriesFilterParams } from '@/features/categories/schemas/filter.schema';
import { CATEGORIES_QUERY_KEY } from '../constants';

export const useCategoriesQuery = (params?: CategoriesFilterParams) =>
  useQuery({
    queryKey: [...CATEGORIES_QUERY_KEY, params],
    queryFn: ({ signal }) => CATEGORIES_API.GET_CATEGORIES(params, signal),
    refetchInterval: 300_000,
    staleTime: 60_000,
    retry: 2,
  });

export const useCategoryQuery = (id: string) =>
  useQuery({
    queryKey: [...CATEGORIES_QUERY_KEY, id],
    queryFn: ({ signal }) => CATEGORIES_API.GET_CATEGORY_BY_ID(id, signal),
    enabled: !!id,
    refetchInterval: 300_000,
    staleTime: 60_000,
    retry: 2,
  });
