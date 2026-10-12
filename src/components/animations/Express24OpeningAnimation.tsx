import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Express24OpeningAnimationProps {
  onAnimationComplete: () => void;
}

export function Express24OpeningAnimation({ onAnimationComplete }: Express24OpeningAnimationProps) {
  const { isDark } = useTheme();

  // Animations states
  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(40)).current;

  // Background fade-in
  const bgOpacity = useRef(new Animated.Value(0)).current;

  // Ripple anims
  const ripple1Scale = useRef(new Animated.Value(0.8)).current;
  const ripple1Opacity = useRef(new Animated.Value(0.8)).current;
  const ripple2Scale = useRef(new Animated.Value(0.8)).current;
  const ripple2Opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // 1. Background fades in instantly
    Animated.timing(bgOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // 2. Central Logo entrance (snappy bounce & translate up)
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    // 3. Ripple Expansion Loops
    const startRipple1 = () => {
      ripple1Scale.setValue(0.8);
      ripple1Opacity.setValue(0.7);
      Animated.parallel([
        Animated.timing(ripple1Scale, {
          toValue: 2.2,
          duration: 1200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ripple1Opacity, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]).start(() => startRipple1());
    };

    const startRipple2 = () => {
      ripple2Scale.setValue(0.8);
      ripple2Opacity.setValue(0.7);
      Animated.parallel([
        Animated.timing(ripple2Scale, {
          toValue: 2.5,
          duration: 1400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ripple2Opacity, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ]).start(() => startRipple2());
    };

    // Stagger ripples
    startRipple1();
    setTimeout(() => {
      startRipple2();
    }, 400);

    // 4. Overall completion timer (~1.3 seconds)
    const timeout = setTimeout(() => {
      // Fade out logo and ripples before transition completion
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(bgOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onAnimationComplete();
      });
    }, 1250);

    return () => clearTimeout(timeout);
  }, [onAnimationComplete]);

  // Color selection matching light/dark modes
  const bgColors: [string, string, string] = isDark
    ? ['#031E30', '#073656', '#0C4A6E']
    : ['#F0F9FF', '#E0F2FE', '#BAE6FD'];

  const glowColor = isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(14, 165, 233, 0.15)';
  const textColor = isDark ? '#F0F9FF' : '#0369A1';
  const logoBadgeBg = isDark ? '#0C4A6E' : '#E0F2FE';
  const badgeBorder = isDark ? '#0284C7' : '#7DD3FC';

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgOpacity, zIndex: 99999 }]}>
      <LinearGradient colors={bgColors} style={styles.gradientContainer}>
        
        {/* Glowing Ripples */}
        <Animated.View
          style={[
            styles.ripple,
            {
              backgroundColor: glowColor,
              transform: [{ scale: ripple1Scale }],
              opacity: ripple1Opacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ripple,
            {
              backgroundColor: glowColor,
              transform: [{ scale: ripple2Scale }],
              opacity: ripple2Opacity,
            },
          ]}
        />

        {/* Central Card with logo & text */}
        <Animated.View
          style={[
            styles.centerpiece,
            {
              opacity: opacityAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: translateAnim }
              ],
            },
          ]}
        >
          {/* Express Lightning Circular Badge */}
          <View style={[styles.badgeContainer, { backgroundColor: logoBadgeBg, borderColor: badgeBorder }]}>
            <Ionicons name="flash" size={48} color="#F59E0B" />
          </View>

          <Text style={[styles.titleText, { color: textColor }]}>24 HOURS</Text>
          <Text style={[styles.subText, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
            EXPRESS DELIVERY
          </Text>

          {/* Clock-like subtle visual */}
          <View style={styles.clockVisualWrap}>
            <Ionicons name="time-outline" size={18} color={isDark ? '#0284C7' : '#0EA5E9'} />
            <Text style={[styles.clockVisualText, { color: isDark ? '#38BDF8' : '#0369A1' }]}>
              Fast Dispatch within Hyderabad
            </Text>
          </View>
        </Animated.View>

      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerpiece: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  titleText: {
    fontFamily: 'Poppins_900Black',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 2,
    lineHeight: 48,
    textAlign: 'center',
  },
  subText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: 4,
    textAlign: 'center',
  },
  clockVisualWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  clockVisualText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    fontWeight: '600',
  },
});
