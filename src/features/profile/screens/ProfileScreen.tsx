/**
 * HINCH MART — Premium Profile Screen & Settings Screen
 * Enhanced gradient hero, elevated stats, accent-bar menu items, refined typography
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Modal,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../theme';
import { Screen, Header } from '../../../components/layout/Screen';
import { Avatar } from '../../../components/ui/Badge';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { logout as logoutAction, updateUser } from '../../../redux/slices/authSlice';
import { clearCart } from '../../../redux/slices/cartSlice';
import { authStore } from '../../../store/authStore';
import { auth, signOut } from '../../../config/firebase';
import { mmkvStorage } from '../../../services/storage/mmkv';
import { setThemeMode as setReduxThemeMode } from '../../../redux/slices/themeSlice';
import { cartApi } from '../../../services/api/cart.api';
import { ordersApi } from '../../../services/api/orders.api';
import { rfqApi } from '../../../services/api/rfq.api';
import { userApi, UserProfileResponse } from '../../../services/api/user.api';
import { selectWishlistCount } from '../../../redux/slices/wishlistSlice';
import { requestNotificationPermission } from '../../../services/permissions/permissionsService';

function formatPhoneNumber(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/[^0-9]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (rawPhone.startsWith('+')) {
    return rawPhone;
  }
  return rawPhone;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Icon colors for each menu group
const ICON_TINTS = {
  orders: '#3B82F6',
  finance: '#10B981',
  vendor: '#F59E0B',
  settings: '#8B5CF6',
  danger: '#EF4444',
};

interface MenuItem {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen?: string;
  onPress?: () => void;
  tint: string;
  subtitle?: string;
  hasNotification?: boolean;
}

const ACCOUNT_MENU: MenuItem[] = [
  { title: 'Order History', icon: 'receipt-outline', screen: 'OrderHistory', tint: ICON_TINTS.orders, subtitle: 'Track orders & invoices' },
  { title: 'HinchMart Wallet & Credit', icon: 'wallet-outline', screen: 'Wallet', tint: ICON_TINTS.finance, subtitle: 'Escrow balance & 30-day credit line' },
  { title: 'My RFQs & Quotes', icon: 'document-text-outline', screen: 'RFQList', tint: ICON_TINTS.vendor, subtitle: 'Manage bulk purchase requests', hasNotification: true },
  { title: 'My Product Reviews', icon: 'star-outline', screen: 'MyReviews', tint: ICON_TINTS.vendor, subtitle: 'Manage product feedback & ratings' },
  { title: 'Saved Addresses', icon: 'location', screen: 'Addresses', tint: ICON_TINTS.orders, subtitle: 'Delivery locations' },
];

const PREFERENCES_MENU: MenuItem[] = [
  { title: 'Language & Currency', icon: 'globe', screen: 'Language', tint: ICON_TINTS.settings },
  { title: 'Settings & Security', icon: 'shield-checkmark', screen: 'Settings', tint: ICON_TINTS.settings },
];

const LEGAL_MENU: MenuItem[] = [
  { title: 'Help & Support', icon: 'call', screen: 'HelpSupport', tint: ICON_TINTS.orders, subtitle: '+91 8388899999 / support@hinchmart.com' },
  { title: 'Privacy Policy', icon: 'shield-checkmark-outline', screen: 'PrivacyPolicy', tint: ICON_TINTS.settings },
  { title: 'About HINCH MART', icon: 'information-circle-outline', screen: 'About', tint: ICON_TINTS.vendor },
  { title: 'Terms & Conditions', icon: 'document-text-outline', screen: 'Terms', tint: ICON_TINTS.finance },
];

// Menu Group Card — Clean alignment with left accent indicator
function MenuGroup({
  items,
  navigation,
  theme,
  label,
}: {
  items: MenuItem[];
  navigation: any;
  theme: any;
  label: string;
}) {
  return (
    <View style={menuStyles.group}>
      <Text style={[menuStyles.groupLabel, { color: theme.colors.textTertiary }]}>{label}</Text>
      <View style={[menuStyles.card, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
        {items.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => {
              if (item.onPress) {
                item.onPress();
              } else if (item.screen) {
                navigation.navigate(item.screen);
              }
            }}
            style={[
              menuStyles.row,
              idx < items.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: theme.colors.border },
            ]}
            activeOpacity={0.6}
          >
            {/* Left accent bar on card edge */}
            <View style={[menuStyles.accentBar, { backgroundColor: item.tint }]} />

            <View style={[menuStyles.iconCircle, { backgroundColor: `${item.tint}14` }]}>
              <Ionicons name={item.icon} size={18} color={item.tint} />
            </View>
            <View style={menuStyles.textCol}>
              <Text style={[menuStyles.title, { color: theme.colors.textPrimary }]}>{item.title}</Text>
              {item.subtitle && (
                <Text style={[menuStyles.subtitle, { color: theme.colors.textTertiary }]}>{item.subtitle}</Text>
              )}
            </View>
            
            {item.hasNotification && (
              <View style={menuStyles.badgeDotOnly} />
            )}

            <View style={[menuStyles.chevronCircle, { backgroundColor: `${theme.colors.textTertiary}12` }]}>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.textTertiary} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const menuStyles = StyleSheet.create({
  group: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  groupLabel: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 11.5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginLeft: 2,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    position: 'relative',
    direction: 'ltr',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginLeft: 2,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '500',
    fontSize: 14,
  },
  subtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11.5,
    marginTop: 1,
  },
  chevronCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeDotOnly: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
});


export function ProfileScreen({ navigation }: any) {
  const { theme, isDark, themeMode, setThemeMode } = useTheme();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  // Authentication State — Reacts to real auth status
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => authStore.isAuthenticated());
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [isProfileRefreshing, setIsProfileRefreshing] = useState(false);
  const [liveProfile, setLiveProfile] = useState<UserProfileResponse | null>(null);
  const savedCount = useAppSelector(selectWishlistCount);
  const [activityStats, setActivityStats] = useState({ orders: 0, rfqs: 0, reviews: 0 });

  const isGenericName = (n?: string | null): boolean => {
    if (!n) return true;
    const t = n.trim().toLowerCase();
    return (
      t === '' ||
      t === 'customer user' ||
      t === 'hinchmart member' ||
      t === 'user' ||
      t === 'member' ||
      t === 'customer'
    );
  };

  const isValidUserEmail = (e?: string | null): boolean => {
    if (!e || typeof e !== 'string') return false;
    const lower = e.trim().toLowerCase();
    if (
      !lower ||
      lower.includes('@firebase.user') ||
      lower.includes('@hinchmart.com') ||
      lower.endsWith('.user')
    ) {
      return false;
    }
    return true;
  };

  // Synchronize authentication state from authStore and Redux
  const syncAuthState = useCallback(() => {
    const authed = authStore.isAuthenticated();
    setIsAuthenticated(authed);
    setIsAuthChecking(false);
    return authed;
  }, []);

  const fetchLiveProfileData = useCallback(async () => {
    if (!authStore.isAuthenticated()) {
      setIsAuthenticated(false);
      setLiveProfile(null);
      setProfileError(null);
      return;
    }

    try {
      setProfileError(null);
      const [profileResult, ordersResult, rfqsResult] = await Promise.allSettled([
        userApi.getProfile(),
        ordersApi.getOrders({ page: 1, limit: 100 }),
        rfqApi.getRFQs({ page: 1, limit: 100 }),
      ]);

      if (profileResult.status === 'fulfilled' && profileResult.value) {
        const lp = profileResult.value;
        setLiveProfile(lp);
        if (lp?.fullName && !isGenericName(lp.fullName) && lp.fullName !== (user as any)?.fullName) {
          dispatch(updateUser({ fullName: lp.fullName, firstName: lp.fullName.split(' ')[0] }));
        }
        if ((user as any)?.email && !isValidUserEmail((user as any).email)) {
          dispatch(updateUser({ email: '' }));
        }
      } else if (profileResult.status === 'rejected') {
        const currentUser = (user as any) || authStore.getUser();
        if (!currentUser?.phone && !currentUser?.fullName) {
          setProfileError('Unable to load profile details');
        }
      }

      const ordersCount =
        ordersResult.status === 'fulfilled'
          ? (ordersResult.value?.length ?? 0)
          : (profileResult.status === 'fulfilled' ? profileResult.value?.procurementStats?.totalOrders ?? 0 : 0);

      const rfqsCount =
        rfqsResult.status === 'fulfilled'
          ? (rfqsResult.value?.length ?? 0)
          : (profileResult.status === 'fulfilled' ? profileResult.value?.procurementStats?.activeRfqs ?? 0 : 0);

      setActivityStats({
        orders: ordersCount,
        rfqs: rfqsCount,
        reviews: 0,
      });
    } catch {
      const currentUser = (user as any) || authStore.getUser();
      if (!currentUser?.phone && !currentUser?.fullName) {
        setProfileError('Unable to load profile details');
      }
    }
  }, [user, dispatch]);

  // Screen focus listener: Re-checks session whenever user returns to Account
  useFocusEffect(
    useCallback(() => {
      const authed = syncAuthState();
      if (authed) {
        fetchLiveProfileData();
      } else {
        setLiveProfile(null);
        setProfileError(null);
      }
    }, [syncAuthState, fetchLiveProfileData])
  );

  // AppState listener: Preserves state across background, phone lock/unlock & app resume
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const authed = syncAuthState();
        if (authed) {
          fetchLiveProfileData();
        }
      }
    });
    return () => sub.remove();
  }, [syncAuthState, fetchLiveProfileData]);

  // Synchronize whenever Redux user updates
  useEffect(() => {
    const authed = authStore.isAuthenticated();
    setIsAuthenticated(authed);
    setIsAuthChecking(false);
  }, [user]);

  const handleProfileRefresh = useCallback(async () => {
    if (!authStore.isAuthenticated()) return;
    setIsProfileRefreshing(true);
    try {
      await Promise.allSettled([
        fetchLiveProfileData(),
        cartApi.getCart(),
      ]);
    } catch {
      // Graceful fallback
    } finally {
      setIsProfileRefreshing(false);
    }
  }, [fetchLiveProfileData]);

  // Real Customer Data extraction (No mocks, no hardcoded values)
  const anyUser = user as any;
  const storedUser = authStore.getUser() as any;

  const liveName = liveProfile?.fullName || (liveProfile as any)?.name;
  const reduxName = anyUser?.fullName || anyUser?.name;
  const storedName = storedUser?.fullName || storedUser?.name;

  const rawPhone = anyUser?.phone || liveProfile?.phone || storedUser?.phone || '';
  const registeredName = rawPhone ? authStore.getRegisteredUserName(rawPhone) : null;

  const rawName =
    (!isGenericName(reduxName) ? reduxName : null) ||
    (!isGenericName(liveName) ? liveName : null) ||
    (!isGenericName(storedName) ? storedName : null) ||
    (!isGenericName(registeredName) ? registeredName : null);

  const customerName = rawName || 'Customer';
  const customerPhone = formatPhoneNumber(rawPhone);
  const company = anyUser?.businessProfile?.companyName || anyUser?.businessName || anyUser?.companyName || (liveProfile as any)?.business?.companyName || '';

  const rawEmail = anyUser?.email || liveProfile?.email || storedUser?.email || '';
  const customerEmail = isValidUserEmail(rawEmail) ? rawEmail.trim() : null;

  const userAvatar = anyUser?.avatar || anyUser?.profileImage || anyUser?.photoURL || (liveProfile as any)?.avatar || null;

  const initials = (customerName || 'HM')
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSignOut = () => {
    setSignOutModalVisible(true);
  };

  const handleConfirmLogout = async () => {
    setSignOutModalVisible(false);
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('[ProfileScreen] Firebase signOut notice:', err);
    }
    await authStore.logout();
    dispatch(clearCart());
    dispatch(logoutAction());
    setIsAuthenticated(false);
    setLiveProfile(null);
    setProfileError(null);
    setActivityStats({ orders: 0, rfqs: 0, reviews: 0 });
    // User remains in Account screen with State 1 (LOGIN / SIGNUP) rendered
  };

  // ── Account Menu Items ──
  // Kept only: My Orders, My Profile, My Addresses
  const accountMenuItems: MenuItem[] = [
    {
      title: 'My Orders',
      icon: 'cube-outline',
      tint: '#3B82F6',
      subtitle: 'Track orders & invoices',
      onPress: () => {
        if (isAuthenticated) {
          navigation.navigate('OrderHistory');
        } else {
          navigation.navigate('Login', { returnScreen: 'ProfileTab' });
        }
      },
    },
    {
      title: 'My Profile',
      icon: 'person-outline',
      tint: '#10B981',
      subtitle: 'Personal & business details',
      onPress: () => {
        if (isAuthenticated) {
          navigation.navigate('BusinessProfile');
        } else {
          navigation.navigate('Login', { returnScreen: 'ProfileTab' });
        }
      },
    },
    {
      title: 'My Addresses',
      icon: 'location-outline',
      tint: '#F59E0B',
      subtitle: 'Delivery locations',
      onPress: () => {
        if (isAuthenticated) {
          navigation.navigate('Addresses');
        } else {
          navigation.navigate('Login', { returnScreen: 'ProfileTab' });
        }
      },
    },
    {
      title: 'Tax Invoices',
      icon: 'receipt-outline',
      tint: '#8B5CF6',
      subtitle: 'GST tax invoices & PDF downloads',
      onPress: () => {
        if (isAuthenticated) {
          navigation.navigate('TaxInvoices');
        } else {
          navigation.navigate('Login', { returnScreen: 'TaxInvoices' });
        }
      },
    },
    {
      title: 'Support Tickets',
      icon: 'chatbubbles-outline',
      tint: '#EF4444',
      subtitle: 'Complaints, delivery & queries',
      onPress: () => {
        if (isAuthenticated) {
          navigation.navigate('SupportTickets');
        } else {
          navigation.navigate('Login', { returnScreen: 'SupportTickets' });
        }
      },
    },
  ];

  return (
    <Screen scrollable onRefresh={handleProfileRefresh} refreshing={isProfileRefreshing}>
      <Header
        title="My Account"
        showBack={false}
        showNotification
        onNotificationPress={() => navigation.navigate('Notifications')}
      />

      {/* ── Top Dynamic Section ── */}
      {isAuthChecking ? (
        /* Loading / Skeleton State (prevents UI flickering during session restoration) */
        <View
          style={[
            pStyles.skeletonCard,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.cardBorder,
            },
          ]}
        >
          <View
            style={[
              pStyles.skeletonAvatar,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
            ]}
          />
          <View style={pStyles.skeletonCol}>
            <View
              style={[
                pStyles.skeletonLine1,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' },
              ]}
            />
            <View
              style={[
                pStyles.skeletonLine2,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' },
              ]}
            />
          </View>
          <ActivityIndicator size="small" color="#E31E24" />
        </View>
      ) : !isAuthenticated ? (
        /* STATE 1 — USER NOT LOGGED IN: LOGIN / SIGNUP CARD */
        <TouchableOpacity
          style={[
            pStyles.loginSignupCard,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: isDark ? 'rgba(227, 30, 36, 0.35)' : '#FECACA',
            },
          ]}
          activeOpacity={0.82}
          onPress={() => navigation.navigate('Login', { returnScreen: 'ProfileTab' })}
        >
          <View
            style={[
              pStyles.loginUserCircle,
              { backgroundColor: isDark ? 'rgba(227, 30, 36, 0.15)' : '#FEE2E2' },
            ]}
          >
            <Ionicons name="person" size={26} color="#E31E24" />
          </View>
          <View style={pStyles.loginCardCol}>
            <Text style={[pStyles.loginCardTitle, { color: theme.colors.textPrimary }]}>
              LOGIN / SIGNUP
            </Text>
            <Text style={[pStyles.loginCardSubtitle, { color: theme.colors.textSecondary }]}>
              Sign in or create account to manage orders
            </Text>
          </View>
          <View
            style={[
              pStyles.loginChevronCircle,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' },
            ]}
          >
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>
      ) : profileError && !customerPhone ? (
        /* ERROR STATE WITH RETRY (when details cannot load and no cached user) */
        <View
          style={[
            pStyles.errorCard,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
            },
          ]}
        >
          <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
          <Text style={[pStyles.errorCardTitle, { color: theme.colors.textPrimary }]}>
            Unable to load profile details
          </Text>
          <Text style={[pStyles.errorCardSubtitle, { color: theme.colors.textSecondary }]}>
            Please check your connection and try again.
          </Text>
          <TouchableOpacity
            style={pStyles.errorRetryBtn}
            onPress={fetchLiveProfileData}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={pStyles.errorRetryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* STATE 2 — USER LOGGED IN: CUSTOMER PROFILE CARD */
        <View
          style={[
            pStyles.customerCard,
            {
              borderColor: theme.colors.cardBorder,
              backgroundColor: theme.colors.cardBackground,
            },
          ]}
        >
          {/* Top-Right Pencil Edit Button */}
          <TouchableOpacity
            onPress={() => navigation.navigate('BusinessProfile')}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={pStyles.pencilEditBtn}
          >
            <View
              style={[
                pStyles.pencilEditBtnInner,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <Ionicons name="pencil" size={14} color={theme.colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={pStyles.customerMainRow}>
            {/* Minimalist Avatar with Verification Badge */}
            <TouchableOpacity
              onPress={() => navigation.navigate('BusinessProfile')}
              activeOpacity={0.85}
              style={pStyles.avatarWrapper}
            >
              <View
                style={[
                  pStyles.avatarRing,
                  {
                    borderColor: '#E31E24',
                    backgroundColor: theme.colors.surfaceVariant,
                  },
                ]}
              >
                {userAvatar ? (
                  <Image source={{ uri: userAvatar }} style={pStyles.avatarPhoto} contentFit="cover" />
                ) : (
                  <LinearGradient
                    colors={['#E31E24', '#C4181D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={pStyles.avatarInitialsBox}
                  >
                    <Text style={pStyles.avatarInitialsText}>{initials}</Text>
                  </LinearGradient>
                )}
              </View>
              <View
                style={[
                  pStyles.avatarVerifiedBadge,
                  { borderColor: theme.colors.cardBackground },
                ]}
              >
                <Ionicons name="checkmark-sharp" size={10} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {/* Customer Details Column */}
            <View style={pStyles.customerMetaCol}>
              <Text
                style={[pStyles.customerNameText, { color: theme.colors.textPrimary }]}
                numberOfLines={1}
              >
                {customerName}
              </Text>

              {Boolean(customerPhone) && (
                <View style={pStyles.metaRow}>
                  <Ionicons
                    name="call-outline"
                    size={13}
                    color={theme.colors.textSecondary}
                    style={pStyles.metaIcon}
                  />
                  <Text
                    style={[pStyles.customerPhoneText, { color: theme.colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {customerPhone}
                  </Text>
                </View>
              )}

              {Boolean(customerEmail) && (
                <View style={pStyles.metaRow}>
                  <Ionicons
                    name="mail-outline"
                    size={13}
                    color={theme.colors.textTertiary}
                    style={pStyles.metaIcon}
                  />
                  <Text
                    style={[pStyles.customerEmailText, { color: theme.colors.textTertiary }]}
                    numberOfLines={1}
                  >
                    {customerEmail}
                  </Text>
                </View>
              )}

              {Boolean(company) && (
                <View style={pStyles.metaRow}>
                  <Ionicons
                    name="business-outline"
                    size={13}
                    color={theme.colors.textTertiary}
                    style={pStyles.metaIcon}
                  />
                  <Text
                    style={[pStyles.customerCompanyText, { color: theme.colors.textTertiary }]}
                    numberOfLines={1}
                  >
                    {company}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* View Profile Action */}
          <TouchableOpacity
            style={[
              pStyles.viewProfileRow,
              {
                borderTopColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
            onPress={() => navigation.navigate('BusinessProfile')}
            activeOpacity={0.7}
          >
            <Text style={[pStyles.viewProfileText, { color: '#E31E24' }]}>View Profile</Text>
            <Ionicons name="chevron-forward" size={14} color="#E31E24" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Main Account Menu: My Orders, My Profile, My Addresses ── */}
      <MenuGroup label="Account" items={accountMenuItems} navigation={navigation} theme={theme} />

      {/* ── Logout Button at Bottom ── */}
      {isAuthenticated && (
        <View style={pStyles.logoutSection}>
          <TouchableOpacity
            style={[
              pStyles.logoutBtn,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
              },
            ]}
            onPress={handleSignOut}
            activeOpacity={0.75}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={pStyles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* App Version Tag */}
      <View style={pStyles.versionSection}>
        <Text style={[pStyles.versionText, { color: theme.colors.textTertiary }]}>
          HINCH MART v1.0.0
        </Text>
      </View>

      {/* Custom Dynamic Sign Out Confirmation Modal */}
      <Modal
        visible={signOutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSignOutModalVisible(false)}
      >
        <View style={pStyles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setSignOutModalVisible(false)}
          />

          <View
            style={[
              pStyles.modalCard,
              {
                backgroundColor: theme.colors.cardBackground,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              },
            ]}
          >
            {/* Red Caution Glow Icon */}
            <View style={pStyles.modalIconGlow}>
              <View style={pStyles.modalIconInner}>
                <Ionicons name="log-out" size={26} color="#EF4444" />
              </View>
            </View>

            <Text style={[pStyles.modalTitle, { color: theme.colors.textPrimary }]}>
              Logout
            </Text>

            <Text style={[pStyles.modalMessage, { color: theme.colors.textSecondary }]}>
              Are you sure you want to logout?
            </Text>

            {/* Current Account Pill */}
            {Boolean(customerName) && (
              <View style={[pStyles.modalAccountBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Avatar name={customerName} size={38} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text numberOfLines={1} style={[pStyles.modalAccountName, { color: theme.colors.textPrimary }]}>
                    {customerName}
                  </Text>
                  {Boolean(customerPhone) && (
                    <Text numberOfLines={1} style={[pStyles.modalAccountCompany, { color: theme.colors.textTertiary }]}>
                      {customerPhone}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={pStyles.modalActionsRow}>
              <TouchableOpacity
                style={[
                  pStyles.modalCancelBtn,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => setSignOutModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={[pStyles.modalCancelText, { color: theme.colors.textPrimary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={pStyles.modalConfirmBtn}
                onPress={handleConfirmLogout}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={pStyles.confirmGradient}
                >
                  <Ionicons name="log-out-outline" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={pStyles.modalConfirmText}>Logout</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const actStyles = StyleSheet.create({
  activitySection: {
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  activityLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 0.75,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 }
      : { elevation: 2 }),
  },
  statIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statCount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    lineHeight: 22,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 0.2,
  },
});

const pStyles = StyleSheet.create({
  loginSignupCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#E31E24', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8 }
      : { elevation: 2 }),
  },
  loginUserCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  loginCardCol: {
    flex: 1,
    justifyContent: 'center',
  },
  loginCardTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  loginCardSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  loginChevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  customerCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#071426', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10 }
      : { elevation: 3 }),
  },
  customerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  customerMetaCol: {
    flex: 1,
    paddingRight: 28,
    justifyContent: 'center',
  },
  customerNameText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 2,
  },
  customerPhoneText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 17,
  },
  customerEmailText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  customerCompanyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  viewProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  viewProfileText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  skeletonCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
  },
  skeletonCol: {
    flex: 1,
    justifyContent: 'center',
  },
  skeletonLine1: {
    height: 16,
    borderRadius: 8,
    width: '60%',
    marginBottom: 8,
  },
  skeletonLine2: {
    height: 12,
    borderRadius: 6,
    width: '40%',
  },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  errorCardSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    marginTop: 4,
    textAlign: 'center',
  },
  errorRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E31E24',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 12,
  },
  errorRetryText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  versionSection: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 36,
    width: '100%',
    alignItems: 'center',
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#071426', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10 }
      : { elevation: 3 }),
  },
  pencilEditBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
  },
  pencilEditBtnInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInnerContent: {
    padding: 16,
  },
  heroProfileMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarWrapper: {
    marginRight: 14,
    position: 'relative',
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E31E24',
  },
  avatarPhoto: {
    width: '100%',
    height: '100%',
  },
  avatarInitialsBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  avatarVerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  heroMetaCol: {
    flex: 1,
    paddingRight: 28,
    minHeight: 64,
    justifyContent: 'center',
  },
  heroMemberHeading: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    lineHeight: 22,
    marginBottom: 2,
  },
  heroCompanyName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 17,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  metaIcon: {
    marginRight: 6,
  },
  heroInfoValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  pillBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  vipTierLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vipCrownIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: 'rgba(253, 185, 19, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipTierTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11.5,
    color: '#FDB913',
  },
  vipTierSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#94A3B8',
  },
  goldMemberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goldDiamondIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldMemberTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13.5,
    color: '#F59E0B',
  },
  goldMemberSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  goldRosetteBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 38,
    height: 38,
  },
  goldMedalCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    borderWidth: 2,
    borderColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  rosetteRibbonRow: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    gap: 4,
    zIndex: 1,
  },
  rosetteRibbonLeg: {
    width: 6,
    height: 14,
    backgroundColor: '#2563EB',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },

  // Appearance Card Directly at top of screen
  appearanceTopCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1.5,
  },
  appearanceTopTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15.5,
    marginBottom: 14,
    paddingLeft: 2,
  },
  horizontalThemeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  horizontalThemeCard: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  horizontalThemeLabel: {
    fontSize: 13,
  },

  logoutSection: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1.2,
    width: '100%',
    gap: 8,
  },
  logoutText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#EF4444',
  },
  versionText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 16,
  },
  // Custom Sign Out Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24 }
      : { elevation: 10 }),
  },
  modalIconGlow: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  modalIconInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 6,
  },
  modalMessage: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  modalAccountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 22,
  },
  modalAccountName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
  },
  modalAccountCompany: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 1,
  },
  modalActionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14.5,
  },
  modalConfirmBtn: {
    flex: 1.2,
    borderRadius: 14,
    overflow: 'hidden',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }
      : { elevation: 3 }),
  },
  confirmGradient: {
    flexDirection: 'row',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14.5,
    color: '#FFFFFF',
  },
});

export function SettingsScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();

  // Persistent preferences
  const [biometricsEnabled, setBiometricsEnabled] = useState(() => mmkvStorage.getBoolean('hm_setting_biometrics') ?? true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => mmkvStorage.getBoolean('hm_setting_2fa') ?? true);
  const [appLockEnabled, setAppLockEnabled] = useState(() => mmkvStorage.getBoolean('hm_setting_applock') ?? false);
  const [pushNotifs, setPushNotifs] = useState(() => mmkvStorage.getBoolean('hm_setting_push') ?? true);
  const [smsAlerts, setSmsAlerts] = useState(() => mmkvStorage.getBoolean('hm_setting_sms') ?? true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(() => mmkvStorage.getBoolean('hm_setting_whatsapp') ?? true);
  const [emailStatements, setEmailStatements] = useState(() => mmkvStorage.getBoolean('hm_setting_email') ?? true);

  // Modals & action states
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [twoFactorModalVisible, setTwoFactorModalVisible] = useState(false);
  const [sessionsModalVisible, setSessionsModalVisible] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Cache state
  const [cacheSize, setCacheSize] = useState('28.4 MB');
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheClearedSuccess, setCacheClearedSuccess] = useState(false);

  // Data download state
  const [isDownloadingData, setIsDownloadingData] = useState(false);

  // Toast / feedback message banner
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleToggleBiometrics = (val: boolean) => {
    setBiometricsEnabled(val);
    mmkvStorage.setBoolean('hm_setting_biometrics', val);
    showToast(val ? 'Biometric Authentication enabled' : 'Biometric Authentication disabled');
  };

  const handleToggle2FA = (val: boolean) => {
    if (val) {
      setTwoFactorModalVisible(true);
    } else {
      setTwoFactorEnabled(false);
      mmkvStorage.setBoolean('hm_setting_2fa', false);
      showToast('Two-Factor Authentication disabled');
    }
  };

  const handleToggleAppLock = (val: boolean) => {
    setAppLockEnabled(val);
    mmkvStorage.setBoolean('hm_setting_applock', val);
    showToast(val ? 'App Security Lock active' : 'App Security Lock disabled');
  };

  const handleTogglePush = async (val: boolean) => {
    setPushNotifs(val);
    mmkvStorage.setBoolean('hm_setting_push', val);
    if (val) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        showToast('Please enable notifications in device settings');
        return;
      }
    }
    showToast(val ? 'Push Notifications enabled' : 'Push Notifications silenced');
  };

  const handleToggleSms = (val: boolean) => {
    setSmsAlerts(val);
    mmkvStorage.setBoolean('hm_setting_sms', val);
  };

  const handleToggleWhatsapp = (val: boolean) => {
    setWhatsappAlerts(val);
    mmkvStorage.setBoolean('hm_setting_whatsapp', val);
    showToast(val ? 'WhatsApp Order Updates enabled' : 'WhatsApp updates turned off');
  };

  const handleToggleEmail = (val: boolean) => {
    setEmailStatements(val);
    mmkvStorage.setBoolean('hm_setting_email', val);
  };

  const handleChangePasswordSubmit = async () => {
    setPasswordError('');
    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setIsSavingPassword(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSavingPassword(false);
    setPasswordSuccess(true);

    setTimeout(() => {
      setPasswordSuccess(false);
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully');
    }, 1500);
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setCacheSize('0.0 KB');
    setIsClearingCache(false);
    setCacheClearedSuccess(true);
    showToast('Temporary app cache successfully cleared (28.4 MB freed)');
    setTimeout(() => setCacheClearedSuccess(false), 3000);
  };

  const handleDownloadData = async () => {
    setIsDownloadingData(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsDownloadingData(false);
    showToast('Account data & invoice archive generated successfully');
  };

  // Password strength helper
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: 'None', color: '#94A3B8', width: '0%' };
    if (pwd.length < 6) return { label: 'Weak', color: '#EF4444', width: '30%' };
    if (pwd.length < 10) return { label: 'Medium', color: '#F59E0B', width: '65%' };
    return { label: 'Strong', color: '#10B981', width: '100%' };
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <Screen scrollable>
      <Header title="Settings & Security" showBack onBackPress={() => navigation.goBack()} />

      {/* Floating Action Banner Feedback */}
      {Boolean(toastMessage) && (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 8,
            padding: 12,
            borderRadius: 12,
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5',
            borderWidth: 1,
            borderColor: '#10B981',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 8 }} />
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: isDark ? '#A7F3D0' : '#065F46', flex: 1 }}>
            {toastMessage}
          </Text>
        </View>
      )}

      <View style={{ padding: 16, gap: 16 }}>
        {/* ── 1. Security & Authentication Section ── */}
        <Card variant="outlined" style={{ padding: 18, borderRadius: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(139, 92, 246, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="shield-checkmark" size={18} color="#8B5CF6" />
            </View>
            <View>
              <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15.5, color: theme.colors.textPrimary }}>
                Security & Authentication
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11.5, color: theme.colors.textTertiary }}>
                Protect your account, transactions & credentials
              </Text>
            </View>
          </View>

          <View style={{ gap: 14 }}>
            {/* Biometric Login */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: theme.colors.textPrimary }}>
                    Biometric Login
                  </Text>
                  {biometricsEnabled && (
                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#10B981' }}>ACTIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 }}>
                  Use Fingerprint / Face ID for instant sign-in
                </Text>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={handleToggleBiometrics}
                trackColor={{ false: '#CBD5E1', true: '#8B5CF6' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#F1F5F9' }} />

            {/* Two-Factor Authentication (2FA) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: theme.colors.textPrimary }}>
                    Two-Factor Authentication (2FA)
                  </Text>
                  {twoFactorEnabled && (
                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#10B981' }}>PROTECTED</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 }}>
                  Require SMS OTP verification for sensitive orders & payments
                </Text>
              </View>
              <Switch
                value={twoFactorEnabled}
                onValueChange={handleToggle2FA}
                trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#F1F5F9' }} />

            {/* App Security Lock */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: theme.colors.textPrimary }}>
                  App Security Lock
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 }}>
                  Require authentication when reopening the app
                </Text>
              </View>
              <Switch
                value={appLockEnabled}
                onValueChange={handleToggleAppLock}
                trackColor={{ false: '#CBD5E1', true: '#F59E0B' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#F1F5F9' }} />

            {/* Change Password Row */}
            <TouchableOpacity
              onPress={() => {
                setPasswordError('');
                setPasswordModalVisible(true);
              }}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="key-outline" size={19} color="#8B5CF6" />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: theme.colors.textPrimary }}>
                  Change Account Password
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={theme.colors.textTertiary} />
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#F1F5F9' }} />

            {/* Active Sessions & Logged-in Devices */}
            <TouchableOpacity
              onPress={() => setSessionsModalVisible(true)}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="phone-portrait-outline" size={19} color="#3B82F6" />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: theme.colors.textPrimary }}>
                  Active Logged-in Devices & Sessions
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11.5, color: '#10B981' }}>2 Active</Text>
                <Ionicons name="chevron-forward" size={17} color={theme.colors.textTertiary} />
              </View>
            </TouchableOpacity>
          </View>
        </Card>

        {/* ── 2. Notifications & Communications Preferences ── */}
        <Card variant="outlined" style={{ padding: 18, borderRadius: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(59, 130, 246, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="notifications" size={18} color="#3B82F6" />
            </View>
            <View>
              <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15.5, color: theme.colors.textPrimary }}>
                Notifications & Alerts
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11.5, color: theme.colors.textTertiary }}>
                Choose how and when you receive order updates
              </Text>
            </View>
          </View>

          <View style={{ gap: 14 }}>
            {/* Push Notifications */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: theme.colors.textPrimary }}>
                  Push Notifications
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 }}>
                  Live delivery, quotation & RFQ status notifications
                </Text>
              </View>
              <Switch
                value={pushNotifs}
                onValueChange={handleTogglePush}
                trackColor={{ false: '#CBD5E1', true: '#3B82F6' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#F1F5F9' }} />

            {/* WhatsApp Updates */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: theme.colors.textPrimary }}>
                    WhatsApp Updates
                  </Text>
                </View>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 }}>
                  Direct invoice dispatch & vehicle tracking on WhatsApp
                </Text>
              </View>
              <Switch
                value={whatsappAlerts}
                onValueChange={handleToggleWhatsapp}
                trackColor={{ false: '#CBD5E1', true: '#25D366' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#F1F5F9' }} />

            {/* SMS Order Alerts */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: theme.colors.textPrimary }}>
                  SMS Order Alerts
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 }}>
                  Receive dispatch OTPs & payment confirmations via SMS
                </Text>
              </View>
              <Switch
                value={smsAlerts}
                onValueChange={handleToggleSms}
                trackColor={{ false: '#CBD5E1', true: '#3B82F6' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#F1F5F9' }} />

            {/* Email Monthly Statements */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: theme.colors.textPrimary }}>
                  Email Monthly Statements
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 }}>
                  Consolidated GST billing & commercial procurement reports
                </Text>
              </View>
              <Switch
                value={emailStatements}
                onValueChange={handleToggleEmail}
                trackColor={{ false: '#CBD5E1', true: '#3B82F6' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </Card>

        {/* ── 3. Storage, Cache & Data Privacy ── */}
        <Card variant="outlined" style={{ padding: 18, borderRadius: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(16, 185, 129, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="server-outline" size={18} color="#10B981" />
            </View>
            <View>
              <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15.5, color: theme.colors.textPrimary }}>
                Storage & Data Privacy
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11.5, color: theme.colors.textTertiary }}>
                Manage local cached data and commercial records
              </Text>
            </View>
          </View>

          <View style={{ gap: 14 }}>
            {/* Clear Cache */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: theme.colors.textPrimary }}>
                  App Cache & Temporary Files
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 }}>
                  Occupying {cacheSize} of cached images & search indexes
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClearCache}
                disabled={isClearingCache || cacheSize === '0.0 KB'}
                activeOpacity={0.8}
                style={{
                  paddingVertical: 7,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: cacheSize === '0.0 KB' ? (isDark ? '#334155' : '#E2E8F0') : '#0038A8',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {isClearingCache ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name={cacheSize === '0.0 KB' ? 'checkmark' : 'trash-outline'} size={14} color={cacheSize === '0.0 KB' ? '#94A3B8' : '#FFFFFF'} />
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: cacheSize === '0.0 KB' ? '#94A3B8' : '#FFFFFF' }}>
                      {cacheSize === '0.0 KB' ? 'Cleared' : 'Clear Cache'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#F1F5F9' }} />

            {/* Download Data */}
            <TouchableOpacity
              onPress={handleDownloadData}
              disabled={isDownloadingData}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="cloud-download-outline" size={19} color="#10B981" />
                <View>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: theme.colors.textPrimary }}>
                    Download My Account Data
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11.5, color: theme.colors.textTertiary }}>
                    Export RFQ history, invoices & orders as PDF/JSON
                  </Text>
                </View>
              </View>
              {isDownloadingData ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Ionicons name="chevron-forward" size={17} color={theme.colors.textTertiary} />
              )}
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#F1F5F9' }} />

            {/* Privacy Policy */}
            <TouchableOpacity
              onPress={() => navigation.navigate('PrivacyPolicy')}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="document-lock-outline" size={19} color="#64748B" />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: theme.colors.textPrimary }}>
                  HINCH Privacy Policy & Data Security
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </Card>
      </View>

      {/* ── Change Password Modal ── */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', padding: 20 }}
          activeOpacity={1}
          onPress={() => setPasswordModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderRadius: 22,
              padding: 22,
              borderWidth: 1,
              borderColor: isDark ? '#334155' : '#E2E8F0',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="key" size={20} color="#8B5CF6" />
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: theme.colors.textPrimary }}>
                  Change Password
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {passwordSuccess ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Ionicons name="checkmark-circle" size={48} color="#10B981" style={{ marginBottom: 10 }} />
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: theme.colors.textPrimary }}>
                  Password Changed Successfully!
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12.5, color: theme.colors.textTertiary, marginTop: 4 }}>
                  Your new credentials are now active.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {Boolean(passwordError) && (
                  <View style={{ padding: 10, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.12)', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: '#EF4444' }}>{passwordError}</Text>
                  </View>
                )}

                {/* Current Password */}
                <View>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: theme.colors.textPrimary, marginBottom: 4 }}>
                    Current Password
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: isDark ? '#334155' : '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
                    <TextInput
                      secureTextEntry={!showPassword}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Enter current password"
                      placeholderTextColor="#94A3B8"
                      style={{ flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13.5, color: theme.colors.textPrimary }}
                    />
                  </View>
                </View>

                {/* New Password */}
                <View>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: theme.colors.textPrimary, marginBottom: 4 }}>
                    New Password
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: isDark ? '#334155' : '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
                    <TextInput
                      secureTextEntry={!showPassword}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password (min. 6 chars)"
                      placeholderTextColor="#94A3B8"
                      style={{ flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13.5, color: theme.colors.textPrimary }}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                  {/* Strength bar */}
                  {Boolean(newPassword) && (
                    <View style={{ marginTop: 6, gap: 4 }}>
                      <View style={{ height: 4, borderRadius: 2, backgroundColor: isDark ? '#334155' : '#E2E8F0', overflow: 'hidden' }}>
                        <View style={{ width: strength.width as any, height: '100%', backgroundColor: strength.color }} />
                      </View>
                      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: strength.color }}>
                        Strength: {strength.label}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Confirm Password */}
                <View>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: theme.colors.textPrimary, marginBottom: 4 }}>
                    Confirm New Password
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: isDark ? '#334155' : '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
                    <TextInput
                      secureTextEntry={!showPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter new password"
                      placeholderTextColor="#94A3B8"
                      style={{ flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13.5, color: theme.colors.textPrimary }}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleChangePasswordSubmit}
                  disabled={isSavingPassword}
                  activeOpacity={0.85}
                  style={{
                    marginTop: 8,
                    backgroundColor: '#8B5CF6',
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSavingPassword ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#FFFFFF' }}>
                      Update Password
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Active Sessions Modal ── */}
      <Modal
        visible={sessionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSessionsModalVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', padding: 20 }}
          activeOpacity={1}
          onPress={() => setSessionsModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderRadius: 22,
              padding: 22,
              borderWidth: 1,
              borderColor: isDark ? '#334155' : '#E2E8F0',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="phone-portrait" size={20} color="#3B82F6" />
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: theme.colors.textPrimary }}>
                  Active Device Sessions
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSessionsModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12, marginBottom: 18 }}>
              {/* Current Device */}
              <View style={{ padding: 12, borderRadius: 12, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderWidth: 1, borderColor: '#10B981' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: theme.colors.textPrimary }}>
                    Android Mobile (This Device)
                  </Text>
                  <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#10B981' }}>ACTIVE NOW</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11.5, color: theme.colors.textTertiary, marginTop: 4 }}>
                  Hyderabad, India • App Version 1.0.2
                </Text>
              </View>

              {/* Web Session */}
              <View style={{ padding: 12, borderRadius: 12, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderWidth: 1, borderColor: isDark ? '#334155' : '#E2E8F0' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: theme.colors.textPrimary }}>
                    HINCH B2B Web Portal
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: theme.colors.textTertiary }}>
                    2 hrs ago
                  </Text>
                </View>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11.5, color: theme.colors.textTertiary, marginTop: 4 }}>
                  Chrome on Windows • IP 183.82.xxx.xxx
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                setSessionsModalVisible(false);
                showToast('Terminated 1 background web session');
              }}
              activeOpacity={0.85}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                borderWidth: 1,
                borderColor: 'rgba(239, 68, 68, 0.3)',
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13.5, color: '#EF4444' }}>
                Log Out All Other Devices
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── 2FA Setup Modal ── */}
      <Modal
        visible={twoFactorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTwoFactorModalVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', padding: 20 }}
          activeOpacity={1}
          onPress={() => setTwoFactorModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderRadius: 22,
              padding: 22,
              borderWidth: 1,
              borderColor: isDark ? '#334155' : '#E2E8F0',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: theme.colors.textPrimary }}>
                  Two-Factor Authentication
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTwoFactorModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: theme.colors.textTertiary, lineHeight: 19, marginBottom: 14 }}>
              Two-Factor Authentication adds an extra layer of security to your B2B account. You will receive a 6-digit SMS OTP whenever you log in or place high-value purchase orders.
            </Text>

            <View style={{ padding: 12, borderRadius: 12, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', marginBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="phone-portrait-outline" size={20} color="#3B82F6" />
              <View>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: theme.colors.textPrimary }}>
                  Linked Mobile Number
                </Text>
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: '#10B981' }}>
                  +91 ••••• •••10 (Verified)
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                setTwoFactorEnabled(true);
                mmkvStorage.setBoolean('hm_setting_2fa', true);
                setTwoFactorModalVisible(false);
                showToast('Two-Factor Authentication is now active');
              }}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#10B981',
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#FFFFFF' }}>
                Enable 2FA Protection
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}

export function AppearanceScreen({ navigation }: any) {
  const { theme, isDark, themeMode, setThemeMode } = useTheme();
  const dispatch = useAppDispatch();

  const themeOptions = [
    {
      mode: 'auto' as const,
      icon: 'time-outline' as const,
      label: 'Auto',
      desc: 'Day (Light) / Night (Dark)',
    },
    {
      mode: 'light' as const,
      icon: 'sunny' as const,
      label: 'Light',
      desc: 'Crisp light background',
    },
    {
      mode: 'dark' as const,
      icon: 'moon' as const,
      label: 'Dark',
      desc: 'Deep sleek dark theme',
    },
  ];

  return (
    <Screen scrollable>
      <Header title="Appearance" showBack onBackPress={() => navigation.goBack()} />

      <View style={{ padding: 16, gap: 16 }}>
        {/* Horizontal 3-card selector matching mockup */}
        <Card variant="outlined" style={{ padding: 18, borderRadius: 20, backgroundColor: theme.colors.cardBackground }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {themeOptions.map((opt) => {
              const isSelected = themeMode === opt.mode;
              return (
                <TouchableOpacity
                  key={opt.mode}
                  onPress={() => {
                    setThemeMode(opt.mode);
                    dispatch(setReduxThemeMode(opt.mode));
                  }}
                  activeOpacity={0.75}
                  style={{
                    flex: 1,
                    paddingVertical: 18,
                    paddingHorizontal: 8,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected
                      ? (isDark ? 'rgba(227, 30, 36, 0.15)' : '#FEF2F2')
                      : (isDark ? '#1E293B' : '#F1F5F9'),
                    borderWidth: 1.5,
                    borderColor: isSelected
                      ? '#E31E24'
                      : (isDark ? '#334155' : 'transparent'),
                  }}
                >
                  <Ionicons
                    name={opt.icon}
                    size={28}
                    color={isSelected ? '#E31E24' : (isDark ? '#94A3B8' : '#64748B')}
                    style={{ marginBottom: 8 }}
                  />
                  <Text
                    style={{
                      fontFamily: isSelected ? 'Poppins_600SemiBold' : 'Inter_600SemiBold',
                      fontSize: 13,
                      color: isSelected
                        ? '#E31E24'
                        : (isDark ? '#CBD5E1' : '#334155'),
                    }}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Inter_400Regular',
                      fontSize: 10,
                      textAlign: 'center',
                      marginTop: 4,
                      color: isDark ? '#94A3B8' : '#64748B',
                    }}
                  >
                    {opt.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>
      </View>
    </Screen>
  );
}
