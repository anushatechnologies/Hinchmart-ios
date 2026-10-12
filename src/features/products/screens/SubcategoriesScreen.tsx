/**
 * HINCH MART — Category & Product Listing Screen
 * Architecture:
 * - Single-Screen Experience: Subcategories Sidebar + 2-Column Product Grid
 * - Fixed Header: Back | Category Name | Search | Wishlist | Cart
 * - Left Sidebar: Independently scrollable vertical subcategories navigation
 *   with real backend data, images, icons, and prominent active state (#E31E24)
 * - Right Product Area: 2-column product grid with Hinchmart ProductCards,
 *   live prices, ratings, discount badges, and functional Add to Cart & Wishlist
 * - In-place Subcategory Switching (ZERO intermediate brand screen, ZERO mock data)
 * - Skeletons: Sidebar skeleton + Product grid skeleton (sidebar stays interactive during subcategory switch)
 * - Caching & Pagination: Seamless switching between loaded subcategories & infinite scrolling
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../theme';
import { useLiveCategories } from '../../../hooks/useLiveCategories';
import { useLiveProducts, resolveProductImage } from '../../../hooks/useLiveProducts';
import { productsApi } from '../../../services/api/products.api';
import { subcategoriesApi } from '../../../services/api/subcategories.api';
import { ApiCategory, ApiSubcategory } from '../../../types/category.types';
import { ApiProduct } from '../../../types/product.types';
import { formatPrice } from '../../../utils';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import {
  addItem,
  showCartToast,
  selectCartItemCount,
  setServerCart,
  selectCartQuantityMap,
  selectCartItems,
} from '../../../redux/slices/cartSlice';
import { cartApi } from '../../../services/api/cart.api';
import { cartManager } from '../../../services/cart/cartManager';
import { toggleWishlist, showWishlistToast } from '../../../redux/slices/wishlistSlice';
import { ProductCardSkeleton, HinchSkeleton, HinchSkeletonCircle } from '../../../components/feedback/SkeletonLoader';
import { authStore } from '../../../store/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH < 380 ? 104 : 116;
const PRODUCT_AREA_WIDTH = SCREEN_WIDTH - SIDEBAR_WIDTH;
const PRODUCT_CARD_GAP = 8;
const PRODUCT_CARD_WIDTH = (PRODUCT_AREA_WIDTH - 16 - PRODUCT_CARD_GAP) / 2;

// ── Product Grid Card (Unified Hinchmart Component) ──────────────────────────
interface ListingProductCardProps {
  item: ApiProduct;
  cardWidth: number;
  isWishlisted: boolean;
  isDark: boolean;
  theme: any;
  cartQuantity: number;
  onPressItem: (item: ApiProduct) => void;
  onToggleWishlist: (id: string, name: string) => void;
  onQuickAdd: (item: ApiProduct) => void;
  onIncrement: (item: ApiProduct) => void;
  onDecrement: (item: ApiProduct) => void;
}

const ListingProductCard = React.memo(
  function ListingProductCard({
    item,
    cardWidth,
    isWishlisted,
    isDark,
    theme,
    cartQuantity,
    onPressItem,
    onToggleWishlist,
    onQuickAdd,
    onIncrement,
    onDecrement,
  }: ListingProductCardProps) {
    const itemTitle = item.title || item.name || 'Product Item';
    const itemId = String(item.id || item.productId);
    const itemImage = resolveProductImage(itemTitle, item.image || item.imageUrl);
    const discount =
      typeof item.discountPercent === 'number' && item.discountPercent > 0
        ? item.discountPercent
        : typeof (item as any)?.discountPercentage === 'number' && (item as any).discountPercentage > 0
        ? (item as any).discountPercentage
        : typeof (item as any)?.discount === 'number' && (item as any).discount > 0
        ? (item as any).discount
        : 0;
    const comparePrice = item.comparePrice || item.price || 0;
    const rawUnit = String(item.unit || (item as any)?.packSize || '').trim();
    const isInvalidUnit = !rawUnit || rawUnit.toLowerCase() === 'default' || rawUnit.toLowerCase() === 'null';
    const unitText = isInvalidUnit ? 'unit' : rawUnit;

    const handlePress = useCallback(() => onPressItem(item), [onPressItem, item]);
    const handleToggle = useCallback(
      () => onToggleWishlist(itemId, itemTitle),
      [onToggleWishlist, itemId, itemTitle]
    );
    const handleAdd = useCallback((e?: any) => {
      e?.stopPropagation?.();
      onQuickAdd(item);
    }, [onQuickAdd, item]);
    const handleInc = useCallback((e?: any) => {
      e?.stopPropagation?.();
      onIncrement(item);
    }, [onIncrement, item]);
    const handleDec = useCallback((e?: any) => {
      e?.stopPropagation?.();
      onDecrement(item);
    }, [onDecrement, item]);

    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.88}
        style={[
          styles.productCard,
          {
            width: cardWidth,
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.cardBorder,
          },
        ]}
      >
        {/* Product Image Area */}
        <View
          style={[
            styles.cardImageWrapper,
            { backgroundColor: isDark ? theme.colors.surfaceVariant : '#F8FAFC' },
          ]}
        >
          <Image
            source={{ uri: itemImage }}
            style={styles.cardImage}
            contentFit="contain"
            cachePolicy="memory-disk"
          />

          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleToggle}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              styles.heartBtn,
              {
                backgroundColor: isDark
                  ? 'rgba(22, 27, 34, 0.88)'
                  : 'rgba(255, 255, 255, 0.94)',
              },
            ]}
          >
            <Ionicons
              name={isWishlisted ? 'heart' : 'heart-outline'}
              size={15}
              color={isWishlisted ? '#EF4444' : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Product Metadata */}
        <View style={styles.cardMeta}>
          {/* Supplier/Pack Row */}
          <View style={styles.metaTopRow}>
            <Text style={[styles.supplierText, { color: theme.colors.textTertiary }]} numberOfLines={1}>
              {item.brand || 'Verified OEM'}
            </Text>
            <Ionicons name="shield-checkmark" size={10} color="#10B981" />
          </View>

          {/* Product Title */}
          <Text
            numberOfLines={2}
            style={[styles.productTitle, { color: theme.colors.textPrimary }]}
          >
            {itemTitle}
          </Text>

          {/* Real Rating Only (When verified reviews exist) */}
          {typeof item.rating === 'number' && item.rating > 0 && typeof item.reviews === 'number' && item.reviews > 0 ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={11} color="#F59E0B" />
              <Text style={[styles.ratingText, { color: theme.colors.textSecondary }]}>
                {item.rating.toFixed(1)} ({item.reviews})
              </Text>
            </View>
          ) : null}

          {/* Pack Size / Unit */}
          <Text style={[styles.unitText, { color: theme.colors.textTertiary }]} numberOfLines={1}>
            / {unitText}
          </Text>

          {/* Price & MRP Row */}
          <View style={styles.priceContainer}>
            <Text style={[styles.currentPrice, { color: theme.colors.textPrimary }]}>
              {formatPrice(item.price)}
            </Text>
            {comparePrice > item.price && (
              <Text style={[styles.comparePrice, { color: theme.colors.textTertiary }]}>
                {formatPrice(comparePrice)}
              </Text>
            )}
          </View>

          {/* Quick ADD to Cart / Quantity Stepper Button */}
          {cartQuantity > 0 ? (
            <View style={styles.cartStepperRow}>
              <TouchableOpacity
                onPress={handleDec}
                activeOpacity={0.7}
                style={styles.stepperActionBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              >
                <Ionicons name="remove" size={14} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.stepperNumberWrap}>
                <Text style={styles.stepperNumberText}>{cartQuantity}</Text>
              </View>
              <TouchableOpacity
                onPress={handleInc}
                activeOpacity={0.7}
                style={styles.stepperActionBtn}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleAdd}
              activeOpacity={0.82}
              style={styles.addCartBtn}
            >
              <Ionicons name="add" size={13} color="#FFFFFF" />
              <Text style={styles.addCartBtnText}>ADD</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  },
  (prev, next) => {
    return (
      (prev.item.id || prev.item.productId) === (next.item.id || next.item.productId) &&
      prev.cartQuantity === next.cartQuantity &&
      prev.isWishlisted === next.isWishlisted &&
      prev.isDark === next.isDark &&
      prev.item.price === next.item.price &&
      prev.cardWidth === next.cardWidth &&
      prev.onPressItem === next.onPressItem &&
      prev.onToggleWishlist === next.onToggleWishlist &&
      prev.onQuickAdd === next.onQuickAdd &&
      prev.onIncrement === next.onIncrement &&
      prev.onDecrement === next.onDecrement
    );
  }
);

function getCategoryFallbackImage(nameOrSlug?: string, existingUrl?: string): string {
  if (
    existingUrl &&
    typeof existingUrl === 'string' &&
    existingUrl.startsWith('http') &&
    !existingUrl.includes('example.com') &&
    !existingUrl.includes('placeholder')
  ) {
    return existingUrl;
  }
  const key = (nameOrSlug || '').toLowerCase();
  if (key.includes('steel') || key.includes('tmt') || key.includes('rebar') || key.includes('metal') || key.includes('rod')) {
    return 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=600&q=80';
  }
  if (key.includes('civil') || key.includes('cement') || key.includes('sand') || key.includes('concrete') || key.includes('rmc') || key.includes('brick') || key.includes('structur')) {
    return 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80';
  }
  if (key.includes('elect') || key.includes('wire') || key.includes('light') || key.includes('cable') || key.includes('switch')) {
    return 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80';
  }
  if (key.includes('plumb') || key.includes('pipe') || key.includes('fitting') || key.includes('sanitary') || key.includes('valve') || key.includes('drain')) {
    return 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80';
  }
  if (key.includes('tool') || key.includes('hardw') || key.includes('machin') || key.includes('drill') || key.includes('equipment')) {
    return 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80';
  }
  if (key.includes('paint') || key.includes('coat') || key.includes('chem') || key.includes('waterproof') || key.includes('primer')) {
    return 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=80';
  }
  if (key.includes('tile') || key.includes('floor') || key.includes('marble') || key.includes('granite') || key.includes('ceramic')) {
    return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80';
  }
  if (key.includes('wood') || key.includes('ply') || key.includes('timber') || key.includes('door') || key.includes('board') || key.includes('laminat')) {
    return 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=600&q=80';
  }
  if (key.includes('safe') || key.includes('ppe') || key.includes('helmet') || key.includes('fire') || key.includes('glove')) {
    return 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80';
  }
  if (key.includes('appliance') || key.includes('kitchen') || key.includes('stove') || key.includes('cooker') || key.includes('mixer')) {
    return 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80';
  }
  if (key.includes('decor') || key.includes('home') || key.includes('furnish')) {
    return 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80';
  }
  return existingUrl || 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80';
}

// ── Subcategory Sidebar Item ─────────────────────────────────────────────────
interface SubcategoryItemProps {
  item: ApiSubcategory | { id: string; subcategoryId: string; name: string; imageUrl?: string; iconName?: string };
  isActive: boolean;
  isDark: boolean;
  theme: any;
  onPress: (id: string) => void;
}

const SubcategoryItem = React.memo(function SubcategoryItem({
  item,
  isActive,
  isDark,
  theme,
  onPress,
}: SubcategoryItemProps) {
  const itemId = String((item as any).subcategoryId ?? item.id);
  const handlePress = useCallback(() => onPress(itemId), [onPress, itemId]);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [item.imageUrl]);

  const hasImage =
    !imageError &&
    Boolean(item.imageUrl) &&
    typeof item.imageUrl === 'string' &&
    item.imageUrl.trim().length > 0 &&
    !item.imageUrl.includes('example.com');

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.78}
      style={[
        styles.sidebarItem,
        {
          borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#EEF2F6',
          backgroundColor: isActive
            ? isDark ? '#1E293B' : '#FFFFFF'
            : isDark ? '#0F172A' : '#F8FAFC',
        },
      ]}
    >
      {/* Active Indicator Bar on Left */}
      {isActive && <View style={styles.activeIndicatorBar} />}

      {/* Thumbnail or Fallback Icon */}
      <View
        style={[
          styles.sidebarIconBox,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isActive ? '#E31E24' : isDark ? '#334155' : '#E2E8F0',
          },
          isActive && {
            backgroundColor: isDark ? 'rgba(227, 30, 36, 0.12)' : '#FEF2F2',
          },
        ]}
      >
        {hasImage ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.sidebarThumb}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            onError={() => setImageError(true)}
          />
        ) : (
          <MaterialCommunityIcons
            name={((item as any).iconName as any) || 'shape-outline'}
            size={28}
            color={isActive ? '#E31E24' : theme.colors.textSecondary}
          />
        )}
      </View>

      {/* Subcategory Title */}
      <Text
        numberOfLines={2}
        style={[
          styles.sidebarTitle,
          {
            color: isActive ? '#E31E24' : theme.colors.textSecondary,
            fontFamily: isActive ? 'Inter_700Bold' : 'Inter_500Medium',
            fontWeight: isActive ? '700' : '500',
          },
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );
});

// ── Subcategory Sidebar Skeleton ─────────────────────────────────────────────
function SidebarSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <View style={[styles.leftSidebar, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={`sidebar_skel_${i}`} style={styles.sidebarSkelItem}>
          <HinchSkeletonCircle size={58} />
          <HinchSkeleton width="80%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

// ── Main Category & Subcategories Screen ─────────────────────────────────────
export function SubcategoriesScreen({ navigation, route }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const cartCount = useAppSelector(selectCartItemCount);
  const cartQuantityMap = useAppSelector(selectCartQuantityMap);
  const cartItems = useAppSelector(selectCartItems);
  const wishlistIds: string[] = useAppSelector((state: any) => state?.wishlist?.productIds || []);
  const wishlistSet = useMemo(() => new Set(wishlistIds), [wishlistIds]);

  // Route parameters
  const paramCategoryId = route?.params?.categoryId;
  const paramCategoryName = route?.params?.categoryName || 'Category Catalog';
  const paramSubcategoryId = route?.params?.subcategoryId ?? route?.params?.subCategoryId;
  const paramCategoryImage =
    route?.params?.categoryImage ||
    route?.params?.imageUrl ||
    route?.params?.image ||
    '';

  // Global Categories Hook
  const {
    categories: liveCategories,
    isLoading: isCategoriesLoading,
    refetch: refetchLiveCategories,
  } = useLiveCategories();

  // Find active parent category object
  const activeCategory = useMemo(() => {
    if (!paramCategoryId && !paramCategoryName) return null;
    const targetId = paramCategoryId ? String(paramCategoryId).toLowerCase().trim() : '';
    const targetName = paramCategoryName ? String(paramCategoryName).toLowerCase().trim() : '';

    return (
      liveCategories.find((c) => {
        const cId = String(c.categoryId || c.id || '').toLowerCase().trim();
        const cSlug = String(c.slug || '').toLowerCase().trim();
        const cName = String(c.name || '').toLowerCase().trim();
        if (targetId && (cId === targetId || cSlug === targetId)) return true;
        if (targetName && (cName === targetName || cSlug === targetName)) return true;
        return false;
      }) || null
    );
  }, [liveCategories, paramCategoryId, paramCategoryName]);

  const categoryTitle = activeCategory?.name || paramCategoryName;

  const allItemLabel = useMemo(() => {
    if (!categoryTitle || categoryTitle === 'Category Catalog') return 'All Products';
    if (categoryTitle.toLowerCase().startsWith('all ')) return categoryTitle;
    return `All ${categoryTitle}`;
  }, [categoryTitle]);

  // Resolve main category image dynamically (from activeCategory, route params, or fallback)
  const mainCategoryImage = useMemo(() => {
    const rawUrl =
      activeCategory?.imageUrl ||
      (activeCategory as any)?.image ||
      paramCategoryImage ||
      '';
    return getCategoryFallbackImage(categoryTitle, rawUrl);
  }, [activeCategory, paramCategoryImage, categoryTitle]);

  // Subcategories state
  const [subcategories, setSubcategories] = useState<ApiSubcategory[]>([]);
  const [isSubcategoriesLoading, setIsSubcategoriesLoading] = useState<boolean>(true);
  const [subcategoriesError, setSubcategoriesError] = useState<string | null>(null);

  // Active subcategory selection: 'all' or subcategory ID
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>(
    paramSubcategoryId ? String(paramSubcategoryId) : 'all'
  );

  // Products state for the active subcategory
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState<boolean>(true);
  const [productError, setProductError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cache to ensure instant switching (Milk -> Eggs -> Milk) without lag
  const productsCacheRef = useRef<Map<string, { products: ApiProduct[]; totalCount: number; hasNextPage: boolean }>>(
    new Map()
  );

  // 1. Fetch live subcategories for this category from backend
  const fetchSubcategories = useCallback(async () => {
    if (!paramCategoryId) {
      setIsSubcategoriesLoading(false);
      return;
    }
    setIsSubcategoriesLoading(true);
    setSubcategoriesError(null);

    try {
      // First check if already attached to category object
      if (activeCategory?.subCategories && activeCategory.subCategories.length > 0) {
        setSubcategories(activeCategory.subCategories);
        setIsSubcategoriesLoading(false);
        return;
      }

      // Fetch live from backend /api/subcategories?categoryId=
      const apiSubs = await subcategoriesApi.getSubcategories({ categoryId: String(paramCategoryId) });
      const validSubs = Array.isArray(apiSubs) ? apiSubs.filter((s) => s.active !== false) : [];
      setSubcategories(validSubs);
    } catch (err: any) {
      if (__DEV__) {
        console.log('[SubcategoriesScreen] Error loading subcategories:', err);
      }
      setSubcategoriesError('Unable to load categories');
    } finally {
      setIsSubcategoriesLoading(false);
    }
  }, [paramCategoryId, activeCategory]);

  useEffect(() => {
    fetchSubcategories();
  }, [fetchSubcategories]);

  // 2. Fetch live products for selected category & subcategory from backend
  const fetchProductsForSelection = useCallback(
    async (subId: string, isRefresh = false) => {
      // Check cache if not a pull-to-refresh
      if (!isRefresh && productsCacheRef.current.has(subId)) {
        const cached = productsCacheRef.current.get(subId)!;
        setProducts(cached.products);
        setTotalCount(cached.totalCount);
        setHasNextPage(cached.hasNextPage);
        setIsProductsLoading(false);
        return;
      }

      setIsProductsLoading(true);
      setProductError(null);
      setPage(1);

      try {
        const queryParams: any = {
          limit: 20,
          page: 1,
        };

        if (paramCategoryId && paramCategoryId !== 'all') {
          queryParams.categoryId = paramCategoryId;
        }

        if (subId && subId !== 'all') {
          queryParams.subcategoryId = subId;
        }

        const res = await productsApi.getProductsWithPagination(queryParams);
        const fetchedProducts = res.products || [];
        const paginationTotal = res.pagination?.totalCount ?? fetchedProducts.length;
        const paginationHasNext = Boolean(res.pagination?.hasNextPage);

        setProducts(fetchedProducts);
        setTotalCount(paginationTotal);
        setHasNextPage(paginationHasNext);

        // Store in cache
        productsCacheRef.current.set(subId, {
          products: fetchedProducts,
          totalCount: paginationTotal,
          hasNextPage: paginationHasNext,
        });
      } catch (err: any) {
        if (__DEV__) {
          console.log('[SubcategoriesScreen] Error fetching products:', err);
        }
        setProductError('Unable to load products');
      } finally {
        setIsProductsLoading(false);
      }
    },
    [paramCategoryId]
  );

  // Trigger product fetch when subcategory selection changes
  useEffect(() => {
    fetchProductsForSelection(selectedSubcategoryId);
  }, [selectedSubcategoryId, fetchProductsForSelection]);

  // Subcategory tap handler — updates in-place without screen navigation
  const handleSelectSubcategory = useCallback((subId: string) => {
    setSelectedSubcategoryId(subId);
  }, []);

  // Pagination infinite scroll
  const handleEndReached = useCallback(async () => {
    if (isLoadingMore || !hasNextPage || isProductsLoading) return;
    setIsLoadingMore(true);

    try {
      const nextPage = page + 1;
      const queryParams: any = {
        limit: 20,
        page: nextPage,
      };

      if (paramCategoryId && paramCategoryId !== 'all') {
        queryParams.categoryId = paramCategoryId;
      }

      if (selectedSubcategoryId && selectedSubcategoryId !== 'all') {
        queryParams.subcategoryId = selectedSubcategoryId;
      }

      const res = await productsApi.getProductsWithPagination(queryParams);
      if (res.products && res.products.length > 0) {
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => String(p.id || p.productId)));
          const uniqueNew = res.products.filter((p) => !existingIds.has(String(p.id || p.productId)));
          const combined = [...prev, ...uniqueNew];

          // Update cache with combined list
          productsCacheRef.current.set(selectedSubcategoryId, {
            products: combined,
            totalCount: res.pagination?.totalCount ?? combined.length,
            hasNextPage: Boolean(res.pagination?.hasNextPage),
          });

          return combined;
        });
        setPage(nextPage);
        setHasNextPage(Boolean(res.pagination?.hasNextPage));
      } else {
        setHasNextPage(false);
      }
    } catch (err) {
      if (__DEV__) {
        console.log('[SubcategoriesScreen] Pagination error:', err);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasNextPage, isProductsLoading, page, paramCategoryId, selectedSubcategoryId]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    productsCacheRef.current.clear();
    await Promise.all([
      refetchLiveCategories(),
      fetchSubcategories(),
      fetchProductsForSelection(selectedSubcategoryId, true),
    ]);
    setIsRefreshing(false);
  }, [refetchLiveCategories, fetchSubcategories, fetchProductsForSelection, selectedSubcategoryId]);

  // Cart & Wishlist Handlers
  const handleToggleWishlistItem = useCallback(
    (id: string, name: string) => {
      const isCurrentlyWishlisted = wishlistSet.has(id);
      dispatch(toggleWishlist(id));
      if (!isCurrentlyWishlisted) {
        dispatch(showWishlistToast({ productName: name }));
      }
    },
    [wishlistSet, dispatch]
  );

  const handleQuickAdd = useCallback(
    async (item: ApiProduct) => {
      const res = await cartManager.addToCart(
        dispatch,
        item,
        1,
        (item as any)?.storeId,
        navigation,
        'Subcategories',
        route?.params
      );
      if (res?.success) {
        const itemTitle = item.title || item.name || 'Product';
        setToastMessage(`Added "${itemTitle}" to cart`);
        setTimeout(() => setToastMessage(null), 2500);
      }
    },
    [dispatch, navigation, route?.params]
  );

  const handleIncrement = useCallback(
    (item: ApiProduct) => {
      const itemId = String(item.id || item.productId);
      const currentQty = cartQuantityMap[itemId] || 0;
      const cItem = cartItems.find((ci: any) => String(ci.productId || ci.id) === itemId);
      cartManager.increment(dispatch, item, currentQty, cItem, navigation, 'Subcategories', route?.params);
    },
    [dispatch, cartQuantityMap, cartItems, navigation, route?.params]
  );

  const handleDecrement = useCallback(
    (item: ApiProduct) => {
      const itemId = String(item.id || item.productId);
      const currentQty = cartQuantityMap[itemId] || 0;
      const cItem = cartItems.find((ci: any) => String(ci.productId || ci.id) === itemId);
      cartManager.decrement(dispatch, item, currentQty, cItem, item.moq || 1, navigation, 'Subcategories', route?.params);
    },
    [dispatch, cartQuantityMap, cartItems, navigation, route?.params]
  );

  const handlePressProduct = useCallback(
    (item: ApiProduct) => {
      navigation.navigate('ProductDetail', {
        productId: String(item.id || item.productId),
        product: item,
      });
    },
    [navigation]
  );

  const isNavigatingToCartRef = useRef(false);

  const handleCartPress = useCallback(() => {
    if (isNavigatingToCartRef.current) return;
    isNavigatingToCartRef.current = true;
    setTimeout(() => {
      isNavigatingToCartRef.current = false;
    }, 600);
    navigation.navigate('Cart');
  }, [navigation]);

  // Search filtered products
  const displayedProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const title = String(p.title || p.name || '').toLowerCase();
      const desc = String(p.description || '').toLowerCase();
      const sub = String(p.subcategoryId || '').toLowerCase();
      return title.includes(q) || desc.includes(q) || sub.includes(q);
    });
  }, [products, searchQuery]);

  // Resolve current active subcategory display name
  const currentSubcategoryName = useMemo(() => {
    if (selectedSubcategoryId === 'all') return 'All Products';
    const found = subcategories.find(
      (s) => String((s as any).subcategoryId ?? s.id) === String(selectedSubcategoryId)
    );
    return found?.name || 'Products';
  }, [selectedSubcategoryId, subcategories]);

  // Render product item for FlatList
  const renderProductItem = useCallback(
    ({ item }: { item: ApiProduct }) => {
      const isWishlisted = wishlistSet.has(String(item.id || item.productId));
      const itemId = String(item.id || item.productId);
      const cartQty = cartQuantityMap[itemId] || 0;
      return (
        <ListingProductCard
          item={item}
          cardWidth={PRODUCT_CARD_WIDTH}
          isWishlisted={isWishlisted}
          isDark={isDark}
          theme={theme}
          cartQuantity={cartQty}
          onPressItem={handlePressProduct}
          onToggleWishlist={handleToggleWishlistItem}
          onQuickAdd={handleQuickAdd}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
        />
      );
    },
    [wishlistSet, isDark, theme, cartQuantityMap, handlePressProduct, handleToggleWishlistItem, handleQuickAdd, handleIncrement, handleDecrement]
  );

  return (
    <View style={[styles.screenRoot, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#E31E24" translucent />

      {/* ── Fixed Header Container (Hinchmart Signature Red) ───────────────── */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 24) }]}>
        <View style={styles.headerRow}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.headerBackBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Category Title */}
          <Text style={styles.headerTitle} numberOfLines={1}>
            {categoryTitle}
          </Text>

          {/* Action Icons */}
          <View style={styles.headerRightActions}>
            {/* Search Toggle */}
            <TouchableOpacity
              onPress={() => setIsSearchOpen((prev) => !prev)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.headerActionBtn}
            >
              <Ionicons
                name={isSearchOpen ? 'close' : 'search-outline'}
                size={22}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            {/* Wishlist */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Wishlist')}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.headerActionBtn}
            >
              <Ionicons name="heart-outline" size={22} color="#FFFFFF" />
              {wishlistIds.length > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>
                    {wishlistIds.length > 99 ? '99+' : wishlistIds.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Cart */}
            <TouchableOpacity
              onPress={handleCartPress}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
              style={styles.headerActionBtn}
              accessibilityLabel="Open shopping cart"
              accessibilityRole="button"
            >
              <Ionicons name="cart-outline" size={23} color="#FFFFFF" />
              {cartCount > 0 && (
                <View style={styles.headerBadge} pointerEvents="none">
                  <Text style={styles.headerBadgeText}>
                    {cartCount > 99 ? '99+' : cartCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Search Input Bar when toggled */}
        {isSearchOpen && (
          <View style={styles.searchBarWrap}>
            <View
              style={[
                styles.searchInputBox,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              <Ionicons name="search-outline" size={17} color="#E31E24" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={`Search in ${categoryTitle}...`}
                placeholderTextColor={isDark ? '#94A3B8' : '#94A3B8'}
                autoFocus
                style={[styles.searchInput, { color: isDark ? '#FFFFFF' : '#0F172A' }]}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={17} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* ── Main Split Layout: Left Sidebar + Right Product Grid ───────────── */}
      <View style={styles.mainSplitLayout}>
        {/* LEFT VERTICAL SUBCATEGORY SIDEBAR */}
        {isSubcategoriesLoading ? (
          <SidebarSkeleton isDark={isDark} />
        ) : subcategoriesError ? (
          <View
            style={[
              styles.leftSidebar,
              styles.sidebarCenterContent,
              { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={28} color="#EF4444" />
            <Text style={[styles.sidebarErrorText, { color: theme.colors.textSecondary }]}>
              {subcategoriesError}
            </Text>
            <TouchableOpacity onPress={fetchSubcategories} style={styles.retryMiniBtn}>
              <Text style={styles.retryMiniBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.leftSidebar,
              {
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                borderRightColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
              },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sidebarScrollContent}
            >
              {/* Item 1: "All Products" in Category — Displays Main Category Image */}
              <SubcategoryItem
                item={{
                  id: 'all',
                  subcategoryId: 'all',
                  name: allItemLabel,
                  imageUrl: mainCategoryImage,
                  iconName: 'view-grid-outline',
                }}
                isActive={selectedSubcategoryId === 'all'}
                isDark={isDark}
                theme={theme}
                onPress={handleSelectSubcategory}
              />

              {/* Dynamic Subcategories from Backend */}
              {subcategories.map((sub, sIdx) => {
                const subId = String((sub as any).subcategoryId ?? sub.id ?? sIdx);
                const isActive = selectedSubcategoryId === subId;

                return (
                  <SubcategoryItem
                    key={`sub_item_${subId}_${sIdx}`}
                    item={sub}
                    isActive={isActive}
                    isDark={isDark}
                    theme={theme}
                    onPress={handleSelectSubcategory}
                  />
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* RIGHT PRODUCT AREA */}
        <View style={[styles.rightProductArea, { backgroundColor: theme.colors.background }]}>
          {/* Subcategory Summary Bar */}
          <View
            style={[
              styles.subSummaryBar,
              {
                backgroundColor: theme.colors.cardBackground,
                borderBottomColor: theme.colors.cardBorder,
              },
            ]}
          >
            <View style={styles.subSummaryLeft}>
              <Text
                style={[styles.subSummaryTitle, { color: theme.colors.textPrimary }]}
                numberOfLines={1}
              >
                {currentSubcategoryName}
              </Text>
              <Text style={[styles.subSummaryCount, { color: theme.colors.textSecondary }]}>
                {displayedProducts.length} of {totalCount || displayedProducts.length} items
              </Text>
            </View>
          </View>

          {/* Product Grid Content / Skeletons / Empty / Error */}
          {isProductsLoading && products.length === 0 ? (
            /* Right area skeleton loading (sidebar remains interactive!) */
            <View style={styles.gridSkeletonWrapper}>
              <View style={styles.gridSkeletonRow}>
                <ProductCardSkeleton style={{ width: PRODUCT_CARD_WIDTH, marginRight: PRODUCT_CARD_GAP }} />
                <ProductCardSkeleton style={{ width: PRODUCT_CARD_WIDTH }} />
              </View>
              <View style={styles.gridSkeletonRow}>
                <ProductCardSkeleton style={{ width: PRODUCT_CARD_WIDTH, marginRight: PRODUCT_CARD_GAP }} />
                <ProductCardSkeleton style={{ width: PRODUCT_CARD_WIDTH }} />
              </View>
            </View>
          ) : productError && products.length === 0 ? (
            <View style={styles.stateWrapper}>
              <Ionicons name="cloud-offline-outline" size={44} color="#EF4444" />
              <Text style={[styles.stateTitle, { color: theme.colors.textPrimary }]}>
                Unable to load products
              </Text>
              <Text style={[styles.stateSub, { color: theme.colors.textSecondary }]}>
                Check your network connection and try again.
              </Text>
              <TouchableOpacity
                onPress={() => fetchProductsForSelection(selectedSubcategoryId)}
                activeOpacity={0.8}
                style={styles.retryBtn}
              >
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : displayedProducts.length === 0 ? (
            <View style={styles.stateWrapper}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <Ionicons name="cube-outline" size={42} color="#94A3B8" />
              </View>
              <Text style={[styles.stateTitle, { color: theme.colors.textPrimary }]}>
                No Products Available
              </Text>
              <Text style={[styles.stateSub, { color: theme.colors.textSecondary }]}>
                No products currently listed under this subcategory.
              </Text>
              {selectedSubcategoryId !== 'all' && (
                <TouchableOpacity
                  onPress={() => setSelectedSubcategoryId('all')}
                  activeOpacity={0.8}
                  style={styles.retryBtn}
                >
                  <Text style={styles.retryBtnText}>View All in {categoryTitle}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={displayedProducts}
              numColumns={2}
              keyExtractor={(item) => String(item.id || item.productId)}
              contentContainerStyle={[
                styles.productGridContent,
                { paddingBottom: Math.max(insets.bottom, 20) + 75 },
              ]}
              columnWrapperStyle={styles.gridColumnWrapper}
              showsVerticalScrollIndicator={false}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={5}
              removeClippedSubviews={Platform.OS === 'android'}
              renderItem={renderProductItem}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.4}
              ListFooterComponent={
                isLoadingMore ? (
                  <View style={styles.paginationLoading}>
                    <ActivityIndicator size="small" color="#E31E24" />
                  </View>
                ) : null
              }
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor="#E31E24"
                  colors={['#E31E24']}
                />
              }
            />
          )}
        </View>
      </View>

      {/* Floating Add to Cart Toast */}
      {toastMessage && (
        <View style={[styles.toastBox, { bottom: Math.max(insets.bottom, 20) + 16 }]}>
          <Ionicons name="checkmark-circle" size={17} color="#16A34A" />
          <Text style={styles.toastText} numberOfLines={1}>
            {toastMessage}
          </Text>
        </View>
      )}
    </View>
  );
}

// Backward-compatible alias for RootNavigator or other navigators
export const CategoryListingScreen = SubcategoriesScreen;

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: '#E31E24',
    paddingHorizontal: 12,
    paddingBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  headerBackBtn: {
    padding: 6,
    marginRight: 6,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    padding: 6,
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  headerBadgeText: {
    color: '#E31E24',
    fontSize: 9,
    fontWeight: '800',
  },
  searchBarWrap: {
    marginTop: 6,
  },
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  mainSplitLayout: {
    flex: 1,
    flexDirection: 'row',
  },

  // ── Left Sidebar Styles ──
  leftSidebar: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
  },
  sidebarScrollContent: {
    paddingBottom: 40,
  },
  sidebarItem: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    position: 'relative',
  },
  activeIndicatorBar: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 4,
    backgroundColor: '#E31E24',
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  sidebarIconBox: {
    width: 58,
    height: 58,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  sidebarThumb: {
    width: '100%',
    height: '100%',
  },
  sidebarTitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 3,
  },
  sidebarSkelItem: {
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  sidebarCenterContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  sidebarErrorText: {
    fontSize: 11,
    textAlign: 'center',
    marginVertical: 6,
  },
  retryMiniBtn: {
    backgroundColor: '#E31E24',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  retryMiniBtnText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // ── Right Product Area Styles ──
  rightProductArea: {
    flex: 1,
  },
  subSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  subSummaryLeft: {
    flex: 1,
  },
  subSummaryTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -0.2,
  },
  subSummaryCount: {
    fontSize: 12,
    marginTop: 2,
  },
  productGridContent: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  gridColumnWrapper: {
    justifyContent: 'space-between',
    marginBottom: PRODUCT_CARD_GAP,
  },
  gridSkeletonWrapper: {
    padding: 8,
  },
  gridSkeletonRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  paginationLoading: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Product Card Styles ──
  productCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardImageWrapper: {
    width: '100%',
    height: 110,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#E31E24',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  discountText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 9,
  },
  heartBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  cardMeta: {
    padding: 7,
  },
  metaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  supplierText: {
    fontSize: 9.5,
    fontWeight: '500',
    flex: 1,
  },
  productTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 11.5,
    lineHeight: 15,
    height: 30,
    marginBottom: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 2,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '500',
  },
  unitText: {
    fontSize: 9.5,
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 6,
  },
  currentPrice: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 13,
  },
  comparePrice: {
    fontSize: 10,
    textDecorationLine: 'line-through',
  },
  addCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E31E24',
    height: 28,
    borderRadius: 5,
    gap: 2,
  },
  addCartBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  cartStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E31E24',
    height: 28,
    borderRadius: 5,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  stepperActionBtn: {
    width: 26,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperNumberWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperNumberText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 12,
    color: '#FFFFFF',
  },

  // ── Empty & Error States ──
  stateWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    minHeight: 260,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stateTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 4,
  },
  stateSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#E31E24',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },

  // ── Floating Toast ──
  toastBox: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    maxWidth: '90%',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
