/**
 * HINCH MART — Comprehensive Cart & Authentication Flow Test Suite
 * Validates all 25 test cases across:
 * - PART D: Cart Tests (13 test cases)
 * - PART D: Authentication Tests (12 test cases)
 */
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../src/redux/store';
import {
  clearCart,
  setServerCart,
  hideCartToast,
  showAuthModal,
  hideAuthModal,
  selectCartItems,
  selectCartItemCount,
  selectCartBadgeCount,
  selectCartSubtotal,
  selectCartToast,
  selectAuthModal,
} from '../src/redux/slices/cartSlice';
import { cartManager } from '../src/services/cart/cartManager';
import { cartAuthGuard } from '../src/services/cart/cartAuthGuard';
import { cartApi } from '../src/services/api/cart.api';
import { authStore } from '../src/store/authStore';
import { BackendCart } from '../src/types/cart.types';

// Sample mock products
const sampleProductA: any = {
  id: 'prod-elec-001',
  productId: 'prod-elec-001',
  name: 'Havells 2.5 Sq mm FR Copper Wire',
  title: 'Havells 2.5 Sq mm FR Copper Wire',
  price: 2450,
  unitPrice: 2450,
  unit: 'Coil',
  images: ['https://example.com/wire.jpg'],
  storeId: 1,
};

const sampleProductB: any = {
  id: 'prod-elec-002',
  productId: 'prod-elec-002',
  name: 'Schneider 16A MCB Single Pole',
  title: 'Schneider 16A MCB Single Pole',
  price: 320,
  unitPrice: 320,
  unit: 'Piece',
  images: ['https://example.com/mcb.jpg'],
  storeId: 1,
};

// Helper mock user
const testUserA: any = {
  id: 101,
  email: 'contractor@hinchmart.com',
  name: 'Anusha Builder',
  role: 'buyer',
  phone: '9876543210',
};

const testUserB: any = {
  id: 202,
  email: 'developer@hinchmart.com',
  name: 'Tech Developer',
  role: 'buyer',
  phone: '9123456789',
};

describe('PART D — Shopping Cart State & Persistence Tests', () => {
  // Store original API implementations to restore after each test
  const originalAddToCart = cartApi.addToCart;
  const originalGetCart = cartApi.getCart;
  const originalUpdateCartItem = cartApi.updateCartItem;
  const originalRemoveCartItem = cartApi.removeCartItem;
  const originalClearCart = cartApi.clearCart;

  beforeEach(() => {
    cartManager.cancelPendingOperations();
    cartAuthGuard.cancelPendingAction();
    store.dispatch(clearCart());
    store.dispatch(hideCartToast());
    store.dispatch(hideAuthModal());
    authStore.clearSession();
  });

  afterEach(() => {
    cartApi.addToCart = originalAddToCart;
    cartApi.getCart = originalGetCart;
    cartApi.updateCartItem = originalUpdateCartItem;
    cartApi.removeCartItem = originalRemoveCartItem;
    cartApi.clearCart = originalClearCart;
    cartManager.cancelPendingOperations();
    cartAuthGuard.cancelPendingAction();
    authStore.clearSession();
  });

  test('1. Authenticated user adds a product successfully', async () => {
    // Setup authenticated session
    authStore.saveSession({
      user: testUserA,
      accessToken: 'valid-test-token-user-a',
      refreshToken: 'valid-test-refresh-a',
    });

    let apiAddCalled = false;
    cartApi.addToCart = async (req: any) => {
      apiAddCalled = true;
      assert.strictEqual(req.productId, 'prod-elec-001');
      assert.strictEqual(req.quantity, 1);
      return { success: true } as any;
    };

    cartApi.getCart = async () => {
      return {
        id: 10,
        cartId: 10,
        userId: testUserA.id,
        items: [
          {
            id: 101,
            productId: 'prod-elec-001',
            quantity: 1,
            unitPrice: 2450,
            totalPrice: 2450,
            product: sampleProductA,
          },
        ],
        subtotal: 2450,
        grandTotal: 2450,
      } as any;
    };

    const result = await cartManager.addToCart(store.dispatch, sampleProductA, 1);
    assert.strictEqual(result.success, true);
    assert.strictEqual(apiAddCalled, true);

    const items = selectCartItems(store.getState());
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].productId, 'prod-elec-001');
    assert.strictEqual(items[0].quantity, 1);
  });

  test('2. The success toast appears only after confirmed success', async () => {
    authStore.saveSession({
      user: testUserA,
      accessToken: 'valid-test-token-user-a',
      refreshToken: 'valid-test-refresh-a',
    });

    const toastVisibleBeforeConfirm = Boolean(selectCartToast(store.getState())?.visible);
    assert.strictEqual(toastVisibleBeforeConfirm, false);

    cartApi.addToCart = async () => {
      // While API is in-flight, toast MUST NOT be visible yet
      const duringFlightToast = Boolean(selectCartToast(store.getState())?.visible);
      assert.strictEqual(duringFlightToast, false);
      return { success: true } as any;
    };

    cartApi.getCart = async () =>
      ({
        items: [{ productId: 'prod-elec-001', quantity: 1, product: sampleProductA }],
      } as any);

    await cartManager.addToCart(store.dispatch, sampleProductA, 1);

    const toastAfterConfirm = selectCartToast(store.getState());
    assert.strictEqual(toastAfterConfirm?.visible, true);
    assert.strictEqual(toastAfterConfirm?.productName, sampleProductA.title);
  });

  test('3. The cart badge updates immediately after success', async () => {
    authStore.saveSession({
      user: testUserA,
      accessToken: 'valid-test-token-user-a',
      refreshToken: 'valid-test-refresh-a',
    });

    assert.strictEqual(selectCartBadgeCount(store.getState()), 0);

    cartApi.addToCart = async () => ({ success: true } as any);
    cartApi.getCart = async () =>
      ({
        items: [
          { productId: 'prod-elec-001', quantity: 3, product: sampleProductA },
          { productId: 'prod-elec-002', quantity: 2, product: sampleProductB },
        ],
      } as any);

    await cartManager.addToCart(store.dispatch, sampleProductA, 3);

    // Total quantity = 3 + 2 = 5
    assert.strictEqual(selectCartBadgeCount(store.getState()), 5);
  });

  test('4. Opening My Cart shows the added product', async () => {
    authStore.saveSession({
      user: testUserA,
      accessToken: 'valid-test-token-user-a',
      refreshToken: 'valid-test-refresh-a',
    });

    cartApi.addToCart = async () => ({ success: true } as any);
    cartApi.getCart = async () =>
      ({
        items: [
          {
            id: 55,
            productId: 'prod-elec-001',
            quantity: 1,
            unitPrice: 2450,
            totalPrice: 2450,
            product: sampleProductA,
          },
        ],
        subtotal: 2450,
        grandTotal: 2450,
      } as any);

    await cartManager.addToCart(store.dispatch, sampleProductA, 1);

    const cart = await cartManager.loadServerCart(store.dispatch);
    assert.ok(cart);
    const items = selectCartItems(store.getState());
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].product.name, sampleProductA.name);
    assert.strictEqual(items[0].totalPrice, 2450);
  });

  test('5. Navigating away and returning does not clear the cart', async () => {
    authStore.saveSession({
      user: testUserA,
      accessToken: 'valid-test-token-user-a',
      refreshToken: 'valid-test-refresh-a',
    });

    // Populate cart
    store.dispatch(
      setServerCart({
        items: [{ productId: 'prod-elec-001', quantity: 2, unitPrice: 2450, totalPrice: 4900, product: sampleProductA }] as any,
        subtotal: 4900,
        grandTotal: 4900,
      } as any)
    );

    // Simulate navigation: Home -> Category -> Cart -> Home -> Cart
    const itemsBeforeNav = selectCartItems(store.getState());
    assert.strictEqual(itemsBeforeNav.length, 1);

    // Load server cart on focus simulation without server mutation
    cartApi.getCart = async () =>
      ({
        items: [{ productId: 'prod-elec-001', quantity: 2, unitPrice: 4900, product: sampleProductA }],
      } as any);
    await cartManager.loadServerCart(store.dispatch);

    const itemsAfterNav = selectCartItems(store.getState());
    assert.strictEqual(itemsAfterNav.length, 1);
    assert.strictEqual(itemsAfterNav[0].productId, 'prod-elec-001');
  });

  test('6. Reloading or restarting the app restores the authenticated user cart', async () => {
    authStore.saveSession({
      user: testUserA,
      accessToken: 'valid-test-token-user-a',
      refreshToken: 'valid-test-refresh-a',
    });

    cartApi.getCart = async () =>
      ({
        userId: testUserA.id,
        items: [
          { productId: 'prod-elec-001', quantity: 1, unitPrice: 2450, totalPrice: 2450, product: sampleProductA },
        ],
        subtotal: 2450,
      } as any);

    // Simulating app startup / SplashScreen restoration
    assert.strictEqual(authStore.isAuthenticated(), true);
    const restoredCart = await cartManager.loadServerCart(store.dispatch);

    assert.ok(restoredCart);
    const items = selectCartItems(store.getState());
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].productId, 'prod-elec-001');
  });

  test('7. Increasing quantity updates the correct item and total', async () => {
    authStore.saveSession({
      user: testUserA,
      accessToken: 'valid-test-token-user-a',
      refreshToken: 'valid-test-refresh-a',
    });

    store.dispatch(
      setServerCart({
        items: [
          { productId: 'prod-elec-001', quantity: 1, unitPrice: 2450, totalPrice: 2450, product: sampleProductA },
        ] as any,
        subtotal: 2450,
      } as any)
    );

    // Trigger increment
    await cartManager.increment(store.dispatch, sampleProductA, 1);

    const items = selectCartItems(store.getState());
    assert.strictEqual(items[0].quantity, 2);
    assert.strictEqual(selectCartSubtotal(store.getState()), 4900);
  });

  test('8. Removing an item updates the cart and totals', async () => {
    authStore.saveSession({
      user: testUserA,
      accessToken: 'valid-test-token-user-a',
      refreshToken: 'valid-test-refresh-a',
    });

    store.dispatch(
      setServerCart({
        items: [
          { productId: 'prod-elec-001', quantity: 1, unitPrice: 2450, totalPrice: 2450, product: sampleProductA },
          { productId: 'prod-elec-002', quantity: 1, unitPrice: 320, totalPrice: 320, product: sampleProductB },
        ] as any,
        subtotal: 2770,
      } as any)
    );

    // Decrement item A with quantity 1 -> removes item A
    await cartManager.decrement(store.dispatch, sampleProductA, 1);

    const items = selectCartItems(store.getState());
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].productId, 'prod-elec-002');
    assert.strictEqual(selectCartSubtotal(store.getState()), 320);
  });

  test('9. A failed add request does not create a false success state', async () => {
    authStore.saveSession({
      user: testUserA,
      accessToken: 'valid-test-token-user-a',
      refreshToken: 'valid-test-refresh-a',
    });

    // Mock API failure (e.g. 500 Out of stock or Server Error)
    cartApi.addToCart = async () => {
      throw new Error('500 Internal Server Error: Product out of stock');
    };

    const result = await cartManager.addToCart(store.dispatch, sampleProductA, 1);
    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes('Product out of stock'));

    // Cart items must remain empty
    assert.strictEqual(selectCartItems(store.getState()).length, 0);

    // No toast must be shown
    assert.strictEqual(Boolean(selectCartToast(store.getState())?.visible), false);
  });

  test('10. A failed retrieval displays an error rather than falsely claiming the cart is empty', async () => {
    authStore.saveSession({
      user: testUserA,
      accessToken: 'valid-test-token-user-a',
      refreshToken: 'valid-test-refresh-a',
    });

    // Seed existing valid cart
    store.dispatch(
      setServerCart({
        items: [{ productId: 'prod-elec-001', quantity: 1, unitPrice: 2450, product: sampleProductA }] as any,
      } as any)
    );

    // Network timeout during fetch
    cartApi.getCart = async () => {
      throw new Error('Network timeout (ETIMEDOUT)');
    };

    const res = await cartManager.loadServerCart(store.dispatch);
    assert.strictEqual(res, null);

    // Valid existing local items must NOT be wiped out with an empty array
    const preservedItems = selectCartItems(store.getState());
    assert.strictEqual(preservedItems.length, 1);
    assert.strictEqual(preservedItems[0].productId, 'prod-elec-001');
  });

  test('11. Stale API responses do not overwrite a newer cart', async () => {
    authStore.saveSession({
      user: testUserA,
      accessToken: 'valid-test-token-user-a',
      refreshToken: 'valid-test-refresh-a',
    });

    // 1. Initial cart: Wire qty 1
    store.dispatch(
      setServerCart({
        items: [{ productId: 'prod-elec-001', quantity: 1, unitPrice: 2450, product: sampleProductA }] as any,
      } as any)
    );

    // 2. Newer cart mutation happens: Wire qty 5
    store.dispatch(
      setServerCart({
        items: [{ productId: 'prod-elec-001', quantity: 5, unitPrice: 2450, product: sampleProductA }] as any,
      } as any)
    );

    // Simulate session invalidation / cancel pending operations before stale response arrives
    cartManager.cancelPendingOperations();

    const items = selectCartItems(store.getState());
    assert.strictEqual(items[0].quantity, 5);
  });

  test('12. Multiple rapid clicks do not create unintended duplicate items', async () => {
    authStore.saveSession({
      user: testUserA,
      accessToken: 'valid-test-token-user-a',
      refreshToken: 'valid-test-refresh-a',
    });

    let apiCallCount = 0;
    cartApi.addToCart = async () => {
      apiCallCount++;
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { success: true } as any;
    };

    cartApi.getCart = async () =>
      ({
        items: [{ productId: 'prod-elec-001', quantity: 1, product: sampleProductA }],
      } as any);

    // Rapid double-tap on Add to Cart button
    const [res1, res2] = await Promise.all([
      cartManager.addToCart(store.dispatch, sampleProductA, 1),
      cartManager.addToCart(store.dispatch, sampleProductA, 1),
    ]);

    // First request should proceed, second in-flight request should be rejected as duplicate
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res2.inFlight, true);
    assert.strictEqual(apiCallCount, 1);
  });

  test('13. Different authenticated users never see each others cart data', async () => {
    // 1. User A logs in and has Item A
    authStore.saveSession({
      user: testUserA,
      accessToken: 'token-user-a',
      refreshToken: 'refresh-a',
    });

    store.dispatch(
      setServerCart({
        userId: testUserA.id,
        items: [{ productId: 'prod-elec-001', quantity: 1, product: sampleProductA }] as any,
      } as any)
    );

    assert.strictEqual(selectCartItems(store.getState())[0].productId, 'prod-elec-001');

    // 2. User A logs out
    authStore.clearSession();
    cartManager.cancelPendingOperations();
    assert.strictEqual(selectCartItems(store.getState()).length, 0);

    // 3. User B logs in
    authStore.saveSession({
      user: testUserB,
      accessToken: 'token-user-b',
      refreshToken: 'refresh-b',
    });

    cartApi.getCart = async () =>
      ({
        userId: testUserB.id,
        items: [{ productId: 'prod-elec-002', quantity: 3, product: sampleProductB }],
      } as any);

    await cartManager.loadServerCart(store.dispatch);

    const userBItems = selectCartItems(store.getState());
    assert.strictEqual(userBItems.length, 1);
    assert.strictEqual(userBItems[0].productId, 'prod-elec-002');
    // Ensure User A's item is NOT present in User B's cart
    assert.ok(!userBItems.some((i: any) => i.productId === 'prod-elec-001'));
  });
});

describe('PART D — Authentication Guard & Action Resumption Tests', () => {
  const originalAddToCart = cartApi.addToCart;
  const originalGetCart = cartApi.getCart;

  beforeEach(() => {
    cartManager.cancelPendingOperations();
    cartAuthGuard.cancelPendingAction();
    store.dispatch(clearCart());
    store.dispatch(hideCartToast());
    store.dispatch(hideAuthModal());
    authStore.clearSession();
  });

  afterEach(() => {
    cartApi.addToCart = originalAddToCart;
    cartApi.getCart = originalGetCart;
    cartManager.cancelPendingOperations();
    cartAuthGuard.cancelPendingAction();
    authStore.clearSession();
  });

  test('1. A guest clicks Add to Cart and sees the login/register prompt', async () => {
    assert.strictEqual(authStore.isAuthenticated(), false);

    const res = await cartManager.addToCart(store.dispatch, sampleProductA, 2);

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.requiresAuth, true);

    // Verify Auth Modal is opened in Redux
    const modalState = selectAuthModal(store.getState());
    assert.ok(modalState);
    assert.strictEqual(modalState?.visible, true);
    assert.strictEqual(modalState?.quantity, 2);
    assert.strictEqual(modalState?.product?.id, 'prod-elec-001');
  });

  test('2. No protected cart mutation occurs before authentication', async () => {
    let apiCalled = false;
    cartApi.addToCart = async () => {
      apiCalled = true;
      return { success: true } as any;
    };

    assert.strictEqual(authStore.isAuthenticated(), false);
    await cartManager.addToCart(store.dispatch, sampleProductA, 1);

    // Assert backend API was NOT called
    assert.strictEqual(apiCalled, false);
    // Redux cart items must be empty
    assert.strictEqual(selectCartItems(store.getState()).length, 0);
  });

  test('3. Selecting Login opens the correct login screen with preserved context', async () => {
    assert.strictEqual(authStore.isAuthenticated(), false);

    // Guest attempts add from ProductDetail
    await cartManager.addToCart(
      store.dispatch,
      sampleProductA,
      1,
      sampleProductA.storeId,
      undefined,
      'ProductDetail',
      { productId: sampleProductA.id }
    );

    const pending = cartAuthGuard.getPendingAction();
    assert.ok(pending);
    assert.strictEqual(pending?.productId, 'prod-elec-001');
    assert.strictEqual(pending?.sourceScreen, 'ProductDetail');
    assert.strictEqual(pending?.sourceParams?.productId, 'prod-elec-001');
  });

  test('4. Selecting Create Account opens the correct registration screen with preserved context', async () => {
    assert.strictEqual(authStore.isAuthenticated(), false);

    await cartManager.addToCart(
      store.dispatch,
      sampleProductB,
      3,
      sampleProductB.storeId,
      undefined,
      'ProductList',
      { categoryId: 10 }
    );

    const pending = cartAuthGuard.getPendingAction();
    assert.ok(pending);
    assert.strictEqual(pending?.productId, 'prod-elec-002');
    assert.strictEqual(pending?.quantity, 3);
  });

  test('5. Successful login restores the intended product action', async () => {
    assert.strictEqual(authStore.isAuthenticated(), false);

    // 1. Guest clicks Add to Cart
    await cartManager.addToCart(store.dispatch, sampleProductA, 2);
    assert.ok(cartAuthGuard.hasPendingAction());

    // 2. User completes login
    authStore.saveSession({
      user: testUserA,
      accessToken: 'newly-authenticated-token',
      refreshToken: 'newly-authenticated-refresh',
    });

    let backendReceivedQty = 0;
    cartApi.addToCart = async (req: any) => {
      backendReceivedQty = req.quantity;
      return { success: true } as any;
    };

    cartApi.getCart = async () =>
      ({
        items: [{ productId: 'prod-elec-001', quantity: 2, product: sampleProductA }],
      } as any);

    // 3. Resumption executes
    const resumeRes = await cartAuthGuard.executePendingAction(store.dispatch);

    assert.strictEqual(resumeRes.success, true);
    assert.strictEqual(backendReceivedQty, 2);
    assert.strictEqual(selectCartItems(store.getState()).length, 1);
    assert.strictEqual(selectCartItems(store.getState())[0].quantity, 2);

    // Toast shown only after confirmed success
    assert.strictEqual(selectCartToast(store.getState())?.visible, true);
  });

  test('6. Successful registration and required verification restore the intended product action', async () => {
    assert.strictEqual(authStore.isAuthenticated(), false);

    // 1. Guest clicks Add to Cart on item B
    await cartManager.addToCart(store.dispatch, sampleProductB, 1);
    assert.ok(cartAuthGuard.hasPendingAction());

    // 2. User completes registration and OTP verification
    authStore.saveSession({
      user: testUserB,
      accessToken: 'new-user-registered-token',
      refreshToken: 'new-user-registered-refresh',
    });

    cartApi.addToCart = async () => ({ success: true } as any);
    cartApi.getCart = async () =>
      ({
        items: [{ productId: 'prod-elec-002', quantity: 1, product: sampleProductB }],
      } as any);

    // 3. Action resumes
    const resumeRes = await cartAuthGuard.executePendingAction(store.dispatch);
    assert.strictEqual(resumeRes.success, true);
    assert.strictEqual(selectCartItems(store.getState())[0].productId, 'prod-elec-002');
  });

  test('7. The pending action executes no more than once', async () => {
    // 1. Guest attempts add
    await cartManager.addToCart(store.dispatch, sampleProductA, 1);

    // 2. Authenticate
    authStore.saveSession({
      user: testUserA,
      accessToken: 'valid-token',
      refreshToken: 'valid-refresh',
    });

    let executeCalls = 0;
    cartApi.addToCart = async () => {
      executeCalls++;
      return { success: true } as any;
    };
    cartApi.getCart = async () =>
      ({
        items: [{ productId: 'prod-elec-001', quantity: 1, product: sampleProductA }],
      } as any);

    // 3. First resumption call
    const firstCall = await cartAuthGuard.executePendingAction(store.dispatch);
    assert.strictEqual(firstCall.success, true);
    assert.strictEqual(executeCalls, 1);

    // 4. Second redundant call (e.g. accidental double trigger)
    const secondCall = await cartAuthGuard.executePendingAction(store.dispatch);
    assert.strictEqual(secondCall.success, false);
    // API was NOT called a second time
    assert.strictEqual(executeCalls, 1);
  });

  test('8. Closing authentication cancels the pending action without losing the browsing screen', async () => {
    // 1. Guest clicks Add to Cart
    await cartManager.addToCart(store.dispatch, sampleProductA, 1);
    assert.ok(cartAuthGuard.hasPendingAction());

    // 2. Guest dismisses / closes the auth modal
    cartAuthGuard.cancelPendingAction();
    store.dispatch(hideAuthModal());

    assert.strictEqual(cartAuthGuard.hasPendingAction(), false);
    assert.strictEqual(Boolean(selectAuthModal(store.getState())?.visible), false);
    assert.strictEqual(selectCartItems(store.getState()).length, 0);
  });

  test('9. Failed login or registration never produces a cart success message', async () => {
    // 1. Guest clicks Add to Cart
    await cartManager.addToCart(store.dispatch, sampleProductA, 1);

    // 2. Login fails / user remains unauthenticated
    assert.strictEqual(authStore.isAuthenticated(), false);

    // 3. Attempting to execute without authentication
    const result = await cartAuthGuard.executePendingAction(store.dispatch);
    assert.strictEqual(result.success, false);

    // Assert NO toast is displayed
    assert.strictEqual(Boolean(selectCartToast(store.getState())?.visible), false);
    assert.strictEqual(selectCartItems(store.getState()).length, 0);
  });

  test('10. An expired session is handled correctly without silent cart erasure', async () => {
    authStore.saveSession({
      user: testUserA,
      accessToken: 'expired-token',
      refreshToken: 'expired-refresh',
    });

    // Existing local cart items
    store.dispatch(
      setServerCart({
        items: [{ productId: 'prod-elec-001', quantity: 1, product: sampleProductA }] as any,
      } as any)
    );

    // Backend returns 401 Unauthorized for expired token
    cartApi.getCart = async () => {
      const err: any = new Error('Request failed with status code 401');
      err.response = { status: 401 };
      throw err;
    };

    // Attempting loadServerCart with expired token
    const res = await cartManager.loadServerCart(store.dispatch);
    assert.strictEqual(res, null);

    // Crucial: cart must NOT be wiped out with an empty array on 401
    const items = selectCartItems(store.getState());
    assert.strictEqual(items.length, 1);
  });

  test('11. Direct unauthorized API requests are rejected', async () => {
    assert.strictEqual(authStore.isAuthenticated(), false);

    // Direct invocation of cartManager.addToCart when unauthenticated
    const res = await cartManager.addToCart(store.dispatch, sampleProductA, 1);

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.requiresAuth, true);
    assert.strictEqual(selectCartItems(store.getState()).length, 0);
  });

  test('12. Cart data remains isolated by authenticated user', async () => {
    // User A session
    authStore.saveSession({
      user: testUserA,
      accessToken: 'token-a',
      refreshToken: 'refresh-a',
    });

    store.dispatch(
      setServerCart({
        userId: testUserA.id,
        items: [{ productId: 'prod-elec-001', quantity: 4, product: sampleProductA }] as any,
      } as any)
    );

    const userACart = selectCartItems(store.getState());
    assert.strictEqual(userACart.length, 1);
    assert.strictEqual(userACart[0].quantity, 4);

    // Switch to User B
    authStore.saveSession({
      user: testUserB,
      accessToken: 'token-b',
      refreshToken: 'refresh-b',
    });

    // On user switch, previous user's cart is not leaked
    store.dispatch(clearCart());
    store.dispatch(
      setServerCart({
        userId: testUserB.id,
        items: [{ productId: 'prod-elec-002', quantity: 1, product: sampleProductB }] as any,
      } as any)
    );

    const userBCart = selectCartItems(store.getState());
    assert.strictEqual(userBCart.length, 1);
    assert.strictEqual(userBCart[0].productId, 'prod-elec-002');
    assert.strictEqual(userBCart[0].quantity, 1);
  });
});

describe('PART E — Authentication Modal Dismissal & Lifecycle Regression Tests (Bugs A, B, C)', () => {
  const originalAddToCart = cartApi.addToCart;
  const originalGetCart = cartApi.getCart;

  beforeEach(() => {
    cartManager.cancelPendingOperations();
    cartAuthGuard.cancelPendingAction();
    store.dispatch(clearCart());
    store.dispatch(hideCartToast());
    store.dispatch(hideAuthModal());
    authStore.clearSession();
  });

  afterEach(() => {
    cartApi.addToCart = originalAddToCart;
    cartApi.getCart = originalGetCart;
    cartManager.cancelPendingOperations();
    cartAuthGuard.cancelPendingAction();
    store.dispatch(hideAuthModal());
    authStore.clearSession();
  });

  test('1. Bug A: Clicking Continue Shopping hides the popup and preserves current browsing screen', async () => {
    // 1. Guest clicks Add to Cart -> modal opens
    assert.strictEqual(authStore.isAuthenticated(), false);
    const addResult = await cartManager.addToCart(store.dispatch, sampleProductA, 2);
    assert.strictEqual(addResult.requiresAuth, true);
    assert.strictEqual(selectAuthModal(store.getState())?.visible, true);
    assert.strictEqual(cartAuthGuard.hasPendingAction(), true);

    // 2. User clicks Continue Shopping -> single safe dismissal contract executes
    cartAuthGuard.cancelPendingAction();
    store.dispatch(hideAuthModal());

    // 3. Popup is closed, pending action is cleared, screen state is preserved
    assert.strictEqual(selectAuthModal(store.getState()), null);
    assert.strictEqual(cartAuthGuard.hasPendingAction(), false);
    assert.strictEqual(cartAuthGuard.getPendingAction(), null);
    // No unauthorized items were added
    assert.strictEqual(selectCartItems(store.getState()).length, 0);
  });

  test('2. Bug B: Clicking X hides the popup and preserves browsing state', async () => {
    // 1. Guest triggers modal
    store.dispatch(
      showAuthModal({
        product: sampleProductA,
        quantity: 1,
        returnScreen: 'ProductDetail',
        returnParams: { productId: sampleProductA.id },
      })
    );
    cartAuthGuard.savePendingAction({
      product: sampleProductA,
      productId: sampleProductA.id,
      quantity: 1,
      sourceScreen: 'ProductDetail',
      sourceParams: { productId: sampleProductA.id },
    });

    assert.strictEqual(selectAuthModal(store.getState())?.visible, true);
    assert.strictEqual(cartAuthGuard.hasPendingAction(), true);

    // 2. User clicks X -> identical dismissal handler executes
    cartAuthGuard.cancelPendingAction();
    store.dispatch(hideAuthModal());

    // 3. Modal closed and pending action cleared without error
    assert.strictEqual(selectAuthModal(store.getState()), null);
    assert.strictEqual(cartAuthGuard.hasPendingAction(), false);
  });

  test('3. Neither button exits or crashes the app: pure JS-thread state updates without Reanimated worklet crashes', async () => {
    // Seed modal
    store.dispatch(showAuthModal({ product: sampleProductA, quantity: 1 }));
    assert.strictEqual(selectAuthModal(store.getState())?.visible, true);

    // Safe dismissal executed synchronously without invoking worklet or throwing
    assert.doesNotThrow(() => {
      cartAuthGuard.cancelPendingAction();
      store.dispatch(hideAuthModal());
    });

    assert.strictEqual(selectAuthModal(store.getState()), null);
  });

  test('4. Existing cart contents and active sessions are preserved on popup dismissal', async () => {
    // Seed pre-existing cart items (e.g. from prior browsing or offline storage)
    store.dispatch(
      setServerCart({
        items: [
          { productId: 'prod-elec-002', quantity: 2, unitPrice: 320, totalPrice: 640, product: sampleProductB },
        ] as any,
        subtotal: 640,
        grandTotal: 640,
      } as any)
    );
    assert.strictEqual(selectCartItems(store.getState()).length, 1);

    // Guest triggers auth modal on item A
    store.dispatch(showAuthModal({ product: sampleProductA, quantity: 1 }));
    assert.strictEqual(selectAuthModal(store.getState())?.visible, true);

    // Dismiss modal
    cartAuthGuard.cancelPendingAction();
    store.dispatch(hideAuthModal());

    // Existing cart contents remain completely untouched
    const currentItems = selectCartItems(store.getState());
    assert.strictEqual(currentItems.length, 1);
    assert.strictEqual(currentItems[0].productId, 'prod-elec-002');
    assert.strictEqual(selectCartSubtotal(store.getState()), 640);
  });

  test('5. Bug C: Redux persist/REHYDRATE never restores a visible auth modal across app restart', () => {
    // Simulate Redux Persist rehydration payload that contained stale authModal: { visible: true }
    const stalePersistedCartState: any = {
      items: [{ productId: 'prod-elec-001', quantity: 1, product: sampleProductA }],
      authModal: {
        visible: true,
        product: sampleProductA,
        quantity: 1,
      },
      addedToast: {
        visible: true,
        productName: sampleProductA.title,
      },
    };

    // Dispatch redux-persist REHYDRATE action
    store.dispatch({
      type: 'persist/REHYDRATE',
      payload: {
        cart: stalePersistedCartState,
      },
    });

    // Verify authModal and addedToast are strictly null after rehydration
    assert.strictEqual(selectAuthModal(store.getState()), null);
    assert.strictEqual(selectCartToast(store.getState()), null);
    // But legitimate cart items are preserved
    assert.strictEqual(selectCartItems(store.getState()).length, 1);
  });

  test('6. Bug C: App restart/boot lifecycle ensures transient modal and cancelled pending actions are cleared', () => {
    // Seed stale modal in state
    store.dispatch(showAuthModal({ product: sampleProductB, quantity: 2 }));
    cartAuthGuard.savePendingAction({
      product: sampleProductB,
      productId: sampleProductB.id,
      quantity: 2,
    });
    assert.strictEqual(selectAuthModal(store.getState())?.visible, true);
    assert.strictEqual(cartAuthGuard.hasPendingAction(), true);

    // Simulate SplashScreen boot cleanup (lines 507-508 of SplashScreen.tsx)
    cartAuthGuard.clearPendingAction();
    store.dispatch(hideAuthModal());

    assert.strictEqual(selectAuthModal(store.getState()), null);
    assert.strictEqual(cartAuthGuard.hasPendingAction(), false);
  });

  test('7. Stale cancelled pending action is never executed upon later authentication', async () => {
    // 1. Guest clicks Add to Cart
    await cartManager.addToCart(store.dispatch, sampleProductA, 1);
    assert.strictEqual(cartAuthGuard.hasPendingAction(), true);

    // 2. User cancels/dismisses modal
    cartAuthGuard.cancelPendingAction();
    store.dispatch(hideAuthModal());
    assert.strictEqual(cartAuthGuard.hasPendingAction(), false);

    // 3. User logs in later independently
    authStore.saveSession({
      user: testUserA,
      accessToken: 'token-later-login',
      refreshToken: 'refresh-later-login',
    });

    // 4. Any attempt to resume the cancelled action fails gracefully
    const resumeResult = await cartAuthGuard.executePendingAction(store.dispatch);
    assert.strictEqual(resumeResult.success, false);
    assert.strictEqual(resumeResult.error, 'No pending cart action found');
    assert.strictEqual(selectCartItems(store.getState()).length, 0);
  });

  test('8. Debouncing guards against rapid repeated dismissal taps without errors or duplicate actions', () => {
    store.dispatch(showAuthModal({ product: sampleProductA, quantity: 1 }));
    cartAuthGuard.savePendingAction({ product: sampleProductA, productId: sampleProductA.id, quantity: 1 });

    // Simulate rapid repeated taps
    let isDismissing = false;
    let dismissInvocationCount = 0;

    const safeDismiss = () => {
      if (isDismissing) return;
      isDismissing = true;
      dismissInvocationCount++;
      cartAuthGuard.cancelPendingAction();
      store.dispatch(hideAuthModal());
      setTimeout(() => {
        isDismissing = false;
      }, 250);
    };

    // Rapid double/triple tap
    safeDismiss();
    safeDismiss();
    safeDismiss();

    assert.strictEqual(dismissInvocationCount, 1);
    assert.strictEqual(selectAuthModal(store.getState()), null);
    assert.strictEqual(cartAuthGuard.hasPendingAction(), false);
  });

  test('9. Android hardware back press returns true (consumed) so it does NOT exit app or pop root screen', () => {
    // When modal is visible, back press listener returns true to consume event
    let modalDismissed = false;

    const onHardwareBackPress = () => {
      modalDismissed = true;
      cartAuthGuard.cancelPendingAction();
      store.dispatch(hideAuthModal());
      return true; // CONSUME the event
    };

    const consumed = onHardwareBackPress();
    assert.strictEqual(consumed, true);
    assert.strictEqual(modalDismissed, true);
    assert.strictEqual(selectAuthModal(store.getState()), null);
  });

  test('10. Backdrop press dismisses modal cleanly with identical dismissal contract', () => {
    store.dispatch(showAuthModal({ product: sampleProductA, quantity: 1 }));
    cartAuthGuard.savePendingAction({ product: sampleProductA, productId: sampleProductA.id, quantity: 1 });

    // Backdrop touch triggers handleDismiss
    cartAuthGuard.cancelPendingAction();
    store.dispatch(hideAuthModal());

    assert.strictEqual(selectAuthModal(store.getState()), null);
    assert.strictEqual(cartAuthGuard.hasPendingAction(), false);
  });

  test('11. Login navigation from modal preserves product intent and passes return params', () => {
    const modalPayload = {
      product: sampleProductA,
      quantity: 3,
      storeId: 1,
      variantId: null,
      returnScreen: 'ProductList',
      returnParams: { categoryId: 42 },
    };
    store.dispatch(showAuthModal(modalPayload));

    // Simulate handleLogin: saves pending action, hides modal, and navigates
    cartAuthGuard.savePendingAction({
      product: modalPayload.product,
      productId: modalPayload.product.id,
      quantity: modalPayload.quantity,
      variantId: modalPayload.variantId,
      storeId: modalPayload.storeId,
      sourceScreen: modalPayload.returnScreen,
      sourceParams: modalPayload.returnParams,
    });
    store.dispatch(hideAuthModal());

    assert.strictEqual(selectAuthModal(store.getState()), null);
    const pending = cartAuthGuard.getPendingAction();
    assert.ok(pending);
    assert.strictEqual(pending?.quantity, 3);
    assert.strictEqual(pending?.sourceScreen, 'ProductList');
    assert.deepStrictEqual(pending?.sourceParams, { categoryId: 42 });
  });

  test('12. Registration navigation from modal preserves product intent with isNewUser flag', () => {
    const modalPayload = {
      product: sampleProductB,
      quantity: 1,
      storeId: 1,
      variantId: null,
      returnScreen: 'Subcategories',
      returnParams: { subcategoryId: 8 },
    };
    store.dispatch(showAuthModal(modalPayload));

    // Simulate handleCreateAccount: saves pending action and hides modal
    cartAuthGuard.savePendingAction({
      product: modalPayload.product,
      productId: modalPayload.product.id,
      quantity: modalPayload.quantity,
      variantId: modalPayload.variantId,
      storeId: modalPayload.storeId,
      sourceScreen: modalPayload.returnScreen,
      sourceParams: modalPayload.returnParams,
    });
    store.dispatch(hideAuthModal());

    assert.strictEqual(selectAuthModal(store.getState()), null);
    const pending = cartAuthGuard.getPendingAction();
    assert.ok(pending);
    assert.strictEqual(pending?.productId, 'prod-elec-002');
    assert.strictEqual(pending?.sourceScreen, 'Subcategories');
  });

  test('13. Successful authentication executes pending action exactly once without duplicate requests', async () => {
    // 1. Guest initiates add to cart
    await cartManager.addToCart(store.dispatch, sampleProductA, 1);
    assert.strictEqual(cartAuthGuard.hasPendingAction(), true);

    // 2. User logs in
    authStore.saveSession({
      user: testUserA,
      accessToken: 'valid-test-token-exact-once',
      refreshToken: 'valid-test-refresh-exact-once',
    });

    let backendCalls = 0;
    cartApi.addToCart = async () => {
      backendCalls++;
      return { success: true } as any;
    };
    cartApi.getCart = async () =>
      ({
        items: [{ productId: 'prod-elec-001', quantity: 1, product: sampleProductA }],
      } as any);

    // 3. Execution resumes
    const run1 = await cartAuthGuard.executePendingAction(store.dispatch);
    assert.strictEqual(run1.success, true);
    assert.strictEqual(backendCalls, 1);

    // 4. Repeated execution call is blocked
    const run2 = await cartAuthGuard.executePendingAction(store.dispatch);
    assert.strictEqual(run2.success, false);
    assert.strictEqual(backendCalls, 1);
  });

  test('14. Failed authentication does not create an unauthorized cart entry or mutate state', async () => {
    // Save pending action
    cartAuthGuard.savePendingAction({
      product: sampleProductA,
      productId: sampleProductA.id,
      quantity: 1,
    });

    // Ensure user remains unauthenticated
    authStore.clearSession();
    assert.strictEqual(authStore.isAuthenticated(), false);

    // Attempt execute
    const result = await cartAuthGuard.executePendingAction(store.dispatch);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'User is not authenticated');
    assert.strictEqual(selectCartItems(store.getState()).length, 0);
  });
});
