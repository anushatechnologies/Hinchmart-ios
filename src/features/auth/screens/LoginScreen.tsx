/**
 * HINCH MART — Pixel-Perfect Mobile OTP Login Screen
 * Features:
 * - Phone number only (Email & Password removed)
 * - Left-side country code dropdown picker (+91 ▾)
 * - Green checkmark indicator when a valid mobile number is entered
 * - Database existence check on submit:
 *     - If user exists in DB -> proceeds to send OTP and navigate to OTP screen
 *     - If new user (not in DB) -> automatically redirects to Create Account / Register screen
 * - Live Firebase Phone SMS OTP via native reCAPTCHA bridge
 * - "Don't have an account? Register Now" link
 */
import React, { useState, useRef, useEffect } from 'react';
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
  Modal,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '../../../services/api/auth.api';
import { sendFirebasePhoneOtp } from '../../../services/api/firebaseAuth';
import { FirebaseRecaptchaModal } from '../../../components/auth/FirebaseRecaptchaModal';
import { authStore } from '../../../store/authStore';

export interface CountryCodeItem {
  code: string;
  dial: string;
  name: string;
  flag: string;
  digits: number;
}

export const COUNTRY_CODES: CountryCodeItem[] = [
  { code: 'IN', dial: '+91', name: 'India', flag: '🇮🇳', digits: 10 },
  { code: 'AE', dial: '+971', name: 'United Arab Emirates', flag: '🇦🇪', digits: 9 },
  { code: 'SA', dial: '+966', name: 'Saudi Arabia', flag: '🇸🇦', digits: 9 },
  { code: 'US', dial: '+1', name: 'United States', flag: '🇺🇸', digits: 10 },
  { code: 'GB', dial: '+44', name: 'United Kingdom', flag: '🇬🇧', digits: 10 },
  { code: 'SG', dial: '+65', name: 'Singapore', flag: '🇸🇬', digits: 8 },
  { code: 'QA', dial: '+974', name: 'Qatar', flag: '🇶🇦', digits: 8 },
  { code: 'OM', dial: '+968', name: 'Oman', flag: '🇴🇲', digits: 8 },
  { code: 'KW', dial: '+965', name: 'Kuwait', flag: '🇰🇼', digits: 8 },
  { code: 'BH', dial: '+973', name: 'Bahrain', flag: '🇧🇭', digits: 8 },
  { code: 'CA', dial: '+1', name: 'Canada', flag: '🇨🇦', digits: 10 },
  { code: 'AU', dial: '+61', name: 'Australia', flag: '🇦🇺', digits: 9 },
  { code: 'DE', dial: '+49', name: 'Germany', flag: '🇩🇪', digits: 10 },
  { code: 'MY', dial: '+60', name: 'Malaysia', flag: '🇲🇾', digits: 10 },
];

export function LoginScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const [selectedCountry, setSelectedCountry] = useState<CountryCodeItem>(COUNTRY_CODES[0]);
  const [identifier, setIdentifier] = useState(route?.params?.phone || '');
  const [identifierError, setIdentifierError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Checking account...');
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [recaptchaVisible, setRecaptchaVisible] = useState(false);
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

  const filteredCountries = COUNTRY_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.dial.includes(countrySearch) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const validatePhone = (): boolean => {
    const cleanPhone = identifier.replace(/[^0-9]/g, '');

    if (!cleanPhone) {
      setIdentifierError('Mobile number is required');
      return false;
    }

    if (selectedCountry.dial === '+91') {
      if (cleanPhone.length !== 10) {
        setIdentifierError('Mobile number must be exactly 10 digits');
        return false;
      }
      if (!/^[6-9]/.test(cleanPhone)) {
        setIdentifierError('Mobile number must start with 6, 7, 8, or 9');
        return false;
      }
    } else {
      const requiredDigits = selectedCountry.digits || 10;
      if (cleanPhone.length !== requiredDigits) {
        setIdentifierError(`Enter a valid ${requiredDigits}-digit mobile number`);
        return false;
      }
    }

    setIdentifierError('');
    return true;
  };

  const handleContinueWithOtp = async () => {
    if (!validatePhone()) return;

    setIdentifierError('');
    setIsLoading(true);
    setLoadingMessage('Checking account...');

    const cleanPhone = identifier.replace(/[^0-9]/g, '');
    const fullPhone = `${selectedCountry.dial}${cleanPhone}`;

    try {
      // 1. Check DB if user exists via GET /api/auth/check-phone?phone={phoneNumber}
      let userExists = false;
      let existingUserName: string | undefined;

      try {
        const checkRes = await authApi.checkPhone(fullPhone);
        if (checkRes && checkRes.data && typeof checkRes.data.exists === 'boolean') {
          userExists = checkRes.data.exists;
          existingUserName = checkRes.data.name;
        } else {
          userExists = await authApi.checkUserExists(fullPhone);
        }
      } catch {
        userExists = await authApi.checkUserExists(fullPhone);
      }

      const returnScreen = route?.params?.returnScreen;
      const returnParams = route?.params?.returnParams;
      const action = route?.params?.action;

      if (!userExists) {
        // User not in DB -> Navigate to Register / Create Account page for new users
        setIsLoading(false);
        navigation.navigate('RegistrationDetails', {
          phone: cleanPhone,
          fullPhone,
          countryDial: selectedCountry.dial,
          countryFlag: selectedCountry.flag,
          isNewUser: true,
          returnScreen,
          returnParams,
          action,
        });
        return;
      }

      // 2. User exists in DB -> Send OTP and proceed to OTPScreen
      const resolvedName =
        existingUserName ||
        authStore.getRegisteredUserName(fullPhone) ||
        authStore.getRegisteredUserName(cleanPhone);

      setLoadingMessage('Sending verification code...');
      if (Platform.OS === 'web') {
        await sendFirebasePhoneOtp(fullPhone);
        setIsLoading(false);
        navigation.navigate('OTP', {
          phone: cleanPhone,
          fullPhone,
          countryDial: selectedCountry.dial,
          countryFlag: selectedCountry.flag,
          isNewUser: false,
          purpose: 'LOGIN',
          returnScreen,
          returnParams,
          action,
          registrationPayload: undefined,
        });
      } else {
        // On Native Mobile (Android/iOS): Send real SMS OTP in background invisibly (no reCAPTCHA modal)
        setIsLoading(true);
        setRecaptchaVisible(true);
      }
    } catch (err: any) {
      setIsLoading(false);
      setIdentifierError(
        err?.message || 'Failed to verify account. Please check your network and try again.'
      );
    }
  };

  const handleRecaptchaSuccess = (verificationId: string) => {
    setIsLoading(false);
    setRecaptchaVisible(false);
    const cleanPhone = identifier.replace(/[^0-9]/g, '');
    const fullPhone = `${selectedCountry.dial}${cleanPhone}`;
    const returnScreen = route?.params?.returnScreen;
    const returnParams = route?.params?.returnParams;
    const action = route?.params?.action;

    navigation.navigate('OTP', {
      phone: cleanPhone,
      fullPhone,
      verificationId,
      countryDial: selectedCountry.dial,
      countryFlag: selectedCountry.flag,
      isNewUser: false,
      purpose: 'LOGIN',
      returnScreen,
      returnParams,
      action,
      registrationPayload: undefined,
    });
  };

  const handleRecaptchaError = (err: string) => {
    setIsLoading(false);
    setRecaptchaVisible(false);
    setIdentifierError(err || 'Failed to send verification code. Please try again.');
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F8FC" translucent={false} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 16) + 16,
              paddingBottom: Math.max(insets.bottom, 24) + (isKeyboardOpen ? 120 : 24),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          bounces={true}
          overScrollMode="always"
        >
          {/* Top Logo & Welcome Header */}
          <View style={styles.headerSection}>
            <Image
              source={require('../../../../assets/logo.png')}
              style={styles.brandLogo}
              contentFit="contain"
            />
            <Text style={styles.welcomeTitle}>Welcome Back!</Text>
            <Text style={styles.welcomeSubtitle}>Good to see you again. Let’s get you signed in.</Text>
          </View>

          {/* Centered White Card */}
          <View style={styles.card}>
            {/* Card Title */}
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Login to your account</Text>
              <View style={styles.cardTitleUnderline} />
            </View>

            {/* Mobile Number Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mobile Number</Text>

              <View
                style={[
                  styles.inputContainer,
                  Boolean(identifierError) && styles.inputContainerError,
                ]}
              >
                {/* Left Side Country Code Picker Dropdown (+91 ▾) */}
                <TouchableOpacity
                  onPress={() => setCountryModalVisible(true)}
                  style={styles.countryPickerBtn}
                  activeOpacity={0.75}
                >
                  <Text style={styles.countryFlagText}>{selectedCountry.flag}</Text>
                  <Text style={styles.countryDialText}>{selectedCountry.dial}</Text>
                  <Ionicons name="chevron-down" size={13} color="#0038A8" style={{ marginLeft: 3 }} />
                </TouchableOpacity>

                <View style={styles.inputDivider} />

                {/* Input Box */}
                <TextInput
                  style={styles.textInput}
                  placeholder={`Enter ${selectedCountry.digits || 10}-digit mobile number`}
                  placeholderTextColor="#94A3B8"
                  value={identifier}
                  onChangeText={(text) => {
                    const cleanDigits = text.replace(/[^0-9]/g, '').slice(0, selectedCountry.digits || 10);
                    setIdentifier(cleanDigits);
                    if (identifierError) setIdentifierError('');
                  }}
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  maxLength={selectedCountry.digits || 10}
                  multiline={false}
                  numberOfLines={1}
                />

                {/* Right Side Green Tick — shown once full valid mobile number is entered */}
                {identifier.length === (selectedCountry.digits || 10) && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#16A34A"
                    style={styles.validTickIcon}
                  />
                )}
              </View>

              {Boolean(identifierError) && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
                  <Text style={styles.errorText}>{identifierError}</Text>
                </View>
              )}
            </View>

            {/* LOGIN WITH OTP Action Button */}
            <TouchableOpacity
              onPress={handleContinueWithOtp}
              style={styles.loginBtn}
              activeOpacity={0.85}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.loadingBtnText}>{loadingMessage}</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.loginBtnText}>LOGIN WITH OTP</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Don't have an account? Register Now */}
          <View style={styles.footerLinkRow}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('RegistrationDetails', {
                phone: identifier.replace(/[^0-9]/g, ''),
                countryDial: selectedCountry.dial,
                returnScreen: route?.params?.returnScreen,
              })}
              activeOpacity={0.7}
            >
              <Text style={styles.registerLink}>Register Now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Selection Modal */}
      <Modal
        visible={countryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCountryModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCountryModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country Code</Text>
              <TouchableOpacity
                onPress={() => setCountryModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Search Country Input */}
            <View style={styles.modalSearchBox}>
              <Ionicons name="search-outline" size={16} color="#94A3B8" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search country or code..."
                placeholderTextColor="#94A3B8"
                value={countrySearch}
                onChangeText={setCountrySearch}
              />
            </View>

            <ScrollView style={{ maxHeight: 330 }} showsVerticalScrollIndicator={false}>
              {filteredCountries.map((item) => {
                const isSelected = selectedCountry.dial === item.dial && selectedCountry.code === item.code;
                return (
                  <TouchableOpacity
                    key={`${item.code}-${item.dial}`}
                    onPress={() => {
                      setSelectedCountry(item);
                      setCountryModalVisible(false);
                      setCountrySearch('');
                    }}
                    style={[
                      styles.countryOptionRow,
                      isSelected && styles.countryOptionRowSelected,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.countryOptionLeft}>
                      <Text style={styles.countryOptionFlag}>{item.flag}</Text>
                      <Text style={styles.countryOptionName}>{item.name}</Text>
                    </View>
                    <View style={styles.countryOptionRight}>
                      <Text style={styles.countryOptionDial}>{item.dial}</Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={18} color="#0038A8" style={{ marginLeft: 6 }} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {recaptchaVisible && (
        <FirebaseRecaptchaModal
          visible={recaptchaVisible}
          phoneNumber={`${selectedCountry.dial}${identifier.replace(/[^0-9]/g, '')}`}
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
  screenContainer: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  brandLogo: {
    width: 140,
    height: 85,
    marginBottom: 6,
  },
  welcomeTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: '#0F172A',
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    maxWidth: 320,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
        }
      : { elevation: 6 }),
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 6,
  },
  cardTitleUnderline: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#0038A8',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    color: '#0F172A',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    height: 50,
    overflow: 'hidden',
  },
  inputContainerError: {
    borderColor: '#EF4444',
  },
  countryPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 12,
    backgroundColor: '#EEF4FF',
  },
  countryFlagText: {
    fontSize: 18,
    marginRight: 4,
  },
  countryDialText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    color: '#0038A8',
  },
  inputDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
  textInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    paddingVertical: 0,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#0F172A',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  errorText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12,
    color: '#EF4444',
  },
  validTickIcon: {
    marginRight: 12,
  },
  loginBtn: {
    backgroundColor: '#E31E24',
    borderRadius: 8,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 13,
    color: '#FFFFFF',
  },
  loginBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 5,
  },
  footerText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 13,
    color: '#64748B',
  },
  registerLink: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 13,
    color: '#E31E24',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: '100%',
    maxWidth: 380,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  modalTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 15,
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 8,
    gap: 6,
  },
  modalSearchInput: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12.5,
    color: '#0F172A',
  },
  countryOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 2,
  },
  countryOptionRowSelected: {
    backgroundColor: '#FEF2F2',
  },
  countryOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countryOptionFlag: {
    fontSize: 18,
  },
  countryOptionName: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 13,
    color: '#334155',
  },
  countryOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryOptionDial: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 12.5,
    color: '#152238',
  },
});
