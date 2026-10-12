/**
 * HINCH MART — Clean & Dynamic Explore Catalog Modal
 * Theme-driven, production-ready modal dialog for the Construction Products Catalog.
 * Dynamically inherits brand theme colors, typography, border radius, and elevation.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { Button } from './Button';

export interface ExploreCatalogModalProps {
  visible: boolean;
  onClose: () => void;
  onExploreProducts: () => void;
  title?: string;
  subtitle?: string;
  confirmText?: string;
  cancelText?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
}

export function ExploreCatalogModal({
  visible,
  onClose,
  onExploreProducts,
  title = 'Construction Products Catalog',
  subtitle = 'Opening certified steel, cement, heavy machinery, power tools & hardware materials catalog.',
  confirmText = 'Explore Now',
  cancelText = 'Cancel',
  iconName = 'cube-outline',
}: ExploreCatalogModalProps) {
  const { theme, isDark } = useTheme();

  // Guard against duplicate taps / rapid dismiss
  const isActionInProgressRef = useRef(false);

  // Animation values
  const backdropOpacity = useSharedValue(0);
  const scale = useSharedValue(0.94);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      isActionInProgressRef.current = false;
      backdropOpacity.value = withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
      cardOpacity.value = withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      backdropOpacity.value = 0;
      scale.value = 0.94;
      cardOpacity.value = 0;
    }
  }, [visible, backdropOpacity, scale, cardOpacity]);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: cardOpacity.value,
  }));

  const handleSmoothClose = () => {
    if (isActionInProgressRef.current) return;
    isActionInProgressRef.current = true;
    backdropOpacity.value = withTiming(0, { duration: 140 });
    scale.value = withTiming(0.95, { duration: 140, easing: Easing.in(Easing.quad) });
    cardOpacity.value = withTiming(0, { duration: 140 }, (finished) => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
  };

  const handleConfirm = () => {
    if (isActionInProgressRef.current) return;
    isActionInProgressRef.current = true;
    onClose();
    onExploreProducts();
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleSmoothClose}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <View style={styles.modalOverlay}>
        {/* Animated Dimmed Backdrop */}
        <TouchableWithoutFeedback onPress={handleSmoothClose}>
          <Animated.View
            style={[
              styles.backdrop,
              { backgroundColor: theme.colors.overlay },
              animatedBackdropStyle,
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Animated Dialog Card */}
        <Animated.View
          style={[
            styles.dialogCard,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.cardBorder,
            },
            animatedCardStyle,
          ]}
        >
          {/* Top-Right Close Button */}
          <TouchableOpacity
            onPress={handleSmoothClose}
            style={[
              styles.closeBtn,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Close construction products catalog popup"
            accessibilityRole="button"
          >
            <Ionicons
              name="close"
              size={18}
              color={theme.colors.iconSecondary}
            />
          </TouchableOpacity>

          {/* Theme-Driven Hero Icon Container */}
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: theme.colors.primaryLight,
                borderColor: isDark
                  ? 'rgba(239, 68, 68, 0.25)'
                  : 'rgba(227, 30, 36, 0.12)',
              },
            ]}
          >
            <Ionicons name={iconName} size={28} color={theme.colors.primary} />
          </View>

          {/* Title & Subtitle */}
          <Text
            style={[
              styles.dialogTitle,
              { color: theme.colors.textPrimary },
            ]}
            accessibilityRole="header"
          >
            {title}
          </Text>
          <Text
            style={[
              styles.dialogSubtitle,
              { color: theme.colors.textSecondary },
            ]}
          >
            {subtitle}
          </Text>

          {/* Dual Action Buttons */}
          <View style={styles.actionsWrap}>
            <Button
              title={confirmText}
              onPress={handleConfirm}
              variant="primary"
              size="md"
              iconRight={<Ionicons name="arrow-forward" size={17} color={theme.colors.onPrimary} />}
              accessibilityLabel={`${confirmText}, open catalog`}
              fullWidth
              style={styles.primaryBtn}
            />

            <TouchableOpacity
              onPress={handleSmoothClose}
              activeOpacity={0.7}
              style={styles.cancelBtn}
              hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
              accessibilityLabel={cancelText}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.cancelBtnText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {cancelText}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 348,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 20,
    alignItems: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 16,
  },
  dialogTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Poppins_700Bold',
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  dialogSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19.5,
    textAlign: 'center',
    marginBottom: 22,
    paddingHorizontal: 6,
  },
  actionsWrap: {
    width: '100%',
    alignItems: 'center',
  },
  primaryBtn: {
    borderRadius: 10,
    minHeight: 46,
  },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 13.5,
    letterSpacing: 0.1,
  },
});

