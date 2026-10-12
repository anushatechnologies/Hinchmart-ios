/**
 * HINCH MART — Add-to-Cart Authentication Prompt Modal
 * 
 * Intercepts Add-to-Cart actions from guest users.
 * Displays an attractive, mobile-responsive dialog with:
 * - Title: "Login or Create an Account"
 * - Message: "Please log in or register to add products to your shopping cart and continue shopping."
 * - Product preview card of the item being added
 * - Actions: "Login", "Create Account", "Continue Shopping"
 * - Single safe dismissal handler for 'X', 'Continue Shopping', backdrop, and Android hardware back.
 * - Zero worklet/bridge crashes, zero navigation pops, preserved browsing state.
 */
import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  BackHandler,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { selectAuthModal, hideAuthModal } from '../../redux/slices/cartSlice';
import { cartAuthGuard } from '../../services/cart/cartAuthGuard';
import { formatPrice } from '../../utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function AddToCartAuthModal() {
  const { isDark } = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();

  const modalState = useAppSelector(selectAuthModal);
  const isVisible = Boolean(modalState?.visible);

  // Debouncing ref to guard against rapid repeated taps
  const isDismissingRef = useRef(false);

  /**
   * Single safe dismissal handler for 'X', 'Continue Shopping', backdrop, and Android hardware Back
   */
  const handleDismiss = useCallback(() => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;

    // 1. Cancel the pending protected add to cart action in MMKV & memory
    cartAuthGuard.cancelPendingAction();

    // 2. Hide the authentication modal in Redux immediately
    dispatch(hideAuthModal());

    // Reset lock after transition window
    setTimeout(() => {
      isDismissingRef.current = false;
    }, 250);
  }, [dispatch]);

  // Handle Android hardware back button explicitly
  useEffect(() => {
    if (!isVisible) return;

    const onHardwareBackPress = () => {
      handleDismiss();
      // Return true to consume the back event so Android does NOT exit the app or pop the screen
      return true;
    };

    const backHandlerSub = BackHandler.addEventListener(
      'hardwareBackPress',
      onHardwareBackPress
    );

    return () => {
      backHandlerSub.remove();
    };
  }, [isVisible, handleDismiss]);

  const handleLogin = useCallback(() => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;

    if (modalState?.product) {
      cartAuthGuard.savePendingAction({
        product: modalState.product,
        productId: modalState.product.id || modalState.product.productId,
        quantity: modalState.quantity || 1,
        variantId: modalState.variantId,
        storeId: modalState.storeId,
        sourceScreen: modalState.returnScreen,
        sourceParams: modalState.returnParams,
      });
    }

    dispatch(hideAuthModal());
    navigation.navigate('Login', {
      returnScreen: modalState?.returnScreen || 'MainTabs',
      returnParams: modalState?.returnParams,
      action: 'PENDING_ADD_TO_CART',
    });

    setTimeout(() => {
      isDismissingRef.current = false;
    }, 350);
  }, [modalState, dispatch, navigation]);

  const handleCreateAccount = useCallback(() => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;

    if (modalState?.product) {
      cartAuthGuard.savePendingAction({
        product: modalState.product,
        productId: modalState.product.id || modalState.product.productId,
        quantity: modalState.quantity || 1,
        variantId: modalState.variantId,
        storeId: modalState.storeId,
        sourceScreen: modalState.returnScreen,
        sourceParams: modalState.returnParams,
      });
    }

    dispatch(hideAuthModal());
    navigation.navigate('RegistrationDetails', {
      returnScreen: modalState?.returnScreen || 'MainTabs',
      returnParams: modalState?.returnParams,
      action: 'PENDING_ADD_TO_CART',
      isNewUser: true,
    });

    setTimeout(() => {
      isDismissingRef.current = false;
    }, 350);
  }, [modalState, dispatch, navigation]);

  if (!isVisible) {
    return null;
  }

  const product = modalState?.product;
  const productTitle = product?.title || product?.name || 'Selected Item';
  const productImage =
    product?.images?.[0] ||
    product?.image ||
    product?.imageUrl ||
    '';
  const productPrice = Number(product?.price || 0);
  const quantity = modalState?.quantity || 1;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              {/* Top Accent Icon & Close */}
              <View style={styles.headerRow}>
                <View style={styles.badgeWrapper}>
                  <View style={styles.badgeIconCircle}>
                    <Ionicons name="cart" size={20} color="#E31E24" />
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleDismiss}
                  style={[
                    styles.closeButton,
                    { backgroundColor: isDark ? '#334155' : '#F1F5F9' },
                  ]}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={18} color={isDark ? '#CBD5E1' : '#64748B'} />
                </TouchableOpacity>
              </View>

              {/* Title & Description */}
              <Text style={[styles.title, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                Login or Create an Account
              </Text>
              <Text style={[styles.message, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Please log in or register to add products to your shopping cart and continue shopping.
              </Text>

              {/* Product Preview Card */}
              {product && (
                <View
                  style={[
                    styles.productPreview,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}
                >
                  {productImage ? (
                    <Image
                      source={{ uri: productImage }}
                      style={styles.previewImage}
                      contentFit="contain"
                    />
                  ) : (
                    <View
                      style={[
                        styles.previewImagePlaceholder,
                        { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' },
                      ]}
                    >
                      <Ionicons name="cube-outline" size={24} color="#94A3B8" />
                    </View>
                  )}
                  <View style={styles.previewInfo}>
                    <Text
                      numberOfLines={1}
                      style={[styles.previewTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]}
                    >
                      {productTitle}
                    </Text>
                    <Text style={styles.previewPrice}>
                      {formatPrice(productPrice)}
                      {quantity > 1 ? `  •  Qty: ${quantity}` : ''}
                    </Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>Pending</Text>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionContainer}>
                {/* 1. Login */}
                <TouchableOpacity
                  onPress={handleLogin}
                  activeOpacity={0.85}
                  style={styles.primaryLoginBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Login"
                >
                  <Ionicons name="log-in-outline" size={19} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryLoginBtnText}>Login</Text>
                </TouchableOpacity>

                {/* 2. Create Account */}
                <TouchableOpacity
                  onPress={handleCreateAccount}
                  activeOpacity={0.85}
                  style={[
                    styles.secondaryRegisterBtn,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                      borderColor: isDark ? '#334155' : '#CBD5E1',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Create Account"
                >
                  <Ionicons
                    name="person-add-outline"
                    size={18}
                    color={isDark ? '#F1F5F9' : '#0F172A'}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.secondaryRegisterBtnText, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                    Create Account
                  </Text>
                </TouchableOpacity>

                {/* 3. Continue Shopping */}
                <TouchableOpacity
                  onPress={handleDismiss}
                  activeOpacity={0.7}
                  style={styles.cancelBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Continue Shopping"
                >
                  <Text style={[styles.cancelBtnText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Continue Shopping
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: Math.min(SCREEN_WIDTH - 40, 420),
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(227, 30, 36, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  productPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 20,
  },
  previewImage: {
    width: 46,
    height: 46,
    borderRadius: 8,
    marginRight: 10,
  },
  previewImagePlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  previewInfo: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
  },
  previewPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E31E24',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  actionContainer: {
    gap: 10,
  },
  primaryLoginBtn: {
    flexDirection: 'row',
    backgroundColor: '#E31E24',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#E31E24',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryLoginBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryRegisterBtn: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryRegisterBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  cancelBtn: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
