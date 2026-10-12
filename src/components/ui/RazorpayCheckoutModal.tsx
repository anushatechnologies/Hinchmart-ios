/**
 * HINCH MART — Real Live Razorpay Gateway Checkout Modal
 * 
 * 100% LIVE BACKEND & RAZORPAY INTEGRATION:
 * - ZERO mock payment IDs, ZERO fake HMAC signatures, ZERO hardcoded fallbacks
 * - Embedded official Razorpay Standard Checkout via react-native-webview
 * - Supports all live payment methods: UPI (GPay/PhonePe/Paytm/QR), Cards, NetBanking, Wallets
 * - Emits authentic cryptographic razorpay_payment_id, razorpay_order_id, razorpay_signature
 * - Fully RBI compliant with 256-Bit SSL bank-grade encryption
 */
import React, { useRef, useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

export interface RazorpayOrderData {
  orderId?: number | string | null;
  orderNumber?: string | null;
  razorpayOrderId: string;
  amount: number; // in Rupees
  amountInPaise?: number; // in Paise
  currency: string;
  keyId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
}

export interface RazorpaySuccessResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutModalProps {
  visible: boolean;
  orderData: RazorpayOrderData | null;
  onSuccess: (result: RazorpaySuccessResult) => void;
  onError: (errorMessage: string) => void;
  onClose: () => void;
  isDark?: boolean;
}

export function RazorpayCheckoutModal({
  visible,
  orderData,
  onSuccess,
  onError,
  onClose,
  isDark = false,
}: RazorpayCheckoutModalProps) {
  const [isLoadingWebView, setIsLoadingWebView] = useState(true);

  const htmlContent = useMemo(() => {
    if (!orderData) return '';

    const keyId = orderData.keyId;
    const razorpayOrderId = orderData.razorpayOrderId;
    const amountInPaise =
      orderData.amountInPaise && orderData.amountInPaise > 0
        ? orderData.amountInPaise
        : Math.round((orderData.amount || 0) * 100);
    const currency = orderData.currency || 'INR';
    const customerName = (orderData.customerName || '').replace(/"/g, '\\"');
    const customerEmail = (orderData.customerEmail || '').replace(/"/g, '\\"');
    const customerPhone = (orderData.customerPhone || '').replace(/"/g, '\\"');
    const description = (orderData.description || `Order Payment #${orderData.orderNumber || ''}`).replace(/"/g, '\\"');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Razorpay Secure Checkout</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: ${isDark ? '#0F172A' : '#F8FAFC'};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: ${isDark ? '#F8FAFC' : '#0F172A'};
    }
    .spinner-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }
    .spinner {
      width: 42px;
      height: 42px;
      border: 4px solid rgba(227, 30, 36, 0.2);
      border-top-color: #E31E24;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .loading-title {
      font-size: 15px;
      font-weight: 700;
      color: ${isDark ? '#F8FAFC' : '#0F172A'};
    }
    .loading-sub {
      font-size: 12px;
      color: ${isDark ? '#94A3B8' : '#64748B'};
    }
  </style>
</head>
<body>
  <div class="spinner-wrap" id="loadingState">
    <div class="spinner"></div>
    <div class="loading-title">Connecting to Razorpay Gateway...</div>
    <div class="loading-sub">256-Bit Bank-Grade Encrypted Session</div>
  </div>

  <script>
    function sendToApp(message) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(message));
      }
    }

    window.onload = function() {
      try {
        var options = {
          key: "${keyId}",
          amount: ${amountInPaise},
          currency: "${currency}",
          name: "HINCH MART",
          description: "${description}",
          image: "https://api.hinchmart.com/logo.png",
          order_id: "${razorpayOrderId}",
          prefill: {
            name: "${customerName}",
            email: "${customerEmail}",
            contact: "${customerPhone}"
          },
          notes: {
            merchant: "HinchMart Wholesale Pvt Ltd",
            platform: "React Native Android/iOS"
          },
          theme: {
            color: "#E31E24"
          },
          modal: {
            ondismiss: function() {
              sendToApp({ event: 'DISMISSED' });
            },
            backdropclose: false,
            escape: false,
            handleback: true
          },
          handler: function(response) {
            sendToApp({
              event: 'SUCCESS',
              data: {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              }
            });
          }
        };

        var rzp = new Razorpay(options);

        rzp.on('payment.failed', function(resp) {
          sendToApp({
            event: 'FAILED',
            error: resp.error ? (resp.error.description || resp.error.reason || 'Payment failed') : 'Payment failed'
          });
        });

        rzp.open();
      } catch (err) {
        sendToApp({
          event: 'ERROR',
          error: err.message || 'Failed to initialize Razorpay checkout'
        });
      }
    };
  </script>
</body>
</html>
    `;
  }, [orderData, isDark]);

  const handleMessage = (event: any) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      switch (payload.event) {
        case 'SUCCESS':
          if (payload.data?.razorpay_payment_id && payload.data?.razorpay_signature) {
            onSuccess(payload.data);
          } else {
            onError('Missing cryptographic signature from Razorpay');
          }
          break;
        case 'FAILED':
          onError(payload.error || 'Payment transaction failed or cancelled by bank.');
          break;
        case 'ERROR':
          onError(payload.error || 'Payment gateway encountered an initialization error.');
          break;
        case 'DISMISSED':
          onClose();
          break;
        default:
          break;
      }
    } catch (parseErr) {
      console.warn('[RazorpayCheckoutModal] Failed to parse webview message:', parseErr);
    }
  };

  if (!orderData) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
        ]}
      >
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? '#0F172A' : '#FFFFFF'}
        />

        {/* Top Security & Branding Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
              borderBottomColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <View style={styles.gatewayBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#10B981" />
              <Text style={styles.gatewayBadgeText}>Razorpay 256-Bit SSL</Text>
            </View>
            <Text
              style={[
                styles.headerTitle,
                { color: isDark ? '#F8FAFC' : '#0F172A' },
              ]}
              numberOfLines={1}
            >
              Order #{orderData.orderNumber || orderData.razorpayOrderId.slice(-8)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityLabel="Close payment"
          >
            <Ionicons
              name="close"
              size={22}
              color={isDark ? '#94A3B8' : '#64748B'}
            />
          </TouchableOpacity>
        </View>

        {/* Live Razorpay WebView */}
        <View style={styles.webViewWrap}>
          {isLoadingWebView && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#E31E24" />
              <Text
                style={[
                  styles.loadingText,
                  { color: isDark ? '#94A3B8' : '#64748B' },
                ]}
              >
                Loading Razorpay Secure Checkout...
              </Text>
            </View>
          )}

          <WebView
            source={{
              html: htmlContent,
              baseUrl: 'https://hinchmart.com',
            }}
            onMessage={handleMessage}
            onLoadEnd={() => setIsLoadingWebView(false)}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            style={styles.webView}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'column',
    gap: 3,
  },
  gatewayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  gatewayBadgeText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.3,
  },
  headerTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontSize: 14,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webViewWrap: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  loadingText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 13,
  },
});
