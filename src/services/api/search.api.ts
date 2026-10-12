import apiClient from './client';
import { API_ENDPOINTS } from '../../constants/api';
import { ApiProduct } from '../../types/product.types';
import { extractProductsArray, normalizeApiProduct } from './products.api';

export interface SearchSuggestion {
    productId: string | number;
    title: string;
    imageUrl?: string;
    category?: string;
    price?: number;
}

export interface SearchSuggestionsResponse {
    products: SearchSuggestion[];
    categories: Array<{ categoryId: string | number; name: string }>;
    brands?: Array<{ brandId: string | number; name: string }>;
    popularSearches?: string[];
}

export const searchApi = {
    getSuggestions: async (query: string): Promise<SearchSuggestionsResponse> => {
        const response = await apiClient.get<SearchSuggestionsResponse>(API_ENDPOINTS.SEARCH.SUGGESTIONS, {
            params: { q: query },
        });
        const data = ((response.data as any)?.data || response.data) as SearchSuggestionsResponse;
        return {
            products: data?.products || [],
            categories: data?.categories || [],
            brands: data?.brands || [],
            popularSearches: data?.popularSearches || [],
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
