/**
 * HINCH MART — Authentication Configuration & Development Mode Constants
 */

export const authConfig = {
  developmentMode: false,
  existingTestPhone: '9876543210',
  resendCooldown: 45,

  // Validation Patterns
  phoneRegex: /^[6-9]\d{9}$/,
  emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  gstinRegex: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  panRegex: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,

  // Test Profile for 9876543210
  existingUser: {
    id: 'dev-rajesh-001',
    firstName: 'Rajesh',
    lastName: 'Sharma',
    fullName: 'Rajesh Sharma',
    phone: '9876543210',
    email: 'rajesh@example.com',
    accountType: 'business' as const,
    companyName: 'Apex Construction Ltd',
    gstVerified: true,
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
    isVerified: true,
    isPhoneVerified: true,
    isEmailVerified: true,
    businessProfile: {
      id: 'bp-001',
      companyName: 'Apex Construction Ltd',
      companyLogo: null,
      registrationNumber: '27AAACA12341Z5',
      taxId: '27AAACA12341Z5',
      industry: 'Commercial Construction & Infrastructure',
      website: 'https://apexconstruction.com',
      description: 'Tier-1 EPC Contractor specializing in high-rise and highway infrastructure.',
      employeeCount: '250-500',
      annualRevenue: '$10M+',
      foundedYear: 2010,
      certifications: ['ISO 9001', 'LEED Gold', 'OHSAS 18001'],
      isVerified: true,
    },
    language: 'en',
    currency: 'USD',
    timezone: 'Asia/Kolkata',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};
