/**
 * HINCH MART — 24 Hrs Delivery Screen
 * STRICTLY HYDERABAD-ONLY EXPRESS DISPATCH CATALOG
 * 
 * Features:
 * 1. Pixel-perfect Safe Area alignment across iOS and Android
 * 2. Real-time Live Products & Categories fetching
 * 3. Scoped Search & Category Pills for 24-Hr Express materials
 * 4. Location Serviceability Gate:
 *    - Hyderabad -> Renders 24-Hr Catalog with live product cards & Add to Cart
 *    - Outside Hyderabad -> Renders clear restriction card with location switcher
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Dimensions,
  Platform,
  RefreshControl,
  Animated,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useTheme } from '../../../theme';
import { Screen } from '../../../components/layout/Screen';
import { ProductCard } from '../../../components/cards/ProductCard';
import {
  LocationPickerModal,
  PRESET_DELIVERY_SITES,
  DeliverySite,
  customerAddressToDeliverySite,
} from '../../../components/ui/LocationPickerModal';
import { authStore } from '../../../store/authStore';
import { addressesApi } from '../../../services/api/addresses.api';
import { check24HourServiceability, isHyderabadServiceable } from '../../../services/delivery/serviceability.service';
import { useLiveProducts } from '../../../hooks/useLiveProducts';
import { useLiveCategories } from '../../../hooks/useLiveCategories';
import { ApiProduct } from '../../../types/product.types';
import { ProductCardSkeleton } from '../../../components/feedback/SkeletonLoader';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { selectCartItems, updateItemQuantity, removeItem } from '../../../redux/slices/cartSlice';
import { formatPrice } from '../../../utils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 32 - 10) / 2;

export function TwentyFourHourDeliveryScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  // Redux Cart states
  const cartItems = useAppSelector(selectCartItems);

  const expressCartItems = useMemo(() => {
    return cartItems.filter(
      (item: any) =>
        item.is24HourDelivery === true ||
        item.deliveryType === '24_HOURS' ||
        item.product?.is24HourDelivery === true ||
        (item.product as any)?.deliveryType === '24_HOURS'
    );
  }, [cartItems]);

  const expressCartCount = useMemo(() => {
    return expressCartItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
  }, [expressCartItems]);

  const expressCartSubtotal = useMemo(() => {
    return expressCartItems.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);
  }, [expressCartItems]);

  // Animated scale for count changes
  const cartBarScale = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(expressCartCount);

  useEffect(() => {
    if (expressCartCount > prevCount.current) {
      Animated.sequence([
        Animated.timing(cartBarScale, { toValue: 1.08, duration: 100, useNativeDriver: true }),
        Animated.spring(cartBarScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
    prevCount.current = expressCartCount;
  }, [expressCartCount]);

  // Bottom Sheet animations & states
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const openCartSheet = () => {
    setIsCartSheetOpen(true);
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0.5,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeCartSheet = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsCartSheetOpen(false);
    });
  };

  // Quantity controllers for bottom sheet
  const handleUpdateQty = useCallback(
    (id: string, nextQty: number) => {
      if (nextQty <= 0) {
        dispatch(removeItem(id));
      } else {
        dispatch(updateItemQuantity({ id, quantity: nextQty }));
      }
    },
    [dispatch]
  );

  // Screen entrance animations
  const screenFadeAnim = useRef(new Animated.Value(0)).current;
  const screenSlideAnim = useRef(new Animated.Value(30)).current;
  const screenScaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenFadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(screenSlideAnim, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(screenScaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [screenFadeAnim, screenSlideAnim, screenScaleAnim]);

  // Delivery site selection (defaults to Hyderabad preset)
  const [selectedSite, setSelectedSite] = useState<DeliverySite | null>(null);
  const hasUserSelectedSiteRef = useRef<boolean>(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  useEffect(() => {
    if (!authStore.isAuthenticated() || hasUserSelectedSiteRef.current) return;
    addressesApi
      .getAddresses()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          const def =
            list.find((a) => a.isDefault && a.latitude && a.longitude) ||
            list.find((a) => a.latitude && a.longitude) ||
            list[0];
          if (def && def.latitude && def.longitude && !hasUserSelectedSiteRef.current) {
            setSelectedSite(customerAddressToDeliverySite(def));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Live Products & Categories from backend
  const {
    products: liveProducts,
    isLoading: isProductsLoading,
    isRefreshing: isProductsRefreshing,
    refetch: refetchProducts,
  } = useLiveProducts();

  const {
    categories: liveCategories,
    refetch: refetchCategories,
  } = useLiveCategories();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Serviceability check
  const serviceability = useMemo(() => {
    return selectedSite ? check24HourServiceability(selectedSite) : { isServiceable: true, isExpress24Hour: true, estimatedHours: 24, hubName: "Hyderabad Hub", distanceKm: 0, pincode: "500081" };
  }, [selectedSite]);

  const isServiceable = serviceability.isServiceable;

  // Category filter items derived dynamically from live categories
  const categoryFilters = useMemo(() => {
    const list = [{ id: 'all', label: 'All 24-Hr Items' }];
    if (Array.isArray(liveCategories) && liveCategories.length > 0) {
      liveCategories
        .filter((c) => c.slug !== 'all' && c.categoryId !== 'all')
        .forEach((c) => {
          list.push({
            id: String(c.categoryId || c.id || c.slug).toLowerCase(),
            label: c.name,
          });
        });
    }
    return list;
  }, [liveCategories]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchProducts(), refetchCategories()]);
  }, [refetchProducts, refetchCategories]);

  // 24-Hour products list with category and search filters
  const eligibleProducts = useMemo(() => {
    if (!Array.isArray(liveProducts)) return [];

    // Filter products: must be active and in-stock (stockQty > 0 or undefined)
    let list = liveProducts.filter((p) => {
      const is24Hr =
        p.is24HourDelivery === true ||
        (p as any).deliveryType === '24_HOURS' ||
        (p as any).express24h === true ||
        (p.active !== false && (p.stockQty ?? 1) > 0 && p.is24HourDelivery !== false);

      const inStock = p.stockQty === undefined || p.stockQty > 0;
      return is24Hr && inStock;
    });

    // Apply category filter
    if (selectedCategory !== 'all') {
      const catKey = selectedCategory.toLowerCase();
      list = list.filter((p) => {
        const catId = String(p.categoryId || '').toLowerCase();
        const subId = String(p.subcategoryId || '').toLowerCase();
        const title = (p.title || p.name || '').toLowerCase();
        return catId === catKey || subId === catKey || title.includes(catKey);
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const title = (p.title || p.name || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        return title.includes(q) || brand.includes(q);
      });
    }

    return list;
  }, [liveProducts, selectedCategory, searchQuery]);

  const handleCheckout = () => {
    const isServiceable = selectedSite ? isHyderabadServiceable(selectedSite) : true;
    if (!isServiceable) {
      Alert.alert(
        '📍 24-Hr Delivery Restricted',
        `24-Hour Express delivery is only available within Hyderabad.\n\nYour current location "${selectedSite?.name || "Selected site"}" is outside Hyderabad. Please change your delivery site.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Select Hyderabad Site', onPress: () => setLocationModalVisible(true) }
        ]
      );
      return;
    }
    closeCartSheet();
    navigation.navigate('CheckoutAddress');
  };

  return (
    <Screen scrollable={false} style={{ paddingTop: 0 }}>
      {/* Unified Premium Header Container (White/Dark theme background, clock symbol removed) */}
      <View
        style={[
          styles.premiumHeaderWrap,
          {
            backgroundColor: theme.colors.background,
            borderBottomColor: isDark ? '#334155' : '#E2E8F0',
            borderBottomWidth: 1,
            paddingTop: insets.top + 6,
          },
        ]}
      >
        {/* Row 1: Back Button, 24 Hours Logo, Vertical Divider, Location details */}
        <View style={styles.premiumHeaderTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButtonCircle}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          {/* Brand Logo */}
          <View style={styles.brandTextCol}>
            <Text style={[styles.brand24Text, { color: theme.colors.textPrimary }]}>24Hours</Text>
            <Text style={[styles.brandHoursText, { color: isDark ? '#FDB913' : '#D97706' }]}>Express Delivery</Text>
          </View>

          {/* Vertical Divider */}
          <View style={[styles.verticalDivider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />

          {/* Location Delivery Selector dropdown */}
          <TouchableOpacity
            onPress={() => setLocationModalVisible(true)}
            activeOpacity={0.8}
            style={styles.locationSelectorBtn}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.locationDeliverLabel, { color: theme.colors.textTertiary }]} numberOfLines={1}>
                Deliver to {selectedSite?.city || 'Location'}
              </Text>
              <Text style={[styles.locationActiveName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {selectedSite?.name || 'Choose Delivery Location'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={theme.colors.textPrimary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>

        {/* Row 2: Search Input and Cart Icon */}
        <View style={styles.premiumHeaderBottomRow}>
          <View style={[styles.searchBarContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <Ionicons name="search" size={18} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginRight: 8 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search Product,Category,Brands.."
              placeholderTextColor="#94A3B8"
              style={[styles.searchBarText, { color: theme.colors.textPrimary }]}
              clearButtonMode="while-editing"
            />
            {Boolean(searchQuery) && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={openCartSheet}
            activeOpacity={0.7}
            style={[
              styles.cartIconButton,
              { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
            ]}
          >
            <Ionicons name="cart" size={24} color={theme.colors.textPrimary} />
            {expressCartCount > 0 && (
              <View style={styles.cartBadgeCircle}>
                <Text style={styles.cartBadgeCountText}>{expressCartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View
        style={{
          flex: 1,
          opacity: screenFadeAnim,
          transform: [{ translateY: screenSlideAnim }, { scale: screenScaleAnim }],
        }}
      >
        {/* ── STATE 1: LOCATION OUTSIDE HYDERABAD (STRICT RESTRICTION VIEW) ── */}
        {!isServiceable ? (
          <View style={styles.restrictionContainer}>
            <View
              style={[
                styles.restrictionCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.restrictionIconBox}>
                <Ionicons name="location-outline" size={38} color="#EF4444" />
              </View>

              <Text style={[styles.restrictionTitle, { color: theme.colors.textPrimary }]}>
                Available Strictly in Hyderabad
              </Text>

              <Text style={[styles.restrictionBody, { color: theme.colors.textSecondary }]}>
                24-Hour Express Dispatch is currently operational exclusively within the Hyderabad metropolitan area.
              </Text>

              <View
                style={[
                  styles.currentLocationBox,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                <Text style={[styles.currentLocationLabel, { color: theme.colors.textTertiary }]}>
                  Selected Location:
                </Text>
                <Text style={[styles.currentLocationValue, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                  {selectedSite?.name || 'Select Location'} • {selectedSite?.city || 'Hyderabad'}, {selectedSite?.country || 'India'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setLocationModalVisible(true)}
                activeOpacity={0.85}
                style={styles.changeAddressPrimaryBtn}
              >
                <LinearGradient
                  colors={['#EF4444', '#E31E24']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnGradient}
                >
                  <Ionicons name="location" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.btnPrimaryText}>Select Hyderabad Delivery Site</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('ProductList', { title: 'All Products' })}
                activeOpacity={0.7}
                style={[styles.browseStandardBtn, { borderColor: isDark ? '#475569' : '#CBD5E1' }]}
              >
                <Text style={[styles.browseStandardText, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                  Browse Standard Delivery Catalog
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ── STATE 2: HYDERABAD SERVICEABLE (24-HR CATALOG VIEW) ── */
          <FlatList
            data={eligibleProducts}
            keyExtractor={(item) => String(item.productId || item.id)}
            numColumns={2}
            contentContainerStyle={[
              styles.catalogScrollContent,
              eligibleProducts.length === 0 && { flexGrow: 1 },
              { paddingBottom: Math.max(insets.bottom, 20) + 100 },
            ]}
            columnWrapperStyle={eligibleProducts.length > 0 ? styles.gridRow : undefined}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isProductsRefreshing}
                onRefresh={handleRefresh}
                tintColor="#E31E24"
                colors={['#E31E24']}
              />
            }
            ListHeaderComponent={
              <View style={styles.catalogHeaderWrap}>
                {/* Category Filter Pills */}
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={categoryFilters}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.filterPillsScroll}
                  renderItem={({ item }) => {
                    const isSelected = selectedCategory === item.id;
                    return (
                      <TouchableOpacity
                        onPress={() => setSelectedCategory(item.id)}
                        activeOpacity={0.75}
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: isSelected
                              ? '#E31E24'
                              : (isDark ? '#1E293B' : '#FFFFFF'),
                            borderColor: isSelected
                              ? '#E31E24'
                              : (isDark ? '#334155' : '#E2E8F0'),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            {
                              color: isSelected
                                ? '#FFFFFF'
                                : (isDark ? '#CBD5E1' : '#475569'),
                              fontFamily: isSelected ? 'Inter_700Bold' : 'Inter_500Medium',
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />

                {/* Results Count & Live Status Strip */}
                <View style={styles.resultsCountBar}>
                  <Text style={[styles.resultsCountText, { color: theme.colors.textSecondary }]}>
                    Showing <Text style={{ fontFamily: 'Inter_700Bold', color: theme.colors.textPrimary }}>{eligibleProducts.length}</Text> fast-delivery products
                  </Text>
                  <View style={styles.liveDispatchTag}>
                    <View style={styles.greenLiveDot} />
                    <Text style={styles.liveDispatchText}>Live Dispatch Active</Text>
                  </View>
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.productCardCol}>
                <ProductCard
                  product={{
                    ...item,
                    is24HourDelivery: true,
                  }}
                  onPress={() =>
                    navigation.navigate('ProductDetail', {
                      productId: String(item.productId || item.id),
                      product: item,
                    })
                  }
                  style={{ width: '100%', marginBottom: 12 }}
                />
              </View>
            )}
            ListEmptyComponent={
              isProductsLoading ? (
                <View style={styles.skeletonGrid}>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                    <ProductCardSkeleton style={{ flex: 1 }} />
                    <ProductCardSkeleton style={{ flex: 1 }} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <ProductCardSkeleton style={{ flex: 1 }} />
                    <ProductCardSkeleton style={{ flex: 1 }} />
                  </View>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="cube-outline" size={48} color="#94A3B8" style={{ marginBottom: 10 }} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                    No 24 Hr Products Found
                  </Text>
                  <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
                    {searchQuery.trim()
                      ? `No 24-hour items matched "${searchQuery}".`
                      : 'There are currently no items in this filter category.'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      refetchProducts();
                    }}
                    style={styles.viewAll24HrBtn}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="flash" size={14} color="#152238" style={{ marginRight: 6 }} />
                    <Text style={styles.viewAll24HrBtnText}>View All 24 Hr Products</Text>
                  </TouchableOpacity>
                </View>
              )
            }
          />
        )}
      </Animated.View>

      {/* Floating Cart Bar (Modern Quick Commerce Accent) */}
      {expressCartCount > 0 && !isCartSheetOpen && (
        <Animated.View
          style={[
            styles.floatingCartBar,
            {
              transform: [{ scale: cartBarScale }],
              bottom: Math.max(insets.bottom, 15),
            },
          ]}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.floatingCartGradient}
          >
            <View style={styles.floatingCartLeft}>
              <View style={styles.floatingCartBadge}>
                <Text style={styles.floatingCartBadgeText}>{expressCartCount}</Text>
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.floatingCartSubtotal}>{formatPrice(expressCartSubtotal)}</Text>
                <Text style={styles.floatingCartDeliverText}>Guaranteed 24-Hr Delivery</Text>
              </View>
            </View>
            <TouchableOpacity onPress={openCartSheet} activeOpacity={0.85} style={styles.floatingCartRightBtn}>
              <Text style={styles.floatingCartRightText}>View Cart</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Slide-Up Bottom Sheet Cart Backdrop */}
      {isCartSheetOpen && (
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeCartSheet}
          />
        </Animated.View>
      )}

      {/* Slide-Up Bottom Sheet Cart Container */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            transform: [{ translateY: sheetTranslateY }],
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        <View style={styles.sheetHeader}>
          <View style={styles.sheetHeaderHandle} />
          <View style={styles.sheetHeaderRow}>
            <View>
              <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>24 Hours Express Delivery</Text>
              <Text style={[styles.sheetSubTitle, { color: theme.colors.textSecondary }]}>
                {expressCartCount} {expressCartCount === 1 ? 'item' : 'items'} in your express cart
              </Text>
            </View>
            <TouchableOpacity onPress={closeCartSheet} style={[styles.sheetCloseBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
              <Ionicons name="close" size={20} color={isDark ? '#CBD5E1' : '#64748B'} />
            </TouchableOpacity>
          </View>
        </View>

        {expressCartItems.length === 0 ? (
          <View style={styles.sheetEmptyWrap}>
            <Ionicons name="cart-outline" size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
            <Text style={[styles.sheetEmptyText, { color: theme.colors.textSecondary }]}>Your 24-Hr Express Cart is empty</Text>
          </View>
        ) : (
          <>
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {expressCartItems.map((item: any) => {
                const primaryImg =
                  (item?.product as any)?.image ||
                  (item?.product as any)?.imageUrl ||
                  (Array.isArray(item?.product?.images) && typeof item.product.images[0] === 'string'
                    ? item.product.images[0]
                    : item?.product?.images?.[0]?.url) ||
                  '';
                const itemName = item?.product?.name || (item as any)?.name || 'Construction Material';
                const unitPrice = item?.unitPrice || 0;
                const totalPrice = item?.totalPrice || unitPrice * (item?.quantity || 1);
                const itemUnit = item?.product?.unit || (item as any)?.unit || 'Unit';

                return (
                  <View key={item.id} style={[styles.sheetItemRow, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    <Image source={{ uri: primaryImg }} style={styles.sheetItemImg} contentFit="cover" />
                    <View style={styles.sheetItemDetails}>
                      <Text numberOfLines={2} style={[styles.sheetItemName, { color: theme.colors.textPrimary }]}>
                        {itemName}
                      </Text>
                      <Text style={[styles.sheetItemPriceText, { color: theme.colors.textSecondary }]}>
                        {formatPrice(unitPrice)} / {itemUnit}
                      </Text>
                    </View>
                    <View style={styles.sheetItemActions}>
                      <Text style={[styles.sheetItemTotal, { color: theme.colors.textPrimary }]}>
                        {formatPrice(totalPrice)}
                      </Text>
                      <View style={styles.sheetStepperRow}>
                        <TouchableOpacity
                          onPress={() => handleUpdateQty(item.id, item.quantity - 1)}
                          style={[styles.stepperBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
                        >
                          <Ionicons name="remove" size={14} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.stepperQty, { color: theme.colors.textPrimary }]}>{item.quantity}</Text>
                        <TouchableOpacity
                          onPress={() => handleUpdateQty(item.id, item.quantity + 1)}
                          style={[styles.stepperBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
                        >
                          <Ionicons name="add" size={14} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Delivery Info */}
              <View style={[styles.sheetInfoCard, { backgroundColor: isDark ? '#082F49' : '#F0F9FF', borderColor: isDark ? '#0284C7' : '#BAE6FD' }]}>
                <Ionicons name="flash" size={18} color="#0EA5E9" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.sheetInfoTitle, { color: isDark ? '#38BDF8' : '#0369A1' }]}>⚡ Guaranteed Delivery within 24 Hours</Text>
                  <Text style={[styles.sheetInfoDesc, { color: isDark ? '#93C5FD' : '#0284C7' }]}>
                    Operational strictly within Hyderabad municipal zones. No delivery mix-ups with regular freight catalog.
                  </Text>
                </View>
              </View>

              {/* Location details */}
              <View style={[styles.sheetInfoCard, { backgroundColor: isDark ? '#1C1917' : '#FFFBEB', borderColor: isDark ? '#44403C' : '#FEF3C7', marginTop: 10 }]}>
                <Ionicons name="location" size={18} color="#D97706" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.sheetInfoTitle, { color: isDark ? '#F59E0B' : '#B45309' }]}>📍 Delivering to {selectedSite?.city || 'Location'}</Text>
                  <Text style={[styles.sheetInfoDesc, { color: isDark ? '#FCD34D' : '#D97706' }]}>
                    {selectedSite?.name || 'Site'} — {selectedSite?.address || 'Select address'}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={[styles.sheetSummaryContainer, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
              <View style={styles.sheetSubtotalRow}>
                <Text style={[styles.sheetSubtotalLabel, { color: theme.colors.textSecondary }]}>Subtotal</Text>
                <Text style={[styles.sheetSubtotalVal, { color: theme.colors.textPrimary }]}>{formatPrice(expressCartSubtotal)}</Text>
              </View>
              <TouchableOpacity
                onPress={handleCheckout}
                style={[styles.sheetCheckoutBtn, { backgroundColor: '#F59E0B' }]}
                activeOpacity={0.88}
              >
                <Text style={styles.sheetCheckoutBtnText}>Proceed to 24-Hr Checkout</Text>
                <Ionicons name="arrow-forward" size={16} color="#152238" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>

      {/* Location Picker Modal */}
      <LocationPickerModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        selectedSite={selectedSite || undefined}
        onSelectSite={(site) => {
          hasUserSelectedSiteRef.current = true;
          setSelectedSite(site);
          setLocationModalVisible(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  locationBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationLabelText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  locationNameText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    marginTop: 1,
  },
  changeLocationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(253, 185, 19, 0.12)',
    gap: 3,
  },
  changeLocationText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#D97706',
  },
  restrictionContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  restrictionCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12 }
      : { elevation: 4 }),
  },
  restrictionIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  restrictionTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 19,
    textAlign: 'center',
    marginBottom: 8,
  },
  restrictionBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  currentLocationBox: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  currentLocationLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  currentLocationValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
  },
  changeAddressPrimaryBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  btnPrimaryText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  browseStandardBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  browseStandardText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  catalogScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  catalogHeaderWrap: {
    marginBottom: 10,
  },
  expressHeroBanner: {
    padding: 18,
    borderRadius: 20,
    marginBottom: 14,
  },
  expressBadgeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  expressBadgeTagText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#FDB913',
    letterSpacing: 0.6,
  },
  expressHeroTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 23,
    marginBottom: 4,
  },
  expressHeroSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#D1FAE5',
    lineHeight: 17,
    marginBottom: 12,
  },
  trustPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  trustPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10.5,
    color: '#FFFFFF',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12.5,
    padding: 0,
  },
  filterPillsScroll: {
    gap: 6,
    paddingBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  resultsCountBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 4,
  },
  resultsCountText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 11.5,
  },
  liveDispatchTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  greenLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveDispatchText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 11,
    color: '#10B981',
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  productCardCol: {
    width: CARD_WIDTH,
  },
  skeletonGrid: {
    paddingTop: 10,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 360,
  },
  emptyTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySub: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  viewAll24HrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDB913',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  viewAll24HrBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 13,
    color: '#152238',
  },

  // Custom Premium Express Header (Picture 1 Integration)
  premiumHeaderWrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  premiumHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  brandTextCol: {
    justifyContent: 'center',
    paddingRight: 2,
  },
  brand24Text: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 18,
    letterSpacing: -0.4,
  },
  brandHoursText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontSize: 8,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0,
    lineHeight: 9.5,
    marginTop: 0.5,
  },
  verticalDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 8,
    alignSelf: 'center',
  },
  locationSelectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationDeliverLabel: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    lineHeight: 12,
  },
  locationActiveName: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 12.5,
    lineHeight: 15,
    marginTop: 1,
  },
  premiumHeaderBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchBarText: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
    marginVertical: 0,
    height: '100%',
  },
  cartIconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadgeCircle: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeCountText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#FFFFFF',
    lineHeight: 11,
  },

  // Floating Cart Bar (Modern Accent)
  floatingCartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 999,
  },
  floatingCartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  floatingCartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  floatingCartBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  floatingCartBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#059669',
  },
  floatingCartSubtotal: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  floatingCartDeliverText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
  },
  floatingCartRightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  floatingCartRightText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12.5,
    color: '#FFFFFF',
  },

  // Slide-Up Bottom Sheet Cart
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 1000,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    zIndex: 1001,
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 24,
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  sheetHeaderHandle: {
    width: 36,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
  },
  sheetSubTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginTop: 1,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    maxHeight: SCREEN_HEIGHT * 0.42,
    paddingHorizontal: 20,
  },
  sheetItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sheetItemImg: {
    width: 52,
    height: 52,
    borderRadius: 10,
    marginRight: 12,
  },
  sheetItemDetails: {
    flex: 1,
    marginRight: 12,
  },
  sheetItemName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    lineHeight: 18,
  },
  sheetItemPriceText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginTop: 2,
  },
  sheetItemActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  sheetItemTotal: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13.5,
  },
  sheetStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperQty: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    minWidth: 18,
    textAlign: 'center',
  },
  sheetEmptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  sheetEmptyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  sheetInfoCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  sheetInfoTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  sheetInfoDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  sheetSummaryContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    marginTop: 14,
  },
  sheetSubtotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetSubtotalLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13.5,
  },
  sheetSubtotalVal: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
  },
  sheetCheckoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  sheetCheckoutBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14.5,
    color: '#152238',
  },
});
