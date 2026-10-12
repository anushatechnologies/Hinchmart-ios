/**
 * HINCH MART — Compact Add-to-Cart Confirmation Notification
 * 
 * Rebuilt from ground up as a compact, non-intrusive, premium commerce notification:
 * - Clean 2-row card: Confirmation header + product thumbnail & metadata + quick "View Cart" CTA
 * - Auto-dismisses after 3.5 seconds; allows manual close via 'x'
 * - Seamlessly updates when multiple products are added in quick succession (resets timer, no stacking)
 * - Screen-aware: Automatically suppresses on Cart, Checkout, and Auth flows
 * - Respects safe area insets and bottom tabs on mobile, pins to bottom-right on tablet/desktop
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  selectCartToast,
  hideCartToast,
} from '../../redux/slices/cartSlice';
import { formatPrice } from '../../utils';

export function CartToastPopup() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();

  const toast = useAppSelector(selectCartToast);
  const isAuthenticated = useAppSelector((state) => Boolean(state?.auth?.isAuthenticated));

  const [isVisible, setIsVisible] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<string>('');

  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDismissingRef = useRef(false);

  // Track active navigation screen to auto-hide on Cart, Checkout, and Auth screens
  useEffect(() => {
    const updateRoute = () => {
      try {
        const state = navigation.getState();
        if (state && Array.isArray(state.routes) && state.index != null && state.routes[state.index]) {
          let route = state.routes[state.index];
          while (route && route.state && route.state.index !== undefined && Array.isArray(route.state.routes)) {
            route = route.state.routes[route.state.index];
          }
          setCurrentRoute(route?.name || '');
        }
      } catch {}
    };

    updateRoute();
    const unsub = navigation.addListener('state', updateRoute);
    return unsub;
  }, [navigation]);

  // Immediately dismiss when unauthenticated/logged out
  useEffect(() => {
    if (!isAuthenticated && isVisible) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsVisible(false);
      dispatch(hideCartToast());
    }
  }, [isAuthenticated, isVisible, dispatch]);

  const dismissToast = useCallback(() => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 24,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
      isDismissingRef.current = false;
      dispatch(hideCartToast());
    });
  }, [slideAnim, opacityAnim, dispatch]);

  const showToast = useCallback(() => {
    isDismissingRef.current = false;
    slideAnim.setValue(30);
    opacityAnim.setValue(0);
    scaleAnim.setValue(1);
    setIsVisible(true);

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 85,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim, scaleAnim]);

  const pulseToast = useCallback(() => {
    scaleAnim.setValue(1);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.03,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim]);

  // Handle toast trigger & 3.5s auto-dismiss timer
  useEffect(() => {
    if (toast?.visible) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (!isVisible) {
        showToast();
      } else {
        pulseToast();
      }

      // Automatically dismiss after 3.5 seconds
      timerRef.current = setTimeout(() => {
        dismissToast();
      }, 3500);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    } else {
      setIsVisible(false);
    }
  }, [toast, isVisible, showToast, pulseToast, dismissToast]);

  const handleNavigateToCart = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(false);
    dispatch(hideCartToast());
    try {
      navigation.navigate('Cart');
    } catch {
      navigation.navigate('MainTabs', { screen: 'CartTab' });
    }
  };

  // Determine if the current screen is Cart, Checkout, or Auth
  const isCartOrCheckoutScreen =
    currentRoute === 'Cart' ||
    currentRoute === 'CartTab' ||
    currentRoute === 'CheckoutAddress' ||
    currentRoute === 'CheckoutPayment' ||
    currentRoute === 'OrderSuccess' ||
    currentRoute === 'PaymentStatus';

  const isAuthScreen =
    !currentRoute ||
    currentRoute === 'Splash' ||
    currentRoute === 'Login' ||
    currentRoute === 'OTP' ||
    currentRoute === 'OTPVerification' ||
    currentRoute === 'Signup' ||
    currentRoute === 'ForgotPassword' ||
    currentRoute === 'ResetPassword' ||
    currentRoute === 'CompleteProfile' ||
    currentRoute === 'RegistrationDetails' ||
    currentRoute === 'Onboarding';

  if (!isAuthenticated || isAuthScreen || isCartOrCheckoutScreen || !isVisible || !toast?.visible) {
    return null;
  }

  // Screen-aware bottom offset (accounts for bottom tabs vs stack screens)
  const isTabScreen =
    currentRoute === 'HomeTab' ||
    currentRoute === 'CategoriesTab' ||
    currentRoute === 'ProfileTab' ||
    currentRoute === 'MainTabs' ||
    !currentRoute;

  const bottomOffset = isTabScreen
    ? Math.max(insets.bottom, 8) + 64
    : Math.max(insets.bottom, 12) + 12;

  const isTabletOrDesktop = windowWidth >= 640;

  const itemTitle = toast?.itemTitle || toast?.productName || 'Product';
  const itemPrice = toast?.itemPrice ?? toast?.price ?? 0;
  const itemQty = toast?.quantity ?? 1;
  const itemImg = toast?.productImage || '';

  return (
    <Animated.View
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={`Added ${itemTitle} to cart`}
      style={[
        isTabletOrDesktop ? styles.desktopContainer : styles.mobileContainer,
        {
          bottom: isTabletOrDesktop ? Math.max(insets.bottom, 20) + 16 : bottomOffset,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View
        style={[
          styles.toastCard,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        {/* Row 1: Success Confirmation & Close Control */}
        <View style={styles.topRow}>
          <View style={styles.confirmationHeader}>
            <View style={[styles.successBadge, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5' }]}>
              <Ionicons name="checkmark" size={11} color="#059669" />
            </View>
            <Text style={[styles.confirmationText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              Added to cart
            </Text>
          </View>

          <TouchableOpacity
            onPress={dismissToast}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.closeBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Dismiss cart confirmation"
          >
            <Ionicons name="close" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
          </TouchableOpacity>
        </View>

        {/* Row 2: Product Thumbnail + Title/Price + View Cart CTA */}
        <View style={styles.contentRow}>
          {/* Thumbnail */}
          <View
            style={[
              styles.thumbnailContainer,
              {
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}
          >
            {itemImg ? (
              <Image
                source={{ uri: itemImg }}
                style={styles.thumbnailImg}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={styles.thumbnailFallback}>
                <Ionicons name="cube-outline" size={18} color="#94A3B8" />
              </View>
            )}
          </View>

          {/* Product Name & Price / Qty Details */}
          <View style={styles.infoCol}>
            <Text
              numberOfLines={1}
              style={[styles.productName, { color: isDark ? '#F8FAFC' : '#1E293B' }]}
            >
              {itemTitle}
            </Text>
            <Text style={[styles.priceQtyText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {formatPrice(itemPrice)}
              {itemQty > 1 ? ` • Qty: ${itemQty}` : ''}
            </Text>
          </View>

          {/* Compact View Cart Button */}
          <TouchableOpacity
            onPress={handleNavigateToCart}
            activeOpacity={0.85}
            style={styles.viewCartBtn}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel="View shopping cart"
          >
            <Text style={styles.viewCartBtnText}>View Cart</Text>
            <Ionicons name="arrow-forward" size={12} color="#FFFFFF" style={{ marginLeft: 3 }} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  mobileContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
    }),
  },
  desktopContainer: {
    position: 'absolute',
    right: 24,
    width: 380,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
    }),
  },
  toastCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  successBadge: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmationText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  closeBtn: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumbnailContainer: {
    width: 44,
    height: 44,
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  thumbnailFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 2,
  },
  priceQtyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
  },
  viewCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E31E24',
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  viewCartBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
});

export default CartToastPopup;

