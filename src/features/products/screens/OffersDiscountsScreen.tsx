/**
 * HINCH MART — Customer Offers & Discounts Screen
 * Displays active, admin-approved discounts from GET /api/customer/discounts
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Clipboard,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../theme';
import { Screen, Header } from '../../../components/layout/Screen';
import { CustomerDiscount } from '../../../types/discount.types';
import { discountsApi } from '../../../services/api/discounts.api';
import { couponsApi } from '../../../services/api/coupons.api';
import { EligibleCoupon } from '../../../types/coupon.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function OffersDiscountsScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [discounts, setDiscounts] = useState<CustomerDiscount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'PERCENTAGE' | 'FIXED'>('ALL');

  const loadDiscounts = useCallback(async (force = false) => {
    try {
      const [eligible, general] = await Promise.all([
        couponsApi.getEligibleCoupons(0),
        discountsApi.getCustomerDiscounts(force),
      ]);

      const map = new Map<string, any>();
      if (Array.isArray(eligible)) {
        eligible.forEach((c) => {
          if (c && c.code) {
            map.set(c.code.trim().toUpperCase(), {
              discountId: c.code,
              code: c.code,
              description: c.title ? `${c.title} • ${c.description}` : c.description,
              discountType: c.discountType,
              discountValue: c.discountValue,
              minimumOrderAmount: c.minOrderAmount,
              maxDiscountAmount: c.maxDiscountAmount,
              endDate: c.expiryDate ? c.expiryDate.split('T')[0] : '',
              active: true,
            });
          }
        });
      }
      if (Array.isArray(general)) {
        general.forEach((g) => {
          const clean = g.code?.trim().toUpperCase();
          if (clean && !map.has(clean)) {
            map.set(clean, g);
          }
        });
      }

      setDiscounts(Array.from(map.values()));
    } catch {
      // Fallback in API service
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDiscounts();
  }, [loadDiscounts]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadDiscounts(true);
  };

  const handleCopyCode = (code: string) => {
    Clipboard.setString(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? null : prev));
    }, 2000);
  };

  const filteredDiscounts = discounts.filter((d) => {
    if (selectedCategory === 'PERCENTAGE' && d.discountType?.toUpperCase() !== 'PERCENTAGE') {
      return false;
    }
    if (selectedCategory === 'FIXED' && d.discountType?.toUpperCase() !== 'FIXED' && d.discountType?.toUpperCase() !== 'FLAT') {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        d.code?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#E31E24" translucent />

      {/* Header */}
      <Header
        title="Top Offers & Discounts"
        showBack={true}
        onBackPress={() => navigation.goBack()}
        showCart={true}
        onCartPress={() => navigation.navigate('Cart')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#E31E24']}
            tintColor="#E31E24"
          />
        }
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 30 },
        ]}
      >
        {/* Hero Banner */}
        <LinearGradient
          colors={isDark ? ['#1E293B', '#0F172A'] : ['#FEF2F2', '#FEE2E2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.heroBanner,
            { borderColor: isDark ? '#334155' : '#FECACA' },
          ]}
        >
          <View style={styles.heroTextCol}>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={13} color="#E31E24" />
              <Text style={styles.heroBadgeText}>LIVE SAVINGS</Text>
            </View>
            <Text
              style={[
                styles.heroTitle,
                { color: isDark ? '#F8FAFC' : '#0F172A' },
              ]}
            >
              Exclusive B2B & Wholesale Discounts
            </Text>
            <Text
              style={[
                styles.heroSubtitle,
                { color: isDark ? '#94A3B8' : '#64748B' },
              ]}
            >
              Apply verified promo codes at checkout to unlock instant price reductions on structural steel, cement, and building supplies.
            </Text>
          </View>
          <MaterialCommunityIcons
            name="tag-multiple"
            size={56}
            color="#E31E24"
            style={{ opacity: 0.85 }}
          />
        </LinearGradient>

        {/* Search & Filter Bar */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.cardBorder,
            },
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={theme.colors.textTertiary}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search active discount codes..."
            placeholderTextColor={theme.colors.textTertiary}
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            autoCapitalize="characters"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons
                name="close-circle"
                size={16}
                color={theme.colors.textTertiary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setSelectedCategory('ALL')}
            style={[
              styles.filterChip,
              selectedCategory === 'ALL'
                ? styles.filterChipActive
                : {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.cardBorder,
                  },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategory === 'ALL'
                  ? styles.filterChipTextActive
                  : { color: theme.colors.textSecondary },
              ]}
            >
              All Discounts ({discounts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedCategory('PERCENTAGE')}
            style={[
              styles.filterChip,
              selectedCategory === 'PERCENTAGE'
                ? styles.filterChipActive
                : {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.cardBorder,
                  },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategory === 'PERCENTAGE'
                  ? styles.filterChipTextActive
                  : { color: theme.colors.textSecondary },
              ]}
            >
              % Percentage Deals
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedCategory('FIXED')}
            style={[
              styles.filterChip,
              selectedCategory === 'FIXED'
                ? styles.filterChipActive
                : {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.cardBorder,
                  },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategory === 'FIXED'
                  ? styles.filterChipTextActive
                  : { color: theme.colors.textSecondary },
              ]}
            >
              ₹ Flat Off
            </Text>
          </TouchableOpacity>
        </View>

        {/* List of Discounts */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#E31E24" />
            <Text
              style={[styles.loadingDesc, { color: theme.colors.textSecondary }]}
            >
              Fetching available discounts from server...
            </Text>
          </View>
        ) : filteredDiscounts.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: theme.colors.cardBackground,
                borderColor: theme.colors.cardBorder,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="ticket-percent-outline"
              size={52}
              color={theme.colors.textTertiary}
            />
            <Text
              style={[styles.emptyCardTitle, { color: theme.colors.textPrimary }]}
            >
              No Discounts Found
            </Text>
            <Text
              style={[
                styles.emptyCardDesc,
                { color: theme.colors.textSecondary },
              ]}
            >
              No active discounts match your current search. Try resetting your search or pull down to refresh.
            </Text>
          </View>
        ) : (
          filteredDiscounts.map((discount) => {
            const isPercentage =
              discount.discountType?.toUpperCase() === 'PERCENTAGE';
            const discountBadge = isPercentage
              ? `${discount.discountValue}% OFF`
              : `₹${Number(discount.discountValue).toLocaleString('en-IN')} OFF`;

            const minOrder = Number(discount.minimumOrderAmount || 0);

            return (
              <View
                key={String(discount.discountId || discount.code)}
                style={[
                  styles.discountCard,
                  {
                    backgroundColor: theme.colors.cardBackground,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
              >
                {/* Header Row */}
                <View style={styles.cardHeaderRow}>
                  {/* Code Badge */}
                  <View style={styles.codeContainer}>
                    <Text style={styles.codeText}>{discount.code}</Text>
                  </View>

                  {/* Value Pill */}
                  <View style={styles.valBadge}>
                    <Text style={styles.valBadgeText}>{discountBadge}</Text>
                  </View>
                </View>

                {/* Description */}
                <Text
                  style={[
                    styles.cardDescription,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  {discount.description}
                </Text>

                {/* Dashed line */}
                <View
                  style={[
                    styles.dashedDivider,
                    { borderColor: theme.colors.cardBorder },
                  ]}
                />

                {/* Conditions Row */}
                <View style={styles.cardConditions}>
                  <View style={styles.conditionItem}>
                    <Ionicons
                      name="cube-outline"
                      size={14}
                      color={theme.colors.textTertiary}
                    />
                    <Text
                      style={[
                        styles.conditionText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Min Order: ₹{minOrder.toLocaleString('en-IN')}
                    </Text>
                  </View>

                  {Number(discount.maxDiscountAmount) > 0 && (
                    <View style={styles.conditionItem}>
                      <Ionicons
                        name="cash-outline"
                        size={14}
                        color={theme.colors.textTertiary}
                      />
                      <Text
                        style={[
                          styles.conditionText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        Max Savings: ₹
                        {Number(
                          discount.maxDiscountAmount
                        ).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  )}

                  {discount.endDate && (
                    <View style={styles.conditionItem}>
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={theme.colors.textTertiary}
                      />
                      <Text
                        style={[
                          styles.conditionText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        Valid until {discount.endDate}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    onPress={() => handleCopyCode(discount.code)}
                    style={[
                      styles.actionCopyBtn,
                      {
                        backgroundColor:
                          copiedCode === discount.code
                            ? 'rgba(16, 185, 129, 0.12)'
                            : theme.colors.surfaceVariant,
                        borderColor:
                          copiedCode === discount.code
                            ? '#10B981'
                            : theme.colors.cardBorder,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={
                        copiedCode === discount.code
                          ? 'checkmark-circle'
                          : 'copy-outline'
                      }
                      size={15}
                      color={
                        copiedCode === discount.code
                          ? '#10B981'
                          : theme.colors.textPrimary
                      }
                    />
                    <Text
                      style={[
                        styles.actionCopyText,
                        {
                          color:
                            copiedCode === discount.code
                              ? '#10B981'
                              : theme.colors.textPrimary,
                        },
                      ]}
                    >
                      {copiedCode === discount.code ? 'Code Copied!' : 'Copy Code'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('Cart')}
                    style={styles.actionApplyBtn}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.actionApplyText}>Go to Cart & Apply</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  heroBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroTextCol: {
    flex: 1,
    marginRight: 12,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(227, 30, 36, 0.12)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  heroBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#E31E24',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: '#E31E24',
    borderColor: '#E31E24',
  },
  filterChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  emptyCardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  emptyCardDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  discountCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  codeContainer: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#E31E24',
    backgroundColor: 'rgba(227, 30, 36, 0.08)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  codeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#E31E24',
    letterSpacing: 0.8,
  },
  valBadge: {
    backgroundColor: '#E31E24',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  valBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  cardDescription: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  dashedDivider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  cardConditions: {
    gap: 6,
    marginBottom: 14,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  conditionText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  actionCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  actionCopyText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  actionApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E31E24',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
  },
  actionApplyText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
});
