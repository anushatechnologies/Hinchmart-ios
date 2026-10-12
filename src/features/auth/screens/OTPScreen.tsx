/**
 * HINCH MART — Clean & Modern OTP Verification Screen
 * Simple, neat, and distraction-free design:
 * - Clean top navigation bar with back arrow
 * - Soft brand icon badge (Shield & Key)
 * - Clear headline "Verify Phone Number"
 * - Clean masked phone capsule with "Change" action
 * - 6 rounded crisp OTP digit boxes with auto-advance and paste support
 * - Automatic direct OTP retrieval & seamless login
 * - Clean resend timer with active link
 * - Sleek brand action button "Verify & Continue"
 * - End-to-end encryption security badge
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  StatusBar,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authStore } from '../../../store/authStore';
import { authApi } from '../../../services/api/auth.api';
import {
  getActiveConfirmationResult,
  verifyFirebasePhoneOtp,
  verifyPhoneOtpWithSessionInfo,
  sendFirebasePhoneOtp,
  isGenericName,
} from '../../../services/api/firebaseAuth';
import { FirebaseRecaptchaModal } from '../../../components/auth/FirebaseRecaptchaModal';
import { cartApi } from '../../../services/api/cart.api';
import { cartAuthGuard } from '../../../services/cart/cartAuthGuard';
import { setServerCart, selectCartItems } from '../../../redux/slices/cartSlice';
import { store } from '../../../redux';
import {
  navigateToPostAuthScreen,
  syncSavedGuestAddressIfNeeded,
} from '../../../services/checkout/checkoutAuthGuard';

export function OTPScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardOpen(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardOpen(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const rawPhone = String(route?.params?.phone || route?.params?.identifier || '');
  const countryDial = route?.params?.countryDial || '+91';
  const isNewUser = route?.params?.isNewUser || false;
  const fullPhone =
    route?.params?.fullPhone || `${countryDial}${rawPhone.replace(/[^0-9]/g, '')}`;

  // Masked phone format: +91 ••••• •••XX
  const maskedPhone = useMemo(() => {
    const digitsOnly = rawPhone.replace(/[^0-9]/g, '');
    if (!digitsOnly) return '';
    const lastTwo = digitsOnly.length >= 2 ? digitsOnly.slice(-2) : digitsOnly;
    return `${countryDial} ••••• •••${lastTwo}`;
  }, [rawPhone, countryDial]);

  // 6 separate box digits - start completely empty for manual user entry
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [activeVerificationId, setActiveVerificationId] = useState<string>(
    route?.params?.verificationId || ''
  );
  const [recaptchaVisible, setRecaptchaVisible] = useState(false);

  // Refs for 6 input boxes
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // If no phone number was passed, redirect back to Login
  useEffect(() => {
    if (!rawPhone) {
      navigation.replace('Login');
    }
  }, [rawPhone]);

  // 30-Second Resend Countdown Timer
  useEffect(() => {
    if (timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerSeconds]);

  // Auto-verify when all 6 digits are entered
  useEffect(() => {
    const complete = digits.join('');
    if (complete.length === 6 && !isLoading && !otpError) {
      const t = setTimeout(() => verifyOtp(complete), 250);
      return () => clearTimeout(t);
    }
  }, [digits]);

  const handleDigitChange = (text: string, index: number) => {
    if (otpError) setOtpError('');

    // Handle full 6-digit paste
    const digitsOnly = text.replace(/[^0-9]/g, '');
    if (digitsOnly.length === 6) {
      const pasted = digitsOnly.split('');
      setDigits(pasted);
      inputRefs.current[5]?.focus();
      return;
    }

    const val = digitsOnly.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = val;
    setDigits(newDigits);

    // Auto-advance to next box
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (timerSeconds > 0 || isLoading) return;
    setOtpError('');

    const fullPhone =
      route?.params?.fullPhone || `${countryDial}${rawPhone.replace(/[^0-9]/g, '')}`;

    if (Platform.OS === 'web') {
      setIsLoading(true);
      try {
        await sendFirebasePhoneOtp(fullPhone);
        setIsLoading(false);
        setTimerSeconds(30);
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } catch (err: any) {
        setIsLoading(false);
        setOtpError(err?.message || 'Failed to resend OTP. Please try again.');
        triggerShake();
      }
    } else {
      // Trigger invisible background SMS send (no visible reCAPTCHA)
      setIsLoading(true);
      setRecaptchaVisible(true);
    }
  };

  const handleRecaptchaSuccess = (newVerificationId: string) => {
    setIsLoading(false);
    setRecaptchaVisible(false);
    setActiveVerificationId(newVerificationId);
    setTimerSeconds(30);
    setDigits(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  const handleRecaptchaError = (err: string) => {
    setIsLoading(false);
    setRecaptchaVisible(false);
    setOtpError(err || 'Failed to resend code. Please try again.');
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const verifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || digits.join('');
    if (code.length < 6) {
      setOtpError('Please enter all 6 digits');
      triggerShake();
      return;
    }

    setIsLoading(true);
    setOtpError('');

    try {
      const payload = route?.params?.registrationPayload;
      const targetPhone = fullPhone || rawPhone.trim();
      // Only use name if explicitly provided by registration screen, never synthetic/cached for phone-only logins
      const explicitName = payload?.fullName?.trim() || undefined;

      // 1. If active verificationId from native reCAPTCHA bridge exists, verify via Firebase REST & sync
      if (activeVerificationId) {
        const syncResult = await verifyPhoneOtpWithSessionInfo(activeVerificationId, code, {
          phone: targetPhone,
          name: explicitName,
          email: route?.params?.email || payload?.email,
          companyName: payload?.companyName,
          businessType: payload?.businessType,
          gstNumber: payload?.gstNumber,
          panNumber: payload?.panNumber,
          role: 'BUYER',
        });

        if (explicitName) {
          authStore.saveRegisteredUserName(targetPhone, explicitName);
        }
        authStore.markPhoneRegistered(targetPhone);

        // Post-login guest cart sync
        try {
          const guestItems = selectCartItems(store.getState());
          const currentStoreId = (store.getState().cart as any)?.storeId;
          if (Array.isArray(guestItems) && guestItems.length > 0) {
            const syncPayload = guestItems.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity || 1,
            }));
            const mergedCart = await cartApi.syncGuestCart(syncPayload, currentStoreId);
            if (mergedCart) store.dispatch(setServerCart(mergedCart));
          } else {
            const serverCart = await cartApi.getCart();
            if (serverCart) store.dispatch(setServerCart(serverCart));
          }
        } catch {
          // Non-blocking: cart sync failure should not prevent login
        }

        // Execute pending Add to Cart action if user was prompted to login/register from Add to Cart
        if (cartAuthGuard.hasPendingAction()) {
          try {
            await cartAuthGuard.executePendingAction(store.dispatch);
          } catch (pendingErr) {
            console.warn('[OTPScreen] Pending cart action execution error:', pendingErr);
          }
        }

        setIsLoading(false);

        // Step 6: Frontend inspects the response:
        // - If "name" is null: show Profile Completion screen (email is optional).
        // - If all required details exist: navigate to Home/Dashboard.
        const returnedName = syncResult?.syncUser?.name;
        const returnedEmail = syncResult?.syncUser?.email;
        const isNameComplete = Boolean(
          returnedName &&
          !isGenericName(returnedName) &&
          returnedName.trim().length > 0
        );
        const isComplete =
          isNameComplete &&
          syncResult?.syncUser?.profileComplete !== false &&
          (syncResult?.syncUser as any)?.isProfileComplete !== false;

        const returnScreen = route?.params?.returnScreen;
        const returnParams = route?.params?.returnParams;
        const action = route?.params?.action;

        if (!isComplete) {
          navigation.reset({
            index: 0,
            routes: [{
              name: 'CompleteProfile',
              params: {
                phone: targetPhone,
                name: returnedName || explicitName || null,
                email: returnedEmail || null,
                returnScreen,
                returnParams,
                action,
              },
            }],
          });
        } else {
          await syncSavedGuestAddressIfNeeded().catch(() => {});
          navigateToPostAuthScreen(navigation, returnScreen, returnParams);
        }
        return;
      }

      // 2. If an active Firebase Confirmation Result is waiting (Web SDK), confirm & sync
      if (getActiveConfirmationResult()) {
        const syncResult = await verifyFirebasePhoneOtp(code, {
          phone: targetPhone,
          name: explicitName,
          email: route?.params?.email || payload?.email,
          companyName: payload?.companyName,
          businessType: payload?.businessType,
          gstNumber: payload?.gstNumber,
          panNumber: payload?.panNumber,
          role: 'BUYER',
        });

        if (explicitName) {
          authStore.saveRegisteredUserName(targetPhone, explicitName);
        }
        authStore.markPhoneRegistered(targetPhone);

        // Post-login guest cart sync
        try {
          const guestItems = selectCartItems(store.getState());
          const currentStoreId = (store.getState().cart as any)?.storeId;
          if (Array.isArray(guestItems) && guestItems.length > 0) {
            const syncPayload = guestItems.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity || 1,
            }));
            const mergedCart = await cartApi.syncGuestCart(syncPayload, currentStoreId);
            if (mergedCart) store.dispatch(setServerCart(mergedCart));
          } else {
            const serverCart = await cartApi.getCart();
            if (serverCart) store.dispatch(setServerCart(serverCart));
          }
        } catch {
          // Non-blocking: cart sync failure should not prevent login
        }

        // Execute pending Add to Cart action if user was prompted to login/register from Add to Cart
        if (cartAuthGuard.hasPendingAction()) {
          try {
            await cartAuthGuard.executePendingAction(store.dispatch);
          } catch (pendingErr) {
            console.warn('[OTPScreen] Pending cart action execution error:', pendingErr);
          }
        }

        setIsLoading(false);

        // Step 6: Frontend inspects the response:
        // - If "name" is null: show Profile Completion screen (email is optional).
        // - If all required details exist: navigate to Home/Dashboard.
        const returnedName = syncResult?.syncUser?.name;
        const returnedEmail = syncResult?.syncUser?.email;
        const isNameComplete = Boolean(
          returnedName &&
          !isGenericName(returnedName) &&
          returnedName.trim().length > 0
        );
        const isComplete =
          isNameComplete &&
          syncResult?.syncUser?.profileComplete !== false &&
          (syncResult?.syncUser as any)?.isProfileComplete !== false;

        const returnScreen = route?.params?.returnScreen;
        const returnParams = route?.params?.returnParams;
        const action = route?.params?.action;

        if (!isComplete) {
          navigation.reset({
            index: 0,
            routes: [{
              name: 'CompleteProfile',
              params: {
                phone: targetPhone,
                name: returnedName || explicitName || null,
                email: returnedEmail || null,
                returnScreen,
                returnParams,
                action,
              },
            }],
          });
        } else {
          await syncSavedGuestAddressIfNeeded().catch(() => {});
          navigateToPostAuthScreen(navigation, returnScreen, returnParams);
        }
        return;
      }

      // 3. No active real SMS verification session -> Strictly reject dummy bypass (e.g. 123456)
      throw new Error(
        'No active verification session found. Please tap Resend to receive a verification code on your mobile.'
      );
    } catch (err: any) {
      setIsLoading(false);
      let errorMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Invalid verification code. Please check your SMS and try again.';

      if (
        errorMsg.includes('INVALID_CODE') ||
        errorMsg.includes('auth/invalid-verification-code') ||
        err?.code === 'auth/invalid-verification-code' ||
        errorMsg.includes('INVALID_OTP')
      ) {
        errorMsg = 'Invalid verification code. Please enter the valid code sent to your mobile.';
      } else if (
        errorMsg.includes('SESSION_EXPIRED') ||
        errorMsg.includes('auth/code-expired') ||
        err?.code === 'auth/code-expired'
      ) {
        errorMsg = 'Verification code has expired. Please tap Resend to receive a new code.';
      }

      setOtpError(errorMsg);
      triggerShake();
    }
  };

  const handleChangePhone = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Login');
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  const topPad = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20);

  return (
    <View style={styles.screenRoot}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />

      {/* Top Header Navigation */}
      <View style={[styles.topNavBar, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(insets.bottom, 24) + (isKeyboardOpen ? 140 : 24),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="always"
        >
          {/* Central Clean Card */}
          <View style={styles.cleanCard}>
            
            {/* Header Icon */}
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={28} color="#0038A8" />
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.headingTitle}>Verify Phone Number</Text>
            <Text style={styles.subText}>
              Please enter the 6-digit verification code sent to
            </Text>

            {/* Masked Phone Pill with Change Button */}
            <View style={styles.phoneCapsule}>
              <Ionicons name="call" size={14} color="#0038A8" style={{ marginRight: 6 }} />
              <Text style={styles.phoneText}>{maskedPhone}</Text>
              <TouchableOpacity onPress={handleChangePhone} activeOpacity={0.7} style={styles.changeLink}>
                <Text style={styles.changeLinkText}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* 6 Digit Input Boxes */}
            <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
              {digits.map((digit, idx) => {
                const isFilled = Boolean(digit);
                return (
                  <View
                    key={idx}
                    style={[
                      styles.otpBox,
                      isFilled && styles.otpBoxFilled,
                      Boolean(otpError) && styles.otpBoxError,
                    ]}
                  >
                    <TextInput
                      ref={(ref) => { inputRefs.current[idx] = ref; }}
                      style={styles.otpInput}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={digit}
                      onChangeText={(text) => handleDigitChange(text, idx)}
                      onKeyPress={(e) => handleKeyPress(e, idx)}
                      selectTextOnFocus
                      editable={!isLoading}
                    />
                  </View>
                );
              })}
            </Animated.View>

            {/* Error Message */}
            {Boolean(otpError) && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={15} color="#EF4444" />
                <Text style={styles.errorText}>{otpError}</Text>
              </View>
            )}

            {/* Resend Section */}
            <View style={styles.resendRow}>
              <Text style={styles.resendText}>Didn't receive code? </Text>
              {timerSeconds > 0 ? (
                <Text style={styles.timerText}>
                  Resend in <Text style={styles.timerBold}>{formatTimer(timerSeconds)}</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResendOtp} activeOpacity={0.75}>
                  <Text style={styles.resendBtnText}>Resend OTP</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              onPress={() => verifyOtp(digits.join(''))}
              disabled={isLoading || digits.join('').length < 6}
              activeOpacity={0.88}
              style={[
                styles.primaryBtn,
                (isLoading || digits.join('').length < 6) && styles.primaryBtnDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Verify & Continue</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </>
              )}
            </TouchableOpacity>

            {/* Security Footnote */}
            <View style={styles.securityRow}>
              <Ionicons name="lock-closed-outline" size={13} color="#94A3B8" />
              <Text style={styles.securityText}>Secured by 256-bit encryption</Text>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {recaptchaVisible && (
        <FirebaseRecaptchaModal
          visible={recaptchaVisible}
          phoneNumber={route?.params?.fullPhone || `${countryDial}${rawPhone.replace(/[^0-9]/g, '')}`}
          onSuccess={handleRecaptchaSuccess}
          onError={handleRecaptchaError}
          onClose={() => {
            setIsLoading(false);
            setRecaptchaVisible(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Top Navbar
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 16,
    color: '#0F172A',
  },

  // Central Clean Card
  cleanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  // Icon Circle
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },

  // Text
  headingTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 18,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  subText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 8,
  },

  // Phone Capsule
  phoneCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  phoneText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 12.5,
    color: '#1E293B',
    marginRight: 8,
  },
  changeLink: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  changeLinkText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 12,
    color: '#B45309',
    textDecorationLine: 'underline',
  },

  // 6 OTP Digit Boxes
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
    width: '100%',
  },
  otpBox: {
    width: 42,
    height: 48,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    borderColor: '#FDB913',
    backgroundColor: '#FFFFFF',
  },
  otpBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  otpInput: {
    width: '100%',
    height: '100%',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 18,
    color: '#0F172A',
    textAlign: 'center',
  },

  // Error Banner
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 6,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12,
    color: '#EF4444',
  },

  // Resend Row
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resendText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12.5,
    color: '#64748B',
  },
  timerText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12.5,
    color: '#64748B',
  },
  timerBold: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    color: '#0F172A',
  },
  resendBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 12.5,
    color: '#E31E24',
  },

  // Primary Button
  primaryBtn: {
    width: '100%',
    height: 46,
    borderRadius: 8,
    backgroundColor: '#E31E24',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  primaryBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  primaryBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 14,
    color: '#FFFFFF',
  },

  // Security Footnote
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  securityText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11,
    color: '#94A3B8',
  },
});

