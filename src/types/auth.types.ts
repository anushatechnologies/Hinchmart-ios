/**
 * HINCH MART — Auth Types
 */

export type AccountType = 'individual' | 'business' | 'vendor' | 'contractor';

export interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar: string | null;
  accountType: AccountType;
  role?: 'BUYER' | 'VENDOR' | 'ADMIN' | string;
  companyName?: string;
  gstIN?: string;
  pan?: string;
  gstVerified?: boolean;
  isVerified: boolean;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  businessProfile?: BusinessProfile | null;
  language: string;
  currency: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessProfile {
  id: string;
  companyName: string;
  companyLogo: string | null;
  registrationNumber: string;
  taxId: string;
  industry: string;
  website: string;
  description: string;
  employeeCount: string;
  annualRevenue: string;
  foundedYear: number;
  certifications: string[];
  isVerified: boolean;
}

export interface LoginRequest {
  phone: string;
  otp?: string;
}

export interface SignupRequest {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  accountType: AccountType;
  companyName?: string;
  gstIN?: string;
  pan?: string;
}

export interface SendOtpRequest {
  identifier: string; // Email address or 10-digit Phone
  purpose?: 'LOGIN' | 'REGISTRATION';
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  data: string; // e.g. "OTP: 839201"
}

export interface VerifyOtpRequest {
  identifier: string; // Email address or 10-digit Phone
  otpCode: string; // 6-digit OTP code
  purpose?: 'LOGIN' | 'REGISTRATION';
}

export interface VerifyOtpUser {
  id: number | string;
  fullName: string;
  email: string;
  phone: string;
  role: 'BUYER' | 'VENDOR' | 'ADMIN';
  companyName?: string;
}

export interface VerifyOtpData {
  accessToken: string;
  refreshToken: string;
  tokenType: string; // "Bearer"
  user: VerifyOtpUser;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  data: VerifyOtpData;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  biometricEnabled?: boolean;
  hasCompletedOnboarding?: boolean;
}

export interface SyncUserRequest {
  firebaseIdToken?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'BUYER' | string;
}

export interface UpdateAuthProfileRequest {
  name: string;
  email: string;
  phone?: string;
}

export interface CustomerDetails {
  customerId: number;
  firebaseUid: string;
  name: string;
  email: string | null;
  phone: string;
  role: string;
}

export interface AuthSyncUser {
  accessToken?: string;
  tokenType?: string;
  expiresIn?: number;
  userId: number;
  firebaseUid: string;
  email: string | null;
  name: string | null;
  phone: string;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'BUYER' | string;
  sellerId?: number | null;
  profileComplete?: boolean;
  isProfileComplete?: boolean;
  active?: boolean;
  customer?: CustomerDetails;
  claims?: Record<string, any>;
}

export interface CheckPhoneData {
  exists: boolean;
  phone: string;
  name?: string;
  role?: string;
}

export interface CheckPhoneResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: CheckPhoneData;
  timestamp?: string;
}

export interface AuthMeResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: AuthSyncUser;
  timestamp?: string;
}

export interface ClaimAdminData {
  userId: number;
  role: string;
  email: string;
  isProfileComplete?: boolean;
}

export interface ClaimAdminResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ClaimAdminData;
  timestamp?: string;
}
