import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { ordersApi } from '../../../services/api/orders.api';
import { paymentsApi } from '../../../services/api/payments.api';
import { Order, TrackingInfo } from '../../../types/order.types';
import { PaymentStatusResponse } from '../../../types/backend.types';
import { formatPrice } from '../../../utils';
import { OrderTrackingSkeleton } from '../../../components/feedback/SkeletonLoader';
import { OrderPaymentSummaryCard } from '../components/OrderPaymentSummaryCard';

interface TimelineStep {
  id: string;
  title: string;
  timestamp: string;
  description: string;
  status: 'completed' | 'active' | 'pending';
}

export function OrderTrackingScreen({ route, navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const rawOrderId = route?.params?.orderId || route?.params?.id || '';
  const cleanOrderId = String(rawOrderId).replace(/^#/, '');

  const [order, setOrder] = useState<Order | null>(null);
  const [tracking, setTracking] = useState<TrackingInfo | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<PaymentStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!cleanOrderId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    Promise.allSettled([
      ordersApi.getOrderDetail(cleanOrderId),
      ordersApi.getTracking(cleanOrderId),
      paymentsApi.getOrderPaymentStatus(cleanOrderId),
    ])
      .then(([orderRes, trackingRes, paymentRes]) => {
        if (!isMounted) return;
        if (orderRes.status === 'fulfilled' && orderRes.value) {
          setOrder(orderRes.value);
        }
        if (trackingRes.status === 'fulfilled' && trackingRes.value) {
          setTracking(trackingRes.value);
        }
        if (paymentRes.status === 'fulfilled' && paymentRes.value) {
          setPaymentRecord(paymentRes.value);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [cleanOrderId]);

  // Safe status bar top padding
  const topSafePadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20
  ) + 6;

  const firstItem = order?.items?.[0];
  const orderNumberDisplay = `#${order?.orderNumber || cleanOrderId || 'ORDER'}`;
  const placedDateStr = order?.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Recent';
  const itemCount = order?.items?.length || 1;
  const statusBadge = (order?.status || tracking?.currentStatus || (tracking as any)?.status || 'IN TRANSIT').toUpperCase();

  // Dynamic timeline from backend tracking or mapped from order status
  const timelineSteps: TimelineStep[] = React.useMemo(() => {
    const updatesList = tracking?.updates || (tracking as any)?.checkpoints;
    if (updatesList && updatesList.length > 0) {
      return updatesList.map((cp: any, idx: number) => ({
        id: String(idx + 1),
        title: cp.status || cp.description || 'Status Update',
        timestamp: cp.timestamp ? new Date(cp.timestamp).toLocaleString('en-IN') : '',
        description: cp.location || cp.description || '',
        status: idx === updatesList.length - 1 ? 'active' : 'completed',
      }));
    }
    if (order?.timeline && order.timeline.length > 0) {
      return order.timeline.map((tl: any, idx: number) => ({
        id: String(idx + 1),
        title: tl.status || tl.title || 'Update',
        timestamp: tl.timestamp ? new Date(tl.timestamp).toLocaleString('en-IN') : '',
        description: tl.description || '',
        status: tl.isCurrent ? 'active' : tl.isCompleted ? 'completed' : idx === (order?.timeline?.length || 1) - 1 ? 'active' : 'completed',
      }));
    }
    return [
      {
        id: '1',
        title: 'Order Confirmed',
        timestamp: placedDateStr,
        description: 'Your order has been placed and received by the vendor.',
        status: 'completed',
      },
      {
        id: '2',
        title: 'Processing / Dispatch',
        timestamp: 'In progress',
        description: 'Vendor is preparing items for dispatch.',
        status: statusBadge.includes('DELIVERED') || statusBadge.includes('SHIP') ? 'completed' : 'active',
      },
      {
        id: '3',
        title: 'Delivered',
        timestamp: order?.estimatedDelivery || 'Pending',
        description: 'Package delivered to project site.',
        status: statusBadge.includes('DELIVERED') ? 'completed' : 'pending',
      },
    ];
  }, [tracking, order, placedDateStr, statusBadge]);

  const helplineNumber = '1800-208-9898';
  const handleCallSupport = () => {
    Linking.openURL(`tel:${helplineNumber.replace(/-/g, '')}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#E31E24" translucent />

      {/* Top Navigation Bar with Safe Status Bar Insets */}
      <View
        style={[
          styles.topNavBar,
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
          style={styles.navBackBtn}
        >
          <Ionicons name="arrow-back" size={23} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: '#FFFFFF' }]}>Track Order</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('HelpSupport')}
          activeOpacity={0.7}
          style={styles.navHelpBtn}
        >
          <Ionicons name="help-circle-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <OrderTrackingSkeleton />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Order Header Section */}
          <View style={styles.orderHeaderRow}>
            <View style={styles.orderNumberWrapper}>
              <Text style={[styles.orderNumberText, { color: theme.colors.textPrimary }]}>Order {orderNumberDisplay}</Text>
              <Text style={[styles.placedDateText, { color: theme.colors.textTertiary }]}>
                Placed on {placedDateStr} • {itemCount} Items
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE' }]}>
              <Text style={[styles.statusBadgeText, { color: '#3B82F6' }]}>{statusBadge}</Text>
            </View>
          </View>

          {/* Product Item Summary Box */}
          {firstItem && (
            <View
              style={[
                styles.productSummaryCard,
                {
                  backgroundColor: theme.colors.cardBackground,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <Image
                source={{
                  uri:
                    firstItem.productImage ||
                    (firstItem as any)?.image ||
                    (firstItem as any)?.imageUrl ||
                    '',
                }}
                style={[styles.productThumb, { backgroundColor: theme.colors.surfaceVariant }]}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
              <View style={styles.productInfo}>
                <Text numberOfLines={2} style={[styles.productTitle, { color: theme.colors.textPrimary }]}>
                  {firstItem.productName || (firstItem as any)?.title || 'Order Item'}
                </Text>
                <Text style={[styles.productQty, { color: theme.colors.textSecondary }]}>Qty: {firstItem.quantity || 1}</Text>
                <Text style={[styles.productPrice, { color: theme.colors.textPrimary }]}>
                  {formatPrice(firstItem.totalPrice || firstItem.unitPrice || 0, (order?.currency as any) || 'INR')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('OrderDetail', { orderId: cleanOrderId })}
                activeOpacity={0.7}
                style={[styles.viewDetailsBtn, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.cardBorder }]}
              >
                <Text style={[styles.viewDetailsBtnText, { color: theme.colors.textPrimary }]}>View Details</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Vertical Timeline Flow */}
          <View style={[styles.timelineCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
            {timelineSteps.map((step, index) => {
              const isLast = index === timelineSteps.length - 1;
              const isCompleted = step.status === 'completed';
              const isActive = step.status === 'active';
              const isPending = step.status === 'pending';

              return (
                <View
                  key={step.id || index}
                  style={styles.timelineRow}
                >
                  {/* Left Indicator & Connecting Line */}
                  <View style={styles.indicatorCol}>
                    {isCompleted && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color="#10B981"
                        style={[styles.stepIcon, { backgroundColor: theme.colors.cardBackground }]}
                      />
                    )}

                    {isActive && (
                      <View style={styles.activeIconBadge}>
                        <Ionicons name="car" size={13} color="#FFFFFF" />
                      </View>
                    )}

                    {isPending && (
                      <View style={[styles.pendingRing, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]} />
                    )}

                    {/* Vertical Connecting Line */}
                    {!isLast && (
                      <View
                        style={[
                          styles.connectorLine,
                          isCompleted
                            ? styles.connectorLineCompleted
                            : [styles.connectorLinePending, { backgroundColor: theme.colors.cardBorder }],
                        ]}
                      />
                    )}
                  </View>

                  {/* Right Step Content */}
                  <View
                    style={[
                      styles.stepContent,
                      isActive && [
                        styles.stepContentActive,
                        {
                          backgroundColor: isDark ? 'rgba(227, 30, 36, 0.1)' : '#FEF2F2',
                          borderColor: isDark ? 'rgba(227, 30, 36, 0.3)' : '#FCA5A5',
                        },
                      ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepTitle,
                        { color: theme.colors.textPrimary },
                        isActive && { color: '#E31E24' },
                        isPending && { color: theme.colors.textTertiary },
                      ]}
                    >
                      {step.title}
                    </Text>
                    {Boolean(step.timestamp) && (
                      <Text style={[styles.stepTimestamp, { color: theme.colors.textTertiary }]}>{step.timestamp}</Text>
                    )}
                    {Boolean(step.description) && (
                      <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>{step.description}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Delivery Address Card */}
          {order?.shippingAddress && (
            <View style={[styles.addressCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
              <View style={styles.addressHeaderRow}>
                <Text style={[styles.addressHeaderTitle, { color: theme.colors.textPrimary }]}>Delivery Address</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.changeAddressBtn, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.cardBorder }]}
                  onPress={() => navigation.navigate('Addresses')}
                >
                  <Text style={[styles.changeAddressText, { color: '#E31E24' }]}>Change</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.addressDetailsRow}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color="#E31E24"
                  style={styles.locationPinIcon}
                />
                <View style={styles.addressTextWrapper}>
                  {Boolean(order.shippingAddress.fullName || (order.shippingAddress as any).name) && (
                    <Text style={[styles.recipientName, { color: theme.colors.textPrimary }]}>
                      {order.shippingAddress.fullName || (order.shippingAddress as any).name}
                    </Text>
                  )}
                  <Text style={[styles.addressLine, { color: theme.colors.textSecondary }]}>
                    {order.shippingAddress.addressLine1 || (order.shippingAddress as any).street || ''}
                  </Text>
                  <Text style={[styles.addressLine, { color: theme.colors.textSecondary }]}>
                    {[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postalCode || (order.shippingAddress as any).zipCode].filter(Boolean).join(', ')}
                  </Text>
                  {Boolean(order.shippingAddress.phone) && (
                    <Text style={[styles.phoneLine, { color: theme.colors.textTertiary }]}>Phone: {order.shippingAddress.phone}</Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Authoritative Payment & Financial Summary Card */}
          <OrderPaymentSummaryCard
            order={order}
            paymentRecord={paymentRecord}
            currency={(order?.currency as any) || 'INR'}
          />

          {/* Support & Helpline Card */}
          <View style={[styles.supportCard, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : '#EFF6FF', borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
            <Text style={[styles.supportQueryText, { color: isDark ? '#DBEAFE' : '#334155' }]}>
              Reach out to HINCH MART support for any tracking and delivery queries.
            </Text>
            <TouchableOpacity
              onPress={handleCallSupport}
              activeOpacity={0.8}
              style={styles.helplineBtn}
            >
              <Ionicons name="call" size={16} color={isDark ? '#EF4444' : '#E31E24'} />
              <Text style={[styles.helplineBtnText, { color: isDark ? '#EF4444' : '#0F172A' }]}>{helplineNumber}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Top Navbar
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  navBackBtn: {
    padding: 6,
    marginLeft: -4,
  },
  navTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17.5,
  },
  navHelpBtn: {
    padding: 6,
    marginRight: -4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  // Order Header
  orderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  orderNumberWrapper: {
    flex: 1,
  },
  orderNumberText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
  },
  placedDateText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Product Summary Card
  productSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  productThumb: {
    width: 62,
    height: 62,
    borderRadius: 10,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  productTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
  },
  productQty: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  productPrice: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14.5,
    marginTop: 3,
  },
  viewDetailsBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  viewDetailsBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
  },
  // Timeline Section
  timelineCard: {
    borderRadius: 14,
    borderWidth: 1.2,
    padding: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 64,
  },
  indicatorCol: {
    width: 32,
    alignItems: 'center',
    position: 'relative',
  },
  stepIcon: {
    zIndex: 2,
  },
  activeIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E31E24',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  pendingRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    zIndex: 2,
    marginTop: 2,
  },
  connectorLine: {
    position: 'absolute',
    top: 20,
    bottom: -4,
    width: 2,
    zIndex: 1,
  },
  connectorLineCompleted: {
    backgroundColor: '#10B981',
  },
  connectorLinePending: {
    backgroundColor: '#E2E8F0',
  },
  stepContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 16,
  },
  stepContentActive: {
    borderRadius: 12,
    padding: 12,
    marginLeft: 4,
    marginBottom: 8,
    borderWidth: 1,
  },
  stepTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
  },
  stepTimestamp: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  stepDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    marginTop: 3,
    lineHeight: 17,
  },
  // Address Card
  addressCard: {
    borderWidth: 1.2,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  addressHeaderTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14.5,
  },
  changeAddressBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changeAddressText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  addressDetailsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationPinIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  addressTextWrapper: {
    flex: 1,
  },
  recipientName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    marginBottom: 3,
  },
  addressLine: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  phoneLine: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    marginTop: 4,
  },
  // Support Box
  supportCard: {
    borderRadius: 14,
    padding: 14,
  },
  supportQueryText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 10,
  },
  helplineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  helplineBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
  },
});

/**
 * HINCH MART — Shipment Details Screen
 */
export function ShipmentDetailsScreen({ route, navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    courier = 'Logistics Partner',
    trackingNumber = '',
    expectedDelivery = 'In Transit',
    orderId = '',
    events: passedEvents,
  } = route.params ?? {};

  const [liveTracking, setLiveTracking] = useState<TrackingInfo | null>(null);

  useEffect(() => {
    if (orderId && !passedEvents) {
      ordersApi.getTracking(String(orderId).replace(/^#/, ''))
        .then((res) => {
          if (res) setLiveTracking(res);
        })
        .catch(() => {});
    }
  }, [orderId, passedEvents]);

  const topSafePadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20
  ) + 6;

  const rawEvents = passedEvents || liveTracking?.updates || (liveTracking as any)?.checkpoints || [];
  const shipmentEvents = rawEvents.length > 0
    ? rawEvents.map((e: any, idx: number) => ({
        id: String(idx + 1),
        status: e.status || e.description || 'Checkpoint Update',
        location: e.location || '',
        time: e.timestamp ? new Date(e.timestamp).toLocaleString('en-IN') : '',
        done: true,
      }))
    : [
        { id: '1', status: 'Order Dispatched', location: 'Logistics Facility', time: 'In Progress', done: true },
        { id: '2', status: 'Order Confirmed', location: 'HinchMart Platform', time: 'Completed', done: true },
      ];

  const activeCourier = liveTracking?.carrier || courier;
  const activeTrackingNum = liveTracking?.trackingNumber || trackingNumber || `AWB-${orderId || 'N/A'}`;
  const activeEstimatedDelivery = liveTracking?.estimatedDelivery
    ? new Date(liveTracking.estimatedDelivery).toLocaleDateString('en-IN')
    : expectedDelivery;

  return (
    <View style={[shipStyles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#E31E24" translucent />

      {/* Header */}
      <View
        style={[
          shipStyles.topNavBar,
          {
            paddingTop: topSafePadding,
            backgroundColor: '#E31E24',
            borderBottomColor: '#C4181D',
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={shipStyles.navBackBtn}>
          <Ionicons name="arrow-back" size={23} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[shipStyles.navTitle, { color: '#FFFFFF' }]}>Shipment Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          shipStyles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Courier Info Card */}
        <View style={[shipStyles.courierCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
          <View style={shipStyles.courierRow}>
            <View style={[shipStyles.courierIconBox, { backgroundColor: 'rgba(227, 30, 36, 0.08)' }]}>
              <Ionicons name="cube-outline" size={22} color="#E31E24" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[shipStyles.courierName, { color: theme.colors.textPrimary }]}>{activeCourier}</Text>
              <Text style={[shipStyles.courierTracking, { color: theme.colors.textSecondary }]}>AWB: {activeTrackingNum}</Text>
            </View>
          </View>

          <View style={[shipStyles.divider, { backgroundColor: theme.colors.cardBorder }]} />

          <View style={shipStyles.detailRow}>
            <Text style={[shipStyles.detailLabel, { color: theme.colors.textSecondary }]}>Expected Delivery</Text>
            <Text style={shipStyles.detailValueGreen}>{activeEstimatedDelivery}</Text>
          </View>

          <View style={[shipStyles.detailRow, { marginTop: 8 }]}>
            <Text style={[shipStyles.detailLabel, { color: theme.colors.textSecondary }]}>Tracking Number</Text>
            <Text style={[shipStyles.detailValue, { color: theme.colors.textPrimary }]}>{activeTrackingNum}</Text>
          </View>

          <View style={[shipStyles.detailRow, { marginTop: 8 }]}>
            <Text style={[shipStyles.detailLabel, { color: theme.colors.textSecondary }]}>Order ID</Text>
            <Text style={[shipStyles.detailValue, { color: theme.colors.textPrimary }]}>#{orderId || 'N/A'}</Text>
          </View>
        </View>

        {/* Shipment Timeline */}
        <Text style={[shipStyles.sectionTitle, { color: theme.colors.textPrimary }]}>Tracking History</Text>

        <View style={shipStyles.timelineCard}>
          {shipmentEvents.map((event: any, idx: number) => (
            <View key={event.id} style={shipStyles.timelineRow}>
              {/* Indicator */}
              <View style={shipStyles.indicatorCol}>
                <View style={[shipStyles.dot, event.done ? shipStyles.dotDone : [shipStyles.dotPending, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.cardBackground }]]} />
                {idx < shipmentEvents.length - 1 && (
                  <View style={[shipStyles.connector, event.done ? shipStyles.connectorDone : [shipStyles.connectorPending, { backgroundColor: theme.colors.cardBorder }]]} />
                )}
              </View>

              {/* Content */}
              <View style={shipStyles.eventContent}>
                <Text style={[shipStyles.eventStatus, { color: theme.colors.textPrimary }, !event.done && { color: theme.colors.textTertiary }]}>
                  {event.status}
                </Text>
                <Text style={[shipStyles.eventLocation, { color: theme.colors.textSecondary }]}>{event.location}</Text>
                <Text style={[shipStyles.eventTime, { color: theme.colors.textTertiary }]}>{event.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const shipStyles = StyleSheet.create({
  container: { flex: 1 },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  navBackBtn: { padding: 6, marginLeft: -4 },
  navTitle: { fontFamily: 'Poppins_700Bold', fontSize: 17.5 },
  scrollContent: { padding: 16 },
  courierCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.2,
    marginBottom: 24,
  },
  courierRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  courierIconBox: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  courierName: { fontFamily: 'Poppins_700Bold', fontSize: 15 },
  courierTracking: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  divider: { height: 1, marginBottom: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  detailValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  detailValueGreen: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#10B981' },
  sectionTitle: {
    fontFamily: 'Poppins_700Bold', fontSize: 15, marginBottom: 14,
  },
  timelineCard: { paddingLeft: 4 },
  timelineRow: { flexDirection: 'row', minHeight: 60 },
  indicatorCol: { width: 28, alignItems: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, zIndex: 2 },
  dotDone: { backgroundColor: '#10B981' },
  dotPending: { borderWidth: 2 },
  connector: { flex: 1, width: 2, marginVertical: 2 },
  connectorDone: { backgroundColor: '#10B981' },
  connectorPending: {},
  eventContent: { flex: 1, paddingLeft: 12, paddingBottom: 18 },
  eventStatus: { fontFamily: 'Inter_600SemiBold', fontSize: 13.5 },
  eventLocation: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  eventTime: { fontFamily: 'Inter_400Regular', fontSize: 11.5, marginTop: 2 },
});

export default OrderTrackingScreen;
