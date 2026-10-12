/**
 * HINCH MART — Tier 3: Verified Brands & Suppliers Screen
 * Flow: Category -> Subcategory -> Brand -> Product
 * Displays all verified OEM and industrial manufacturer brands for the chosen subcategory,
 * with breadcrumbs, live search, and drilldown to Tier 4 (ProductList).
 * 100% Dynamic — Zero hardcoding.
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  TextInput,
  Platform,
  StatusBar,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useTheme } from '../../../theme';
import { useLiveBrands, resolveBrandImage } from '../../../hooks/useLiveBrands';
import { useLiveCategories } from '../../../hooks/useLiveCategories';
import { ApiBrand } from '../../../types/brand.types';
import { useAppSelector } from '../../../redux/hooks';
import { selectCartItemCount } from '../../../redux/slices/cartSlice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 14;
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - CARD_GAP) / 2;

const DEFAULT_GRADIENTS: Array<[string, string]> = [
  ['#0F172A', '#1E293B'],
  ['#1E1B4B', '#312E81'],
  ['#1E3A8A', '#1D4ED8'],
  ['#064E3B', '#047857'],
  ['#701A75', '#A21CAF'],
  ['#7C2D12', '#C2410C'],
];

interface BrandCardItemProps {
  item: ApiBrand;
  index: number;
  isDark: boolean;
  theme: any;
  onSelect: (brand: ApiBrand) => void;
}

const BrandCardItem = React.memo(function BrandCardItem({
  item,
  index,
  isDark,
  theme,
  onSelect,
}: BrandCardItemProps) {
  const brandImg = resolveBrandImage(item, item.imageUrl || item.logoUrl || (item as any).image || (item as any).logo);
  const grad = item.gradient || DEFAULT_GRADIENTS[index % DEFAULT_GRADIENTS.length];

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={() => onSelect(item)}
      style={[
        styles.brandCard,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        },
      ]}
    >
      {/* Top Verified Pill */}
      <View style={styles.cardTopRow}>
        <View
          style={[
            styles.verifiedPill,
            {
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.14)' : '#ECFDF5',
              borderColor: isDark ? 'rgba(16, 185, 129, 0.28)' : '#A7F3D0',
            },
          ]}
        >
          <Ionicons name="shield-checkmark" size={10} color="#10B981" style={{ marginRight: 3 }} />
          <Text style={styles.verifiedPillText}>OEM VERIFIED</Text>
        </View>
      </View>

      {/* Large Round Brand Emblem / Logo Disc */}
      <View style={styles.emblemContainer}>
        <View
          style={[
            styles.roundEmblem,
            {
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(227, 30, 36, 0.12)',
            },
          ]}
        >
          {brandImg ? (
            <Image
              source={{ uri: brandImg }}
              style={styles.roundLogoImage}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <LinearGradient
              colors={grad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientCircle}
            >
              <MaterialCommunityIcons
                name={(item.iconName as any) || 'factory'}
                size={36}
                color="#FFFFFF"
              />
            </LinearGradient>
          )}
        </View>
      </View>

      {/* Brand Content */}
      <View style={styles.cardInfoWrap}>
        <View style={styles.brandTitleRow}>
          <Text style={[styles.brandName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Ionicons name="checkmark-circle" size={13} color="#10B981" style={{ marginLeft: 3 }} />
        </View>

        <Text style={[styles.brandCategory, { color: theme.colors.textTertiary }]} numberOfLines={1}>
          {item.subcategoryName || item.categoryName || 'Verified Supplier'}
        </Text>

        {/* Round Action Button Pill */}
        <View
          style={[
            styles.actionPill,
            {
              backgroundColor: isDark ? 'rgba(227, 30, 36, 0.12)' : '#FEF2F2',
              borderColor: isDark ? 'rgba(227, 30, 36, 0.28)' : 'rgba(227, 30, 36, 0.2)',
            },
          ]}
        >
          <Ionicons name="cube-outline" size={11.5} color="#E31E24" style={{ marginRight: 4 }} />
          <Text style={styles.actionPillText} numberOfLines={1}>
            {item.productCount ? `${item.productCount} Products` : 'View Catalog'}
          </Text>
          <Ionicons name="chevron-forward" size={11} color="#E31E24" style={{ marginLeft: 2 }} />
        </View>
      </View>
    </TouchableOpacity>
  );
});

function BrandSkeletonCard({ isDark }: { isDark: boolean }) {
  const bgCard = isDark ? '#1E293B' : '#FFFFFF';
  const shimmerBg = isDark ? 'rgba(255, 255, 255, 0.07)' : '#F1F5F9';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

  return (
    <View style={[styles.brandCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
      <View style={[styles.verifiedPill, { backgroundColor: shimmerBg, borderColor: 'transparent', width: 75, height: 16, marginBottom: 8 }]} />
      <View style={[styles.roundEmblem, { backgroundColor: shimmerBg, borderColor: 'transparent', width: 88, height: 88, borderRadius: 44 }]} />
      <View style={{ width: '80%', height: 14, backgroundColor: shimmerBg, borderRadius: 7, marginTop: 12, marginBottom: 6 }} />
      <View style={{ width: '55%', height: 10, backgroundColor: shimmerBg, borderRadius: 5, marginBottom: 12 }} />
      <View style={[styles.actionPill, { backgroundColor: shimmerBg, borderColor: 'transparent', height: 28 }]} />
    </View>
  );
}

function BrandSkeletonGrid({ isDark }: { isDark: boolean }) {
  return (
    <View style={{ width: '100%', paddingTop: 4 }}>
      <View style={styles.gridRow}>
        <BrandSkeletonCard isDark={isDark} />
        <BrandSkeletonCard isDark={isDark} />
      </View>
      <View style={styles.gridRow}>
        <BrandSkeletonCard isDark={isDark} />
        <BrandSkeletonCard isDark={isDark} />
      </View>
      <View style={styles.gridRow}>
        <BrandSkeletonCard isDark={isDark} />
        <BrandSkeletonCard isDark={isDark} />
      </View>
    </View>
  );
}

export function BrandsScreen({ navigation, route }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const cartCount = useAppSelector(selectCartItemCount);

  const subcategoryId = route?.params?.subcategoryId;
  const subcategoryName = route?.params?.subcategoryName;
  const categoryId = route?.params?.categoryId;
  const categoryName = route?.params?.categoryName;

  const {
    brands: liveBrands,
    isLoading: isBrandsLoading,
    isRefreshing: isBrandsRefreshing,
    refetch: refetchBrands,
  } = useLiveBrands(subcategoryId, categoryId);

  const { categories: liveCategories } = useLiveCategories();

  const domainFilters = useMemo(() => {
    const validCats = liveCategories.filter((c) => c.slug !== 'all' && c.categoryId !== 'all').map((c) => c.name);
    return ['All Suppliers', ...validCats];
  }, [liveCategories]);

  const [selectedDomain, setSelectedDomain] = useState('All Suppliers');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBrands: ApiBrand[] = useMemo(() => {
    return liveBrands.filter((brand: ApiBrand) => {
      const matchesDomain =
        Boolean(subcategoryId) ||
        selectedDomain === 'All Suppliers' ||
        (brand.categoryName || '').toLowerCase().includes(selectedDomain.toLowerCase().split(' ')[0]);

      const matchesSearch =
        searchQuery.trim() === '' ||
        brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (brand.subcategoryName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (brand.tagline || '').toLowerCase().includes(searchQuery.toLowerCase());

      return matchesDomain && matchesSearch;
    });
  }, [liveBrands, selectedDomain, searchQuery, subcategoryId]);

  const handleSelectBrand = useCallback((brand: ApiBrand) => {
    navigation.navigate('ProductList', {
      brandId: brand.brandId ?? brand.id,
      brandName: brand.name,
      brand: brand.name,
      subcategoryId: brand.subcategoryId || subcategoryId,
      subcategoryName: brand.subcategoryName || subcategoryName,
      categoryId: brand.categoryId || categoryId,
      categoryName: brand.categoryName || categoryName,
      title: `${brand.name} Products`,
    });
  }, [navigation, subcategoryId, subcategoryName, categoryId, categoryName]);

  const handleViewAllInSubcategory = useCallback(() => {
    navigation.navigate('ProductList', {
      subcategoryId: subcategoryId,
      subCategoryId: subcategoryId,
      subcategoryName: subcategoryName,
      categoryId: categoryId,
      categoryName: categoryName,
      title: `${subcategoryName || 'Subcategory'} Products`,
    });
  }, [navigation, subcategoryId, subcategoryName, categoryId, categoryName]);

  const renderBrandItem = useCallback(
    ({ item, index }: { item: ApiBrand; index: number }) => (
      <BrandCardItem
        item={item}
        index={index}
        isDark={isDark}
        theme={theme}
        onSelect={handleSelectBrand}
      />
    ),
    [isDark, theme, handleSelectBrand]
  );

  const keyExtractor = useCallback((item: ApiBrand, index: number) => {
    return String(item.brandId ?? item.id ?? index);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#E31E24" translucent />

      {/* Top Header - IBO Red Bar */}
      <View
        style={[
          styles.topHeader,
          {
            paddingTop: insets.top + 6,
            backgroundColor: '#E31E24',
            borderBottomColor: '#C4181D',
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={[styles.backBtn, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            {/* Dynamic Breadcrumbs: Tier 1 -> Tier 2 -> Tier 3 */}
            {Boolean(subcategoryId || categoryId) ? (
              <View style={styles.breadcrumbRow}>
                <TouchableOpacity onPress={() => navigation.navigate('CategoriesTab')}>
                  <Text style={[styles.breadcrumbText, { color: 'rgba(255, 255, 255, 0.75)' }]}>
                    {categoryName || 'Category'}
                  </Text>
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={10} color="rgba(255, 255, 255, 0.75)" style={{ marginHorizontal: 3 }} />
                <Text style={[styles.breadcrumbActive, { color: '#FFFFFF' }]} numberOfLines={1}>
                  {subcategoryName || 'Subcategory'}
                </Text>
              </View>
            ) : (
              <Text style={[styles.headerSub, { color: 'rgba(255, 255, 255, 0.85)' }]}>TIER 3 • OEM BRANDS</Text>
            )}
            <Text style={[styles.headerTitle, { color: '#FFFFFF' }]} numberOfLines={1}>
              {subcategoryName ? `Select ${subcategoryName} Brand` : 'Verified Suppliers'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Cart')}
            activeOpacity={0.7}
            style={[styles.headerRightBtn, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
          >
            <Ionicons name="cart-outline" size={22} color="#FFFFFF" />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={[styles.searchBox, { backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF', borderColor: isDark ? '#3A3A3A' : '#E2E8F0' }]}>
          <Ionicons name="search-outline" size={18} color="#E31E24" style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={subcategoryName ? `Search ${subcategoryName} brands...` : 'Search verified brand or supplier...'}
            placeholderTextColor={isDark ? '#888888' : '#94A3B8'}
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Brands Grid List */}
      <FlatList
        data={filteredBrands}
        numColumns={2}
        columnWrapperStyle={filteredBrands.length > 0 ? styles.gridRow : undefined}
        contentContainerStyle={[
          styles.gridContainer,
          { paddingBottom: Math.max(insets.bottom, 20) + 40 },
          filteredBrands.length === 0 && { flexGrow: 1 },
        ]}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={isBrandsRefreshing}
            onRefresh={refetchBrands}
            tintColor="#E31E24"
            colors={['#E31E24']}
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeaderWrap}>
            {/* Domain category chips (only when browsing all suppliers globally) */}
            {!subcategoryId && (
              <View style={styles.domainTabsWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.domainScroll}>
                  {domainFilters.map((domain) => {
                    const isSelected = selectedDomain === domain;
                    return (
                      <TouchableOpacity
                        key={domain}
                        onPress={() => setSelectedDomain(domain)}
                        style={[
                          styles.domainChip,
                          isSelected
                            ? { backgroundColor: '#E31E24', borderColor: '#E31E24', borderWidth: 1 }
                            : { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder, borderWidth: 1 },
                        ]}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.domainChipText,
                            {
                              color: isSelected ? '#FFFFFF' : theme.colors.textSecondary,
                              fontFamily: isSelected ? 'Inter_700Bold' : 'Inter_500Medium',
                            },
                          ]}
                        >
                          {domain}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Subcategory Hero Banner (when navigated with specific subcategory) */}
            {Boolean(subcategoryName) && (
              <LinearGradient
                colors={isDark ? ['#1E293B', '#0F172A'] : ['#1E293B', '#0F172A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.subcatBanner}
              >
                <View style={styles.subcatGradient}>
                  <View style={styles.subcatLeftCol}>
                    <View style={styles.tierTag}>
                      <Text style={styles.tierTagText}>OFFICIAL MANUFACTURERS</Text>
                    </View>
                    <Text style={styles.subcatTitle} numberOfLines={1}>
                      {subcategoryName}
                    </Text>
                    <Text style={styles.subcatSub}>
                      Direct OEM suppliers with guaranteed factory pricing
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleViewAllInSubcategory}
                    activeOpacity={0.8}
                    style={styles.subcatActionBtn}
                  >
                    <Text style={styles.subcatActionBtnText}>All Items</Text>
                    <Ionicons name="arrow-forward" size={11} color="#FFFFFF" style={{ marginLeft: 3 }} />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            )}

            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  {subcategoryName ? `Available Brands` : 'Verified OEM Brands'}
                </Text>
                <View style={styles.sectionCountBadge}>
                  <Text style={styles.sectionCountText}>
                    {filteredBrands.length}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        }
        renderItem={renderBrandItem}
        ListEmptyComponent={
          isBrandsLoading ? (
            <BrandSkeletonGrid isDark={isDark} />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="business-outline" size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                No Brands Found
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                {searchQuery.trim()
                  ? `No brands matched "${searchQuery}".`
                  : 'No specific brands are listed under this subcategory yet.'}
              </Text>
              {Boolean(subcategoryId) && (
                <TouchableOpacity
                  onPress={handleViewAllInSubcategory}
                  style={styles.emptyActionBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyActionBtnText}>Browse All Products</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 10,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  breadcrumbActive: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    lineHeight: 20,
    marginTop: 1,
  },
  headerSub: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  headerRightBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
    lineHeight: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'ios'
      ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      }
      : { elevation: 2 }),
  },
  searchInput: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 13,
    paddingVertical: 0,
    height: '100%',
  },
  domainTabsWrapper: {
    marginBottom: 12,
  },
  domainScroll: {
    gap: 8,
  },
  domainChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  domainChipText: {
    fontSize: 12,
  },
  gridContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  gridRow: {
    justifyContent: 'flex-start',
    gap: CARD_GAP,
    marginBottom: 14,
  },
  listHeaderWrap: {
    marginBottom: 12,
  },
  subcatBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
  },
  subcatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  subcatLeftCol: {
    flex: 1,
    marginRight: 10,
  },
  tierTag: {
    backgroundColor: 'rgba(253, 185, 19, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 5,
  },
  tierTagText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 9,
    color: '#FDB913',
    letterSpacing: 0.4,
  },
  subcatTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 2,
  },
  subcatSub: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 15,
  },
  subcatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E31E24',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  subcatActionBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 11,
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 15,
  },
  sectionCountBadge: {
    backgroundColor: 'rgba(227, 30, 36, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  sectionCountText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 12,
    color: '#E31E24',
  },
  brandCard: {
    width: CARD_WIDTH,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 12,
    paddingTop: 10,
    paddingBottom: 14,
    alignItems: 'center',
    ...(Platform.OS === 'ios'
      ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      }
      : { elevation: 3 }),
  },
  cardTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  verifiedPillText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 8.5,
    color: '#059669',
    letterSpacing: 0.4,
  },
  emblemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  roundEmblem: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...(Platform.OS === 'ios'
      ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      }
      : { elevation: 2 }),
  },
  roundLogoImage: {
    width: '80%',
    height: '80%',
  },
  gradientCircle: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfoWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '92%',
    marginBottom: 2,
  },
  brandName: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
  },
  brandCategory: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 10,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6.5,
    borderRadius: 18,
    borderWidth: 1,
    width: '100%',
  },
  actionPillText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 11,
    color: '#E31E24',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    minHeight: 260,
  },
  emptyTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14,
  },
  emptyActionBtn: {
    backgroundColor: '#E31E24',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 6,
  },
  emptyActionBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 12.5,
    color: '#FFFFFF',
  },
});
