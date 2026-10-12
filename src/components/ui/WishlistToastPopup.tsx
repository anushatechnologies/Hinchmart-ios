/**
 * HINCH MART — Wishlist Add Toast Popup
 * Slides up from the bottom when a product is added to wishlist.
 * Shows product name + "Open Wishlist" CTA. Auto-dismisses after 3.5s.
 */
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  selectWishlistToast,
  hideWishlistToast,
} from '../../redux/slices/wishlistSlice';

export function WishlistToastPopup() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const toast = useAppSelector(selectWishlistToast);

  const bottomOffset = insets.bottom > 0 ? insets.bottom + 64 : 72;

  // Auto-dismiss after 3.5 seconds
  useEffect(() => {
    if (toast?.visible) {
      const timer = setTimeout(() => {
        dispatch(hideWishlistToast());
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast?.visible, toast?.productName, dispatch]);

  if (!toast || !toast.visible) return null;

  const handleOpenWishlist = () => {
    dispatch(hideWishlistToast());
    navigation.navigate('Wishlist');
  };

  const handleClose = () => {
    dispatch(hideWishlistToast());
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      exiting={FadeOutDown.duration(200)}
      style={[styles.container, { bottom: bottomOffset }]}
    >
      <View style={styles.row}>
        {/* Heart icon circle */}
        <View style={styles.heartCircle}>
          <Ionicons name="heart" size={16} color="#FFF" />
        </View>

        {/* Text */}
        <View style={styles.textCol}>
          <Text style={styles.label}>ADDED TO WISHLIST</Text>
          <Text numberOfLines={1} style={styles.productName}>
            {toast?.productName || 'Product'}
          </Text>
          <Text style={styles.hint}>Tap to open your wishlist</Text>
        </View>

        {/* Open Wishlist Button */}
        <TouchableOpacity
          onPress={handleOpenWishlist}
          style={styles.openBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.openBtnText}>Open Wishlist</Text>
          <Ionicons name="arrow-forward" size={12} color="#152238" style={{ marginLeft: 3 }} />
        </TouchableOpacity>

        {/* Close */}
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color="rgba(255,255,255,0.65)" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: '#0F172A',
    padding: 12,
    elevation: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  textCol: {
    flex: 1,
    paddingRight: 8,
  },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#EF4444',
    letterSpacing: 0.6,
  },
  productName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#FFFFFF',
    marginTop: 1,
  },
  hint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDB913',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginRight: 6,
  },
  openBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#152238',
  },
  closeBtn: {
    padding: 4,
  },
});
