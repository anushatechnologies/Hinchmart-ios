/**
 * HINCH MART — Premium Delete / Removal Confirmation Modal
 * Ultra-smooth animated popup dialog with item thumbnail, details, and dual action buttons.
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DeleteConfirmationModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  itemName?: string;
  itemImage?: string;
  itemPrice?: string;
  cancelText?: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmationModal({
  visible,
  title = 'Remove Item?',
  message = 'Are you sure you want to remove this item from your cart?',
  itemName,
  itemImage,
  itemPrice,
  cancelText = 'Keep Item',
  confirmText = 'Yes, Remove',
  onCancel,
  onConfirm,
}: DeleteConfirmationModalProps) {
  const { theme, isDark } = useTheme();

  const backdropOpacity = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const scale = useSharedValue(0.96);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
      cardOpacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
      scale.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
    } else {
      backdropOpacity.value = 0;
      cardOpacity.value = 0;
      scale.value = 0.96;
    }
  }, [visible, backdropOpacity, cardOpacity, scale]);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  const handleClose = (callback?: () => void) => {
    backdropOpacity.value = withTiming(0, { duration: 140, easing: Easing.in(Easing.quad) });
    cardOpacity.value = withTiming(0, { duration: 140, easing: Easing.in(Easing.quad) });
    scale.value = withTiming(0.96, { duration: 140, easing: Easing.in(Easing.quad) }, (finished) => {
      if (finished) {
        runOnJS(onCancel)();
        if (callback) {
          runOnJS(callback)();
        }
      }
    });
  };

  const handleConfirmAction = () => {
    backdropOpacity.value = withTiming(0, { duration: 140, easing: Easing.in(Easing.quad) });
    cardOpacity.value = withTiming(0, { duration: 140, easing: Easing.in(Easing.quad) });
    scale.value = withTiming(0.96, { duration: 140, easing: Easing.in(Easing.quad) }, (finished) => {
      if (finished) runOnJS(onConfirm)();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => handleClose()}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Animated Dimming Backdrop */}
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
          <TouchableWithoutFeedback onPress={() => handleClose()}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        </Animated.View>

        {/* Animated Alert Dialog Card */}
        <Animated.View
          style={[
            styles.dialogCard,
            animatedCardStyle,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.cardBorder,
            },
          ]}
        >
          {/* Top Red Trash Icon Circle */}
          <View style={styles.iconCircleOuter}>
            <View style={styles.iconCircleInner}>
              <Ionicons name="trash" size={26} color="#EF4444" />
            </View>
          </View>

          {/* Title & Message */}
          <Text style={[styles.titleText, { color: theme.colors.textPrimary }]}>
            {title}
          </Text>
          <Text style={[styles.messageText, { color: theme.colors.textSecondary }]}>
            {message}
          </Text>

          {/* Optional Item Thumbnail Preview Card */}
          {itemName && (
            <View
              style={[
                styles.itemPreviewCard,
                {
                  backgroundColor: isDark ? theme.colors.surfaceVariant : '#F8FAFC',
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              {itemImage && (
                <Image source={{ uri: itemImage }} style={styles.itemThumb} contentFit="cover" />
              )}
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={2}
                  style={[styles.previewItemName, { color: theme.colors.textPrimary }]}
                >
                  {itemName}
                </Text>
                {itemPrice && (
                  <Text style={[styles.previewItemPrice, { color: '#FDB913' }]}>
                    {itemPrice}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Action Buttons Row */}
          <View style={styles.actionsRow}>
            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => handleClose()}
              style={[
                styles.btnCancel,
                {
                  backgroundColor: isDark ? theme.colors.surfaceVariant : '#F1F5F9',
                  borderColor: theme.colors.cardBorder,
                },
              ]}
              activeOpacity={0.75}
            >
              <Text style={[styles.btnCancelText, { color: theme.colors.textPrimary }]}>
                {cancelText}
              </Text>
            </TouchableOpacity>

            {/* Confirm Delete Button */}
            <TouchableOpacity
              onPress={handleConfirmAction}
              style={styles.btnConfirm}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
              <Text style={styles.btnConfirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  iconCircleOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircleInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 6,
  },
  messageText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  itemPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 20,
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  previewItemName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
  },
  previewItemPrice: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
  },
  btnConfirm: {
    flex: 1.2,
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  btnConfirmText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
});
