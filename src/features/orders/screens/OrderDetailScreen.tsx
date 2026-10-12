import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { ordersApi } from '../../../services/api/orders.api';
import { paymentsApi } from '../../../services/api/payments.api';
import { Order } from '../../../types/order.types';
import { PaymentStatusResponse } from '../../../types/backend.types';
import { formatPrice } from '../../../utils';
import { OrderDetailSkeleton } from '../../../components/feedback/SkeletonLoader';
import { InvoiceDetailModal } from '../../../components/ui/InvoiceDetailModal';
import { invoicesApi } from '../../../services/api/invoices.api';
import { DetailedInvoiceBreakdown } from '../../../types/invoice.types';
import { OrderPaymentSummaryCard } from '../components/OrderPaymentSummaryCard';

export function OrderDetailScreen({ route, navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const rawOrderId = route?.params?.orderId || route?.params?.id || '';
  const cleanOrderId = String(rawOrderId).replace(/^#/, '');

  const [order, setOrder] = useState<Order | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<PaymentStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceBreakdown, setInvoiceBreakdown] = useState<DetailedInvoiceBreakdown | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!cleanOrderId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    Promise.allSettled([
      ordersApi.getOrderDetail(cleanOrderId),
      paymentsApi.getOrderPaymentStatus(cleanOrderId),
    ])
      .then(([orderRes, paymentRes]) => {
        if (!isMounted) return;
        if (orderRes.status === 'fulfilled' && orderRes.value) {
          setOrder(orderRes.value);
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

  const handleDownloadInvoice = async () => {
    setShowInvoiceModal(true);
    setIsLoadingInvoice(true);
    setInvoiceBreakdown(null);
    try {
      const detailed = await invoicesApi.getDetailedInvoice(cleanOrderId);
      setInvoiceBreakdown(detailed);
    } catch {
      // Invoice not available from backend yet
      setInvoiceBreakdown(null);
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        { text: 'No, Keep Order', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsCancelling(true);
              await ordersApi.cancelOrder(cleanOrderId, 'Cancelled by customer');
              Alert.alert('Order Cancelled', 'Your order has been successfully cancelled.');
              // Refresh order details
              const updated = await ordersApi.getOrderDetail(cleanOrderId);
              if (updated) setOrder(updated);
            } catch (err: any) {
              Alert.alert('Cancellation Failed', err?.message || 'Could not cancel order.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  const topSafePadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20
  ) + 6;

  const orderNumberDisplay = `#${order?.orderNumber || cleanOrderId || 'ORDER'}`;
  const placedDateStr = order?.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Recent';
  const statusDisplay = (order?.orderStatus || order?.status || 'CONFIRMED').toUpperCase();
  const isCancellable = Boolean(
    order && ['PENDING', 'PLACED', 'CONFIRMED', 'PROCESSING'].includes(statusDisplay)
  );
  const items = order?.items || [];
  const currency = (order?.currency as any) || 'INR';

  const address = order?.shippingAddress;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#E31E24" translucent />

      {/* Top Navbar with Safe Top Padding */}
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
        <Text style={[styles.navTitle, { color: '#FFFFFF' }]}>Order Details</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <OrderDetailSkeleton />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Order ID & Status */}
          <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={[styles.orderNumberText, { color: theme.colors.textPrimary }]}>Order {orderNumberDisplay}</Text>
                <Text style={[styles.placedDateText, { color: theme.colors.textTertiary }]}>Placed on {placedDateStr}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{statusDisplay}</Text>
              </View>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('OrderTracking', {
                    orderId: cleanOrderId,
                    orderNumber: orderNumberDisplay,
                  })
                }
                activeOpacity={0.85}
                style={[styles.trackBtn, { flex: 1 }]}
              >
                <Ionicons name="navigate-outline" size={17} color="#FFFFFF" />
                <Text style={styles.trackBtnText}>Track Order</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDownloadInvoice}
                disabled={isDownloading}
                activeOpacity={0.85}
                style={[styles.invoiceBtn, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.surfaceVariant }]}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#E31E24" />
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={17} color="#E31E24" />
                    <Text style={[styles.invoiceBtnText, { color: theme.colors.textPrimary }]}>Invoice PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {isCancellable && (
              <TouchableOpacity
                onPress={handleCancelOrder}
                disabled={isCancelling}
                activeOpacity={0.85}
                style={styles.cancelBtn}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                    <Text style={styles.cancelBtnText}>Cancel Order</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Ordered Items */}
          {items.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Items in Order ({items.length})</Text>
              {items.map((item, idx) => {
                const itemImg =
                  item.productImage ||
                  (item as any)?.image ||
                  (item as any)?.imageUrl ||
                  '';
                return (
                  <View key={item.id || idx} style={styles.productRow}>
                    <Image
                      source={{ uri: itemImg }}
                      style={[styles.productThumb, { backgroundColor: theme.colors.surfaceVariant }]}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={200}
                    />
                    <View style={styles.productInfo}>
                      <Text style={[styles.productTitle, { color: theme.colors.textPrimary }]}>
                        {item.productName || (item as any)?.title || 'Item'}
                      </Text>
                      <Text style={[styles.productSpecs, { color: theme.colors.textSecondary }]}>
                        Qty: {item.quantity || 1} {item.variantName ? `• ${item.variantName}` : ''}
                      </Text>
                      <Text style={[styles.productPrice, { color: theme.colors.textPrimary }]}>
                        {formatPrice(item.totalPrice || item.unitPrice || 0, currency)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Authoritative Payment & Financial Summary Card */}
          <OrderPaymentSummaryCard
            order={order}
            paymentRecord={paymentRecord}
            currency={currency}
          />

          {/* Shipping Address */}
          {(address || order?.orderForSomeoneElse) && (
            <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary, marginBottom: 0 }]}>Delivery Address</Text>
                {Boolean(order?.orderForSomeoneElse) && (
                  <View style={{ backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="gift-outline" size={13} color="#D97706" />
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: '#B45309' }}>FOR SOMEONE ELSE</Text>
                  </View>
                )}
              </View>

              {Boolean(order?.orderForSomeoneElse || order?.recipientName) && (
                <View
                  style={{
                    backgroundColor: isDark ? 'rgba(253, 185, 19, 0.08)' : '#FFFBEB',
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(253, 185, 19, 0.25)' : '#FDE68A',
                  }}
                >
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: isDark ? '#FDB913' : '#92400E', marginBottom: 4, letterSpacing: 0.5 }}>
                    RECIPIENT CONTACT DETAILS
                  </Text>
                  {Boolean(order?.recipientName) && (
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: theme.colors.textPrimary }}>
                      Name: {order.recipientName}
                    </Text>
                  )}
                  {Boolean(order?.recipientPhone) && (
                    <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: theme.colors.textSecondary, marginTop: 2 }}>
                      Mobile: {order.recipientPhone}
                    </Text>
                  )}
                  {Boolean(order?.notes) && (
                    <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: theme.colors.textTertiary, marginTop: 3, fontStyle: 'italic' }}>
                      Driver Note: {order.notes}
                    </Text>
                  )}
                </View>
              )}

              {address && (
                <View style={styles.addressBox}>
                  <View style={[styles.addressIconWrap, { backgroundColor: 'rgba(227, 30, 36, 0.08)' }]}>
                    <Ionicons name="location-outline" size={20} color="#E31E24" />
                  </View>
                  <View style={styles.addressTextCol}>
                    {Boolean(address.fullName || (address as any).name) && (
                      <Text style={[styles.addressName, { color: theme.colors.textPrimary }]}>
                        {address.fullName || (address as any).name}
                      </Text>
                    )}
                    {Boolean((address as any).formattedAddress) ? (
                      <Text style={[styles.addressLine, { color: theme.colors.textSecondary }]}>
                        {(address as any).formattedAddress}
                      </Text>
                    ) : (
                      <>
                        <Text style={[styles.addressLine, { color: theme.colors.textSecondary }]}>
                          {address.addressLine1 || (address as any).street || ''}
                        </Text>
                        <Text style={[styles.addressLine, { color: theme.colors.textSecondary }]}>
                          {[address.city, address.state, address.postalCode || (address as any).zipCode].filter(Boolean).join(', ')}
                        </Text>
                      </>
                    )}
                    {Boolean(address.phone) && (
                      <Text style={[styles.addressPhone, { color: theme.colors.textTertiary }]}>Phone: {address.phone}</Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Need Help with this Order? Support Ticket Card */}
          <TouchableOpacity
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.cardBackground,
                borderColor: theme.colors.cardBorder,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
            ]}
            onPress={() =>
              navigation.navigate('SupportTickets', {
                orderId: cleanOrderId,
              })
            }
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: '#FEF2F2',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="chatbubbles-outline" size={20} color="#E31E24" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13.5, color: theme.colors.textPrimary }}>
                  Need Help with this Order?
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11.5, color: theme.colors.textSecondary }}>
                  Raise a ticket for delivery, materials, or billing
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* GST Tax Invoice Detail Modal */}
      <InvoiceDetailModal
        visible={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        invoice={invoiceBreakdown}
        isLoading={isLoadingInvoice}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  navBackBtn: {
    padding: 6,
    marginLeft: -4,
  },
  navTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17.5,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderNumberText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
  },
  placedDateText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#3B82F6',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E31E24',
    paddingVertical: 12,
    borderRadius: 10,
  },
  trackBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  invoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  invoiceBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  cancelBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
    color: '#EF4444',
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    marginBottom: 12,
  },
  productRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  productThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    lineHeight: 17,
  },
  productSpecs: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    marginTop: 2,
  },
  productPrice: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13.5,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
  },
  priceValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  totalLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13.5,
  },
  totalValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
  },
  addressBox: {
    flexDirection: 'row',
    gap: 12,
  },
  addressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressTextCol: {
    flex: 1,
  },
  addressName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    marginBottom: 2,
  },
  addressLine: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  addressPhone: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    marginTop: 4,
  },
});

export default OrderDetailScreen;
