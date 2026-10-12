/**
 * HINCH MART — Onboarding Screen (IBO Home Building Megastore Theme)
 * - Clean branding carousel with home building illustration cards
 * - LinearGradient accent banners
 * - Step indicator pills
 * - Crimson Red CTA buttons
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme';
import { ONBOARDING_SLIDES } from '../../../constants/app';
import { useAppDispatch } from '../../../redux/hooks';
import { setOnboardingComplete } from '../../../redux/slices/authSlice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDE_ICONS: { icon: keyof typeof Ionicons.glyphMap; badge: string; color: string }[] = [
  { icon: 'business-outline', badge: 'DIRECT MANUFACTURERS', color: '#E31E24' },
  { icon: 'git-compare-outline', badge: 'COMPETITIVE QUOTES', color: '#2563EB' },
  { icon: 'shield-checkmark-outline', badge: 'ESCROW & EXPRESS LOGISTICS', color: '#16A34A' },
];

export function OnboardingScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    dispatch(setOnboardingComplete());
    navigation.replace('MainTabs');
  };

  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
        translucent
      />

      {/* Top Bar with Skip */}
      <View style={[styles.topBar, { paddingTop: topPadding + 10 }]}>
        <View style={styles.brandRow}>
          <Text style={[styles.brandText, { color: theme.colors.textPrimary }]}>HINCH</Text>
          <Text style={[styles.brandTextRed, { color: theme.colors.primary }]}>MART</Text>
        </View>

        <TouchableOpacity onPress={handleFinish} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={[styles.skipText, { color: theme.colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
        renderItem={({ item, index }) => {
          const slideInfo = SLIDE_ICONS[index] || SLIDE_ICONS[0];
          return (
            <View style={styles.slideContainer}>
              <View style={[styles.illustrationCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <LinearGradient
                  colors={isDark ? ['#152238', '#1F3456'] : ['#F8FAFC', '#EFF6FF']}
                  style={styles.innerGradientCircle}
                >
                  <Ionicons name={slideInfo.icon} size={72} color={slideInfo.color} />
                </LinearGradient>
                <View style={[styles.slideBadge, { backgroundColor: `${slideInfo.color}18` }]}>
                  <Text style={[styles.slideBadgeText, { color: slideInfo.color }]}>{slideInfo.badge}</Text>
                </View>
              </View>

              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{item.title}</Text>
              <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                {item.description}
              </Text>
            </View>
          );
        }}
        keyExtractor={(item) => item.id}
      />

      {/* Footer Controls */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
        {/* Step Indicator Pills */}
        <View style={styles.indicatorRow}>
          {ONBOARDING_SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                {
                  backgroundColor: index === currentIndex ? theme.colors.primary : theme.colors.border,
                  width: index === currentIndex ? 28 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity
          onPress={handleNext}
          style={[styles.primaryActionBtn, { backgroundColor: theme.colors.primary }]}
          activeOpacity={0.88}
        >
          <Text style={styles.primaryActionBtnText}>
            {currentIndex === ONBOARDING_SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons
            name={currentIndex === ONBOARDING_SLIDES.length - 1 ? 'arrow-forward-circle' : 'arrow-forward'}
            size={18}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  brandRow: {
    flexDirection: 'row',
  },
  brandText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brandTextRed: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  slideContainer: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  illustrationCard: {
    width: SCREEN_WIDTH - 64,
    height: 260,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    padding: 20,
  },
  innerGradientCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  slideBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  slideBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  footer: {
    paddingHorizontal: 24,
    gap: 20,
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
