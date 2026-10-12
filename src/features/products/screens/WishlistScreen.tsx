/**
 * HINCH MART — Premium Wishlist Screen
 * Animated product cards, heart-burst removal, gradient header, empty-state illustration
 */
import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Animated,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { toggleWishlist, setWishlist } from '../../../redux/slices/wishlistSlice';
import { addItem, setServerCart } from '../../../redux/slices/cartSlice';
import { useTheme } from '../../../theme';
import { formatPrice } from '../../../utils';
import { ExploreCatalogModal } from '../../../components/ui/ExploreCatalogModal';
import { ApiProduct } from '../../../types/product.types';
import { wishlistApi } from '../../../services/api/wishlist.api';
import { cartApi } from '../../../services/api/cart.api';
import { cartManager } from '../../../services/cart/cartManager';
import { useLiveProducts } from '../../../hooks/useLiveProducts';
import { authStore } from '../../../store/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

type Product = ApiProduct;

// ─── Animated Wishlist Card ───────────────────────────────────────────────────
const WishlistCard = React.memo(function WishlistCardComponent({
  item,
  onRemove,
  onAddToCart,
  onPress,
  theme,
}: {
  item: Product;
  onRemove: () => void;
  onAddToCart: () => void;
  onPress: () => void;
  theme: any;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;

  const hasDiscount = Boolean(item.discountPercent && item.discountPercent > 0);
  const savings = hasDiscount ? Math.max(0, (item.comparePrice ?? item.mrp ?? item.price) - item.price) : 0;

  const handleRemove = () => {
    Animated.sequence([
      Animated.spring(heartAnim, { toValue: 1.6, useNativeDriver: true, speed: 40, bounciness: 12 }),
      Animated.spring(heartAnim, { toValue: 1, useNativeDriver: true, speed: 40 }),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(translateXAnim, { toValue: -CARD_WIDTH, duration: 250, useNativeDriver: true }),
      ]),
    ]).start(() => {
      onRemove();
    });
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 40 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 40 }).start();
  };

  const primaryImage =
    item.imageUrl ||
    item.image ||
    (Array.isArray(item.images) && item.images.length > 0
      ? (typeof item.images[0] === 'string' ? item.images[0] : (item.images[0] as any)?.url)
      : null) ||
    '';

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }, { translateX: translateXAnim }],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={1} onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>

          {/* Discount badge */}
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>{item.discountPercent}% OFF</Text>
            </View>
          )}

          {/* Heart / remove button */}
          <TouchableOpacity style={styles.removeBtn} onPress={handleRemove} activeOpacity={0.7}>
            <Animated.View style={{ transform: [{ scale: heartAnim }] }}>
              <Ionicons name="heart" size={22} color="#EF4444" />
            </Animated.View>
          </TouchableOpacity>

          <View style={styles.cardInner}>
            {/* Image */}
            <Image
              source={{ uri: item.image || item.imageUrl }}
              style={styles.productImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />

            {/* Info */}
            <View style={styles.productInfo}>
              <Text style={[styles.brandTag, { color: theme.colors.primary }]}>{item.brand}</Text>

              <Text style={[styles.productName, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                {item.name}
              </Text>

              {/* Rating */}
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={[styles.ratingText, { color: theme.colors.textSecondary }]}>
                  {item.rating}  ({item.reviews} reviews)
                </Text>
              </View>

              {/* Price */}
              <View style={styles.priceRow}>
                <Text style={[styles.price, { color: theme.colors.textPrimary }]}>
                  {formatPrice(item.price)}
                </Text>
                {hasDiscount && savings > 0 && item.comparePrice ? (
                  <Text style={[styles.comparePrice, { color: theme.colors.textTertiary }]}>
                    {formatPrice(item.comparePrice)}
                  </Text>
                ) : null}
              </View>
              {hasDiscount && savings > 0 && (
                <View style={styles.savingsRow}>
                  <Ionicons name="pricetag-outline" size={11} color="#16A34A" />
                  <Text style={styles.savingsTag}>Save {formatPrice(savings)}  •  per {item.unit}</Text>
                </View>
              )}

              {/* Add to Cart */}
              <TouchableOpacity style={styles.cartBtnWrap} onPress={onAddToCart} activeOpacity={0.82}>
                <LinearGradient
                  colors={['#EF4444', '#E31E24']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.cartBtnGradient}
                >
                  <Ionicons name="bag-add-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.cartBtnText}>Add to Cart</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyWishlist({ navigation, theme }: { navigation: any; theme: any }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [modalVisible, setModalVisible] = useState(false);

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.13, duration: 950, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 950, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.emptyContainer}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }], marginBottom: 28 }}>
        <LinearGradient colors={['#FEE2E2', '#FECACA']} style={styles.emptyIconCircle}>
          <Ionicons name="heart-outline" size={54} color="#EF4444" />
        </LinearGradient>
      </Animated.View>

      <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
        Your Wishlist is Empty
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        Tap the{' '}
        <Text style={{ color: '#EF4444', fontFamily: 'Inter_700Bold' }}>♥</Text>
        {' '}heart on any product to save it here for later.
      </Text>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setModalVisible(true)}
        style={styles.exploreBtnWrap}
      >
        <LinearGradient
          colors={['#EF4444', '#E31E24']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.exploreBtnGradient}
        >
          <Ionicons name="grid-outline" size={16} color="#FFFFFF" />
          <Text style={styles.exploreBtnText}>Browse Products</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Enhanced Dynamic Browse Products Modal */}
      <ExploreCatalogModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onExploreProducts={() => navigation.navigate('MainTabs', { screen: 'CategoriesTab' } as any)}
        title="Browse Products Catalog"
        subtitle="Opening certified steel, cement, heavy machinery, power tools & hardware materials catalog."
        confirmText="Browse Now"
        iconName="grid-outline"
      />
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export function WishlistScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { theme } = useTheme();
  const wishlistIds: string[] = useAppSelector((state: any) => state?.wishlist?.productIds || []);
  const { products: liveProducts } = useLiveProducts();
  const [serverProducts, setServerProducts] = useState<Product[]>([]);
  const topPad = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20);

  useEffect(() => {
    let isMounted = true;
    wishlistApi.getWishlist()
      .then((items) => {
        if (!isMounted || !Array.isArray(items)) return;
        const validItems = items.filter((item) => item?.product || item?.productId);
        const mappedProducts: Product[] = validItems.map((item) => {
          const p = item.product || item;
          return {
            ...p,
            id: String(p.id || p.productId || item.productId),
            productId: String(p.productId || item.productId || p.id),
            image: p.image || p.imageUrl || '',
            imageUrl: p.imageUrl || p.image || '',
            name: p.name || p.title || '',
            title: p.title || p.name || '',
            reviews: p.reviews ?? p.reviewCount,
            comparePrice: p.comparePrice ?? p.mrp,
          } as Product;
        });
        setServerProducts(mappedProducts);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const wishlistedProducts = useMemo(() => {
    const combinedMap = new Map<string, Product>();

    // 1. Add all matching live products from catalogue
    liveProducts.forEach((p) => {
      const pid = String(p.productId || p.id);
      if (wishlistIds.includes(pid) || wishlistIds.includes(String(p.id))) {
        combinedMap.set(pid, p);
      }
    });

    // 2. Add any server products whose IDs are in wishlistIds
    serverProducts.forEach((sp) => {
      const spId = String(sp.productId || sp.id);
      if (wishlistIds.includes(spId) && !combinedMap.has(spId)) {
        combinedMap.set(spId, sp);
      }
    });

    return Array.from(combinedMap.values());
  }, [liveProducts, serverProducts, wishlistIds]);

  const handleRemove = useCallback((id: string) => {
    dispatch(toggleWishlist(id));
    setServerProducts((previous) => previous.filter((product) => String(product.id || product.productId) !== id));
    wishlistApi.removeProduct(id).catch(() => {});
  }, [dispatch]);

  const handleAddToCart = useCallback(
    async (item: Product) => {
      await cartManager.addToCart(
        dispatch,
        item,
        1,
        (item as any)?.storeId,
        navigation,
        'Wishlist'
      );
    },
    [dispatch, navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: Product }) => {
      const itemId = String(item.productId || item.id || '');
      return (
        <WishlistCard
          item={item}
          theme={theme}
          onRemove={() => handleRemove(itemId)}
          onAddToCart={() => handleAddToCart(item)}
          onPress={() => navigation.navigate('ProductDetail', { productId: itemId })}
        />
      );
    },
    [theme, handleRemove, handleAddToCart, navigation]
  );

  const wishlistKeyExtractor = useCallback((p: Product, index: number) => String(p.productId || p.id || index), []);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#E31E24" translucent />

      {/* ── Header - IBO Red Bar ── */}
      <View
        style={[styles.header, { paddingTop: topPad + 8, backgroundColor: '#E31E24', borderBottomColor: '#C4181D', borderBottomWidth: 1 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <View style={styles.backBtnInner}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="heart" size={18} color="#FFFFFF" />
              <Text style={styles.headerTitle}>My Wishlist</Text>
            </View>
            {wishlistedProducts.length > 0 && (
              <Text style={styles.headerSubtitle}>
                {wishlistedProducts.length} {wishlistedProducts.length === 1 ? 'item' : 'items'} saved
              </Text>
            )}
          </View>

          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* ── Body ── */}
      {wishlistedProducts.length === 0 ? (
        <EmptyWishlist navigation={navigation} theme={theme} />
      ) : (
        <FlatList
          data={wishlistedProducts}
          keyExtractor={wishlistKeyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    paddingBottom: 18,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerAccentLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  backBtn: { width: 40 },
  backBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.88)',
    marginTop: 2,
  },

  // List
  listContent: { padding: 14, paddingTop: 12 },

  // Card
  cardWrapper: { width: CARD_WIDTH },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 2,
    backgroundColor: '#EF4444',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountBadgeText: {
    color: '#FFF',
    fontSize: 9.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 15,
    padding: 5,
  },
  cardInner: { flexDirection: 'row', padding: 10, gap: 10 },
  productImage: {
    width: 96,
    height: 96,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  productInfo: { flex: 1, justifyContent: 'space-between' },
  brandTag: {
    fontSize: 9.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  productName: {
    fontSize: 12.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 3,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  ratingText: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  price: { fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium', fontWeight: '700' },
  comparePrice: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    textDecorationLine: 'line-through',
  },
  savingsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  savingsTag: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '500',
    color: '#16A34A',
  },
  cartBtnWrap: { borderRadius: 6, overflow: 'hidden' },
  cartBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: '#E31E24',
  },
  cartBtnText: { fontSize: 11.5, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium', fontWeight: '700', color: '#FFFFFF' },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  exploreBtnWrap: { borderRadius: 8, overflow: 'hidden' },
  exploreBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#E31E24',
  },
  exploreBtnText: { fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium', fontWeight: '700', color: '#FFFFFF' },
});
