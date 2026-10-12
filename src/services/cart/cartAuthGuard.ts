/**
 * HINCH MART — Add-to-Cart Authentication Guard & Pending Action Store
 * 
 * Manages:
 * - Temporary pending Add to Cart action when a guest taps Add to Cart
 * - Safe persistence in MMKV so action survives app reload or navigation to Login/Register
 * - Concurrency-safe, exactly-once execution after authentication is confirmed
 * - Cancellation and cleanup
 */
import { mmkvStorage } from '../storage/mmkv';
import { authStore } from '../../store/authStore';
import { AppDispatch } from '../../redux/store';
import { BackendCart } from '../../types/cart.types';

export interface PendingCartAction {
  product: any;
  productId: string;
  quantity: number;
  variantId?: string | null;
  storeId?: number | string | null;
  sourceScreen?: string;
  sourceParams?: any;
  timestamp: number;
}

const STORAGE_KEY_PENDING_ACTION = 'hinchmart_pending_add_to_cart_action';

// In-memory cache for ultra-fast access
let memoryPendingAction: PendingCartAction | null = null;
let isExecuting = false;

export const cartAuthGuard = {
  /**
   * Save the intended add-to-cart action for a guest user
   */
  savePendingAction(action: {
    product: any;
    productId: string | number;
    quantity?: number;
    variantId?: string | null;
    storeId?: number | string | null;
    sourceScreen?: string;
    sourceParams?: any;
  }): void {
    const payload: PendingCartAction = {
      product: action.product,
      productId: String(action.productId || action.product?.id || action.product?.productId || ''),
      quantity: Math.max(1, Number(action.quantity || 1)),
      variantId: action.variantId || null,
      storeId: action.storeId || (action.product as any)?.storeId || null,
      sourceScreen: action.sourceScreen,
      sourceParams: action.sourceParams,
      timestamp: Date.now(),
    };

    memoryPendingAction = payload;
    try {
      mmkvStorage.setString(STORAGE_KEY_PENDING_ACTION, JSON.stringify(payload));
    } catch (err) {
      console.warn('[cartAuthGuard] Failed to persist pending cart action:', err);
    }
  },

  /**
   * Retrieve the pending action if available and not expired (valid for 30 minutes)
   */
  getPendingAction(): PendingCartAction | null {
    if (memoryPendingAction) {
      if (Date.now() - memoryPendingAction.timestamp < 30 * 60 * 1000) {
        return memoryPendingAction;
      }
      cartAuthGuard.clearPendingAction();
      return null;
    }

    try {
      const raw = mmkvStorage.getString(STORAGE_KEY_PENDING_ACTION);
      if (!raw) return null;
      const parsed: PendingCartAction = JSON.parse(raw);
      if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
        memoryPendingAction = parsed;
        return parsed;
      }
      cartAuthGuard.clearPendingAction();
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Check if a pending action is waiting
   */
  hasPendingAction(): boolean {
    return cartAuthGuard.getPendingAction() !== null;
  },

  /**
   * Clear the pending action (called when cancelled or executed)
   */
  clearPendingAction(): void {
    memoryPendingAction = null;
    try {
      mmkvStorage.remove(STORAGE_KEY_PENDING_ACTION);
    } catch {}
  },

  /**
   * Cancel the pending action alias
   */
  cancelPendingAction(): void {
    this.clearPendingAction();
  },

  /**
   * Execute the pending add-to-cart action once authentication is confirmed.
   * Atomically clears the pending action so it NEVER runs more than once.
   */
  async executePendingAction(dispatch: AppDispatch): Promise<{
    success: boolean;
    cart?: BackendCart;
    error?: string;
  }> {
    if (isExecuting) {
      return { success: false, error: 'Pending action is already executing' };
    }

    const pending = cartAuthGuard.getPendingAction();
    if (!pending) {
      return { success: false, error: 'No pending cart action found' };
    }

    if (!authStore.isAuthenticated()) {
      return { success: false, error: 'User is not authenticated' };
    }

    // Atomically clear so duplicate calls cannot re-trigger
    isExecuting = true;
    cartAuthGuard.clearPendingAction();

    try {
      // Lazy load cartManager to avoid circular dependency
      const { cartManager } = require('./cartManager');
      const result = await cartManager.addToCart(
        dispatch,
        pending.product,
        pending.quantity,
        pending.storeId
      );
      return result;
    } catch (err: any) {
      console.warn('[cartAuthGuard] executePendingAction error:', err?.message);
      return { success: false, error: err?.message || 'Failed to complete add to cart' };
    } finally {
      isExecuting = false;
    }
  },
};
