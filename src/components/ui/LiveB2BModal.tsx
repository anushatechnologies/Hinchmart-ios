/**
 * HINCH MART — Ultra-Smooth Live B2B Procurement & Wholesale Hub Modal
 * Powered by React Native Reanimated for 60fps spring-physics bottom sheet animations.
 * Provides direct access to B2B Request for Quotation (RFQ), bulk volume tiers,
 * OEM verified supplier catalogs, equipment rentals, and business tax invoicing.
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LiveB2BModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

export function LiveB2BModal({ visible, onClose, navigation }: LiveB2BModalProps) {
  const { theme, isDark } = useTheme();

  // Animation values
  const backdropOpacity = useSharedValue(0);
  const translateY = useSharedValue(SCREEN_HEIGHT * 0.9);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, {
        duration: 250,
        easing: Easing.out(Easing.quad),
      });
      translateY.value = withSpring(0, {
        damping: 24,
        stiffness: 220,
        mass: 0.8,
      });
    } else {
      backdropOpacity.value = 0;
      translateY.value = SCREEN_HEIGHT * 0.9;
    }
  }, [visible, backdropOpacity, translateY]);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleSmoothClose = (callback?: () => void) => {
    backdropOpacity.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(
      SCREEN_HEIGHT * 0.9,
      { duration: 220, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(onClose)();
          if (callback) {
            runOnJS(callback)();
          }
        }
      }
    );
  };

  const handleAction = (screenName: string, params?: Record<string, any>) => {
    handleSmoothClose(() => {
      navigation.navigate(screenName, params);
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={() => handleSmoothClose()}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        {/* Animated Dark Dimming Backdrop */}
        <Animated.View style={[styles.backdropAnimated, animatedBackdropStyle]}>
          <TouchableWithoutFeedback onPress={() => handleSmoothClose()}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        </Animated.View>

        {/* Animated Slide-Up Bottom Sheet */}
        <Animated.View
          style={[
            styles.modalContent,
            animatedContentStyle,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.cardBorder,
            },
          ]}
        >
          {/* Modal Handle Bar */}
          <View style={styles.handleBar} />

          {/* Top Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.b2bBadgePill}>
                <Ionicons name="shield-checkmark" size={13} color="#FDB913" />
                <Text style={styles.b2bBadgeText}>LIVE B2B HUB</Text>
              </View>
              <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
                Wholesale & OEM Procurement
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => handleSmoothClose()}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
            bounces={true}
          >
            {/* Verified B2B Account Card */}
            <LinearGradient
              colors={isDark ? ['#152238', '#1F3456'] : ['#152238', '#253B5E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.accountCard}
            >
              <View style={styles.accountTopRow}>
                <View style={styles.shieldIconWrap}>
                  <MaterialCommunityIcons name="factory" size={24} color="#FDB913" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountName}>Corporate Wholesale Account</Text>
                  <Text style={styles.accountStatus}>Verified Direct OEM Buyer Network</Text>
                </View>
                <View style={styles.activeDotBadge}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeDotText}>Active</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statVal}>35% Max</Text>
                  <Text style={styles.statLbl}>Volume Discount</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={styles.statVal}>24 Hours</Text>
                  <Text style={styles.statLbl}>RFQ Quotations</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={styles.statVal}>Net 30/60</Text>
                  <Text style={styles.statLbl}>Credit Eligible</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Quick Action Grid */}
            <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
              B2B Services & Tools
            </Text>

            <View style={styles.actionGrid}>
              {/* Post RFQ */}
              <TouchableOpacity
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: isDark ? theme.colors.surfaceVariant : '#F8FAFC',
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
                onPress={() => handleAction('RFQCreate')}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.actionIconBox,
                    { backgroundColor: 'rgba(59, 130, 246, 0.12)' },
                  ]}
                >
                  <Ionicons name="document-text" size={22} color="#3B82F6" />
                </View>
                <Text style={[styles.actionTitle, { color: theme.colors.textPrimary }]}>
                  Post Bulk RFQ
                </Text>
                <Text style={[styles.actionSub, { color: theme.colors.textSecondary }]}>
                  Receive quotes in 24h
                </Text>
              </TouchableOpacity>

              {/* View RFQs */}
              <TouchableOpacity
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: isDark ? theme.colors.surfaceVariant : '#F8FAFC',
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
                onPress={() => handleAction('RFQList')}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.actionIconBox,
                    { backgroundColor: 'rgba(139, 92, 246, 0.12)' },
                  ]}
                >
                  <Ionicons name="list-circle" size={22} color="#8B5CF6" />
                </View>
                <Text style={[styles.actionTitle, { color: theme.colors.textPrimary }]}>
                  My Quotations
                </Text>
                <Text style={[styles.actionSub, { color: theme.colors.textSecondary }]}>
                  Active bids & quotes
                </Text>
              </TouchableOpacity>

              {/* Heavy Rentals */}
              <TouchableOpacity
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: isDark ? theme.colors.surfaceVariant : '#F8FAFC',
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
                onPress={() => handleAction('RentalList')}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.actionIconBox,
                    { backgroundColor: 'rgba(245, 158, 11, 0.12)' },
                  ]}
                >
                  <MaterialCommunityIcons name="dump-truck" size={22} color="#F59E0B" />
                </View>
                <Text style={[styles.actionTitle, { color: theme.colors.textPrimary }]}>
                  Heavy Rentals
                </Text>
                <Text style={[styles.actionSub, { color: theme.colors.textSecondary }]}>
                  Fleet & Cranes rental
                </Text>
              </TouchableOpacity>

              {/* Verified OEM Brands */}
              <TouchableOpacity
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: isDark ? theme.colors.surfaceVariant : '#F8FAFC',
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
                onPress={() => handleAction('Brands')}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.actionIconBox,
                    { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
                  ]}
                >
                  <MaterialCommunityIcons name="certificate" size={22} color="#10B981" />
                </View>
                <Text style={[styles.actionTitle, { color: theme.colors.textPrimary }]}>
                  OEM Brands
                </Text>
                <Text style={[styles.actionSub, { color: theme.colors.textSecondary }]}>
                  Verified manufacturers
                </Text>
              </TouchableOpacity>
            </View>

            {/* Corporate Profile & Invoicing */}
            <View
              style={[
                styles.serviceListCard,
                {
                  backgroundColor: isDark ? theme.colors.surfaceVariant : '#F8FAFC',
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.serviceRow}
                onPress={() => handleAction('GSTInvoice')}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.serviceIcon,
                    { backgroundColor: 'rgba(253, 185, 19, 0.15)' },
                  ]}
                >
                  <Ionicons name="business" size={18} color="#FDB913" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.serviceTitle, { color: theme.colors.textPrimary }]}>
                    GST & Business Tax Invoicing
                  </Text>
                  <Text style={[styles.serviceDesc, { color: theme.colors.textSecondary }]}>
                    Manage business GSTIN, PAN & billing profile
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <View
                style={[
                  styles.serviceDivider,
                  { backgroundColor: theme.colors.cardBorder },
                ]}
              />

              <TouchableOpacity
                style={styles.serviceRow}
                onPress={() => handleAction('RFQCreate')}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.serviceIcon,
                    { backgroundColor: 'rgba(59, 130, 246, 0.15)' },
                  ]}
                >
                  <Ionicons name="pricetags" size={18} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.serviceTitle, { color: theme.colors.textPrimary }]}>
                    Wholesale Procurement
                  </Text>
                  <Text style={[styles.serviceDesc, { color: theme.colors.textSecondary }]}>
                    Request tier pricing and bulk pallet discounts
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              onPress={() => handleAction('RFQCreate')}
              style={styles.primaryCtaBtn}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FDB913', '#F59E0B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryCtaGradient}
              >
                <Ionicons name="add-circle" size={20} color="#152238" />
                <Text style={styles.primaryCtaText}>Create New Bulk RFQ</Text>
                <Ionicons name="arrow-forward" size={16} color="#152238" />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropAnimated: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148, 163, 184, 0.4)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleGroup: {
    flex: 1,
  },
  b2bBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(253, 185, 19, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 4,
  },
  b2bBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9.5,
    color: '#FDB913',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    paddingBottom: 16,
    gap: 16,
  },
  accountCard: {
    borderRadius: 18,
    padding: 16,
    shadowColor: '#152238',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  accountTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  shieldIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(253, 185, 19, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  accountStatus: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 1,
  },
  activeDotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activeDotText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#10B981',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: '#FDB913',
  },
  statLbl: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9.5,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  sectionHeading: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    marginTop: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48.5%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  actionSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10.5,
  },
  serviceListCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
  },
  serviceDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10.5,
    marginTop: 2,
  },
  serviceDivider: {
    height: 1,
    marginHorizontal: 14,
  },
  primaryCtaBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  primaryCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  primaryCtaText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#152238',
  },
});
