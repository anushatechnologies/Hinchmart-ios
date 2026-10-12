/**
 * HINCH MART — Root Stack Navigator
 * Unified navigation structure for all screens and tabs + Global Overlays
 */
import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BottomTabNavigator } from './BottomTabNavigator';
import { CartToastPopup } from '../components/ui/CartToastPopup';
import { WishlistToastPopup } from '../components/ui/WishlistToastPopup';
import { AddToCartAuthModal } from '../components/ui/AddToCartAuthModal';
import { UpdateModal } from '../components/update/UpdateModal';
import { useAppUpdate } from '../hooks/useAppUpdate';

import { SplashScreen } from '../features/auth/screens/SplashScreen';
import { OnboardingScreen } from '../features/auth/screens/OnboardingScreen';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { SignupScreen } from '../features/auth/screens/SignupScreen';
import { OTPScreen } from '../features/auth/screens/OTPScreen';
import { RegistrationDetailsScreen } from '../features/auth/screens/RegistrationDetailsScreen';
import { CompleteProfileScreen } from '../features/auth/screens/CompleteProfileScreen';
import { ForgotPasswordScreen } from '../features/auth/screens/ForgotPasswordScreen';

import { ProductListScreen } from '../features/products/screens/ProductListScreen';
import { ProductDetailScreen } from '../features/products/screens/ProductDetailScreen';
import { TwentyFourHourDeliveryScreen } from '../features/products/screens/TwentyFourHourDeliveryScreen';
import { OffersDiscountsScreen } from '../features/products/screens/OffersDiscountsScreen';
import { CartScreen } from '../features/cart/screens/CartScreen';
import { SearchScreen } from '../features/search/screens/SearchScreen';
import { CheckoutAddressScreen, CheckoutPaymentScreen, OrderSuccessScreen, PaymentStatusScreen } from '../features/checkout/screens/CheckoutAddressScreen';
import { OrderHistoryScreen } from '../features/orders/screens/OrderHistoryScreen';
import { OrderDetailScreen } from '../features/orders/screens/OrderDetailScreen';
import { OrderTrackingScreen, ShipmentDetailsScreen } from '../features/orders/screens/OrderTrackingScreen';
import { WalletScreen } from '../features/profile/screens/WalletScreen';
import { RFQListScreen, RFQDetailScreen, RFQCreateScreen } from '../features/rfq/screens/RFQListScreen';
import { SettingsScreen, AppearanceScreen } from '../features/profile/screens/ProfileScreen';
import { BusinessProfileScreen } from '../features/profile/screens/BusinessProfileScreen';
import { AddressesScreen } from '../features/profile/screens/AddressesScreen';
import { LanguageCurrencyScreen } from '../features/profile/screens/LanguageCurrencyScreen';
import { VendorDashboardScreen, VendorDetailScreen, RentalListScreen } from '../features/vendors/screens/VendorDashboardScreen';
import { NotificationsScreen, ChatListScreen, FAQScreen, NewsScreen } from '../features/notifications/screens/NotificationsScreen';
import { PrivacyPolicyScreen, HelpSupportScreen, AboutScreen, TermsScreen } from '../features/profile/screens/LegalScreens';
import { MyReviewsScreen } from '../features/profile/screens/MyReviewsScreen';
import { GSTInvoiceScreen } from '../features/profile/screens/GSTInvoiceScreen';
import { TaxInvoicesScreen } from '../features/profile/screens/TaxInvoicesScreen';
import { SupportTicketsScreen } from '../features/profile/screens/SupportTicketsScreen';
import { WishlistScreen } from '../features/products/screens/WishlistScreen';
import { BrandsScreen } from '../features/products/screens/BrandsScreen';
import { SubcategoriesScreen } from '../features/products/screens/SubcategoriesScreen';
import { BannerManagementScreen } from '../features/admin/screens/BannerManagementScreen';
import { ProductManagementScreen } from '../features/admin/screens/ProductManagementScreen';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const {
    updateResult,
    isModalVisible,
    isUpdating,
    handleUpdateNow,
    handleLater,
  } = useAppUpdate();

  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 220,
        }}
        initialRouteName="Splash"
      >
        {/* Splash & Auth Flow */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="OTP" component={OTPScreen} />
        <Stack.Screen name="OTPVerification" component={OTPScreen} />
        <Stack.Screen name="RegistrationDetails" component={RegistrationDetailsScreen} />
        <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ForgotPasswordScreen} />

        {/* Main App & Bottom Tabs */}
        <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen
          name="TwentyFourHourDelivery"
          component={TwentyFourHourDeliveryScreen}
          options={{
            animation: 'fade_from_bottom',
          }}
        />
        <Stack.Screen name="ProductList" component={ProductListScreen} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="Discounts" component={OffersDiscountsScreen} />
        <Stack.Screen name="Offers" component={OffersDiscountsScreen} />
        <Stack.Screen name="TopOffers" component={OffersDiscountsScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="CheckoutAddress" component={CheckoutAddressScreen} />
        <Stack.Screen name="CheckoutPayment" component={CheckoutPaymentScreen} />
        <Stack.Screen name="PaymentStatus" component={PaymentStatusScreen} />
        <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
        <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
        <Stack.Screen name="MyOrders" component={OrderHistoryScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
        <Stack.Screen name="TrackOrder" component={OrderTrackingScreen} />
        <Stack.Screen name="ShipmentDetails" component={ShipmentDetailsScreen} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="RFQList" component={RFQListScreen} />
        <Stack.Screen name="RFQDetail" component={RFQDetailScreen} />
        <Stack.Screen name="RFQCreate" component={RFQCreateScreen} />
        <Stack.Screen name="MyReviews" component={MyReviewsScreen} />
        <Stack.Screen name="Reviews" component={MyReviewsScreen} />
        <Stack.Screen name="Wishlist" component={WishlistScreen} />
        <Stack.Screen name="Subcategories" component={SubcategoriesScreen} />
        <Stack.Screen name="SubCategories" component={SubcategoriesScreen} />
        <Stack.Screen name="CategoryListing" component={SubcategoriesScreen} />
        <Stack.Screen name="Brands" component={BrandsScreen} />
        <Stack.Screen name="BrandList" component={BrandsScreen} />
        <Stack.Screen name="VendorDetail" component={VendorDetailScreen} />
        <Stack.Screen name="Appearance" component={AppearanceScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="BusinessProfile" component={BusinessProfileScreen} />
        <Stack.Screen name="GSTInvoice" component={GSTInvoiceScreen} />
        <Stack.Screen name="TaxInvoices" component={TaxInvoicesScreen} />
        <Stack.Screen name="Invoices" component={TaxInvoicesScreen} />
        <Stack.Screen name="Addresses" component={AddressesScreen} />
        <Stack.Screen name="Language" component={LanguageCurrencyScreen} />
        <Stack.Screen name="VendorDashboard" component={VendorDashboardScreen} />
        <Stack.Screen name="RentalList" component={RentalListScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="NotificationList" component={NotificationsScreen} />
        <Stack.Screen name="ChatList" component={ChatListScreen} />
        <Stack.Screen name="FAQ" component={FAQScreen} />
        <Stack.Screen name="News" component={NewsScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
        <Stack.Screen name="SupportTickets" component={SupportTicketsScreen} />
        <Stack.Screen name="Tickets" component={SupportTicketsScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
        <Stack.Screen name="Terms" component={TermsScreen} />
        <Stack.Screen name="BannerManagement" component={BannerManagementScreen} />
        <Stack.Screen name="ProductManagement" component={ProductManagementScreen} />
      </Stack.Navigator>
      <CartToastPopup />
      <WishlistToastPopup />
      <AddToCartAuthModal />

      {/* Global In-App Update Modal */}
      {updateResult && (
        <UpdateModal
          visible={isModalVisible}
          updateResult={updateResult}
          isUpdating={isUpdating}
          onUpdateNow={handleUpdateNow}
          onLater={handleLater}
        />
      )}
    </View>
  );
}
