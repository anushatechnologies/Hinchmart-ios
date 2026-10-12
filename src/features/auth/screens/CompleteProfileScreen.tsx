/**
 * HINCH MART — Complete Your Profile Screen
 * Step 4 of Authentication & Customer Flow:
 * Triggered when backend returns isProfileComplete / profileComplete: false
 * Collects user's real Full Name and Email Address, then calls PUT /api/auth/profile
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme';
import { authApi } from '../../../services/api/auth.api';
import { userApi } from '../../../services/api/user.api';
import { customersApi } from '../../../services/api/customers.api';
import { authStore } from '../../../store/authStore';
import { useAppDispatch } from '../../../redux/hooks';
import { updateUser } from '../../../redux/slices/authSlice';
import {
  navigateToPostAuthScreen,
  syncSavedGuestAddressIfNeeded,
} from '../../../services/checkout/checkoutAuthGuard';
import { cartAuthGuard } from '../../../services/cart/cartAuthGuard';
import { auth, updateProfile } from '../../../config/firebase';

export function CompleteProfileScreen({ route, navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const existingPhone = route?.params?.phone || authStore.getUser()?.phone || '';
  const initialName = route?.params?.name || authStore.getUser()?.fullName || '';
  const initialEmail = route?.params?.email || authStore.getUser()?.email || '';

  const [fullName, setFullName] = useState(initialName === 'Customer User' || initialName === 'HinchMart Member' ? '' : initialName);
  const [email, setEmail] = useState(initialEmail.includes('@firebase.user') ? '' : initialEmail);
  const [errors, setErrors] = useState<{ fullName?: string; email?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const errs: { fullName?: string; email?: string } = {};

    if (!fullName.trim()) {
      errs.fullName = 'Full name is required';
    } else if (fullName.trim().length < 2) {
      errs.fullName = 'Please enter a valid full name';
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const cleanName = fullName.trim();
      const cleanEmail = email.trim().toLowerCase();
      const currentUser = authStore.getUser();
      const phoneToUse = existingPhone || currentUser?.phone || '';
      const formattedPhone = phoneToUse.startsWith('+') ? phoneToUse : `+91${phoneToUse.replace(/[^0-9]/g, '')}`;

      // Step 7: Call PUT /api/user/profile (Endpoint 2: Profile Completion & Updates)
      // Headers: Authorization: Bearer <firebase_id_token>
      // Body: { name, email, phone }
      const updatedProfile = await userApi.updateProfile({
        name: cleanName,
        fullName: cleanName,
        email: cleanEmail || undefined,
        phone: formattedPhone,
      });

      // Update local user object
      const parts = cleanName.split(' ');
      const firstName = parts[0] || 'Member';
      const lastName = parts.slice(1).join(' ') || '';

      const updatedUser = {
        ...(currentUser || {}),
        id: String((updatedProfile as any)?.userId || (updatedProfile as any)?.id || currentUser?.id || Date.now()),
        fullName: cleanName,
        firstName,
        lastName,
        email: cleanEmail,
        phone: formattedPhone,
        role: 'CUSTOMER',
        accountType: currentUser?.accountType || 'individual',
        isVerified: true,
        isPhoneVerified: true,
        isEmailVerified: true,
      };

      // Synchronize with POST /api/auth/sync (role="CUSTOMER")
      let latestAccessToken = authStore.getToken() || '';
      try {
        const freshIdToken = await auth.currentUser?.getIdToken();
        const syncRes = await authApi.syncUser({
          firebaseIdToken: freshIdToken,
          name: cleanName,
          email: cleanEmail || undefined,
          phone: formattedPhone,
          role: 'CUSTOMER',
        });
        if (syncRes?.accessToken) {
          latestAccessToken = syncRes.accessToken;
        }
      } catch (syncErr: any) {
        console.warn('[CompleteProfile] syncUser notice:', syncErr?.message || syncErr);
      }

      // If Firebase user is active, update displayName
      if (auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, { displayName: cleanName });
        } catch {}
      }

      authStore.saveSession({
        user: updatedUser as any,
        accessToken: latestAccessToken,
        refreshToken: authStore.getRefreshToken() || '',
      });

      dispatch(
        updateUser({
          fullName: cleanName,
          firstName,
          lastName,
          email: cleanEmail,
          phone: formattedPhone,
        })
      );

      if (formattedPhone) {
        authStore.saveRegisteredUserName(formattedPhone, cleanName);
        authStore.markPhoneRegistered(formattedPhone);
      }

      const returnScreen = route?.params?.returnScreen;
      const returnParams = route?.params?.returnParams;
      setIsLoading(false);
      await syncSavedGuestAddressIfNeeded().catch(() => {});
      if (cartAuthGuard.hasPendingAction()) {
        try {
          await cartAuthGuard.executePendingAction(dispatch);
        } catch (e) {
          console.warn('[CompleteProfileScreen] executePendingAction error:', e);
        }
      }
      navigateToPostAuthScreen(navigation, returnScreen, returnParams);
    } catch (err: any) {
      setIsLoading(false);
      const status = err?.response?.status || err?.status || err?.statusCode;
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to update profile. Please try again.';

      // 409 Conflict: Duplicate Phone or Email
      if (status === 409) {
        Alert.alert('Account Conflict', errorMsg);
        return;
      }

      // 401 Unauthorized: Session Expired
      if (status === 401) {
        Alert.alert('Session Expired', 'Authentication token has expired. Please log in again.', [
          {
            text: 'Login',
            onPress: () => navigation.navigate('Login'),
          },
        ]);
        return;
      }

      const returnScreen = route?.params?.returnScreen;
      const returnParams = route?.params?.returnParams;
      Alert.alert('Profile Notice', errorMsg, [
        {
          text: 'Continue Anyway',
          onPress: async () => {
            await syncSavedGuestAddressIfNeeded().catch(() => {});
            navigateToPostAuthScreen(navigation, returnScreen, returnParams);
          },
        },
        { text: 'Try Again', style: 'cancel' },
      ]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 20) + 16,
              paddingBottom: Math.max(insets.bottom, 24) + 16,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Branding */}
          <View style={styles.brandRow}>
            <Image
              source={
                isDark
                  ? require('../../../../assets/logo-white.png')
                  : require('../../../../assets/logo-horizontal-color.png')
              }
              style={styles.brandLogo}
              contentFit="contain"
            />
          </View>

          {/* Heading */}
          <View style={styles.headerBlock}>
            <View style={[styles.badgeIcon, { backgroundColor: isDark ? 'rgba(227, 30, 36, 0.15)' : '#FEE2E2' }]}>
              <Ionicons name="person-circle" size={32} color="#E31E24" />
            </View>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              Complete Your Profile
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Please provide your full name and official email address to finish setting up your HinchMart account.
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
            {/* Full Name Field */}
            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textPrimary }]}>
                Full Name <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: errors.fullName ? '#EF4444' : theme.colors.border,
                  },
                ]}
              >
                <Ionicons name="person-outline" size={18} color={theme.colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.colors.textPrimary }]}
                  placeholder="e.g. Rishi Kottala"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
              {Boolean(errors.fullName) && (
                <Text style={styles.errorText}>{errors.fullName}</Text>
              )}
            </View>

            {/* Email Field */}
            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textPrimary }]}>
                Email Address
              </Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: errors.email ? '#EF4444' : theme.colors.border,
                  },
                ]}
              >
                <Ionicons name="mail-outline" size={18} color={theme.colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.colors.textPrimary }]}
                  placeholder="e.g. rishi@example.com"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {Boolean(errors.email) && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Verified Phone Readonly Pill */}
            {Boolean(existingPhone) && (
              <View style={[styles.phonePill, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5' }]}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.phonePillText, { color: isDark ? '#34D399' : '#059669' }]}>
                  Verified Mobile: {existingPhone}
                </Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={isLoading}
              style={[styles.submitBtn, { backgroundColor: '#E31E24', opacity: isLoading ? 0.75 : 1 }]}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.btnInner}>
                  <Text style={styles.submitBtnText}>Save & Continue</Text>
                  <Ionicons name="arrow-forward" size={17} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  brandRow: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  brandLogo: {
    width: 150,
    height: 38,
  },
  headerBlock: {
    width: '100%',
    marginBottom: 24,
  },
  badgeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 24,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    width: '100%',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 }
      : { elevation: 2 }),
  },
  fieldWrap: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 6,
  },
  requiredStar: {
    color: '#EF4444',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 14.5,
    height: '100%',
  },
  errorText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: '#EF4444',
    fontSize: 11.5,
    marginTop: 4,
    marginLeft: 2,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 20,
  },
  phonePillText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 12.5,
  },
  submitBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 15.5,
  },
});
