/**
 * HINCH MART — Premium 3-Column Categories Screen
 *
 * Senior-Level Production Implementation:
 * - Responsive 3-Column Grid (3 cards per row dynamically calculated)
 * - Premium Category Card Design System:
 *   • Aspect-preserved imagery with smooth expo-image loading & subtle gradient overlay
 *   • Soft rounded corners, subtle shadows, clean typography
 *   • Real backend subcategory counts (e.g., 4 Subcategories, 10 Subcategories)
 *   • Sleek micro-navigation indicator (›) with subtle Hinchmart red branding
 *   • Native-driven 0.97 scale-down tactile feedback
 * - Sophisticated Header: Categories title + subtitle + real-time cart badge
 * - Integrated Search: Modern rounded search bar with instant local filtering
 * - Zero Frontend Mock Data — 100% live backend API integration
 * - Smooth 3-Column Skeleton Loading State
 * - High-performance FlatList virtualization with accessible touch targets
 */
import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  StatusBar,
  TextInput,
  RefreshControl,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../theme';
import { useLiveCategories } from '../../../hooks/useLiveCategories';
import { ApiCategory } from '../../../types/category.types';
import { useAppSelector } from '../../../redux/hooks';
import { selectCartItemCount } from '../../../redux/slices/cartSlice';
import { CategoriesHubSkeleton } from '../../../components/feedback/SkeletonLoader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const COLUMN_GAP = 10;
const NUM_COLUMNS = 3;

// True responsive 3-column card width calculation
const CARD_WIDTH = Math.floor(
  (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - COLUMN_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS
);
const CARD_IMAGE_HEIGHT = Math.round(CARD_WIDTH * 0.88);

// ── Premium 3-Column Category Card Component ─────────────────────────────────
interface PremiumCategoryCardProps {
  category: ApiCategory;
  cardWidth: number;
  imageHeight: number;
  isDark: boolean;
  theme: any;
  onPress: (category: ApiCategory) => void;
}

const PremiumCategoryCard = React.memo(
  function PremiumCategoryCard({
    category,
    cardWidth,
    imageHeight,
    isDark,
    theme,
    onPress,
  }: PremiumCategoryCardProps) {
    const [imageError, setImageError] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = useCallback(() => {
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
        speed: 60,
        bounciness: 0,
      }).start();
    }, [scaleAnim]);

    const handlePressOut = useCallback(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 4,
      }).start();
    }, [scaleAnim]);

    const handlePress = useCallback(() => {
      onPress(category);
    }, [onPress, category]);

    // Real backend subcategories count
    const subCount = Array.isArray(category.subCategories) ? category.subCategories.length : 0;
    const countDisplay =
      subCount > 0
        ? `${subCount} Subcat.`
        : category.productCount
        ? String(category.productCount).replace('Products', 'Items').replace('+', '')
        : 'Explore';

    const hasValidImage = Boolean(
      category.imageUrl &&
        category.imageUrl.trim().length > 0 &&
        !category.imageUrl.includes('example.com') &&
        !imageError
    );

    return (
      <Animated.View
        style={[
          styles.cardContainer,
          {
            width: cardWidth,
            backgroundColor: theme.colors.cardBackground,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${category.name}, ${subCount} subcategories. Double tap to explore.`}
          style={styles.cardPressable}
        >
          {/* 1. Category Image Area */}
          <View
            style={[
              styles.imageContainer,
              {
                height: imageHeight,
                backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              },
            ]}
          >
            {hasValidImage ? (
              <Image
                source={{ uri: category.imageUrl }}
                style={styles.categoryImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={120}
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={styles.fallbackIconWrapper}>
                <MaterialCommunityIcons
                  name={(category.iconName as any) || 'shape-outline'}
                  size={28}
                  color={category.color || '#E31E24'}
                />
              </View>
            )}

            {/* Subtle bottom gradient on image for smooth contrast */}
            <LinearGradient
              colors={['transparent', 'rgba(0, 0, 0, 0.28)']}
              style={styles.imageGradientOverlay}
            />
          </View>

          {/* 2. Compact Metadata Area */}
          <View style={styles.metaContainer}>
            {/* Row 1: Category Name + Mini Arrow */}
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.categoryTitle,
                  { color: theme.colors.textPrimary },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {category.name}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={11}
                color="#E31E24"
                style={styles.arrowIcon}
              />
            </View>

            {/* Row 2: Subcategory Count */}
            <View style={styles.subCountRow}>
              <MaterialCommunityIcons
                name="layers-outline"
                size={12}
                color="#E31E24"
                style={styles.layersIcon}
              />
              <Text
                style={[styles.subCountText, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {countDisplay}
              </Text>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  },
  (prev, next) => {
    return (
      (prev.category.id || prev.category.categoryId) === (next.category.id || next.category.categoryId) &&
      prev.cardWidth === next.cardWidth &&
      prev.imageHeight === next.imageHeight &&
      prev.isDark === next.isDark &&
      prev.onPress === next.onPress &&
      prev.category.name === next.category.name &&
      prev.category.imageUrl === next.category.imageUrl &&
      (prev.category.subCategories?.length || 0) === (next.category.subCategories?.length || 0)
    );
  }
);

// ── Main Categories Screen Component ─────────────────────────────────────────
export function CategoriesScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const cartCount = useAppSelector(selectCartItemCount);

  // 100% Real Live Backend Categories (Zero Frontend Mock Data)
  const {
    categories: liveCategories,
    isLoading: isCategoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useLiveCategories();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filter out any artificial 'all' master categories and preserve backend ordering
  const validCategories = useMemo(() => {
    return liveCategories
      .filter((c) => c.slug !== 'all' && c.categoryId !== 'all' && c.id !== 'all')
      .sort((a, b) => {
        const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : 999;
        const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : 999;
        return orderA - orderB;
      });
  }, [liveCategories]);

  // Real-time search filtering on real category names & descriptions
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return validCategories;
    const q = searchQuery.toLowerCase().trim();
    return validCategories.filter((cat) => {
      const name = (cat.name || '').toLowerCase();
      const desc = (cat.description || '').toLowerCase();
      const slug = (cat.slug || '').toLowerCase();
      return name.includes(q) || desc.includes(q) || slug.includes(q);
    });
  }, [validCategories, searchQuery]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchCategories();
    } catch (err) {
      if (__DEV__) {
        console.log('[CategoriesScreen] Refresh notice:', err);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchCategories]);

  // Category navigation — opens unified Category & Product Listing Screen
  const handleCategoryPress = useCallback(
    (category: ApiCategory) => {
      navigation.navigate('Subcategories', {
        categoryId: String(category.categoryId || category.id),
        categoryName: category.name,
        categorySlug: category.slug,
        categoryImage: category.imageUrl,
      });
    },
    [navigation]
  );

  // Render Category Item for FlatList
  const renderCategoryItem = useCallback(
    ({ item }: { item: ApiCategory }) => {
      return (
        <PremiumCategoryCard
          category={item}
          cardWidth={CARD_WIDTH}
          imageHeight={CARD_IMAGE_HEIGHT}
          isDark={isDark}
          theme={theme}
          onPress={handleCategoryPress}
        />
      );
    },
    [isDark, theme, handleCategoryPress]
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

  return (
    <View style={[styles.screenRoot, { backgroundColor: isDark ? '#0B0F19' : '#F8FAFC' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#E31E24" translucent />

      {/* ── 1. Sophisticated Header Bar (Hinchmart Signature Red) ─────────── */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 24) }]}>
        <View style={styles.headerContentRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Categories</Text>
            <Text style={styles.headerSubtitle}>
              Explore building & improvement materials
            </Text>
          </View>

          {/* Cart Icon with Live Badge */}
          <TouchableOpacity
            onPress={handleCartPress}
            activeOpacity={0.75}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.cartBtn}
            accessibilityLabel="Open shopping cart"
            accessibilityRole="button"
          >
            <Ionicons name="cart-outline" size={24} color="#FFFFFF" />
            {cartCount > 0 && (
              <View style={styles.cartBadge} pointerEvents="none">
                <Text style={styles.cartBadgeText}>
                  {cartCount > 99 ? '99+' : cartCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 2. Modern Rounded Search Bar ──────────────────────────────────── */}
      <View
        style={[
          styles.searchSectionWrap,
          {
            backgroundColor: isDark ? '#0B0F19' : '#F8FAFC',
            borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#EEF2F6',
          },
        ]}
      >
        <View
          style={[
            styles.searchBarBox,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          <Ionicons name="search-outline" size={18} color="#E31E24" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search categories..."
            placeholderTextColor={isDark ? '#94A3B8' : '#94A3B8'}
            returnKeyType="search"
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

      {/* ── 3. 3-Column Category Grid Content Area ────────────────────────── */}
      {isCategoriesLoading && validCategories.length === 0 ? (
        <CategoriesHubSkeleton />
      ) : categoriesError && validCategories.length === 0 ? (
        <View style={styles.stateWrapper}>
          <View style={[styles.stateIconCircle, { backgroundColor: isDark ? '#1E293B' : '#FEF2F2' }]}>
            <Ionicons name="cloud-offline-outline" size={38} color="#EF4444" />
          </View>
          <Text style={[styles.stateTitle, { color: theme.colors.textPrimary }]}>
            Unable to load categories
          </Text>
          <Text style={[styles.stateSubtitle, { color: theme.colors.textSecondary }]}>
            Please check your internet connection and try again.
          </Text>
          <TouchableOpacity
            onPress={refetchCategories}
            activeOpacity={0.8}
            style={styles.retryBtn}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredCategories.length === 0 ? (
        <View style={styles.stateWrapper}>
          <View style={[styles.stateIconCircle, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <Ionicons name="search-outline" size={38} color="#94A3B8" />
          </View>
          <Text style={[styles.stateTitle, { color: theme.colors.textPrimary }]}>
            No categories found
          </Text>
          <Text style={[styles.stateSubtitle, { color: theme.colors.textSecondary }]}>
            {searchQuery
              ? `No categories matching "${searchQuery}". Try another search term.`
              : 'No categories are currently available in the catalog.'}
          </Text>
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              activeOpacity={0.8}
              style={styles.retryBtn}
            >
              <Text style={styles.retryBtnText}>Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => String(item.categoryId || item.id || item.slug)}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={[
            styles.gridContentContainer,
            { paddingBottom: Math.max(insets.bottom, 20) + 80 },
          ]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={9}
          maxToRenderPerBatch={9}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
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
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },

  // ── Header Bar ──
  headerContainer: {
    backgroundColor: '#E31E24',
    paddingHorizontal: 16,
    paddingBottom: 12,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  headerTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '800',
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 1,
    letterSpacing: 0.1,
  },
  cartBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
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
  cartBadgeText: {
    color: '#E31E24',
    fontSize: 9,
    fontWeight: '800',
  },

  // ── Search Bar Section ──
  searchSectionWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
    fontWeight: '400',
  },

  // ── Grid & Column ──
  gridContentContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 14,
  },
  columnWrapper: {
    gap: COLUMN_GAP,
    marginBottom: 12,
  },

  // ── Premium Category Card ──
  cardContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  cardPressable: {
    width: '100%',
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  fallbackIconWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageGradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 32,
  },

  // ── Card Metadata ──
  metaContainer: {
    paddingHorizontal: 7,
    paddingVertical: 7,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  categoryTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 11.5,
    flex: 1,
    letterSpacing: -0.2,
  },
  arrowIcon: {
    marginLeft: 2,
  },
  subCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  layersIcon: {
    marginTop: 0.5,
  },
  subCountText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },

  // ── State Screens (Error & Empty) ──
  stateWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    minHeight: 300,
  },
  stateIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  stateTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  stateSubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  retryBtn: {
    backgroundColor: '#E31E24',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#E31E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },
});
