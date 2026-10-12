/**
 * HINCH MART — Customer Delivery Address Management Screen
 * Connected to Live Backend APIs:
 * - GET    /api/addresses
 * - GET    /api/addresses/{id}
 * - POST   /api/addresses
 * - PUT    /api/addresses/{id}
 * - DELETE /api/addresses/{id}
 * - PATCH  /api/addresses/{id}/default
 *
 * Features:
 * - "+ Add New Site Address" matching Swiggy/Zomato aesthetics
 * - "Use Current Location" GPS toggle with live reverse geocoding
 * - "Ordering for someone else?" recipient flow like Swiggy/Zomato
 * - Full fields: Site/Project Name, House/Flat/Gate No, Street Address, Area, Landmark, City, Pincode
 * - Address Type (Work/Home/Other), Heavy Vehicle access, and Default address toggle
 * - Interactive Google Maps pin-drop integration
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  Modal,
  TextInput,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Keyboard,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useTheme } from '../../../theme';
import { Header } from '../../../components/layout/Screen';
import { addressesApi } from '../../../services/api/addresses.api';
import { locationApi } from '../../../services/api/location.api';
import { userApi } from '../../../services/api/user.api';
import { CustomerAddress, AddressType } from '../../../types/location.types';
import {
  LocationPickerModal,
  DeliverySite,
  customerAddressToDeliverySite,
} from '../../../components/ui/LocationPickerModal';
import { authStore } from '../../../store/authStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function AddressesScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Map Picker Modal state
  const [isMapModalVisible, setIsMapModalVisible] = useState<boolean>(false);

  // Form Modal state (for both Add and Edit)
  const [isFormModalVisible, setIsFormModalVisible] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // GPS / "Use Current Location" states
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState<boolean>(false);
  const [isFetchingGPS, setIsFetchingGPS] = useState<boolean>(false);
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);

  // Form Fields
  const [siteName, setSiteName] = useState<string>('');
  const [houseFlatNo, setHouseFlatNo] = useState<string>('');
  const [addressLine1, setAddressLine1] = useState<string>('');
  const [addressLine2, setAddressLine2] = useState<string>('');
  const [areaLocality, setAreaLocality] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [city, setCity] = useState<string>('Hyderabad');
  const [state, setState] = useState<string>('Telangana');
  const [pincode, setPincode] = useState<string>('');
  const [addressType, setAddressType] = useState<AddressType>('WORK');
  const [hasHeavyVehicle, setHasHeavyVehicle] = useState<boolean>(true);
  const [isDefault, setIsDefault] = useState<boolean>(false);

  // Swiggy / Zomato "Ordering for someone else?" Flow
  const [isOrderingForSomeoneElse, setIsOrderingForSomeoneElse] = useState<boolean>(false);
  const [recipientName, setRecipientName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');

  const loadAddresses = useCallback(async (showIndicator = true) => {
    if (showIndicator) setIsLoading(true);
    try {
      const list = await addressesApi.getAddresses();
      setAddresses(list);
    } catch (err: any) {
      if (__DEV__) {
        console.log('[AddressesScreen] load error:', err?.message || err);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAddresses(false);
  };

  const handleOpenAdd = async () => {
    setIsEditing(false);
    setEditingAddressId(null);
    setIsUsingCurrentLocation(false);
    setIsFetchingGPS(false);
    setLatitude(undefined);
    setLongitude(undefined);

    setSiteName('');
    setHouseFlatNo('');
    setAddressLine1('');
    setAddressLine2('');
    setAreaLocality('');
    setLandmark('');
    setCity('Hyderabad');
    setState('Telangana');
    setPincode('');
    setAddressType('HOME');
    setHasHeavyVehicle(true);
    setIsDefault(addresses.length === 0);

    setIsOrderingForSomeoneElse(false);
    const user = authStore.getUser();
    let name = user?.fullName || (user as any)?.name || (user as any)?.customerName || '';
    let userPhone = user?.phone || (user as any)?.phoneNumber || '';

    if (!name || !userPhone) {
      try {
        const p = await userApi.getProfile();
        if (p) {
          name = name || p.fullName || (p as any)?.name || '';
          userPhone = userPhone || p.phone || '';
        }
      } catch {}
    }

    setRecipientName(name);
    setPhone(userPhone);

    setIsFormModalVisible(true);
  };

  const handleOpenEdit = (addr: CustomerAddress) => {
    setIsEditing(true);
    setEditingAddressId(addr.addressId);
    setIsUsingCurrentLocation(false);
    setIsFetchingGPS(false);
    setLatitude(addr.latitude);
    setLongitude(addr.longitude);

    setSiteName(addr.siteName || '');
    setHouseFlatNo(addr.houseFlatNo || '');
    setAddressLine1(addr.addressLine1 || '');
    setAddressLine2(addr.addressLine2 || '');
    setAreaLocality(addr.areaLocality || '');
    setLandmark(addr.landmark || '');
    setCity(addr.city || 'Hyderabad');
    setState(addr.state || 'Telangana');
    setPincode(addr.pincode || '');
    setAddressType(addr.addressType || 'WORK');
    setHasHeavyVehicle(addr.hasHeavyVehicleAccess !== false);
    setIsDefault(!!addr.isDefault);

    // Detect if ordering for someone else based on existing recipient
    const user = authStore.getUser();
    const isDifferent =
      (addr.recipientName && user?.fullName && addr.recipientName.trim().toLowerCase() !== user.fullName.trim().toLowerCase()) ||
      (addr.phone && user?.phone && addr.phone.trim() !== user.phone.trim());

    setIsOrderingForSomeoneElse(Boolean(isDifferent));
    setRecipientName(addr.recipientName || user?.fullName || '');
    setPhone(addr.phone || user?.phone || '');

    setIsFormModalVisible(true);
  };

  // ── "USE CURRENT LOCATION" GPS TOGGLE HANDLER ──
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
      setLatitude(lat);
      setLongitude(lng);

      // Call backend reverse geocode live API (POST /api/location/reverse-geocode)
      const geo = await locationApi.reverseGeocode(lat, lng);
      if (geo) {
        if (geo.addressLine1) setAddressLine1(geo.addressLine1);
        if (geo.area) {
          setAreaLocality(geo.area);
          if (!addressLine2) setAddressLine2(geo.area);
        }
        if (geo.city) setCity(geo.city);
        if (geo.state) setState(geo.state);
        if (geo.pincode) setPincode(geo.pincode);
        if (geo.formattedAddress && !addressLine1) {
          setAddressLine1(geo.formattedAddress);
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

  const handleSaveAddress = async () => {
    if (!addressLine1.trim() || !city.trim() || !pincode.trim()) {
      Alert.alert('Required Fields', 'Please fill in Full Street Address, City, and PIN Code.');
      return;
    }

    if (!/^[1-9][0-9]{5}$/.test(pincode.trim())) {
      Alert.alert('Invalid PIN Code', 'Please enter a valid 6-digit Indian PIN code (e.g. 500032).');
      return;
    }

    const user = authStore.getUser();
    let finalRecipient = recipientName.trim() || user?.fullName || (user as any)?.name || 'Customer';
    let finalPhone = phone.trim() || user?.phone || (user as any)?.phoneNumber || '';

    if (!finalRecipient || !finalPhone) {
      Alert.alert(
        'Customer Details Required',
        'Please enter your full name and contact phone number for delivery dispatch.'
      );
      return;
    }

    const derivedSiteName = houseFlatNo.trim()
      ? `${houseFlatNo.trim()}, ${addressLine1.trim()}`
      : addressLine1.trim() || finalRecipient;

    const payload = {
      siteName: derivedSiteName,
      recipientName: finalRecipient,
      phone: finalPhone,
      houseFlatNo: houseFlatNo.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim() || areaLocality.trim(),
      areaLocality: areaLocality.trim() || addressLine2.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      country: 'India',
      landmark: landmark.trim(),
      latitude,
      longitude,
      addressType,
      hasHeavyVehicleAccess: true,
      isDefault,
    };

    setIsSubmitting(true);
    try {
      if (isEditing && editingAddressId) {
        const updated = await addressesApi.updateAddress(editingAddressId, payload);
        setAddresses((prev) =>
          prev.map((a) => (a.addressId === editingAddressId ? { ...a, ...updated } : a))
        );
      } else {
        const created = await addressesApi.createAddress(payload);
        if (isDefault) {
          setAddresses((prev) => [created, ...prev.map((a) => ({ ...a, isDefault: false }))]);
        } else {
          setAddresses((prev) => [created, ...prev]);
        }
      }
      setIsFormModalVisible(false);
      await loadAddresses(false);
    } catch (err: any) {
      Alert.alert(
        'Save Failed',
        err?.response?.data?.message || err?.message || 'Unable to save address to backend. Please check details.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (addressId: number) => {
    setActionLoadingId(addressId);
    try {
      await addressesApi.setDefaultAddress(addressId);
      setAddresses((prev) =>
        prev.map((addr) => ({
          ...addr,
          isDefault: addr.addressId === addressId,
        }))
      );
    } catch (err: any) {
      Alert.alert('Notice', err?.response?.data?.message || err?.message || 'Could not update default address.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = (addr: CustomerAddress) => {
    Alert.alert(
      'Delete Address',
      `Are you sure you want to remove "${addr.siteName || addr.recipientName || 'this address'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(addr.addressId);
            try {
              await addressesApi.deleteAddress(addr.addressId);
              setAddresses((prev) => prev.filter((a) => a.addressId !== addr.addressId));
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to delete address.');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const mapInitialSite = useMemo<DeliverySite | undefined>(() => {
    if (latitude && longitude) {
      return {
        id: editingAddressId ? `addr_${editingAddressId}` : 'current_pin',
        name: siteName || recipientName || 'Selected Location',
        address:
          [houseFlatNo, addressLine1, addressLine2, areaLocality, city]
            .filter(Boolean)
            .join(', ') || addressLine1 || '',
        city: city || 'Hyderabad',
        country: 'India',
        type: 'project',
        pincode: pincode,
        latitude,
        longitude,
      };
    }
    const def =
      addresses.find((a) => a.isDefault && a.latitude && a.longitude) ||
      addresses.find((a) => a.latitude && a.longitude);
    if (def) {
      return customerAddressToDeliverySite(def);
    }
    return undefined;
  }, [
    latitude,
    longitude,
    editingAddressId,
    siteName,
    recipientName,
    houseFlatNo,
    addressLine1,
    addressLine2,
    areaLocality,
    city,
    pincode,
    addresses,
  ]);

  const handleAddressSelectedFromMap = async (site: DeliverySite, saved?: CustomerAddress | null) => {
    setIsMapModalVisible(false);
    if (saved) {
      await loadAddresses(false);
    } else {
      // Pre-fill form from picked site
      setAddressLine1(site.address || '');
      setCity(site.city || 'Hyderabad');
      setLatitude(site.latitude);
      setLongitude(site.longitude);
      setIsUsingCurrentLocation(true);
      setIsFormModalVisible(true);
    }
  };

  const renderAddressCard = ({ item }: { item: CustomerAddress }) => {
    const isActionBusy = actionLoadingId === item.addressId;
    const fullStreet = [
      item.houseFlatNo,
      item.addressLine1,
      item.addressLine2,
      item.areaLocality,
    ]
      .filter(Boolean)
      .join(', ');

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: item.isDefault
              ? '#E31E24'
              : isDark
              ? 'rgba(255, 255, 255, 0.08)'
              : '#E2E8F0',
          },
        ]}
      >
        {/* Left Accent Bar for Default Address (Consistent with My Account cards) */}
        {item.isDefault && <View style={styles.cardAccentBar} />}

        {/* Top Header: Badges & Address Title */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleCol}>
            <View style={styles.titleRow}>
              <View
                style={[
                  styles.typeBadge,
                  {
                    backgroundColor:
                      item.addressType === 'WORK'
                        ? isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF'
                        : item.addressType === 'HOME'
                        ? isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5'
                        : isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB',
                  },
                ]}
              >
                <Ionicons
                  name={
                    item.addressType === 'WORK'
                      ? 'business'
                      : item.addressType === 'HOME'
                      ? 'home'
                      : 'location'
                  }
                  size={11}
                  color={
                    item.addressType === 'WORK'
                      ? '#2563EB'
                      : item.addressType === 'HOME'
                      ? '#059669'
                      : '#D97706'
                  }
                />
                <Text
                  style={[
                    styles.typeBadgeText,
                    {
                      color:
                        item.addressType === 'WORK'
                          ? '#2563EB'
                          : item.addressType === 'HOME'
                          ? '#059669'
                          : '#D97706',
                    },
                  ]}
                >
                  {item.addressType || 'WORK'}
                </Text>
              </View>

              {item.isDefault && (
                <View
                  style={[
                    styles.defaultBadge,
                    {
                      backgroundColor: isDark
                        ? 'rgba(227, 30, 36, 0.15)'
                        : '#FEF2F2',
                    },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={11} color="#E31E24" />
                  <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                </View>
              )}
            </View>

            <Text
              style={[styles.siteNameText, { color: theme.colors.textPrimary }]}
              numberOfLines={2}
            >
              {item.recipientName || item.siteName || 'Delivery Address'}
            </Text>
          </View>

          {/* Quick Edit and Delete Icons */}
          <View style={styles.cardActionIcons}>
            <TouchableOpacity
              onPress={() => handleOpenEdit(item)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={[
                styles.iconBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' },
              ]}
              accessibilityLabel="Edit Address"
            >
              <Ionicons name="pencil-outline" size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDelete(item)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              disabled={isActionBusy}
              style={[
                styles.iconBtn,
                { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' },
              ]}
              accessibilityLabel="Delete Address"
            >
              <Ionicons name="trash-outline" size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Address Body */}
        <View style={styles.addressBody}>
          <Text style={[styles.addressText, { color: theme.colors.textSecondary }]}>
            {fullStreet || item.addressLine1}
          </Text>
          <Text style={[styles.cityStateText, { color: theme.colors.textTertiary }]}>
            {item.city}, {item.state} — {item.pincode}
          </Text>

          {Boolean(item.landmark) && (
            <View style={styles.landmarkRow}>
              <Ionicons name="flag-outline" size={12} color="#D97706" />
              <Text
                style={[styles.landmarkText, { color: theme.colors.textTertiary }]}
                numberOfLines={2}
              >
                Landmark: {item.landmark}
              </Text>
            </View>
          )}

          {Boolean(item.phone) && (
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.phoneText, { color: theme.colors.textPrimary }]}>
                {item.recipientName ? `${item.recipientName} • ` : ''}
                {item.phone}
              </Text>
            </View>
          )}

          {/* Features Pills Row */}
          <View style={styles.featuresRow}>
            {item.hasHeavyVehicleAccess && (
              <View
                style={[
                  styles.featurePill,
                  { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5' },
                ]}
              >
                <MaterialCommunityIcons
                  name="truck-delivery-outline"
                  size={12}
                  color="#059669"
                />
                <Text style={styles.featurePillText}>Heavy Vehicle Access</Text>
              </View>
            )}

            {item.latitude !== undefined && item.longitude !== undefined && (
              <View
                style={[
                  styles.coordsPill,
                  { backgroundColor: isDark ? 'rgba(100, 116, 139, 0.15)' : '#F1F5F9' },
                ]}
              >
                <Ionicons name="navigate-outline" size={11} color="#64748B" />
                <Text style={styles.coordsPillText}>
                  {item.latitude.toFixed(4)}°, {item.longitude.toFixed(4)}°
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Card Actions: Set Default */}
        {!item.isDefault && (
          <View
            style={[
              styles.cardFooter,
              { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' },
            ]}
          >
            <TouchableOpacity
              onPress={() => handleSetDefault(item.addressId)}
              disabled={isActionBusy}
              activeOpacity={0.7}
              style={styles.setDefaultBtn}
            >
              {isActionBusy ? (
                <ActivityIndicator size="small" color="#E31E24" />
              ) : (
                <>
                  <Ionicons name="radio-button-off" size={15} color="#E31E24" />
                  <Text style={styles.setDefaultBtnText}>
                    Set as Default Delivery Address
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDark ? '#B71C1C' : '#E31E24'}
        translucent
      />

      {/* Top Header Bar matching My Account / Screen Header */}
      <Header
        title="Saved Addresses"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {/* Top Action Bar: "+ Add New Delivery Address" */}
      <View style={styles.topActionBar}>
        <TouchableOpacity
          onPress={handleOpenAdd}
          activeOpacity={0.88}
          style={styles.topAddBtn}
        >
          <Text style={styles.topAddBtnText}>+ Add New Delivery Address</Text>
        </TouchableOpacity>

        {/* Interactive Map Shortcut Link */}
        <TouchableOpacity
          onPress={() => setIsMapModalVisible(true)}
          activeOpacity={0.7}
          style={styles.mapShortcutRow}
        >
          <Ionicons name="map-outline" size={15} color="#E31E24" />
          <Text style={styles.mapShortcutText}>Pin Location on Interactive Map</Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E31E24" />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading saved addresses...
          </Text>
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: isDark ? 'rgba(227,30,36,0.15)' : '#FEE2E2' },
            ]}
          >
            <Ionicons name="location-outline" size={48} color="#E31E24" />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
            No Saved Addresses
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Add your delivery address for instant logistics dispatch and checkout.
          </Text>
          <TouchableOpacity
            onPress={handleOpenAdd}
            activeOpacity={0.85}
            style={styles.emptyCtaBtn}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.emptyCtaText}>Add First Delivery Address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => String(item.addressId)}
          renderItem={renderAddressCard}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#E31E24"
              colors={['#E31E24']}
            />
          }
        />
      )}

      {/* ── LIVE INTERACTIVE MAP PICKER MODAL ── */}
      <LocationPickerModal
        visible={isMapModalVisible}
        onClose={() => setIsMapModalVisible(false)}
        selectedSite={mapInitialSite}
        onSelectSite={handleAddressSelectedFromMap}
      />

      {/* ── ADD / EDIT SITE ADDRESS BOTTOM SHEET MODAL (Matching User Screenshot + Swiggy/Zomato Flow) ── */}
      <Modal
        visible={isFormModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFormModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => Keyboard.dismiss()}
            style={styles.modalBackdropTouch}
          />

          <View
            style={[
              styles.formModalSheet,
              { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.formModalHeader}>
              <Text
                style={[
                  styles.formModalTitle,
                  { color: isDark ? '#F8FAFC' : '#0F172A' },
                ]}
              >
                {isEditing ? 'Edit Delivery Address' : 'Add New Delivery Address'}
              </Text>
              <TouchableOpacity
                onPress={() => setIsFormModalVisible(false)}
                activeOpacity={0.7}
                style={styles.sheetCloseBtn}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* ── 1. "USE CURRENT LOCATION" GPS TOGGLE CARD ── */}
              <View
                style={[
                  styles.gpsCard,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#FEF2F2',
                    borderColor: isDark ? '#334155' : '#FECACA',
                  },
                ]}
              >
                <View style={styles.gpsCardLeft}>
                  <View style={styles.gpsIconCircle}>
                    <Ionicons name="navigate-circle" size={24} color="#E31E24" />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      style={[
                        styles.gpsTitle,
                        { color: isDark ? '#F8FAFC' : '#0F172A' },
                      ]}
                    >
                      Use Current Location
                    </Text>
                    <Text
                      style={[
                        styles.gpsSubtitle,
                        { color: isDark ? '#94A3B8' : '#64748B' },
                      ]}
                    >
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

              {/* Coordinates & Map Adjust Pill */}
              {latitude !== undefined && longitude !== undefined && (
                <View style={styles.coordsAdjustRow}>
                  <View style={styles.coordsChip}>
                    <Ionicons name="location" size={13} color="#E31E24" />
                    <Text style={styles.coordsChipText}>
                      GPS: {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setIsFormModalVisible(false);
                      setIsMapModalVisible(true);
                    }}
                    style={styles.adjustOnMapBtn}
                  >
                    <Text style={styles.adjustOnMapText}>Adjust on Map ›</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── 2. HOUSE / FLAT / GATE NO ── */}
              <Text style={[styles.fieldLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>
                House / Flat / Gate No.
              </Text>
              <TextInput
                value={houseFlatNo}
                onChangeText={setHouseFlatNo}
                placeholder="e.g. Plot 102, Gate 4"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                style={[
                  styles.fieldInput,
                  {
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  },
                ]}
              />

              {/* ── 4. FULL STREET ADDRESS ── */}
              <Text style={[styles.fieldLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>
                Full Street Address *
              </Text>
              <TextInput
                value={addressLine1}
                onChangeText={setAddressLine1}
                placeholder="e.g. Plot 102, Phase 4, Financial District"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                style={[
                  styles.fieldInput,
                  {
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  },
                ]}
              />

              {/* ── 5. AREA / LOCALITY ── */}
              <Text style={[styles.fieldLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>
                Area / Locality
              </Text>
              <TextInput
                value={areaLocality}
                onChangeText={setAreaLocality}
                placeholder="e.g. Financial District, Gachibowli"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                style={[
                  styles.fieldInput,
                  {
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  },
                ]}
              />

              {/* ── 6. LANDMARK ── */}
              <Text style={[styles.fieldLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>
                Landmark (Optional)
              </Text>
              <TextInput
                value={landmark}
                onChangeText={setLandmark}
                placeholder="e.g. Opposite Peddamma Temple, Near Metro Pillar 12"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                style={[
                  styles.fieldInput,
                  {
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  },
                ]}
              />

              {/* ── 7. CITY / REGION & PIN CODE ── */}
              <View style={styles.inputRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.fieldLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>
                    City / Region *
                  </Text>
                  <TextInput
                    value={city}
                    onChangeText={setCity}
                    placeholder="e.g. Hyderabad, Telangana"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    style={[
                      styles.fieldInput,
                      {
                        color: isDark ? '#F8FAFC' : '#0F172A',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      },
                    ]}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>
                    Pin Code / Postal Code *
                  </Text>
                  <TextInput
                    value={pincode}
                    onChangeText={setPincode}
                    placeholder="e.g. 500032"
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    style={[
                      styles.fieldInput,
                      {
                        color: isDark ? '#F8FAFC' : '#0F172A',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      },
                    ]}
                  />
                </View>
              </View>

              {/* ── 8. CUSTOMER & CONTACT DETAILS (AUTO-FETCHED) ── */}
              <View style={{ marginBottom: 14 }}>
                <Text
                  style={[
                    styles.fieldLabel,
                    { color: isDark ? '#94A3B8' : '#475569', marginTop: 8 },
                  ]}
                >
                  Customer / Receiver Name *
                </Text>
                <TextInput
                  value={recipientName}
                  onChangeText={setRecipientName}
                  placeholder="e.g. Ramesh Kumar"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  style={[
                    styles.fieldInput,
                    {
                      color: isDark ? '#F8FAFC' : '#0F172A',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.fieldLabel,
                    { color: isDark ? '#94A3B8' : '#475569', marginTop: 8 },
                  ]}
                >
                  Contact Phone Number *
                </Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="e.g. 9876543210"
                  keyboardType="phone-pad"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  style={[
                    styles.fieldInput,
                    {
                      color: isDark ? '#F8FAFC' : '#0F172A',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    },
                  ]}
                />

                <View style={styles.smsNoteRow}>
                  <Ionicons name="shield-checkmark" size={13} color="#10B981" />
                  <Text style={styles.smsNoteText}>
                    Auto-fetched from account. Order status & delivery updates will be sent here.
                  </Text>
                </View>
              </View>

              {/* ── 9. SAVE ADDRESS AS (TYPE SELECTOR) ── */}
              <Text
                style={[
                  styles.fieldLabel,
                  { color: isDark ? '#94A3B8' : '#475569', marginTop: 12 },
                ]}
              >
                Save Address As
              </Text>
              <View style={styles.typeSelectorRow}>
                {[
                  { key: 'WORK', label: '🏢 Work' },
                  { key: 'HOME', label: '🏠 Home' },
                  { key: 'OTHER', label: '📍 Other' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => setAddressType(item.key as AddressType)}
                    style={[
                      styles.typeChip,
                      addressType === item.key
                        ? styles.typeChipActive
                        : {
                            backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                            borderColor: isDark ? '#334155' : '#E2E8F0',
                          },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        addressType === item.key
                          ? styles.typeChipTextActive
                          : { color: isDark ? '#94A3B8' : '#64748B' },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>



              {/* ── 11. SET AS DEFAULT ADDRESS SWITCH ── */}
              <View
                style={[
                  styles.switchRow,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    marginTop: 8,
                  },
                ]}
              >
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text
                    style={[
                      styles.switchTitle,
                      { color: isDark ? '#F8FAFC' : '#0F172A' },
                    ]}
                  >
                    Set as Default Delivery Address
                  </Text>
                  <Text
                    style={[
                      styles.switchSubtitle,
                      { color: isDark ? '#94A3B8' : '#64748B' },
                    ]}
                  >
                    Use this address as primary destination for future orders
                  </Text>
                </View>
                <Switch
                  value={isDefault}
                  onValueChange={setIsDefault}
                  trackColor={{ false: '#CBD5E1', true: '#E31E24' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </ScrollView>

            {/* ── 12. BOTTOM BUTTONS (EXACTLY MATCHING USER SCREENSHOT) ── */}
            <View
              style={[
                styles.modalButtonsRow,
                { borderTopColor: isDark ? '#1E293B' : '#F1F5F9' },
              ]}
            >
              {/* Cancel Button */}
              <TouchableOpacity
                onPress={() => setIsFormModalVisible(false)}
                activeOpacity={0.8}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              {/* Save Address Button */}
              <TouchableOpacity
                onPress={handleSaveAddress}
                disabled={isSubmitting}
                activeOpacity={0.85}
                style={styles.saveBtn}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Address</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topActionBar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  topAddBtn: {
    backgroundColor: '#E31E24',
    borderRadius: 8,
    minHeight: 46,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#E31E24',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  topAddBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  mapShortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  mapShortcutText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 13,
    color: '#E31E24',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '500',
    fontSize: 13,
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E31E24',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 8,
    minHeight: 44,
  },
  emptyCtaText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  cardAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
    backgroundColor: '#E31E24',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.4,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 10,
    color: '#E31E24',
    letterSpacing: 0.4,
  },
  siteNameText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  cardActionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressBody: {
    gap: 3,
    marginTop: 2,
  },
  addressText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 18.5,
  },
  cityStateText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12.5,
    lineHeight: 17,
  },
  landmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  landmarkText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  phoneText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 12.5,
  },
  featuresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  featurePillText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 10.5,
    color: '#059669',
  },
  coordsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  coordsPillText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 10.5,
    color: '#64748B',
  },
  cardFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 0.5,
  },
  setDefaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  setDefaultBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 12,
    color: '#E31E24',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalBackdropTouch: {
    flex: 1,
  },
  formModalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 14,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  formModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 12,
  },
  formModalTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 16,
  },
  sheetCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  gpsCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  gpsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(227, 30, 36, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 13.5,
  },
  gpsSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11,
    marginTop: 1,
  },
  coordsAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  coordsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coordsChipText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '500',
    fontSize: 11,
    color: '#E31E24',
  },
  adjustOnMapBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  adjustOnMapText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 11.5,
    color: '#E31E24',
  },
  fieldLabel: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 12,
    marginBottom: 5,
    marginTop: 8,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 13.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  someoneElseCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  someoneElseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  someoneElseIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(227, 30, 36, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  someoneElseTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 13.5,
  },
  someoneElseSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11,
    marginTop: 1,
  },
  someoneElseExpandable: {
    marginTop: 6,
  },
  smsNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  smsNoteText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '500',
    fontSize: 11,
    color: '#059669',
    flex: 1,
  },
  defaultUserPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  defaultUserPreviewText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11.5,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
  },
  typeChipActive: {
    backgroundColor: '#E31E24',
    borderColor: '#E31E24',
  },
  typeChipText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 12,
  },
  typeChipTextActive: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  switchTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 13,
  },
  switchSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11,
    marginTop: 1,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E31E24',
    borderRadius: 8,
    paddingVertical: 11,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cancelBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 13.5,
    color: '#E31E24',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#E31E24',
    borderRadius: 8,
    paddingVertical: 11,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
});
