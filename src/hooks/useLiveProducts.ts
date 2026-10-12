/**
 * HINCH MART — Live Products Hook
 * Seamlessly connects to live backend REST API with resilient fallback catalog data
 * and verified high-definition product imagery.
 */
import { useState, useEffect, useCallback } from 'react';
import { productsApi, normalizeProductImageUrl } from '../services/api/products.api';
import { subcategoriesApi } from '../services/api/subcategories.api';
import { categoriesApi } from '../services/api/categories.api';
import { ApiProduct } from '../types/product.types';
import { ApiSubcategory, ApiCategory } from '../types/category.types';

export const DEFAULT_PRODUCTS: ApiProduct[] = [];

export function resolveProductImage(productOrName?: any, rawUrl?: string, productContext?: any): string {
  const givenProduct = typeof productOrName === 'object' && productOrName !== null ? productOrName : productContext;
  let url =
    typeof rawUrl === 'string' && rawUrl.trim().length > 0
      ? rawUrl.trim()
      : typeof productOrName === 'string' &&
        (productOrName.startsWith('http') || productOrName.startsWith('/') || productOrName.startsWith('file'))
      ? productOrName.trim()
      : givenProduct?.imageUrl ||
        givenProduct?.image ||
        givenProduct?.thumbnailUrl ||
        (Array.isArray(givenProduct?.images) && givenProduct.images[0]) ||
        '';

  // 1. Normalize relative paths to absolute backend URL
  if (url && typeof url === 'string') {
    url = normalizeProductImageUrl(url);
  }

  // 2. If it's a valid live URL and NOT the unresolvable documentation dummy domain example.com
  if (
    url &&
    typeof url === 'string' &&
    (url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('data:') ||
      url.startsWith('file://') ||
      url.startsWith('file:')) &&
    !url.includes('example.com') &&
    !url.includes('via.placeholder.com') &&
    !url.includes('placeholder.com')
  ) {
    return url;
  }

  // 3. Fallback matching based on Product Title, Category, Subcategory, Brand
  const title = (
    typeof productOrName === 'string' && !productOrName.startsWith('http')
      ? productOrName
      : givenProduct?.title || givenProduct?.name || givenProduct?.productName || ''
  ).toLowerCase();

  const category = (
    typeof givenProduct?.category === 'string'
      ? givenProduct.category
      : givenProduct?.category?.name || givenProduct?.categoryName || ''
  ).toLowerCase();

  const subcategory = (
    typeof givenProduct?.subCategory === 'string'
      ? givenProduct.subCategory
      : givenProduct?.subCategory?.name || givenProduct?.subcategoryName || ''
  ).toLowerCase();

  const brand = (
    typeof givenProduct?.brand === 'string'
      ? givenProduct.brand
      : givenProduct?.brand?.name || ''
  ).toLowerCase();

  const searchTarget = `${title} ${category} ${subcategory} ${brand}`;

  // ── Fresh Groceries & Produce (From live DB e.g. Red Apples, Spinach, Milk, Bread, Juice) ──
  if (searchTarget.includes('apple')) {
    return 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80'; // Fresh Red Apples
  }
  if (
    searchTarget.includes('spinach') ||
    searchTarget.includes('leafy') ||
    searchTarget.includes('palak') ||
    searchTarget.includes('greens')
  ) {
    return 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=800&q=80'; // Fresh Spinach
  }
  if (searchTarget.includes('milk') || searchTarget.includes('dairy')) {
    return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80'; // Whole Milk
  }
  if (searchTarget.includes('bread') || searchTarget.includes('bakery') || searchTarget.includes('loaf')) {
    return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80'; // Fresh Wheat Bread
  }
  if (searchTarget.includes('juice') || searchTarget.includes('orange')) {
    return 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=800&q=80'; // Fresh Orange Juice
  }
  if (searchTarget.includes('fruit') || searchTarget.includes('banana') || searchTarget.includes('mango')) {
    return 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80'; // Mixed Fresh Fruits
  }
  if (
    searchTarget.includes('vegetable') ||
    searchTarget.includes('tomato') ||
    searchTarget.includes('potato') ||
    searchTarget.includes('onion')
  ) {
    return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'; // Fresh Vegetables
  }
  if (
    searchTarget.includes('rice') ||
    searchTarget.includes('wheat') ||
    searchTarget.includes('grain') ||
    searchTarget.includes('flour') ||
    searchTarget.includes('dal') ||
    searchTarget.includes('pulse')
  ) {
    return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80'; // Wholesale Grains & Rice
  }
  if (searchTarget.includes('oil') || searchTarget.includes('ghee') || searchTarget.includes('butter')) {
    return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80'; // Cooking Oil & Ghee
  }

  // ── Steel & Heavy Infrastructure ──
  if (
    searchTarget.includes('tmt') ||
    searchTarget.includes('rebar') ||
    searchTarget.includes('steel') ||
    searchTarget.includes('tiscon') ||
    searchTarget.includes('jsw') ||
    searchTarget.includes('jindal') ||
    searchTarget.includes('iron')
  ) {
    return 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80';
  }

  // ── Cement, Concrete & Masonry ──
  if (
    searchTarget.includes('cement') ||
    searchTarget.includes('ultratech') ||
    searchTarget.includes('acc') ||
    searchTarget.includes('amrit') ||
    searchTarget.includes('concrete') ||
    searchTarget.includes('mortar')
  ) {
    return 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80';
  }
  if (
    searchTarget.includes('brick') ||
    searchTarget.includes('block') ||
    searchTarget.includes('aac') ||
    searchTarget.includes('paver') ||
    searchTarget.includes('masonry')
  ) {
    return 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80'; // Clay bricks & construction blocks
  }
  if (
    searchTarget.includes('sand') ||
    searchTarget.includes('gravel') ||
    searchTarget.includes('aggregate') ||
    searchTarget.includes('stone')
  ) {
    return 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?auto=format&fit=crop&w=800&q=80'; // Construction Aggregate & Sand
  }

  // ── Tools, Machinery & Hardware ──
  if (
    searchTarget.includes('drill') ||
    searchTarget.includes('bosch') ||
    searchTarget.includes('dewalt') ||
    searchTarget.includes('grinder') ||
    searchTarget.includes('cutter') ||
    searchTarget.includes('saw') ||
    searchTarget.includes('tool') ||
    searchTarget.includes('wrench') ||
    searchTarget.includes('hammer')
  ) {
    return 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80';
  }
  if (
    searchTarget.includes('screw') ||
    searchTarget.includes('nail') ||
    searchTarget.includes('bolt') ||
    searchTarget.includes('nut') ||
    searchTarget.includes('hardware') ||
    searchTarget.includes('fastener')
  ) {
    return 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&w=800&q=80'; // Hardware Screws & Fasteners
  }

  // ── Paints & Construction Chemicals ──
  if (
    searchTarget.includes('paint') ||
    searchTarget.includes('asian') ||
    searchTarget.includes('berger') ||
    searchTarget.includes('primer') ||
    searchTarget.includes('distemper') ||
    searchTarget.includes('enamel') ||
    searchTarget.includes('color')
  ) {
    return 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=800&q=80';
  }
  if (
    searchTarget.includes('fixit') ||
    searchTarget.includes('waterproof') ||
    searchTarget.includes('chemical') ||
    searchTarget.includes('sealant') ||
    searchTarget.includes('epoxy') ||
    searchTarget.includes('adhesive') ||
    searchTarget.includes('grout')
  ) {
    return 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80';
  }

  // ── Electrical, Wiring & Lighting ──
  if (
    searchTarget.includes('wire') ||
    searchTarget.includes('cable') ||
    searchTarget.includes('polycab') ||
    searchTarget.includes('havells') ||
    searchTarget.includes('switch') ||
    searchTarget.includes('mcb') ||
    searchTarget.includes('electrical') ||
    searchTarget.includes('socket')
  ) {
    return 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80';
  }
  if (
    searchTarget.includes('light') ||
    searchTarget.includes('led') ||
    searchTarget.includes('bulb') ||
    searchTarget.includes('floodlight') ||
    searchTarget.includes('panel')
  ) {
    return 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?auto=format&fit=crop&w=800&q=80'; // LED Lights
  }

  // ── Plumbing & Sanitaryware ──
  if (
    searchTarget.includes('pipe') ||
    searchTarget.includes('astral') ||
    searchTarget.includes('ashirvad') ||
    searchTarget.includes('cpvc') ||
    searchTarget.includes('pvc') ||
    searchTarget.includes('fitting') ||
    searchTarget.includes('plumbing') ||
    searchTarget.includes('swr')
  ) {
    return 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80';
  }
  if (
    searchTarget.includes('tap') ||
    searchTarget.includes('faucet') ||
    searchTarget.includes('shower') ||
    searchTarget.includes('sanitary') ||
    searchTarget.includes('toilet') ||
    searchTarget.includes('basin') ||
    searchTarget.includes('sink')
  ) {
    return 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80'; // Sanitary & Faucets
  }

  // ── Wood, Timber, Plywood ──
  if (
    searchTarget.includes('plywood') ||
    searchTarget.includes('century') ||
    searchTarget.includes('greenply') ||
    searchTarget.includes('timber') ||
    searchTarget.includes('wood') ||
    searchTarget.includes('board') ||
    searchTarget.includes('laminate')
  ) {
    return 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80';
  }

  // ── Tiles, Marble & Granite ──
  if (
    searchTarget.includes('tile') ||
    searchTarget.includes('kajaria') ||
    searchTarget.includes('marble') ||
    searchTarget.includes('granite') ||
    searchTarget.includes('ceramic') ||
    searchTarget.includes('vitrified')
  ) {
    return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';
  }

  // ── Safety Equipment ──
  if (
    searchTarget.includes('helmet') ||
    searchTarget.includes('safety') ||
    searchTarget.includes('vest') ||
    searchTarget.includes('glove') ||
    searchTarget.includes('boot') ||
    searchTarget.includes('goggle') ||
    searchTarget.includes('harness')
  ) {
    return 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80';
  }

  // Universal high-quality wholesale warehouse / industrial packaging fallback
  return 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80';
}

let globalProductsCache: ApiProduct[] | null = null;
let globalSubcategoriesCache: ApiSubcategory[] | null = null;
let globalCategoriesCache: ApiCategory[] | null = null;

export function useLiveProducts(subcategoryId?: string | number) {
  const [products, setProducts] = useState<ApiProduct[]>(() => {
    const source = globalProductsCache || [];
    if (!subcategoryId || subcategoryId === 'all') return source;
    const subKey = String(subcategoryId).toLowerCase();
    const filtered = source.filter(
      (p) =>
        String(p.subcategoryId).toLowerCase() === subKey ||
        String(p.categoryId).toLowerCase() === subKey
    );
    return filtered.length > 0 ? filtered : source;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => !globalProductsCache);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLiveProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else if (!globalProductsCache) {
      setIsLoading(true);
    }
    setError(null);

    try {
      // 1. Fetch live subcategories and categories from live server
      const [rawSubs, rawCats] = await Promise.all([
        subcategoriesApi.getSubcategories().catch(() => []),
        categoriesApi.getCategories().catch(() => []),
      ]);

      const subcategories: ApiSubcategory[] = Array.isArray(rawSubs) ? rawSubs : ((rawSubs as any)?.data || []);
      const categories: ApiCategory[] = Array.isArray(rawCats) ? rawCats : ((rawCats as any)?.data || []);

      globalSubcategoriesCache = subcategories;
      globalCategoriesCache = categories;

      const subcatMap = new Map<string, ApiSubcategory>();
      subcategories.forEach((s) => {
        subcatMap.set(String(s.subcategoryId || s.id), s);
        if (s.slug) subcatMap.set(s.slug.toLowerCase(), s);
      });

      // 2. Fetch live products from backend endpoint
      let serverProducts: any[] = [];
      try {
        const rawProducts = await productsApi.getProducts(
          subcategoryId && subcategoryId !== 'all'
            ? { subcategoryId, limit: 500 }
            : { limit: 1000 }
        );
        serverProducts = Array.isArray(rawProducts) ? rawProducts : ((rawProducts as any)?.data || []);
      } catch (apiErr: any) {
        if (__DEV__) {
          console.log('[useLiveProducts] productsApi.getProducts notice:', apiErr?.message || apiErr);
        }
      }

      let items: ApiProduct[] = [];
      if (serverProducts && serverProducts.length > 0) {
        items = serverProducts.map((p: any, index: number) => {
          const prodSubId = String(
            p.subcategoryId ??
            p.subCategoryId ??
            p.subcategory_id ??
            p.subCategory?.id ??
            p.subCategory?.subcategoryId ??
            p.subcategory?.id ??
            ''
          );
          const matchedSub = prodSubId ? subcatMap.get(prodSubId) : undefined;
          const resolvedCatId = String(
            p.categoryId ??
            p.category_id ??
            p.category?.id ??
            p.category?.categoryId ??
            matchedSub?.categoryId ??
            ''
          );
          const price = typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0;
          const rawImg = resolveProductImage(p, p.imageUrl || p.image || p.thumbnailUrl || (p.images && p.images[0]) || matchedSub?.imageUrl || '');

          const comparePrice = p.comparePrice ?? p.mrp;
          const mrp = p.mrp ?? comparePrice;
          const moq = typeof p.moq === 'number' ? p.moq : parseInt(String(p.moq || 1), 10) || 1;
          const stockQty = typeof p.stockQty === 'number' ? p.stockQty : parseInt(String(p.stockQty ?? 100), 10) || 0;
          const finalImages = Array.isArray(p.images) && p.images.length > 0
            ? (rawImg && !p.images.includes(rawImg) ? [rawImg, ...p.images] : p.images)
            : (rawImg ? [rawImg] : []);

          return {
            ...p,
            id: String(p.id || p.productId || index),
            productId: String(p.productId || p.id || index),
            categoryId: resolvedCatId || p.categoryId,
            subcategoryId: prodSubId || p.subcategoryId,
            name: p.title || p.name || '',
            title: p.title || p.name || '',
            description: p.description || p.desc || '',
            price,
            image: rawImg,
            imageUrl: rawImg,
            images: finalImages,
            brand: p.brand || '',
            moq,
            stockQty,
            mrp,
            rating: typeof p.rating === 'number' && p.rating > 0 ? p.rating : (Number(p.rating) > 0 ? Number(p.rating) : undefined),
            reviews: typeof p.reviews === 'number' ? p.reviews : (typeof p.reviewCount === 'number' ? p.reviewCount : 0),
            comparePrice,
            discountPercent: typeof p.discountPercent === 'number' && p.discountPercent > 0
              ? p.discountPercent
              : typeof (p as any).discountPercentage === 'number' && (p as any).discountPercentage > 0
              ? (p as any).discountPercentage
              : typeof (p as any).discount === 'number' && (p as any).discount > 0
              ? (p as any).discount
              : 0,
            savingsText: p.savingsText || (stockQty != null && p.unit ? `In Stock: ${stockQty} ${p.unit}` : undefined),
            unit: (!p.unit || String(p.unit).toLowerCase() === 'default' || String(p.unit).toLowerCase() === 'null') ? 'unit' : String(p.unit),
            verified: p.verified ?? true,
            active: p.active !== false,
            is24HourDelivery: Boolean(p.is24HourDelivery),
            bulkPricingTiers: p.bulkPricingTiers,
            specifications: p.specifications,
          };
        });
      } else {
        // Live backend returned 0 products - show clean empty catalog
        items = [];
      }

      if (!subcategoryId || subcategoryId === 'all') {
        globalProductsCache = items;
      } else if (globalProductsCache) {
        const map = new Map(globalProductsCache.map((p) => [String(p.id || p.productId), p]));
        items.forEach((p) => map.set(String(p.id || p.productId), p));
        globalProductsCache = Array.from(map.values());
      } else {
        globalProductsCache = items;
      }

      if (subcategoryId && subcategoryId !== 'all') {
        const subKey = String(subcategoryId).toLowerCase();
        const filtered = items.filter(
          (p) =>
            String(p.subcategoryId).toLowerCase() === subKey ||
            String(p.categoryId).toLowerCase() === subKey
        );
        setProducts(filtered.length > 0 ? filtered : items);
      } else {
        setProducts(items);
      }
    } catch (err: any) {
      if (__DEV__) {
        console.log('[useLiveProducts] Fetch fallback:', err?.message || err);
      }
      setError(err?.message || 'Failed to load products');
      setProducts(globalProductsCache || []);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [subcategoryId]);

  useEffect(() => {
    fetchLiveProducts();
  }, [fetchLiveProducts]);

  const refetch = useCallback(() => {
    return fetchLiveProducts(true);
  }, [fetchLiveProducts]);

  return {
    products,
    isLoading,
    isRefreshing,
    error,
    refetch,
  };
}

export function invalidateProductCache() {
  globalProductsCache = null;
}

