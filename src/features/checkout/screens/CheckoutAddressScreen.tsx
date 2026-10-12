/**
 * HINCH MART — Premium Checkout & Payment Suite
 * - Interactive Delivery Site Selection (CheckoutAddressScreen)
 * - Dynamic Interactive Payment Suite (CheckoutPaymentScreen):
 *    • UPI (GPay, PhonePe, Paytm, BHIM, Custom VPA ID verification)
 *    • Interactive Corporate Credit / Debit Card with live card preview & brand detection
 *    • Net Banking with instant popular bank selector (HDFC, SBI, ICICI, Axis, Kotak, BoB)
 *    • Virtual Escrow Wire Transfer / RTGS / NEFT (Direct Manufacturer Escrow)
 *    • HinchMart B2B 30-Day Credit Line (₹5,00,000 Limit • 0% Interest)
 *    • Cash / Credit on Site Delivery (COD)
 *    • Sticky Bottom Order Summary with Expandable Itemized Price Breakdown
 *    • Clean Multi-Stage "Pay Securely" Loading Modal
 * - Digital Receipt Payment Success Screen (OrderSuccessScreen & PaymentStatusScreen)
 * - Full Dark Mode & Light Mode Dynamic Theme Support
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
  TextInput,
  Modal,
  Dimensions,
  Clipboard,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useTheme } from '../../../theme';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import {
  clearCart,
  selectCartItems,
  selectCartSubtotal,
  setServerCart,
} from '../../../redux/slices/cartSlice';
import { formatPrice } from '../../../utils';
import { ordersApi } from '../../../services/api/orders.api';
import { cartApi } from '../../../services/api/cart.api';
import { addressesApi } from '../../../services/api/addresses.api';
import { customersApi } from '../../../services/api/customers.api';
import { paymentsApi } from '../../../services/api/payments.api';
import { userApi, SavedAddress } from '../../../services/api/user.api';
import { walletApi } from '../../../services/api/wallet.api';
import { locationApi } from '../../../services/api/location.api';
import { isHyderabadServiceable } from '../../../services/delivery/serviceability.service';
import { authStore } from '../../../store/authStore';
import { shippingApi } from '../../../services/api/shipping.api';
import {
  requireAuthenticationBeforeOrder,
  saveCheckoutDraft,
  getCheckoutDraft,
  clearCheckoutDraft,
} from '../../../services/checkout/checkoutAuthGuard';
import {
  LocationPickerModal,
  DeliverySite,
  customerAddressToDeliverySite,
} from '../../../components/ui/LocationPickerModal';
import { CustomerAddress, AddressType } from '../../../types/location.types';
import {
  RazorpayCheckoutModal,
  RazorpayOrderData,
  RazorpaySuccessResult,
} from '../../../components/ui/RazorpayCheckoutModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── DELIVERY ADDRESS SCREEN ──────────────────────────────────────────────────
export function CheckoutAddressScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const cartItems = useAppSelector(selectCartItems);
  const [selectedAddr, setSelectedAddr] = useState<string | null>(null);
  const [liveAddresses, setLiveAddresses] = useState<any[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);

  // Map & Add Address Modal state
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newHouseFlatNo, setNewHouseFlatNo] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newLandmark, setNewLandmark] = useState('');
  const [newCity, setNewCity] = useState('Hyderabad');
  const [newState, setNewState] = useState('Telangana');
  const [newPincode, setNewPincode] = useState('500081');
  const [newAddressType, setNewAddressType] = useState<AddressType>('WORK');
  const [newHasHeavyVehicle, setNewHasHeavyVehicle] = useState(true);

  // GPS / "Use Current Location" states
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(false);
  const [isFetchingGPS, setIsFetchingGPS] = useState(false);
  const [newLatitude, setNewLatitude] = useState<number | undefined>(undefined);
  const [newLongitude, setNewLongitude] = useState<number | undefined>(undefined);

  // Swiggy / Zomato "Ordering for someone else?" Flow
  const [isOrderingForSomeoneElse, setIsOrderingForSomeoneElse] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newPhone, setNewPhone] = useState(() => authStore.getUser()?.phone || '');
  const [rawBackendAddresses, setRawBackendAddresses] = useState<CustomerAddress[]>([]);

  const loadLiveAddresses = useCallback(async () => {
    setIsLoadingAddresses(true);
    try {
      const list = await addressesApi.getAddresses();
      if (Array.isArray(list) && list.length > 0) {
        setRawBackendAddresses(list);
        const mapped = list.map((a: any, idx: number) => {
          const siteTitle = a.recipientName || a.siteName || `Delivery Address #${idx + 1}`;
          const addressParts = [
            a.houseFlatNo,
            a.addressLine1,
            a.addressLine2,
            a.areaLocality,
            a.landmark ? `Near ${a.landmark}` : null,
            a.city,
            a.state ? `${a.state} - ${a.pincode || a.postalCode || ''}` : (a.pincode || a.postalCode),
          ].filter(Boolean).join(', ');

          const rawId = a.addressId || a.id;
          const realId = String(rawId);
          return {
            id: realId,
            numericId: Number(rawId),
            title: siteTitle,
            address: addressParts || `${a.city || 'Hyderabad'}, ${a.state || 'Telangana'}`,
            contact: `${a.recipientName || a.fullName || 'Customer'}${a.phone || a.phoneNumber ? ` (${a.phone || a.phoneNumber})` : ''}`,
            type: a.addressType ? (a.addressType === 'WORK' ? 'Work' : a.addressType === 'HOME' ? 'Home' : 'Other') : 'Delivery',
            icon: a.addressType === 'HOME' ? ('home' as const) : a.addressType === 'WORK' ? ('business' as const) : ('location' as const),
            color: idx % 3 === 0 ? '#F59E0B' : idx % 3 === 1 ? '#3B82F6' : '#10B981',
            isDefault: !!a.isDefault,
          };
        });
        setLiveAddresses(mapped);
        setSelectedAddr((prev) => {
          if (prev && mapped.some((m) => m.id === prev)) return prev;
          const def = mapped.find((m) => m.isDefault);
          return def ? def.id : mapped[0].id;
        });
      } else {
        const fallbackList = await userApi.getAddresses();
        if (Array.isArray(fallbackList) && fallbackList.length > 0) {
          const mapped = fallbackList.map((a: SavedAddress, idx: number) => {
            const rawId = a.addressId || a.id;
            const realId = String(rawId);
            return {
              id: realId,
              numericId: Number(rawId),
              title: a.recipientName || a.siteName || `Delivery Address #${idx + 1}`,
              address: `${a.addressLine1}${a.addressLine2 ? ', ' + a.addressLine2 : ''}, ${a.city}, ${a.state} - ${a.pincode}`,
              contact: `${a.recipientName || 'Customer'}${a.phone ? ` (${a.phone})` : ''}`,
              type: (a as any).addressType ? ((a as any).addressType === 'WORK' ? 'Work' : (a as any).addressType === 'HOME' ? 'Home' : 'Other') : 'Delivery',
              icon: (a as any).addressType === 'HOME' ? ('home' as const) : ('location' as const),
              color: idx % 3 === 0 ? '#F59E0B' : idx % 3 === 1 ? '#3B82F6' : '#10B981',
              isDefault: false,
            };
          });
          setLiveAddresses(mapped);
          setSelectedAddr((prev) => {
            if (prev && mapped.some((m) => m.id === prev)) return prev;
            return mapped[0].id;
          });
        } else {
          // Check if guest user previously saved a local draft address
          const draft = getCheckoutDraft();
          if (draft?.guestAddress) {
            const g = draft.guestAddress;
            const guestId = draft.addressId || 999999;
            const guestObj = {
              id: String(guestId),
              numericId: Number(guestId),
              title: g.recipientName || g.siteName || 'Delivery Address',
              address: [
                g.street,
                g.area,
                g.city,
                `${g.state || 'Telangana'} - ${g.pincode}`,
              ].filter(Boolean).join(', '),
              contact: `${g.recipientName || 'Customer'}${g.phone ? ` (${g.phone})` : ''}`,
              type: 'Delivery',
              icon: 'location' as const,
              color: '#E31E24',
              isDefault: true,
            };
            setLiveAddresses([guestObj]);
            setSelectedAddr(String(guestId));
          } else {
            setLiveAddresses([]);
            setSelectedAddr(null);
          }
        }
      }
    } catch {
      const draft = getCheckoutDraft();
      if (draft?.guestAddress) {
        const g = draft.guestAddress;
        const guestId = draft.addressId || 999999;
        const guestObj = {
          id: String(guestId),
          numericId: Number(guestId),
          title: g.recipientName || g.siteName || 'Delivery Address',
          address: [
            g.street,
            g.area,
            g.city,
            `${g.state || 'Telangana'} - ${g.pincode}`,
          ].filter(Boolean).join(', '),
          contact: `${g.recipientName || 'Customer'}${g.phone ? ` (${g.phone})` : ''}`,
          type: 'Delivery',
          icon: 'location' as const,
          color: '#E31E24',
          isDefault: true,
        };
        setLiveAddresses([guestObj]);
        setSelectedAddr(String(guestId));
      } else {
        setLiveAddresses([]);
        setSelectedAddr(null);
      }
    } finally {
      setIsLoadingAddresses(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLiveAddresses();
    }, [loadLiveAddresses])
  );

  const selectedDeliverySite = useMemo<DeliverySite | undefined>(() => {
    if (!selectedAddr || rawBackendAddresses.length === 0) return undefined;
    const found = rawBackendAddresses.find(
      (a) => String(a.addressId || (a as any).id) === selectedAddr
    );
    if (found && found.latitude && found.longitude) {
      return customerAddressToDeliverySite(found);
    }
    return undefined;
  }, [selectedAddr, rawBackendAddresses]);

  const handleMapSelectSite = async (site: DeliverySite, savedAddress?: CustomerAddress | null) => {
    setIsMapModalVisible(false);
    await loadLiveAddresses();
    if (savedAddress?.addressId) {
      setSelectedAddr(String(savedAddress.addressId));
    } else if (site.id) {
      setSelectedAddr(String(site.id));
    }
  };

  const handleOpenAddModal = async () => {
    setIsUsingCurrentLocation(false);
    setIsFetchingGPS(false);
    setNewLatitude(undefined);
    setNewLongitude(undefined);
    setNewSiteName('');
    setNewHouseFlatNo('');
    setNewStreet('');
    setNewArea('');
    setNewLandmark('');
    setNewCity('Hyderabad');
    setNewState('Telangana');
    setNewPincode('');
    setNewAddressType('HOME');
    setNewHasHeavyVehicle(true);
    setIsOrderingForSomeoneElse(false);

    // Auto-fetch customer name & phone from auth store and user profile
    const u = authStore.getUser();
    let name = u?.fullName || (u as any)?.name || (u as any)?.customerName || '';
    let phone = u?.phone || (u as any)?.phoneNumber || '';

    if (!name || !phone) {
      try {
        const p = await userApi.getProfile();
        if (p) {
          name = name || p.fullName || (p as any)?.name || '';
          phone = phone || p.phone || '';
        }
      } catch {}
    }

    setNewRecipientName(name);
    setNewPhone(phone);
    setIsAddModalVisible(true);
  };

  const handleUseCurrentLocationToggle = async (value: boolean) => {
    setIsUsingCurrentLocation(value);
    if (!value) return;

    setIsFetchingGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please allow location access to auto-fill your delivery address using GPS.'
        );
        setIsUsingCurrentLocation(false);
        setIsFetchingGPS(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setNewLatitude(lat);
      setNewLongitude(lng);

      const geo = await locationApi.reverseGeocode(lat, lng);
      if (geo) {
        if (geo.addressLine1) setNewStreet(geo.addressLine1);
        if (geo.area) setNewArea(geo.area);
        if (geo.city) setNewCity(geo.city);
        if (geo.state) setNewState(geo.state);
        if (geo.pincode) setNewPincode(geo.pincode);
        if (geo.formattedAddress && !newStreet) {
          setNewStreet(geo.formattedAddress);
        }
      }
    } catch (err: any) {
      Alert.alert(
        'GPS Notice',
        'Could not fetch precise GPS coordinates. You can type your address or adjust location on the interactive map.'
      );
      setIsUsingCurrentLocation(false);
    } finally {
      setIsFetchingGPS(false);
    }
  };

  const handleSaveNewAddress = async () => {
    if (!newStreet.trim() || !newCity.trim() || !newPincode.trim()) {
      Alert.alert('Required Fields', 'Please fill in Full Street Address, City, and PIN code.');
      return;
    }

    if (!/^[1-9][0-9]{5}$/.test(newPincode.trim())) {
      Alert.alert('Invalid PIN Code', 'Please enter a valid 6-digit Indian PIN code (e.g. 500032).');
      return;
    }

    const u = authStore.getUser();
    let finalRecipient = newRecipientName.trim() || u?.fullName || (u as any)?.name || 'Customer';
    let finalPhone = newPhone.trim() || u?.phone || (u as any)?.phoneNumber || '';

    if (!finalRecipient || !finalPhone) {
      Alert.alert(
        'Customer Details Required',
        'Please enter your full name and contact phone number for delivery dispatch.'
      );
      return;
    }

    setIsSavingAddress(true);

    const guestSiteTitle = newHouseFlatNo.trim()
      ? `${newHouseFlatNo.trim()}, ${newStreet.trim()}`
      : newStreet.trim() || finalRecipient;
    const guestAddressParts = [
      newHouseFlatNo.trim(),
      newStreet.trim(),
      newArea.trim(),
      newLandmark.trim() ? `Near ${newLandmark.trim()}` : null,
      newCity.trim(),
      `${newState.trim()} - ${newPincode.trim()}`,
    ].filter(Boolean).join(', ');

    // If user is a guest (not yet logged in), save address locally to preserve checkout state
    if (!authStore.isAuthenticated()) {
      const guestId = Date.now();
      const guestObj = {
        id: String(guestId),
        numericId: guestId,
        title: guestSiteTitle,
        address: guestAddressParts,
        contact: `${finalRecipient} (${finalPhone})`,
        type: newAddressType === 'WORK' ? 'Work' : newAddressType === 'HOME' ? 'Home' : 'Delivery',
        icon: newAddressType === 'HOME' ? ('home' as const) : ('location' as const),
        color: '#E31E24',
        isDefault: true,
      };

      saveCheckoutDraft({
        guestAddress: {
          siteName: guestSiteTitle,
          recipientName: finalRecipient,
          phone: finalPhone,
          houseFlatNo: newHouseFlatNo.trim(),
          street: newStreet.trim(),
          area: newArea.trim(),
          city: newCity.trim(),
          state: newState.trim(),
          pincode: newPincode.trim(),
        },
        addressId: guestId,
        addressTitle: guestSiteTitle,
        addressDetails: guestAddressParts,
      });

      setLiveAddresses([guestObj]);
      setSelectedAddr(String(guestId));
      setIsAddModalVisible(false);
      setIsSavingAddress(false);
      return;
    }

    try {
      const created = await addressesApi.createAddress({
        siteName: guestSiteTitle,
        recipientName: finalRecipient,
        phone: finalPhone,
        houseFlatNo: newHouseFlatNo.trim(),
        addressLine1: newStreet.trim(),
        addressLine2: newArea.trim(),
        areaLocality: newArea.trim(),
        landmark: newLandmark.trim(),
        city: newCity.trim(),
        state: newState.trim(),
        pincode: newPincode.trim(),
        country: 'India',
        latitude: newLatitude,
        longitude: newLongitude,
        addressType: newAddressType,
        hasHeavyVehicleAccess: true,
        isDefault: liveAddresses.length === 0,
      });

      const rawId = (created as any)?.addressId || (created as any)?.id || (created as any)?.data?.addressId || (created as any)?.data?.id;
      const numId = Number(rawId);

      // Ensure customer details exist with recipient contact in backend database table `customers`
      if (finalPhone) {
        const recPhone = finalPhone.startsWith('+') ? finalPhone : `+91${finalPhone.replace(/[^0-9]/g, '')}`;
        customersApi
          .createCustomer({
            name: finalRecipient,
            phone: recPhone,
            email: u?.email || `${finalPhone.replace(/[^0-9]/g, '')}@customer.hinchmart.com`,
          })
          .catch(() => {});
      }

      await loadLiveAddresses();
      if (numId && !isNaN(numId)) {
        setSelectedAddr(String(numId));
      }
      setIsAddModalVisible(false);
    } catch (err: any) {
      Alert.alert(
        'Failed to Save Address',
        err?.response?.data?.message || err?.message || 'Unable to save address to backend. Please check details and try again.'
      );
    } finally {
      setIsSavingAddress(false);
    }
  };

  const has24HourItems = useMemo(() => {
    return cartItems.some(
      (item: any) =>
        item.is24HourDelivery === true ||
        item.deliveryType === '24_HOURS' ||
        item.product?.is24HourDelivery === true ||
        (item.product as any)?.deliveryType === '24_HOURS'
    );
  }, [cartItems]);

  const topSafePadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  ) + 8;

  const handleProceedToPayment = () => {
    if (!selectedAddr || liveAddresses.length === 0) {
      Alert.alert(
        'Delivery Site Required',
        'Please add a delivery address to proceed with your order.',
        [
          { text: 'Add Delivery Site', onPress: () => setIsAddModalVisible(true) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    const selectedObj = liveAddresses.find((a) => a.id === selectedAddr);
    const numericId = Number(selectedObj?.numericId || selectedObj?.id);

    if (isNaN(numericId) || numericId <= 0) {
      Alert.alert(
        'Invalid Address',
        'Please add a verified delivery address to proceed.',
        [{ text: 'Add Site', onPress: () => setIsAddModalVisible(true) }]
      );
      return;
    }

    const isServiceable = selectedObj ? isHyderabadServiceable(selectedObj.address) : false;

    if (has24HourItems && !isServiceable) {
      Alert.alert(
        '📍 24-Hr Delivery Restricted',
        `Your cart contains 24-Hour Express items that can only be delivered in Hyderabad.\n\n"${selectedObj?.title}" (${selectedObj?.address}) is outside the Hyderabad express zone. Please select a Hyderabad site.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Preserve selected delivery site across potential authentication
    saveCheckoutDraft({
      addressId: numericId,
      addressTitle: selectedObj?.title,
      addressDetails: selectedObj?.address,
    });

    navigation.navigate('CheckoutPayment', {
      addressId: numericId,
      addressTitle: selectedObj?.title,
      addressDetails: selectedObj?.address,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#E31E24" translucent />

      {/* Top Header - IBO Red Bar */}
      <View
        style={[
          styles.topHeader,
          {
            paddingTop: topSafePadding,
            backgroundColor: '#E31E24',
            borderBottomColor: '#C4181D',
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={23} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Select Delivery Site</Text>
        <TouchableOpacity
          onPress={() => setIsAddModalVisible(true)}
          activeOpacity={0.7}
          style={styles.addSiteHeaderBtn}
        >
          <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.paddingBox,
          { paddingBottom: Math.max(insets.bottom, 20) + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Indicator */}
        <View style={styles.stepIndicatorRow}>
          <View style={[styles.stepBadge, styles.stepBadgeActive]}>
            <Text style={styles.stepBadgeText}>1</Text>
          </View>
          <Text style={[styles.stepLabelActive, { color: theme.colors.textPrimary }]}>Delivery Site</Text>
          <View style={[styles.stepConnector, { backgroundColor: theme.colors.cardBorder }]} />
          <View style={[styles.stepBadge, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.cardBorder }]}>
            <Text style={[styles.stepBadgeText, { color: theme.colors.textTertiary }]}>2</Text>
          </View>
          <Text style={[styles.stepLabelInactive, { color: theme.colors.textTertiary }]}>Payment</Text>
        </View>

        {has24HourItems && (
          <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: 12, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)', flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="flash" size={18} color="#10B981" style={{ marginRight: 8 }} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: isDark ? '#A7F3D0' : '#065F46', flex: 1 }}>
              Your order contains 24-Hour Express items (Strictly Hyderabad delivery only).
            </Text>
          </View>
        )}

        <Text style={[styles.sectionSectionHeader, { color: theme.colors.textPrimary }]}>
          Saved Delivery Addresses
        </Text>

        {isLoadingAddresses ? (
          <View style={{ paddingVertical: 30, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#E31E24" />
            <Text style={{ marginTop: 8, color: theme.colors.textSecondary, fontSize: 13 }}>Loading delivery addresses...</Text>
          </View>
        ) : liveAddresses.length === 0 ? (
          <View style={{
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 14,
            padding: 24,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
            marginBottom: 16,
          }}>
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: isDark ? 'rgba(227, 30, 36, 0.15)' : '#FEE2E2',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}>
              <Ionicons name="location-outline" size={28} color="#E31E24" />
            </View>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: theme.colors.textPrimary, marginBottom: 6, textAlign: 'center' }}>
              No Delivery Addresses Added
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 19, marginBottom: 16 }}>
              Please add your delivery address to calculate live logistics and proceed to payment.
            </Text>
            <TouchableOpacity
              onPress={() => setIsMapModalVisible(true)}
              activeOpacity={0.85}
              style={{ width: '100%', marginBottom: 10 }}
            >
              <LinearGradient
                colors={['#E31E24', '#D32F2F']}
                style={{
                  height: 46,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name="map" size={18} color="#FFFFFF" />
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: '#FFFFFF' }}>Pin Delivery Address on Map</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenAddModal}
              activeOpacity={0.85}
              style={{
                width: '100%',
                height: 42,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.colors.cardBorder,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: theme.colors.surfaceVariant,
              }}
            >
              <Ionicons name="create-outline" size={18} color={theme.colors.textPrimary} />
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: theme.colors.textPrimary }}>Enter Address Manually</Text>
            </TouchableOpacity>

            {!authStore.isAuthenticated() && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Login', { returnScreen: 'CheckoutAddress' })}
                activeOpacity={0.8}
                style={{
                  marginTop: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.cardBorder,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  width: '100%',
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F9FAFB',
                }}
              >
                <Ionicons name="log-in-outline" size={17} color="#E31E24" />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#E31E24' }}>
                  Have an account? Sign in to use saved addresses
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          liveAddresses.map((addr) => {
            const isSelected = selectedAddr === addr.id;
            const isHyd = isHyderabadServiceable(addr.address);
            const isBlocked = has24HourItems && !isHyd;

            return (
              <View key={addr.id} style={{ marginBottom: 12 }}>
                <TouchableOpacity
                  onPress={() => setSelectedAddr(addr.id)}
                  activeOpacity={0.88}
                >
                  <Card
                    variant="outlined"
                    style={[
                      styles.addrCard,
                      {
                        backgroundColor: theme.colors.cardBackground,
                        borderColor: isSelected ? '#E31E24' : (isBlocked ? 'rgba(239, 68, 68, 0.3)' : theme.colors.cardBorder),
                        borderWidth: isSelected ? 1.8 : 1,
                        marginBottom: 0,
                      },
                    ]}
                  >
                    <View style={styles.rowBetween}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={[styles.addrIconBox, { backgroundColor: `${addr.color}18` }]}>
                          <Ionicons name={addr.icon} size={18} color={addr.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.addrName, { color: theme.colors.textPrimary }]}>{addr.title}</Text>
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
                            <View style={styles.addrTypeBadge}>
                              <Text style={styles.addrTypeBadgeText}>{addr.type}</Text>
                            </View>
                            {isHyd ? (
                              <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.18)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 9, color: '#10B981' }}>⚡ 24-HR SERVICEABLE</Text>
                              </View>
                            ) : (
                              <View style={{ backgroundColor: 'rgba(100, 116, 139, 0.18)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: isDark ? '#94A3B8' : '#64748B' }}>STANDARD (3-5 DAYS)</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={22} color="#E31E24" />
                      ) : (
                        <View style={[styles.radioOutline, { borderColor: theme.colors.cardBorder }]} />
                      )}
                    </View>
                    <Text style={[styles.addrSub, { color: theme.colors.textSecondary }]}>
                      {addr.address}
                    </Text>
                    <View style={[styles.addrPhoneRow, { backgroundColor: theme.colors.surfaceVariant }]}>
                      <Ionicons name="call-outline" size={13} color={theme.colors.textTertiary} />
                      <Text style={[styles.addrPhone, { color: theme.colors.textSecondary }]}>{addr.contact}</Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* Interactive Map Button */}
        <TouchableOpacity
          onPress={() => setIsMapModalVisible(true)}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 13,
            paddingHorizontal: 16,
            borderRadius: 12,
            backgroundColor: isDark ? 'rgba(227, 30, 36, 0.12)' : '#FEF2F2',
            borderWidth: 1.5,
            borderColor: '#E31E24',
            marginBottom: 10,
            gap: 8,
          }}
        >
          <Ionicons name="map" size={19} color="#E31E24" />
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: '#E31E24' }}>
            Pin Delivery Address on Map
          </Text>
        </TouchableOpacity>

        {/* Add New Site Button */}
        <TouchableOpacity
          onPress={handleOpenAddModal}
          activeOpacity={0.8}
          style={[styles.addNewSiteBtn, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.surfaceVariant }]}
        >
          <Ionicons name="add" size={18} color="#E31E24" />
          <Text style={[styles.addNewSiteBtnText, { color: theme.colors.textPrimary }]}>Enter Address Manually</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Inline Modal: Add New Delivery Address */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => Keyboard.dismiss()}
              style={{ flex: 1 }}
            />
            <View style={{
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 18,
              maxHeight: SCREEN_HEIGHT * 0.88,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 10,
            }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  Add New Delivery Address
                </Text>
                <TouchableOpacity
                  onPress={() => setIsAddModalVisible(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={{ paddingBottom: 30 }}
              >
                {/* ── 1. "USE CURRENT LOCATION" GPS TOGGLE CARD ── */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 13,
                    borderRadius: 12,
                    borderWidth: 1,
                    marginBottom: 12,
                    backgroundColor: isDark ? '#1E293B' : '#FEF2F2',
                    borderColor: isDark ? '#334155' : '#FECACA',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: isDark ? 'rgba(227, 30, 36, 0.2)' : '#FEE2E2',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Ionicons name="navigate-circle" size={24} color="#E31E24" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: isDark ? '#F8FAFC' : '#0F172A' }}>
                        Use Current Location
                      </Text>
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
                        Auto-detect exact address & PIN code via GPS
                      </Text>
                    </View>
                  </View>

                  {isFetchingGPS ? (
                    <ActivityIndicator size="small" color="#E31E24" />
                  ) : (
                    <Switch
                      value={isUsingCurrentLocation}
                      onValueChange={handleUseCurrentLocationToggle}
                      trackColor={{ false: '#CBD5E1', true: '#E31E24' }}
                      thumbColor="#FFFFFF"
                    />
                  )}
                </View>

                {/* GPS Coordinates pill & Map Adjust */}
                {newLatitude !== undefined && newLongitude !== undefined && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 6,
                    }}>
                      <Ionicons name="location" size={13} color="#E31E24" />
                      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: isDark ? '#E2E8F0' : '#475569' }}>
                        GPS: {newLatitude.toFixed(4)}°, {newLongitude.toFixed(4)}°
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setIsAddModalVisible(false);
                        setIsMapModalVisible(true);
                      }}
                      style={{ paddingHorizontal: 6, paddingVertical: 4 }}
                    >
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#E31E24' }}>
                        Adjust on Map ›
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ── 2. HOUSE / FLAT / GATE NO ── */}
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: isDark ? '#94A3B8' : '#475569', marginBottom: 4 }}>
                  House / Flat / Gate No.
                </Text>
                <TextInput
                  value={newHouseFlatNo}
                  onChangeText={setNewHouseFlatNo}
                  placeholder="e.g. Plot 102, Gate 4"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  style={{
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderWidth: 1,
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    marginBottom: 12,
                  }}
                />

                {/* ── 4. FULL STREET ADDRESS ── */}
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: isDark ? '#94A3B8' : '#475569', marginBottom: 4 }}>
                  Full Street Address *
                </Text>
                <TextInput
                  value={newStreet}
                  onChangeText={setNewStreet}
                  placeholder="e.g. Plot 102, Phase 4, Financial District"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  style={{
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderWidth: 1,
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    marginBottom: 12,
                  }}
                />

                {/* ── 5. AREA / LOCALITY ── */}
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: isDark ? '#94A3B8' : '#475569', marginBottom: 4 }}>
                  Area / Locality
                </Text>
                <TextInput
                  value={newArea}
                  onChangeText={setNewArea}
                  placeholder="e.g. Financial District, Gachibowli"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  style={{
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderWidth: 1,
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    marginBottom: 12,
                  }}
                />

                {/* ── 6. LANDMARK ── */}
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: isDark ? '#94A3B8' : '#475569', marginBottom: 4 }}>
                  Landmark (Optional)
                </Text>
                <TextInput
                  value={newLandmark}
                  onChangeText={setNewLandmark}
                  placeholder="e.g. Opposite Peddamma Temple, Near Metro Pillar 12"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  style={{
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderWidth: 1,
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    marginBottom: 12,
                  }}
                />

                {/* ── 7. CITY / REGION & PIN CODE ── */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: isDark ? '#94A3B8' : '#475569', marginBottom: 4 }}>
                      City / Region *
                    </Text>
                    <TextInput
                      value={newCity}
                      onChangeText={setNewCity}
                      placeholder="e.g. Hyderabad, Telangana"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      style={{
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        color: isDark ? '#F8FAFC' : '#0F172A',
                        borderWidth: 1,
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 14,
                      }}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: isDark ? '#94A3B8' : '#475569', marginBottom: 4 }}>
                      Pin Code / Postal Code *
                    </Text>
                    <TextInput
                      value={newPincode}
                      onChangeText={setNewPincode}
                      placeholder="e.g. 500032"
                      keyboardType="number-pad"
                      maxLength={6}
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      style={{
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        color: isDark ? '#F8FAFC' : '#0F172A',
                        borderWidth: 1,
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 14,
                      }}
                    />
                  </View>
                </View>

                {/* ── 8. CUSTOMER & CONTACT DETAILS (AUTO-FETCHED) ── */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: isDark ? '#94A3B8' : '#475569', marginBottom: 4 }}>
                    Customer / Receiver Name *
                  </Text>
                  <TextInput
                    value={newRecipientName}
                    onChangeText={setNewRecipientName}
                    placeholder="e.g. Ramesh Kumar"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    style={{
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      color: isDark ? '#F8FAFC' : '#0F172A',
                      borderWidth: 1,
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 14,
                      marginBottom: 10,
                    }}
                  />

                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: isDark ? '#94A3B8' : '#475569', marginBottom: 4 }}>
                    Contact Phone Number *
                  </Text>
                  <TextInput
                    value={newPhone}
                    onChangeText={setNewPhone}
                    placeholder="e.g. 9876543210"
                    keyboardType="phone-pad"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    style={{
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      color: isDark ? '#F8FAFC' : '#0F172A',
                      borderWidth: 1,
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 14,
                      marginBottom: 6,
                    }}
                  />

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Ionicons name="shield-checkmark" size={13} color="#10B981" />
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#10B981' }}>
                      Auto-fetched from account. Order status & delivery updates will be sent here.
                    </Text>
                  </View>
                </View>

                {/* ── 9. SAVE ADDRESS AS CHIPS ── */}
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: isDark ? '#94A3B8' : '#475569', marginBottom: 6 }}>
                  Save Address As
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {[
                    { key: 'WORK', label: '🏢 Work' },
                    { key: 'HOME', label: '🏠 Home' },
                    { key: 'OTHER', label: '📍 Other' },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => setNewAddressType(item.key as AddressType)}
                      style={{
                        flex: 1,
                        paddingVertical: 9,
                        paddingHorizontal: 6,
                        borderRadius: 8,
                        borderWidth: 1.5,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: newAddressType === item.key ? '#FEF2F2' : (isDark ? '#1E293B' : '#F1F5F9'),
                        borderColor: newAddressType === item.key ? '#E31E24' : (isDark ? '#334155' : '#E2E8F0'),
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'Inter_600SemiBold',
                          fontSize: 11,
                          color: newAddressType === item.key ? '#E31E24' : (isDark ? '#94A3B8' : '#64748B'),
                        }}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>


              </ScrollView>

              {/* ── 11. SIDE-BY-SIDE BUTTONS (MATCHING EXACT SCREENSHOT) ── */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: isDark ? '#1E293B' : '#F1F5F9',
                }}
              >
                {/* Cancel Button */}
                <TouchableOpacity
                  onPress={() => setIsAddModalVisible(false)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: '#C02626',
                    backgroundColor: 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: '#C02626' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                {/* Save Address Button */}
                <TouchableOpacity
                  onPress={handleSaveNewAddress}
                  disabled={isSavingAddress}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 10,
                    backgroundColor: '#E31E24',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSavingAddress ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: '#FFFFFF' }}>
                      Save Address
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Interactive Map Location Picker Modal */}
      <LocationPickerModal
        visible={isMapModalVisible}
        onClose={() => setIsMapModalVisible(false)}
        selectedSite={selectedDeliverySite}
        onSelectSite={handleMapSelectSite}
      />

      {/* Sticky Bottom Action Bar */}
      <View
        style={[
          styles.stickyBottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: theme.colors.cardBackground,
            borderTopColor: theme.colors.cardBorder,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleProceedToPayment}
          activeOpacity={0.85}
          style={styles.continueBtn}
        >
          <LinearGradient
            colors={['#E31E24', '#D32F2F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueBtnGradient}
          >
            <Text style={[styles.continueBtnText, { color: '#FFFFFF' }]}>Proceed to Payment</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── DYNAMIC PAYMENT SUITE SCREEN ──────────────────────────────────────────────
export function CheckoutPaymentScreen({ navigation, route }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector(selectCartItems);
  const cartSubtotal = useAppSelector(selectCartSubtotal);
  const cartStoreId = useAppSelector((state: any) => state.cart?.storeId);
  const cartCouponCode = useAppSelector((state: any) => state.cart?.couponCode);
  const routeAddressId = Number(route?.params?.addressId);
  const [resolvedAddressId, setResolvedAddressId] = useState<number | null>(
    !isNaN(routeAddressId) && routeAddressId > 0 ? routeAddressId : null
  );
  const [deliverySiteTitle, setDeliverySiteTitle] = useState<string>(
    route?.params?.addressTitle || ''
  );
  const [deliverySiteAddress, setDeliverySiteAddress] = useState<string>(
    route?.params?.addressDetails || ''
  );
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [checkoutPreview, setCheckoutPreview] = useState<any>(null);
  const isUserLoggedIn = authStore.isAuthenticated();

  const topSafePadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  ) + 8;

  // Selected Payment Method: Real Live Razorpay Gateway (UPI, Cards, NetBanking) or Cash on Delivery
  const [selectedMethod, setSelectedMethod] = useState<'razorpay' | 'cod'>('razorpay');

  // Breakdown accordion
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Razorpay & Payment Gateway State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [razorpayModalVisible, setRazorpayModalVisible] = useState(false);
  const [razorpayOrderData, setRazorpayOrderData] = useState<RazorpayOrderData | null>(null);

  // Order for Someone Else State (Backend V20 Migration & Contract)
  const [orderForSomeoneElse, setOrderForSomeoneElse] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  useEffect(() => {
    let isMounted = true;

    const resolveAddressAndPreview = async () => {
      let currentId = resolvedAddressId;

      // If address ID is missing or invalid, fetch live saved addresses from backend
      if (!currentId || isNaN(currentId) || currentId <= 0) {
        setIsLoadingAddress(true);
        try {
          let list: any[] = await addressesApi.getAddresses();
          if (!Array.isArray(list) || list.length === 0) {
            list = await userApi.getAddresses();
          }
          if (Array.isArray(list) && list.length > 0) {
            const def = list.find((a: any) => a.isDefault) || list[0];
            const raw = def.addressId || def.id;
            const num = Number(raw);
            if (!isNaN(num) && num > 0) {
              currentId = num;
              if (isMounted) {
                setResolvedAddressId(num);
                const title = def.siteName || def.recipientName || `Project Site #${num}`;
                const fullAddr = [
                  def.houseFlatNo,
                  def.addressLine1,
                  def.addressLine2,
                  def.areaLocality,
                  def.city,
                  def.state ? `${def.state} - ${def.pincode || ''}` : def.pincode,
                ].filter(Boolean).join(', ');
                setDeliverySiteTitle(title);
                setDeliverySiteAddress(fullAddr || `${def.city || 'Hyderabad'}, ${def.state || 'Telangana'}`);
              }
            }
          }
        } catch (err) {
          console.warn('[CheckoutPaymentScreen] Failed to fetch saved addresses:', err);
        } finally {
          if (isMounted) setIsLoadingAddress(false);
        }
      }

      // If we now have a valid address ID, request live checkout pricing preview
      if (currentId && !isNaN(currentId) && currentId > 0) {
        try {
          const preview = await ordersApi.previewCheckout({
            addressId: currentId,
            deliverySlot: '09:00 AM - 01:00 PM',
            requiresCraneUnloading: false,
          });
          if (isMounted && preview) {
            setCheckoutPreview(preview);
          }
        } catch (prevErr) {
          console.warn('[CheckoutPaymentScreen] previewCheckout failed:', prevErr);
        }
      }
    };

    resolveAddressAndPreview();

    return () => {
      isMounted = false;
    };
  }, [route?.params?.addressId]);

  // Restore saved checkout draft upon returning to payment screen (e.g. after login/register)
  useFocusEffect(
    useCallback(() => {
      const draft = getCheckoutDraft();
      if (draft) {
        if (draft.addressId && (!resolvedAddressId || resolvedAddressId <= 0)) {
          setResolvedAddressId(draft.addressId);
        }
        if (draft.addressTitle && !deliverySiteTitle) {
          setDeliverySiteTitle(draft.addressTitle);
        }
        if (draft.addressDetails && !deliverySiteAddress) {
          setDeliverySiteAddress(draft.addressDetails);
        }
        if (draft.selectedMethod) {
          setSelectedMethod(draft.selectedMethod === 'cod' ? 'cod' : 'razorpay');
        }
      }
    }, [resolvedAddressId, deliverySiteTitle, deliverySiteAddress])
  );

  const subtotal = checkoutPreview?.subtotal ?? cartSubtotal;
  const shippingCalc = shippingApi.calculateShipping(
    subtotal,
    cartItems.length,
    checkoutPreview?.freightCharge,
    false,
    false
  );
  const freight = shippingCalc.shippingCost;
  const crane = checkoutPreview?.craneUnloadingCharge ?? 0;
  const gst = checkoutPreview?.totalGst ?? (checkoutPreview ? 0 : Math.round(subtotal * 0.18));
  const discount = checkoutPreview?.discount ?? 0;
  const total = (checkoutPreview?.grandTotal !== undefined && checkoutPreview?.freightCharge === freight)
    ? checkoutPreview.grandTotal
    : Math.max(0, subtotal + freight + crane + gst - discount);

  // Direct instant secure order placement & Razorpay payment trigger
  // Direct instant secure order placement & Razorpay payment trigger
  const handleStartPayment = async () => {
    if (cartItems.length === 0 || isProcessing) return;

    // 1. Guard order placement: Require authentication before placing order
    if (!requireAuthenticationBeforeOrder({
      navigation,
      checkoutState: {
        addressId: resolvedAddressId,
        addressTitle: deliverySiteTitle,
        addressDetails: deliverySiteAddress,
        selectedMethod,
        couponCode: cartCouponCode || '',
      },
      returnScreen: 'CheckoutPayment',
      showPrompt: true,
    })) {
      return;
    }

    if (!resolvedAddressId || isNaN(resolvedAddressId) || resolvedAddressId <= 0) {
      Alert.alert(
        'Delivery Site Required',
        'Please select or add a verified delivery address before proceeding to payment.',
        [
          {
            text: 'Select Delivery Site',
            onPress: () => navigation.navigate('CheckoutAddress'),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setIsProcessing(true);
    try {
      // ── CHECKOUT PRE-FLIGHT: Ensure server cart is non-empty & synchronized in database ──
      let serverCart: any = null;
      try {
        serverCart = await cartApi.getCart();
      } catch (err) {
        console.warn('[Checkout] Failed to fetch server cart:', err);
      }

      if (!serverCart || !Array.isArray(serverCart.items) || serverCart.items.length === 0) {
        if (cartItems.length > 0) {
          const syncPayload = cartItems.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity || 1,
          }));
          serverCart = await cartApi.syncGuestCart(syncPayload, cartStoreId || undefined);
        }
      }

      if (!serverCart || !Array.isArray(serverCart.items) || serverCart.items.length === 0) {
        dispatch(setServerCart({ cartId: 0, items: [], subtotal: 0, couponDiscount: 0, totalGst: 0, deliveryCharge: 0, grandTotal: 0 } as any));
        setIsProcessing(false);
        Alert.alert(
          '🛒 Cart is Empty',
          'Your server cart is empty. Please add items before proceeding to checkout.',
          [{ text: 'Browse Products', onPress: () => navigation.navigate('ProductList') }, { text: 'OK' }]
        );
        return;
      }
      // Sync Redux with the fresh server state
      dispatch(setServerCart(serverCart));

      const currentUser = authStore.getUser();
      const payableAmount = total;

      // Validate Order for Someone Else (Backend V20 Migration & Contract)
      if (orderForSomeoneElse) {
        if (!recipientName.trim()) {
          Alert.alert(
            'Recipient Name Required',
            'Please enter the full name of the recipient for whom you are ordering.'
          );
          setIsProcessing(false);
          return;
        }
        if (!recipientPhone.trim() || recipientPhone.trim().replace(/[^0-9]/g, '').length < 8) {
          Alert.alert(
            'Recipient Contact Required',
            'Please enter a valid mobile number for the recipient so our delivery partner can coordinate upon arrival.'
          );
          setIsProcessing(false);
          return;
        }
      }

      if (selectedMethod === 'razorpay') {
        // ── FLOW 1: Live Razorpay Session via POST /api/payments/create-order (purpose: "CHECKOUT") ──
        let payOrder: any = null;
        try {
          payOrder = await paymentsApi.createPaymentOrder({
            addressId: resolvedAddressId,
            deliverySlot: '09:00 AM - 01:00 PM',
            requiresCraneUnloading: false,
            amount: payableAmount,
            currency: 'INR',
            purpose: 'CHECKOUT',
            orderForSomeoneElse: orderForSomeoneElse,
            recipientName: orderForSomeoneElse ? recipientName.trim() : undefined,
            recipientPhone: orderForSomeoneElse ? recipientPhone.trim() : undefined,
            notes: orderForSomeoneElse ? (deliveryNotes.trim() || undefined) : undefined,
          });
        } catch (payErr: any) {
          console.error('[Payment] createPaymentOrder failed:', payErr);
          const errorMsg = String(payErr?.response?.data?.message || payErr?.message || '');
          const isAuthError =
            payErr?.response?.status === 401 ||
            payErr?.response?.status === 403 ||
            errorMsg.toLowerCase().includes('unauthorized') ||
            errorMsg.toLowerCase().includes('access denied');

          if (isAuthError) {
            requireAuthenticationBeforeOrder({
              navigation,
              checkoutState: {
                addressId: resolvedAddressId,
                addressTitle: deliverySiteTitle,
                addressDetails: deliverySiteAddress,
                selectedMethod,
                couponCode: cartCouponCode || '',
              },
              returnScreen: 'CheckoutPayment',
              showPrompt: true,
            });
            return;
          }

          if (
            errorMsg.includes('Authentication failed') ||
            errorMsg.includes('BAD_REQUEST_ERROR') ||
            errorMsg.includes('Razorpay order creation failed')
          ) {
            Alert.alert(
              'Online Payment Unavailable',
              'Online payment gateway authentication failed on the server. You can switch to "Pay on Site Delivery" to place your order right now.',
              [
                {
                  text: 'Pay on Site Delivery',
                  onPress: () => setSelectedMethod('cod'),
                },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
            return;
          }

          Alert.alert(
            'Payment Session Failed',
            errorMsg || 'Unable to initialize secure Razorpay session. Please try again or choose Pay on Site Delivery.'
          );
          return;
        }

        if (!payOrder?.razorpayOrderId) {
          Alert.alert('Payment Error', 'Razorpay order ID was not received from payment gateway. Please try again.');
          return;
        }

        setRazorpayOrderData({
          orderId: payOrder.orderId || null,
          orderNumber: payOrder.orderNumber || null,
          razorpayOrderId: payOrder.razorpayOrderId,
          amount: total,
          amountInPaise: Math.round(total * 100),
          currency: payOrder.currency || 'INR',
          keyId: payOrder.keyId || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_TO6q7NUVnPM6bA',
          customerName: orderForSomeoneElse
            ? recipientName.trim()
            : (payOrder.customerName || currentUser?.fullName || 'Customer'),
          customerEmail: payOrder.customerEmail || currentUser?.email || 'customer@hinchmart.com',
          customerPhone: orderForSomeoneElse
            ? recipientPhone.trim()
            : (payOrder.customerPhone || currentUser?.phone || '9999999999'),
          description: payOrder.description || `HinchMart Order (${cartItems.length} items)`,
        });
        setRazorpayModalVisible(true);
      } else {
        // ── FLOW 2: Cash on Delivery (COD) via POST /api/orders ──
        let order: any = null;
        try {
          order = await ordersApi.placeOrder({
            deliveryAddressId: resolvedAddressId,
            addressId: resolvedAddressId,
            paymentMethod: 'COD',
            couponCode: cartCouponCode || undefined,
            deliverySlot: 'Morning (9 AM - 1 PM)',
            deliveryInstructions: deliveryNotes.trim() || '',
            requiresCraneUnloading: false,
            orderForSomeoneElse: orderForSomeoneElse,
            recipientName: orderForSomeoneElse ? recipientName.trim() : undefined,
            recipientPhone: orderForSomeoneElse ? recipientPhone.trim() : undefined,
            notes: deliveryNotes.trim() || undefined,
          });
        } catch (placeErr: any) {
          const errorMsg = String(placeErr?.response?.data?.message || placeErr?.message || '');
          const isAuthError =
            placeErr?.response?.status === 401 ||
            placeErr?.response?.status === 403 ||
            errorMsg.toLowerCase().includes('unauthorized') ||
            errorMsg.toLowerCase().includes('access denied');

          if (isAuthError) {
            requireAuthenticationBeforeOrder({
              navigation,
              checkoutState: {
                addressId: resolvedAddressId,
                addressTitle: deliverySiteTitle,
                addressDetails: deliverySiteAddress,
                selectedMethod,
                couponCode: cartCouponCode || '',
              },
              returnScreen: 'CheckoutPayment',
              showPrompt: true,
            });
            return;
          }

          Alert.alert(
            'Order Placement Failed',
            errorMsg || 'Unable to place order with live backend. Please check your details and try again.'
          );
          return;
        }

        const rawOrderId = order?.orderId || order?.id;
        const orderIdStr = String(rawOrderId || Date.now());
        const orderNumStr = order?.orderNumber || `ORD-${orderIdStr}`;
        const destinationName = deliverySiteTitle
          ? `${deliverySiteTitle}${deliverySiteAddress ? ` • ${deliverySiteAddress}` : ''}`
          : (deliverySiteAddress || 'Confirmed Project Site');

        clearCheckoutDraft();
        dispatch(clearCart());
        navigation.replace('OrderSuccess', {
          orderId: orderIdStr,
          orderNumber: orderNumStr,
          paymentMethod: 'COD',
          totalAmount: order?.totalAmount || payableAmount,
          paymentStatus: 'DUE_ON_DELIVERY',
          orderStatus: order?.orderStatus || order?.status || 'CONFIRMED',
          storeInvoiceNumber: order?.storeInvoiceNumber,
          deliveryDestination: destinationName,
          orderForSomeoneElse: orderForSomeoneElse,
          recipientName: orderForSomeoneElse ? recipientName.trim() : undefined,
          recipientPhone: orderForSomeoneElse ? recipientPhone.trim() : undefined,
          notes: deliveryNotes.trim() || undefined,
        });
      }
    } catch (err: any) {
      const errMsg = String(err?.response?.data?.message || err?.message || '');
      Alert.alert('Checkout Notice', errMsg || 'An error occurred during checkout. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Verified Live Payment Success Handler
   * Receives authentic cryptographic signature directly from Razorpay Gateway
   * and verifies it against the live backend HMAC-SHA256 endpoint.
   */
  const handleRazorpaySuccess = async (paymentResult: RazorpaySuccessResult) => {
    if (!razorpayOrderData || isVerifying) return;
    setIsVerifying(true);
    try {
      // POST /api/payments/verify with authentic gateway signature & paymentId
      const verifyRes = await paymentsApi.verifyPayment({
        orderId: razorpayOrderData.orderId || undefined,
        razorpayOrderId: paymentResult.razorpay_order_id,
        razorpayPaymentId: paymentResult.razorpay_payment_id,
        razorpaySignature: paymentResult.razorpay_signature,
        addressId: resolvedAddressId,
        deliverySlot: '09:00 AM - 01:00 PM',
      } as any);

      const destinationName = deliverySiteTitle
        ? `${deliverySiteTitle}${deliverySiteAddress ? ` • ${deliverySiteAddress}` : ''}`
        : (deliverySiteAddress || 'Confirmed Project Site');

      const confirmedOrderId = String(verifyRes?.orderId || razorpayOrderData.orderId || '');
      const confirmedOrderNumber = String(verifyRes?.orderNumber || razorpayOrderData.orderNumber || `ORD-${confirmedOrderId}`);

      setRazorpayModalVisible(false);
      clearCheckoutDraft();
      dispatch(clearCart());
      navigation.replace('OrderSuccess', {
        orderId: confirmedOrderId,
        orderNumber: confirmedOrderNumber,
        paymentMethod: verifyRes?.paymentMethod || 'RAZORPAY',
        totalAmount: verifyRes?.amount || razorpayOrderData.amount || total,
        paymentStatus: verifyRes?.status || 'CAPTURED',
        orderStatus: 'CONFIRMED',
        razorpayPaymentId: paymentResult.razorpay_payment_id,
        razorpayOrderId: paymentResult.razorpay_order_id,
        deliveryDestination: destinationName,
        orderForSomeoneElse: orderForSomeoneElse,
        recipientName: orderForSomeoneElse ? recipientName.trim() : undefined,
        recipientPhone: orderForSomeoneElse ? recipientPhone.trim() : undefined,
        notes: deliveryNotes.trim() || undefined,
      });
    } catch (err: any) {
      console.error('[Payment] verifyPayment failed:', err);
      Alert.alert(
        'Payment Verification Notice',
        err?.response?.data?.message || err?.message || 'Payment signature could not be verified by the live backend. Please contact support.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#E31E24" translucent />

      {/* Header - IBO Red Bar */}
      <View
        style={[
          styles.topHeader,
          {
            paddingTop: topSafePadding,
            backgroundColor: '#E31E24',
            borderBottomColor: '#C4181D',
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={23} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Secure Checkout</Text>
        <View style={[styles.sslShieldPill, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
          <Ionicons name="shield-checkmark" size={13} color="#FFFFFF" />
          <Text style={[styles.sslShieldText, { color: '#FFFFFF' }]}>256-Bit SSL</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.paddingBox,
          { paddingBottom: Math.max(insets.bottom, 20) + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Indicator */}
        <View style={styles.stepIndicatorRow}>
          <View style={[styles.stepBadge, styles.stepBadgeDone]}>
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          </View>
          <Text style={[styles.stepLabelInactive, { color: theme.colors.textSecondary }]}>Delivery Site</Text>
          <View style={[styles.stepConnector, { backgroundColor: '#10B981' }]} />
          <View style={[styles.stepBadge, styles.stepBadgeActive]}>
            <Text style={styles.stepBadgeText}>2</Text>
          </View>
          <Text style={[styles.stepLabelActive, { color: theme.colors.textPrimary }]}>Payment Method</Text>
        </View>

        {/* Selected Delivery Destination Card */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.cardBackground,
            borderWidth: 1,
            borderColor: resolvedAddressId ? theme.colors.cardBorder : '#EF4444',
            borderRadius: 14,
            padding: 12,
            marginBottom: 8,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: resolvedAddressId ? 'rgba(227, 30, 36, 0.08)' : 'rgba(239, 68, 68, 0.1)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}
          >
            <Ionicons
              name={resolvedAddressId ? "location" : "alert-circle"}
              size={19}
              color={resolvedAddressId ? "#E31E24" : "#EF4444"}
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text numberOfLines={1} style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: theme.colors.textPrimary, flexShrink: 1 }}>
                {resolvedAddressId
                  ? (deliverySiteTitle || `Delivery Site #${resolvedAddressId}`)
                  : (isLoadingAddress ? 'Detecting delivery site...' : 'No Delivery Site Selected')}
              </Text>
              {resolvedAddressId ? (
                <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#10B981' }}>VERIFIED SITE</Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
              {deliverySiteAddress || (isLoadingAddress ? 'Fetching site details...' : 'Tap change to select or add your project site')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('CheckoutAddress')}
            activeOpacity={0.7}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 6,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F3F4F6',
              marginLeft: 8,
            }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11.5, color: '#E31E24' }}>
              Change
            </Text>
          </TouchableOpacity>
        </View>

        {!isUserLoggedIn && (
          <TouchableOpacity
            style={[
              styles.guestNoticeCard,
              {
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF',
                borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
              },
            ]}
            onPress={() => navigation.navigate('Login', { returnScreen: 'CheckoutPayment' })}
            activeOpacity={0.85}
          >
            <Ionicons name="person-circle-outline" size={24} color="#3B82F6" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.guestNoticeTitle, { color: theme.colors.textPrimary }]}>
                Guest Site Contact
              </Text>
              <Text style={[styles.guestNoticeSub, { color: theme.colors.textSecondary }]}>
                Sign in to link orders to your GST profile and earn points.
              </Text>
            </View>
            <View style={styles.guestSignInBtn}>
              <Text style={styles.guestSignInBtnText}>Sign In</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Live Total Banner */}
        <View style={[styles.amountBanner, { backgroundColor: isDark ? '#152238' : '#FEF3C7', borderColor: '#FDB913' }]}>
          <View>
            <Text style={[styles.amountBannerSub, { color: isDark ? '#94A3B8' : '#78350F' }]}>TOTAL PAYABLE AMOUNT</Text>
            <Text style={[styles.amountBannerTotal, { color: isDark ? '#FDB913' : '#152238' }]}>{formatPrice(total)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowBreakdown(!showBreakdown)}
            activeOpacity={0.75}
            style={[styles.breakdownToggleBtn, { backgroundColor: isDark ? 'rgba(253, 185, 19, 0.2)' : '#FDE68A' }]}
          >
            <Text style={[styles.breakdownToggleText, { color: isDark ? '#FDB913' : '#78350F' }]}>
              {showBreakdown ? 'Hide Breakdown ▲' : 'View Breakdown ▼'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Expandable Price Breakdown */}
        {showBreakdown && (
          <View style={[styles.breakdownBox, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.colors.textSecondary }]}>Material Items Subtotal</Text>
              <Text style={[styles.breakdownValue, { color: theme.colors.textPrimary }]}>{formatPrice(subtotal)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.colors.textSecondary }]}>Estimated Freight / Logistics</Text>
              <Text style={[styles.breakdownValue, { color: freight === 0 ? '#10B981' : theme.colors.textPrimary }]}>
                {freight === 0 ? 'FREE B2B FREIGHT' : formatPrice(freight)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.colors.textSecondary }]}>GST (18% Input Tax Credit)</Text>
              <Text style={[styles.breakdownValue, { color: theme.colors.textPrimary }]}>{formatPrice(gst)}</Text>
            </View>
            {discount > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: '#10B981' }]}>Discount / Voucher Rebate</Text>
                <Text style={[styles.breakdownValue, { color: '#10B981' }]}>-{formatPrice(discount)}</Text>
              </View>
            )}
            <View style={[styles.breakdownDivider, { backgroundColor: theme.colors.cardBorder }]} />
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownTotalKey, { color: theme.colors.textPrimary }]}>Net Amount Due</Text>
              <Text style={[styles.breakdownTotalVal, { color: '#FDB913' }]}>{formatPrice(total)}</Text>
            </View>
          </View>
        )}

        {/* ─── ORDER FOR SOMEONE ELSE CARD (Backend V20 Migration & Live Endpoint) ─── */}
        <Card
          variant="outlined"
          style={[
            styles.orderForSomeoneElseCard,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: orderForSomeoneElse ? '#E31E24' : theme.colors.cardBorder,
              borderWidth: orderForSomeoneElse ? 1.5 : 1,
            },
          ]}
        >
          <View style={styles.orderForSomeoneElseHeader}>
            <View
              style={[
                styles.orderForSomeoneElseIconCircle,
                {
                  backgroundColor: orderForSomeoneElse
                    ? 'rgba(227, 30, 36, 0.12)'
                    : isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : '#F3F4F6',
                },
              ]}
            >
              <Ionicons
                name="gift-outline"
                size={20}
                color={orderForSomeoneElse ? '#E31E24' : theme.colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.orderForSomeoneElseTitle, { color: theme.colors.textPrimary }]}>
                  Order for Someone Else
                </Text>
                {orderForSomeoneElse && (
                  <View style={styles.activePillBadge}>
                    <Text style={styles.activePillText}>ENABLED</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.orderForSomeoneElseSub, { color: theme.colors.textSecondary }]}>
                Delivery driver will contact recipient directly at drop-off
              </Text>
            </View>
            <Switch
              value={orderForSomeoneElse}
              onValueChange={setOrderForSomeoneElse}
              trackColor={{ false: isDark ? '#374151' : '#E5E7EB', true: '#E31E24' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {orderForSomeoneElse && (
            <View style={styles.orderForSomeoneElseBody}>
              <View style={[styles.orderForSomeoneElseDivider, { backgroundColor: theme.colors.cardBorder }]} />

              <View style={styles.inputFieldBlock}>
                <Text style={[styles.inputFieldLabel, { color: theme.colors.textSecondary }]}>
                  Recipient Full Name <Text style={{ color: '#E31E24' }}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputBoxContainer,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                >
                  <Ionicons name="person-outline" size={17} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    value={recipientName}
                    onChangeText={setRecipientName}
                    placeholder="e.g. Priya Sharma"
                    placeholderTextColor={theme.colors.textTertiary}
                    style={[styles.recipientInputText, { color: theme.colors.textPrimary }]}
                    maxLength={60}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputFieldBlock}>
                <Text style={[styles.inputFieldLabel, { color: theme.colors.textSecondary }]}>
                  Recipient Phone Number <Text style={{ color: '#E31E24' }}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputBoxContainer,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                >
                  <Ionicons name="call-outline" size={17} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    value={recipientPhone}
                    onChangeText={setRecipientPhone}
                    placeholder="e.g. +919876543210"
                    placeholderTextColor={theme.colors.textTertiary}
                    style={[styles.recipientInputText, { color: theme.colors.textPrimary }]}
                    keyboardType="phone-pad"
                    maxLength={15}
                  />
                </View>
              </View>

              <View style={styles.inputFieldBlock}>
                <Text style={[styles.inputFieldLabel, { color: theme.colors.textSecondary }]}>
                  Delivery Instructions / Notes for Driver
                </Text>
                <View
                  style={[
                    styles.inputBoxContainer,
                    styles.textAreaContainer,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                >
                  <Ionicons name="chatbox-ellipses-outline" size={17} color={theme.colors.textSecondary} style={{ marginRight: 8, marginTop: 2 }} />
                  <TextInput
                    value={deliveryNotes}
                    onChangeText={setDeliveryNotes}
                    placeholder="e.g. Please call recipient upon arrival at location"
                    placeholderTextColor={theme.colors.textTertiary}
                    style={[styles.recipientInputText, styles.textAreaInputText, { color: theme.colors.textPrimary }]}
                    multiline
                    numberOfLines={2}
                    maxLength={150}
                  />
                </View>
              </View>

              <View style={[styles.deliveryAssurancePill, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5' }]}>
                <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                <Text style={[styles.deliveryAssuranceText, { color: isDark ? '#34D399' : '#065F46' }]}>
                  Our delivery partner will coordinate with{' '}
                  <Text style={{ fontWeight: '700' }}>{recipientName.trim() || 'the recipient'}</Text> upon arrival.
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Payment Methods Section Header */}
        <Text style={[styles.sectionSectionHeader, { color: theme.colors.textPrimary, marginTop: 12 }]}>
          Select Payment Mode
        </Text>

        {/* ─── 1. RAZORPAY ONLINE GATEWAY (UPI, CARDS, NETBANKING, WALLETS) ─── */}
        <TouchableOpacity
          onPress={() => setSelectedMethod('razorpay')}
          activeOpacity={0.9}
        >
          <Card
            variant="outlined"
            style={[
              styles.methodCard,
              {
                backgroundColor: theme.colors.cardBackground,
                borderColor: selectedMethod === 'razorpay' ? '#E31E24' : theme.colors.cardBorder,
                borderWidth: selectedMethod === 'razorpay' ? 2 : 1,
              },
            ]}
          >
            <View style={styles.methodHeaderRow}>
              <View style={[styles.methodIconCircle, { backgroundColor: 'rgba(227, 30, 36, 0.12)' }]}>
                <Ionicons name="shield-checkmark" size={20} color="#E31E24" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.methodTitle, { color: theme.colors.textPrimary }]}>Online Payment</Text>
                  <View style={[styles.popularBadge, { backgroundColor: '#10B981' }]}>
                    <Text style={styles.popularBadgeText}>FASTEST & SECURE</Text>
                  </View>
                </View>
                <Text style={[styles.methodSub, { color: theme.colors.textSecondary }]}>
                  UPI (GPay, PhonePe, Paytm), Cards & NetBanking
                </Text>
              </View>
              <Ionicons
                name={selectedMethod === 'razorpay' ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selectedMethod === 'razorpay' ? '#E31E24' : theme.colors.cardBorder}
              />
            </View>

            {selectedMethod === 'razorpay' && (
              <View style={[styles.methodDetailBody, { borderTopColor: theme.colors.cardBorder }]}>
                <Text style={[styles.inputLabelText, { color: theme.colors.textSecondary, marginBottom: 8 }]}>
                  Accepted Payment Methods via Razorpay:
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  <View style={[styles.gatewayBadgePill, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <Ionicons name="flash" size={12} color="#F59E0B" />
                    <Text style={[styles.gatewayBadgePillText, { color: theme.colors.textPrimary }]}>Google Pay, PhonePe, Paytm & UPI</Text>
                  </View>
                  <View style={[styles.gatewayBadgePill, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <Ionicons name="card" size={12} color="#3B82F6" />
                    <Text style={[styles.gatewayBadgePillText, { color: theme.colors.textPrimary }]}>Visa, MasterCard, RuPay Cards</Text>
                  </View>
                  <View style={[styles.gatewayBadgePill, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <Ionicons name="globe-outline" size={12} color="#10B981" />
                    <Text style={[styles.gatewayBadgePillText, { color: theme.colors.textPrimary }]}>All Indian NetBanking Banks</Text>
                  </View>
                  <View style={[styles.gatewayBadgePill, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <Ionicons name="wallet-outline" size={12} color="#8B5CF6" />
                    <Text style={[styles.gatewayBadgePillText, { color: theme.colors.textPrimary }]}>Cred, Mobikwik & Wallets</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 }}>
                  <Ionicons name="lock-closed" size={13} color="#10B981" />
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11.5, color: '#10B981' }}>
                    Secured by Razorpay • 100% RBI Compliant 256-Bit SSL
                  </Text>
                </View>
              </View>
            )}
          </Card>
        </TouchableOpacity>

        {/* ─── 2. CASH / PAY ON SITE DELIVERY ─── */}
        <TouchableOpacity
          onPress={() => setSelectedMethod('cod')}
          activeOpacity={0.9}
        >
          <Card
            variant="outlined"
            style={[
              styles.methodCard,
              {
                backgroundColor: theme.colors.cardBackground,
                borderColor: selectedMethod === 'cod' ? '#E31E24' : theme.colors.cardBorder,
                borderWidth: selectedMethod === 'cod' ? 2 : 1,
              },
            ]}
          >
            <View style={styles.methodHeaderRow}>
              <View style={[styles.methodIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <Ionicons name="cash-outline" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.methodTitle, { color: theme.colors.textPrimary }]}>Pay on Site Delivery</Text>
                <Text style={[styles.methodSub, { color: theme.colors.textSecondary }]}>Inspect materials on arrival before paying</Text>
              </View>
              <Ionicons
                name={selectedMethod === 'cod' ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selectedMethod === 'cod' ? '#E31E24' : theme.colors.cardBorder}
              />
            </View>

            {selectedMethod === 'cod' && (
              <View style={[styles.methodDetailBody, { borderTopColor: theme.colors.cardBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: theme.colors.textSecondary }}>
                    Hand over payment by Cash or UPI directly to our verified driver upon inspection.
                  </Text>
                </View>
              </View>
            )}
          </Card>
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky Bottom Order Summary & CTA */}
      <View
        style={[
          styles.stickyBottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: theme.colors.cardBackground,
            borderTopColor: theme.colors.cardBorder,
          },
        ]}
      >
        <View style={styles.stickyBarMetaRow}>
          <View>
            <Text style={[styles.stickyPayableLabel, { color: theme.colors.textTertiary }]}>TOTAL PAYABLE</Text>
            <Text style={[styles.stickyPayableAmount, { color: theme.colors.textPrimary }]}>{formatPrice(total)}</Text>
          </View>
          <View style={styles.stickySecurityPill}>
            <Ionicons name="lock-closed" size={13} color="#10B981" />
            <Text style={styles.stickySecurityText}>Escrow Protected</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleStartPayment}
          disabled={isProcessing}
          activeOpacity={0.85}
          style={[styles.payNowBtn, isProcessing && { opacity: 0.7 }]}
        >
          <LinearGradient
            colors={['#E31E24', '#D32F2F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.payNowGradient}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
            )}
            <Text style={[styles.payNowBtnText, { color: '#FFFFFF' }]}>
              {isProcessing
                ? 'Initiating Secure Gateway...'
                : selectedMethod === 'cod'
                ? 'Confirm Site Delivery Order'
                : `Pay ${formatPrice(total)} Securely`}
            </Text>
            {!isProcessing && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Real Live Razorpay Standard Gateway Modal (Zero Mock Data) */}
      <RazorpayCheckoutModal
        visible={razorpayModalVisible}
        orderData={razorpayOrderData}
        onSuccess={handleRazorpaySuccess}
        onError={(errMsg) => {
          Alert.alert('Payment Failed', errMsg);
        }}
        onClose={() => {
          setRazorpayModalVisible(false);
        }}
        isDark={isDark}
      />
    </View>
  );
}

/* ================================================================== */
/* 4. DIGITAL RECEIPT / ORDER CONFIRMATION SCREEN                      */
/* ================================================================== */
export { OrderSuccessScreen, PaymentStatusScreen } from './OrderSuccessScreen';

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  backBtn: {
    padding: 6,
    marginLeft: -4,
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17.5,
  },
  addSiteHeaderBtn: {
    padding: 6,
  },
  sslShieldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sslShieldText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10.5,
    color: '#10B981',
  },
  paddingBox: {
    padding: 16,
    gap: 12,
  },
  // Step indicator
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    gap: 8,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeActive: {
    backgroundColor: '#FDB913',
    borderColor: '#FDB913',
  },
  stepBadgeDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  stepBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#152238',
  },
  stepLabelActive: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  stepLabelInactive: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  stepConnector: {
    width: 32,
    height: 2,
    borderRadius: 1,
  },
  sectionSectionHeader: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    marginBottom: 4,
  },
  // Address card
  addrCard: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 6,
  },
  addrIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addrName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
  },
  addrTypeBadge: {
    backgroundColor: 'rgba(253, 185, 19, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  addrTypeBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9.5,
    color: '#D97706',
  },
  radioOutline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  addrSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 8,
  },
  addrPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  addrPhone: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
  },
  addNewSiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addNewSiteBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  // Live Amount Banner
  amountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.2,
    marginBottom: 4,
  },
  amountBannerSub: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  amountBannerTotal: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 22,
    marginTop: 1,
  },
  breakdownToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  breakdownToggleText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11.5,
  },
  breakdownBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  breakdownValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
  },
  breakdownDivider: {
    height: 1,
    marginVertical: 2,
  },
  breakdownTotalKey: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13.5,
  },
  breakdownTotalVal: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 16,
  },
  // Payment Method Card
  methodCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 6,
  },
  methodHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
  },
  methodSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    marginTop: 1,
  },
  popularBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  popularBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8.5,
    color: '#FFFFFF',
  },
  methodDetailBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  inputLabelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    marginBottom: 6,
  },
  // UPI
  upiAppsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  upiAppPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  upiAppText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
  },
  upiInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  upiTextInput: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#16A34A',
  },
  // Card
  cardPreviewBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardPreviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardPreviewChip: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#FDB913',
    letterSpacing: 1,
  },
  cardPreviewBrand: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  cardPreviewNumber: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 14,
  },
  cardPreviewBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardPreviewHolderLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  cardPreviewHolderName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#FFFFFF',
    marginTop: 1,
  },
  cardInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  cardInputText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
  },
  cardRowTwoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  saveCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  saveCardText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    flex: 1,
  },
  // Bank Grid
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bankGridCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  bankLogoCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankLogoCircleText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 9,
    color: '#FFFFFF',
  },
  bankGridName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    flex: 1,
  },
  // Escrow Details
  escrowDetailsBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  escrowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  escrowHeaderText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: '#10B981',
  },
  escrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  escrowKey: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
  },
  escrowVal: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
  },
  escrowValHighlight: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
  },
  // Credit Limit
  creditLimitCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  creditLimitLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  creditLimitAmount: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 16,
  },
  creditLimitSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  // Sticky Bottom Bar
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  continueBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  continueBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  continueBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#152238',
  },
  stickyBarMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stickyPayableLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  stickyPayableAmount: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 18,
  },
  stickySecurityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stickySecurityText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10.5,
    color: '#10B981',
  },
  payNowBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  payNowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  payNowBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#152238',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Modal Loading
  paymentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  paymentModalBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalRadarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(253, 185, 19, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalRadarTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    textAlign: 'center',
  },
  modalRadarSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 20,
  },
  modalStepsList: {
    width: '100%',
    gap: 12,
  },
  modalStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalStepText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    flex: 1,
  },
  // Success Screen
  successCelebrationWrap: {
    marginTop: 12,
    marginBottom: 16,
  },
  successIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  orderSuccessTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    textAlign: 'center',
  },
  orderSuccessSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 300,
  },
  digitalReceiptCard: {
    width: '100%',
    borderRadius: 18,
    padding: 16,
    marginVertical: 18,
    borderWidth: 1.2,
    gap: 10,
  },
  receiptTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptOrderIdLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  receiptOrderIdVal: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    marginTop: 1,
  },
  copyOrderIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyOrderIdBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  receiptDivider: {
    height: 1,
    marginVertical: 2,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptKey: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
  },
  receiptVal: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
  },
  receiptValHighlight: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 15,
  },
  receiptValGreen: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
  },
  downloadInvoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  downloadInvoiceText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#3B82F6',
  },
  primarySuccessActionBtn: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  primarySuccessActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  primarySuccessActionText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#152238',
  },
  guestNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  guestNoticeTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
  },
  guestNoticeSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  guestSignInBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  guestSignInBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  gatewayBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  gatewayBadgePillText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontSize: 12,
    fontWeight: '600',
  },
  // ─── Order for Someone Else Styles ───
  orderForSomeoneElseCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  orderForSomeoneElseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderForSomeoneElseIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  orderForSomeoneElseTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
  },
  orderForSomeoneElseSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  activePillBadge: {
    backgroundColor: 'rgba(227, 30, 36, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  activePillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#E31E24',
    letterSpacing: 0.5,
  },
  orderForSomeoneElseBody: {
    marginTop: 10,
  },
  orderForSomeoneElseDivider: {
    height: 1,
    marginVertical: 10,
  },
  inputFieldBlock: {
    marginBottom: 10,
  },
  inputFieldLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    marginBottom: 5,
  },
  inputBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  recipientInputText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    paddingVertical: 0,
  },
  textAreaContainer: {
    height: 64,
    alignItems: 'flex-start',
    paddingTop: 8,
  },
  textAreaInputText: {
    height: 48,
    textAlignVertical: 'top',
  },
  deliveryAssurancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  deliveryAssuranceText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  // Recipient Success Receipt Styles
  recipientSuccessCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginVertical: 8,
  },
  recipientSuccessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  recipientSuccessBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10.5,
    color: '#D97706',
    letterSpacing: 0.5,
  },
  recipientSuccessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
});

export default CheckoutPaymentScreen;
