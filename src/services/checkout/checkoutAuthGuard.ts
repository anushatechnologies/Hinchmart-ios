/**
 * HINCH MART — Centralized Checkout Authentication Guard & State Preservation Service
 *
 * Requirements:
 * 1. Allow guest users to browse, add to cart, and reach checkout without mandatory login.
 * 2. Guard final order placement: Require authentication before order creation.
 * 3. Preserve cart, address, quantities, coupons, and payment preferences across Login/Register.
 * 4. Silently restore session for logged-in users on app launch.
 * 5. Return user seamlessly to checkout after login/registration.
 */
import { Alert } from 'react-native';
import { mmkvStorage } from '../storage/mmkv';
import { authStore } from '../../store/authStore';
import { addressesApi } from '../api/addresses.api';

export interface SavedCheckoutDraft {
  addressId?: number | null;
  addressTitle?: string;
  addressDetails?: string;
  guestAddress?: {
    siteName?: string;
    recipientName: string;
    phone: string;
    houseFlatNo?: string;
    street: string;
    area?: string;
    city: string;
    state?: string;
    pincode: string;
  } | null;
  selectedMethod?: 'razorpay' | 'upi' | 'card' | 'netbanking' | 'escrow' | 'credit' | 'cod' | string;
  selectedUpiApp?: 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'custom';
  upiId?: string;
  cardNumber?: string;
  cardHolder?: string;
  cardExpiry?: string;
  selectedBank?: string;
  couponCode?: string;
  action?: 'PLACE_ORDER';
  timestamp?: number;
}

const CHECKOUT_DRAFT_KEY = 'hinchmart_saved_checkout_draft';

/**
 * Persist current checkout progress to local storage so it is never lost during authentication
 */
export function saveCheckoutDraft(draft: SavedCheckoutDraft): void {
  try {
    const existing = getCheckoutDraft() || {};
    const updated = {
      ...existing,
      ...draft,
      timestamp: Date.now(),
    };
    mmkvStorage.setString(CHECKOUT_DRAFT_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[checkoutAuthGuard] Failed to save checkout draft:', err);
  }
}

/**
 * Retrieve saved checkout draft from local storage
 */
export function getCheckoutDraft(): SavedCheckoutDraft | null {
  try {
    const raw = mmkvStorage.getString(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[checkoutAuthGuard] Failed to parse checkout draft:', err);
    return null;
  }
}

/**
 * Clear saved checkout draft once order has been successfully placed
 */
export function clearCheckoutDraft(): void {
  try {
    mmkvStorage.remove(CHECKOUT_DRAFT_KEY);
  } catch (err) {
    console.warn('[checkoutAuthGuard] Failed to clear checkout draft:', err);
  }
}

/**
 * Centralized navigation helper to return to target screen after authentication.
 * Handles both Bottom Tabs (HomeTab, CartTab, ProfileTab, etc.) and Root Stack screens (CheckoutPayment, CheckoutAddress, etc.)
 */
export function navigateToPostAuthScreen(
  navigation: any,
  returnScreen?: string,
  returnParams?: any
): void {
  if (!returnScreen) {
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    return;
  }

  const tabNames = ['HomeTab', 'CategoriesTab', 'OrdersTab', 'CartTab', 'ProfileTab'];
  if (tabNames.includes(returnScreen)) {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'MainTabs',
          params: { screen: returnScreen, params: returnParams },
        },
      ],
    });
    return;
  }

  // Target is a stack screen (e.g. CheckoutPayment, CheckoutAddress)
  navigation.reset({
    index: 1,
    routes: [
      { name: 'MainTabs' },
      {
        name: returnScreen,
        params: returnParams,
      },
    ],
  });
}

/**
 * If a guest entered an address while unauthenticated, sync it to the backend once authenticated
 */
export async function syncSavedGuestAddressIfNeeded(): Promise<number | null> {
  if (!authStore.isAuthenticated()) return null;

  const draft = getCheckoutDraft();
  if (draft?.guestAddress) {
    try {
      const g = draft.guestAddress;
      const created = await addressesApi.createAddress({
        siteName: g.siteName || g.recipientName,
        recipientName: g.recipientName,
        phone: g.phone,
        addressLine1: g.street,
        areaLocality: g.area || '',
        city: g.city,
        state: g.state || 'Telangana',
        pincode: g.pincode,
        isDefault: true,
      });

      const rawId =
        (created as any)?.addressId ||
        (created as any)?.id ||
        (created as any)?.data?.addressId ||
        (created as any)?.data?.id;
      const numId = Number(rawId);

      if (numId && !isNaN(numId)) {
        draft.addressId = numId;
        draft.guestAddress = null;
        saveCheckoutDraft(draft);
        return numId;
      }
    } catch (err) {
      console.warn('[checkoutAuthGuard] syncSavedGuestAddress error:', err);
    }
  }
  return null;
}

export interface RequireAuthOptions {
  navigation: any;
  checkoutState?: SavedCheckoutDraft;
  returnScreen?: string; // Default: 'CheckoutPayment'
  action?: 'PLACE_ORDER';
  showPrompt?: boolean;
}

/**
 * Centralized authentication guard before completing an order
 * Returns true if user is authenticated; false if redirection to Login was triggered
 */
export function requireAuthenticationBeforeOrder(options: RequireAuthOptions): boolean {
  const {
    navigation,
    checkoutState,
    returnScreen = 'CheckoutPayment',
    action = 'PLACE_ORDER',
    showPrompt = false,
  } = options;

  if (authStore.isAuthenticated()) {
    return true;
  }

  // 1. Save all checkout data to local storage so nothing is lost
  if (checkoutState) {
    saveCheckoutDraft({
      ...checkoutState,
      action,
    });
  }

  const navigateToLogin = () => {
    navigation.navigate('Login', {
      returnScreen,
      action,
      returnParams: checkoutState
        ? {
            addressId: checkoutState.addressId,
            addressTitle: checkoutState.addressTitle,
            addressDetails: checkoutState.addressDetails,
            selectedMethod: checkoutState.selectedMethod,
            autoResumeOrder: true,
          }
        : undefined,
    });
  };

  if (showPrompt) {
    Alert.alert(
      '🔐 Sign In Required',
      'Please sign in or register to complete your order. Your cart, address, and checkout details are saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign In / Register',
          onPress: navigateToLogin,
        },
      ]
    );
  } else {
    navigateToLogin();
  }

  return false;
}
