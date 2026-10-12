/**
 * HINCH MART — Premium Live Product Barcode & QR Scanner Modal
 * Powered by expo-camera (CameraView) with live camera feed, torch/flashlight control,
 * animated laser scan-line, HUD viewfinder frame, barcode/SKU detection, preset test codes,
 * and direct Add to Cart / Product Detail navigation.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, BarcodeScanningResult, scanFromURLAsync } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../theme';
import { useLiveProducts } from '../../hooks/useLiveProducts';
import { searchApi } from '../../services/api/search.api';
import { ApiProduct } from '../../types/product.types';
import { useAppDispatch } from '../../redux/hooks';
import { addItem, setServerCart } from '../../redux/slices/cartSlice';
import { cartApi } from '../../services/api/cart.api';
import { cartManager } from '../../services/cart/cartManager';
import { formatPrice } from '../../utils';
import { authStore } from '../../store/authStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_FRAME_SIZE = Math.min(SCREEN_WIDTH * 0.72, 280);

export interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

// Preset Barcodes for instant testing & demonstration
const PRESET_BARCODES: Array<{ label: string; code: string; keyword: string }> = [];

export function BarcodeScannerModal({
  visible,
  onClose,
  navigation,
}: BarcodeScannerModalProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const { products: liveProducts } = useLiveProducts();

  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<ApiProduct | null>(null);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Animated laser scan line and HUD pulse
  const laserAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.75)).current;
  const successFlashAnim = useRef(new Animated.Value(0)).current;

  // Request camera permission on modal open if not granted
  useEffect(() => {
    if (visible) {
      setIsScanning(true);
      setScannedProduct(null);
      setAddedSuccess(false);
      setTorchOn(false);
      successFlashAnim.setValue(0);

      if (!permission?.granted) {
        requestPermission();
      }
    } else {
      setTorchOn(false);
    }
  }, [visible]);

  // Realistic Scanner Animations
  useEffect(() => {
    if (visible && isScanning) {
      // Laser scan loop
      const laserLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ])
      );

      // HUD corner pulse loop
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.65,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );

      laserLoop.start();
      pulseLoop.start();

      return () => {
        laserLoop.stop();
        pulseLoop.stop();
      };
    }
  }, [visible, isScanning]);

  const handleBarcodeScanned = async (scanningResult: BarcodeScanningResult) => {
    if (!isScanning || scannedProduct) return;
    const rawCode = scanningResult?.data?.trim();
    if (!rawCode) return;

    setIsScanning(false);

    // Trigger green flash feedback
    Animated.sequence([
      Animated.timing(successFlashAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(successFlashAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    await resolveProductFromCode(rawCode);
  };

  const resolveProductFromCode = async (code: string) => {
    setIsSearching(true);
    const cleanCode = code.trim().toLowerCase();

    // 1. Check local catalog products
    let match = liveProducts.find((p) => {
      const sku = String((p as any).sku || '').toLowerCase();
      const id = String(p.id || p.productId || '').toLowerCase();
      const title = String(p.title || p.name || '').toLowerCase();
      const barcode = String((p as any).barcode || '').toLowerCase();
      return (
        barcode === cleanCode ||
        sku === cleanCode ||
        id === cleanCode ||
        title.includes(cleanCode)
      );
    });

    // 2. If not found in local state, query the live search API
    if (!match) {
      try {
        const searchResults = await searchApi.searchProducts(code.trim());
        if (searchResults && searchResults.length > 0) {
          match = searchResults[0];
        }
      } catch (err) {
        console.warn('[BarcodeScanner] Live search error:', err);
      }
    }

    // 3. If no match found in live catalog or search
    if (!match) {
      setIsSearching(false);
      Alert.alert('Product Not Found', `No product found for barcode / SKU "${code}".`, [
        { text: 'Scan Again', onPress: () => setIsScanning(true) },
      ]);
      return;
    }

    setScannedProduct(match);
    setIsSearching(false);
  };

  const handlePickFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow photo gallery access to scan QR or barcodes from your photos.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedUri = result.assets[0].uri;
      setIsSearching(true);
      setIsScanning(false);

      try {
        const scannedCodes = await scanFromURLAsync(selectedUri, [
          'qr',
          'ean13',
          'ean8',
          'code128',
          'code39',
          'upc_a',
          'upc_e',
          'datamatrix',
          'pdf417',
          'aztec',
        ]);

        if (scannedCodes && scannedCodes.length > 0 && scannedCodes[0]?.data) {
          const decodedData = scannedCodes[0].data;
          await resolveProductFromCode(decodedData);
        } else {
          setIsSearching(false);
          setIsScanning(true);
          Alert.alert(
            'No Code Detected',
            'Could not find a valid QR code or barcode in the selected photo. Please ensure the code is clear and visible.',
            [{ text: 'OK' }]
          );
        }
      } catch (scanErr) {
        setIsSearching(false);
        setIsScanning(true);
        Alert.alert(
          'Scanning Issue',
          'Unable to read code from this photo. Please try another image or enter the code manually.'
        );
      }
    } catch (err) {
      setIsSearching(false);
      setIsScanning(true);
      Alert.alert('Error', 'Unable to open gallery.');
    }
  };

  const handleScanMatch = async (keyword: string, code: string) => {
    setIsScanning(false);
    await resolveProductFromCode(keyword || code);
  };

  const handleManualSearch = () => {
    if (!manualCode.trim()) return;
    setIsScanning(false);
    resolveProductFromCode(manualCode.trim());
    setManualCode('');
  };

  const handleViewProduct = () => {
    if (!scannedProduct) return;
    const p = scannedProduct;
    setTorchOn(false);
    onClose();
    setScannedProduct(null);
    setIsScanning(true);
    navigation.navigate('ProductDetail', {
      productId: String(p.id || p.productId),
      product: p,
    });
  };

  const handleAddToCart = async () => {
    if (!scannedProduct) return;
    const p = scannedProduct;
    const itemPrice = Number(p.price || 0);

    const res = await cartManager.addToCart(dispatch, {
      product: p,
      quantity: 1,
      price: itemPrice,
    });

    if (res?.success) {
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2000);
    }
  };

  const handleResetScan = () => {
    setScannedProduct(null);
    setIsScanning(true);
    setAddedSuccess(false);
  };

  const handleModalClose = () => {
    setTorchOn(false);
    onClose();
  };

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_FRAME_SIZE - 4],
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleModalClose}
    >
      <View style={styles.modalBackdrop}>
        {/* Live Camera View Layer */}
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torchOn}
            barcodeScannerSettings={{
              barcodeTypes: [
                'qr',
                'ean13',
                'ean8',
                'code128',
                'code39',
                'upc_a',
                'upc_e',
                'datamatrix',
                'pdf417',
                'aztec',
              ],
            }}
            onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.cameraFallbackBg]} />
        )}

        {/* Realistic 4-Panel Camera Dark Vignette Overlay */}
        {permission?.granted && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Top dark shade */}
            <View style={styles.maskTop} />
            <View style={styles.maskCenterRow}>
              {/* Left dark shade */}
              <View style={styles.maskSide} />
              {/* Clear center transparent window */}
              <View style={styles.maskClearWindow} />
              {/* Right dark shade */}
              <View style={styles.maskSide} />
            </View>
            {/* Bottom dark shade */}
            <View style={styles.maskBottom} />
          </View>
        )}

        {/* Top Header */}
        <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 24) }]}>
          <TouchableOpacity
            onPress={handleModalClose}
            style={styles.headerBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Scan Barcode / QR</Text>
            <View style={styles.liveIndicatorBadge}>
              <View style={styles.liveGreenDot} />
              <Text style={styles.liveText}>READY</Text>
            </View>
          </View>

          <View style={styles.headerActionsRow}>
            <TouchableOpacity
              onPress={handlePickFromGallery}
              style={styles.headerBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="images-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTorchOn((prev) => !prev)}
              style={[styles.headerBtn, torchOn && styles.headerBtnActive]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={torchOn ? 'flash' : 'flash-outline'}
                size={20}
                color={torchOn ? '#0F172A' : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Viewfinder HUD Area */}
        <View style={styles.viewFinderContainer}>
          {!permission?.granted ? (
            /* Permission Request Card */
            <View style={styles.permissionCard}>
              <View style={styles.permissionIconCircle}>
                <Ionicons name="camera-outline" size={32} color="#FDB913" />
              </View>
              <Text style={styles.permissionTitle}>Camera Permission Required</Text>
              <Text style={styles.permissionText}>
                Allow camera access to scan product barcodes and QR codes in real time.
              </Text>
              <TouchableOpacity
                onPress={requestPermission}
                style={styles.grantPermissionBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.grantPermissionBtnText}>Enable Camera</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Target Scan Frame */
            <View style={styles.viewFinderCenterWrap}>
              {/* Mode Selector Pill */}
              <View style={styles.modeBadge}>
                <Ionicons name="qr-code-outline" size={13} color="#FDB913" style={{ marginRight: 5 }} />
                <Text style={styles.modeBadgeText}>AUTO QR & BARCODE DETECT</Text>
              </View>

              <View style={styles.targetFrame}>
                {/* Subtle Optical Grid Pattern */}
                <View style={styles.gridOverlay}>
                  <View style={styles.gridLineH} />
                  <View style={styles.gridLineV} />
                </View>

                {/* Realistic Corner HUD Brackets with Pulse Effect */}
                <Animated.View style={[styles.cornerBracket, styles.topLeft, { opacity: pulseAnim }]} />
                <Animated.View style={[styles.cornerBracket, styles.topRight, { opacity: pulseAnim }]} />
                <Animated.View style={[styles.cornerBracket, styles.bottomLeft, { opacity: pulseAnim }]} />
                <Animated.View style={[styles.cornerBracket, styles.bottomRight, { opacity: pulseAnim }]} />

                {/* 4 Optical Corner Dots */}
                <View style={[styles.cornerDot, { top: 7, left: 7 }]} />
                <View style={[styles.cornerDot, { top: 7, right: 7 }]} />
                <View style={[styles.cornerDot, { bottom: 7, left: 7 }]} />
                <View style={[styles.cornerDot, { bottom: 7, right: 7 }]} />

                {/* Realistic QR Anchor Marks (3 Corner Positioning Squares) */}
                <View style={[styles.qrAnchorBox, { top: 22, left: 22 }]}>
                  <View style={styles.qrAnchorInner} />
                </View>
                <View style={[styles.qrAnchorBox, { top: 22, right: 22 }]}>
                  <View style={styles.qrAnchorInner} />
                </View>
                <View style={[styles.qrAnchorBox, { bottom: 22, left: 22 }]}>
                  <View style={styles.qrAnchorInner} />
                </View>

                {/* Precision Center Lens Reticle */}
                <View style={styles.reticleContainer}>
                  <View style={styles.reticleCircle} />
                  <View style={styles.reticleCrossH} />
                  <View style={styles.reticleCrossV} />
                  <View style={styles.reticleCenterDot} />
                </View>

                {/* Holographic Glowing Laser Wave */}
                {isScanning && !isSearching && (
                  <Animated.View
                    style={[
                      styles.laserWaveContainer,
                      {
                        transform: [{ translateY: laserTranslateY }],
                      },
                    ]}
                  >
                    {/* Laser Light Beam Wave */}
                    <LinearGradient
                      colors={[
                        'rgba(253, 185, 19, 0)',
                        'rgba(253, 185, 19, 0.15)',
                        'rgba(253, 185, 19, 0.85)',
                        '#FFFFFF',
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.laserBeamGradient}
                    />
                    {/* Bright Core Laser Bar */}
                    <View style={styles.laserCoreLine}>
                      <LinearGradient
                        colors={['rgba(253, 185, 19, 0)', '#FDB913', '#FFFFFF', '#FDB913', 'rgba(253, 185, 19, 0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                      />
                    </View>
                  </Animated.View>
                )}

                {/* Success Neon Flash Border Overlay */}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.successFlashBorder,
                    {
                      opacity: successFlashAnim,
                    },
                  ]}
                />

                {/* Searching / Resolving Code Spinner */}
                {isSearching && (
                  <View style={styles.searchingOverlay}>
                    <ActivityIndicator size="large" color="#FDB913" />
                    <Text style={styles.searchingText}>Decoding Product...</Text>
                  </View>
                )}
              </View>

              {/* Realistic Instruction Glass Pill */}
              <View style={styles.instructionPill}>
                <Ionicons
                  name={torchOn ? 'flash' : 'scan-outline'}
                  size={15}
                  color={torchOn ? '#FDB913' : '#38BDF8'}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.instructionText}>
                  {torchOn ? 'Flashlight Active • Align code in frame' : 'Align QR or Barcode inside the frame'}
                </Text>
              </View>

              {/* Upload from Gallery Action Button */}
              <TouchableOpacity
                onPress={handlePickFromGallery}
                style={styles.galleryActionBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="images-outline" size={16} color="#FDB913" style={{ marginRight: 8 }} />
                <Text style={styles.galleryActionBtnText}>Upload from Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bottom Control / Result Sheet */}
        <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {scannedProduct ? (
            /* ── Scanned Product Result Card ── */
            <View style={styles.resultCard}>
              <View style={styles.resultHeaderRow}>
                <View style={styles.successBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.successBadgeText}>Product Identified</Text>
                </View>
                <TouchableOpacity onPress={handleResetScan} style={styles.scanAgainBtn}>
                  <Ionicons name="refresh" size={14} color="#94A3B8" />
                  <Text style={styles.scanAgainText}>Scan Again</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.productRow}>
                <Image
                  source={{
                    uri:
                      (Array.isArray((scannedProduct as any)?.images) &&
                      (scannedProduct as any).images.length > 0
                        ? typeof (scannedProduct as any).images[0] === 'string'
                          ? (scannedProduct as any).images[0]
                          : (scannedProduct as any).images[0]?.url
                        : null) ||
                      (scannedProduct as any)?.image ||
                      (scannedProduct as any)?.imageUrl ||
                      '',
                  }}
                  style={styles.productThumbnail}
                  contentFit="cover"
                />
                <View style={styles.productMeta}>
                  <Text style={styles.productBrand} numberOfLines={1}>
                    {typeof scannedProduct.brand === 'string'
                      ? scannedProduct.brand
                      : 'HINCH DIRECT'}
                  </Text>
                  <Text style={styles.productName} numberOfLines={2}>
                    {scannedProduct.title || scannedProduct.name}
                  </Text>
                  <Text style={styles.productPrice}>
                    {formatPrice(
                      typeof scannedProduct.price === 'number' ? scannedProduct.price : 0
                    )}
                  </Text>
                </View>
              </View>

              {/* Actions Row */}
              <View style={styles.resultActions}>
                <TouchableOpacity
                  onPress={handleAddToCart}
                  style={[styles.addCartBtn, addedSuccess && styles.addCartBtnSuccess]}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={addedSuccess ? 'checkmark' : 'cart'}
                    size={17}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.addCartText}>
                    {addedSuccess ? 'Added to Cart!' : 'Add to Cart'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleViewProduct}
                  style={styles.viewDetailBtn}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#FDB913', '#F59E0B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.viewDetailGradient}
                  >
                    <Text style={styles.viewDetailText}>View Details</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={15}
                      color="#0F172A"
                      style={{ marginLeft: 4 }}
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ── Interactive Scan Presets & Manual Code Entry ── */
            <View>
              <Text style={styles.presetsTitle}>Quick Sample Product Barcodes</Text>
              <View style={styles.presetsRow}>
                {PRESET_BARCODES.map((preset) => (
                  <TouchableOpacity
                    key={preset.code}
                    onPress={() => handleScanMatch(preset.keyword, preset.code)}
                    style={styles.presetChip}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name="barcode-outline"
                      size={14}
                      color="#FDB913"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.presetChipText}>{preset.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Manual Barcode / SKU Input */}
              <View style={styles.manualInputRow}>
                <TextInput
                  value={manualCode}
                  onChangeText={setManualCode}
                  placeholder="Or enter barcode / SKU number..."
                  placeholderTextColor="#64748B"
                  style={styles.manualInput}
                  onSubmitEditing={handleManualSearch}
                  returnKeyType="search"
                />
                <TouchableOpacity
                  onPress={handleManualSearch}
                  style={styles.manualSubmitBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  cameraFallbackBg: {
    backgroundColor: '#0B132B',
  },
  /* ── 4-Panel Camera Dark Mask Vignette ── */
  maskTop: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 30, 0.62)',
  },
  maskCenterRow: {
    flexDirection: 'row',
    height: SCAN_FRAME_SIZE,
  },
  maskSide: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 30, 0.62)',
  },
  maskClearWindow: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE,
    backgroundColor: 'transparent',
  },
  maskBottom: {
    flex: 1.4,
    backgroundColor: 'rgba(10, 15, 30, 0.62)',
  },

  /* ── Top Header ── */
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    zIndex: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  headerBtnActive: {
    backgroundColor: '#FDB913',
    borderColor: '#FDB913',
    shadowColor: '#FDB913',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15.5,
    color: '#FFFFFF',
  },
  liveIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  liveGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#10B981',
    letterSpacing: 0.8,
  },

  /* ── Viewfinder Area ── */
  viewFinderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  viewFinderCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(253, 185, 19, 0.35)',
    marginBottom: 16,
  },
  modeBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10.5,
    color: '#FDB913',
    letterSpacing: 0.6,
  },
  targetFrame: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE,
    borderRadius: 22,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Optical Grid ── */
  gridOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLineH: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  gridLineV: {
    position: 'absolute',
    top: 20,
    bottom: 20,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  /* ── Corner Brackets ── */
  cornerBracket: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#FDB913',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 20,
  },
  cornerDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FDB913',
  },

  /* ── QR Positioning Anchors ── */
  qrAnchorBox: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: 'rgba(253, 185, 19, 0.45)',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrAnchorInner: {
    width: 10,
    height: 10,
    backgroundColor: 'rgba(253, 185, 19, 0.65)',
    borderRadius: 2,
  },

  /* ── Center Lens Reticle ── */
  reticleContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleCircle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderStyle: 'dashed',
  },
  reticleCrossH: {
    position: 'absolute',
    width: 20,
    height: 1.5,
    backgroundColor: 'rgba(253, 185, 19, 0.6)',
  },
  reticleCrossV: {
    position: 'absolute',
    height: 20,
    width: 1.5,
    backgroundColor: 'rgba(253, 185, 19, 0.6)',
  },
  reticleCenterDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FDB913',
  },

  /* ── Laser Holographic Wave ── */
  laserWaveContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    zIndex: 8,
  },
  laserBeamGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 45,
  },
  laserCoreLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    shadowColor: '#FDB913',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },

  /* ── Success Flash ── */
  successFlashBorder: {
    ...StyleSheet.absoluteFill,
    borderWidth: 3,
    borderColor: '#10B981',
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    zIndex: 10,
  },

  /* ── Instruction Pill ── */
  instructionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginTop: 18,
    maxWidth: 320,
  },
  instructionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: '#F8FAFC',
    textAlign: 'center',
  },

  /* ── Gallery Action Button ── */
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  galleryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(253, 185, 19, 0.15)',
    borderWidth: 1.2,
    borderColor: '#FDB913',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
    shadowColor: '#FDB913',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  galleryActionBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
    color: '#FDB913',
  },

  /* ── Search Spinner Overlay ── */
  searchingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 15,
  },
  searchingText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: '#FDB913',
  },

  /* ── Permission Request Card ── */
  permissionCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 22,
    padding: 26,
    alignItems: 'center',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  permissionIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(253, 185, 19, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15.5,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  grantPermissionBtn: {
    backgroundColor: '#FDB913',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  grantPermissionBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: '#0F172A',
  },

  /* ── Bottom Sheet ── */
  bottomSheet: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 20,
  },
  presetsTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: '#F8FAFC',
    marginBottom: 12,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(253, 185, 19, 0.12)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(253, 185, 19, 0.3)',
  },
  presetChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#FDB913',
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#334155',
  },
  manualInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: '#F8FAFC',
    paddingVertical: 0,
  },
  manualSubmitBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0038A8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Scanned Product Result Card ── */
  resultCard: {
    gap: 14,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  successBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: '#10B981',
  },
  scanAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  scanAgainText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#94A3B8',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  productThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#1E293B',
  },
  productMeta: {
    flex: 1,
    marginLeft: 14,
  },
  productBrand: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#FDB913',
    textTransform: 'uppercase',
  },
  productName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#F8FAFC',
    marginTop: 2,
  },
  productPrice: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: '#10B981',
    marginTop: 4,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
  },
  addCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    paddingVertical: 13,
    borderRadius: 14,
  },
  addCartBtnSuccess: {
    backgroundColor: '#059669',
  },
  addCartText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  viewDetailBtn: {
    flex: 1.2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  viewDetailGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  viewDetailText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13.5,
    color: '#0F172A',
  },
});
