/**
 * HINCH MART — Live Backend Products Screen
 * Fully connected to:
 * - GET https://api.hinchmart.com/api/products
 * - GET https://api.hinchmart.com/api/categories
 * - GET https://api.hinchmart.com/api/subcategories
 * All hardcoding removed; 100% dynamic live data with pull-to-refresh and search.
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  Platform,
  StatusBar,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
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
import { formatPrice } from '../../../utils';
import { useTheme } from '../../../theme';
import { useLiveCategories } from '../../../hooks/useLiveCategories';
import { useLiveProducts, resolveProductImage } from '../../../hooks/useLiveProducts';
import { productsApi } from '../../../services/api/products.api';
import { ApiProduct } from '../../../types/product.types';
import { ProductCardSkeleton } from '../../../components/feedback/SkeletonLoader';
import { authStore } from '../../../store/authStore';

interface SubCategoryItem {
  id: string;
  name: string;
  image: string;
  count: number;
}

interface ProductGridCardProps {
  item: ApiProduct;
  isWishlisted: boolean;
  isDark: boolean;
  theme: any;
  cartQuantity: number;
  onPressItem: (item: ApiProduct) => void;
  onToggleWishlistItem: (id: string, name: string) => void;
  onQuickAddItem: (item: ApiProduct) => void;
  onIncrementItem: (item: ApiProduct) => void;
  onDecrementItem: (item: ApiProduct) => void;
}

const ProductGridCard = React.memo(
  function ProductGridCard({
    item,
    isWishlisted,
    isDark,
    theme,
    cartQuantity,
    onPressItem,
    onToggleWishlistItem,
    onQuickAddItem,
    onIncrementItem,
    onDecrementItem,
  }: ProductGridCardProps) {
    const itemTitle = item.title || item.name || 'Product Item';
    const itemId = String(item.id || item.productId);
    const itemImage = resolveProductImage(itemTitle, item.image || item.imageUrl);
    const discount = typeof item.discountPercent === 'number' && item.discountPercent > 0
      ? item.discountPercent
      : typeof (item as any)?.discountPercentage === 'number' && (item as any).discountPercentage > 0
      ? (item as any).discountPercentage
      : typeof (item as any)?.discount === 'number' && (item as any).discount > 0
      ? (item as any).discount
      : 0;
    const comparePrice = item.comparePrice || item.price || 0;
    const rawUnit = String(item.unit || '').trim();
    const unitText = !rawUnit || rawUnit.toLowerCase() === 'default' ? 'unit' : rawUnit;

    const handlePress = useCallback(() => onPressItem(item), [onPressItem, item]);
    const handleToggle = useCallback(
      () => onToggleWishlistItem(itemId, itemTitle),
      [onToggleWishlistItem, itemId, itemTitle]
    );
    const handleAdd = useCallback((e?: any) => {
      e?.stopPropagation?.();
      onQuickAddItem(item);
    }, [onQuickAddItem, item]);
    const handleInc = useCallback((e?: any) => {
      e?.stopPropagation?.();
      onIncrementItem(item);
    }, [onIncrementItem, item]);
    const handleDec = useCallback((e?: any) => {
      e?.stopPropagation?.();
      onDecrementItem(item);
    }, [onDecrementItem, item]);

    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={[
          styles.productCard,
          {
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.cardBorder,
          },
        ]}
      >
        {/* Image Area */}
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
            style={[
              styles.heartBtn,
              {
                backgroundColor: isDark
                  ? 'rgba(22, 27, 34, 0.85)'
                  : 'rgba(255, 255, 255, 0.9)',
              },
            ]}
          >
            <Ionicons
              name={isWishlisted ? 'heart' : 'heart-outline'}
              size={16}
              color={isWishlisted ? '#EF4444' : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Meta */}
        <View style={styles.cardMeta}>
          <View style={styles.brandRow}>
            <Text style={styles.cardBrand}>{item.brand || ''}</Text>
            <Ionicons name="shield-checkmark" size={11} color="#10B981" />
          </View>
          <Text numberOfLines={2} style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
            {itemTitle}
          </Text>

          {/* Real Rating Only (When verified reviews exist) */}
          {typeof item.rating === 'number' && item.rating > 0 && typeof item.reviews === 'number' && item.reviews > 0 ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={[styles.ratingText, { color: theme.colors.textSecondary }]}>
                {item.rating.toFixed(1)} ({item.reviews})
              </Text>
            </View>
          ) : null}

          {item.savingsText && (
            <View style={styles.savingsPill}>
              <Ionicons name="cube-outline" size={10} color="#16A34A" />
              <Text style={styles.savingsPillText}>{item.savingsText}</Text>
            </View>
          )}

          <View style={styles.priceRow}>
            <Text style={[styles.priceText, { color: theme.colors.textPrimary }]}>
              {formatPrice(item.price)}
            </Text>
            {discount > 0 && comparePrice > item.price && (
              <Text style={[styles.comparePriceText, { color: theme.colors.textTertiary }]}>
                {formatPrice(comparePrice)}
              </Text>
            )}
          </View>
          <Text style={[styles.unitSubtext, { color: theme.colors.textTertiary }]}>
            / {unitText}
          </Text>

          {/* Quick Add CTA / Quantity Stepper */}
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
              activeOpacity={0.8}
              style={styles.quickAddBtn}
            >
              <Ionicons name="add" size={14} color="#FFFFFF" />
              <Text style={styles.quickAddBtnText}>Add</Text>
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
      prev.onPressItem === next.onPressItem &&
      prev.onToggleWishlistItem === next.onToggleWishlistItem &&
      prev.onQuickAddItem === next.onQuickAddItem &&
      prev.onIncrementItem === next.onIncrementItem &&
      prev.onDecrementItem === next.onDecrementItem
    );
  }
);

export function ProductListScreen({ route, navigation }: any) {
  const { theme, isDark } = useTheme();
  const cartCount = useAppSelector(selectCartItemCount);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const isAdminOrVendor = user?.role === 'ADMIN' || user?.role === 'VENDOR' || (user as any)?.accountType === 'admin' || (user as any)?.accountType === 'vendor';

  const { categories: liveCategories, refetch: refetchCategories } = useLiveCategories();
  const { products: liveProducts, isLoading: isProductsLoading, isRefreshing, refetch: refetchProducts } = useLiveProducts();

  const rawCategoryParam = route?.params?.categoryId ?? route?.params?.category ?? '';
  const rawCategoryId =
    typeof rawCategoryParam === 'object' && rawCategoryParam !== null
      ? String(rawCategoryParam.categoryId ?? rawCategoryParam.id ?? '')
      : String(rawCategoryParam || '');
  const routeCategoryName = route?.params?.categoryName || '';
  const routeSubcategoryId = route?.params?.subcategoryId ?? route?.params?.subCategoryId ?? '';
  const routeSubcategoryName = route?.params?.subcategoryName || '';
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(
    routeSubcategoryId ? String(routeSubcategoryId).toLowerCase() : rawCategoryId ? rawCategoryId.toLowerCase() : 'all'
  );
  const [targetProducts, setTargetProducts] = useState<ApiProduct[]>([]);
  const [isTargetLoading, setIsTargetLoading] = useState<boolean>(false);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const wishlistIds: string[] = useAppSelector((state: any) => state?.wishlist?.productIds || []);
  const cartQuantityMap = useAppSelector(selectCartQuantityMap);
  const cartItems = useAppSelector(selectCartItems);

  // Resolve dynamic names for 4-tier breadcrumbs
  const displayCategory = useMemo(() => {
    if (routeCategoryName) return { id: rawCategoryId, name: routeCategoryName };
    if (rawCategoryId) {
      const found = liveCategories.find(
        (c) =>
          String(c.categoryId) === String(rawCategoryId) ||
          String(c.id) === String(rawCategoryId) ||
          c.slug === rawCategoryId
      );
      if (found) return { id: found.categoryId || found.id, name: found.name };
    }
    return null;
  }, [routeCategoryName, rawCategoryId, liveCategories]);

  const displaySubcategory = useMemo(() => {
    if (routeSubcategoryName) return { id: routeSubcategoryId, name: routeSubcategoryName };
    if (routeSubcategoryId) {
      for (const c of liveCategories) {
        const foundSub = (c.subCategories || []).find(
          (s) =>
            String(s.subcategoryId) === String(routeSubcategoryId) ||
            String(s.id) === String(routeSubcategoryId)
        );
        if (foundSub) {
          return {
            id: foundSub.subcategoryId || foundSub.id,
            name: foundSub.name,
            categoryId: c.categoryId,
            categoryName: c.name,
          };
        }
      }
    }
    return null;
  }, [routeSubcategoryName, routeSubcategoryId, liveCategories]);

  const subCategoryList: SubCategoryItem[] = useMemo(() => {
    const list: SubCategoryItem[] = [
      {
        id: 'all',
        name: 'All Products',
        image: liveCategories?.[0]?.imageUrl || '',
        count: liveProducts.length,
      },
    ];

    if (liveCategories && liveCategories.length > 0) {
      const seenIds = new Set<string>(['all']);
      liveCategories.forEach((cat) => {
        const catKey = String(cat.categoryId || cat.slug || cat.id).toLowerCase();
        if (seenIds.has(catKey)) return;
        seenIds.add(catKey);

        const catSubs = (cat.subCategories || []).map((s) => String(s.subcategoryId || s.id || '').toLowerCase());
        const count = liveProducts.filter((p: ApiProduct) => {
          const sc = String(p.subcategoryId || '').toLowerCase();
          const pc = String((p as any).categoryId || '').toLowerCase();
          return sc === catKey || pc === catKey || catSubs.includes(sc);
        }).length;

        list.push({
          id: catKey,
          name: cat.name,
          image: cat.imageUrl,
          count: count > 0 ? count : (cat.subCategories?.length || 1),
        });
      });
    }

    return list;
  }, [liveCategories, liveProducts]);

  const topSafePadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  ) + 8;

  const fetchTargetProducts = useCallback(
    async (
      targetSubId?: string | number,
      targetCatId?: string | number
    ) => {
      const subId = targetSubId && String(targetSubId) !== 'all' ? String(targetSubId).trim() : '';
      const catId = targetCatId && String(targetCatId) !== 'all' ? String(targetCatId).trim() : '';

      if (!subId && !catId) {
        setTargetProducts([]);
        setIsTargetLoading(false);
        return;
      }

      setIsTargetLoading(true);
      try {
        const queryParams: any = { limit: 200 };
        if (subId) queryParams.subcategoryId = subId;
        if (catId) queryParams.categoryId = catId;

        const res = await productsApi.getProducts(queryParams);
        setTargetProducts(Array.isArray(res) ? res : []);
      } catch (err) {
        if (__DEV__) {
          console.log('[ProductListScreen] Error loading target products:', err);
        }
      } finally {
        setIsTargetLoading(false);
      }
    },
    []
  );

  // Sync route params when navigating between categories
  useEffect(() => {
    const rawParam = route?.params?.categoryId ?? route?.params?.category ?? '';
    const rawCat =
      typeof rawParam === 'object' && rawParam !== null
        ? String(rawParam.categoryId ?? rawParam.id ?? '')
        : String(rawParam || '');
    const routeSubId = route?.params?.subcategoryId ?? route?.params?.subCategoryId ?? '';

    if (routeSubId) {
      setSelectedSubCategory(String(routeSubId).toLowerCase());
    } else if (rawCat && rawCat !== 'all') {
      setSelectedSubCategory(rawCat.toLowerCase());
    } else {
      setSelectedSubCategory('all');
    }

    if (routeSubId || (rawCat && rawCat !== 'all')) {
      fetchTargetProducts(routeSubId, rawCat);
    } else {
      setTargetProducts([]);
    }

    setSearch('');
  }, [route?.params, fetchTargetProducts]);

  const handleRefresh = async () => {
    await Promise.all([
      refetchProducts(),
      refetchCategories(),
      (routeSubcategoryId || rawCategoryId)
        ? fetchTargetProducts(routeSubcategoryId, rawCategoryId)
        : Promise.resolve(),
    ]);
  };

  const handleToggleWishlist = useCallback((id: string, name: string) => {
    const isCurrentlyWishlisted = Array.isArray(wishlistIds) && wishlistIds.includes(id);
    dispatch(toggleWishlist(id));
    if (!isCurrentlyWishlisted) {
      dispatch(showWishlistToast({ productName: name }));
    }
  }, [wishlistIds, dispatch]);

  const handleQuickAdd = useCallback(
    async (item: ApiProduct) => {
      const res = await cartManager.addToCart(
        dispatch,
        item,
        1,
        (item as any)?.storeId,
        navigation,
        'ProductList',
        route?.params
      );
      if (res?.success) {
        const itemTitle = item.title || item.name || 'Product';
        setToastMessage(`Added "${itemTitle.substring(0, 20)}" to cart!`);
        setTimeout(() => setToastMessage(null), 2000);
      }
    },
    [dispatch, navigation, route?.params]
  );

  const handleIncrement = useCallback(
    (item: ApiProduct) => {
      const itemId = String(item.id || item.productId);
      const currentQty = cartQuantityMap[itemId] || 0;
      const cItem = cartItems.find((ci: any) => String(ci.productId || ci.id) === itemId);
      cartManager.increment(dispatch, item, currentQty, cItem, navigation, 'ProductList', route?.params);
    },
    [dispatch, cartQuantityMap, cartItems, navigation, route?.params]
  );

  const handleDecrement = useCallback(
    (item: ApiProduct) => {
      const itemId = String(item.id || item.productId);
      const currentQty = cartQuantityMap[itemId] || 0;
      const cItem = cartItems.find((ci: any) => String(ci.productId || ci.id) === itemId);
      cartManager.decrement(dispatch, item, currentQty, cItem, item.moq || 1, navigation, 'ProductList', route?.params);
    },
    [dispatch, cartQuantityMap, cartItems, navigation, route?.params]
  );

  const wishlistSet = useMemo(() => new Set(wishlistIds), [wishlistIds]);

  const isNavigatingToCartRef = useRef(false);

  const handleCartPress = useCallback(() => {
    if (isNavigatingToCartRef.current) return;
    isNavigatingToCartRef.current = true;
    setTimeout(() => {
      isNavigatingToCartRef.current = false;
    }, 600);
    navigation.navigate('Cart');
  }, [navigation]);

  const handlePressItem = useCallback(
    (item: ApiProduct) => {
      const itemId = String(item.id || item.productId);
      navigation.navigate('ProductDetail', { productId: itemId, product: item });
    },
    [navigation]
  );

  const renderProductItem = useCallback(
    ({ item }: { item: ApiProduct }) => {
      const itemId = String(item.id || item.productId);
      const isWishlisted = wishlistSet.has(itemId);
      const cartQty = cartQuantityMap[itemId] || 0;
      return (
        <ProductGridCard
          item={item}
          isWishlisted={isWishlisted}
          isDark={isDark}
          theme={theme}
          cartQuantity={cartQty}
          onPressItem={handlePressItem}
          onToggleWishlistItem={handleToggleWishlist}
          onQuickAddItem={handleQuickAdd}
          onIncrementItem={handleIncrement}
          onDecrementItem={handleDecrement}
        />
      );
    },
    [wishlistSet, isDark, theme, cartQuantityMap, handlePressItem, handleToggleWishlist, handleQuickAdd, handleIncrement, handleDecrement]
  );

  const filteredProducts = useMemo(() => {
    // Pool target products with liveProducts, deduplicated by ID
    const candidateProducts = (targetProducts.length > 0)
      ? Array.from(
          new Map(
            [...targetProducts, ...liveProducts].map((p) => [String(p.id || p.productId), p])
          ).values()
        )
      : liveProducts;

    return candidateProducts.filter((p: ApiProduct) => {
      const pSubCat = String(p.subcategoryId || (p as any).subCategoryId || '').toLowerCase();
      const pCat = String((p as any).categoryId || '').toLowerCase();
      const pTitle = (p.title || p.name || '').toLowerCase();
      const pDesc = (p.description || '').toLowerCase();

      // 1. Subcategory Filter (if specified in route)
      const targetSub = String(routeSubcategoryId || '').toLowerCase();
      const matchesSub = !targetSub || targetSub === 'all' || pSubCat === targetSub;

      // 2. Category Filter
      const targetCat = selectedSubCategory;
      const foundCat = liveCategories.find(
        (c) =>
          String(c.categoryId || '').toLowerCase() === targetCat ||
          String(c.slug || '').toLowerCase() === targetCat ||
          String(c.id || '').toLowerCase() === targetCat
      );
      const foundCatSubIds = (foundCat?.subCategories || []).map((s) =>
        String(s.subcategoryId || s.id || '').toLowerCase()
      );

      const matchesCategory =
        targetCat === 'all' ||
        pSubCat === targetCat ||
        pCat === targetCat ||
        foundCatSubIds.includes(pSubCat) ||
        pSubCat.includes(targetCat) ||
        pCat.includes(targetCat);

      const matchesBestSeller =
        !route?.params?.isBestSeller ||
        (p as any)?.isBestSeller ||
        (p as any)?.badge === 'BESTSELLER' ||
        ((p as any)?.rating && (p as any).rating >= 4.5);

      const matchesOffer =
        !route?.params?.isOffer ||
        (p as any)?.discountPercent > 0 ||
        (p as any)?.discount > 0 ||
        ((p as any)?.comparePrice && (p as any).comparePrice > (p as any).price);

      const matchesSearch =
        search.trim() === '' ||
        pTitle.includes(search.toLowerCase()) ||
        pDesc.includes(search.toLowerCase()) ||
        pSubCat.includes(search.toLowerCase());

      return matchesCategory && matchesSub && matchesSearch && matchesBestSeller && matchesOffer;
    });
  }, [liveProducts, targetProducts, selectedSubCategory, routeSubcategoryId, search, liveCategories, route?.params?.isBestSeller, route?.params?.isOffer]);

  const getActiveHeaderTitle = () => {
    if (route?.params?.title) return route.params.title;
    if (route?.params?.isOffer) return 'Top Offers & Discounts';
    if (route?.params?.isBestSeller) return 'Best Sellers';
    if (routeCategoryName) return `${routeCategoryName} Products`;
    if (selectedSubCategory !== 'all') {
      const foundSub = subCategoryList.find((s) => s.id === selectedSubCategory);
      if (foundSub) return `${foundSub.name} Catalog`;
      return `${selectedSubCategory.charAt(0).toUpperCase() + selectedSubCategory.slice(1)} Products`;
    }
    return 'Live Products Catalog';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#E31E24" translucent />

      {/* Top Header - IBO Red Bar */}
      <View
        style={[
          styles.topHeader,
          {
            paddingTop: topSafePadding,
            backgroundColor: '#E31E24',
            borderBottomColor: '#C4181D',
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={23} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]} numberOfLines={1}>
          {getActiveHeaderTitle()}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {isAdminOrVendor && (
            <TouchableOpacity
              onPress={() => navigation.navigate('ProductManagement')}
              activeOpacity={0.7}
              style={[styles.headerRightBtn, { marginRight: 2 }]}
            >
              <Ionicons name="cube-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleCartPress}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
            style={styles.headerRightBtn}
            accessibilityLabel="Open shopping cart"
            accessibilityRole="button"
          >
            <Ionicons name="cart-outline" size={24} color="#FFFFFF" />
            {cartCount > 0 && (
              <View style={styles.cartBadge} pointerEvents="none">
                <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 3-Tier Dynamic Breadcrumbs Bar */}
      {(Boolean(displayCategory) || Boolean(displaySubcategory)) && (
        <View
          style={[
            styles.breadcrumbBar,
            {
              backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
              borderBottomColor: theme.colors.cardBorder,
            },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.breadcrumbScroll}
          >
            {/* Tier 1: Home */}
            <TouchableOpacity
              onPress={() => navigation.navigate('HomeTab')}
              style={styles.breadcrumbItem}
              activeOpacity={0.7}
            >
              <Ionicons name="home-outline" size={13} color={theme.colors.textTertiary} />
              <Text style={[styles.breadcrumbLink, { color: theme.colors.textTertiary }]}>
                Home
              </Text>
            </TouchableOpacity>

            {/* Tier 2: Category */}
            {displayCategory ? (
              <View style={styles.breadcrumbSegment}>
                <Ionicons
                  name="chevron-forward"
                  size={11}
                  color={theme.colors.textTertiary}
                  style={{ marginHorizontal: 3 }}
                />
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('Subcategories', {
                      categoryId: displayCategory.id,
                      categoryName: displayCategory.name,
                      categoryImage: (displayCategory as any)?.imageUrl || (displayCategory as any)?.image,
                    })
                  }
                  style={styles.breadcrumbItem}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.breadcrumbLink, { color: theme.colors.textTertiary }]}>
                    {displayCategory.name}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Tier 3: Subcategory */}
            {displaySubcategory ? (
              <View style={styles.breadcrumbSegment}>
                <Ionicons
                  name="chevron-forward"
                  size={11}
                  color={theme.colors.textTertiary}
                  style={{ marginHorizontal: 3 }}
                />
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('Subcategories', {
                      subcategoryId: displaySubcategory.id,
                      subcategoryName: displaySubcategory.name,
                      categoryId: displayCategory?.id || (displaySubcategory as any).categoryId,
                      categoryName: displayCategory?.name || (displaySubcategory as any).categoryName,
                    })
                  }
                  style={styles.breadcrumbItem}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.breadcrumbLink, { color: theme.colors.textTertiary }]}>
                    {displaySubcategory.name}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        </View>
      )}

      {/* Top Search Bar */}
      <View
        style={[
          styles.searchBarWrapper,
          {
            backgroundColor: isDark ? '#1E1E1E' : '#F5F6F8',
            borderBottomColor: isDark ? '#2A2A2A' : '#E5E7EB',
          },
        ]}
      >
        <View style={[styles.searchInputBox, { backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF', borderColor: isDark ? '#3A3A3A' : '#E2E8F0', borderWidth: 1 }]}>
          <Ionicons name="search-outline" size={19} color="#E31E24" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search live products..."
            placeholderTextColor={isDark ? '#888888' : '#94A3B8'}
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Full Width 2-Column Product Grid */}
      <View style={[styles.fullCatalog, { backgroundColor: theme.colors.background }]}>
        {(isProductsLoading || isTargetLoading) && filteredProducts.length === 0 ? (
          <View style={{ padding: 12 }}>
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <ProductCardSkeleton style={{ flex: 1, marginRight: 6 }} />
              <ProductCardSkeleton style={{ flex: 1, marginLeft: 6 }} />
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <ProductCardSkeleton style={{ flex: 1, marginRight: 6 }} />
              <ProductCardSkeleton style={{ flex: 1, marginLeft: 6 }} />
            </View>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyCatalog}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Ionicons name="cube-outline" size={44} color="#94A3B8" />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No Products Found</Text>
            <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
              No live items matched this filter.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSelectedSubCategory('all');
                setSearch('');
                setTargetProducts([]);
                refetchProducts();
              }}
              activeOpacity={0.8}
              style={styles.resetFilterBtn}
            >
              <Text style={styles.resetFilterBtnText}>View All Products</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            numColumns={2}
            keyExtractor={(item: any) => String(item.productId || item.id)}
            contentContainerStyle={[
              styles.productGridContent,
              { paddingBottom: Math.max(insets.bottom, 20) + 90 },
            ]}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            updateCellsBatchingPeriod={50}
            renderItem={renderProductItem}
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

      {/* Floating Add to Cart Toast */}
      {toastMessage && (
        <View style={[styles.toastBox, { bottom: Math.max(insets.bottom, 20) + 16 }]}>
          <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  backBtn: {
    padding: 6,
    marginLeft: -4,
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRightBtn: {
    padding: 6,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 1,
    right: 0,
    backgroundColor: '#EA580C',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontFamily: 'Poppins_700Bold',
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  fullCatalog: {
    flex: 1,
  },
  loadingCatalog: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12.5,
    marginTop: 10,
  },
  productGridContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productCard: {
    width: '48.5%',
    maxWidth: '48.5%',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardImageWrapper: {
    width: '100%',
    height: 130,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: '85%',
    height: '85%',
  },
  discountBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 9,
    color: '#FFFFFF',
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardMeta: {
    padding: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  cardBrand: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 9,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '500',
    fontSize: 11.5,
    lineHeight: 15,
    minHeight: 30,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  ratingText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 10,
  },
  savingsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  savingsPillText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 9,
    color: '#16A34A',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginTop: 4,
  },
  priceText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 13,
  },
  comparePriceText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 10,
    textDecorationLine: 'line-through',
  },
  unitSubtext: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 9,
    marginTop: -1,
    marginBottom: 4,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#E31E24',
    height: 28,
    borderRadius: 6,
    marginTop: 3,
  },
  quickAddBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 11,
    color: '#FFFFFF',
  },
  cartStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E31E24',
    height: 28,
    borderRadius: 6,
    marginTop: 3,
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
  emptyCatalog: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: 350,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 4,
  },
  emptySub: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14,
  },
  resetFilterBtn: {
    backgroundColor: '#E31E24',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetFilterBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 12,
    color: '#FFFFFF',
  },
  toastBox: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  toastText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 12,
    color: '#FFFFFF',
  },
  breadcrumbBar: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  breadcrumbScroll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbSegment: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  breadcrumbLink: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11,
    marginLeft: 3,
  },
  breadcrumbActiveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(253, 185, 19, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  breadcrumbActiveText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 11,
  },
});

export default ProductListScreen;
