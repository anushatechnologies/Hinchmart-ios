/**
 * HINCH MART — Dynamic Order Confirmation Screen
 * Enterprise B2B Procurement Order & Payment Receipt
 * 
 * Authoritative State Architecture:
 * - Order Status: Current order/fulfillment lifecycle state (confirmed, processing, dispatched, delivered)
 * - Payment Method: User payment method (Cash on Delivery, UPI, Card, Net Banking, Credit)
 * - Payment Status: Financial transaction state (Due on Delivery, Paid & Captured, Processing, Failed)
 * - Financial Amount: "Amount Paid" ONLY for verified collected payments; "Amount Payable" for unpaid COD
 * - Tax Invoice: Rendered and downloadable only when real backend invoice exists
 * - Tracking: Accessible based on order eligibility
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Clipboard,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../theme';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { InvoiceDetailModal } from '../../../components/ui/InvoiceDetailModal';
import { ordersApi } from '../../../services/api/orders.api';
import { paymentsApi } from '../../../services/api/payments.api';
import { invoicesApi } from '../../../services/api/invoices.api';
import { Order } from '../../../types/order.types';
import { PaymentStatusResponse } from '../../../types/backend.types';
import { DetailedInvoiceBreakdown } from '../../../types/invoice.types';
import { formatPrice } from '../../../utils';

interface OrderConfirmationProps {
  route: any;
  navigation: any;
}

export function OrderSuccessScreen({ route, navigation }: OrderConfirmationProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isTabletOrDesktop = windowWidth >= 600;

  // Extract initial parameters from navigation route
  const {
    orderId: initialOrderId = '',
    orderNumber: initialOrderNumber = '',
    paymentMethod: initialPaymentMethod = 'COD',
    totalAmount: initialTotalAmount = 0,
    paymentStatus: initialPaymentStatus = '',
    orderStatus: initialOrderStatus = '',
    razorpayPaymentId: initialRazorpayPaymentId = '',
    razorpayOrderId: initialRazorpayOrderId = '',
    storeInvoiceNumber: initialStoreInvoiceNumber = '',
    deliveryDestination: initialDeliveryDestination = 'Confirmed Project Site',
    orderForSomeoneElse: initialOrderForSomeoneElse = false,
    recipientName: initialRecipientName = '',
    recipientPhone: initialRecipientPhone = '',
    notes: initialNotes = '',
    errorMessage: initialErrorMessage = '',
  } = route?.params ?? {};

  const cleanOrderId = String(initialOrderId).replace(/^#/, '');

  // Live Authoritative Backend State
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<PaymentStatusResponse | null>(null);
  const [isLoadingBackend, setIsLoadingBackend] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [copied, setCopied] = useState(false);

  // Invoice Download & Modal State
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceBreakdown, setInvoiceBreakdown] = useState<DetailedInvoiceBreakdown | null>(null);
  const [isLoadingInvoiceBreakdown, setIsLoadingInvoiceBreakdown] = useState(false);

  // Polling ref for pending payment verification
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);

  // ── 1. AUTHORITATIVE DATA FETCHING ──
  const fetchAuthoritativeData = useCallback(async () => {
    if (!cleanOrderId) return;
    setIsLoadingBackend(true);
    try {
      const [orderResult, paymentResult] = await Promise.allSettled([
        ordersApi.getOrderDetail(cleanOrderId),
        paymentsApi.getOrderPaymentStatus(cleanOrderId),
      ]);

      if (orderResult.status === 'fulfilled' && orderResult.value) {
        setOrder(orderResult.value);
      }
      if (paymentResult.status === 'fulfilled' && paymentResult.value) {
        setPaymentRecord(paymentResult.value);
      }
    } catch {
      // Graceful fallback to initial route parameters
    } finally {
      setIsLoadingBackend(false);
    }
  }, [cleanOrderId]);

  useEffect(() => {
    fetchAuthoritativeData();

    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [fetchAuthoritativeData]);

  // ── 2. STATE NORMALIZATION & COMPUTATION ──
  // Resolve effective values prioritizing fresh backend record
  const effectiveMethod = (
    order?.paymentMethod ||
    paymentRecord?.paymentMethod ||
    initialPaymentMethod ||
    'COD'
  ).toUpperCase();

  const isCod =
    effectiveMethod === 'COD' ||
    effectiveMethod === 'CASH_ON_DELIVERY' ||
    effectiveMethod === 'PAY_ON_DELIVERY';

  const effectivePaymentStatus = (
    paymentRecord?.status ||
    order?.paymentStatus ||
    initialPaymentStatus ||
    (isCod ? 'DUE_ON_DELIVERY' : 'PENDING')
  ).toUpperCase();

  const effectiveOrderStatus = (
    order?.orderStatus ||
    order?.status ||
    initialOrderStatus ||
    'CONFIRMED'
  ).toUpperCase();

  const effectiveTotalAmount =
    order?.totalAmount ??
    order?.grandTotal ??
    (paymentRecord?.amount !== undefined ? paymentRecord.amount : initialTotalAmount);

  const effectiveOrderNumber =
    order?.orderNumber ||
    initialOrderNumber ||
    (cleanOrderId ? `ORD-${cleanOrderId}` : 'ORD-CONFIRMED');

  const effectiveRazorpayPaymentId =
    paymentRecord?.razorpayPaymentId ||
    order?.paymentMethod === 'RAZORPAY'
      ? (paymentRecord?.razorpayPaymentId || initialRazorpayPaymentId)
      : '';

  const effectiveInvoiceNumber =
    order?.storeInvoiceNumber ||
    order?.invoice?.invoiceNumber ||
    initialStoreInvoiceNumber ||
    '';

  const effectiveDestination =
    order?.shippingAddress?.addressLine1
      ? [
          order.shippingAddress.fullName || order.shippingAddress.label,
          order.shippingAddress.addressLine1,
          order.shippingAddress.city,
          order.shippingAddress.state,
        ]
          .filter(Boolean)
          .join(', ')
      : initialDeliveryDestination || 'Confirmed Project Site';

  const effectiveOrderForSomeoneElse = Boolean(
    order?.orderForSomeoneElse || initialOrderForSomeoneElse
  );
  const effectiveRecipientName = order?.recipientName || initialRecipientName;
  const effectiveRecipientPhone = order?.recipientPhone || initialRecipientPhone;
  const effectiveNotes = order?.notes || initialNotes;

  // ── 3. CLASSIFY PAYMENT LIFECYCLE ──
  const isPaid =
    effectivePaymentStatus === 'PAID' ||
    effectivePaymentStatus === 'CAPTURED' ||
    effectivePaymentStatus === 'SUCCESS' ||
    effectivePaymentStatus === 'VERIFIED';

  const isPendingVerification =
    !isCod &&
    (effectivePaymentStatus === 'PENDING' ||
      effectivePaymentStatus === 'PROCESSING' ||
      effectivePaymentStatus === 'INITIATED');

  const isFailedPayment =
    !isCod &&
    (effectivePaymentStatus === 'FAILED' ||
      effectivePaymentStatus === 'DECLINED' ||
      effectivePaymentStatus === 'ERROR' ||
      Boolean(initialErrorMessage));

  const isDelayedConfirmation =
    isPaid &&
    (effectiveOrderStatus === 'PENDING_CONFIRMATION' ||
      effectiveOrderStatus === 'FINALIZING');

  // Automatic Polling for Online Payments in Processing State
  useEffect(() => {
    if (isPendingVerification && cleanOrderId && pollCountRef.current < 5) {
      pollTimerRef.current = setTimeout(async () => {
        pollCountRef.current += 1;
        try {
          const freshStatus = await paymentsApi.getOrderPaymentStatus(cleanOrderId);
          if (freshStatus) {
            setPaymentRecord(freshStatus);
            if (freshStatus.status === 'CAPTURED' || freshStatus.status === 'PAID') {
              ordersApi.getOrderDetail(cleanOrderId).then((res) => {
                if (res) setOrder(res);
              });
            }
          }
        } catch {}
      }, 4000);
    }
  }, [isPendingVerification, cleanOrderId, paymentRecord]);

  // Manual Check Payment Status
  const handleCheckPaymentStatus = async () => {
    if (!cleanOrderId || isCheckingPayment) return;
    setIsCheckingPayment(true);
    try {
      const freshPayment = await paymentsApi.getOrderPaymentStatus(cleanOrderId);
      if (freshPayment) {
        setPaymentRecord(freshPayment);
      }
      const freshOrder = await ordersApi.getOrderDetail(cleanOrderId);
      if (freshOrder) {
        setOrder(freshOrder);
      }
      Alert.alert('Status Updated', `Current Payment Status: ${freshPayment?.status || 'Pending'}`);
    } catch {
      Alert.alert('Status Check', 'Unable to refresh payment status right now. Please try again shortly.');
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // Copy Order Reference ID
  const handleCopyOrderId = () => {
    Clipboard.setString(effectiveOrderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── 4. LABEL & STATUS MAPPING HELPERS ──
  const getPaymentMethodDisplay = () => {
    if (isCod) return 'Pay on Site Delivery (COD)';
    switch (effectiveMethod) {
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

  // Financial Payment Status (Never conflated with fulfillment!)
  const getPaymentStatusBadge = () => {
    if (isCod) {
      if (isPaid) {
        return {
          label: 'Collected on Site Delivery',
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.12)',
        };
      }
      return {
        label: 'Payment Due on Delivery',
        color: '#F59E0B',
        bg: 'rgba(245, 158, 11, 0.12)',
      };
    }

    if (isPaid) {
      return {
        label: 'Verified & Paid',
        color: '#10B981',
        bg: 'rgba(16, 185, 129, 0.12)',
      };
    }

    if (effectivePaymentStatus === 'CREDIT_APPROVED') {
      return {
        label: 'Approved (30-Day Credit Line)',
        color: '#3B82F6',
        bg: 'rgba(59, 130, 246, 0.12)',
      };
    }

    if (isPendingVerification) {
      return {
        label: 'Payment Processing',
        color: '#3B82F6',
        bg: 'rgba(59, 130, 246, 0.12)',
      };
    }

    if (isFailedPayment) {
      return {
        label: 'Payment Failed',
        color: '#EF4444',
        bg: 'rgba(239, 68, 68, 0.12)',
      };
    }

    if (effectivePaymentStatus === 'REFUNDED') {
      return {
        label: 'Payment Refunded',
        color: '#8B5CF6',
        bg: 'rgba(139, 92, 246, 0.12)',
      };
    }

    return {
      label: 'Payment Pending',
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.12)',
    };
  };

  // Order & Fulfillment Status (Completely separate from financial payment state!)
  const getOrderStatusBadge = () => {
    switch (effectiveOrderStatus) {
      case 'PENDING':
      case 'CREATED':
        return {
          label: 'Order Placed',
          color: '#3B82F6',
          bg: 'rgba(59, 130, 246, 0.12)',
        };
      case 'CONFIRMED':
        return {
          label: 'Order Confirmed',
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.12)',
        };
      case 'PROCESSING':
        return {
          label: 'Processing at Depot',
          color: '#3B82F6',
          bg: 'rgba(59, 130, 246, 0.12)',
        };
      case 'SHIPPED':
      case 'DISPATCHED':
        return {
          label: 'Dispatched in Transit',
          color: '#8B5CF6',
          bg: 'rgba(139, 92, 246, 0.12)',
        };
      case 'OUT_FOR_DELIVERY':
        return {
          label: 'Out for Site Delivery',
          color: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.12)',
        };
      case 'DELIVERED':
        return {
          label: 'Delivered to Site',
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.12)',
        };
      case 'PENDING_SITE_DELIVERY':
      case 'PENDING_DELIVERY':
        return {
          label: 'Pending Site Delivery',
          color: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.12)',
        };
      case 'CANCELLED':
        return {
          label: 'Order Cancelled',
          color: '#EF4444',
          bg: 'rgba(239, 68, 68, 0.12)',
        };
      default:
        return {
          label: 'Order Confirmed',
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.12)',
        };
    }
  };

  // Financial Amount Label (Enforces authoritative business rule)
  const getAmountRow = () => {
    if (isPaid) {
      return {
        label: 'Amount Paid',
        value: formatPrice(effectiveTotalAmount),
        highlightColor: '#10B981',
      };
    }
    if (isCod) {
      return {
        label: 'Amount Payable (on Delivery)',
        value: formatPrice(effectiveTotalAmount),
        highlightColor: '#E31E24',
      };
    }
    if (isPendingVerification) {
      return {
        label: 'Amount Pending',
        value: formatPrice(effectiveTotalAmount),
        highlightColor: '#3B82F6',
      };
    }
    return {
      label: 'Order Total',
      value: formatPrice(effectiveTotalAmount),
      highlightColor: theme.colors.textPrimary,
    };
  };

  // Estimated Delivery Text
  const getEstimatedDeliveryText = () => {
    if (order?.estimatedDelivery) {
      return order.estimatedDelivery;
    }
    if (order?.deliverySlot) {
      return `${order.deliverySlot} • Within 24-48 Hours`;
    }
    return 'Morning Slot (9 AM - 1 PM) • Within 24-48 Hours';
  };

  // ── 5. INVOICE ACTIONS ──
  const handleDownloadInvoice = async () => {
    if (!cleanOrderId || isDownloadingInvoice) return;
    setIsDownloadingInvoice(true);
    try {
      const result = await invoicesApi.downloadOrOpenInvoicePdf(
        cleanOrderId,
        null,
        effectiveInvoiceNumber
      );
      if (!result?.success) {
        Alert.alert(
          'Invoice Notice',
          result?.message || 'Invoice PDF is being compiled by accounting. You can preview details in the modal.'
        );
      }
    } catch (err: any) {
      Alert.alert('Invoice Notice', err?.message || 'Invoice PDF is generating. Please try again shortly.');
    } finally {
      setIsDownloadingInvoice(false);
    }
  };

  const handleOpenInvoiceModal = async () => {
    setShowInvoiceModal(true);
    setIsLoadingInvoiceBreakdown(true);
    setInvoiceBreakdown(null);
    try {
      const detailed = await invoicesApi.getDetailedInvoice(cleanOrderId);
      setInvoiceBreakdown(detailed);
    } catch {
      // Invoice not available from backend yet
      setInvoiceBreakdown(null);
    } finally {
      setIsLoadingInvoiceBreakdown(false);
    }
  };

  const paymentStatusBadge = getPaymentStatusBadge();
  const orderStatusBadge = getOrderStatusBadge();
  const amountRow = getAmountRow();

  const topSafePadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  ) + 8;

  // ── 6. RENDER ──
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#E31E24" translucent />

      {/* Top Header — Clean Red Bar with Safe Navigation */}
      <View
        style={[
          styles.topHeader,
          {
            paddingTop: topSafePadding,
            backgroundColor: '#E31E24',
            borderBottomColor: '#C4181D',
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.replace('MainTabs')}
          style={styles.headerHomeBtn}
          accessibilityRole="button"
          accessibilityLabel="Go to home"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="home-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>
          {isCod
            ? 'Order Confirmation'
            : isPaid
            ? 'Payment Receipt'
            : isFailedPayment
            ? 'Payment Notice'
            : 'Payment Processing'}
        </Text>

        <TouchableOpacity
          onPress={fetchAuthoritativeData}
          style={styles.headerRefreshBtn}
          accessibilityRole="button"
          accessibilityLabel="Refresh order status"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isLoadingBackend ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: isTabletOrDesktop ? Math.max((windowWidth - 640) / 2, 20) : 16,
            paddingBottom: Math.max(insets.bottom, 20) + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Dynamic Outcome Icon & Headings based on verified state */}
        <View style={styles.celebrationWrap}>
          {isFailedPayment ? (
            <View style={[styles.iconCircle, { backgroundColor: '#EF4444' }]}>
              <Ionicons name="alert-circle" size={46} color="#FFFFFF" />
            </View>
          ) : isPendingVerification ? (
            <View style={[styles.iconCircle, { backgroundColor: '#3B82F6' }]}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          ) : isDelayedConfirmation ? (
            <View style={[styles.iconCircle, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="time" size={44} color="#FFFFFF" />
            </View>
          ) : isCod ? (
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCircle}
            >
              <Ionicons name="checkmark-done" size={46} color="#FFFFFF" />
            </LinearGradient>
          ) : (
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCircle}
            >
              <Ionicons name="shield-checkmark" size={44} color="#FFFFFF" />
            </LinearGradient>
          )}
        </View>

        {/* Dynamic Header Titles */}
        <Text style={[styles.outcomeTitle, { color: theme.colors.textPrimary }]}>
          {isFailedPayment
            ? 'Payment Failed'
            : isPendingVerification
            ? 'Payment Processing'
            : isDelayedConfirmation
            ? 'Payment Confirmed'
            : isCod
            ? 'Order Placed Successfully!'
            : 'Payment Successful!'}
        </Text>

        <Text style={[styles.outcomeSubtitle, { color: theme.colors.textSecondary }]}>
          {isFailedPayment
            ? initialErrorMessage || 'Your payment could not be completed. Your order has not been charged.'
            : isPendingVerification
            ? 'We are confirming your payment with the banking gateway. This may take a moment.'
            : isDelayedConfirmation
            ? 'Your payment was verified. We are finalizing your order confirmation with the depot.'
            : isCod
            ? 'Your order has been confirmed. Payment will be collected upon delivery.'
            : 'Your payment has been confirmed and your procurement order is placed.'}
        </Text>

        {/* Action button if verification is pending */}
        {isPendingVerification && (
          <TouchableOpacity
            onPress={handleCheckPaymentStatus}
            disabled={isCheckingPayment}
            style={[styles.checkStatusBtn, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.border }]}
            activeOpacity={0.8}
          >
            {isCheckingPayment ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Ionicons name="sync-outline" size={16} color="#3B82F6" />
            )}
            <Text style={[styles.checkStatusBtnText, { color: '#3B82F6' }]}>
              {isCheckingPayment ? 'Checking Status...' : 'Check Verification Status'}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── 7. DIGITAL PROCUREMENT RECEIPT CARD ── */}
        <Card
          variant="outlined"
          style={[
            styles.receiptCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Order Reference Row with Copy Button */}
          <View style={styles.receiptTopHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.receiptOrderIdLabel, { color: theme.colors.textTertiary }]}>
                ORDER REFERENCE ID
              </Text>
              <Text style={[styles.receiptOrderIdVal, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {effectiveOrderNumber}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleCopyOrderId}
              activeOpacity={0.75}
              style={[
                styles.copyOrderIdBtn,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Copy order ID"
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={14}
                color={copied ? '#10B981' : theme.colors.textPrimary}
              />
              <Text
                style={[
                  styles.copyOrderIdBtnText,
                  { color: copied ? '#10B981' : theme.colors.textPrimary },
                ]}
              >
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.receiptDivider, { backgroundColor: theme.colors.border }]} />

          {/* Row: Order Fulfillment Status (Cleanly separated from Payment Status!) */}
          <View style={styles.receiptRow}>
            <Text style={[styles.receiptKey, { color: theme.colors.textSecondary }]}>Order Status</Text>
            <View
              style={[
                styles.badgePill,
                { backgroundColor: orderStatusBadge.bg },
              ]}
            >
              <Text style={[styles.badgeText, { color: orderStatusBadge.color }]}>
                {orderStatusBadge.label}
              </Text>
            </View>
          </View>

          {/* Row: Payment Mode */}
          <View style={styles.receiptRow}>
            <Text style={[styles.receiptKey, { color: theme.colors.textSecondary }]}>Payment Method</Text>
            <Text style={[styles.receiptVal, { color: theme.colors.textPrimary }]}>
              {getPaymentMethodDisplay()}
            </Text>
          </View>

          {/* Row: Financial Payment Status (Never "Pending Site Delivery"!) */}
          <View style={styles.receiptRow}>
            <Text style={[styles.receiptKey, { color: theme.colors.textSecondary }]}>Payment Status</Text>
            <View
              style={[
                styles.badgePill,
                { backgroundColor: paymentStatusBadge.bg },
              ]}
            >
              <Text style={[styles.badgeText, { color: paymentStatusBadge.color }]}>
                {paymentStatusBadge.label}
              </Text>
            </View>
          </View>

          {/* Row: Gateway Transaction ID (Only when online transaction exists!) */}
          {Boolean(effectiveRazorpayPaymentId) && (
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptKey, { color: theme.colors.textSecondary }]}>Gateway Txn ID</Text>
              <Text style={[styles.receiptVal, { color: '#0B72E7', fontFamily: 'Inter_600SemiBold' }]}>
                {effectiveRazorpayPaymentId}
              </Text>
            </View>
          )}

          {/* Row: Tax Invoice Number (Only when valid invoice number exists!) */}
          {Boolean(effectiveInvoiceNumber) && (
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptKey, { color: theme.colors.textSecondary }]}>Tax Invoice #</Text>
              <Text style={[styles.receiptVal, { color: theme.colors.textPrimary }]}>
                {effectiveInvoiceNumber}
              </Text>
            </View>
          )}

          {/* Row: Authoritative Financial Amount (Amount Paid vs Amount Payable) */}
          <View style={styles.receiptRow}>
            <Text style={[styles.receiptKeyBold, { color: theme.colors.textPrimary }]}>
              {amountRow.label}
            </Text>
            <Text style={[styles.receiptValHighlight, { color: amountRow.highlightColor }]}>
              {amountRow.value}
            </Text>
          </View>

          {/* Row: Estimated Delivery Schedule */}
          <View style={styles.receiptRow}>
            <Text style={[styles.receiptKey, { color: theme.colors.textSecondary }]}>Estimated Delivery</Text>
            <Text style={[styles.receiptValGreen, { color: '#10B981' }]} numberOfLines={1}>
              {getEstimatedDeliveryText()}
            </Text>
          </View>

          {/* Row: Delivery Destination */}
          <View style={styles.receiptRow}>
            <Text style={[styles.receiptKey, { color: theme.colors.textSecondary }]}>Delivery Destination</Text>
            <Text
              numberOfLines={2}
              style={[styles.receiptVal, { color: theme.colors.textPrimary, maxWidth: 190, textAlign: 'right' }]}
            >
              {effectiveDestination}
            </Text>
          </View>

          {/* Recipient Contact Card (Order for someone else) */}
          {effectiveOrderForSomeoneElse && (
            <View
              style={[
                styles.recipientCard,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.recipientHeader}>
                <Ionicons name="gift-outline" size={14} color="#D97706" />
                <Text style={styles.recipientBadgeText}>ORDER FOR SOMEONE ELSE</Text>
              </View>
              {Boolean(effectiveRecipientName) && (
                <View style={styles.recipientRow}>
                  <Text style={[styles.receiptKey, { color: theme.colors.textSecondary }]}>Recipient</Text>
                  <Text style={[styles.receiptVal, { color: theme.colors.textPrimary, fontFamily: 'Inter_600SemiBold' }]}>
                    {effectiveRecipientName}
                  </Text>
                </View>
              )}
              {Boolean(effectiveRecipientPhone) && (
                <View style={styles.recipientRow}>
                  <Text style={[styles.receiptKey, { color: theme.colors.textSecondary }]}>Contact</Text>
                  <Text style={[styles.receiptVal, { color: theme.colors.textPrimary, fontFamily: 'Inter_600SemiBold' }]}>
                    {effectiveRecipientPhone}
                  </Text>
                </View>
              )}
              {Boolean(effectiveNotes) && (
                <View style={styles.recipientRow}>
                  <Text style={[styles.receiptKey, { color: theme.colors.textSecondary }]}>Driver Notes</Text>
                  <Text
                    numberOfLines={2}
                    style={[styles.receiptVal, { color: theme.colors.textSecondary, fontStyle: 'italic', maxWidth: 180 }]}
                  >
                    {effectiveNotes}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={[styles.receiptDivider, { backgroundColor: theme.colors.border }]} />

          {/* GST Invoice Interactive Action (Only when order exists) */}
          <View style={styles.invoiceActionsWrap}>
            <TouchableOpacity
              onPress={handleDownloadInvoice}
              disabled={isDownloadingInvoice}
              activeOpacity={0.8}
              style={[
                styles.downloadInvoiceBtn,
                { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Download GST Tax Invoice PDF"
            >
              {isDownloadingInvoice ? (
                <ActivityIndicator size="small" color="#E31E24" />
              ) : (
                <Ionicons name="document-text-outline" size={16} color="#E31E24" />
              )}
              <Text style={[styles.downloadInvoiceText, { color: theme.colors.textPrimary }]}>
                {isDownloadingInvoice ? 'Downloading Invoice...' : 'Download GST Tax Invoice (PDF)'}
              </Text>
              <Ionicons name="download-outline" size={16} color="#E31E24" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenInvoiceModal}
              activeOpacity={0.7}
              style={styles.viewInvoiceBreakdownBtn}
              accessibilityRole="button"
              accessibilityLabel="View itemized tax invoice breakdown"
            >
              <Text style={styles.viewInvoiceBreakdownText}>View Tax Breakdown</Text>
              <Ionicons name="chevron-forward" size={14} color="#E31E24" />
            </TouchableOpacity>
          </View>
        </Card>

        {/* ── 8. PRIMARY & SECONDARY ACTIONS ── */}
        {isFailedPayment ? (
          /* Recovery Actions on Payment Failure */
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              onPress={() => navigation.navigate('CheckoutPayment')}
              activeOpacity={0.85}
              style={styles.primaryActionBtn}
              accessibilityRole="button"
              accessibilityLabel="Retry payment"
            >
              <LinearGradient
                colors={['#E31E24', '#D32F2F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryActionGradient}
              >
                <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>Retry Payment</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Button
              title="Return to Cart"
              onPress={() => navigation.replace('Cart')}
              size="lg"
              variant="outline"
              style={{ width: '100%', marginBottom: 12 }}
            />
          </View>
        ) : (
          /* Normal Success & Confirmation Actions */
          <View style={styles.actionsContainer}>
            {/* Primary Tracking Button */}
            <TouchableOpacity
              onPress={() =>
                navigation.replace('OrderTracking', {
                  orderId: cleanOrderId,
                  orderNumber: effectiveOrderNumber,
                })
              }
              activeOpacity={0.85}
              style={styles.primaryActionBtn}
              accessibilityRole="button"
              accessibilityLabel="Track order in real-time"
            >
              <LinearGradient
                colors={['#E31E24', '#D32F2F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryActionGradient}
              >
                <Ionicons name="location-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>Track Order in Real-Time</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

            {/* View Complete Order Details */}
            <Button
              title="View Complete Order Details"
              onPress={() =>
                navigation.replace('OrderDetail', {
                  orderId: cleanOrderId,
                  orderNumber: effectiveOrderNumber,
                })
              }
              size="lg"
              variant="outline"
              style={{ width: '100%', marginBottom: 12 }}
            />

            {/* Continue Procurement Shopping */}
            <Button
              title="Continue Procurement Shopping"
              onPress={() => navigation.replace('MainTabs')}
              size="lg"
              variant="ghost"
              style={{ width: '100%' }}
            />
          </View>
        )}
      </ScrollView>

      {/* Detailed GST Tax Invoice Modal */}
      <InvoiceDetailModal
        visible={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        invoice={invoiceBreakdown}
        isLoading={isLoadingInvoiceBreakdown}
      />
    </View>
  );
}

// PaymentStatusScreen export alias for navigation parity
export const PaymentStatusScreen = OrderSuccessScreen;

export default OrderSuccessScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 16.5,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.2,
  },
  headerHomeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerRefreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  scrollContent: {
    paddingTop: 20,
    alignItems: 'center',
  },
  celebrationWrap: {
    marginBottom: 14,
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: { elevation: 5 },
    }),
  },
  outcomeTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 21,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  outcomeSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 320,
  },
  checkStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  checkStatusBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  receiptCard: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginVertical: 18,
    borderWidth: 1,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  receiptTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  receiptOrderIdLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10.5,
    letterSpacing: 0.5,
  },
  receiptOrderIdVal: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    marginTop: 2,
  },
  copyOrderIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  copyOrderIdBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  receiptDivider: {
    height: 1,
    marginVertical: 2,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  receiptKey: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    flexShrink: 1,
  },
  receiptKeyBold: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    flexShrink: 1,
  },
  receiptVal: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    textAlign: 'right',
  },
  receiptValHighlight: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    textAlign: 'right',
  },
  receiptValGreen: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    textAlign: 'right',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  recipientCard: {
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    borderWidth: 1,
    gap: 6,
  },
  recipientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  recipientBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  recipientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceActionsWrap: {
    marginTop: 2,
    gap: 8,
  },
  downloadInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  downloadInvoiceText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    flex: 1,
    marginLeft: 8,
  },
  viewInvoiceBreakdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  viewInvoiceBreakdownText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#E31E24',
  },
  actionsContainer: {
    width: '100%',
    marginTop: 4,
  },
  primaryActionBtn: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#E31E24',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
  },
  primaryActionText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
});
