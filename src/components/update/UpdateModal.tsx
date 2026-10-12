/**
 * HINCH MART — Production App Update Modal
 * 
 * High-conversion, brand-aligned update modal matching HinchMart's design system:
 * - HinchMart emblem / update badge
 * - Version transition pill (e.g. v1.0.8 → v1.0.9)
 * - Clear release notes breakdown with styled checkmarks
 * - Single-tap "Update Now" store launcher with feedback spinner
 * - Optional "Later" button for non-forced updates
 * - Hardware back-button interceptor for mandatory updates
 */
import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { UpdateCheckResult } from '../../services/update/updateService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_WIDTH = Math.min(SCREEN_WIDTH - 36, 400);

export interface UpdateModalProps {
  visible: boolean;
  updateResult: UpdateCheckResult | null;
  isUpdating: boolean;
  onUpdateNow: () => void;
  onLater: () => void;
}

export function UpdateModal({
  visible,
  updateResult,
  isUpdating,
  onUpdateNow,
  onLater,
}: UpdateModalProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const colors = theme.colors;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  const isForceUpdate = updateResult?.forceUpdate ?? false;
  const latestVersion = updateResult?.latestVersion || '1.0.9';
  const currentVersion = updateResult?.currentVersion || '1.0.8';
  const releaseNotes = updateResult?.releaseNotes || [];

  // Smooth entrance / exit animation
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 75,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.92,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  // Prevent back-button dismissal during mandatory updates
  useEffect(() => {
    if (!visible || !isForceUpdate) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Consume event — user cannot dismiss forced updates
      return true;
    });

    return () => backHandler.remove();
  }, [visible, isForceUpdate]);

  if (!visible || !updateResult) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={() => {
        if (!isForceUpdate) {
          onLater();
        }
      }}
    >
      <View style={styles.overlayContainer}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(15, 23, 42, 0.65)',
            },
          ]}
        />

        {/* Modal Dialog */}
        <Animated.View
          style={[
            styles.dialogCard,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              backgroundColor: colors.cardBackground,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            },
          ]}
        >
          {/* Header Graphic */}
          <View style={styles.headerGraphicRow}>
            <View style={styles.iconCircleOuter}>
              <LinearGradient
                colors={isForceUpdate ? ['#E31E24', '#B91C1C'] : ['#FDB913', '#E31E24']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconCircleInner}
              >
                <Ionicons
                  name={isForceUpdate ? 'shield-checkmark' : 'rocket'}
                  size={32}
                  color="#FFFFFF"
                />
              </LinearGradient>
            </View>

            {/* Pill Tag */}
            <View
              style={[
                styles.updateTypePill,
                {
                  backgroundColor: isForceUpdate
                    ? 'rgba(227, 30, 36, 0.12)'
                    : 'rgba(16, 185, 129, 0.12)',
                },
              ]}
            >
              <Ionicons
                name={isForceUpdate ? 'alert-circle' : 'sparkles'}
                size={12}
                color={isForceUpdate ? '#E31E24' : '#10B981'}
              />
              <Text
                style={[
                  styles.updateTypePillText,
                  { color: isForceUpdate ? '#E31E24' : '#10B981' },
                ]}
              >
                {isForceUpdate ? 'CRITICAL UPDATE' : 'NEW UPDATE AVAILABLE'}
              </Text>
            </View>
          </View>

          {/* Title & Description */}
          <Text style={[styles.titleText, { color: colors.textPrimary }]}>
            {updateResult.title || (isForceUpdate ? 'Mandatory App Update' : 'New Update Available')}
          </Text>

          <Text style={[styles.subText, { color: colors.textSecondary }]}>
            {updateResult.message || 'A newer version of HinchMart is available with improved performance and bug fixes.'}
          </Text>

          {/* Version Comparison Bar */}
          <View
            style={[
              styles.versionBar,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.versionColumn}>
              <Text style={[styles.versionLabel, { color: colors.textTertiary }]}>INSTALLED</Text>
              <Text style={[styles.versionValue, { color: colors.textSecondary }]}>
                v{currentVersion}
              </Text>
            </View>

            <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />

            <View style={styles.versionColumn}>
              <Text style={[styles.versionLabel, { color: '#E31E24' }]}>LATEST</Text>
              <Text style={[styles.versionValueLatest, { color: '#E31E24' }]}>
                v{latestVersion}
              </Text>
            </View>
          </View>

          {/* Release Notes */}
          {releaseNotes.length > 0 && (
            <View style={styles.releaseNotesSection}>
              <Text style={[styles.releaseNotesHeader, { color: colors.textPrimary }]}>
                What's New:
              </Text>
              <ScrollView
                style={styles.releaseNotesScrollView}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {releaseNotes.map((note, index) => (
                  <View key={`note_${index}`} style={styles.releaseNoteRow}>
                    <View style={styles.checkIconBox}>
                      <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                    </View>
                    <Text style={[styles.releaseNoteText, { color: colors.textSecondary }]}>
                      {note}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.ctaContainer}>
            {/* Update Now CTA */}
            <TouchableOpacity
              onPress={onUpdateNow}
              disabled={isUpdating}
              activeOpacity={0.88}
              style={styles.updateNowBtn}
            >
              <LinearGradient
                colors={['#E31E24', '#B91C1C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.updateNowGradient}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.updateNowText}>Update Now</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Optional "Later" Button (Hidden if Force Update) */}
            {!isForceUpdate && (
              <TouchableOpacity
                onPress={onLater}
                disabled={isUpdating}
                activeOpacity={0.7}
                style={styles.laterBtn}
              >
                <Text style={[styles.laterText, { color: colors.textTertiary }]}>
                  Later
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialogCard: {
    width: MODAL_WIDTH,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  headerGraphicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconCircleOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(227, 30, 36, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  updateTypePillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10.5,
    letterSpacing: 0.4,
  },
  titleText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 6,
  },
  subText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  versionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  versionColumn: {
    alignItems: 'center',
  },
  versionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9.5,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  versionValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
  },
  versionValueLatest: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  releaseNotesSection: {
    marginBottom: 20,
  },
  releaseNotesHeader: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    marginBottom: 8,
  },
  releaseNotesScrollView: {
    maxHeight: 130,
  },
  releaseNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  checkIconBox: {
    marginTop: 2,
  },
  releaseNoteText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  ctaContainer: {
    gap: 8,
  },
  updateNowBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  updateNowGradient: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  updateNowText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14.5,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  laterBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  laterText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
});

export default UpdateModal;
