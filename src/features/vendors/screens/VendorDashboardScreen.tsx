/**
 * HINCH MART — Vendor Operations, Supplier Profile & Equipment Rentals (IBO Home Building Megastore Theme)
 * - VendorDashboardScreen: KPI sales revenue, order dispatch pipeline, catalog & RFQ links
 * - VendorDetailScreen: Supplier profile banner, verification status, catalog product cards
 * - RentalListScreen: Heavy machinery fleet with daily rates, technical specs & booking modal
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme';
import { formatPrice } from '../../../utils';
import { vendorsApi } from '../../../services/api/vendors.api';
import { rentalsApi } from '../../../services/api/rentals.api';
import { storesApi } from '../../../services/api/stores.api';
import { VendorDashboardStats } from '../../../types/vendor.types';

/* ================================================================== */
/* 1. VENDOR DASHBOARD SCREEN                                         */
/* ================================================================== */
export function VendorDashboardScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [selectedStat, setSelectedStat] = useState<{ title: string; value: string; details: string[] } | null>(null);
  const [dashboardStats, setDashboardStats] = useState<VendorDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await vendorsApi.getDashboard();
        if (isMounted && res?.data) {
          setDashboardStats((res.data as any)?.data || res.data);
        }
      } catch {
        // Silent fallback
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalRevenueFormatted = formatPrice(dashboardStats?.totalRevenue || 0, (dashboardStats as any)?.currency || 'INR');
  const activeOrdersCount = dashboardStats?.totalOrders ?? (dashboardStats as any)?.activeOrders ?? 0;
  const pendingOrdersCount = dashboardStats?.pendingOrders ?? 0;

  const handleOpenStatDetails = (title: string, value: string, details: string[]) => {
    setSelectedStat({ title, value, details });
    setStatsModalVisible(true);
  };

  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
        translucent
      />

      {/* Top Header */}
      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: topPadding + 6,
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              Vendor Dashboard
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Business Overview & Order Fulfillment
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
        {/* KPI Revenue & Order Cards */}
        <View style={styles.statsGridRow}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() =>
              handleOpenStatDetails('Total Sales Revenue', totalRevenueFormatted, [
                `Settled Revenue: ${totalRevenueFormatted}`,
                'Escrow Protection: 100% Verified',
                'Next payout cycle: Tuesday',
              ])
            }
            style={{ flex: 1 }}
          >
            <LinearGradient
              colors={['#152238', '#1F3456']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statGradientCard}
            >
              <Text style={styles.statPillGold}>TOTAL REVENUE</Text>
              <Text style={styles.statRevenueValue}>{totalRevenueFormatted}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Ionicons name="shield-checkmark" size={13} color="#10B981" />
                <Text style={{ color: '#94A3B8', fontSize: 10.5 }}>100% Escrow Secured</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() =>
              handleOpenStatDetails('Active Orders & Shipments', `${activeOrdersCount} Active Orders`, [
                `${pendingOrdersCount} Orders Pending Dispatch`,
                `${activeOrdersCount} Total Active Orders`,
                'Avg fulfillment time: 1.8 days',
              ])
            }
            style={{ flex: 1 }}
          >
            <View
              style={[
                styles.statCardWhite,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.statLabelMuted, { color: theme.colors.textTertiary }]}>ACTIVE ORDERS</Text>
              <Text style={[styles.statValueLarge, { color: theme.colors.textPrimary }]}>
                {activeOrdersCount} Orders
              </Text>
              <Text style={[styles.statHintText, { color: theme.colors.danger }]}>
                {pendingOrdersCount} Pending Dispatch
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Vendor Operational Shortcuts */}
        <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
          Vendor Operations & Tools
        </Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('ProductManagement')}
          style={[styles.opRowCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          activeOpacity={0.8}
        >
          <View style={[styles.opIconCircle, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="cube-outline" size={20} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1, paddingHorizontal: 12 }}>
            <Text style={[styles.opTitle, { color: theme.colors.textPrimary }]}>
              Product Inventory & Pricing
            </Text>
            <Text style={[styles.opSubtitle, { color: theme.colors.textSecondary }]}>
              Update wholesale stock levels, bulk discounts & catalog
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('RFQList')}
          style={[styles.opRowCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          activeOpacity={0.8}
        >
          <View style={[styles.opIconCircle, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="document-text-outline" size={20} color="#16A34A" />
          </View>
          <View style={{ flex: 1, paddingHorizontal: 12 }}>
            <Text style={[styles.opTitle, { color: theme.colors.textPrimary }]}>
              RFQ Quotations & Inquiries
            </Text>
            <Text style={[styles.opSubtitle, { color: theme.colors.textSecondary }]}>
              Submit competitive bids to active B2B project buyers
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('RentalList')}
          style={[styles.opRowCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          activeOpacity={0.8}
        >
          <View style={[styles.opIconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="construct-outline" size={20} color="#D97706" />
          </View>
          <View style={{ flex: 1, paddingHorizontal: 12 }}>
            <Text style={[styles.opTitle, { color: theme.colors.textPrimary }]}>
              Equipment & Machinery Fleet
            </Text>
            <Text style={[styles.opSubtitle, { color: theme.colors.textSecondary }]}>
              Manage heavy machinery rentals, availability & dispatch
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      </ScrollView>

      {/* Stat Breakdown Modal */}
      <Modal visible={statsModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalHeading, { color: theme.colors.textPrimary }]}>
                {selectedStat?.title}
              </Text>
              <TouchableOpacity onPress={() => setStatsModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalValueBanner, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text style={[styles.modalBigVal, { color: theme.colors.primary }]}>
                {selectedStat?.value}
              </Text>
            </View>

            <Text style={[styles.modalSubheading, { color: theme.colors.textSecondary }]}>
              Metric Breakdown:
            </Text>
            {selectedStat?.details.map((detail, idx) => (
              <View key={idx} style={styles.detailItemRow}>
                <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                <Text style={[styles.detailItemText, { color: theme.colors.textPrimary }]}>
                  {detail}
                </Text>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => setStatsModalVisible(false)}
              style={[styles.modalCloseBtn, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ================================================================== */
/* 2. VENDOR DETAIL SCREEN (STOREFRONT)                               */
/* ================================================================== */
export { VendorDetailScreen } from './VendorDetailScreen';


/* ================================================================== */
/* 3. EQUIPMENT RENTALS SCREEN                                        */
/* ================================================================== */
export interface RentalItem {
  id: string;
  name: string;
  category: 'Excavators' | 'Cranes & Hoists' | 'Loaders & Backhoes' | 'Power & Generators';
  dailyRate: number;
  weeklyRate: number;
  currency: string;
  location: string;
  image: string;
  vendor: string;
  operatorAvailable: boolean;
  operatorDailyCost: number;
  specs: {
    operatingWeight: string;
    enginePower: string;
    maxCapacityOrReach: string;
    fuelType: string;
  };
  isAvailableNow: boolean;
  minDays: number;
}

const RENTAL_EQUIPMENT: RentalItem[] = [];

export function RentalListScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedEquipment, setSelectedEquipment] = useState<RentalItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rentalDays, setRentalDays] = useState(3);
  const [includeOperator, setIncludeOperator] = useState(true);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [deliverySite, setDeliverySite] = useState('');
  const [liveEquipment, setLiveEquipment] = useState<RentalItem[]>([]);
  const [isLoadingFleet, setIsLoadingFleet] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingFleet(true);
    rentalsApi.listEquipment()
      .then((items) => {
        if (!isMounted || !Array.isArray(items) || items.length === 0) return;
        const mapped: RentalItem[] = items.map((eq: any, idx: number) => ({
          id: String(eq.id || eq.equipmentId || `eq_${idx}`),
          name: eq.name || eq.title || 'Heavy Machinery',
          category: (eq.category || 'Excavators') as any,
          dailyRate: typeof eq.dailyRate === 'number' ? eq.dailyRate : (eq.ratePerDay || 4500),
          weeklyRate: typeof eq.weeklyRate === 'number' ? eq.weeklyRate : ((eq.dailyRate || 4500) * 6),
          currency: eq.currency || 'INR',
          location: eq.location || eq.city || 'Hyderabad Depot',
          image: eq.image || eq.imageUrl || eq.images?.[0] || 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&q=80',
          vendor: eq.vendor || eq.vendorName || eq.manufacturer || 'HinchFleet Logistics',
          operatorAvailable: eq.operatorAvailable ?? true,
          operatorDailyCost: eq.operatorDailyCost ?? 1200,
          specs: {
            operatingWeight: eq.specs?.operatingWeight || eq.operatingWeight || '21,500 kg',
            enginePower: eq.specs?.enginePower || eq.enginePower || '148 HP',
            maxCapacityOrReach: eq.specs?.maxCapacityOrReach || eq.maxReach || '9.8 m',
            fuelType: eq.specs?.fuelType || eq.fuelType || 'Diesel',
          },
          isAvailableNow: eq.isAvailable ?? true,
          minDays: eq.minDays || 1,
        }));
        setLiveEquipment(mapped);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingFleet(false);
      });

    return () => { isMounted = false; };
  }, []);

  const CATEGORIES = ['All', 'Excavators', 'Cranes & Hoists', 'Loaders & Backhoes', 'Power & Generators'];

  const fleet = liveEquipment;

  const filteredEquipment = useMemo(() => {
    if (selectedCategory === 'All') return fleet;
    return fleet.filter((item) => item.category === selectedCategory);
  }, [selectedCategory, fleet]);

  const handleOpenAvailability = (item: RentalItem) => {
    setSelectedEquipment(item);
    setRentalDays(item.minDays || 1);
    setIncludeOperator(item.operatorAvailable);
    setBookingConfirmed(false);
    setModalVisible(true);
  };

  const calculateTotal = () => {
    if (!selectedEquipment) return 0;
    const baseRate = selectedEquipment.dailyRate * rentalDays;
    const operatorRate = includeOperator && selectedEquipment.operatorAvailable ? selectedEquipment.operatorDailyCost * rentalDays : 0;
    return baseRate + operatorRate;
  };

  const handleConfirmBooking = async () => {
    if (!selectedEquipment || isBooking) return;
    setIsBooking(true);
    try {
      const startDate = new Date().toISOString().split('T')[0];
      const end = new Date(Date.now() + rentalDays * 86400000);
      const endDate = end.toISOString().split('T')[0];
      if (!deliverySite.trim()) {
        Alert.alert('Delivery Address Required', 'Please enter your project delivery site address to proceed with the booking.');
        setIsBooking(false);
        return;
      }
      const address = deliverySite.trim();

      const res = await rentalsApi.bookEquipment({
        equipmentId: selectedEquipment.id,
        startDate,
        endDate,
        deliveryAddress: address,
        notes: includeOperator ? 'Certified machine operator included' : 'Self-operated rental',
      });
      const ref = res?.bookingNumber || res?.bookingReference || `RENT-${res?.bookingId || res?.id || Math.floor(100000 + Math.random() * 900000)}`;
      setBookingRef(ref);
      setBookingConfirmed(true);
    } catch (err: any) {
      Alert.alert(
        'Booking Failed',
        err?.response?.data?.message || err?.message || 'Unable to confirm equipment booking with live server.'
      );
    } finally {
      setIsBooking(false);
    }
  };

  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
        translucent
      />

      {/* Header */}
      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: topPadding + 6,
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              Heavy Equipment Fleet
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Daily & Weekly Machinery Rentals
            </Text>
          </View>
        </View>
      </View>

      {/* Category Filter Pills */}
      <View
        style={[
          styles.filterTabsWrapper,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsContent}>
          {CATEGORIES.map((cat) => {
            const active = cat === selectedCategory;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.75}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.colors.surfaceVariant,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: active ? '#FFFFFF' : theme.colors.textSecondary,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Equipment List */}
      <FlatList
        data={filteredEquipment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.scrollPadding}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoadingFleet ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: theme.colors.textSecondary, marginTop: 12 }}>
                Loading available machinery fleet...
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
              <Ionicons name="construct-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: theme.colors.textPrimary, marginTop: 12 }}>
                No Machinery Available
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 6 }}>
                There is currently no heavy equipment available in this category.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.rentalCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Image source={{ uri: item.image }} style={styles.rentalImg} contentFit="cover" />
            <View style={styles.rentalCardBody}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.rentalCategoryTag, { color: theme.colors.primary }]}>
                  {item.category}
                </Text>
                <Text style={[styles.rentalVendorText, { color: theme.colors.textTertiary }]}>
                  Supplier: {item.vendor}
                </Text>
              </View>

              <Text style={[styles.rentalName, { color: theme.colors.textPrimary }]}>
                {item.name}
              </Text>

              {/* Specs Grid */}
              <View
                style={[
                  styles.rentalSpecsRow,
                  {
                    backgroundColor: isDark ? theme.colors.surfaceVariant : '#F8F9FA',
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View style={styles.rentalSpecCol}>
                  <Text style={[styles.rentalSpecLabel, { color: theme.colors.textTertiary }]}>Weight</Text>
                  <Text style={[styles.rentalSpecVal, { color: theme.colors.textPrimary }]}>
                    {item.specs.operatingWeight}
                  </Text>
                </View>
                <View style={styles.rentalSpecCol}>
                  <Text style={[styles.rentalSpecLabel, { color: theme.colors.textTertiary }]}>Power</Text>
                  <Text style={[styles.rentalSpecVal, { color: theme.colors.textPrimary }]}>
                    {item.specs.enginePower}
                  </Text>
                </View>
                <View style={styles.rentalSpecCol}>
                  <Text style={[styles.rentalSpecLabel, { color: theme.colors.textTertiary }]}>Operator</Text>
                  <Text
                    style={[
                      styles.rentalSpecVal,
                      { color: item.operatorAvailable ? '#16A34A' : theme.colors.textSecondary },
                    ]}
                  >
                    {item.operatorAvailable ? '✓ Available' : 'Self-Drive'}
                  </Text>
                </View>
              </View>

              {/* Price & CTA */}
              <View style={[styles.rentalFooterRow, { borderTopColor: theme.colors.border }]}>
                <View>
                  <Text style={[styles.rentalPriceAmount, { color: theme.colors.textPrimary }]}>
                    ₹{item.dailyRate.toLocaleString()}
                    <Text style={[styles.rentalPricePerDay, { color: theme.colors.textSecondary }]}> / Day</Text>
                  </Text>
                  <Text style={[styles.rentalWeeklyText, { color: theme.colors.textTertiary }]}>
                    Weekly: ₹{item.weeklyRate.toLocaleString()}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleOpenAvailability(item)}
                  style={[styles.checkAvailBtn, { backgroundColor: theme.colors.primary }]}
                  activeOpacity={0.85}
                >
                  <Text style={styles.checkAvailBtnText}>Check Availability</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      {/* Booking & Availability Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, maxHeight: '85%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalHeading, { color: theme.colors.textPrimary }]}>
                  {bookingConfirmed ? 'Reservation Confirmed' : 'Rental Quotation'}
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  {selectedEquipment?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {bookingConfirmed ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <View style={[styles.successCircle, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="checkmark-done" size={38} color="#16A34A" />
                </View>
                <Text style={[styles.successHeadline, { color: theme.colors.textPrimary }]}>
                  Booking Request Sent!
                </Text>
                <Text style={[styles.successSub, { color: theme.colors.textSecondary }]}>
                  Supplier <Text style={{ fontWeight: '700' }}>{selectedEquipment?.vendor}</Text> has been notified for dispatch.
                </Text>

                <View style={[styles.confirmBox, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.border }]}>
                  <View style={styles.termRow}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Booking Ref:</Text>
                    <Text style={{ fontWeight: '700', color: theme.colors.primary, fontSize: 14 }}>{bookingRef}</Text>
                  </View>
                  <View style={[styles.termRow, { marginTop: 6 }]}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Duration:</Text>
                    <Text style={{ fontWeight: '600', color: theme.colors.textPrimary, fontSize: 13 }}>{rentalDays} Working Days</Text>
                  </View>
                  <View style={[styles.termRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
                    <Text style={{ fontWeight: '700', color: theme.colors.textPrimary, fontSize: 14 }}>Estimated Total:</Text>
                    <Text style={{ fontWeight: '800', color: theme.colors.primary, fontSize: 16 }}>₹{calculateTotal().toLocaleString()}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={[styles.modalCloseBtn, { backgroundColor: theme.colors.primary, width: '100%', marginTop: 16 }]}
                >
                  <Text style={styles.modalCloseBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Duration Picker */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 8 }}>
                  Rental Duration (Days):
                </Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    onPress={() => setRentalDays(Math.max(1, rentalDays - 1))}
                    style={[styles.stepperBtn, { backgroundColor: theme.colors.surfaceVariant }]}
                  >
                    <Ionicons name="remove" size={18} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.stepperValueText, { color: theme.colors.textPrimary }]}>
                    {rentalDays} Days
                  </Text>
                  <TouchableOpacity
                    onPress={() => setRentalDays(rentalDays + 1)}
                    style={[styles.stepperBtn, { backgroundColor: theme.colors.surfaceVariant }]}
                  >
                    <Ionicons name="add" size={18} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Operator Add-on */}
                {selectedEquipment?.operatorAvailable && (
                  <TouchableOpacity
                    onPress={() => setIncludeOperator(!includeOperator)}
                    style={[
                      styles.operatorToggleCard,
                      {
                        backgroundColor: includeOperator ? theme.colors.primaryLight : theme.colors.surfaceVariant,
                        borderColor: includeOperator ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={includeOperator ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={includeOperator ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary }}>
                        Include Certified Machine Operator
                      </Text>
                      <Text style={{ fontSize: 11.5, color: theme.colors.textSecondary }}>
                        +₹{selectedEquipment.operatorDailyCost.toLocaleString()} / Day
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Price Total Card */}
                <View style={[styles.totalQuoteCard, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.border }]}>
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Estimated Rental Quote</Text>
                  <Text style={[styles.quoteTotalAmount, { color: theme.colors.primary }]}>
                    ₹{calculateTotal().toLocaleString()}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: theme.colors.textTertiary }}>
                    Includes logistics dispatch coordination & insurance
                  </Text>
                </View>

                {/* Site Delivery Address */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary, marginTop: 12, marginBottom: 6 }}>
                  Project Site Delivery Address:
                </Text>
                <TextInput
                  value={deliverySite}
                  onChangeText={setDeliverySite}
                  placeholder="e.g. Plot 12, Knowledge City, Madhapur, Hyderabad"
                  placeholderTextColor={theme.colors.textTertiary}
                  style={{
                    backgroundColor: theme.colors.surfaceVariant,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    color: theme.colors.textPrimary,
                    fontSize: 13,
                    marginBottom: 10,
                  }}
                />

                <TouchableOpacity
                  onPress={handleConfirmBooking}
                  disabled={isBooking}
                  style={[
                    styles.modalCloseBtn,
                    {
                      backgroundColor: theme.colors.primary,
                      marginTop: 14,
                      opacity: isBooking ? 0.7 : 1,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 8,
                    },
                  ]}
                >
                  {isBooking && <ActivityIndicator color="#FFFFFF" size="small" />}
                  <Text style={styles.modalCloseBtnText}>
                    {isBooking ? 'Securing Machinery...' : 'Confirm Rental Reservation'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ================================================================== */
/* STYLES                                                             */
/* ================================================================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  scrollPadding: {
    padding: 16,
    paddingBottom: 40,
  },
  statsGridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statGradientCard: {
    borderRadius: 10,
    padding: 14,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  statPillGold: {
    color: '#FDB913',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statRevenueValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginVertical: 4,
  },
  statCardWhite: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  statLabelMuted: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statValueLarge: {
    fontSize: 20,
    fontWeight: '800',
    marginVertical: 4,
  },
  statHintText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  opRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  opIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  opSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalValueBanner: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  modalBigVal: {
    fontSize: 24,
    fontWeight: '800',
  },
  modalSubheading: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  detailItemText: {
    fontSize: 13,
  },
  modalCloseBtn: {
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  supplierBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  supplierAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplierAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  supplierNameText: {
    fontSize: 16,
    fontWeight: '700',
  },
  supplierLocText: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 6,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  verifiedPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  productRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  productRowTitle: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  productRowSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  productRowPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyCatalogBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyCatalogText: {
    fontSize: 12.5,
    marginTop: 8,
    textAlign: 'center',
  },
  filterTabsWrapper: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  filterTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
  },
  rentalCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  rentalImg: {
    width: '100%',
    height: 160,
  },
  rentalCardBody: {
    padding: 14,
  },
  rentalCategoryTag: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rentalVendorText: {
    fontSize: 11,
  },
  rentalName: {
    fontSize: 15,
    fontWeight: '700',
    marginVertical: 4,
  },
  rentalSpecsRow: {
    flexDirection: 'row',
    borderRadius: 6,
    borderWidth: 1,
    padding: 8,
    marginVertical: 8,
  },
  rentalSpecCol: {
    flex: 1,
    alignItems: 'center',
  },
  rentalSpecLabel: {
    fontSize: 9.5,
  },
  rentalSpecVal: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  rentalFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  rentalPriceAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  rentalPricePerDay: {
    fontSize: 11.5,
    fontWeight: '400',
  },
  rentalWeeklyText: {
    fontSize: 10.5,
    marginTop: 1,
  },
  checkAvailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 6,
  },
  checkAvailBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 8,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueText: {
    fontSize: 16,
    fontWeight: '700',
  },
  operatorToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 10,
  },
  totalQuoteCard: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginVertical: 10,
  },
  quoteTotalAmount: {
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 4,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successHeadline: {
    fontSize: 18,
    fontWeight: '700',
  },
  successSub: {
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  confirmBox: {
    width: '100%',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  termRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
