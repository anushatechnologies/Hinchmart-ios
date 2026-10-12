/**
 * HINCH MART — IBO-Inspired ProductCard Component
 * White card on grey canvas, clean image → brand → title → price hierarchy
 * Green discount badge, subtle shadow, clean add-to-cart button
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { Product } from '../../types/product.types';
import { formatPrice } from '../../utils';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Rating } from '../ui/Rating';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { toggleWishlist, selectIsWishlisted } from '../../redux/slices/wishlistSlice';
import { cartManager } from '../../services/cart/cartManager';
import {
  showCartToast,
  selectCartQuantityByProductId,
  selectCartItemByProductId,
} from '../../redux/slices/cartSlice';
import { wishlistApi } from '../../services/api/wishlist.api';
import { resolveProductImage } from '../../hooks/useLiveProducts';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export interface ProductCardProps {
  product: Product | any;
  onPress: () => void;
  variant?: 'grid' | 'list';
  style?: ViewStyle;
}

function ProductCardComponent({
  product,
  onPress,
  variant = 'grid',
  style,
}: ProductCardProps) {
  const { theme, isDark } = useTheme();
  const dispatch = useAppDispatch();

  const productId = String(product?.id || product?.productId || '');
  const isWishlisted = useAppSelector(selectIsWishlisted(productId));
  const heartScale = useSharedValue(1);
  const cartScale = useSharedValue(1);

  // Redux Cart State - single source of truth
  const cartQuantity = useAppSelector(selectCartQuantityByProductId(productId));
  const cartItem = useAppSelector(selectCartItemByProductId(productId));

  // Safe image resolution
  const rawImage =
    (Array.isArray(product?.images) && product.images.length > 0
      ? (product.images.find((img: any) => img?.isPrimary)?.url ||
        (typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.url))
      : null) ||
    product?.image ||
    product?.imageUrl || '';

  const primaryImage = resolveProductImage(product, rawImage);

  const productName = product?.name || product?.title || '';
  const unitPrice =
    typeof product?.price === 'number'
      ? product.price
      : (product?.price?.amount ?? (product as any)?.price ?? 0);

  const comparePrice =
    typeof product?.comparePrice === 'number'
      ? product.comparePrice
      : (product?.compareAtPrice?.amount ?? (product as any)?.comparePrice ?? product?.mrp ?? undefined);

  const discountPercent =
    typeof product?.discountPercent === 'number' && product.discountPercent > 0
      ? product.discountPercent
      : typeof (product as any)?.discountPercentage === 'number' && (product as any).discountPercentage > 0
      ? (product as any).discountPercentage
      : typeof (product as any)?.discount === 'number' && (product as any).discount > 0
      ? (product as any).discount
      : 0;

  const brandName =
    typeof product?.brand === 'string'
      ? product.brand
      : (product?.brand as any)?.name || 'HINCH DIRECT';

  const ratingVal =
    typeof product?.rating === 'number'
      ? product.rating
      : product?.rating?.average;

  const reviewsCount = product?.reviewCount ?? product?.reviews;
  const hasRealReviews =
    typeof ratingVal === 'number' &&
    ratingVal > 0 &&
    typeof reviewsCount === 'number' &&
    reviewsCount > 0;

  // Sanitize unit: prevent 'Default' or empty string from showing
  const rawUnit = String(product?.unit || '').trim();
  const unitStr =
    rawUnit && !['default', 'null', 'undefined', 'none', 'item'].includes(rawUnit.toLowerCase())
      ? rawUnit
      : '';

  const handleWishlistToggle = () => {
    const nextState = !isWishlisted;
    dispatch(toggleWishlist(productId));
    heartScale.value = withSpring(0.7, { damping: 8 }, () => {
      heartScale.value = withSpring(1, { damping: 12 });
    });
    if (nextState) {
      wishlistApi.addProduct(productId).catch(() => {});
    } else {
      wishlistApi.removeProduct(productId).catch(() => {});
    }
  };

  const handleAddToCart = async (e?: any) => {
    e?.stopPropagation?.();
    cartScale.value = withSpring(0.8, { damping: 8 }, () => {
      cartScale.value = withSpring(1, { damping: 12 });
    });

    const prodStoreId = (product as any)?.storeId;
    await cartManager.addToCart(dispatch, product, 1, prodStoreId);
  };

  const handleIncrement = (e?: any) => {
    e?.stopPropagation?.();
    cartScale.value = withSpring(1.15, { damping: 8 }, () => {
      cartScale.value = withSpring(1, { damping: 12 });
    });
    cartManager.increment(dispatch, product, cartQuantity, cartItem);
  };

  const handleDecrement = (e?: any) => {
    e?.stopPropagation?.();
    cartScale.value = withSpring(0.85, { damping: 8 }, () => {
      cartScale.value = withSpring(1, { damping: 12 });
    });
    const moq = typeof product?.moq === 'number' ? product.moq : 1;
    cartManager.decrement(dispatch, product, cartQuantity, cartItem, moq);
  };

  const cardScale = useSharedValue(1);
  const handlePressIn = () => { cardScale.value = withSpring(0.97, { damping: 18 }); };
  const handlePressOut = () => { cardScale.value = withSpring(1, { damping: 18 }); };

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const heartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const cartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cartScale.value }],
  }));

  // ───── LIST VARIANT ─────
  if (variant === 'list') {
    return (
      <AnimatedTouchable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={cardAnimStyle}
      >
        <View
          style={[
            styles.listCard,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: isDark ? theme.colors.cardBorder : 'transparent',
              borderWidth: isDark ? 1 : 0,
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0 : 0.06,
                  shadowRadius: 4,
                },
                android: { elevation: isDark ? 0 : 2 },
              }),
            },
            style,
          ]}
        >
          <View style={[styles.listImageWrapper, { backgroundColor: isDark ? '#2A2A2A' : '#F8F9FA' }]}>
            <Image source={{ uri: primaryImage }} style={styles.listImage} contentFit="contain" cachePolicy="memory-disk" />
            {discountPercent && discountPercent > 0 ? (
              <View style={styles.listDiscountBadge}>
                <Text style={styles.listDiscountText}>{discountPercent}% Off</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.listDetails}>
            <Text numberOfLines={1} style={[styles.brandLabel, { color: theme.colors.textTertiary }]}>
              {brandName}
            </Text>
            <Text
              numberOfLines={2}
              style={[styles.listProductName, { color: theme.colors.textPrimary }]}
            >
              {productName}
            </Text>

            {hasRealReviews ? <Rating rating={ratingVal} count={reviewsCount} showCount size={11} /> : null}

            <View style={styles.listPriceRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={[styles.listPrice, { color: theme.colors.textPrimary }]}>
                    {formatPrice(unitPrice)}
                  </Text>
                  {discountPercent > 0 && comparePrice && comparePrice > unitPrice ? (
                    <Text style={[styles.listMrp, { color: theme.colors.textTertiary }]}>
                      {formatPrice(comparePrice)}
                    </Text>
                  ) : null}
                  {unitStr ? (
                    <Text style={[styles.listUnit, { color: theme.colors.textTertiary }]}>
                      /{unitStr}
                    </Text>
                  ) : null}
                </View>
              </View>

              {cartQuantity > 0 ? (
                <Animated.View style={[cartAnimStyle, styles.stepperWrapper]}>
                  <TouchableOpacity
                    onPress={handleDecrement}
                    style={styles.stepperBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={15} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View style={styles.stepperValueContainer}>
                    <Text style={styles.stepperValueText}>{cartQuantity}</Text>
                  </View>

                  <TouchableOpacity
                    onPress={handleIncrement}
                    style={styles.stepperBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={15} color="#FFFFFF" />
                  </TouchableOpacity>
                </Animated.View>
              ) : (
                <AnimatedTouchable
                  onPress={handleAddToCart}
                  style={[cartAnimStyle, styles.addCartBtn]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                </AnimatedTouchable>
              )}
            </View>
          </View>

          <AnimatedTouchable onPress={handleWishlistToggle} style={[styles.listWishlistBtn, heartAnimStyle]}>
            <Ionicons
              name={isWishlisted ? 'heart' : 'heart-outline'}
              size={18}
              color={isWishlisted ? '#EF4444' : theme.colors.textTertiary}
            />
          </AnimatedTouchable>
        </View>
      </AnimatedTouchable>
    );
  }

  // ───── GRID VARIANT (IBO-INSPIRED) ─────
  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={[styles.gridCardWrapper, style, cardAnimStyle]}
    >
      <View
        style={[
          styles.gridCard,
          {
            backgroundColor: theme.colors.cardBackground,
            borderColor: isDark ? theme.colors.cardBorder : 'transparent',
            borderWidth: isDark ? 1 : 0,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDark ? 0 : 0.06,
                shadowRadius: 4,
              },
              android: { elevation: isDark ? 0 : 2 },
            }),
          },
        ]}
      >
        {/* Image Container */}
        <View style={[styles.gridImageWrapper, { backgroundColor: isDark ? '#2A2A2A' : '#F8F9FA' }]}>
          <Image source={{ uri: primaryImage }} style={styles.gridImage} contentFit="contain" cachePolicy="memory-disk" />

          {/* Discount Badge — Top Left */}
          {discountPercent && discountPercent > 0 ? (
            <View style={styles.discountPill}>
              <Text style={styles.discountPillText}>{discountPercent}% Off</Text>
            </View>
          ) : null}

          {/* Express Delivery Badge */}
          {(product?.is24HourDelivery || product?.deliveryType === '24_HOURS') ? (
            <View style={[styles.expressTag, { top: (discountPercent && discountPercent > 0) ? 30 : 6 }]}>
              <Ionicons name="flash" size={9} color="#059669" style={{ marginRight: 2 }} />
              <Text style={styles.expressTagText}>24H</Text>
            </View>
          ) : null}

          {/* Wishlist Heart — Top Right */}
          <AnimatedTouchable
            onPress={handleWishlistToggle}
            style={[
              styles.wishlistBtn,
              heartAnimStyle,
              { backgroundColor: isDark ? '#333' : '#FFFFFF' },
            ]}
          >
            <Ionicons
              name={isWishlisted ? 'heart' : 'heart-outline'}
              size={16}
              color={isWishlisted ? '#EF4444' : (isDark ? '#A0A0A0' : '#8C939D')}
            />
          </AnimatedTouchable>
        </View>

        {/* Content */}
        <View style={styles.gridContent}>
          {/* Brand */}
          <Text numberOfLines={1} style={[styles.brandLabel, { color: theme.colors.textTertiary }]}>
            {brandName}
          </Text>

          {/* Product Name */}
          <Text
            numberOfLines={2}
            style={[styles.gridProductName, { color: theme.colors.textPrimary }]}
          >
            {productName}
          </Text>

          {/* Rating */}
          {hasRealReviews ? <Rating rating={ratingVal} count={reviewsCount} showCount size={10} /> : null}

          {/* Savings or Stock */}
          {discountPercent > 0 && comparePrice && comparePrice > unitPrice ? (
            <Text style={styles.savingsText}>
              Save {formatPrice(comparePrice - unitPrice)}
            </Text>
          ) : (
            <Text style={[styles.stockText, { color: theme.colors.textTertiary }]}>
              In Stock{unitStr ? ` • ${unitStr}` : ''}
            </Text>
          )}

          {/* Price Row + Add to Cart / Quantity Stepper */}
          <View style={styles.gridPriceRow}>
            <View style={styles.gridPriceCol}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.gridPrice, { color: theme.colors.textPrimary }]}
              >
                {formatPrice(unitPrice)}
              </Text>
              {discountPercent > 0 && comparePrice && comparePrice > unitPrice ? (
                <Text numberOfLines={1} style={[styles.gridMrp, { color: theme.colors.textTertiary }]}>
                  MRP {formatPrice(comparePrice)}
                </Text>
              ) : null}
            </View>

            {cartQuantity > 0 ? (
              <Animated.View style={[cartAnimStyle, styles.stepperWrapper]}>
                <TouchableOpacity
                  onPress={handleDecrement}
                  style={styles.stepperBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={15} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.stepperValueContainer}>
                  <Text style={styles.stepperValueText}>{cartQuantity}</Text>
                </View>

                <TouchableOpacity
                  onPress={handleIncrement}
                  style={styles.stepperBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={15} color="#FFFFFF" />
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <AnimatedTouchable
                onPress={handleAddToCart}
                style={[cartAnimStyle, styles.addCartBtn]}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
              </AnimatedTouchable>
            )}
          </View>
        </View>
      </View>
    </AnimatedTouchable>
  );
}

export const ProductCard = React.memo(ProductCardComponent, (prevProps, nextProps) => {
  const prevId = String(prevProps.product?.id || prevProps.product?.productId || '');
  const nextId = String(nextProps.product?.id || nextProps.product?.productId || '');
  const prevPrice = prevProps.product?.price;
  const nextPrice = nextProps.product?.price;
  const prevDiscount = prevProps.product?.discount || prevProps.product?.discountPercent;
  const nextDiscount = nextProps.product?.discount || nextProps.product?.discountPercent;

  return (
    prevId === nextId &&
    prevPrice === nextPrice &&
    prevDiscount === nextDiscount &&
    prevProps.variant === nextProps.variant
  );
});

const styles = StyleSheet.create({
  // ─── GRID VARIANT ───
  gridCardWrapper: {
    width: '100%',
    marginBottom: 12,
  },
  gridCard: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    flex: 1,
  },
  gridImageWrapper: {
    width: '100%',
    height: 150,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridImage: {
    width: '85%',
    height: '85%',
  },
  discountPill: {
    position: 'absolute',
    top: 8,
    left: 0,
    backgroundColor: '#16A34A',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  discountPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  expressTag: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  expressTagText: {
    color: '#059669',
    fontSize: 9,
    fontWeight: '700',
  },
  wishlistBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },
  gridContent: {
    padding: 10,
    flex: 1,
  },
  brandLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    marginBottom: 3,
  },
  gridProductName: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
    marginBottom: 4,
    minHeight: 34,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  savingsText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#16A34A',
    marginTop: 3,
    marginBottom: 4,
  },
  stockText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 3,
    marginBottom: 4,
  },
  gridPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F0F1F3',
  },
  gridPriceCol: {
    flex: 1,
    marginRight: 6,
    justifyContent: 'center',
  },
  gridPrice: {
    fontWeight: '700',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  gridMrp: {
    fontSize: 10,
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  addCartBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E31E24',
  },
  stepperWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E31E24',
    borderRadius: 8,
    height: 32,
    minWidth: 76,
    paddingHorizontal: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#E31E24',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  stepperBtn: {
    width: 24,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  stepperValueContainer: {
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  stepperValueText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    textAlign: 'center',
  },

  // ─── LIST VARIANT ───
  listCard: {
    flexDirection: 'row',
    padding: 10,
    marginBottom: 10,
    borderRadius: 10,
    position: 'relative',
  },
  listImageWrapper: {
    width: 90,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listImage: {
    width: '85%',
    height: '85%',
  },
  listDiscountBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#16A34A',
    borderTopLeftRadius: 8,
    borderBottomRightRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  listDiscountText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  listDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  listProductName: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 3,
  },
  listPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  listPrice: {
    fontWeight: '700',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  listMrp: {
    fontSize: 11,
    textDecorationLine: 'line-through',
    marginLeft: 5,
  },
  listUnit: {
    fontSize: 10,
    marginLeft: 3,
  },
  listWishlistBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 4,
  },
});

export const HinchProductCard = ProductCard;
export default ProductCard;
