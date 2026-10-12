/**
 * HINCH MART — Cart Redux Slice
 * Server-authoritative: Redux is an in-memory UI cache of the backend database cart.
 * All mutations go through the server first; Redux is updated with the server response.
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CartItem, BackendCart, BackendCartItem } from '../../types/cart.types';

interface AddedToast {
  visible: boolean;
  productName: string;
  itemTitle?: string;
  productImage?: string;
  price: number;
  itemPrice?: number;
  quantity: number;
}

export interface CartAuthModalState {
  visible: boolean;
  product?: any;
  quantity?: number;
  variantId?: string | null;
  storeId?: number | string | null;
  returnScreen?: string;
  returnParams?: any;
}

interface CartState {
  userId: string | number | null;
  items: CartItem[];
  storeId: number | null;
  storeName: string | null;
  storeSlug: string | null;
  couponCode: string | null;
  couponDiscount: number;
  useWallet: boolean;
  addedToast: AddedToast | null;
  authModal: CartAuthModalState | null;
  /** Server-computed totals cached locally */
  serverSubtotal: number;
  serverTotalGst: number;
  serverDeliveryCharge: number;
  serverGrandTotal: number;
}

const initialState: CartState = {
  userId: null,
  items: [],
  storeId: null,
  storeName: null,
  storeSlug: null,
  couponCode: null,
  couponDiscount: 0,
  useWallet: false,
  addedToast: null,
  authModal: null,
  serverSubtotal: 0,
  serverTotalGst: 0,
  serverDeliveryCharge: 0,
  serverGrandTotal: 0,
};

/**
 * Map a BackendCartItem into the Redux CartItem shape.
 */
function mapBackendItem(bi: BackendCartItem): CartItem {
  const pId = String(bi.productId || (bi as any)?.id || '');
  const prodObj = (bi as any)?.product;
  const title =
    bi.title ||
    bi.productName ||
    (bi as any)?.name ||
    prodObj?.title ||
    prodObj?.name ||
    'Product';
  const img =
    bi.imageUrl ||
    (bi as any)?.image ||
    (bi as any)?.productImage ||
    prodObj?.imageUrl ||
    prodObj?.image ||
    prodObj?.images?.[0] ||
    '';
  const price = Number(bi.unitPrice ?? (bi as any)?.price ?? prodObj?.price ?? 0);
  const qty = Number(bi.quantity || 1);
  const lineTotal = Number(bi.lineTotal ?? (bi as any)?.totalPrice ?? (price * qty));
  const cartItemId = bi.cartItemId ?? (bi as any)?.id ?? pId;

  return {
    id: String(cartItemId),
    productId: pId,
    product: {
      ...(typeof prodObj === 'object' && prodObj ? prodObj : {}),
      id: pId,
      name: title,
      title: title,
      price: price,
      image: img,
      imageUrl: img,
      images: img ? [img] : [],
      unit: bi.unit || prodObj?.unit || 'pcs',
    } as any,
    name: title,
    title: title,
    image: img,
    imageUrl: img,
    variantId: null,
    variant: null,
    quantity: qty,
    unitPrice: price,
    totalPrice: lineTotal,
    appliedTier: bi.appliedTier,
    gstRate: bi.gstRate,
    lineGst: bi.lineGst,
    unit: bi.unit || prodObj?.unit || 'pcs',
    originalPrice: bi.originalPrice,
    cartItemId: cartItemId,
  } as CartItem & { cartItemId: string | number };
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    /**
     * Replace the entire Redux cart state with the server BackendCart response.
     * This is the ONLY way cart data should enter Redux after any server mutation.
     */
    setServerCart: (state, action: PayloadAction<BackendCart & { userId?: string | number }>) => {
      const cart = action.payload || ({} as any);
      const incomingUserId = (cart as any)?.userId;
      if (incomingUserId !== undefined && state.userId !== null && String(incomingUserId) !== String(state.userId)) {
        // Enforce user-level isolation: clear previous user's cart items
        state.items = [];
      }
      state.userId = incomingUserId ?? state.userId;
      state.items = Array.isArray(cart?.items) ? cart.items.map(mapBackendItem) : [];
      state.storeId = cart?.storeId ?? state.storeId;
      state.storeName = cart?.storeName ?? state.storeName;
      state.storeSlug = cart?.storeSlug ?? state.storeSlug;
      state.couponCode = cart?.appliedCoupon ?? null;
      state.couponDiscount = Number(cart?.couponDiscount || 0);
      state.serverSubtotal = Number(cart?.subtotal || 0);
      state.serverTotalGst = Number(cart?.totalGst || 0);
      state.serverDeliveryCharge = Number(cart?.deliveryCharge || 0);
      state.serverGrandTotal = Number(cart?.grandTotal || 0);
    },

    showAuthModal: (
      state,
      action: PayloadAction<{
        product?: any;
        quantity?: number;
        variantId?: string | null;
        storeId?: number | string | null;
        returnScreen?: string;
        returnParams?: any;
      }>
    ) => {
      state.authModal = {
        visible: true,
        product: action.payload.product,
        quantity: action.payload.quantity ?? 1,
        variantId: action.payload.variantId ?? null,
        storeId: action.payload.storeId ?? null,
        returnScreen: action.payload.returnScreen,
        returnParams: action.payload.returnParams,
      };
    },

    hideAuthModal: (state) => {
      state.authModal = null;
    },

    setCartItems: (state, action: PayloadAction<CartItem[]>) => {
      state.items = Array.isArray(action.payload) ? action.payload : [];
    },

    /**
     * Optimistic local add (for guest mode only — when user is not authenticated).
     * Authenticated flows should call the server and then dispatch setServerCart.
     */
    addItem: (state, action: PayloadAction<CartItem>) => {
      if (!Array.isArray(state.items)) {
        state.items = [];
      }
      const existing = state.items.find(
        (i) => i.productId === action.payload.productId && i.variantId === action.payload.variantId
      );
      const qty = action.payload.quantity || 1;
      const unitPrice = action.payload.unitPrice || 0;
      const itemName = action.payload?.product?.name || (action.payload as any)?.name || 'Item';
      const itemImg =
        (action.payload?.product as any)?.image ||
        action.payload?.product?.images?.[0] ||
        (action.payload as any)?.image ||
        '';

      if (existing) {
        existing.quantity += qty;
        existing.totalPrice = existing.quantity * existing.unitPrice;
      } else {
        state.items.push(action.payload);
      }
      // Trigger toast
      state.addedToast = {
        visible: true,
        productName: itemName,
        itemTitle: itemName,
        productImage: itemImg,
        price: unitPrice,
        itemPrice: unitPrice,
        quantity: qty,
      };
    },
    showCartToast: (
      state,
      action: PayloadAction<{
        productName?: string;
        itemTitle?: string;
        productImage?: string;
        price?: number;
        itemPrice?: number;
        quantity?: number;
      }>
    ) => {
      const pName = action.payload.productName || action.payload.itemTitle || 'Item';
      state.addedToast = {
        visible: true,
        productName: pName,
        itemTitle: pName,
        productImage: action.payload.productImage || '',
        price: action.payload.price ?? action.payload.itemPrice ?? 0,
        itemPrice: action.payload.itemPrice ?? action.payload.price ?? 0,
        quantity: action.payload.quantity || 1,
      };
    },
    hideCartToast: (state) => {
      state.addedToast = null;
    },
    updateItemQuantity: (
      state,
      action: PayloadAction<{ id: string; quantity: number }>
    ) => {
      if (!Array.isArray(state.items)) return;
      const targetId = String(action.payload.id);
      const cleanTargetId = targetId.replace(/_default$/, '');
      const item = state.items.find(
        (i) =>
          String(i.id) === targetId ||
          String(i.productId) === targetId ||
          String(i.productId) === cleanTargetId ||
          String(i.id) === `${cleanTargetId}_default`
      );
      if (item) {
        if (action.payload.quantity <= 0) {
          state.items = state.items.filter((i) => i !== item);
        } else {
          item.quantity = action.payload.quantity;
          item.totalPrice = item.quantity * item.unitPrice;
        }
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      if (!Array.isArray(state.items)) return;
      const targetId = String(action.payload);
      const cleanTargetId = targetId.replace(/_default$/, '');
      state.items = state.items.filter(
        (i) =>
          String(i.id) !== targetId &&
          String(i.productId) !== targetId &&
          String(i.productId) !== cleanTargetId &&
          String(i.id) !== `${cleanTargetId}_default`
      );
    },
    setStoreInfo: (
      state,
      action: PayloadAction<{ storeId: number; storeName?: string; storeSlug?: string }>
    ) => {
      state.storeId = action.payload.storeId;
      state.storeName = action.payload.storeName || null;
      state.storeSlug = action.payload.storeSlug || null;
    },
    switchStore: (
      state,
      action: PayloadAction<{ storeId: number; storeName?: string; storeSlug?: string }>
    ) => {
      state.items = [];
      state.storeId = action.payload.storeId;
      state.storeName = action.payload.storeName || null;
      state.storeSlug = action.payload.storeSlug || null;
      state.couponCode = null;
      state.couponDiscount = 0;
      state.addedToast = null;
    },
    clearCart: () => {
      return initialState;
    },
    setCoupon: (state, action: PayloadAction<{ code: string; discount: number }>) => {
      state.couponCode = action.payload.code;
      state.couponDiscount = action.payload.discount;
    },
    removeCoupon: (state) => {
      state.couponCode = null;
      state.couponDiscount = 0;
    },
    setUseWallet: (state, action: PayloadAction<boolean>) => {
      state.useWallet = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Guarantee that transient UI states (authModal and addedToast) are never restored on app reload/rehydration
      .addCase('persist/REHYDRATE', (state, action: any) => {
        if (action.payload?.cart) {
          return {
            ...state,
            ...action.payload.cart,
            authModal: null,
            addedToast: null,
          };
        }
        return state;
      })
      // Automatically reset cart state whenever any logout action fires
      .addCase('auth/logout', () => initialState);
  },
});

export const {
  setServerCart,
  setCartItems,
  addItem,
  showCartToast,
  hideCartToast,
  showAuthModal,
  hideAuthModal,
  updateItemQuantity,
  removeItem,
  clearCart,
  setCoupon,
  removeCoupon,
  setUseWallet,
  setStoreInfo,
  switchStore,
} = cartSlice.actions;

// Stable reference for empty fallback
const EMPTY_CART_ITEMS: any[] = [];

// Selectors
export const selectCartItems = (state: any) =>
  Array.isArray(state?.cart?.items) ? state.cart.items : EMPTY_CART_ITEMS;
export const selectCartStore = (state: any) => ({
  storeId: state?.cart?.storeId ?? null,
  storeName: state?.cart?.storeName ?? null,
  storeSlug: state?.cart?.storeSlug ?? null,
});
export const selectCartUserId = (state: any) => state?.cart?.userId ?? null;
export const selectCartItemCount = (state: any) =>
  (Array.isArray(state?.cart?.items) ? state.cart.items : EMPTY_CART_ITEMS).reduce(
    (sum: number, item: any) => sum + (item?.quantity || 0),
    0
  );
export const selectCartBadgeCount = selectCartItemCount;
export const selectCartSubtotal = (state: any) =>
  (Array.isArray(state?.cart?.items) ? state.cart.items : EMPTY_CART_ITEMS).reduce(
    (sum: number, item: any) => sum + (item?.totalPrice || 0),
    0
  );
export const selectCartToast = (state: any) => state?.cart?.addedToast || null;
export const selectAuthModal = (state: any): CartAuthModalState | null =>
  state?.cart?.authModal || null;
export const selectServerTotals = (state: any) => ({
  subtotal: state?.cart?.serverSubtotal ?? 0,
  totalGst: state?.cart?.serverTotalGst ?? 0,
  deliveryCharge: state?.cart?.serverDeliveryCharge ?? 0,
  grandTotal: state?.cart?.serverGrandTotal ?? 0,
  couponDiscount: state?.cart?.couponDiscount ?? 0,
  couponCode: state?.cart?.couponCode ?? null,
});

/**
 * Select cart item by product ID (handles matching by id, productId, and _default suffix)
 */
export const selectCartItemByProductId = (productId: string | number) => (state: any) => {
  if (!Array.isArray(state?.cart?.items) || !productId) return undefined;
  const pId = String(productId);
  const cleanId = pId.replace(/_default$/, '');
  return state.cart.items.find((item: any) => {
    if (!item) return false;
    const itemPid = String(item.productId || '');
    const itemId = String(item.id || '');
    return (
      itemPid === pId ||
      itemId === pId ||
      itemPid === cleanId ||
      itemId === cleanId ||
      itemId === `${cleanId}_default` ||
      itemId.startsWith(`${cleanId}_`)
    );
  });
};

/**
 * Select cart quantity by product ID
 */
export const selectCartQuantityByProductId = (productId: string | number) => (state: any): number => {
  const item = selectCartItemByProductId(productId)(state);
  return Number(item?.quantity) || 0;
};

/**
 * Memoized dictionary selector of { [productId]: quantity }
 * Used by ProductListScreen and SubcategoriesScreen for O(1) card lookups
 */
export const selectCartQuantityMap = (state: any): Record<string, number> => {
  const map: Record<string, number> = {};
  if (!Array.isArray(state?.cart?.items)) return map;
  for (const item of state.cart.items) {
    if (!item) continue;
    const qty = Number(item.quantity) || 0;
    if (item.productId != null) {
      const pid = String(item.productId);
      const cleanPid = pid.replace(/_default$/, '');
      map[pid] = qty;
      map[cleanPid] = qty;
    }
    if (item.id != null) {
      const id = String(item.id);
      const cleanId = id.replace(/_default$/, '');
      map[id] = qty;
      map[cleanId] = qty;
    }
  }
  return map;
};

export default cartSlice.reducer;
