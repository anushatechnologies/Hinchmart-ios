/**
 * HINCH MART — Unified Cart State & Mutation Manager
 * Single authoritative pipeline for:
 * - Server-authoritative cart state: all mutations go through the server
 * - Authentication guarding: intercepts guest add-to-cart actions
 * - Rapid tap debouncing & race-condition prevention (+ + + / - - -)
 * - Server synchronization & reconciliation across ProductListing, ProductDetails, Cart, and Home
 * - Post-authentication action resumption
 */
import { AppDispatch } from '../../redux/store';
import {
  updateItemQuantity,
  removeItem,
  setServerCart,
  showCartToast,
  showAuthModal,
} from '../../redux/slices/cartSlice';
import { cartApi } from '../api/cart.api';
import { authStore } from '../../store/authStore';
import { cartAuthGuard } from './cartAuthGuard';
import { ApiProduct } from '../../types/product.types';
import { BackendCart } from '../../types/cart.types';

// In-flight add-to-cart requests per product ID to prevent duplicate submissions
const inFlightAddRequests = new Set<string>();

// Per-product pending target quantity and debounce timers to prevent race conditions during rapid taps (+ + + / - - -)
const pendingTargetQuantities: Record<string, number> = {};
const debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};

// Session epoch counter to invalidate in-flight network requests on logout or user switch
let currentSessionEpoch = 0;

// Deduplicated load cart promise
let activeLoadCartPromise: Promise<BackendCart | null> | null = null;

function isCurrentSessionValid(requestEpoch: number, requestUserId?: string | number): boolean {
  if (requestEpoch !== currentSessionEpoch) return false;
  if (!authStore.isAuthenticated()) return false;
  const currentUserId = authStore.getUser()?.id;
  if (requestUserId && currentUserId && String(requestUserId) !== String(currentUserId)) return false;
  return true;
}

function getProductId(productOrId: any): string {
  if (!productOrId) return '';
  if (typeof productOrId === 'string' || typeof productOrId === 'number') {
    return String(productOrId);
  }
  return String(productOrId.id || productOrId.productId || '');
}

export const cartManager = {
  /**
   * Cancel all pending timers & invalidate any in-flight cart operations
   * Called immediately on logout and session invalidation
   */
  cancelPendingOperations() {
    currentSessionEpoch++;
    inFlightAddRequests.clear();
    activeLoadCartPromise = null;
    Object.keys(debounceTimers).forEach((key) => {
      clearTimeout(debounceTimers[key]);
      delete debounceTimers[key];
    });
    Object.keys(pendingTargetQuantities).forEach((key) => {
      delete pendingTargetQuantities[key];
    });
  },

  /**
   * Load authoritative cart from server for the authenticated user.
   * Deduplicated: concurrent callers share the same in-flight promise.
   */
  async loadServerCart(dispatch: AppDispatch): Promise<BackendCart | null> {
    if (!authStore.isAuthenticated()) return null;

    if (activeLoadCartPromise) {
      return activeLoadCartPromise;
    }

    activeLoadCartPromise = (async () => {
      const requestEpoch = currentSessionEpoch;
      const requestUserId = authStore.getUser()?.id;
      try {
        const liveCart = await cartApi.getCart();
        if (liveCart && isCurrentSessionValid(requestEpoch, requestUserId)) {
          dispatch(setServerCart(liveCart));
          return liveCart;
        }
        return null;
      } catch (err: any) {
        console.warn('[cartManager] Failed to load server cart:', err?.message);
        return null;
      } finally {
        activeLoadCartPromise = null;
      }
    })();

    return activeLoadCartPromise;
  },

  /**
   * Add a product to the cart with specified quantity.
   * 
   * Flow:
   * 1. If not authenticated: intercept, save pending action, open Auth Modal.
   * 2. If authenticated: validate, disable duplicate submit, call server API,
   *    reconcile shared cart state with authoritative response, and show
   *    success toast ONLY after server confirms.
   */
  async addToCart(
    dispatch: AppDispatch,
    product: ApiProduct | any,
    quantity: number = 1,
    storeId?: number | string,
    navigation?: any,
    returnScreen?: string,
    returnParams?: any
  ): Promise<{ success: boolean; requiresAuth?: boolean; inFlight?: boolean; cart?: BackendCart; error?: string }> {
    const productId = getProductId(product);
    if (!productId) return { success: false, error: 'Invalid product ID' };

    const targetQty = Math.max(1, quantity);
    const prodStoreId = storeId || product?.storeId;

    // STEP 1: Intercept guest users and require login / registration
    if (!authStore.isAuthenticated()) {
      cartAuthGuard.savePendingAction({
        product,
        productId,
        quantity: targetQty,
        storeId: prodStoreId,
        sourceScreen: returnScreen,
        sourceParams: returnParams,
      });

      dispatch(
        showAuthModal({
          product,
          quantity: targetQty,
          storeId: prodStoreId,
          returnScreen,
          returnParams,
        })
      );

      return { success: false, requiresAuth: true };
    }

    // STEP 2: Prevent duplicate in-flight submissions
    if (inFlightAddRequests.has(productId)) {
      return { success: false, inFlight: true };
    }
    inFlightAddRequests.add(productId);

    const unitPrice =
      typeof product?.price === 'number'
        ? product.price
        : parseFloat(String(product?.price || 0)) || 0;
    const title = product?.title || product?.name || 'Product';
    const image =
      product?.images?.[0] ||
      product?.image ||
      product?.imageUrl ||
      '';

    const requestEpoch = currentSessionEpoch;
    const requestUserId = authStore.getUser()?.id;

    try {
      // Send add-to-cart request to backend
      await cartApi.addToCart({
        productId,
        quantity: targetQty,
        storeId: prodStoreId,
      });

      // Retrieve authoritative fresh cart
      const liveCart = await cartApi.getCart();
      if (liveCart && isCurrentSessionValid(requestEpoch, requestUserId)) {
        // Reconcile shared Redux cart state
        dispatch(setServerCart(liveCart));

        // Show success toast ONLY after server success confirmation
        dispatch(
          showCartToast({
            productName: title,
            itemTitle: title,
            productImage: image,
            price: unitPrice,
            quantity: targetQty,
          })
        );

        return { success: true, cart: liveCart };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('[cartManager] Server addToCart error:', err?.message);
      // Keep cart state consistent: do NOT add item if server rejected
      return {
        success: false,
        error: err?.message || 'Failed to add item to cart. Please try again.',
      };
    } finally {
      inFlightAddRequests.delete(productId);
    }
  },

  /**
   * Resume and execute the pending add-to-cart action after login/registration.
   */
  async executePendingAddToCart(dispatch: AppDispatch): Promise<{
    success: boolean;
    cart?: BackendCart;
    error?: string;
  }> {
    return cartAuthGuard.executePendingAction(dispatch);
  },

  /**
   * Increment product quantity by 1
   */
  async increment(
    dispatch: AppDispatch,
    product: ApiProduct | any,
    currentQty: number,
    cartItem?: any,
    navigation?: any,
    returnScreen?: string,
    returnParams?: any
  ) {
    const productId = getProductId(product);
    if (!productId) return;

    if (!authStore.isAuthenticated()) {
      cartAuthGuard.savePendingAction({
        product,
        productId,
        quantity: currentQty + 1,
        sourceScreen: returnScreen,
        sourceParams: returnParams,
      });
      dispatch(showAuthModal({ product, quantity: currentQty + 1, returnScreen, returnParams }));
      return;
    }

    const nextQty = (pendingTargetQuantities[productId] ?? currentQty) + 1;
    const stockQty =
      typeof product?.stockQty === 'number'
        ? product.stockQty
        : parseInt(String(product?.stock ?? 99999), 10) || 99999;

    if (stockQty > 0 && nextQty > stockQty) {
      return; // Respect stock limit
    }

    pendingTargetQuantities[productId] = nextQty;

    // 1. Immediate optimistic Redux update during rapid clicks
    dispatch(updateItemQuantity({ id: productId, quantity: nextQty }));

    // 2. Debounced server synchronization to handle rapid taps safely
    if (debounceTimers[productId]) {
      clearTimeout(debounceTimers[productId]);
    }

    debounceTimers[productId] = setTimeout(async () => {
      const finalQty = pendingTargetQuantities[productId];
      delete pendingTargetQuantities[productId];
      delete debounceTimers[productId];

      if (authStore.isAuthenticated() && finalQty != null) {
        const requestEpoch = currentSessionEpoch;
        const requestUserId = authStore.getUser()?.id;
        try {
          const cartItemId = cartItem?.cartItemId || (cartItem as any)?.id;
          if (cartItemId) {
            await cartApi.updateCartItem(cartItemId, finalQty);
          } else {
            await cartApi.addToCart({ productId, quantity: finalQty });
          }
          const liveCart = await cartApi.getCart();
          if (liveCart && isCurrentSessionValid(requestEpoch, requestUserId)) {
            dispatch(setServerCart(liveCart));
          }
        } catch (err: any) {
          console.warn('[cartManager] Server increment error:', err?.message);
          // Rollback: Reconcile with latest server cart to keep state consistent
          try {
            const rollbackCart = await cartApi.getCart();
            if (rollbackCart && isCurrentSessionValid(requestEpoch, requestUserId)) {
              dispatch(setServerCart(rollbackCart));
            }
          } catch {}
        }
      }
    }, 320);
  },

  /**
   * Decrement product quantity by 1
   * If nextQty <= 0, removes from cart
   */
  async decrement(
    dispatch: AppDispatch,
    product: ApiProduct | any,
    currentQty: number,
    cartItem?: any,
    moq: number = 1,
    navigation?: any,
    returnScreen?: string,
    returnParams?: any
  ) {
    const productId = getProductId(product);
    if (!productId) return;

    if (!authStore.isAuthenticated()) {
      dispatch(showAuthModal({ product, quantity: 1, returnScreen, returnParams }));
      return;
    }

    const currentPending = pendingTargetQuantities[productId] ?? currentQty;
    const nextQty = currentPending - 1;

    if (debounceTimers[productId]) {
      clearTimeout(debounceTimers[productId]);
    }

    if (nextQty <= 0) {
      delete pendingTargetQuantities[productId];
      // Optimistic removal
      dispatch(removeItem(productId));

      debounceTimers[productId] = setTimeout(async () => {
        delete debounceTimers[productId];
        if (authStore.isAuthenticated()) {
          const requestEpoch = currentSessionEpoch;
          const requestUserId = authStore.getUser()?.id;
          try {
            const cartItemId = cartItem?.cartItemId || (cartItem as any)?.id;
            if (cartItemId) {
              await cartApi.removeCartItem(cartItemId);
            }
            const liveCart = await cartApi.getCart();
            if (liveCart && isCurrentSessionValid(requestEpoch, requestUserId)) {
              dispatch(setServerCart(liveCart));
            }
          } catch (err: any) {
            console.warn('[cartManager] Server removeItem error:', err?.message);
            try {
              const rollbackCart = await cartApi.getCart();
              if (rollbackCart && isCurrentSessionValid(requestEpoch, requestUserId)) {
                dispatch(setServerCart(rollbackCart));
              }
            } catch {}
          }
        }
      }, 320);
      return;
    }

    // nextQty > 0
    pendingTargetQuantities[productId] = nextQty;
    dispatch(updateItemQuantity({ id: productId, quantity: nextQty }));

    debounceTimers[productId] = setTimeout(async () => {
      const finalQty = pendingTargetQuantities[productId];
      delete pendingTargetQuantities[productId];
      delete debounceTimers[productId];

      if (authStore.isAuthenticated() && finalQty != null) {
        const requestEpoch = currentSessionEpoch;
        const requestUserId = authStore.getUser()?.id;
        try {
          const cartItemId = cartItem?.cartItemId || (cartItem as any)?.id;
          if (cartItemId) {
            await cartApi.updateCartItem(cartItemId, finalQty);
          } else {
            await cartApi.addToCart({ productId, quantity: finalQty });
          }
          const liveCart = await cartApi.getCart();
          if (liveCart && isCurrentSessionValid(requestEpoch, requestUserId)) {
            dispatch(setServerCart(liveCart));
          }
        } catch (err: any) {
          console.warn('[cartManager] Server decrement error:', err?.message);
          try {
            const rollbackCart = await cartApi.getCart();
            if (rollbackCart && isCurrentSessionValid(requestEpoch, requestUserId)) {
              dispatch(setServerCart(rollbackCart));
            }
          } catch {}
        }
      }
    }, 320);
  },

  /**
   * Set explicit quantity (e.g. from TextInput in Product Details)
   */
  async setQuantity(
    dispatch: AppDispatch,
    product: ApiProduct | any,
    targetQty: number,
    cartItem?: any,
    moq: number = 1,
    navigation?: any,
    returnScreen?: string,
    returnParams?: any
  ) {
    const productId = getProductId(product);
    if (!productId) return;

    if (!authStore.isAuthenticated()) {
      dispatch(showAuthModal({ product, quantity: targetQty, returnScreen, returnParams }));
      return;
    }

    const safeQty = Math.max(0, targetQty);

    if (debounceTimers[productId]) {
      clearTimeout(debounceTimers[productId]);
    }

    if (safeQty <= 0) {
      delete pendingTargetQuantities[productId];
      dispatch(removeItem(productId));

      debounceTimers[productId] = setTimeout(async () => {
        delete debounceTimers[productId];
        if (authStore.isAuthenticated()) {
          const requestEpoch = currentSessionEpoch;
          const requestUserId = authStore.getUser()?.id;
          try {
            const cartItemId = cartItem?.cartItemId || (cartItem as any)?.id;
            if (cartItemId) {
              await cartApi.removeCartItem(cartItemId);
            }
            const liveCart = await cartApi.getCart();
            if (liveCart && isCurrentSessionValid(requestEpoch, requestUserId)) {
              dispatch(setServerCart(liveCart));
            }
          } catch (err: any) {}
        }
      }, 320);
      return;
    }

    pendingTargetQuantities[productId] = safeQty;
    dispatch(updateItemQuantity({ id: productId, quantity: safeQty }));

    debounceTimers[productId] = setTimeout(async () => {
      const finalQty = pendingTargetQuantities[productId];
      delete pendingTargetQuantities[productId];
      delete debounceTimers[productId];

      if (authStore.isAuthenticated() && finalQty != null) {
        const requestEpoch = currentSessionEpoch;
        const requestUserId = authStore.getUser()?.id;
        try {
          const cartItemId = cartItem?.cartItemId || (cartItem as any)?.id;
          if (cartItemId) {
            await cartApi.updateCartItem(cartItemId, finalQty);
          } else {
            await cartApi.addToCart({ productId, quantity: finalQty });
          }
          const liveCart = await cartApi.getCart();
          if (liveCart && isCurrentSessionValid(requestEpoch, requestUserId)) {
            dispatch(setServerCart(liveCart));
          }
        } catch (err: any) {}
      }
    }, 320);
  },
};
