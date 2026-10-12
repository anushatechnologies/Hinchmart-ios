/**
 * HINCH MART — Premium Glass Bottom Navigation Bar
 * Features:
 * - Frosted glass translucent surface with BlurView + subtle tint overlay
 * - Rounded top corners (20px) elevated cleanly above screen content
 * - Subtle border & soft shadow / elevation
 * - Exactly 3 navigation items: Home | Categories | Account
 * - Hinchmart signature active red (#E31E24), neutral gray inactive (#8C939D)
 * - Dynamic safe-area padding handling across Android & iOS devices
 */
import React, { useRef } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabParamList } from './types';
import { useTheme } from '../theme';

import { HomeScreen } from '../features/home/screens/HomeScreen';
import { CategoriesScreen } from '../features/products/screens/CategoriesScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();

// Clean 3-Tab Button — Color-only active state, responsive micro-press animation
function TabBarButton({
  route,
  isFocused,
  label,
  onPress,
  options,
  iconName,
  outlineName,
  isDark,
}: any) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.0,
      useNativeDriver: true,
      speed: 25,
      bounciness: 8,
    }).start();
  };

  const activeColor = '#E31E24';
  const inactiveColor = isDark ? '#717171' : '#8C939D';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel || label}
      testID={options.tabBarTestID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={styles.tabItem}
    >
      <Animated.View style={{ alignItems: 'center', transform: [{ scale: scaleAnim }] }}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={isFocused ? iconName : outlineName}
            size={22}
            color={isFocused ? activeColor : inactiveColor}
          />
        </View>

        <Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? activeColor : inactiveColor,
              fontWeight: isFocused ? '600' : '400',
            },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// Premium Frosted Glass 3-Item Tab Bar Container
function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const paddingBottom = Math.max(insets.bottom, 8);

  return (
    <View style={styles.tabBarOuterWrapper} pointerEvents="box-none">
      <View
        style={[
          styles.glassContainer,
          {
            paddingBottom,
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(226, 232, 240, 0.9)',
            borderLeftColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.7)',
            borderRightColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.7)',
          },
        ]}
      >
        {/* Translucent Frosted Glass Background Layer */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? 'rgba(20, 24, 33, 0.94)'
                : 'rgba(255, 255, 255, 0.94)',
            },
          ]}
        />

        {/* Top subtle highlight reflection */}
        <View
          style={[
            styles.glassHighlightLine,
            {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(255, 255, 255, 0.9)',
            },
          ]}
        />

        {/* Tab Items Row */}
        <View style={styles.tabBarInner}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const label =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                ? options.title
                : route.name;

            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!event.defaultPrevented) {
                if (route.name === 'CategoriesTab') {
                  navigation.navigate('CategoriesTab', { categoryId: null, navKey: Date.now() });
                } else if (!isFocused) {
                  navigation.navigate(route.name);
                }
              }
            };

            let iconName: keyof typeof Ionicons.glyphMap = 'home';
            let outlineName: keyof typeof Ionicons.glyphMap = 'home-outline';

            if (route.name === 'HomeTab') {
              iconName = 'home';
              outlineName = 'home-outline';
            } else if (route.name === 'CategoriesTab') {
              iconName = 'grid';
              outlineName = 'grid-outline';
            } else if (route.name === 'ProfileTab') {
              iconName = 'person';
              outlineName = 'person-outline';
            }

            return (
              <TabBarButton
                key={route.key}
                route={route}
                isFocused={isFocused}
                label={label}
                onPress={onPress}
                options={options}
                iconName={iconName}
                outlineName={outlineName}
                isDark={isDark}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

export function BottomTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="CategoriesTab" component={CategoriesScreen} options={{ tabBarLabel: 'Categories' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ tabBarLabel: 'Account' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarOuterWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  glassContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  glassHighlightLine: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 52,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minHeight: 48,
  },
  iconWrap: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.1,
    lineHeight: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
});

export const HinchBottomNavigation = BottomTabNavigator;
