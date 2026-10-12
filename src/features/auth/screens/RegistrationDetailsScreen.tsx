/**
 * HINCH MART — Pixel-Perfect "Create Your Account" Registration Screen
 * Contains ONLY:
 * - Full Name input field (with person icon)
 * - Mobile Number input field (with left-side country code picker dropdown +91 ▾)
 * - Clean agreement notice to Terms & Privacy Policy
 * - Royal Red "REGISTER" button (sends real phone SMS OTP)
 * - "Already have an account? Login" link
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
  Modal,
  Keyboard,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

export function RegistrationDetailsScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Initialize with forwarded phone and country from Login screen if user was redirected
  const initialPhone = String(route?.params?.phone || '');
  const initialDial = route?.params?.countryDial || '+91';

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

  // ONLY Full Name and Mobile Number
  const [fullName, setFullName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCodeItem>(
    COUNTRY_CODES.find((c) => c.dial === initialDial) || COUNTRY_CODES[0]
  );
  const [mobileNumber, setMobileNumber] = useState(initialPhone);

  useEffect(() => {
    if (route?.params?.phone) {
      setMobileNumber(String(route.params.phone));
    }
    if (route?.params?.countryDial) {
      const match = COUNTRY_CODES.find((c) => c.dial === route.params.countryDial);
      if (match) setSelectedCountry(match);
    }
  }, [route?.params?.phone, route?.params?.countryDial]);

  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [recaptchaVisible, setRecaptchaVisible] = useState(false);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const filteredCountries = COUNTRY_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.dial.includes(countrySearch) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};

    if (!fullName.trim()) {
      errs.fullName = 'Full name is required';
    } else if (fullName.trim().length < 2) {
      errs.fullName = 'Please enter your full name';
    }

    const cleanPhone = mobileNumber.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      errs.mobileNumber = 'Mobile number is required';
    } else if (selectedCountry.dial === '+91') {
      if (cleanPhone.length !== 10) {
        errs.mobileNumber = 'Mobile number must be exactly 10 digits';
      } else if (!/^[6-9]/.test(cleanPhone)) {
        errs.mobileNumber = 'Mobile number must start with 6, 7, 8, or 9';
      }
    } else {
      const requiredDigits = selectedCountry.digits || 10;
      if (cleanPhone.length !== requiredDigits) {
        errs.mobileNumber = `Enter a valid ${requiredDigits}-digit mobile number`;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setErrors({});
    const cleanPhone = mobileNumber.replace(/[^0-9]/g, '');
    const fullPhone = `${selectedCountry.dial}${cleanPhone}`;

    if (Platform.OS === 'web') {
      setIsLoading(true);
      try {
        await sendFirebasePhoneOtp(fullPhone);
        authStore.saveRegisteredUserName(fullPhone, fullName.trim());
        authStore.saveRegisteredUserName(cleanPhone, fullName.trim());
        authStore.markPhoneRegistered(fullPhone);
        authStore.markPhoneRegistered(cleanPhone);
        setIsLoading(false);
        navigation.navigate('OTP', {
          phone: cleanPhone,
          fullPhone,
          countryDial: selectedCountry.dial,
          countryFlag: selectedCountry.flag,
          isNewUser: true,
          returnScreen: route?.params?.returnScreen,
          returnParams: route?.params?.returnParams,
          action: route?.params?.action,
          registrationPayload: {
            fullName: fullName.trim(),
            mobileNumber: fullPhone,
          },
        });
      } catch (err: any) {
        setIsLoading(false);
        setErrors({
          global: err?.message || 'Failed to send verification code. Please check your phone number and try again.',
        });
      }
    } else {
      // On Native Mobile (Android/iOS): Send real SMS OTP in background invisibly (no reCAPTCHA modal)
      setIsLoading(true);
      setRecaptchaVisible(true);
    }
  };

  const handleRecaptchaSuccess = (verificationId: string) => {
    setIsLoading(false);
    setRecaptchaVisible(false);
    const cleanPhone = mobileNumber.replace(/[^0-9]/g, '');
    const fullPhone = `${selectedCountry.dial}${cleanPhone}`;
    authStore.saveRegisteredUserName(fullPhone, fullName.trim());
    authStore.saveRegisteredUserName(cleanPhone, fullName.trim());
    authStore.markPhoneRegistered(fullPhone);
    authStore.markPhoneRegistered(cleanPhone);

    navigation.navigate('OTP', {
      phone: cleanPhone,
      fullPhone,
      verificationId,
      countryDial: selectedCountry.dial,
      countryFlag: selectedCountry.flag,
      isNewUser: true,
      returnScreen: route?.params?.returnScreen,
      returnParams: route?.params?.returnParams,
      action: route?.params?.action,
      registrationPayload: {
        fullName: fullName.trim(),
        mobileNumber: fullPhone,
      },
    });
  };

  const handleRecaptchaError = (err: string) => {
    setIsLoading(false);
    setRecaptchaVisible(false);
    setErrors({
      global: err || 'Failed to send verification code. Please check your network and try again.',
    });
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
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
          {/* Header with Logo */}
          <View style={styles.headerSection}>
            <Image
              source={require('../../../../assets/logo.png')}
              style={styles.brandLogo}
              contentFit="contain"
            />
            <Text style={styles.createTitle}>Create Your Account</Text>
            <Text style={styles.createSubtitle}>
              Join HinchMart and get started with quick & easy access.
            </Text>
          </View>

          {/* Form Card with ONLY Full Name and Mobile Number */}
          <View style={styles.card}>
            {/* Field 1: Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Full Name <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  Boolean(errors.fullName) && styles.inputContainerError,
                ]}
              >
                <View style={styles.inputIconWrap}>
                  <Ionicons name="person-outline" size={17} color="#0038A8" />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your full name"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  multiline={false}
                  numberOfLines={1}
                />
              </View>
              {Boolean(errors.fullName) && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={13} color="#EF4444" />
                  <Text style={styles.errorText}>{errors.fullName}</Text>
                </View>
              )}
            </View>

            {/* Field 2: Mobile Number with Left Country Code (+91 ▾) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Mobile Number <Text style={styles.requiredAsterisk}>*</Text>
              </Text>

              <View
                style={[
                  styles.inputContainer,
                  Boolean(errors.mobileNumber) && styles.inputContainerError,
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
                  <Ionicons name="chevron-down" size={13} color="#0038A8" style={{ marginLeft: 2 }} />
                </TouchableOpacity>

                <View style={styles.inputDivider} />

                <TextInput
                  style={styles.textInput}
                  placeholder={`Enter ${selectedCountry.digits || 10}-digit mobile number`}
                  placeholderTextColor="#94A3B8"
                  value={mobileNumber}
                  onChangeText={(text) => {
                    const digits = text.replace(/[^0-9]/g, '').slice(0, selectedCountry.digits || 10);
                    setMobileNumber(digits);
                    if (errors.mobileNumber) setErrors((prev) => ({ ...prev, mobileNumber: '' }));
                  }}
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  maxLength={selectedCountry.digits || 10}
                  multiline={false}
                  numberOfLines={1}
                />

                {/* Right Side Green Tick — shown once full valid mobile number is entered */}
                {mobileNumber.length === (selectedCountry.digits || 10) && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#16A34A"
                    style={styles.validTickIcon}
                  />
                )}
              </View>
              {Boolean(errors.mobileNumber) && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={13} color="#EF4444" />
                  <Text style={styles.errorText}>{errors.mobileNumber}</Text>
                </View>
              )}
            </View>

            {Boolean(errors.global) && (
              <View style={styles.globalErrorBanner}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.globalErrorText}>{errors.global}</Text>
              </View>
            )}

            {/* Terms & Privacy Note */}
            <Text style={styles.termsNoticeText}>
              By registering, you agree to our{' '}
              <Text style={styles.termsLink}>Terms & Conditions</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>

            {/* REGISTER Button */}
            <TouchableOpacity
              onPress={handleRegister}
              style={styles.registerBtn}
              activeOpacity={0.85}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.btnInnerRow}>
                  <Text style={styles.registerBtnText}>REGISTER</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            {/* Already have an account? Login */}
            <View style={styles.footerLinkRow}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}
              >
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </View>
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

      {/* Native Mobile Firebase Phone Auth Recaptcha Modal */}
      {recaptchaVisible && (
        <FirebaseRecaptchaModal
          visible={recaptchaVisible}
          phoneNumber={`${selectedCountry.dial}${mobileNumber.replace(/[^0-9]/g, '')}`}
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
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
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
  createTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    color: '#0F172A',
    textAlign: 'center',
  },
  createSubtitle: {
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
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#1E293B',
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: '#EF4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    height: 48,
    overflow: 'hidden',
  },
  inputContainerError: {
    borderColor: '#EF4444',
  },
  countryPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 10,
    backgroundColor: '#EEF4FF',
  },
  countryFlagText: {
    fontSize: 16,
    marginRight: 4,
  },
  countryDialText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#0038A8',
  },
  inputDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#CBD5E1',
  },
  inputIconWrap: {
    width: 44,
    height: '100%',
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  textInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: '#0F172A',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: '#EF4444',
  },
  validTickIcon: {
    marginRight: 12,
  },
  termsNoticeText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    marginTop: 4,
  },
  termsLink: {
    color: '#B45309',
    fontWeight: '600',
  },
  globalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  globalErrorText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12,
    color: '#EF4444',
    flex: 1,
  },
  registerBtn: {
    backgroundColor: '#E31E24',
    borderRadius: 8,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  registerBtnText: {
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
    marginTop: 18,
    gap: 5,
  },
  footerText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12.5,
    color: '#64748B',
  },
  loginLink: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 12.5,
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
