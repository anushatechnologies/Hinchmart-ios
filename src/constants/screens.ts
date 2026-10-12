/**
 * HINCH MART — Screen Name Constants
 */

export const SCREEN_NAMES = {
  // Auth
  SPLASH: 'Splash',
  ONBOARDING: 'Onboarding',
  LOGIN: 'Login',
  SIGNUP: 'Signup',
  OTP: 'OTP',
  FORGOT_PASSWORD: 'ForgotPassword',
  RESET_PASSWORD: 'ResetPassword',
  BIOMETRIC_SETUP: 'BiometricSetup',

  // Main
  MAIN: 'Main',
  DRAWER: 'Drawer',

  // Bottom Tabs
  HOME_TAB: 'HomeTab',
  CATEGORIES_TAB: 'CategoriesTab',
  RFQ_TAB: 'RFQTab',
  CART_TAB: 'CartTab',
  PROFILE_TAB: 'ProfileTab',

  // Home
  HOME: 'Home',

  // Products
  CATEGORIES: 'Categories',
  SUB_CATEGORIES: 'SubCategories',
  PRODUCT_LIST: 'ProductList',
  PRODUCT_DETAIL: 'ProductDetail',
  PRODUCT_GALLERY: 'ProductGallery',
  REVIEWS: 'Reviews',
  WRITE_REVIEW: 'WriteReview',

  // Search
  SEARCH: 'Search',
  SEARCH_RESULTS: 'SearchResults',
  FILTERS: 'Filters',

  // Cart & Checkout
  CART: 'Cart',
  CHECKOUT_ADDRESS: 'CheckoutAddress',
  CHECKOUT_SHIPPING: 'CheckoutShipping',
  CHECKOUT_PAYMENT: 'CheckoutPayment',
  CHECKOUT_REVIEW: 'CheckoutReview',
  ORDER_SUCCESS: 'OrderSuccess',

  // Orders
  ORDER_HISTORY: 'OrderHistory',
  ORDER_DETAIL: 'OrderDetail',
  ORDER_TRACKING: 'OrderTracking',
  ORDER_RETURN: 'OrderReturn',

  // Wallet
  WALLET: 'Wallet',

  // RFQ
  RFQ_LIST: 'RFQList',
  RFQ_CREATE: 'RFQCreate',
  RFQ_DETAIL: 'RFQDetail',
  RFQ_COMPARE: 'RFQCompare',
  RFQ_APPROVE: 'RFQApprove',

  // Purchase Orders
  PO_LIST: 'POList',
  PO_DETAIL: 'PODetail',

  // Profile
  PROFILE: 'Profile',
  BUSINESS_PROFILE: 'BusinessProfile',
  EDIT_PROFILE: 'EditProfile',
  ADDRESSES: 'Addresses',
  ADD_ADDRESS: 'AddAddress',
  EDIT_ADDRESS: 'EditAddress',
  LANGUAGE: 'Language',
  CURRENCY: 'Currency',
  SETTINGS: 'Settings',

  // Companies
  COMPANY_PROFILE: 'CompanyProfile',
  EMPLOYEES: 'Employees',
  PROJECTS: 'Projects',

  // Vendors
  VENDOR_DASHBOARD: 'VendorDashboard',
  VENDOR_PRODUCTS: 'VendorProducts',
  VENDOR_ORDERS: 'VendorOrders',
  VENDOR_PAYMENTS: 'VendorPayments',
  VENDOR_DETAIL: 'VendorDetail',

  // Rentals
  RENTAL_LIST: 'RentalList',
  RENTAL_DETAIL: 'RentalDetail',
  RENTAL_BOOKING: 'RentalBooking',
  RENTAL_HISTORY: 'RentalHistory',

  // Blog & News
  ARTICLES: 'Articles',
  ARTICLE_DETAIL: 'ArticleDetail',
  VIDEOS: 'Videos',
  NEWS: 'News',
  NEWS_DETAIL: 'NewsDetail',

  // Notifications
  NOTIFICATIONS: 'Notifications',

  // Chat
  CHAT_LIST: 'ChatList',
  CHAT: 'Chat',

  // Help Center
  FAQ: 'FAQ',
  SUPPORT_TICKETS: 'SupportTickets',
  CREATE_TICKET: 'CreateTicket',
  TICKET_DETAIL: 'TicketDetail',
  CONTACT_US: 'ContactUs',

  // About
  TERMS: 'Terms',
  PRIVACY: 'Privacy',
  POLICIES: 'Policies',
  ABOUT: 'About',

  // Wishlist
  WISHLIST: 'Wishlist',
} as const;

export type ScreenName = typeof SCREEN_NAMES[keyof typeof SCREEN_NAMES];
