/**
 * HINCH MART — Pixel-Perfect Home Screen matching reference UI mockup
 * - Clean Top Header: HinchMart logo, notification bell with badge (3), cart icon with badge (2)
 * - Location Delivery Bar: Yellow pin, "Deliver to: Manikonda, Hyderabad ▾"
 * - Search Bar with scanner icon on right
 * - Hero Carousel Banner: "Fresh Organic Farm Harvest", "UP TO 30% OFF", "Shop Now →", pagination dots
 * - 4 Value Badges: Top Quality, Fast Delivery, Best Prices, Secure Payment
 * - Explore Categories: 4x2 Clean White Cards with direct product studio photography (No inner grey boxes)
 * - "Bulk Order?" Banner: "Get special discounts on bulk purchases", "Request a Quote →", "SAVE MORE" badge
 */
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  Platform,
  ScrollView,
  StatusBar,
  Modal,
  RefreshControl,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme';
import {
  LocationPickerModal,
  PRESET_DELIVERY_SITES,
  DeliverySite,
  customerAddressToDeliverySite,
} from '../../../components/ui/LocationPickerModal';
import { authStore } from '../../../store/authStore';
import { addressesApi } from '../../../services/api/addresses.api';
import { Express24OpeningAnimation } from '../../../components/animations/Express24OpeningAnimation';
import { isHyderabadServiceable } from '../../../services/delivery/serviceability.service';
import { BarcodeScannerModal } from '../../../components/ui/BarcodeScannerModal';
import * as Location from 'expo-location';
import { useHotDeals } from '../../../hooks/useHotDeals';
import { useLiveCategories } from '../../../hooks/useLiveCategories';
import { HomeSideDrawer } from '../components/HomeSideDrawer';
import { HomePromotionalVideoCard } from '../components/HomePromotionalVideoCard';
import { invalidatePromotionalVideoCache } from '../../../hooks/useLivePromotionalVideo';
import { ApiCategory } from '../../../types/category.types';
import { ProductCard } from '../../../components/cards/ProductCard';
import { useAppSelector } from '../../../redux/hooks';
import { selectCartItemCount } from '../../../redux/slices/cartSlice';
import {
  HomeScreenCategoriesSkeleton,
  HomeScreenTrendingSkeleton,
  HomeScreenMoreCategoriesSkeleton,
} from '../../../components/feedback/SkeletonLoader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 8;
const CATEGORY_CARD_WIDTH = Math.floor((SCREEN_WIDTH - (GRID_PADDING * 2) - (3 * GRID_GAP)) / 4);
const CATEGORY_IMAGE_HEIGHT = Math.round(CATEGORY_CARD_WIDTH * 0.88);

const MORE_CATEGORY_CARD_WIDTH = Math.floor((SCREEN_WIDTH - (GRID_PADDING * 2) - GRID_GAP) / 2);
const MORE_CATEGORY_IMAGE_HEIGHT = Math.round(MORE_CATEGORY_CARD_WIDTH * 0.62);

export interface BrandItem {
  id: string;
  name: string;
  tagline: string;
  category: string;
  badge: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  gradient: [string, string];
  productCount: string;
}

export interface ValueBadgeItem {
  id: string;
  title: string;
  subtitle: string;
  iconName: any;
  color: string;
  badgeLabel: string;
  headline: string;
  description: string;
  points: string[];
  primaryCtaText: string;
  primaryRoute: string;
  primaryParams?: any;
  secondaryCtaText?: string;
  secondaryRoute?: string;
  secondaryParams?: any;
}

// 4 Interactive Value Proposition Badges with full functionality
const VALUE_BADGES: ValueBadgeItem[] = [
  {
    id: 'v1',
    title: 'Top Quality',
    subtitle: 'Verified Suppliers',
    iconName: 'ribbon-outline' as const,
    color: '#8B5CF6',
    badgeLabel: '100% QUALITY ASSURED',
    headline: 'Verified Manufacturers & Direct OEM Sourcing',
    description:
      'Every product on HINCH MART is sourced directly from BIS & ISO-certified verified manufacturers with rigorous quality inspection.',
    points: [
      'Direct sourcing from authorized OEM brands',
      'Batch test certificates & Mill Test Certificates (MTC)',
      '100% quality guarantee with instant replacement warranty',
    ],
    primaryCtaText: 'Browse Verified Brands',
    primaryRoute: 'Brands',
    secondaryCtaText: 'Explore Quality Catalog',
    secondaryRoute: 'ProductList',
    secondaryParams: { isBestSeller: true, title: 'Top Quality & Verified Products' },
  },
  {
    id: 'v2',
    title: '24 Hours',
    subtitle: 'Express Delivery',
    iconName: 'flash-outline' as const,
    color: '#F59E0B',
    badgeLabel: 'STRICT HYDERABAD EXPRESS',
    headline: 'Guaranteed 24-Hour Express Delivery in Hyderabad',
    description:
      'Keep your project running without delays. Guaranteed 24-hour express dispatch for essential construction and industrial materials strictly within Hyderabad.',
    points: [
      'Guaranteed 24-hour dispatch within Hyderabad metropolitan area',
      'Priority warehouse picking and direct project site drop-off',
      'Real-time GPS vehicle tracking with site unloading support',
    ],
    primaryCtaText: 'Shop 24-Hr Express Products',
    primaryRoute: 'TwentyFourHourDelivery',
    secondaryCtaText: 'Track Active Shipments',
    secondaryRoute: 'OrderTracking',
  },
  {
    id: 'v3',
    title: 'Best Prices',
    subtitle: 'Bulk Discounts',
    iconName: 'pricetag-outline' as const,
    color: '#F97316',
    badgeLabel: 'FACTORY DIRECT RATES',
    headline: 'Wholesale Tiered Pricing & Custom RFQ Bidding',
    description:
      'Unlock massive volume discounts with zero middleman markups. Submit custom Requests for Quotations (RFQ) and get competitive bids directly from verified suppliers.',
    points: [
      'Volume tiered wholesale pricing with upfront transparent margins',
      'Instant custom RFQ creation & competitive quote bidding',
      'Bulk purchase order management with flexible credit terms',
    ],
    primaryCtaText: 'Create Bulk RFQ / Get Quotes',
    primaryRoute: 'RFQCreate',
    secondaryCtaText: 'View All RFQ Quotations',
    secondaryRoute: 'RFQList',
  },
  {
    id: 'v4',
    title: 'Secure Payment',
    subtitle: '100% Safe',
    iconName: 'shield-checkmark-outline' as const,
    color: '#3B82F6',
    badgeLabel: 'BANK-GRADE ESCROW SECURITY',
    headline: '100% Escrow Protection & Compliant GST Invoicing',
    description:
      'Your commercial transactions are safeguarded with bank-grade 256-bit SSL encryption, escrow payment protection, and automated GST Input Tax Credit (ITC) invoices.',
    points: [
      'Buyer escrow protection (Funds released upon site delivery confirmation)',
      'Automated GST compliant e-Invoices with instant ITC claims',
      'Multiple secure options: UPI, NetBanking, Cards & Credit Lines',
    ],
    primaryCtaText: 'Manage GST Invoices & Billing',
    primaryRoute: 'GSTInvoice',
    secondaryCtaText: 'Payment & Security FAQ',
    secondaryRoute: 'FAQ',
  },
];

const STATIC_CARD_STYLE = { width: '100%', marginBottom: 0 } as const;

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
  if (key.includes('wood') || key.includes('ply') || key.includes('timber') || key.includes('door') || key.includes('board')) {
    return 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=600&q=80';
  }
  if (key.includes('safe') || key.includes('ppe') || key.includes('helmet') || key.includes('fire') || key.includes('glove')) {
    return 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80';
  }
  return 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=600&q=80';
}

interface HomeCategoryCardProps {
  category: any;
  isDark: boolean;
  onPress: (cat: any) => void;
  width: number;
  imageHeight: number;
  isLastInRow?: boolean;
  variant?: 'compact' | 'two-column';
}

const HomeCategoryCard = React.memo(function HomeCategoryCard({
  category,
  isDark,
  onPress,
  width,
  imageHeight,
  isLastInRow,
  variant = 'compact',
}: HomeCategoryCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const resolvedImageUrl = useMemo(() => {
    if (imageFailed) {
      return getCategoryFallbackImage(category.name || category.slug);
    }
    return getCategoryFallbackImage(
      category.name || category.slug,
      category.imageUrl || category.image
    );
  }, [category, imageFailed]);

  const isTwoCol = variant === 'two-column';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(category)}
      style={[
        isTwoCol ? styles.moreCategoryCard : styles.categoryCard,
        {
          width,
          marginRight: isLastInRow ? 0 : GRID_GAP,
          backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
          borderColor: isDark ? '#2E2E2E' : '#F0F2F5',
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={category.name}
    >
      <View
        style={[
          styles.categoryImageWrap,
          { height: imageHeight, backgroundColor: isDark ? '#2A2A2A' : '#F8FAFC' },
        ]}
      >
        <Image
          source={{ uri: resolvedImageUrl }}
          style={styles.categoryDirectImg}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
          onError={() => setImageFailed(true)}
        />
      </View>
      <View style={isTwoCol ? styles.moreCategoryTextWrap : styles.categoryTextWrap}>
        <Text
          style={[
            isTwoCol ? styles.moreCategoryNameText : styles.categoryNameText,
            { color: isDark ? '#F5F5F5' : '#1A1A1A' },
          ]}
          numberOfLines={isTwoCol ? 2 : 1}
        >
          {category.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

interface BenefitCardProps {
  icon: React.ReactNode;
  title: string;
  isDark?: boolean;
}

const BenefitCard = React.memo(function BenefitCard({
  icon,
  title,
  isDark = false,
}: BenefitCardProps) {
  return (
    <View
      style={[
        whyStyles.benefitCard,
        {
          backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
          borderColor: isDark ? '#2E2E2E' : '#EEF2F6',
        },
      ]}
    >
      <View
        style={[
          whyStyles.iconCol,
          { backgroundColor: isDark ? 'rgba(227, 30, 36, 0.12)' : '#FEF2F2' },
        ]}
      >
        {icon}
      </View>
      <View style={whyStyles.textCol}>
        <Text
          style={[
            whyStyles.benefitTitle,
            { color: isDark ? '#F5F5F5' : '#1A1A1A' },
          ]}
        >
          {title}
        </Text>
      </View>
    </View>
  );
});

interface WhyShopWithUsProps {
  isDark?: boolean;
}

const WhyShopWithUs = React.memo(function WhyShopWithUs({
  isDark = false,
}: WhyShopWithUsProps) {
  return (
    <View style={whyStyles.sectionWrap}>
      {/* Center-aligned Section Title */}
      <Text style={[whyStyles.sectionTitle, { color: isDark ? '#F5F5F5' : '#1A1A1A' }]}>
        Why shop with us
      </Text>

      {/* 2x2 Grid of Individual Cards */}
      <View style={whyStyles.gridContainer}>
        {/* Row 1 */}
        <View style={whyStyles.gridRow}>
          <BenefitCard
            icon={<FontAwesome5 name="boxes" size={17} color="#E31E24" />}
            title={'Wide Selection of\nBrands & Products'}
            isDark={isDark}
          />
          <BenefitCard
            icon={<MaterialCommunityIcons name="label-percent-outline" size={21} color="#E31E24" />}
            title={'Transparent &\nCompetitive Pricing'}
            isDark={isDark}
          />
        </View>

        {/* Row 2 */}
        <View style={whyStyles.gridRow}>
          <BenefitCard
            icon={<MaterialCommunityIcons name="truck-fast-outline" size={21} color="#E31E24" />}
            title={'Fast & Ontime\nDelivery'}
            isDark={isDark}
          />
          <BenefitCard
            icon={<MaterialCommunityIcons name="check-decagram-outline" size={21} color="#E31E24" />}
            title={'100% Authentic\nProducts'}
            isDark={isDark}
          />
        </View>
      </View>
    </View>
  );
});

const whyStyles = StyleSheet.create({
  sectionWrap: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  gridContainer: {
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  benefitCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconCol: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  textCol: {
    flex: 1,
    justifyContent: 'center',
  },
  benefitTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 11.5,
    lineHeight: 16,
    letterSpacing: -0.1,
  },
});

export function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [showExpressIntro, setShowExpressIntro] = useState(false);
  const homeScaleAnim = useRef(new Animated.Value(1)).current;
  const homeOpacityAnim = useRef(new Animated.Value(1)).current;
  const { theme, isDark } = useTheme();
  const cartCount = useAppSelector(selectCartItemCount);
  const unreadNotifCount = useAppSelector((state) => state.notifications.unreadCount);
  const {
    hotDeals,
    sectionTitle: hotDealsTitle,
    sectionIcon: hotDealsIcon,
    isLoading: isHotDealsLoading,
    error: hotDealsError,
    refetch: refetchHotDeals,
  } = useHotDeals();

  const flamePulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(flamePulseAnim, {
          toValue: 1.18,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(flamePulseAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [flamePulseAnim]);

  const {
    categories: liveCategories,
    isLoading: isCategoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useLiveCategories();

  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const mainScrollRef = useRef<ScrollView>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Pull-to-refresh handler for all live content
  const handleRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      await Promise.all([
        refetchHotDeals(),
        refetchCategories(),
      ]);
      invalidatePromotionalVideoCache();
    } catch (err) {
      if (__DEV__) {
        console.log('[HomeScreen] Refresh notice:', err);
      }
    } finally {
      setIsPullRefreshing(false);
    }
  }, [refetchHotDeals, refetchCategories]);

  const handleScroll = useCallback(
    (event: any) => {
      const { contentOffset } = event.nativeEvent;

      if (contentOffset.y > 650) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    },
    []
  );

  // Automatically refetch live content only if cache is older than 60s
  const lastFocusFetchTimeRef = useRef<number>(Date.now());
  const hasUserSelectedSiteRef = useRef<boolean>(false);

  const loadSavedAddress = useCallback(async () => {
    if (!authStore.isAuthenticated() || hasUserSelectedSiteRef.current) return;
    try {
      const list = await addressesApi.getAddresses();
      if (Array.isArray(list) && list.length > 0) {
        const def =
          list.find((a) => a.isDefault && a.latitude && a.longitude) ||
          list.find((a) => a.latitude && a.longitude) ||
          list[0];
        if (def && def.latitude && def.longitude && !hasUserSelectedSiteRef.current) {
          setSelectedSite(customerAddressToDeliverySite(def));
        }
      }
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFocusFetchTimeRef.current > 60000) {
        lastFocusFetchTimeRef.current = now;
        refetchHotDeals();
        refetchCategories();
      }
      loadSavedAddress();
      homeScaleAnim.setValue(1);
      homeOpacityAnim.setValue(1);
      setShowExpressIntro(false);
    }, [refetchHotDeals, refetchCategories, homeScaleAnim, homeOpacityAnim, loadSavedAddress])
  );

  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [scannerModalVisible, setScannerModalVisible] = useState(false);
  const [selectedValueBadge, setSelectedValueBadge] = useState<ValueBadgeItem | null>(null);
  const [selectedSite, setSelectedSite] = useState<DeliverySite | null>(null);

  // Animated scale for 24 Hours card tap
  const quick24ScaleAnim = useRef(new Animated.Value(1)).current;
  const headerCartScaleAnim = useRef(new Animated.Value(1)).current;

  const handleIntroComplete = useCallback(() => {
    navigation.navigate('TwentyFourHourDelivery');
  }, [navigation]);

  const handleProductDetailPress = useCallback(
    (product: any) => {
      navigation.navigate('ProductDetail', {
        productId: String(product.id || product.productId),
        product,
      });
    },
    [navigation]
  );

  const isNavigatingToCartRef = useRef(false);

  const handleHeaderCartPress = useCallback(() => {
    if (isNavigatingToCartRef.current) return;
    isNavigatingToCartRef.current = true;
    setTimeout(() => {
      isNavigatingToCartRef.current = false;
    }, 600);

    // Micro-animation provides instant tactile feedback without blocking navigation
    Animated.sequence([
      Animated.timing(headerCartScaleAnim, {
        toValue: 0.88,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.spring(headerCartScaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 140,
        useNativeDriver: true,
      }),
    ]).start();

    // IMMEDIATE NAVIGATION: Fire synchronously on the current JS tick
    navigation.navigate('Cart');
  }, [navigation, headerCartScaleAnim]);

  // Deduplicate categories using stable unique id and respect backend sortOrder
  const uniqueCategories = useMemo(() => {
    if (!Array.isArray(liveCategories) || liveCategories.length === 0) return [];
    const seen = new Set<string>();
    const list: ApiCategory[] = [];
    for (const cat of liveCategories) {
      const id = String(cat.categoryId ?? cat.id ?? '');
      if (!id || id === 'all' || cat.slug === 'all' || (cat as any).status === 'INACTIVE' || cat.active === false) {
        continue;
      }
      if (seen.has(id)) continue;
      seen.add(id);
      list.push(cat);
    }
    list.sort((a, b) => {
      const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : 999;
      const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : 999;
      return orderA - orderB;
    });
    return list;
  }, [liveCategories]);

  // First 8 categories for Top Section (Strict 4x2 grid)
  const topCategories = useMemo(() => {
    return uniqueCategories.slice(0, 8);
  }, [uniqueCategories]);

  // Additional categories for Second Section below video (Dynamically fetched & rendered)
  const moreCategories = useMemo(() => {
    return uniqueCategories.slice(8);
  }, [uniqueCategories]);

  const handleCategoryPress = useCallback((cat: ApiCategory) => {
    navigation.navigate('Subcategories', {
      categoryId: String(cat.categoryId || cat.id),
      categoryName: cat.name,
      categorySlug: (cat as any).slug,
      categoryImage: cat.imageUrl || (cat as any).image,
    });
  }, [navigation]);

  const handleViewAllCategories = useCallback(() => {
    try {
      navigation.navigate('CategoriesTab', { categoryId: null, navKey: Date.now() });
    } catch {
      navigation.navigate('MainTabs', {
        screen: 'CategoriesTab',
        params: { categoryId: null, navKey: Date.now() },
      });
    }
  }, [navigation]);

  const renderCategoryGrid = useCallback((items: ApiCategory[]) => {
    const rows: ApiCategory[][] = [];
    for (let i = 0; i < items.length; i += 4) {
      rows.push(items.slice(i, i + 4));
    }

    return (
      <View style={styles.categoriesGridContainer}>
        {rows.map((row, rIdx) => (
          <View
            key={`cat_row_${rIdx}`}
            style={[
              styles.categoryRow,
              rIdx < rows.length - 1 && { marginBottom: GRID_GAP + 2 },
            ]}
          >
            {row.map((cat, cIdx) => (
              <HomeCategoryCard
                key={String(cat.categoryId || cat.id || `cat_${rIdx}_${cIdx}`)}
                category={cat}
                isDark={isDark}
                onPress={handleCategoryPress}
                width={CATEGORY_CARD_WIDTH}
                imageHeight={CATEGORY_IMAGE_HEIGHT}
                isLastInRow={cIdx === 3 || cIdx === row.length - 1}
                variant="compact"
              />
            ))}
          </View>
        ))}
      </View>
    );
  }, [isDark, handleCategoryPress]);

  const renderMoreCategoriesGrid = useCallback((items: ApiCategory[]) => {
    const rows: ApiCategory[][] = [];
    for (let i = 0; i < items.length; i += 2) {
      rows.push(items.slice(i, i + 2));
    }

    return (
      <View style={styles.categoriesGridContainer}>
        {rows.map((row, rIdx) => (
          <View
            key={`more_cat_row_${rIdx}`}
            style={[
              styles.categoryRow,
              rIdx < rows.length - 1 && { marginBottom: GRID_GAP + 2 },
            ]}
          >
            {row.map((cat, cIdx) => (
              <HomeCategoryCard
                key={String(cat.categoryId || cat.id || `more_cat_${rIdx}_${cIdx}`)}
                category={cat}
                isDark={isDark}
                onPress={handleCategoryPress}
                width={MORE_CATEGORY_CARD_WIDTH}
                imageHeight={MORE_CATEGORY_IMAGE_HEIGHT}
                isLastInRow={cIdx === 1 || cIdx === row.length - 1}
                variant="two-column"
              />
            ))}
          </View>
        ))}
      </View>
    );
  }, [isDark, handleCategoryPress]);



  // Fetch current GPS location
  useEffect(() => {
    let isMounted = true;
    async function fetchAutoLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (!isMounted) return;
          const [geo] = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (geo && isMounted) {
            const cityName = geo.city || geo.subregion || geo.region || 'Manikonda';
            const countryName = geo.district || geo.city || 'Hyderabad';
            setSelectedSite({
              id: 'gps-live',
              name: `${cityName}, ${countryName}`,
              address: `${geo.street || geo.name || cityName}, ${countryName}`,
              city: cityName,
              country: countryName,
              type: 'project',
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        }
      } catch (err) {
        // Fallback gracefully
      }
    }
    fetchAutoLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  const topSafePad = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20);

  return (
    <View style={[styles.screenRoot, { backgroundColor: isDark ? '#121212' : '#F5F6F8' }]}>
      <StatusBar barStyle="light-content" backgroundColor={isDark ? '#B71C1C' : '#E31E24'} translucent />

      <Animated.View style={{ flex: 1, opacity: homeOpacityAnim, transform: [{ scale: homeScaleAnim }] }}>
        {/* ── Fixed Clean Top Navbar ── */}
      <View style={[styles.topHeader, { paddingTop: topSafePad + 6, backgroundColor: isDark ? '#B71C1C' : '#E31E24', borderBottomColor: 'transparent' }]}>
        {/* Row 1: Hamburger Menu (Left), Centered Logo & Right Actions (Phone & Cart) */}
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeftGroup}>
            <TouchableOpacity
              onPress={() => setIsDrawerOpen(true)}
              style={styles.hamburgerBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Open side menu"
              accessibilityRole="button"
            >
              <Ionicons name="menu" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.logoWrap}>
            <Image
              source={require('../../../../assets/logo-white.png')}
              style={styles.headerLogo}
              contentFit="contain"
              contentPosition="center"
            />
          </View>

          <View style={styles.headerRightActions}>
            {/* Phone / Call Support Button */}
            <TouchableOpacity
              onPress={() => navigation.navigate('HelpSupport')}
              activeOpacity={0.7}
              style={styles.headerActionBtn}
              accessibilityLabel="Contact support"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="call-outline" size={21} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Cart Button */}
            <TouchableOpacity
              onPress={handleHeaderCartPress}
              activeOpacity={0.7}
              style={styles.headerActionBtn}
              accessibilityLabel="Open shopping cart"
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
            >
              <Animated.View style={{ transform: [{ scale: headerCartScaleAnim }] }}>
                <Ionicons name="cart-outline" size={23} color="#FFFFFF" />
                {cartCount > 0 && (
                  <View style={styles.cartBadge} pointerEvents="none">
                    <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 2: Location Delivery Bar (Spacious, Aligned & Premium) */}
        <TouchableOpacity
          onPress={() => setLocationModalVisible(true)}
          activeOpacity={0.75}
          style={[
            styles.locationRow,
            {
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderColor: 'rgba(255, 255, 255, 0.25)',
            },
          ]}
        >
          <View style={styles.locationPinBox}>
            <Ionicons name="location" size={13} color="#F59E0B" />
          </View>
          <View style={styles.locationTextContainer}>
            <Text style={[styles.deliverToLabel, { color: 'rgba(255, 255, 255, 0.7)' }]}>
              Deliver to:
            </Text>
            <Text style={[styles.locationCityText, { color: '#FFFFFF' }]} numberOfLines={1}>
              {selectedSite?.name || 'Select Delivery Location'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={14} color="rgba(255, 255, 255, 0.7)" />
        </TouchableOpacity>
      </View>

      <LocationPickerModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        selectedSite={selectedSite || undefined}
        onSelectSite={(site) => {
          hasUserSelectedSiteRef.current = true;
          setSelectedSite(site);
        }}
      />

      <BarcodeScannerModal
        visible={scannerModalVisible}
        onClose={() => setScannerModalVisible(false)}
        navigation={navigation}
      />

      {/* ── Interactive Value Proposition Bottom Sheet Modal ── */}
      <Modal
        visible={Boolean(selectedValueBadge)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedValueBadge(null)}
      >
        <TouchableOpacity
          style={styles.valueModalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedValueBadge(null)}
        >
          <TouchableOpacity
            style={[
              styles.valueModalCard,
              { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
            ]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedValueBadge && (
              <>
                {/* Header with Icon & Close Button */}
                <View style={styles.valueModalHeader}>
                  <View style={[styles.valueModalIconBox, { backgroundColor: `${selectedValueBadge.color}18` }]}>
                    <Ionicons name={selectedValueBadge.iconName} size={28} color={selectedValueBadge.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <View style={[styles.valueModalBadgePill, { backgroundColor: `${selectedValueBadge.color}15` }]}>
                      <Text style={[styles.valueModalBadgeText, { color: selectedValueBadge.color }]}>
                        {selectedValueBadge.badgeLabel}
                      </Text>
                    </View>
                    <Text style={[styles.valueModalTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                      {selectedValueBadge.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedValueBadge(null)}
                    style={[styles.valueModalCloseBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
                  >
                    <Ionicons name="close" size={20} color={isDark ? '#CBD5E1' : '#64748B'} />
                  </TouchableOpacity>
                </View>

                {/* Headline & Description */}
                <Text style={[styles.valueModalHeadline, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
                  {selectedValueBadge.headline}
                </Text>
                <Text style={[styles.valueModalDescription, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  {selectedValueBadge.description}
                </Text>

                {/* 3 Key Benefit Points with checkmarks */}
                <View style={styles.valueModalPointsList}>
                  {selectedValueBadge.points.map((point, pIdx) => (
                    <View key={pIdx} style={styles.valueModalPointRow}>
                      <View style={[styles.valuePointCheckIcon, { backgroundColor: `${selectedValueBadge.color}15` }]}>
                        <Ionicons name="checkmark-circle" size={17} color={selectedValueBadge.color} />
                      </View>
                      <Text style={[styles.valuePointText, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                        {point}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Action Buttons */}
                <View style={styles.valueModalActions}>
                  <TouchableOpacity
                    onPress={() => {
                      const targetRoute = selectedValueBadge.primaryRoute;
                      const targetParams = selectedValueBadge.primaryParams;
                      setSelectedValueBadge(null);
                      navigation.navigate(targetRoute, targetParams);
                    }}
                    style={[styles.valuePrimaryActionBtn, { backgroundColor: selectedValueBadge.color }]}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.valuePrimaryActionBtnText}>
                      {selectedValueBadge.primaryCtaText}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>

                  {selectedValueBadge.secondaryCtaText && selectedValueBadge.secondaryRoute && (
                    <TouchableOpacity
                      onPress={() => {
                        const targetRoute = selectedValueBadge.secondaryRoute!;
                        const targetParams = selectedValueBadge.secondaryParams;
                        setSelectedValueBadge(null);
                        navigation.navigate(targetRoute, targetParams);
                      }}
                      style={[
                        styles.valueSecondaryActionBtn,
                        { borderColor: isDark ? '#475569' : '#CBD5E1', backgroundColor: isDark ? '#0F172A' : '#F8FAFC' },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.valueSecondaryActionBtnText, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
                        {selectedValueBadge.secondaryCtaText}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        ref={mainScrollRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 90 }]}
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={handleRefresh}
            tintColor="#E31E24"
            colors={['#E31E24']}
          />
        }
      >
        {/* ── Search Bar ── */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Search')}
          activeOpacity={0.88}
          style={[styles.searchBarWrap, { backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF', borderColor: isDark ? '#333' : '#E8EAED' }]}
        >
          <Ionicons name="search" size={19} color="#64748B" style={styles.searchLeftIcon} />
          <Text style={styles.searchPlaceholderText}>
            Search by Products...
          </Text>
          <Ionicons name="scan-outline" size={19} color="#64748B" style={styles.scanBtn} />
        </TouchableOpacity>

        {/* ── Explore Categories Section (Strict 4x2 Grid from Live Backend) ── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitleText, { color: isDark ? '#F5F5F5' : '#1A1A1A' }]}>
              Explore Categories
            </Text>
            <TouchableOpacity
              onPress={handleViewAllCategories}
              activeOpacity={0.7}
              style={styles.seeAllBtn}
              accessibilityRole="button"
              accessibilityLabel="View all categories"
            >
              <Text style={[styles.seeAllText, { color: isDark ? '#EF4444' : '#E31E24' }]}>
                View All
              </Text>
              <Ionicons name="chevron-forward" size={14} color={isDark ? '#EF4444' : '#E31E24'} />
            </TouchableOpacity>
          </View>

          {/* Loading Skeleton */}
          {isCategoriesLoading && topCategories.length === 0 ? (
            <HomeScreenCategoriesSkeleton />
          ) : categoriesError && topCategories.length === 0 ? (
            /* Error State with Retry */
            <View style={[styles.categoryStateContainer, { backgroundColor: isDark ? '#1E293B' : '#FEF2F2' }]}>
              <Ionicons name="alert-circle-outline" size={26} color="#EF4444" />
              <Text style={[styles.categoryStateTitle, { color: isDark ? '#F8FAFC' : '#991B1B' }]}>
                Unable to load categories
              </Text>
              <Text style={[styles.categoryStateSubtext, { color: isDark ? '#94A3B8' : '#7F1D1D' }]}>
                Please check your network connection and try again.
              </Text>
              <TouchableOpacity
                onPress={() => refetchCategories()}
                activeOpacity={0.8}
                style={styles.categoryRetryBtn}
                accessibilityRole="button"
                accessibilityLabel="Retry loading categories"
              >
                <Ionicons name="refresh" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.categoryRetryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : topCategories.length === 0 ? (
            /* Empty State */
            <View style={[styles.categoryStateContainer, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <Ionicons name="grid-outline" size={28} color="#94A3B8" />
              <Text style={[styles.categoryStateTitle, { color: isDark ? '#F8FAFC' : '#334155' }]}>
                No categories available
              </Text>
            </View>
          ) : (
            /* 4 Columns x 2 Rows Grid */
            renderCategoryGrid(topCategories)
          )}
        </View>

        {/* ── 24-Hour Express Guaranteed Dispatch Card (Live Dynamic Video Driven via Admin Panel) ── */}
        <HomePromotionalVideoCard navigation={navigation} isDark={isDark} />

        {/* ── More Categories Section (Below Video — Dynamic Live Backend) ── */}
        {isCategoriesLoading && topCategories.length === 0 ? (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitleText, { color: isDark ? '#F5F5F5' : '#1A1A1A' }]}>
                More Categories
              </Text>
              <View style={styles.seeAllBtn}>
                <Text style={[styles.seeAllText, { color: isDark ? '#EF4444' : '#E31E24' }]}>
                  View All
                </Text>
                <Ionicons name="chevron-forward" size={14} color={isDark ? '#EF4444' : '#E31E24'} />
              </View>
            </View>
            <HomeScreenMoreCategoriesSkeleton />
          </View>
        ) : moreCategories.length > 0 ? (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitleText, { color: isDark ? '#F5F5F5' : '#1A1A1A' }]}>
                More Categories
              </Text>
              <TouchableOpacity
                onPress={handleViewAllCategories}
                activeOpacity={0.7}
                style={styles.seeAllBtn}
                accessibilityRole="button"
                accessibilityLabel="View all categories"
              >
                <Text style={[styles.seeAllText, { color: isDark ? '#EF4444' : '#E31E24' }]}>
                  View All
                </Text>
                <Ionicons name="chevron-forward" size={14} color={isDark ? '#EF4444' : '#E31E24'} />
              </TouchableOpacity>
            </View>

            {renderCategoryGrid(moreCategories)}
          </View>
        ) : null}

        {/* ── Why Shop With Us Section ── */}
        <WhyShopWithUs isDark={isDark} />

        {/* ── Hot Deals Grid Section ── */}
        {hotDeals.length > 0 ? (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.hotDealsHeaderTitleRow}>
                <Animated.View
                  style={[
                    styles.hotDealsFlameBadge,
                    {
                      backgroundColor: isDark ? 'rgba(227, 30, 36, 0.22)' : '#FEE2E2',
                      transform: [{ scale: flamePulseAnim }],
                    },
                  ]}
                >
                  {hotDealsIcon && (hotDealsIcon.startsWith('http://') || hotDealsIcon.startsWith('https://')) ? (
                    <Image source={{ uri: hotDealsIcon }} style={styles.hotDealsCustomIcon} contentFit="contain" />
                  ) : (
                    <Ionicons name="flame" size={16} color="#E31E24" />
                  )}
                </Animated.View>
                <Text style={[styles.sectionTitleText, { color: isDark ? '#F5F5F5' : '#1A1A1A' }]}>
                  {hotDealsTitle || 'Hot Deals'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('ProductList', { title: hotDealsTitle || 'Hot Deals' })}
                activeOpacity={0.7}
                style={styles.seeAllBtn}
                accessibilityRole="button"
                accessibilityLabel="View all hot deals"
              >
                <Text style={[styles.seeAllText, { color: isDark ? '#EF4444' : '#E31E24' }]}>View All</Text>
                <Ionicons name="chevron-forward" size={14} color={isDark ? '#EF4444' : '#E31E24'} />
              </TouchableOpacity>
            </View>

            <View style={styles.trendingProductsGrid}>
              {hotDeals.map((product) => (
                <View key={`hot_deal_${String(product.id || product.productId)}`} style={styles.trendingCardCol}>
                  <ProductCard
                    product={product}
                    onPress={() => handleProductDetailPress(product)}
                    style={STATIC_CARD_STYLE}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : isHotDealsLoading ? (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.hotDealsHeaderTitleRow}>
                <View
                  style={[
                    styles.hotDealsFlameBadge,
                    { backgroundColor: isDark ? 'rgba(227, 30, 36, 0.22)' : '#FEE2E2' },
                  ]}
                >
                  <Ionicons name="flame" size={16} color="#E31E24" />
                </View>
                <Text style={[styles.sectionTitleText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                  {hotDealsTitle || 'Hot Deals'}
                </Text>
              </View>
            </View>
            <HomeScreenTrendingSkeleton />
          </View>
        ) : hotDealsError ? (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.hotDealsHeaderTitleRow}>
                <View
                  style={[
                    styles.hotDealsFlameBadge,
                    { backgroundColor: isDark ? 'rgba(227, 30, 36, 0.22)' : '#FEE2E2' },
                  ]}
                >
                  <Ionicons name="flame" size={16} color="#E31E24" />
                </View>
                <Text style={[styles.sectionTitleText, { color: isDark ? '#F5F5F5' : '#1A1A1A' }]}>
                  {hotDealsTitle || 'Hot Deals'}
                </Text>
              </View>
            </View>
            <View style={styles.hotDealsErrorContainer}>
              <Ionicons name="alert-circle-outline" size={28} color={isDark ? '#94A3B8' : '#64748B'} />
              <Text style={[styles.hotDealsErrorText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Unable to load Hot Deals
              </Text>
              <TouchableOpacity
                onPress={() => refetchHotDeals()}
                activeOpacity={0.7}
                style={styles.hotDealsRetryBtn}
              >
                <Text style={styles.hotDealsRetryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

      </ScrollView>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <TouchableOpacity
          style={[styles.floatingScrollTopBtn, { bottom: Math.max(insets.bottom, 20) + 70 }]}
          onPress={() => mainScrollRef.current?.scrollTo({ y: 0, animated: true })}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
          <Text style={styles.floatingScrollTopText}>Top</Text>
        </TouchableOpacity>
      )}
      </Animated.View>

      {showExpressIntro && (
        <Express24OpeningAnimation onAnimationComplete={handleIntroComplete} />
      )}

      {/* ── Left Side Navigation Drawer ── */}
      <HomeSideDrawer
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        navigation={navigation}
        activeRouteName="Home"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  scrollContent: {
    paddingTop: 12,
  },

  // IBO-Style Red Header Bar
  topHeader: {
    backgroundColor: '#E31E24',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerLeftGroup: {
    width: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  hamburgerBtn: {
    width: 32,
    height: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  logoWrap: {
    flex: 1,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 140,
    height: 28,
  },
  headerRightActions: {
    width: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  headerExpressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  headerExpressIconCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerExpressTextCol: {
    justifyContent: 'center',
  },
  headerExpressTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '800',
    fontSize: 9,
    lineHeight: 10,
    color: '#FFFFFF',
  },
  headerExpressSub: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '700',
    fontSize: 6.5,
    lineHeight: 8,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.2,
  },
  expressSectionWrap: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  expressCardTouchable: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    ...(Platform.OS === 'ios'
      ? {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      }
      : { elevation: 4 }),
  },
  expressCardGradient: {
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  expressCardDecorGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  expressCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  expressPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 20,
    gap: 5,
  },
  expressPillBoltCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expressPillLeftText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '800',
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  expressCityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  expressCityPillText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '700',
    fontSize: 9.5,
    color: '#FDE68A',
    letterSpacing: 0.3,
  },
  expressCardContent: {
    marginBottom: 12,
  },
  expressCardHeadline: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  expressCardSubheadline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  expressFeaturesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  expressFeatureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    gap: 4,
  },
  expressFeatureText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 11,
    color: '#E2E8F0',
  },
  expressCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 12,
  },
  expressCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E31E24',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  expressCtaBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  expressLiveStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  expressLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  expressLiveStatusText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '600',
    fontSize: 11,
    color: '#94A3B8',
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 1,
    right: 1,
    backgroundColor: '#EF4444',
    borderRadius: 6,
    minWidth: 13,
    height: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  notifBadgeText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '700',
    fontSize: 7.5,
    color: '#FFFFFF',
    lineHeight: 9,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: '#FFFFFF',
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.2,
    borderColor: '#E31E24',
  },
  cartBadgeText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '800',
    fontSize: 8,
    color: '#E31E24',
    lineHeight: 9.5,
  },

  // Location Row
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 2,
    gap: 5,
    maxWidth: '90%',
  },
  locationPinBox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deliverToLabel: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11,
  },
  locationCityText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 11,
    maxWidth: 160,
  },

  // Search Bar
  searchBarWrap: {
    marginHorizontal: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  searchLeftIcon: {
    marginRight: 8,
  },
  searchPlaceholderText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 14,
    color: '#8C939D',
    flex: 1,
  },
  scanBtn: {
    padding: 4,
  },


  // 4 Value Badges Row
  valueBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 6,
  },
  valueCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  valueIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  valueTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 10.5,
    color: '#0F172A',
    textAlign: 'center',
  },
  valueSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 9,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 1,
  },

  // Section Headers
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitleText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 17,
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
  sectionSubTitleText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11,
    marginTop: 1,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  seeAllText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 12,
    color: '#E31E24',
    letterSpacing: 0.1,
  },
  hotDealsHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  hotDealsFlameBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotDealsCustomIcon: {
    width: 18,
    height: 18,
  },
  viewAllText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 12,
    color: '#E31E24',
  },
  trendingProductsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  trendingCardCol: {
    width: (SCREEN_WIDTH - 32 - 10) / 2,
    marginBottom: 10,
  },
  hotDealsErrorContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotDealsErrorText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 12,
  },
  hotDealsRetryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E31E24',
    borderRadius: 6,
  },
  hotDealsRetryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // Explore Categories Grid & Cards
  categoriesGridContainer: {
    paddingHorizontal: GRID_PADDING,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
    paddingBottom: 6,
    alignItems: 'center',
  },
  categoryImageWrap: {
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryDirectImg: {
    width: '100%',
    height: '100%',
  },
  categoryTextWrap: {
    paddingTop: 5,
    paddingHorizontal: 2,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 22,
  },
  categoryNameText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 11,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  moreCategoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
    paddingBottom: 8,
    alignItems: 'center',
  },
  moreCategoryTextWrap: {
    paddingTop: 8,
    paddingHorizontal: 8,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  moreCategoryNameText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 17,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  categoryStateContainer: {
    marginHorizontal: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryStateTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  categoryStateSubtext: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  categoryRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E31E24',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  categoryRetryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },

  // Bulk Order Banner Card
  bulkOrderBannerWrap: {
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  bulkOrderBanner: {
    borderRadius: 8,
    height: 96,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    position: 'relative',
  },
  bulkOrderLeft: {
    flex: 1.3,
    justifyContent: 'center',
    zIndex: 2,
  },
  bulkOrderTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 15,
    color: '#15803D',
  },
  bulkOrderSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11,
    color: '#334155',
    lineHeight: 14,
    marginTop: 2,
    marginBottom: 6,
  },
  quotePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15803D',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  quotePillText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 10.5,
    color: '#FFFFFF',
  },
  bulkOrderRight: {
    flex: 1,
    height: '100%',
    position: 'relative',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bulkBoxesImg: {
    width: 90,
    height: 70,
    borderRadius: 6,
  },
  saveMoreBadge: {
    position: 'absolute',
    right: 0,
    top: 10,
    backgroundColor: '#15803D',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  saveMoreBadgeText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '800',
    fontSize: 8.5,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 10,
  },

  // Top Brands Section
  brandsScrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  brandCircleItem: {
    alignItems: 'center',
    width: 88,
  },
  brandCircleWrapper: {
    position: 'relative',
    marginBottom: 6,
  },
  brandCircleOuterRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 1.5,
    borderColor: '#ECEDF0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  brandCircleImage: {
    width: '100%',
    height: '100%',
    borderRadius: 31,
  },
  brandCircleGradient: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandVerifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10B981',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  brandCircleName: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 12,
    color: '#0F172A',
    textAlign: 'center',
  },
  brandCircleCategory: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 1,
  },

  // RFQ Callout Banner at bottom of home screen
  rfqCalloutWrap: {
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 20,
  },
  rfqCalloutCard: {
    borderRadius: 8,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  rfqAccentStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    bottom: 0,
    backgroundColor: '#E31E24',
  },
  rfqContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rfqIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(227, 30, 36, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rfqTextWrapper: {
    flex: 1,
  },
  rfqTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 15,
    color: '#FFFFFF',
  },
  rfqSub: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 16,
    marginTop: 2,
  },
  rfqBtn: {
    backgroundColor: '#E31E24',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  rfqBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 13,
    color: '#FFFFFF',
  },

  /* ── Interactive Value Badge Modal ── */
  valueModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  valueModalCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  valueModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  valueModalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueModalBadgePill: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginBottom: 3,
  },
  valueModalBadgeText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  valueModalTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 16,
  },
  valueModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueModalHeadline: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 6,
  },
  valueModalDescription: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  valueModalPointsList: {
    gap: 8,
    marginBottom: 18,
  },
  valueModalPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  valuePointCheckIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  valuePointText: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
  },
  valueModalActions: {
    gap: 8,
  },
  valuePrimaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  valuePrimaryActionBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 13,
    color: '#FFFFFF',
  },
  valueSecondaryActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
  },
  valueSecondaryActionBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 12.5,
  },
  floatingScrollTopBtn: {
    position: 'absolute',
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E31E24',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 24,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 99,
  },
  floatingScrollTopText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
});

