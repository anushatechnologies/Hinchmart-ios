/**
 * HINCH MART — Available Platform Coupons & Discounts Modal
 * Sources: CouponController.java, CartController.java
 * Supports GET /api/coupons/eligible and GET /api/customer/discounts
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Clipboard,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { EligibleCoupon } from '../../types/coupon.types';
import { couponsApi } from '../../services/api/coupons.api';
import { discountsApi } from '../../services/api/discounts.api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DiscountsModalProps {
  visible: boolean;
  onClose: () => void;
  orderSubtotal?: number;
  onApplyDiscount: (code: string) => void;
  appliedCode?: string | null;
}

export function DiscountsModal({
  visible,
  onClose,
  orderSubtotal = 0,
  onApplyDiscount,
  appliedCode,
}: DiscountsModalProps) {
  const { isDark } = useTheme();
  const [coupons, setCoupons] = useState<EligibleCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'APPLICABLE' | 'PERCENTAGE' | 'FIXED'>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch eligible coupons evaluated against active cart
      const eligible = await couponsApi.getEligibleCoupons(orderSubtotal);
      
      // 2. Fetch customer discounts and merge
      let customerDiscounts: any[] = [];
      try {
        customerDiscounts = await discountsApi.getCustomerDiscounts();
      } catch {}

      const mergedMap = new Map<string, EligibleCoupon>();

      // Populate eligible coupons
      if (Array.isArray(eligible)) {
        eligible.forEach((c) => {
          if (c && c.code) {
            mergedMap.set(c.code.trim().toUpperCase(), c);
          }
        });
      }

      // Add any customer discounts not already present
      if (Array.isArray(customerDiscounts)) {
        customerDiscounts.forEach((d) => {
          const clean = d.code?.trim().toUpperCase();
          if (clean && !mergedMap.has(clean)) {
            const minOrder = Number(d.minimumOrderAmount || 0);
            const isApplicable = orderSubtotal >= minOrder;
            const shortfall = Math.max(0, minOrder - orderSubtotal);
            let est = 0;
            if (isApplicable) {
              if (d.discountType?.toUpperCase() === 'PERCENTAGE') {
                est = (orderSubtotal * Number(d.discountValue)) / 100;
                if (Number(d.maxDiscountAmount) > 0 && est > Number(d.maxDiscountAmount)) {
                  est = Number(d.maxDiscountAmount);
                }
              } else {
                est = Number(d.discountValue);
              }
            }

            mergedMap.set(clean, {
              code: d.code,
              title: d.description || `${d.code} Special`,
              description: d.description,
              discountType: d.discountType,
              discountValue: Number(d.discountValue || 0),
              minOrderAmount: minOrder,
              maxDiscountAmount: Number(d.maxDiscountAmount || 0),
              expiryDate: d.endDate || '',
              isApplicable,
              estimatedDiscount: Math.round(est),
              shortfallAmount: Math.round(shortfall),
            });
          }
        });
      }

      setCoupons(Array.from(mergedMap.values()));
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchCoupons();
      setSearchQuery('');
      setCopiedCode(null);
    }
  }, [visible, orderSubtotal]);

  const handleCopy = (code: string) => {
    Clipboard.setString(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? null : prev));
    }, 2000);
  };

  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      // Filter by applicability
      if (selectedFilter === 'APPLICABLE' && !c.isApplicable) {
        return false;
      }
      // Filter by type
      if (selectedFilter === 'PERCENTAGE' && c.discountType?.toUpperCase() !== 'PERCENTAGE') {
        return false;
      }
      if (
        selectedFilter === 'FIXED' &&
        c.discountType?.toUpperCase() !== 'FIXED_AMOUNT' &&
        c.discountType?.toUpperCase() !== 'FIXED' &&
        c.discountType?.toUpperCase() !== 'FLAT'
      ) {
        return false;
      }

      // Filter by search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = c.code?.toLowerCase().includes(q);
        const titleMatch = c.title?.toLowerCase().includes(q);
        const descMatch = c.description?.toLowerCase().includes(q);
        return codeMatch || titleMatch || descMatch;
      }
      return true;
    });
  }, [coupons, selectedFilter, searchQuery]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={styles.backdropTouch}
        />

        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderTopColor: isDark ? '#1E293B' : '#E2E8F0',
            },
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View
              style={[
                styles.dragHandle,
                { backgroundColor: isDark ? '#334155' : '#CBD5E1' },
              ]}
            />
          </View>

          {/* Modal Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleCol}>
              <View style={styles.headerBadgeRow}>
                <MaterialCommunityIcons name="ticket-percent" size={22} color="#E31E24" />
                <Text
                  style={[
                    styles.headerTitle,
                    { color: isDark ? '#F8FAFC' : '#0F172A' },
                  ]}
                >
                  Platform Coupons & Discounts
                </Text>
              </View>
              <Text
                style={[
                  styles.headerSubtitle,
                  { color: isDark ? '#94A3B8' : '#64748B' },
                ]}
              >
                Evaluated live for your active shopping cart
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
              ]}
            >
              <Ionicons
                name="close"
                size={20}
                color={isDark ? '#E2E8F0' : '#475569'}
              />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}
          >
            <Ionicons
              name="search"
              size={18}
              color={isDark ? '#64748B' : '#94A3B8'}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search coupon code (e.g. SAVE10)..."
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              style={[
                styles.searchInput,
                { color: isDark ? '#F8FAFC' : '#0F172A' },
              ]}
              autoCapitalize="characters"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={isDark ? '#64748B' : '#94A3B8'}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Pills */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              onPress={() => setSelectedFilter('ALL')}
              style={[
                styles.filterPill,
                selectedFilter === 'ALL'
                  ? styles.filterPillActive
                  : {
                      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedFilter === 'ALL'
                    ? styles.filterPillTextActive
                    : { color: isDark ? '#94A3B8' : '#64748B' },
                ]}
              >
                All Coupons ({coupons.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedFilter('APPLICABLE')}
              style={[
                styles.filterPill,
                selectedFilter === 'APPLICABLE'
                  ? styles.filterPillActive
                  : {
                      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedFilter === 'APPLICABLE'
                    ? styles.filterPillTextActive
                    : { color: isDark ? '#94A3B8' : '#64748B' },
                ]}
              >
                ⚡ Ready to Apply
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedFilter('PERCENTAGE')}
              style={[
                styles.filterPill,
                selectedFilter === 'PERCENTAGE'
                  ? styles.filterPillActive
                  : {
                      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedFilter === 'PERCENTAGE'
                    ? styles.filterPillTextActive
                    : { color: isDark ? '#94A3B8' : '#64748B' },
                ]}
              >
                % Percentage
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedFilter('FIXED')}
              style={[
                styles.filterPill,
                selectedFilter === 'FIXED'
                  ? styles.filterPillActive
                  : {
                      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedFilter === 'FIXED'
                    ? styles.filterPillTextActive
                    : { color: isDark ? '#94A3B8' : '#64748B' },
                ]}
              >
                ₹ Flat Off
              </Text>
            </TouchableOpacity>
          </View>

          {/* Coupons List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          >
            {isLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="small" color="#E31E24" />
                <Text
                  style={[
                    styles.loadingText,
                    { color: isDark ? '#94A3B8' : '#64748B' },
                  ]}
                >
                  Evaluating eligible coupons for cart...
                </Text>
              </View>
            ) : filteredCoupons.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="ticket-outline"
                  size={42}
                  color={isDark ? '#475569' : '#CBD5E1'}
                />
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: isDark ? '#F8FAFC' : '#0F172A' },
                  ]}
                >
                  No Matching Coupons Found
                </Text>
                <Text
                  style={[
                    styles.emptyDesc,
                    { color: isDark ? '#94A3B8' : '#64748B' },
                  ]}
                >
                  Try clearing your search query or check back for seasonal promotional codes.
                </Text>
              </View>
            ) : (
              filteredCoupons.map((coupon) => {
                const isCurrentApplied =
                  appliedCode &&
                  appliedCode.trim().toUpperCase() ===
                    coupon.code.trim().toUpperCase();

                const isPercentage =
                  coupon.discountType?.toUpperCase() === 'PERCENTAGE';
                const discountDisplay = isPercentage
                  ? `${coupon.discountValue}% OFF`
                  : `₹${Number(coupon.discountValue).toLocaleString('en-IN')} OFF`;

                const minOrder = Number(coupon.minOrderAmount || 0);

                return (
                  <View
                    key={coupon.code}
                    style={[
                      styles.ticketCard,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                        borderColor: isCurrentApplied
                          ? '#10B981'
                          : coupon.isApplicable
                          ? '#E31E24'
                          : isDark
                          ? '#334155'
                          : '#E2E8F0',
                      },
                    ]}
                  >
                    {/* Top Row: Code Badge, Copy, Value Pill */}
                    <View style={styles.ticketTopRow}>
                      <View style={styles.codeBadgeRow}>
                        <View
                          style={[
                            styles.codeBadge,
                            {
                              backgroundColor: isDark
                                ? 'rgba(227, 30, 36, 0.15)'
                                : '#FEE2E2',
                              borderColor: '#E31E24',
                            },
                          ]}
                        >
                          <Text style={styles.codeBadgeText}>
                            {coupon.code}
                          </Text>
                        </View>

                        {/* Copy Button */}
                        <TouchableOpacity
                          onPress={() => handleCopy(coupon.code)}
                          style={[
                            styles.copyBtn,
                            {
                              backgroundColor: isDark ? '#334155' : '#F1F5F9',
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={
                              copiedCode === coupon.code
                                ? 'checkmark-circle'
                                : 'copy-outline'
                            }
                            size={14}
                            color={
                              copiedCode === coupon.code
                                ? '#10B981'
                                : isDark
                                ? '#94A3B8'
                                : '#64748B'
                            }
                          />
                          <Text
                            style={[
                              styles.copyBtnText,
                              {
                                color:
                                  copiedCode === coupon.code
                                    ? '#10B981'
                                    : isDark
                                    ? '#94A3B8'
                                    : '#64748B',
                              },
                            ]}
                          >
                            {copiedCode === coupon.code ? 'COPIED' : 'COPY'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Value Pill */}
                      <View style={styles.valuePill}>
                        <LinearGradient
                          colors={['#E31E24', '#B91C1C']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.valuePillGradient}
                        >
                          <Text style={styles.valuePillText}>
                            {discountDisplay}
                          </Text>
                        </LinearGradient>
                      </View>
                    </View>

                    {/* Title */}
                    {coupon.title ? (
                      <Text
                        style={[
                          styles.couponTitle,
                          { color: isDark ? '#F8FAFC' : '#0F172A' },
                        ]}
                      >
                        {coupon.title}
                      </Text>
                    ) : null}

                    {/* Description */}
                    <Text
                      style={[
                        styles.discountDescription,
                        { color: isDark ? '#94A3B8' : '#475569' },
                      ]}
                    >
                      {coupon.description}
                    </Text>

                    {/* Dashed Separator */}
                    <View
                      style={[
                        styles.dashedDivider,
                        { borderColor: isDark ? '#334155' : '#E2E8F0' },
                      ]}
                    />

                    {/* Terms & Conditions Details */}
                    <View style={styles.termsRow}>
                      <View style={styles.termItem}>
                        <Ionicons
                          name="cart-outline"
                          size={13}
                          color={isDark ? '#94A3B8' : '#64748B'}
                        />
                        <Text
                          style={[
                            styles.termText,
                            { color: isDark ? '#94A3B8' : '#64748B' },
                          ]}
                        >
                          Min Order:{' '}
                          <Text
                            style={{
                              fontFamily: 'Inter_700Bold',
                              color: isDark ? '#F8FAFC' : '#0F172A',
                            }}
                          >
                            ₹{minOrder.toLocaleString('en-IN')}
                          </Text>
                        </Text>
                      </View>

                      {Number(coupon.maxDiscountAmount) > 0 && (
                        <View style={styles.termItem}>
                          <Ionicons
                            name="shield-checkmark-outline"
                            size={13}
                            color={isDark ? '#94A3B8' : '#64748B'}
                          />
                          <Text
                            style={[
                              styles.termText,
                              { color: isDark ? '#94A3B8' : '#64748B' },
                            ]}
                          >
                            Max Savings:{' '}
                            <Text
                              style={{
                                fontFamily: 'Inter_700Bold',
                                color: isDark ? '#F8FAFC' : '#0F172A',
                              }}
                            >
                              ₹
                              {Number(
                                coupon.maxDiscountAmount
                              ).toLocaleString('en-IN')}
                            </Text>
                          </Text>
                        </View>
                      )}

                      {coupon.expiryDate ? (
                        <View style={styles.termItem}>
                          <Ionicons
                            name="calendar-outline"
                            size={13}
                            color={isDark ? '#94A3B8' : '#64748B'}
                          />
                          <Text
                            style={[
                              styles.termText,
                              { color: isDark ? '#94A3B8' : '#64748B' },
                            ]}
                          >
                            Expires {coupon.expiryDate.split('T')[0]}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Apply Action Bar */}
                    <View style={styles.actionRow}>
                      {isCurrentApplied ? (
                        <View style={styles.appliedPill}>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#10B981"
                          />
                          <Text style={styles.appliedPillText}>
                            Currently Applied
                          </Text>
                        </View>
                      ) : !coupon.isApplicable ? (
                        <View style={styles.ineligibleRow}>
                          <Ionicons name="information-circle" size={14} color="#EF4444" />
                          <Text
                            style={[
                              styles.ineligibleText,
                              { color: isDark ? '#FCA5A5' : '#DC2626' },
                            ]}
                          >
                            Add ₹{coupon.shortfallAmount.toLocaleString('en-IN')} more to unlock
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.applicableActionRow}>
                          {coupon.estimatedDiscount > 0 && (
                            <View style={styles.saveBadge}>
                              <Text style={styles.saveBadgeText}>
                                Saves ₹{coupon.estimatedDiscount.toLocaleString('en-IN')}
                              </Text>
                            </View>
                          )}
                          <TouchableOpacity
                            onPress={() => {
                              onApplyDiscount(coupon.code);
                              onClose();
                            }}
                            style={styles.applyBtn}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.applyBtnText}>Apply Coupon</Text>
                            <Ionicons
                              name="arrow-forward"
                              size={14}
                              color="#FFFFFF"
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderTopWidth: 1,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
  },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
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
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillActive: {
    backgroundColor: '#E31E24',
    borderColor: '#E31E24',
  },
  filterPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingBottom: 24,
    gap: 12,
  },
  centerContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  emptyContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  ticketCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    position: 'relative',
  },
  ticketTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeBadge: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  codeBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#E31E24',
    letterSpacing: 0.8,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  copyBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  valuePill: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  valuePillGradient: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  valuePillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  couponTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    marginBottom: 4,
  },
  discountDescription: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 8,
  },
  dashedDivider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 8,
  },
  termsRow: {
    gap: 5,
    marginBottom: 12,
  },
  termItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  termText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  appliedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  appliedPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#10B981',
  },
  ineligibleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  ineligibleText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  applicableActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  saveBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#059669',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E31E24',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
  },
  applyBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
});
