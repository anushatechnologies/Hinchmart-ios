/**
 * HINCH MART — IBO-Inspired Screen, Header & Section Layout Components
 * Bold red header bar, white icons, clean section headers on grey canvas
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  ViewStyle,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useAppSelector } from '../../redux/hooks';
import { selectCartItemCount } from '../../redux/slices/cartSlice';

// Screen Wrapper Component
export interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

export function Screen({
  children,
  scrollable = true,
  onRefresh,
  refreshing = false,
  style,
  contentContainerStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.screenBase,
        {
          backgroundColor: theme.colors.background,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDark ? '#B71C1C' : '#E31E24'}
        translucent
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex1}
      >
        {scrollable ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 84 },
              contentContainerStyle,
            ]}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.colors.primary}
                  colors={[theme.colors.primary]}
                />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex1, contentContainerStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

// IBO-Style Header Icon Button — White icons on red bar
function HeaderIconButton({
  name,
  onPress,
  color,
  size = 22,
  badge,
  badgeColor,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  color: string;
  size?: number;
  badge?: number;
  badgeColor?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={styles.headerIconBtn}
    >
      <Ionicons name={name} size={size} color={color} />
      {badge != null && badge > 0 && (
        <View style={[styles.headerBadge, { backgroundColor: badgeColor || '#FFF' }]}>
          <Text style={[styles.headerBadgeText, { color: badgeColor === '#FFF' ? '#E31E24' : '#FFF' }]}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// IBO-Style Top App Header — Bold Red Bar
export interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  showSearch?: boolean;
  onSearchPress?: () => void;
  showCart?: boolean;
  onCartPress?: () => void;
  showNotification?: boolean;
  onNotificationPress?: () => void;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
  variant?: 'primary' | 'surface'; // primary = red, surface = white/dark surface
}

export function Header({
  title,
  showBack = false,
  onBackPress,
  showSearch = false,
  onSearchPress,
  showCart = false,
  onCartPress,
  showNotification = false,
  onNotificationPress,
  rightAction,
  style,
  variant = 'primary',
}: HeaderProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const cartCount = useAppSelector(selectCartItemCount);
  const unreadNotifCount = useAppSelector((state) => state.notifications.unreadCount);

  const isPrimaryVariant = variant === 'primary';

  // Color scheme based on variant
  const headerBg = isPrimaryVariant
    ? (isDark ? '#B71C1C' : '#E31E24')
    : (isDark ? '#1E1E1E' : '#FFFFFF');
  const iconColor = isPrimaryVariant ? '#FFFFFF' : theme.colors.textPrimary;
  const titleColor = isPrimaryVariant ? '#FFFFFF' : theme.colors.textPrimary;
  const borderColor = isPrimaryVariant ? 'transparent' : theme.colors.border;

  return (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: headerBg,
          borderBottomColor: borderColor,
          borderBottomWidth: isPrimaryVariant ? 0 : 1,
          paddingTop: insets.top,
          ...(isPrimaryVariant
            ? Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                },
                android: { elevation: 4 },
              })
            : Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                },
                android: { elevation: 2 },
              })),
        },
        style,
      ]}
    >
      <View style={styles.headerInner}>
        <View style={styles.headerLeft}>
          {showBack && (
            <HeaderIconButton
              name="arrow-back"
              onPress={onBackPress}
              color={iconColor}
              size={24}
            />
          )}

          {/* App Logo & Title */}
          {!title ? (
            <View style={styles.brandContainer}>
              <Image
                source={
                  isPrimaryVariant
                    ? require('../../../assets/logo-white.png')
                    : require('../../../assets/logo-horizontal-color.png')
                }
                style={styles.headerLogoImage}
                contentFit="contain"
                contentPosition="left center"
              />
            </View>
          ) : (
            <View style={styles.brandTitleContainer}>
              <Text
                numberOfLines={1}
                style={[styles.headerTitle, { color: titleColor }]}
              >
                {title}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          {showSearch && (
            <HeaderIconButton
              name="search"
              onPress={onSearchPress}
              color={iconColor}
            />
          )}

          {showNotification && (
            <HeaderIconButton
              name="notifications-outline"
              onPress={onNotificationPress}
              color={iconColor}
              badge={unreadNotifCount}
              badgeColor={isPrimaryVariant ? '#FFF' : '#EF4444'}
            />
          )}

          {showCart && (
            <HeaderIconButton
              name="cart-outline"
              onPress={onCartPress}
              color={iconColor}
              badge={cartCount}
              badgeColor={isPrimaryVariant ? '#FFF' : '#EF4444'}
            />
          )}

          {rightAction}
        </View>
      </View>
    </View>
  );
}

// Section Component — Clean IBO-style section headers
export interface SectionProps {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
  seeAllText?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Section({
  title,
  subtitle,
  onSeeAll,
  seeAllText = 'View All',
  children,
  style,
}: SectionProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.sectionContainer, style]}>
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>

        {onSeeAll && (
          <TouchableOpacity
            onPress={onSeeAll}
            activeOpacity={0.7}
            style={styles.viewAllBtn}
          >
            <Text style={styles.viewAllText}>
              {seeAllText}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#E31E24" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        )}
      </View>

      {children}
    </View>
  );
}

export const HinchHeader = Header;
export const HinchSectionHeader = Section;
export const HinchScreen = Screen;

const styles = StyleSheet.create({
  screenBase: {
    flex: 1,
    direction: 'ltr',
  },
  flex1: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  headerContainer: {
    direction: 'ltr',
  },
  headerInner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
    gap: 10,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 36,
  },
  headerLogoImage: {
    width: 140,
    height: 34,
  },
  brandTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 18,
    flex: 1,
    letterSpacing: -0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#E31E24',
  },
  headerBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  sectionContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  viewAllText: {
    fontWeight: '600',
    fontSize: 13,
    color: '#E31E24',
  },
});
