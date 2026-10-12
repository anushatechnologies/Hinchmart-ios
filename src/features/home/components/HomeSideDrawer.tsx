/**
 * HINCH MART — Home Screen Left Side Drawer / Side Menu
 *
 * Implements pixel-perfect left sliding navigation drawer matching reference specifications:
 * 1. LOGIN / SIGNUP card at the top (light card, rounded corners, clean typography)
 * 2. Home (Active state highlighted in brand color)
 * 3. Shop by Category
 * 4. My Account
 * 5. My Orders
 * --- Subtle Separator 1 ---
 * 6. Store
 * 7. About Hinch Mart
 * 8. Contact Us
 * 9. Cancellation, Returns & Refund
 * 10. Terms & Conditions
 * 11. Dark Theme (integrated with theme system & interactive switch)
 * --- Subtle Separator 2 ---
 * 12. Buying Guides
 *
 * Footer:
 * All rights reserved | Ver X.X.X (dynamically retrieved from appUpdateService)
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  BackHandler,
  ScrollView,
  Platform,
  Switch,
  TouchableWithoutFeedback,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme';
import { useAppSelector } from '../../../redux/hooks';
import { getInstalledVersion } from '../../../services/appUpdateService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 340);

export interface HomeSideDrawerProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
  onSelectStore?: () => void;
  activeRouteName?: string;
}

interface MenuItemConfig {
  id: string;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  activeIconName?: keyof typeof Ionicons.glyphMap;
  isSeparatorAfter?: boolean;
  isDarkThemeToggle?: boolean;
  onPress: () => void;
}

export function HomeSideDrawer({
  visible,
  onClose,
  navigation,
  onSelectStore,
  activeRouteName = 'Home',
}: HomeSideDrawerProps) {
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  // Dynamic app version from installed metadata
  const [appVersion] = useState<string>(() => getInstalledVersion());

  // Slide animation (translateX: -DRAWER_WIDTH -> 0)
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  // Backdrop opacity animation (0 -> 0.55)
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Track if modal is mounted in DOM
  const [isRendered, setIsRendered] = useState(visible);

  // Close with smooth slide-out animation before firing callback
  const handleClose = useCallback((callback?: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsRendered(false);
      onClose();
      if (callback) {
        callback();
      }
    });
  }, [slideAnim, backdropAnim, onClose]);

  // Handle open / close visibility changes
  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      slideAnim.setValue(-DRAWER_WIDTH);
      backdropAnim.setValue(0);

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0.54,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (isRendered) {
      handleClose();
    }
  }, [visible]);

  // Android hardware back button handler
  useEffect(() => {
    if (!visible) return;

    const backAction = () => {
      handleClose();
      return true; // prevent exiting the app
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [visible, handleClose]);

  // Auth / Header card press
  const handleAuthPress = () => {
    handleClose(() => {
      if (isAuthenticated) {
        navigation.navigate('MainTabs', { screen: 'ProfileTab' });
      } else {
        navigation.navigate('Login');
      }
    });
  };

  // Menu items list in exact specified order (Items 2 through 12, item 1 is header card)
  const menuItems: MenuItemConfig[] = [
    // 2. Home
    {
      id: 'home',
      label: 'Home',
      iconName: 'home-outline',
      activeIconName: 'home',
      onPress: () => {
        handleClose();
      },
    },
    // 3. Shop by Category
    {
      id: 'categories',
      label: 'Shop by Category',
      iconName: 'grid-outline',
      activeIconName: 'grid',
      onPress: () => {
        handleClose(() => {
          navigation.navigate('MainTabs', {
            screen: 'CategoriesTab',
            params: { categoryId: null, categoryName: undefined, navKey: Date.now() },
          });
        });
      },
    },
    // 4. My Account
    {
      id: 'account',
      label: 'My Account',
      iconName: 'person-outline',
      activeIconName: 'person',
      onPress: () => {
        handleClose(() => {
          if (isAuthenticated) {
            navigation.navigate('MainTabs', { screen: 'ProfileTab' });
          } else {
            navigation.navigate('Login');
          }
        });
      },
    },
    // 5. My Orders
    {
      id: 'orders',
      label: 'My Orders',
      iconName: 'receipt-outline',
      activeIconName: 'receipt',
      isSeparatorAfter: true, // Separator after Main group
      onPress: () => {
        handleClose(() => {
          if (isAuthenticated) {
            navigation.navigate('OrderHistory');
          } else {
            navigation.navigate('Login', { returnScreen: 'OrderHistory' });
          }
        });
      },
    },
    // 6. Store
    {
      id: 'store',
      label: 'Store',
      iconName: 'storefront-outline',
      activeIconName: 'storefront',
      onPress: () => {
        handleClose(() => {
          if (onSelectStore) {
            onSelectStore();
          } else {
            navigation.navigate('TwentyFourHourDelivery');
          }
        });
      },
    },
    // 7. About Hinch Mart
    {
      id: 'about',
      label: 'About Hinch Mart',
      iconName: 'information-circle-outline',
      activeIconName: 'information-circle',
      onPress: () => {
        handleClose(() => {
          navigation.navigate('About');
        });
      },
    },
    // 8. Contact Us
    {
      id: 'contact',
      label: 'Contact Us',
      iconName: 'call-outline',
      activeIconName: 'call',
      onPress: () => {
        handleClose(() => {
          navigation.navigate('HelpSupport');
        });
      },
    },
    // 9. Cancellation, Returns & Refund
    {
      id: 'cancellation',
      label: 'Cancellation, Returns & Refund',
      iconName: 'shield-checkmark-outline',
      activeIconName: 'shield-checkmark',
      onPress: () => {
        handleClose(() => {
          navigation.navigate('Terms');
        });
      },
    },
    // 10. Terms & Conditions
    {
      id: 'terms',
      label: 'Terms & Conditions',
      iconName: 'document-text-outline',
      activeIconName: 'document-text',
      onPress: () => {
        handleClose(() => {
          navigation.navigate('Terms');
        });
      },
    },
    // 11. Dark Theme
    {
      id: 'darkTheme',
      label: 'Dark Theme',
      iconName: isDark ? 'moon' : 'moon-outline',
      activeIconName: 'moon',
      isDarkThemeToggle: true,
      isSeparatorAfter: true, // Separator after Store/Information group
      onPress: () => {
        toggleTheme();
      },
    },
    // 12. Buying Guides
    {
      id: 'guides',
      label: 'Buying Guides',
      iconName: 'book-outline',
      activeIconName: 'book',
      onPress: () => {
        handleClose(() => {
          navigation.navigate('FAQ');
        });
      },
    },
  ];

  if (!isRendered) {
    return null;
  }

  const headerBgColor = isDark ? '#B71C1C' : '#E31E24';
  const drawerBgColor = isDark ? '#121212' : '#FFFFFF';
  const brandRed = isDark ? '#EF4444' : '#E31E24';

  return (
    <Modal
      transparent
      visible={isRendered}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => handleClose()}
    >
      <View style={styles.modalRoot}>
        {/* Semi-transparent backdrop overlay */}
        <TouchableWithoutFeedback onPress={() => handleClose()}>
          <Animated.View
            style={[
              styles.backdropOverlay,
              {
                opacity: backdropAnim,
              },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Sliding Drawer Container */}
        <Animated.View
          style={[
            styles.drawerContainer,
            {
              width: DRAWER_WIDTH,
              backgroundColor: drawerBgColor,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* ── 1. Drawer Header (Branded Red with Logo & Login/Signup Card) ── */}
          <View style={[styles.drawerHeader, { paddingTop: Math.max(insets.top, 16) + 10, backgroundColor: headerBgColor }]}>
            {/* Header Top Row: Logo & Close Button */}
            <View style={styles.headerTopRow}>
              <View style={styles.logoWrap}>
                <Image
                  source={require('../../../../assets/logo-white.png')}
                  style={styles.headerLogo}
                  contentFit="contain"
                  contentPosition="left center"
                />
              </View>

              <TouchableOpacity
                onPress={() => handleClose()}
                style={styles.closeBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Close side menu"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* 1. LOGIN / SIGNUP Card at top */}
            <TouchableOpacity
              onPress={handleAuthPress}
              activeOpacity={0.85}
              style={[
                styles.authCard,
                {
                  backgroundColor: '#FFFFFF',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={isAuthenticated ? 'View account profile' : 'Login or signup'}
            >
              {isAuthenticated ? (
                <View style={styles.authUserRow}>
                  <View style={[styles.avatarCircle, { backgroundColor: brandRed }]}>
                    <Ionicons name="person" size={18} color="#FFFFFF" />
                  </View>
                  <View style={styles.authUserInfo}>
                    <Text style={styles.authUserName} numberOfLines={1}>
                      {user?.fullName || (user as any)?.name || 'My Account'}
                    </Text>
                    <Text style={styles.authUserSub} numberOfLines={1}>
                      {user?.phone || user?.email || 'View Profile'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </View>
              ) : (
                <View style={styles.guestAuthContent}>
                  <Text style={[styles.authCardText, { color: brandRed }]}>
                    LOGIN / SIGNUP
                  </Text>
                  <Ionicons name="arrow-forward-circle" size={20} color={brandRed} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Scrollable Menu Content ── */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 16 },
            ]}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {menuItems.map((item) => {
              const isHomeActive = item.id === 'home' && activeRouteName === 'Home';
              const iconName = isHomeActive
                ? (item.activeIconName || item.iconName)
                : item.iconName;

              return (
                <React.Fragment key={item.id}>
                  <TouchableOpacity
                    onPress={item.onPress}
                    activeOpacity={0.7}
                    style={[
                      styles.menuItem,
                      isHomeActive && [
                        styles.menuItemActive,
                        {
                          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.14)' : 'rgba(227, 30, 36, 0.08)',
                        },
                      ],
                    ]}
                    accessibilityRole={item.isDarkThemeToggle ? 'switch' : 'button'}
                    accessibilityLabel={item.label}
                  >
                    <View style={styles.menuIconWrap}>
                      <Ionicons
                        name={iconName}
                        size={21}
                        color={
                          isHomeActive
                            ? brandRed
                            : isDark
                            ? '#94A3B8'
                            : '#64748B'
                        }
                      />
                    </View>

                    <Text
                      style={[
                        styles.menuItemLabel,
                        {
                          color: isHomeActive
                            ? brandRed
                            : isDark
                            ? '#F1F5F9'
                            : '#1E293B',
                          fontWeight: isHomeActive ? '700' : '500',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>

                    {/* Dark Theme Switch */}
                    {item.isDarkThemeToggle && (
                      <View style={styles.themeToggleWrap}>
                        <Switch
                          value={isDark}
                          onValueChange={() => toggleTheme()}
                          trackColor={{ false: '#CBD5E1', true: '#EF4444' }}
                          thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : isDark ? '#FFFFFF' : '#F8FAFC'}
                          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                        />
                      </View>
                    )}

                    {/* Active Indicator Bar on left of Active Home */}
                    {isHomeActive && (
                      <View style={[styles.activeAccentBar, { backgroundColor: brandRed }]} />
                    )}
                  </TouchableOpacity>

                  {/* Horizontal Divider between logical groups */}
                  {item.isSeparatorAfter && (
                    <View
                      style={[
                        styles.separator,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
                        },
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}

            {/* ── Bottom Footer with dynamic app version ── */}
            <View style={styles.footerWrap}>
              <Text style={[styles.footerText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                All rights reserved | Ver {appVersion}
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  backdropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  drawerContainer: {
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 16,
    zIndex: 9999,
  },
  drawerHeader: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logoWrap: {
    height: 32,
    justifyContent: 'center',
  },
  headerLogo: {
    width: 135,
    height: 28,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authCard: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  guestAuthContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  authCardText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 13.5,
    letterSpacing: 0.4,
  },
  authUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  authUserInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  authUserName: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 13.5,
    color: '#0F172A',
  },
  authUserSub: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12.5,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    marginVertical: 1.5,
    borderRadius: 8,
    position: 'relative',
  },
  menuItemActive: {
    borderRadius: 8,
  },
  activeAccentBar: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3.5,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  menuIconWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemLabel: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 13.5,
    letterSpacing: 0.1,
  },
  themeToggleWrap: {
    marginLeft: 8,
  },
  separator: {
    height: 1,
    marginVertical: 6,
    marginHorizontal: 16,
  },
  footerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  footerText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
