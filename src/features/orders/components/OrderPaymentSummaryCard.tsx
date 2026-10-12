/**
 * HINCH MART — Authoritative Order Payment & Financial Summary Card
 * Reusable across Order Details and Order Tracking screens.
 * 
 * Strict Accounting & Lifecycle Separation:
 * 1. Order Status: Operational/fulfillment stage (Placed, Confirmed, Shipped, Delivered)
 * 2. Payment Method: Chosen settlement mode (Cash on Delivery, UPI, Card, Net Banking)
 * 3. Payment Status: Financial transaction state (Due on Delivery, Paid & Captured, Processing, Failed)
 * 4. Financial Reconciliation:
 *    - Items Subtotal
 *    - Product / Coupon Discounts
 *    - Applicable Taxes (GST 18%)
 *    - Delivery / Freight Charges
 *    - Crane Unloading Fees (if applicable)
 *    - Total Order Amount
 *    - Amount Paid (ONLY for verified collections)
 *    - Amount Payable / Due (Outstanding amount to be collected on delivery)
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { Order } from '../../../types/order.types';
import { PaymentStatusResponse } from '../../../types/backend.types';
import { formatPrice } from '../../../utils';

export interface OrderPaymentSummaryCardProps {
  order: Order | null;
  paymentRecord?: PaymentStatusResponse | null;
  currency?: string;
  style?: StyleProp<ViewStyle>;
  hideDetails?: boolean;
}

export function OrderPaymentSummaryCard({
  order,
  paymentRecord,
  currency = 'INR',
  style,
  hideDetails = false,
}: OrderPaymentSummaryCardProps) {
  const { theme, isDark } = useTheme();

  if (!order) return null;

  // ── 1. PAYMENT METHOD RESOLUTION ──
  const rawMethod = (
    order.paymentMethod ||
    paymentRecord?.paymentMethod ||
    'COD'
  ).toUpperCase();

  const isCod =
    rawMethod === 'COD' ||
    rawMethod === 'CASH_ON_DELIVERY' ||
    rawMethod === 'PAY_ON_DELIVERY';

  const getPaymentMethodDisplay = () => {
    if (isCod) return 'Cash on Delivery (Pay on Site)';
    switch (rawMethod) {
      case 'UPI':
      case 'GPAY':
      case 'PHONEPE':
        return 'Instant UPI / QR Code';
      case 'CARD':
      case 'CREDIT_CARD':
      case 'DEBIT_CARD':
        return 'Corporate Credit / Debit Card';
      case 'NETBANKING':
      case 'NET_BANKING':
        return 'Corporate Net Banking';
      case 'ESCROW':
        return 'Escrow Wire Transfer';
      case 'CREDIT':
      case 'CREDIT_LINE':
        return 'HinchMart 30-Day Credit Line';
      case 'RAZORPAY':
        return 'Razorpay Secure Online';
      default:
        return 'Online Payment';
    }
  };

  // ── 2. PAYMENT STATUS RESOLUTION (AUTHORITATIVE FINANCIAL STATE) ──
  const rawPaymentStatus = (
    paymentRecord?.status ||
    order.paymentStatus ||
    (isCod ? 'DUE_ON_DELIVERY' : 'PENDING')
  ).toUpperCase();

  const isPaid =
    rawPaymentStatus === 'PAID' ||
    rawPaymentStatus === 'CAPTURED' ||
    rawPaymentStatus === 'SUCCESS' ||
    rawPaymentStatus === 'VERIFIED';

  const isPending =
    !isCod &&
    (rawPaymentStatus === 'PENDING' ||
      rawPaymentStatus === 'PROCESSING' ||
      rawPaymentStatus === 'INITIATED');

  const isFailed =
    !isCod &&
    (rawPaymentStatus === 'FAILED' ||
      rawPaymentStatus === 'DECLINED' ||
      rawPaymentStatus === 'CANCELLED' ||
      rawPaymentStatus === 'ERROR');

  const isCreditApproved = rawPaymentStatus === 'CREDIT_APPROVED';

  const getPaymentStatusBadge = () => {
    if (isCod) {
      if (isPaid) {
        return {
          label: 'Collected on Site Delivery',
          color: '#10B981',
          bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7',
          icon: 'checkmark-circle' as const,
        };
      }
      return {
        label: 'Payment Due on Delivery',
        color: '#D97706',
        bg: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7',
        icon: 'time-outline' as const,
      };
    }

    if (isPaid) {
      return {
        label: 'Paid & Verified',
        color: '#10B981',
        bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7',
        icon: 'shield-checkmark' as const,
      };
    }

    if (isCreditApproved) {
      return {
        label: 'Approved (30-Day Credit Line)',
        color: '#3B82F6',
        bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE',
        icon: 'card-outline' as const,
      };
    }

    if (isPending) {
      return {
        label: 'Payment Processing',
        color: '#3B82F6',
        bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE',
        icon: 'sync-outline' as const,
      };
    }

    if (isFailed) {
      return {
        label: 'Payment Failed',
        color: '#EF4444',
        bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
        icon: 'alert-circle' as const,
      };
    }

    return {
      label: 'Payment Due',
      color: '#D97706',
      bg: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7',
      icon: 'time-outline' as const,
    };
  };

  const statusBadge = getPaymentStatusBadge();

  // ── 3. FINANCIAL AMOUNTS & RECONCILIATION ──
  const lineItemsSum =
    Array.isArray(order.items) && order.items.length > 0
      ? order.items.reduce(
          (acc, it) =>
            acc + (Number(it.lineTotal || (it.unitPrice * (it.quantity || 1))) || 0),
          0
        )
      : 0;

  const subtotal = order.subtotal ?? (lineItemsSum > 0 ? lineItemsSum : order.totalAmount ?? 0);
  const freight = order.freightCharge ?? order.shippingCost ?? 0;
  const crane = order.craneUnloadingCharge ?? 0;
  const discount = order.discount ?? 0;

  // Reconcile GST Taxes
  const explicitTax =
    order.totalGst ??
    (order.cgst !== undefined || order.sgst !== undefined || order.igst !== undefined
      ? (order.cgst || 0) + (order.sgst || 0) + (order.igst || 0)
      : order.tax ?? 0);

  let finalTax = explicitTax;
  const rawTotal = order.totalAmount ?? order.grandTotal ?? order.total ?? 0;

  // If explicit tax is missing from legacy summary but grand total exceeds subtotal + fees
  if (finalTax <= 0 && rawTotal > subtotal + freight + crane - discount && subtotal > 0) {
    const diff = rawTotal - (subtotal + freight + crane - discount);
    if (diff > 0) {
      finalTax = Number(diff.toFixed(2));
    }
  }

  const grandTotal =
    rawTotal > 0
      ? rawTotal
      : Math.max(0, subtotal - discount + finalTax + freight + crane);

  // Authoritative Paid vs Outstanding logic
  let amountPaid = 0;
  let amountDue = grandTotal;

  if (isPaid) {
    amountPaid = grandTotal;
    amountDue = 0;
  } else if (isCod) {
    amountPaid = 0;
    amountDue = grandTotal;
  } else if (isPending || isFailed) {
    amountPaid = 0;
    amountDue = grandTotal;
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.cardBackground,
          borderColor: theme.colors.cardBorder,
        },
        style,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <Ionicons name="receipt-outline" size={18} color="#E31E24" />
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Payment & Financial Summary
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusBadge.bg }]}>
          <Ionicons name={statusBadge.icon} size={13} color={statusBadge.color} />
          <Text style={[styles.badgeText, { color: statusBadge.color }]}>
            {statusBadge.label}
          </Text>
        </View>
      </View>

      {/* Row: Payment Mode */}
      <View style={styles.summaryRow}>
        <Text style={[styles.labelKey, { color: theme.colors.textSecondary }]}>
          Payment Method
        </Text>
        <Text style={[styles.labelValBold, { color: theme.colors.textPrimary }]}>
          {getPaymentMethodDisplay()}
        </Text>
      </View>

      {/* Row: Payment Status Pill */}
      <View style={styles.summaryRow}>
        <Text style={[styles.labelKey, { color: theme.colors.textSecondary }]}>
          Payment Status
        </Text>
        <Text
          style={[
            styles.labelValBold,
            { color: isPaid ? '#10B981' : isCod ? '#D97706' : isFailed ? '#EF4444' : '#3B82F6' },
          ]}
        >
          {statusBadge.label}
        </Text>
      </View>

      {!hideDetails && (
        <>
          <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

          {/* Subtotal */}
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>
              Items Subtotal
            </Text>
            <Text style={[styles.priceValue, { color: theme.colors.textPrimary }]}>
              {formatPrice(subtotal, currency)}
            </Text>
          </View>

          {/* Applicable GST */}
          {finalTax > 0 && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>
                Applicable GST (18%)
              </Text>
              <Text style={[styles.priceValue, { color: theme.colors.textPrimary }]}>
                {formatPrice(finalTax, currency)}
              </Text>
            </View>
          )}

          {/* Delivery / Freight */}
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>
              Delivery / Freight Fee
            </Text>
            <Text
              style={[
                styles.priceValue,
                { color: freight === 0 ? '#10B981' : theme.colors.textPrimary },
              ]}
            >
              {freight === 0 ? 'Free Delivery (₹0)' : formatPrice(freight, currency)}
            </Text>
          </View>

          {/* Crane Unloading Charge */}
          {crane > 0 && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>
                Crane Unloading Charge
              </Text>
              <Text style={[styles.priceValue, { color: theme.colors.textPrimary }]}>
                {formatPrice(crane, currency)}
              </Text>
            </View>
          )}

          {/* Coupon Discount */}
          {discount > 0 && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: '#10B981' }]}>
                Discounts Applied
              </Text>
              <Text style={[styles.priceValue, { color: '#10B981' }]}>
                -{formatPrice(discount, currency)}
              </Text>
            </View>
          )}
        </>
      )}

      <View style={[styles.dividerBold, { backgroundColor: theme.colors.cardBorder }]} />

      {/* Total Order Amount */}
      <View style={styles.totalRow}>
        <Text style={[styles.totalLabel, { color: theme.colors.textPrimary }]}>
          Total Order Amount
        </Text>
        <Text style={[styles.totalValue, { color: theme.colors.textPrimary }]}>
          {formatPrice(grandTotal, currency)}
        </Text>
      </View>

      {/* Amount Paid vs Amount Due (Strictly authoritative!) */}
      {isPaid ? (
        <View style={styles.paidHighlightRow}>
          <View style={styles.highlightLeft}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={[styles.paidHighlightText, { color: '#10B981' }]}>
              Amount Paid
            </Text>
          </View>
          <Text style={[styles.paidHighlightAmount, { color: '#10B981' }]}>
            {formatPrice(amountPaid, currency)}
          </Text>
        </View>
      ) : isCod ? (
        <>
          <View style={styles.codDueHighlightRow}>
            <View style={styles.highlightLeft}>
              <Ionicons name="cash-outline" size={16} color="#E31E24" />
              <Text style={[styles.codDueHighlightText, { color: '#E31E24' }]}>
                Amount Payable on Delivery
              </Text>
            </View>
            <Text style={[styles.codDueHighlightAmount, { color: '#E31E24' }]}>
              {formatPrice(amountDue, currency)}
            </Text>
          </View>
          <View style={[styles.noticeBox, { backgroundColor: isDark ? 'rgba(217, 119, 6, 0.1)' : '#FFFBEB', borderColor: isDark ? 'rgba(217, 119, 6, 0.3)' : '#FDE68A' }]}>
            <Ionicons name="information-circle-outline" size={15} color="#D97706" style={{ marginTop: 1 }} />
            <Text style={[styles.noticeText, { color: isDark ? '#FDE68A' : '#92400E' }]}>
              Payment will be collected upon arrival at your project site. Cash, UPI, and company checks accepted by logistics partner.
            </Text>
          </View>
        </>
      ) : isPending ? (
        <View style={styles.pendingHighlightRow}>
          <View style={styles.highlightLeft}>
            <Ionicons name="time-outline" size={16} color="#3B82F6" />
            <Text style={[styles.pendingHighlightText, { color: '#3B82F6' }]}>
              Amount Pending Verification
            </Text>
          </View>
          <Text style={[styles.pendingHighlightAmount, { color: '#3B82F6' }]}>
            {formatPrice(amountDue, currency)}
          </Text>
        </View>
      ) : (
        <View style={styles.dueHighlightRow}>
          <Text style={[styles.dueHighlightText, { color: theme.colors.textSecondary }]}>
            Amount Due
          </Text>
          <Text style={[styles.dueHighlightAmount, { color: theme.colors.textPrimary }]}>
            {formatPrice(amountDue, currency)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.2,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1.5 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  labelKey: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
  },
  labelValBold: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  dividerBold: {
    height: 1.5,
    marginTop: 10,
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  priceLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
  },
  priceValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
    marginBottom: 8,
  },
  totalLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14.5,
  },
  totalValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15.5,
  },
  paidHighlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  highlightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paidHighlightText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  paidHighlightAmount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14.5,
  },
  codDueHighlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(227, 30, 36, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  codDueHighlightText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  codDueHighlightAmount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
  },
  pendingHighlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pendingHighlightText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  pendingHighlightAmount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14.5,
  },
  dueHighlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  dueHighlightText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  dueHighlightAmount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14.5,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  noticeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    lineHeight: 16,
    flex: 1,
  },
});
