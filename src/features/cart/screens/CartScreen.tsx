/**
 * HINCH MART — Enterprise B2B Shopping Cart Screen
 * Redesigned for high conversion, clear visual hierarchy, accessible touch targets,
 * clean typography, and seamless integration with live backend state and pricing.
 */
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { Screen, Header } from '../../../components/layout/Screen';
import { Card } from '../../../components/ui/Card';
import { formatPrice } from '../../../utils';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import {
  selectCartItems,
  selectCartSubtotal,
  clearCart,
  setServerCart,
  setCoupon,
  removeCoupon,
} from '../../../redux/slices/cartSlice';
import { cartApi } from '../../../services/api/cart.api';
import { authStore } from '../../../store/authStore';
import { addressesApi } from '../../../services/api/addresses.api';
import {
  LocationPickerModal,
  PRESET_DELIVERY_SITES,
  DeliverySite,
  customerAddressToDeliverySite,
} from '../../../components/ui/LocationPickerModal';
import { isHyderabadServiceable } from '../../../services/delivery/serviceability.service';
import { DeleteConfirmationModal } from '../../../components/ui/DeleteConfirmationModal';
import { ExploreCatalogModal } from '../../../components/ui/ExploreCatalogModal';
import { shippingApi } from '../../../services/api/shipping.api';
import { DiscountsModal } from '../../../components/ui/DiscountsModal';
import { discountsApi } from '../../../services/api/discounts.api';
import { CustomerDiscount } from '../../../types/discount.types';
import { couponsApi } from '../../../services/api/coupons.api';
import { EligibleCoupon } from '../../../types/coupon.types';

interface CartItemCardProps {
  item: any;
  isDark: boolean;
  theme: any;
  isUpdating: boolean;
  onUpdateQty: (id: string, qty: number) => void;
  onPromptDelete: (item: any, primaryImg: string, itemName: string, totalPrice: number) => void;
}

const CartItemCard = React.memo(
  function CartItemCard({
    item,
    isDark,
    theme,
    isUpdating,
    onUpdateQty,
    onPromptDelete,
  }: CartItemCardProps) {
    const primaryImg =
      (item?.product as any)?.image ||
      (item?.product as any)?.imageUrl ||
      (Array.isArray(item?.product?.images) && typeof item.product.images[0] === 'string'
        ? item.product.images[0]
        : item?.product?.images?.[0]?.url) ||
      '';

    const brandName =
      typeof item?.product?.brand === 'string'
        ? item.product.brand
        : (item?.product?.brand as any)?.name || 'Verified Supplier';

    const itemName = item?.product?.name || (item as any)?.name || 'Construction Material';
    const itemUnit = item?.product?.unit || (item as any)?.unit || 'Unit';
    const unitPrice = item?.unitPrice || (item?.product as any)?.price || 0;
    const totalPrice = item?.totalPrice || unitPrice * (item?.quantity || 1);
    const isExpress24 = Boolean(
      item?.is24HourDelivery ||
      item?.deliveryType === '24_HOURS' ||
      item?.product?.is24HourDelivery ||
      (item?.product as any)?.deliveryType === '24_HOURS'
    );

    const handleMinus = useCallback(() => {
      if (item.quantity <= 1) {
        onPromptDelete(item, primaryImg, itemName, totalPrice);
      } else {
        onUpdateQty(item.id, item.quantity - 1);
      }
    }, [onPromptDelete, onUpdateQty, item, primaryImg, itemName, totalPrice]);

    const handlePlus = useCallback(() => {
      onUpdateQty(item.id, item.quantity + 1);
    }, [onUpdateQty, item.id, item.quantity]);

    const handleDelete = useCallback(() => {
      onPromptDelete(item, primaryImg, itemName, totalPrice);
    }, [onPromptDelete, item, primaryImg, itemName, totalPrice]);

    return (
      <View
        style={[
          styles.itemCard,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        {/* Top Supplier & Availability Row */}
        <View style={styles.itemHeaderRow}>
          <View style={styles.supplierBadge}>
            <Ionicons name="shield-checkmark" size={13} color="#059669" />
            <Text
              numberOfLines={1}
              style={[styles.supplierText, { color: isDark ? '#94A3B8' : '#475569' }]}
            >
              {brandName}
            </Text>
          </View>

          <View style={styles.headerBadgeGroup}>
            {isExpress24 && (
              <View style={styles.expressBadge}>
                <Ionicons name="flash" size={10} color="#D97706" />
                <Text style={styles.expressBadgeText}>24-Hr Express</Text>
              </View>
            )}
            <View style={styles.stockBadge}>
              <View style={styles.stockDot} />
              <Text style={styles.stockBadgeText}>In Stock</Text>
            </View>
          </View>
        </View>

        {/* Product Details Row */}
        <View style={styles.itemBodyRow}>
          <View style={[styles.itemImgContainer, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
            <Image
              source={{ uri: primaryImg }}
              style={styles.itemImg}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          </View>

          <View style={styles.itemInfoCol}>
            <Text
              numberOfLines={2}
              style={[styles.itemName, { color: theme.colors.textPrimary }]}
            >
              {itemName}
            </Text>

            {item.quantity >= 5 && (
              <View style={styles.tierChip}>
                <Ionicons name="pricetag" size={11} color="#E31E24" />
                <Text style={styles.tierChipText}>Bulk Volume Tier Applied</Text>
              </View>
            )}

            {/* Price Row: Unit rate & Line Item Subtotal */}
            <View style={styles.pricingRow}>
              <View>
                <Text style={[styles.itemUnitPrice, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  {formatPrice(unitPrice)} <Text style={styles.unitSuffix}>/ {itemUnit}</Text>
                </Text>
              </View>
              <Text style={[styles.itemTotalPrice, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                {formatPrice(totalPrice)}
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Actions Row: Accessible Stepper & Remove Action */}
        <View style={[styles.itemFooterRow, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
          <View style={[styles.stepperContainer, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#CBD5E1' }]}>
            <TouchableOpacity
              onPress={handleMinus}
              disabled={isUpdating}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={styles.stepperActionBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Decrease item quantity"
            >
              <Ionicons
                name={item.quantity === 1 ? 'trash-outline' : 'remove'}
                size={16}
                color={item.quantity === 1 ? '#EF4444' : isDark ? '#CBD5E1' : '#334155'}
              />
            </TouchableOpacity>

            <View style={styles.stepperValueBox}>
              {isUpdating ? (
                <ActivityIndicator size="small" color="#E31E24" />
              ) : (
                <Text style={[styles.stepperValueText, { color: theme.colors.textPrimary }]}>
                  {item.quantity}
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={handlePlus}
              disabled={isUpdating}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={styles.stepperActionBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Increase item quantity"
            >
              <Ionicons name="add" size={16} color={isDark ? '#CBD5E1' : '#334155'} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Remove item from cart"
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
            <Text style={styles.deleteBtnText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
  (prev, next) => {
    return (
      prev.item.id === next.item.id &&
      prev.item.quantity === next.item.quantity &&
      prev.item.totalPrice === next.item.totalPrice &&
      prev.isDark === next.isDark &&
      prev.isUpdating === next.isUpdating &&
      prev.onUpdateQty === next.onUpdateQty &&
      prev.onPromptDelete === next.onPromptDelete
    );
  }
);

export function CartScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector(selectCartItems);
  const subtotal = useAppSelector(selectCartSubtotal);

  const [deliverySite, setDeliverySite] = useState<DeliverySite | null>(null);
  const hasUserSelectedSiteRef = useRef<boolean>(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [exploreCatalogModalVisible, setExploreCatalogModalVisible] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [availableDiscounts, setAvailableDiscounts] = useState<CustomerDiscount[]>([]);
  const [eligibleCoupons, setEligibleCoupons] = useState<EligibleCoupon[]>([]);
  const [isDiscountsModalOpen, setIsDiscountsModalOpen] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  // Delete & Removal Confirmation Modal State
  const [deleteTargetItem, setDeleteTargetItem] = useState<{
    id: string;
    name: string;
    image?: string;
    price?: string;
  } | null>(null);
  const [isClearAllModal, setIsClearAllModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [isCartRefreshing, setIsCartRefreshing] = useState(false);
  const [cartFetchError, setCartFetchError] = useState<string | null>(null);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [cartSummary, setCartSummary] = useState<{
    subtotal?: number;
    deliveryCharge?: number;
    totalGst?: number;
    couponDiscount?: number;
    grandTotal?: number;
  } | null>(null);

  const loadLiveCart = useCallback(async () => {
    // Only attempt live cart retrieval if authenticated
    if (!authStore.isAuthenticated()) {
      setHasFetchedOnce(true);
      return;
    }

    setCartFetchError(null);
    if (!hasFetchedOnce && cartItems.length === 0) {
      setIsCartLoading(true);
    }

    try {
      const liveCart = await cartApi.getCart();
      if (liveCart) {
        dispatch(setServerCart(liveCart));
        setCartSummary({
          subtotal: Number(liveCart.subtotal || 0),
          deliveryCharge: Number(liveCart.deliveryCharge || 0),
          totalGst: Number(liveCart.totalGst || 0),
          couponDiscount: Number(liveCart.discountAmount ?? liveCart.couponDiscount ?? 0),
          grandTotal: Number(liveCart.totalAmount ?? liveCart.grandTotal ?? 0),
        });

        if (liveCart.appliedCoupon) {
          setAppliedCoupon({
            code: liveCart.appliedCoupon,
            discount: Number(liveCart.discountAmount ?? liveCart.couponDiscount ?? 0),
          });
        }
      }
    } catch (err: any) {
      console.warn('[CartScreen] loadLiveCart error:', err?.message);
      // Guard against false empty cart: capture error message
      setCartFetchError(err?.message || 'Unable to load cart. Please check your network.');
    } finally {
      setIsCartLoading(false);
      setHasFetchedOnce(true);
    }
  }, [dispatch, hasFetchedOnce, cartItems.length]);

  const loadDiscounts = useCallback(async () => {
    try {
      const [eligible, general] = await Promise.all([
        couponsApi.getEligibleCoupons(subtotal),
        discountsApi.getCustomerDiscounts(),
      ]);
      if (Array.isArray(eligible)) setEligibleCoupons(eligible);
      if (Array.isArray(general)) setAvailableDiscounts(general);
    } catch {}
  }, [subtotal]);

  const loadSavedAddress = useCallback(async () => {
    if (!authStore.isAuthenticated() || hasUserSelectedSiteRef.current) return;
    try {
      const list = await addressesApi.getAddresses();
      if (Array.isArray(list) && list.length > 0) {
        const def =
          list.find((a) => a.isDefault && a.latitude && a.longitude) ||
          list.find((a) => a.latitude && a.longitude) ||
          list[0];
        if (def && def.latitude && def.longitude && !hasUserSelectedSiteRef.current) {
          setDeliverySite(customerAddressToDeliverySite(def));
        }
      }
    } catch {
      // Keep existing site
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLiveCart();
      loadDiscounts();
      loadSavedAddress();
      shippingApi.fetchSettings().catch(() => {});
    }, [loadLiveCart, loadDiscounts, loadSavedAddress])
  );

  const handleCartRefresh = useCallback(async () => {
    setIsCartRefreshing(true);
    try {
      await Promise.all([
        loadLiveCart(),
        shippingApi.fetchSettings().catch(() => {}),
      ]);
    } catch {
      // Graceful fallback
    } finally {
      setIsCartRefreshing(false);
    }
  }, [loadLiveCart]);

  // 24-Hour Delivery Serviceability validation
  const has24HourItems = useMemo(() => {
    return cartItems.some(
      (item: any) =>
        item.is24HourDelivery === true ||
        item.deliveryType === '24_HOURS' ||
        item.product?.is24HourDelivery === true ||
        (item.product as any)?.deliveryType === '24_HOURS'
    );
  }, [cartItems]);

  const isSiteServiceableFor24Hr = useMemo(() => {
    return deliverySite ? isHyderabadServiceable(deliverySite) : true;
  }, [deliverySite]);

  // Dynamic Shipping & Logistics Calculation from Backend / Admin Settings
  const shippingCalculation = useMemo(() => {
    return shippingApi.calculateShipping(
      subtotal,
      cartItems.length,
      cartSummary?.deliveryCharge,
      has24HourItems,
      false
    );
  }, [subtotal, cartItems.length, cartSummary?.deliveryCharge, has24HourItems]);

  const shippingCost = shippingCalculation.shippingCost;
  const isFreeShipping = shippingCalculation.isFreeShipping;
  const remainingForFreeShipping = shippingCalculation.remainingForFreeShipping;
  const freeThreshold = shippingApi.getSettingsSync().freeDeliveryThreshold;
  const progressToFreeShipping = isFreeShipping ? 1 : Math.min(1, Math.max(0, subtotal / (freeThreshold || 1)));

  const couponDiscountAmount = cartSummary?.couponDiscount ?? (appliedCoupon ? appliedCoupon.discount : 0);
  const total = cartItems.length === 0 ? 0 : Math.max(0, subtotal + shippingCost - couponDiscountAmount);

  const handleProceedToCheckout = () => {
    if (has24HourItems && !isSiteServiceableFor24Hr) {
      Alert.alert(
        '📍 24-Hr Delivery Restricted',
        `Your cart contains items eligible exclusively for 24-Hour delivery in Hyderabad.\n\nYour current site is set to "${deliverySite?.name || "Selected site"} (${deliverySite?.city || ""})", which is outside the Hyderabad express zone. Please select a Hyderabad delivery site to proceed.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Select Hyderabad Site', onPress: () => setLocationModalVisible(true) },
        ]
      );
      return;
    }
    navigation.navigate('CheckoutAddress');
  };

  const promptDeleteItem = useCallback((item: any, primaryImg: string, itemName: string, totalPrice: number) => {
    setDeleteTargetItem({
      id: item.id,
      name: itemName,
      image: primaryImg,
      price: formatPrice(totalPrice),
    });
  }, []);

  const handleUpdateQty = useCallback(
    async (id: string, quantity: number) => {
      const item = cartItems.find((entry: any) => entry.id === id);
      if (!item) return;
      const cartItemId = (item as any).cartItemId || item.id;
      setUpdatingItemId(id);
      try {
        if (quantity <= 0) {
          await cartApi.removeCartItem(cartItemId);
        } else {
          await cartApi.updateCartItem(cartItemId, quantity);
        }
        const liveCart = await cartApi.getCart();
        if (liveCart) dispatch(setServerCart(liveCart));
      } catch (err: any) {
        Alert.alert('Update Failed', err?.message || 'Could not update item quantity. Please try again.');
      } finally {
        setUpdatingItemId(null);
      }
    },
    [cartItems, dispatch]
  );

  const renderCartItem = useCallback(
    ({ item }: { item: any }) => (
      <CartItemCard
        item={item}
        isDark={isDark}
        theme={theme}
        isUpdating={updatingItemId === item.id}
        onUpdateQty={handleUpdateQty}
        onPromptDelete={promptDeleteItem}
      />
    ),
    [isDark, theme, updatingItemId, handleUpdateQty, promptDeleteItem]
  );

  const cartKeyExtractor = useCallback((item: any) => String(item.id || item.productId), []);

  const handleConfirmDelete = async () => {
    if (isClearAllModal) {
      setIsClearAllModal(false);
      try {
        await cartApi.clearCart();
      } catch (err: any) {
        console.warn('[CartScreen] Server clearCart error:', err?.message);
      } finally {
        dispatch(clearCart());
        dispatch(setServerCart({ cartId: 0, items: [], subtotal: 0, couponDiscount: 0, totalGst: 0, deliveryCharge: 0, grandTotal: 0 } as any));
        setCartSummary(null);
        setToastMessage('Shopping cart cleared');
      }
    } else if (deleteTargetItem) {
      const targetId = deleteTargetItem.id;
      const targetItem = cartItems.find((i: any) => i.id === targetId);
      const cartItemId = (targetItem as any)?.cartItemId || targetItem?.productId || targetId;
      const deletedName = deleteTargetItem.name;
      setDeleteTargetItem(null);
      try {
        await cartApi.removeCartItem(cartItemId);
        const liveCart = await cartApi.getCart();
        if (liveCart) dispatch(setServerCart(liveCart));
        setToastMessage(`Removed ${deletedName} from cart`);
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Could not remove item. Please try again.');
      }
    }
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleApplyCoupon = async (overrideCode?: string) => {
    const cleanCode = (overrideCode || couponCode).trim().toUpperCase();
    if (!cleanCode) return;
    setIsApplyingCoupon(true);
    setCouponError('');
    try {
      const res = await couponsApi.applyCoupon(cleanCode);
      const discountVal = Number(res?.discountAmount ?? 0);
      if (discountVal > 0) {
        setAppliedCoupon({ code: cleanCode, discount: discountVal });
        dispatch(setCoupon({ code: cleanCode, discount: discountVal }));
        setCouponError('');
        setToastMessage(`Coupon ${cleanCode} applied! Saved ${formatPrice(discountVal)}`);
        setCartSummary((prev) => prev ? {
          ...prev,
          couponDiscount: discountVal,
          grandTotal: Number(res?.newGrandTotal || res?.grandTotal || (prev.subtotal ? prev.subtotal - discountVal + (prev.deliveryCharge || 0) + (prev.totalGst || 0) : prev.grandTotal)),
        } : null);
        loadLiveCart();
        return;
      }
      setCouponError('Coupon applied with ₹0 discount');
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Invalid or expired coupon code';
      setCouponError(errMsg);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    dispatch(removeCoupon());
    try {
      const updated = await couponsApi.removeCoupon();
      if (updated) {
        dispatch(setServerCart(updated));
      }
      loadLiveCart();
    } catch {
      loadLiveCart();
    }
  };

  const handleClearAll = () => {
    setIsClearAllModal(true);
  };

  if (isCartLoading && cartItems.length === 0) {
    return (
      <Screen scrollable={false}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? '#1E293B' : '#FFFFFF'}
        />
        <Header
          title="My Cart"
          variant="surface"
          showBack={false}
          showCart={false}
        />
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#E31E24" />
          <Text style={[styles.emptyHeroSubtitle, { color: theme.colors.textSecondary, marginTop: 16 }]}>
            Loading your shopping cart...
          </Text>
        </View>
      </Screen>
    );
  }

  if (cartFetchError && cartItems.length === 0) {
    return (
      <Screen scrollable={false}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? '#1E293B' : '#FFFFFF'}
        />
        <Header
          title="My Cart"
          variant="surface"
          showBack={false}
          showCart={false}
        />
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]}>
            <Ionicons name="cloud-offline-outline" size={44} color="#DC2626" />
          </View>

          <Text style={[styles.emptyHeroTitle, { color: theme.colors.textPrimary }]}>
            Unable to Load Cart
          </Text>
          <Text style={[styles.emptyHeroSubtitle, { color: theme.colors.textSecondary }]}>
            {cartFetchError}
          </Text>

          <TouchableOpacity
            onPress={() => loadLiveCart()}
            activeOpacity={0.85}
            style={styles.explorePrimaryBtn}
            accessibilityRole="button"
            accessibilityLabel="Retry loading cart"
          >
            <View style={styles.exploreBtnInner}>
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.explorePrimaryText}>Retry Loading Cart</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  if (!authStore.isAuthenticated() && cartItems.length === 0) {
    return (
      <Screen scrollable={false}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? '#1E293B' : '#FFFFFF'}
        />
        <Header
          title="My Cart"
          variant="surface"
          showBack={false}
          showCart={false}
        />

        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <Ionicons name="person-circle-outline" size={46} color={isDark ? '#94A3B8' : '#64748B'} />
          </View>

          <Text style={[styles.emptyHeroTitle, { color: theme.colors.textPrimary }]}>
            Login or Create an Account
          </Text>
          <Text style={[styles.emptyHeroSubtitle, { color: theme.colors.textSecondary }]}>
            Please log in or register to add products to your shopping cart and continue shopping.
          </Text>

          <View style={{ width: '100%', maxWidth: 280, gap: 10 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
              style={styles.explorePrimaryBtn}
              accessibilityRole="button"
              accessibilityLabel="Login to your account"
            >
              <View style={styles.exploreBtnInner}>
                <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                <Text style={styles.explorePrimaryText}>Login</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.85}
              style={styles.explorePrimaryBtn}
              accessibilityRole="button"
              accessibilityLabel="Create an account"
            >
              <View style={[styles.exploreBtnInner, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                <Ionicons name="person-add-outline" size={17} color={isDark ? '#FFFFFF' : '#0F172A'} />
                <Text style={[styles.explorePrimaryText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                  Create Account
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('ProductList')}
              activeOpacity={0.7}
              style={{ paddingVertical: 8, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#64748B' }}>
                Continue Browsing
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Screen>
    );
  }

  if (cartItems.length === 0) {
    return (
      <Screen scrollable={false}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? '#1E293B' : '#FFFFFF'}
        />
        <Header
          title="My Cart"
          variant="surface"
          showBack={false}
          showCart={false}
        />

        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <Ionicons name="cart-outline" size={44} color={isDark ? '#94A3B8' : '#64748B'} />
          </View>

          <Text style={[styles.emptyHeroTitle, { color: theme.colors.textPrimary }]}>
            Your Shopping Cart is Empty
          </Text>
          <Text style={[styles.emptyHeroSubtitle, { color: theme.colors.textSecondary }]}>
            Browse verified construction supplies, power tools, electrical materials, and wholesale B2B hardware.
          </Text>

          <TouchableOpacity
            onPress={() => setExploreCatalogModalVisible(true)}
            activeOpacity={0.85}
            style={styles.explorePrimaryBtn}
            accessibilityRole="button"
            accessibilityLabel="Explore product catalog"
          >
            <View style={styles.exploreBtnInner}>
              <Ionicons name="grid-outline" size={18} color="#FFFFFF" />
              <Text style={styles.explorePrimaryText}>Explore Full Catalog</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        <ExploreCatalogModal
          visible={exploreCatalogModalVisible}
          onClose={() => setExploreCatalogModalVisible(false)}
          onExploreProducts={() => navigation.navigate('ProductList')}
        />
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#1E293B' : '#FFFFFF'}
      />
      {/* Premium Clean B2B Header */}
      <Header
        title={`My Cart (${cartItems.length})`}
        variant="surface"
        showBack={false}
        showCart={false}
        rightAction={
          <TouchableOpacity
            onPress={handleClearAll}
            style={styles.clearHeaderBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Clear all items in cart"
          >
            <Ionicons name="trash-outline" size={14} color="#64748B" style={{ marginRight: 4 }} />
            <Text style={styles.clearHeaderText}>Clear All</Text>
          </TouchableOpacity>
        }
      />

      {/* Responsive Content Container */}
      <View style={styles.contentWrap}>
        {/* Project Delivery Site Selector */}
        <TouchableOpacity
          onPress={() => setLocationModalVisible(true)}
          style={[
            styles.deliveryAddressCard,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Change delivery site"
        >
          <View style={styles.addressLeftRow}>
            <View style={[styles.locationIconWrap, { backgroundColor: isDark ? '#0F172A' : '#EFF6FF' }]}>
              <Ionicons name="location" size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.addressLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                DELIVER TO PROJECT SITE
              </Text>
              <Text numberOfLines={1} style={[styles.addressSiteName, { color: theme.colors.textPrimary }]}>
                {deliverySite ? deliverySite.name : 'Select Delivery Site'}
              </Text>
              <Text numberOfLines={1} style={[styles.addressCity, { color: theme.colors.textSecondary }]}>
                {deliverySite ? `${deliverySite.city}, ${deliverySite.state || 'India'}` : 'Tap to choose delivery location'}
              </Text>
            </View>
          </View>

          <View style={styles.addressChangeBtn}>
            <Text style={styles.addressChangeBtnText}>Change</Text>
            <Ionicons name="chevron-forward" size={13} color="#2563EB" />
          </View>
        </TouchableOpacity>

        {/* Sync / Network Error Retry Banner if background fetch failed */}
        {cartFetchError && (
          <View style={styles.warningAlertBanner}>
            <Ionicons name="cloud-offline-outline" size={18} color="#DC2626" style={{ marginRight: 8, marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningAlertTitle}>Cart Sync Warning</Text>
              <Text style={styles.warningAlertSub}>{cartFetchError}</Text>
            </View>
            <TouchableOpacity
              onPress={() => loadLiveCart()}
              style={styles.warningSwitchBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.warningSwitchBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 24-Hr Express Serviceability Warning (Only if restricted) */}
        {has24HourItems && !isSiteServiceableFor24Hr && (
          <View style={styles.warningAlertBanner}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 8, marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningAlertTitle}>24-Hour Express Restricted</Text>
              <Text style={styles.warningAlertSub}>
                Selected site ({deliverySite?.city || "location"}) is outside Hyderabad express delivery area.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setLocationModalVisible(true)}
              style={styles.warningSwitchBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.warningSwitchBtnText}>Switch Site</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={cartItems}
          contentContainerStyle={styles.listPadding}
          keyExtractor={cartKeyExtractor}
          renderItem={renderCartItem}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={isCartRefreshing}
              onRefresh={handleCartRefresh}
              tintColor="#E31E24"
              colors={['#E31E24']}
            />
          }
          ListFooterComponent={
            <View style={styles.footerSection}>
              {/* Delivery Benefits & Free Freight Progress Banner */}
              <View
                style={[
                  styles.freightCard,
                  isFreeShipping ? styles.freightCardUnlocked : styles.freightCardProgress,
                  { borderColor: isFreeShipping ? '#BBF7D0' : isDark ? '#334155' : '#E2E8F0' },
                ]}
              >
                <View style={styles.freightHeaderRow}>
                  <View style={styles.freightIconTextRow}>
                    <Ionicons
                      name={isFreeShipping ? 'checkmark-circle' : 'bus-outline'}
                      size={18}
                      color={isFreeShipping ? '#16A34A' : '#E31E24'}
                    />
                    <Text
                      style={[
                        styles.freightTitleText,
                        { color: isFreeShipping ? '#15803D' : theme.colors.textPrimary },
                      ]}
                    >
                      {isFreeShipping
                        ? 'Free Site Delivery Unlocked'
                        : `Add ${formatPrice(remainingForFreeShipping)} more for FREE Delivery`}
                    </Text>
                  </View>
                  {isFreeShipping && (
                    <View style={styles.qualifiedChip}>
                      <Text style={styles.qualifiedChipText}>Qualified</Text>
                    </View>
                  )}
                </View>

                {!isFreeShipping && (
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, Math.max(8, progressToFreeShipping * 100))}%`,
                          backgroundColor: '#E31E24',
                        },
                      ]}
                    />
                  </View>
                )}
              </View>

              {/* Promo & B2B Voucher Section */}
              <View
                style={[
                  styles.couponContainer,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.couponHeaderRow}>
                  <Text style={[styles.couponSectionTitle, { color: theme.colors.textPrimary }]}>
                    Coupons & B2B Vouchers
                  </Text>
                  {availableDiscounts.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setIsDiscountsModalOpen(true)}
                      activeOpacity={0.7}
                      style={styles.viewOffersBtn}
                    >
                      <Ionicons name="pricetags" size={13} color="#E31E24" />
                      <Text style={styles.viewOffersText}>
                        View Offers ({availableDiscounts.length}) ›
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {appliedCoupon ? (
                  <View style={styles.appliedBanner}>
                    <View style={styles.appliedBannerLeft}>
                      <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                      <View>
                        <Text style={styles.appliedBannerCode}>{appliedCoupon.code} Applied</Text>
                        <Text style={styles.appliedBannerSavings}>
                          Savings: {formatPrice(appliedCoupon.discount)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={handleRemoveCoupon}
                      style={styles.removeCouponBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Remove coupon"
                    >
                      <Text style={styles.removeCouponText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.couponInputWrapper}>
                      <TextInput
                        value={couponCode}
                        onChangeText={(txt) => {
                          setCouponCode(txt);
                          if (couponError) setCouponError('');
                        }}
                        placeholder="Enter coupon code (e.g. STEEL10)"
                        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                        style={[
                          styles.couponTextInput,
                          {
                            color: theme.colors.textPrimary,
                            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                            borderColor: couponError ? '#EF4444' : isDark ? '#334155' : '#CBD5E1',
                          },
                        ]}
                        autoCapitalize="characters"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        onPress={() => handleApplyCoupon()}
                        disabled={isApplyingCoupon || !couponCode.trim()}
                        style={[
                          styles.applyBtn,
                          {
                            backgroundColor: !couponCode.trim()
                              ? (isDark ? '#334155' : '#E2E8F0')
                              : '#E31E24',
                          },
                        ]}
                        activeOpacity={0.8}
                      >
                        {isApplyingCoupon ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text
                            style={[
                              styles.applyBtnText,
                              { color: !couponCode.trim() ? '#94A3B8' : '#FFFFFF' },
                            ]}
                          >
                            Apply
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Quick-Apply Eligible Coupon Chips */}
                    {(eligibleCoupons.length > 0 || availableDiscounts.length > 0) && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.couponChipsRow}
                      >
                        {(eligibleCoupons.length > 0 ? eligibleCoupons : (availableDiscounts as any)).slice(0, 5).map((item: any) => {
                          const code = item.code;
                          const isApplicable = item.isApplicable !== undefined ? item.isApplicable : subtotal >= Number(item.minimumOrderAmount || item.minOrderAmount || 0);
                          const isPercentage = (item.discountType || '').toUpperCase() === 'PERCENTAGE';
                          const badgeText = item.estimatedDiscount > 0
                            ? `Save ${formatPrice(item.estimatedDiscount)}`
                            : (item.shortfallAmount > 0
                                ? `Add ${formatPrice(item.shortfallAmount)}`
                                : (isPercentage ? `${item.discountValue}% OFF` : `${formatPrice(item.discountValue)} OFF`));

                          return (
                            <TouchableOpacity
                              key={code}
                              onPress={() => {
                                setCouponCode(code);
                                handleApplyCoupon(code);
                              }}
                              activeOpacity={0.7}
                              style={[
                                styles.couponChip,
                                {
                                  borderColor: isApplicable ? '#E31E24' : isDark ? '#334155' : '#CBD5E1',
                                  backgroundColor: isApplicable
                                    ? (isDark ? 'rgba(227, 30, 36, 0.12)' : '#FEF2F2')
                                    : (isDark ? '#0F172A' : '#F8FAFC'),
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.couponChipCode,
                                  { color: isApplicable ? '#E31E24' : isDark ? '#94A3B8' : '#64748B' },
                                ]}
                              >
                                {code}
                              </Text>
                              <View style={styles.chipDivider} />
                              <Text
                                style={[
                                  styles.couponChipBadge,
                                  { color: isApplicable ? '#B91C1C' : isDark ? '#94A3B8' : '#64748B' },
                                ]}
                              >
                                {badgeText}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </>
                )}

                {couponError ? (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={13} color="#DC2626" />
                    <Text style={styles.couponErrorText}>{couponError}</Text>
                  </View>
                ) : null}
              </View>

              {/* Order Summary & Financial Breakdown */}
              <View
                style={[
                  styles.summaryContainer,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.summaryHeader}>
                  <Text style={[styles.summaryTitle, { color: theme.colors.textPrimary }]}>
                    Order Financial Breakdown
                  </Text>
                  <View style={styles.itemCountBadge}>
                    <Text style={styles.itemCountBadgeText}>
                      {cartItems.length} {cartItems.length === 1 ? 'ITEM' : 'ITEMS'}
                    </Text>
                  </View>
                </View>

                {/* Subtotal */}
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Subtotal ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
                  </Text>
                  <Text style={[styles.breakdownVal, { color: theme.colors.textPrimary }]}>
                    {formatPrice(subtotal)}
                  </Text>
                </View>

                {/* Shipping & Freight */}
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Freight & Shipping
                  </Text>
                  <Text
                    style={[
                      styles.breakdownVal,
                      { color: isFreeShipping || shippingCost === 0 ? '#16A34A' : theme.colors.textPrimary },
                    ]}
                  >
                    {isFreeShipping || shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}
                  </Text>
                </View>

                {/* Applied Coupon Discount */}
                {appliedCoupon && (
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: '#16A34A' }]}>
                      Coupon Discount ({appliedCoupon.code})
                    </Text>
                    <Text style={[styles.breakdownVal, { color: '#16A34A' }]}>
                      -{formatPrice(appliedCoupon.discount)}
                    </Text>
                  </View>
                )}

                {/* Estimated Delivery Timeline */}
                <View style={[styles.deliveryEstPill, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                  <Ionicons name="time-outline" size={15} color="#475569" />
                  <Text style={[styles.deliveryEstText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Estimated Delivery: <Text style={{ fontFamily: 'Inter_600SemiBold', color: theme.colors.textPrimary }}>3-5 Business Days</Text>
                  </Text>
                </View>

                <View style={[styles.summaryDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />

                {/* Total Payable Amount */}
                <View style={[styles.totalHighlightRow, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                  <View>
                    <Text style={[styles.totalLabel, { color: theme.colors.textPrimary }]}>
                      Total Payable Amount
                    </Text>
                    <Text style={[styles.taxInclusiveText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                      Inclusive of all applicable taxes
                    </Text>
                  </View>
                  <Text style={[styles.totalValue, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                    {formatPrice(total)}
                  </Text>
                </View>

                {/* Trust & Buyer Protection Indicator */}
                <View style={styles.trustIndicatorRow}>
                  <Ionicons name="shield-checkmark" size={15} color="#059669" />
                  <Text style={[styles.trustIndicatorText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    100% Protected by Hinch Mart Escrow Guarantee
                  </Text>
                </View>

                {/* Primary Action: Proceed to Secure Checkout */}
                <TouchableOpacity
                  onPress={handleProceedToCheckout}
                  activeOpacity={0.88}
                  style={styles.primaryCheckoutBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Proceed to secure checkout"
                >
                  <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryCheckoutBtnText}>Proceed to Secure Checkout</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Secondary Action: Bulk Project Quotation (RFQ) */}
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('RFQCreate', {
                      initialTitle: `Bulk Order for ${cartItems.length} Material${cartItems.length > 1 ? 's' : ''}`,
                      initialCategory: 'Multi-Category Materials',
                      cartItems: cartItems.map((item: any) => ({
                        id: String(Date.now() + Math.random()),
                        name: item.product.name,
                        qty: String(item.quantity),
                        unit: item.product.unit || 'Units',
                        specs: `Current Cart Item • Est. Rate ${formatPrice(item.unitPrice)}`,
                      })),
                    });
                  }}
                  activeOpacity={0.8}
                  style={[
                    styles.secondaryRfqBtn,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#CBD5E1',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Request bulk project quotation instead"
                >
                  <Ionicons name="document-text-outline" size={16} color={isDark ? '#94A3B8' : '#475569'} />
                  <Text style={[styles.secondaryRfqBtnText, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                    Request Bulk Project Quotation Instead
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          }
        />
      </View>

      {/* Modals & Confirmation Dialogs */}
      <LocationPickerModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        selectedSite={deliverySite || undefined}
        onSelectSite={(site) => {
          hasUserSelectedSiteRef.current = true;
          setDeliverySite(site);
        }}
      />

      <DiscountsModal
        visible={isDiscountsModalOpen}
        onClose={() => setIsDiscountsModalOpen(false)}
        orderSubtotal={subtotal}
        appliedCode={appliedCoupon?.code}
        onApplyDiscount={(code) => {
          setCouponCode(code);
          handleApplyCoupon(code);
        }}
      />

      <DeleteConfirmationModal
        visible={!!deleteTargetItem || isClearAllModal}
        title={isClearAllModal ? 'Clear Shopping Cart?' : 'Remove Item from Cart?'}
        message={
          isClearAllModal
            ? 'Are you sure you want to remove all items and materials from your cart?'
            : `Are you sure you want to remove "${deleteTargetItem?.name || 'this item'}" from your cart?`
        }
        itemName={deleteTargetItem?.name}
        itemImage={deleteTargetItem?.image}
        itemPrice={deleteTargetItem?.price}
        cancelText="Keep Item"
        confirmText={isClearAllModal ? 'Clear All' : 'Yes, Remove'}
        onCancel={() => {
          setDeleteTargetItem(null);
          setIsClearAllModal(false);
        }}
        onConfirm={handleConfirmDelete}
      />

      {/* Floating Action Feedback Toast */}
      {toastMessage && (
        <View style={styles.toastPopup}>
          <Ionicons name="checkmark-circle" size={17} color="#10B981" />
          <Text style={styles.toastText} numberOfLines={1}>
            {toastMessage}
          </Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  clearHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  clearHeaderText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#475569',
  },
  deliveryAddressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
    }),
  },
  addressLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  locationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  addressLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9.5,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  addressSiteName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 17,
  },
  addressCity: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    marginTop: 1,
  },
  addressChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    gap: 2,
  },
  addressChangeBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    color: '#2563EB',
  },
  warningAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  warningAlertTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11.5,
    color: '#DC2626',
    marginBottom: 2,
  },
  warningAlertSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#B91C1C',
    lineHeight: 15,
  },
  warningSwitchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#DC2626',
    marginLeft: 8,
  },
  warningSwitchBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  listPadding: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
  },
  itemCard: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
    }),
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  supplierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '55%',
  },
  supplierText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  headerBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  expressBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#B45309',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  stockDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  stockBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10.5,
    color: '#059669',
  },
  itemBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemImgContainer: {
    width: 84,
    height: 84,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemImg: {
    width: '100%',
    height: '100%',
  },
  itemInfoCol: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    lineHeight: 18,
    marginBottom: 4,
  },
  tierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
    marginBottom: 4,
  },
  tierChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#DC2626',
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  itemUnitPrice: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  unitSuffix: {
    fontSize: 11,
  },
  itemTotalPrice: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  itemFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
  },
  stepperActionBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValueBox: {
    minWidth: 36,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValueText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  deleteBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    color: '#DC2626',
  },
  footerSection: {
    marginTop: 4,
    gap: 12,
  },
  freightCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  freightCardUnlocked: {
    backgroundColor: '#F0FDF4',
  },
  freightCardProgress: {
    backgroundColor: '#F8FAFC',
  },
  freightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  freightIconTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  freightTitleText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    flex: 1,
  },
  qualifiedChip: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qualifiedChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10.5,
    color: '#15803D',
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  couponContainer: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
    }),
  },
  couponHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  couponSectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  viewOffersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewOffersText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#E31E24',
  },
  appliedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  appliedBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appliedBannerCode: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12.5,
    color: '#15803D',
  },
  appliedBannerSavings: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#16A34A',
  },
  removeCouponBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeCouponText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    color: '#DC2626',
  },
  couponInputWrapper: {
    flexDirection: 'row',
    gap: 8,
  },
  couponTextInput: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
  },
  applyBtn: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
  },
  couponChipsRow: {
    gap: 8,
    marginTop: 10,
    paddingVertical: 2,
  },
  couponChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  couponChipCode: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  chipDivider: {
    width: 1,
    height: 10,
    backgroundColor: '#CBD5E1',
  },
  couponChipBadge: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10.5,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  couponErrorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#DC2626',
  },
  summaryContainer: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
    }),
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14.5,
  },
  itemCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  itemCountBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10.5,
    color: '#475569',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  breakdownLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
  },
  breakdownVal: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  deliveryEstPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 6,
    marginVertical: 8,
  },
  deliveryEstText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 8,
  },
  totalHighlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  totalLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13.5,
  },
  taxInclusiveText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10.5,
    marginTop: 1,
  },
  totalValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  trustIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  trustIndicatorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  primaryCheckoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E31E24',
    height: 48,
    borderRadius: 8,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#E31E24',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  primaryCheckoutBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  secondaryRfqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    gap: 6,
  },
  secondaryRfqBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
  },
  toastPopup: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    maxWidth: '90%',
    zIndex: 999,
  },
  toastText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    minHeight: 450,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyHeroTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyHeroSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 20,
  },
  explorePrimaryBtn: {
    width: '100%',
    maxWidth: 280,
  },
  exploreBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#E31E24',
  },
  explorePrimaryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});

