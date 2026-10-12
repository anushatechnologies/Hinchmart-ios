/**
 * HINCH MART — Custom TanStack Query Hooks for Products & Home
 */
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../services/api/products.api';
import { categoriesApi } from '../services/api/categories.api';

export function useHomeData() {
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const res = await categoriesApi.getCategories();
        return res ?? [];
      } catch (e) {
        return [];
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const featuredQuery = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      try {
        const res = await productsApi.getProducts();
        return res ?? [];
      } catch (e) {
        return [];
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  return {
    banners: [],
    categories: categoriesQuery.data ?? [],
    featured: featuredQuery.data ?? [],
    deals: [],
    trending: [],
    brands: [],
    isLoading: false,
    refetchAll: () => {
      categoriesQuery.refetch();
      featuredQuery.refetch();
    },
  };
}

export function useProductDetail(id: string | number) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => await productsApi.getProductDetail(id),
    enabled: !!id,
    retry: false,
  });
}
