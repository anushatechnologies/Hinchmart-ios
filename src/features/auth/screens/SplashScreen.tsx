/**
 * HINCH MART — Premium Splash Screen v2
 *
 * Design concept: "Bold Emergence"
 * Inspired by CRED, Blinkit, Zomato — clean, confident, branded.
 *
 * Visual Flow:
 *   1. Warm white gradient background washes in
 *   2. Subtle animated mesh pattern pulses in the background
 *   3. Logo lands with an elastic bounce from above
 *   4. A glowing ring orbits around the logo
 *   5. Brand name "HINCH MART" types in character by character
 *   6. Tagline fades in with expanding accent lines
 *   7. A bold red progress bar fills from left to right
 *   8. Footer fades in with company info
 *
 * Colour palette: Warm White (#FAFAFA), Navy (#152238),
 * Brand Red (#E31E24), Orange (#E87623), Gold (#FDB913)
 */
import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { authStore } from '../../../store/authStore';
import { authApi } from '../../../services/api/auth.api';
import { isGenericName } from '../../../services/api/firebaseAuth';
import { cartManager } from '../../../services/cart/cartManager';
import { cartAuthGuard } from '../../../services/cart/cartAuthGuard';
import { store } from '../../../redux';
import { hideAuthModal } from '../../../redux/slices/cartSlice';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Mesh dot grid configuration ───
const GRID_COLS = 8;
const GRID_ROWS = 14;
interface MeshDot {
  x: number;
  y: number;
  delay: number;
  baseOpacity: number;
}

function generateMeshDots(): MeshDot[] {
  const dots: MeshDot[] = [];
  const cellW = SW / GRID_COLS;
  const cellH = SH / GRID_ROWS;
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      dots.push({
        x: c * cellW + cellW / 2,
        y: r * cellH + cellH / 2,
        delay: (r + c) * 50,
        baseOpacity: 0.03 + Math.random() * 0.04,
      });
    }
  }
  return dots;
}

// ─── Animated Mesh Dot ───
function MeshDotView({
  dot,
  masterOpacity,
}: {
  dot: MeshDot;
  masterOpacity: Animated.Value;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1800 + Math.random() * 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: 1800 + Math.random() * 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const timer = setTimeout(() => {
      pulseLoop.start();
    }, dot.delay);

    return () => {
      clearTimeout(timer);
      pulseLoop.stop();
    };
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: dot.x - 1.5,
        top: dot.y - 1.5,
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#152238',
        opacity: Animated.multiply(
          opacity,
          Animated.multiply(
            masterOpacity,
            new Animated.Value(dot.baseOpacity)
          )
        ),
      }}
    />
  );
}

// ─── Orbiting Ring Effect ───
function OrbitRing({
  ringOpacity,
  ringRotation,
}: {
  ringOpacity: Animated.Value;
  ringRotation: Animated.Value;
}) {
  const spin = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.orbitRing,
        {
          opacity: ringOpacity,
          transform: [{ rotate: spin }],
        },
      ]}
    >
      {/* The ring itself is a border with a gap */}
      <View style={styles.orbitRingInner}>
        {/* Bright accent dot on the ring */}
        <View style={styles.orbitDot} />
      </View>
    </Animated.View>
  );
}

// ─── Progress Bar ───
function ProgressBar({
  progress,
  barOpacity,
}: {
  progress: Animated.Value;
  barOpacity: Animated.Value;
}) {
  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.progressTrack, { opacity: barOpacity }]}>
      <Animated.View style={[styles.progressFill, { width: width as any }]}>
        <LinearGradient
          colors={['#E31E24', '#E87623', '#FDB913']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════
// ─── MAIN SPLASH SCREEN ──────────────────
// ═══════════════════════════════════════════
export function SplashScreen({ navigation }: any) {
  const meshDots = useMemo(() => generateMeshDots(), []);

  // ── Animation Values ──
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const meshOpacity = useRef(new Animated.Value(0)).current;

  // Logo
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoTranslateY = useRef(new Animated.Value(-60)).current;

  // Shadow ring behind logo
  const ringGlowOpacity = useRef(new Animated.Value(0)).current;
  const ringGlowScale = useRef(new Animated.Value(0.5)).current;

  // Orbit ring
  const orbitOpacity = useRef(new Animated.Value(0)).current;
  const orbitRotation = useRef(new Animated.Value(0)).current;

  // Brand name reveal
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandTranslateY = useRef(new Animated.Value(20)).current;
  const brandLetterReveal = useRef(new Animated.Value(0)).current;

  // Tagline
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(12)).current;

  // Accent lines beside tagline
  const accentLineScale = useRef(new Animated.Value(0)).current;

  // Progress bar
  const progressValue = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;

  // Footer
  const footerOpacity = useRef(new Animated.Value(0)).current;

  // Decorative corner marks
  const cornerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // ┌─────────────────────────────────────────────┐
    // │ PHASE 1: Background wash-in (0ms)           │
    // └─────────────────────────────────────────────┘
    Animated.timing(bgOpacity, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Mesh dots pulse in
    Animated.sequence([
      Animated.delay(200),
      Animated.timing(meshOpacity, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // Corner marks
    Animated.sequence([
      Animated.delay(300),
      Animated.timing(cornerOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // ┌─────────────────────────────────────────────┐
    // │ PHASE 2: Logo drops in with elastic (400ms) │
    // └─────────────────────────────────────────────┘
    Animated.sequence([
      Animated.delay(350),
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.spring(logoTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Shadow ring glow behind logo
    Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(ringGlowOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(ringGlowScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Pulsing ring glow
    const ringPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(ringGlowScale, {
          toValue: 1.06,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringGlowScale, {
          toValue: 1.0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    const ringPulseTimer = setTimeout(() => ringPulse.start(), 1200);

    // ┌─────────────────────────────────────────────┐
    // │ PHASE 3: Orbit ring spins (600ms)           │
    // └─────────────────────────────────────────────┘
    Animated.sequence([
      Animated.delay(600),
      Animated.timing(orbitOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    const orbitLoop = Animated.loop(
      Animated.timing(orbitRotation, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const orbitTimer = setTimeout(() => orbitLoop.start(), 600);

    // ┌─────────────────────────────────────────────┐
    // │ PHASE 4: Brand name types in (900ms)        │
    // └─────────────────────────────────────────────┘
    Animated.sequence([
      Animated.delay(900),
      Animated.parallel([
        Animated.timing(brandOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(brandTranslateY, {
          toValue: 0,
          friction: 9,
          tension: 55,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // ┌─────────────────────────────────────────────┐
    // │ PHASE 5: Tagline + Accent Lines (1200ms)    │
    // └─────────────────────────────────────────────┘
    Animated.sequence([
      Animated.delay(1200),
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.spring(taglineTranslateY, {
          toValue: 0,
          friction: 10,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(accentLineScale, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // ┌─────────────────────────────────────────────┐
    // │ PHASE 6: Progress bar fills (1400ms)        │
    // └─────────────────────────────────────────────┘
    Animated.sequence([
      Animated.delay(1400),
      Animated.timing(progressOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Progress fill (non-native for layout animation)
    const progressTimer = setTimeout(() => {
      Animated.timing(progressValue, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false, // width animation requires layout
      }).start();
    }, 1500);

    // Footer
    Animated.sequence([
      Animated.delay(1700),
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // ── Auth check & navigate ──
    const navTimer = setTimeout(async () => {
      try {
        const isLoggedIn = authStore.isAuthenticated();
        if (isLoggedIn) {
          const storedUser = authStore.getUser();
          const storedToken = authStore.getToken();
          const storedRefreshToken = authStore.getRefreshToken();
          if (storedUser && storedToken) {
            authStore.saveSession({
              user: storedUser,
              accessToken: storedToken,
              refreshToken: storedRefreshToken || '',
            });

            try {
              // Asynchronously refresh user profile from live backend GET /api/auth/me
              const syncProfile = await Promise.race([
                authApi.getMe(),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
              ]);

              if (syncProfile) {
                const current = authStore.getUser();
                if (current) {
                  authStore.saveSession({
                    user: {
                      ...current,
                      fullName: syncProfile.name || current.fullName,
                      role: (syncProfile.role as any) || current.role,
                      email: syncProfile.email || current.email,
                      phone: syncProfile.phone || current.phone,
                    },
                    accessToken: authStore.getToken() || '',
                    refreshToken: authStore.getRefreshToken() || '',
                  });
                }

                const hasRealEmail = Boolean(
                  (syncProfile.email && !syncProfile.email.includes('@firebase.user') && !syncProfile.email.includes('@hinchmart.com')) ||
                  (storedUser.email && !storedUser.email.includes('@firebase.user') && !storedUser.email.includes('@hinchmart.com'))
                );
                const isComplete =
                  syncProfile.profileComplete !== false &&
                  (syncProfile as any).isProfileComplete !== false &&
                  !isGenericName(syncProfile.name || storedUser.fullName);

                if (!isComplete) {
                  navigation.reset({
                    index: 0,
                    routes: [{
                      name: 'CompleteProfile',
                      params: {
                        phone: syncProfile.phone || storedUser.phone,
                        name: syncProfile.name || storedUser.fullName,
                        email: syncProfile.email || storedUser.email,
                      },
                    }],
                  });
                  return;
                }
              }
            } catch {
              // Session restore error fallback
            }
          }
          // Restore user's authoritative cart from server on application launch
          try {
            await cartManager.loadServerCart(store.dispatch);
          } catch (cErr) {
            console.warn('[SplashScreen] Cart restoration notice:', cErr);
          }
          store.dispatch(hideAuthModal());
          navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        } else {
          // Guest User — clear any leftover pending action from previous unauthenticated session
          cartAuthGuard.clearPendingAction();
          store.dispatch(hideAuthModal());
          navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        }
      } catch (err) {
        console.error('Splash routing error:', err);
        store.dispatch(hideAuthModal());
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      }
    }, 3200);

    return () => {
      clearTimeout(navTimer);
      clearTimeout(ringPulseTimer);
      clearTimeout(orbitTimer);
      clearTimeout(progressTimer);
      ringPulse.stop();
      orbitLoop.stop();
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* ── Background Gradient ── */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: bgOpacity,
        }}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F8F9FA', '#F0F1F3', '#E8EAED']}
          locations={[0, 0.3, 0.7, 1]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      {/* ── Subtle Mesh Dot Grid ── */}
      {meshDots.map((dot, i) => (
        <MeshDotView key={i} dot={dot} masterOpacity={meshOpacity} />
      ))}

      {/* ── Decorative Corner Marks ── */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: cornerOpacity,
        }}
        pointerEvents="none"
      >
        {/* Top-left */}
        <View style={styles.cornerTL} />
        {/* Top-right */}
        <View style={styles.cornerTR} />
        {/* Bottom-left */}
        <View style={styles.cornerBL} />
        {/* Bottom-right */}
        <View style={styles.cornerBR} />
      </Animated.View>

      {/* ── Ambient Colored Glows ── */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />
      <View style={styles.glowCenterTop} />

      {/* ═══════════════════════════════════ */}
      {/* ── CENTER CONTENT ──               */}
      {/* ═══════════════════════════════════ */}
      <View style={styles.centerContent}>
        {/* Shadow ring glow behind logo */}
        <Animated.View
          style={[
            styles.ringGlow,
            {
              opacity: ringGlowOpacity,
              transform: [{ scale: ringGlowScale }],
            },
          ]}
        />

        {/* Orbit ring */}
        <OrbitRing ringOpacity={orbitOpacity} ringRotation={orbitRotation} />

        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [
                { scale: logoScale },
                { translateY: logoTranslateY },
              ],
            },
          ]}
        >
          <View style={styles.logoBgCircle} />
          <Image
            source={require('../../../../assets/logo.png')}
            style={styles.logoImage}
            contentFit="contain"
          />
        </Animated.View>

        {/* Brand Name */}
        <Animated.View
          style={[
            styles.brandWrap,
            {
              opacity: brandOpacity,
              transform: [{ translateY: brandTranslateY }],
            },
          ]}
        >
          <Text style={styles.brandTextHinch}>HINCH</Text>
          <Text style={styles.brandTextMart}>MART</Text>
        </Animated.View>

        {/* Tagline with accent lines */}
        <Animated.View
          style={[
            styles.taglineWrap,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslateY }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.taglineAccentLine,
              { transform: [{ scaleX: accentLineScale }] },
            ]}
          />
          <Text style={styles.taglineText}>
            BUILD  •  SUPPLY  •  DELIVER
          </Text>
          <Animated.View
            style={[
              styles.taglineAccentLine,
              { transform: [{ scaleX: accentLineScale }] },
            ]}
          />
        </Animated.View>
      </View>

      {/* ── Progress Bar Area ── */}
      <View style={styles.bottomArea}>
        <ProgressBar progress={progressValue} barOpacity={progressOpacity} />

        {/* "Loading" text */}
        <Animated.Text
          style={[styles.loadingText, { opacity: progressOpacity }]}
        >
          Preparing your experience...
        </Animated.Text>
      </View>

      {/* ── Footer Branding ── */}
      <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
        <View style={styles.footerDivider} />
        <Text style={styles.footerText}>
          Powered by{' '}
          <Text style={styles.footerBrand}>Nexus Technologies</Text>
        </Text>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>v1.0.28</Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ═══════════════════════════════════════════
// ─── STYLES ──────────────────────────────
// ═══════════════════════════════════════════
const LOGO_SIZE = 140;
const RING_SIZE = 200;
const ORBIT_SIZE = 220;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // ── Corner Marks ──
  cornerTL: {
    position: 'absolute',
    top: SH * 0.05,
    left: 20,
    width: 22,
    height: 22,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(227, 30, 36, 0.15)',
  },
  cornerTR: {
    position: 'absolute',
    top: SH * 0.05,
    right: 20,
    width: 22,
    height: 22,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(227, 30, 36, 0.15)',
  },
  cornerBL: {
    position: 'absolute',
    bottom: SH * 0.05,
    left: 20,
    width: 22,
    height: 22,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(21, 34, 56, 0.1)',
  },
  cornerBR: {
    position: 'absolute',
    bottom: SH * 0.05,
    right: 20,
    width: 22,
    height: 22,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(21, 34, 56, 0.1)',
  },

  // ── Ambient Glows ──
  glowTopRight: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(227, 30, 36, 0.04)',
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(253, 185, 19, 0.04)',
  },
  glowCenterTop: {
    position: 'absolute',
    top: SH * 0.2,
    left: SW * 0.2,
    width: SW * 0.6,
    height: SW * 0.6,
    borderRadius: SW * 0.3,
    backgroundColor: 'rgba(21, 34, 56, 0.015)',
  },

  // ── Center Content ──
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },

  // ── Ring Glow (soft shadow behind logo) ──
  ringGlow: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: 'rgba(227, 30, 36, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#E31E24',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 40,
      },
      android: {
        elevation: 0,
      },
    }),
  },

  // ── Orbit Ring ──
  orbitRing: {
    position: 'absolute',
    width: ORBIT_SIZE,
    height: ORBIT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitRingInner: {
    width: ORBIT_SIZE,
    height: ORBIT_SIZE,
    borderRadius: ORBIT_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(227, 30, 36, 0.08)',
    borderStyle: 'dashed',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  orbitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E31E24',
    position: 'absolute',
    top: -3,
    left: ORBIT_SIZE / 2 - 3,
    ...Platform.select({
      ios: {
        shadowColor: '#E31E24',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  // ── Logo ──
  logoContainer: {
    width: LOGO_SIZE + 40,
    height: LOGO_SIZE + 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    zIndex: 2,
  },
  logoBgCircle: {
    position: 'absolute',
    width: LOGO_SIZE + 20,
    height: LOGO_SIZE + 20,
    borderRadius: (LOGO_SIZE + 20) / 2,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#152238',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  logoImage: {
    width: LOGO_SIZE + 30,
    height: LOGO_SIZE + 10,
  },

  // ── Brand Name ──
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
    zIndex: 2,
  },
  brandTextHinch: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontSize: 32,
    fontWeight: '900',
    color: '#152238',
    letterSpacing: 6,
  },
  brandTextMart: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontSize: 32,
    fontWeight: '900',
    color: '#E31E24',
    letterSpacing: 6,
  },

  // ── Tagline ──
  taglineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    zIndex: 2,
  },
  taglineAccentLine: {
    height: 1.5,
    width: 30,
    backgroundColor: '#E31E24',
    borderRadius: 1,
  },
  taglineText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '600',
    fontSize: 10,
    color: 'rgba(21, 34, 56, 0.5)',
    letterSpacing: 3,
    textAlign: 'center',
  },

  // ── Bottom Progress Area ──
  bottomArea: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 120 : 100,
    left: 40,
    right: 40,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(21, 34, 56, 0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11,
    color: 'rgba(21, 34, 56, 0.35)',
    letterSpacing: 0.5,
    marginTop: 10,
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 48 : 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerDivider: {
    width: 30,
    height: 1,
    backgroundColor: 'rgba(21, 34, 56, 0.08)',
    marginBottom: 12,
  },
  footerText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 10.5,
    color: 'rgba(21, 34, 56, 0.25)',
    letterSpacing: 0.5,
  },
  footerBrand: {
    fontWeight: '700',
    color: 'rgba(21, 34, 56, 0.4)',
  },
  versionBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(21, 34, 56, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(21, 34, 56, 0.06)',
  },
  versionText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 9,
    color: 'rgba(21, 34, 56, 0.3)',
    letterSpacing: 1,
    fontWeight: '600',
  },
});
