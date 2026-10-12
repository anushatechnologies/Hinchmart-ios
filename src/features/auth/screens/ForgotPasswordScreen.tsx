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
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../components/layout/Screen';
import { authConfig } from '../../../config/authConfig';
import { authApi } from '../../../services/api/auth.api';

export function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async () => {
    const clean = email.trim();
    if (!clean || !authConfig.emailRegex.test(clean)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      await authApi.forgotPassword({ email: clean });
      setIsLoading(false);
      setIsSent(true);
    } catch (err: any) {
      setIsLoading(false);
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to send reset instructions. Please check your email and try again.';
      setError(errorMsg);
    }
  };

  return (
    <Screen scrollable={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="always"
        >
        {/* Top Navbar */}
        <View style={styles.topNavbar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* Top Branding Header */}
        <View style={styles.topBrandingContainer}>
          <Image
            source={require('../../../../assets/logo.png')}
            style={styles.brandLogo}
            contentFit="contain"
          />
          <Text style={styles.headerTitle}>Forgot Password</Text>
          <Text style={styles.headerSubtitle}>
            Enter your registered email address and we'll send you instructions to reset your password.
          </Text>
        </View>

        {/* White Card */}
        <View style={styles.cardContainer}>
          {isSent ? (
            <View style={styles.successWrapper}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-circle" size={40} color="#10B981" />
              </View>
              <Text style={styles.successTitle}>Reset Email Sent!</Text>
              <Text style={styles.successDesc}>
                We've sent password reset instructions to <Text style={{ fontWeight: '700' }}>{email}</Text>. Please check your inbox.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.88}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>
                  Email Address <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    Boolean(error) && styles.inputErrorBorder,
                  ]}
                >
                  <Ionicons name="mail-outline" size={18} color="#64748B" style={styles.leftIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your email address"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      if (error) setError('');
                    }}
                  />
                </View>
                {Boolean(error) && <Text style={styles.errorText}>{error}</Text>}
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isLoading}
                activeOpacity={0.88}
                style={styles.primaryBtn}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send Reset Instructions</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}
                style={styles.backToLoginLink}
              >
                <Text style={styles.backToLoginText}>
                  Remember your password? <Text style={styles.backToLoginHighlight}>Login</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </Screen>
);
}

export function ResetPasswordScreen({ navigation }: any) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsLoading(false);
    navigation.replace('Login');
  };

  return (
    <Screen scrollable>
      <View style={styles.scrollContent}>
        <View style={styles.topBrandingContainer}>
          <Text style={styles.headerTitle}>Create New Password</Text>
          <Text style={styles.headerSubtitle}>
            Your new password must be different from previously used passwords.
          </Text>
        </View>
        <View style={styles.cardContainer}>
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>New Password</Text>
            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={styles.leftIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Confirm Password</Text>
            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={styles.leftIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleReset}
            disabled={isLoading}
            activeOpacity={0.88}
            style={styles.primaryBtn}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Reset Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    backgroundColor: '#F8FAFC',
    flexGrow: 1,
    justifyContent: 'center',
  },
  topNavbar: {
    marginBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topBrandingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  brandLogo: {
    width: 160,
    height: 68,
    marginBottom: 10,
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    color: '#0B1B3D',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: '#5A6A85',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  fieldWrapper: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#1E293B',
    marginBottom: 6,
  },
  inputBox: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  inputErrorBorder: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  leftIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#0F172A',
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: '#DC2626',
    marginTop: 4,
    marginLeft: 2,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#0038B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#0038B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15.5,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  backToLoginLink: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 4,
  },
  backToLoginText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: '#334155',
  },
  backToLoginHighlight: {
    fontFamily: 'Poppins_700Bold',
    color: '#0038B8',
  },
  successWrapper: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#065F46',
    marginBottom: 6,
  },
  successDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#047857',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
});
