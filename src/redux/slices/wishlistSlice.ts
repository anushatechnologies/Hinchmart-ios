/**
 * HINCH MART — Wishlist Redux Slice
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WishlistToast {
  visible: boolean;
  productName: string;
}

interface WishlistState {
  productIds: string[];
  toast: WishlistToast;
}

const DEFAULT_TOAST: WishlistToast = Object.freeze({ visible: false, productName: '' });

const initialState: WishlistState = {
  productIds: [],
  toast: DEFAULT_TOAST,
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    toggleWishlist: (state, action: PayloadAction<string>) => {
      if (!Array.isArray(state.productIds)) {
        state.productIds = [];
      }
      const index = state.productIds.indexOf(action.payload);
      if (index >= 0) {
        state.productIds.splice(index, 1);
      } else {
        state.productIds.push(action.payload);
      }
    },
    setWishlist: (state, action: PayloadAction<string[]>) => {
      state.productIds = Array.isArray(action.payload) ? action.payload : [];
    },
    clearWishlist: (state) => {
      state.productIds = [];
    },
    showWishlistToast: (state, action: PayloadAction<{ productName: string }>) => {
      state.toast = { visible: true, productName: action.payload?.productName || '' };
    },
    hideWishlistToast: (state) => {
      state.toast = DEFAULT_TOAST;
    },
  },
});

export const {
  toggleWishlist,
  setWishlist,
  clearWishlist,
  showWishlistToast,
  hideWishlistToast,
} = wishlistSlice.actions;

export const selectIsWishlisted = (productId: string) => (state: any) =>
  Array.isArray(state?.wishlist?.productIds) ? state.wishlist.productIds.includes(productId) : false;
export const selectWishlistCount = (state: any) =>
  Array.isArray(state?.wishlist?.productIds) ? state.wishlist.productIds.length : 0;
export const selectWishlistToast = (state: any) =>
  state?.wishlist?.toast || DEFAULT_TOAST;

export default wishlistSlice.reducer;
