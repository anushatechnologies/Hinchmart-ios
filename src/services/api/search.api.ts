import apiClient from './client';
import { API_ENDPOINTS } from '../../constants/api';
import { ApiProduct } from '../../types/product.types';
import { extractProductsArray, normalizeApiProduct } from './products.api';

export interface SearchSuggestion {
    productId?: string | number;
    title: string;
    imageUrl?: string;
    category?: string;
    price?: number;
}

export interface SearchCategorySuggestion {
    id?: string | number;
    categoryId?: string | number;
    name: string;
    slug?: string;
}

export interface SearchBrandSuggestion {
    id?: string | number;
    brandId?: string | number;
    name: string;
}

export interface SearchSuggestionsResponse {
    query?: string;
    suggestions: string[];
    products: SearchSuggestion[];
    categories: SearchCategorySuggestion[];
    brands: SearchBrandSuggestion[];
    popularSearches: string[];
}

export const searchApi = {
    getSuggestions: async (query: string): Promise<SearchSuggestionsResponse> => {
        const response = await apiClient.get<any>(API_ENDPOINTS.SEARCH.SUGGESTIONS, {
            params: { q: query },
        });
        const data = ((response.data as any)?.data || response.data) || {};

        const rawSuggestions: any[] = Array.isArray(data?.suggestions) ? data.suggestions : [];
        const rawProducts: any[] = Array.isArray(data?.products) ? data.products : [];

        // Support string suggestions from specification, while generating products list if strings
        const textSuggestions: string[] = rawSuggestions.map((item) =>
            typeof item === 'string' ? item : item?.title || item?.name || ''
        ).filter(Boolean);

        const mappedProducts: SearchSuggestion[] = rawProducts.length > 0
            ? rawProducts
            : rawSuggestions.map((item, idx) => {
                if (typeof item === 'string') {
                    return { productId: idx + 1, title: item };
                }
                return {
                    productId: item?.productId || item?.id || idx + 1,
                    title: item?.title || item?.name || '',
                    imageUrl: item?.imageUrl || item?.image,
                    category: item?.category,
                    price: item?.price,
                };
            });

        const categories: SearchCategorySuggestion[] = Array.isArray(data?.categories)
            ? data.categories.map((c: any) => ({
                id: c.id ?? c.categoryId,
                categoryId: c.categoryId ?? c.id,
                name: c.name || '',
                slug: c.slug || '',
            }))
            : [];

        const brands: SearchBrandSuggestion[] = Array.isArray(data?.brands)
            ? data.brands.map((b: any) => ({
                id: b.id ?? b.brandId,
                brandId: b.brandId ?? b.id,
                name: b.name || '',
            }))
            : [];

        return {
            query: data?.query || query,
            suggestions: textSuggestions.length > 0 ? textSuggestions : mappedProducts.map((p) => p.title),
            products: mappedProducts,
            categories,
            brands,
            popularSearches: data?.popularSearches || textSuggestions,
        };
    },

    searchProducts: async (query: string): Promise<ApiProduct[]> => {
        const response = await apiClient.get<ApiProduct[] | { data: ApiProduct[] }>(API_ENDPOINTS.SEARCH.PRODUCTS, {
            params: { search: query, limit: 100 },
        });
        const rawList = extractProductsArray(response.data);
        return rawList.map((p, idx) => normalizeApiProduct(p, idx));
    },
};
