/**
 * HINCH MART — Navigation Param Types
 */

export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: { returnScreen?: string; returnParams?: any; action?: string } | undefined;
  OTP: {
    phone: string;
    fullPhone?: string;
    verificationId?: string;
    countryDial?: string;
    countryFlag?: string;
    isNewUser?: boolean;
    purpose?: string;
    returnScreen?: string;
    returnParams?: any;
    action?: string;
    registrationPayload?: any;
    email?: string;
    isExistingUser?: boolean;
    otp?: string;
  };
  RegistrationDetails: {
    phone: string;
    fullPhone?: string;
    countryDial?: string;
    countryFlag?: string;
    isNewUser?: boolean;
    returnScreen?: string;
    returnParams?: any;
    action?: string;
  };
  CompleteProfile: {
    phone?: string;
    name?: string;
    email?: string;
    returnScreen?: string;
    returnParams?: any;
    action?: string;
  } | undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  BiometricSetup: undefined;
};

export type BottomTabParamList = {
  HomeTab: undefined;
  CategoriesTab: undefined;
  OrdersTab: undefined;
  RFQTab: undefined;
  CartTab: undefined;
  ProfileTab: undefined;
};

export type MainStackParamList = {
  MainTabs: { screen?: string; params?: any } | undefined;

  // Auth Screens in Main Stack for seamless replacement
  Splash: undefined;
  Onboarding: undefined;
  Login: { returnScreen?: string; returnParams?: any; action?: string } | undefined;
  OTP: {
    phone: string;
    fullPhone?: string;
    verificationId?: string;
    countryDial?: string;
    countryFlag?: string;
    isNewUser?: boolean;
    purpose?: string;
    returnScreen?: string;
    returnParams?: any;
    action?: string;
    registrationPayload?: any;
    email?: string;
    isExistingUser?: boolean;
    otp?: string;
  };
  RegistrationDetails: {
    phone: string;
    fullPhone?: string;
    countryDial?: string;
    countryFlag?: string;
    isNewUser?: boolean;
    returnScreen?: string;
    returnParams?: any;
    action?: string;
  };
  CompleteProfile: {
    phone?: string;
    name?: string;
    email?: string;
    returnScreen?: string;
    returnParams?: any;
    action?: string;
  } | undefined;

  // Products & Catalog (4-Tier Hierarchy: Category -> Subcategory -> Brand -> Product)
  SubCategories: { categoryId: string | number; categoryName: string; categorySlug?: string; categoryImage?: string };
  Subcategories: { categoryId: string | number; categoryName: string; categorySlug?: string; categoryImage?: string };
  Brands: { subcategoryId?: string | number; subcategoryName?: string; categoryId?: string | number; categoryName?: string };
  BrandList: { subcategoryId?: string | number; subcategoryName?: string; categoryId?: string | number; categoryName?: string };
  ProductList: {
    categoryId?: string | number;
    categoryName?: string;
    subcategoryId?: string | number;
    subCategoryId?: string | number;
    subcategoryName?: string;
    brandId?: string | number;
    brandName?: string;
    brand?: string;
    search?: string;
    isBestSeller?: boolean;
    title?: string;
  };
  TwentyFourHourDelivery: undefined;
  ProductDetail: { productId: string; product?: any };
  ProductGallery: { images: string[]; initialIndex?: number };
  Reviews: { productId: string };
  WriteReview: { productId: string };

  // Search & Filter
  Search: undefined;
  SearchResults: { query: string };
  Filters: { currentFilters?: any };

  // Cart
  Cart: undefined;

  // Checkout
  CheckoutAddress: undefined;
  CheckoutShipping: undefined;
  CheckoutPayment: {
    addressId?: number;
    addressTitle?: string;
    addressDetails?: string;
    selectedMethod?: string;
    autoResumeOrder?: boolean;
  } | undefined;
  CheckoutReview: undefined;
  OrderSuccess: { orderNumber: string; orderId: string; paymentMethod?: 'card' | 'bank' | 'cod' };

  // Orders
  OrderHistory: undefined;
  OrderDetail: { orderId: string };
  OrderTracking: { orderId: string };
  OrderReturn: { orderId: string };

  // Wallet
  Wallet: undefined;

  // RFQ
  RFQList: undefined;
  RFQCreate: undefined;
  RFQDetail: { rfqId: string };
  RFQCompare: { rfqId: string };
  RFQApprove: { rfqId: string; quotationId: string };

  // Purchase Orders
  POList: undefined;
  PODetail: { poId: string };

  // Profile & Settings
  BusinessProfile: undefined;
  EditProfile: undefined;
  Addresses: undefined;
  AddAddress: { addressId?: string };
  Language: undefined;
  Currency: undefined;
  Settings: undefined;

  // Companies & Vendors
  CompanyProfile: undefined;
  Employees: undefined;
  Projects: undefined;
  VendorDashboard: undefined;
  VendorProducts: undefined;
  VendorOrders: undefined;
  VendorPayments: undefined;
  VendorDetail: { vendorId: string; store?: any };

  // Rentals
  RentalList: undefined;
  RentalDetail: { rentalId: string };
  RentalBooking: { rentalId: string };
  RentalHistory: undefined;

  // Content & Support
  Articles: undefined;
  ArticleDetail: { slug: string };
  Videos: undefined;
  News: undefined;
  NewsDetail: { newsId: string };
  Notifications: undefined;
  NotificationList: undefined;
  ChatList: undefined;
  Chat: { conversationId: string; title: string };
  FAQ: undefined;
  SupportTickets: undefined;
  CreateTicket: undefined;
  TicketDetail: { ticketId: string };
  ContactUs: undefined;
  Terms: undefined;
  Privacy: undefined;
  Policies: undefined;
  About: undefined;
  Wishlist: undefined;
  BannerManagement: undefined;
  ProductManagement: undefined;
};
