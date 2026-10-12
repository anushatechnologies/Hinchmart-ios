/**
 * HINCH MART — Admin & Vendor Product Management Screen
 * Complete Live Backend Integration:
 * 1. Two-Step Image & Product Flow:
 *    - Step 1: Select & validate local image (max 15MB, JPG/PNG/WebP), held in frontend state
 *    - Step 2: Upload to S3 via POST /api/images/products (multipart/form-data: file)
 *    - Step 3: Create (POST /api/products) or Edit (PUT /api/products/{id}) with JSON payload
 * 2. Real-time Category & Subcategory selection from live backend
 * 3. Product Catalog listing, filtering, search, and delete with cache invalidation
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../theme';
import { Header } from '../../../components/layout/Screen';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { useAppSelector } from '../../../redux/hooks';
import { productsApi } from '../../../services/api/products.api';
import { categoriesApi } from '../../../services/api/categories.api';
import { subcategoriesApi } from '../../../services/api/subcategories.api';
import { invalidateProductCache, resolveProductImage } from '../../../hooks/useLiveProducts';
import { AdminListSkeleton } from '../../../components/feedback/SkeletonLoader';
import { formatPrice } from '../../../utils';
import {
  ApiProduct,
  ProductCreateRequest,
  ProductUpdateRequest,
} from '../../../types/product.types';
import { ApiCategory, ApiSubcategory } from '../../../types/category.types';

const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

interface SelectedImageFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export function ProductManagementScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { user } = useAppSelector((state) => state.auth);

  // Live state
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ApiSubcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubCatFilter, setSelectedSubCatFilter] = useState<string>('all');

  // Modal / Form state
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ApiProduct | null>(null);

  // Form Fields (Required by ProductRequest.java & API)
  const [formTitle, setFormTitle] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStockQty, setFormStockQty] = useState('');
  const [formUnit, setFormUnit] = useState('piece');
  const [formCategoryId, setFormCategoryId] = useState<number | undefined>(undefined);
  const [formSubcategoryId, setFormSubcategoryId] = useState<number | undefined>(undefined);

  // Optional Fields
  const [formDescription, setFormDescription] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formMrp, setFormMrp] = useState('');
  const [formMoq, setFormMoq] = useState('1');
  const [formActive, setFormActive] = useState(true);
  const [formIs24HourDelivery, setFormIs24HourDelivery] = useState(false);

  // Image State (Two-Step Flow)
  // Step 1: Selected file in frontend state
  const [selectedMainImage, setSelectedMainImage] = useState<SelectedImageFile | null>(null);
  const [selectedGalleryImages, setSelectedGalleryImages] = useState<SelectedImageFile[]>([]);
  // Existing URLs when editing
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [existingGalleryUrls, setExistingGalleryUrls] = useState<string[]>([]);
  // Uploaded S3 keys / tracking
  const [lastUploadedImageKey, setLastUploadedImageKey] = useState<string>('');

  // UI / Submission state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [formError, setFormError] = useState('');
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<ApiProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all live products and categories
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [prodRes, catRes, subRes] = await Promise.allSettled([
        productsApi.getProducts(),
        categoriesApi.getCategories(),
        subcategoriesApi.getSubcategories(),
      ]);

      if (prodRes.status === 'fulfilled') {
        setProducts(Array.isArray(prodRes.value) ? prodRes.value : []);
      }
      if (catRes.status === 'fulfilled') {
        setCategories(Array.isArray(catRes.value) ? catRes.value : []);
      }
      if (subRes.status === 'fulfilled') {
        setSubcategories(Array.isArray(subRes.value) ? subRes.value : []);
      }
    } catch (err: any) {
      console.warn('[ProductManagement] Fetch error:', err?.message || err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered subcategories based on selected category in form
  const availableSubcategories = useMemo(() => {
    if (!formCategoryId) return subcategories;
    return subcategories.filter((s) => Number(s.categoryId) === Number(formCategoryId));
  }, [subcategories, formCategoryId]);

  // Open Create Product Modal
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormTitle('');
    setFormPrice('');
    setFormStockQty('');
    setFormUnit('piece');
    const defaultCat = categories[0]?.categoryId || categories[0]?.id;
    const defaultSub = subcategories[0]?.subcategoryId || subcategories[0]?.id;
    setFormCategoryId(defaultCat ? Number(defaultCat) : 1);
    setFormSubcategoryId(defaultSub ? Number(defaultSub) : 1);
    setFormDescription('');
    setFormBrand('');
    setFormSku(`SKU-${Date.now().toString().slice(-6)}`);
    setFormMrp('');
    setFormMoq('1');
    setFormActive(true);
    setFormIs24HourDelivery(false);

    setSelectedMainImage(null);
    setSelectedGalleryImages([]);
    setExistingImageUrl('');
    setExistingGalleryUrls([]);
    setLastUploadedImageKey('');
    setFormError('');
    setUploadProgressText('');
    setFormModalVisible(true);
  };

  // Open Edit Product Modal
  const handleOpenEditModal = (item: ApiProduct) => {
    setEditingProduct(item);
    setFormTitle(item.title || item.name || '');
    setFormPrice(String(item.price ?? ''));
    setFormStockQty(String(item.stockQty ?? ''));
    setFormUnit(item.unit || 'piece');
    setFormCategoryId(item.categoryId ? Number(item.categoryId) : undefined);
    setFormSubcategoryId(item.subcategoryId ? Number(item.subcategoryId) : undefined);
    setFormDescription(item.description || '');
    setFormBrand(item.brand || '');
    setFormSku((item as any).sku || '');
    setFormMrp(item.mrp || item.comparePrice ? String(item.mrp || item.comparePrice) : '');
    setFormMoq(String(item.moq || 1));
    setFormActive(item.active !== false);
    setFormIs24HourDelivery(Boolean(item.is24HourDelivery));

    setSelectedMainImage(null);
    setSelectedGalleryImages([]);
    setExistingImageUrl(item.imageUrl || item.image || '');
    const gallery = item.images && Array.isArray(item.images)
      ? item.images.map((img: any) => (typeof img === 'string' ? img : img?.url)).filter(Boolean)
      : [];
    setExistingGalleryUrls(gallery);
    setLastUploadedImageKey('');
    setFormError('');
    setUploadProgressText('');
    setFormModalVisible(true);
  };

  // Step 1: Validate Selected Image
  const validateImageFile = (file: { uri: string; name?: string; type?: string; size?: number }): string | null => {
    if (file.size && file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return `Image size (${sizeMB} MB) exceeds maximum allowed size of 15 MB. Please select a smaller image.`;
    }

    const filename = file.name || file.uri.split('/').pop() || '';
    const ext = ('.' + filename.split('.').pop()).toLowerCase();
    const mimeType = file.type?.toLowerCase() || '';

    const hasValidExt = ALLOWED_EXTENSIONS.some((e) => ext.endsWith(e));
    const hasValidMime = ALLOWED_IMAGE_TYPES.some((t) => mimeType.includes(t));

    if (!hasValidExt && !hasValidMime && filename.includes('.')) {
      return 'Invalid image type. Please select a JPEG, PNG, or WebP image.';
    }

    return null;
  };

  // Image Picker Handler: Launch Gallery
  const handlePickMainImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permission is required to select product images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const filename = asset.fileName || asset.uri.split('/').pop() || `product_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || (filename.endsWith('.png') ? 'image/png' : filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
        const size = asset.fileSize;

        const validationErr = validateImageFile({ uri: asset.uri, name: filename, type: mimeType, size });
        if (validationErr) {
          setFormError(validationErr);
          Alert.alert('Image Validation Error', validationErr);
          return;
        }

        setSelectedMainImage({
          uri: asset.uri,
          name: filename,
          type: mimeType,
          size,
        });
        setFormError('');
      }
    } catch (err: any) {
      console.warn('[ImagePicker] Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image: ' + (err?.message || err));
    }
  };

  // Image Picker Handler: Camera
  const handleCaptureCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to capture product photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const filename = asset.fileName || `capture_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';
        const size = asset.fileSize;

        const validationErr = validateImageFile({ uri: asset.uri, name: filename, type: mimeType, size });
        if (validationErr) {
          setFormError(validationErr);
          Alert.alert('Image Validation Error', validationErr);
          return;
        }

        setSelectedMainImage({
          uri: asset.uri,
          name: filename,
          type: mimeType,
          size,
        });
        setFormError('');
      }
    } catch (err: any) {
      console.warn('[ImagePicker] Error capturing photo:', err);
      Alert.alert('Error', 'Failed to capture photo: ' + (err?.message || err));
    }
  };

  // Gallery Images Picker
  const handlePickGalleryImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.85,
        selectionLimit: 4,
      });

      if (!result.canceled && result.assets) {
        const validFiles: SelectedImageFile[] = [];
        for (const asset of result.assets) {
          const filename = asset.fileName || asset.uri.split('/').pop() || `gallery_${Date.now()}.jpg`;
          const mimeType = asset.mimeType || 'image/jpeg';
          const size = asset.fileSize;
          const err = validateImageFile({ uri: asset.uri, name: filename, type: mimeType, size });
          if (!err) {
            validFiles.push({ uri: asset.uri, name: filename, type: mimeType, size });
          }
        }
        setSelectedGalleryImages((prev) => [...prev, ...validFiles].slice(0, 4));
      }
    } catch (err: any) {
      console.warn('[GalleryPicker] Error:', err);
    }
  };

  // Step 2 & 3: Submit Product (Upload S3 first, then POST/PUT JSON)
  const handleSubmitProduct = async () => {
    // 1. Validation of Required Fields
    const trimmedTitle = formTitle.trim();
    if (!trimmedTitle) {
      setFormError('Product title is required.');
      return;
    }

    const parsedPrice = parseFloat(formPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setFormError('Please enter a valid price greater than 0.');
      return;
    }

    const parsedStock = parseInt(formStockQty, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      setFormError('Please enter a valid stock quantity (0 or more).');
      return;
    }

    if (!formUnit.trim()) {
      setFormError('Unit is required (e.g. piece, kg, box).');
      return;
    }

    if (!formSubcategoryId) {
      setFormError('Please select a subcategory.');
      return;
    }

    // Require an image for new products
    if (!editingProduct && !selectedMainImage && !existingImageUrl) {
      setFormError('Please select a main product image to upload to S3.');
      return;
    }

    setFormError('');
    setIsSavingProduct(true);

    try {
      let finalImageUrl = existingImageUrl;
      let finalImages: string[] = [...existingGalleryUrls];

      // ── Step 2: Upload Main Image to S3 (if new image selected) ──
      if (selectedMainImage) {
        setIsUploadingImage(true);
        setUploadProgressText('Uploading main image to S3 (POST /api/images/products)...');

        const uploadResult = await productsApi.uploadProductImage(selectedMainImage);
        finalImageUrl = uploadResult.imageUrl || uploadResult.fileUrl;
        setLastUploadedImageKey(uploadResult.imageKey || '');

        if (!finalImageUrl) {
          throw new Error('S3 Image Upload did not return a valid imageUrl.');
        }

        // Include in images array
        if (!finalImages.includes(finalImageUrl)) {
          finalImages = [finalImageUrl, ...finalImages];
        }
      }

      // ── Upload any selected Gallery images to S3 ──
      if (selectedGalleryImages.length > 0) {
        for (let i = 0; i < selectedGalleryImages.length; i++) {
          setUploadProgressText(`Uploading gallery image ${i + 1}/${selectedGalleryImages.length} to S3...`);
          try {
            const galResult = await productsApi.uploadProductImage(selectedGalleryImages[i]);
            const galUrl = galResult.imageUrl || galResult.fileUrl;
            if (galUrl && !finalImages.includes(galUrl)) {
              finalImages.push(galUrl);
            }
          } catch (gErr) {
            console.warn('[GalleryUpload] Single image error:', gErr);
          }
        }
      }

      setIsUploadingImage(false);

      // Ensure main image is inside finalImages array
      if (finalImageUrl && !finalImages.includes(finalImageUrl)) {
        finalImages.unshift(finalImageUrl);
      }

      // ── Step 3: Send JSON Request to Live Backend ──
      if (editingProduct) {
        // PUT /api/products/{productId}
        const productId = editingProduct.productId || editingProduct.id;
        setUploadProgressText(`Updating product #${productId} (PUT /api/products/${productId})...`);

        const updatePayload: ProductUpdateRequest = {
          subcategoryId: Number(formSubcategoryId),
          categoryId: formCategoryId ? Number(formCategoryId) : undefined,
          title: trimmedTitle,
          price: parsedPrice,
          stockQty: parsedStock,
          unit: formUnit.trim(),
          imageUrl: finalImageUrl,
          images: finalImages,
          active: formActive,
          is24HourDelivery: formIs24HourDelivery,
          description: formDescription.trim() || undefined,
          brand: formBrand.trim() || undefined,
          sku: formSku.trim() || undefined,
          mrp: formMrp ? parseFloat(formMrp) : undefined,
          moq: formMoq ? parseInt(formMoq, 10) : undefined,
        };

        if (!productId) {
          throw new Error('Product ID is missing for update operation.');
        }
        await productsApi.updateProduct(productId, updatePayload);
        Alert.alert('Success', `Product "${trimmedTitle}" updated successfully!`);
      } else {
        // POST /api/products
        setUploadProgressText('Creating product on live backend (POST /api/products)...');

        const createPayload: ProductCreateRequest = {
          subcategoryId: Number(formSubcategoryId),
          categoryId: formCategoryId ? Number(formCategoryId) : undefined,
          title: trimmedTitle,
          price: parsedPrice,
          stockQty: parsedStock,
          unit: formUnit.trim(),
          imageUrl: finalImageUrl,
          images: finalImages,
          active: formActive,
          is24HourDelivery: formIs24HourDelivery,
          description: formDescription.trim() || undefined,
          brand: formBrand.trim() || undefined,
          sku: formSku.trim() || undefined,
          mrp: formMrp ? parseFloat(formMrp) : undefined,
          moq: formMoq ? parseInt(formMoq, 10) : 1,
        };

        const createdProd = await productsApi.createProduct(createPayload);
        const newProdId = createdProd?.productId || createdProd?.id;
        if (newProdId) {
          await productsApi.approveProduct(newProdId).catch((e) => console.warn('[ProductManagement] Auto-approve product notice:', e));
        }
        Alert.alert('Success', `Product "${trimmedTitle}" created successfully!`);
      }

      // Invalidate global products cache so entire app updates instantly
      invalidateProductCache();

      // Close modal and refresh list
      setFormModalVisible(false);
      fetchData();
    } catch (err: any) {
      console.error('[ProductSubmit] Error:', err);
      const errMsg = err?.message || err?.response?.data?.message || 'Operation failed. Please check your network and parameters.';
      setFormError(errMsg);
      Alert.alert('Error', errMsg);
    } finally {
      setIsSavingProduct(false);
      setIsUploadingImage(false);
      setUploadProgressText('');
    }
  };

  // Delete product handler
  const handleDeleteProduct = async () => {
    if (!deleteConfirmProduct) return;
    const productId = deleteConfirmProduct.productId || deleteConfirmProduct.id;
    if (!productId) return;
    setIsDeleting(true);

    try {
      await productsApi.deleteProduct(productId);
      invalidateProductCache();
      setDeleteConfirmProduct(null);
      Alert.alert('Success', 'Product removed successfully.');
      fetchData();
    } catch (err: any) {
      console.error('[DeleteProduct] Error:', err);
      Alert.alert('Error', err?.message || 'Failed to delete product.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered products list for table
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !searchQuery ||
        (p.title || p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String((p as any).sku || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchSub =
        selectedSubCatFilter === 'all' ||
        String(p.subcategoryId) === selectedSubCatFilter ||
        String(p.categoryId) === selectedSubCatFilter;

      return matchSearch && matchSub;
    });
  }, [products, searchQuery, selectedSubCatFilter]);

  const activeImagePreview = selectedMainImage?.uri || existingImageUrl;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Header
        title="Product Inventory"
        showBack
        onBackPress={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={handleOpenCreateModal} style={{ padding: 4 }}>
            <Ionicons name="add-circle" size={26} color="#0038A8" />
          </TouchableOpacity>
        }
      />

      {/* Top Controls Bar */}
      <View style={[styles.topBar, { backgroundColor: theme.colors.cardBackground, borderBottomColor: theme.colors.border }]}>
        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
          <Ionicons name="search" size={17} color={theme.colors.textTertiary} />
          <TextInput
            placeholder="Search products, brands, SKU..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          />
          {Boolean(searchQuery) && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Add Product Button */}
        <TouchableOpacity
          onPress={handleOpenCreateModal}
          activeOpacity={0.85}
          style={styles.headerAddBtn}
        >
          <LinearGradient
            colors={['#0038A8', '#002570']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addBtnGradient}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add Product</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Subcategory Filter Pills */}
      <View style={styles.filterPillsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsContent}>
          <TouchableOpacity
            onPress={() => setSelectedSubCatFilter('all')}
            style={[
              styles.pill,
              selectedSubCatFilter === 'all'
                ? { backgroundColor: '#0038A8', borderColor: '#0038A8' }
                : { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.border },
            ]}
          >
            <Text
              style={[
                styles.pillText,
                { color: selectedSubCatFilter === 'all' ? '#FFFFFF' : theme.colors.textSecondary },
              ]}
            >
              All ({products.length})
            </Text>
          </TouchableOpacity>

          {subcategories.map((sub) => {
            const subId = String(sub.subcategoryId || sub.id);
            const isSelected = selectedSubCatFilter === subId;
            return (
              <TouchableOpacity
                key={subId}
                onPress={() => setSelectedSubCatFilter(subId)}
                style={[
                  styles.pill,
                  isSelected
                    ? { backgroundColor: '#0038A8', borderColor: '#0038A8' }
                    : { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary },
                  ]}
                >
                  {sub.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Product List */}
      {isLoading ? (
        <AdminListSkeleton count={6} />
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyCenter}>
          <Ionicons name="cube-outline" size={54} color={theme.colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
            No products found
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textTertiary }]}>
            {searchQuery
              ? `No results matching "${searchQuery}"`
              : 'Add your first product to start selling on Hinch Mart.'}
          </Text>
          <TouchableOpacity
            onPress={handleOpenCreateModal}
            style={styles.emptyAddBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyAddBtnText}>+ Add New Product</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => String(item.productId || item.id)}
          contentContainerStyle={styles.listContainer}
          refreshing={isRefreshing}
          onRefresh={() => fetchData(true)}
          renderItem={({ item }) => {
            const itemTitle = item.title || item.name || 'Untitled Product';
            const itemImage = resolveProductImage(item, item.imageUrl || item.image);
            const isActive = item.active !== false;

            return (
              <Card
                variant="outlined"
                style={[
                  styles.productCard,
                  { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder },
                ]}
              >
                <View style={styles.productRow}>
                  {/* Thumbnail */}
                  <Image
                    source={{ uri: itemImage }}
                    style={styles.thumbImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />

                  {/* Info */}
                  <View style={styles.productInfo}>
                    <View style={styles.rowBetween}>
                      <Text numberOfLines={1} style={[styles.productTitle, { color: theme.colors.textPrimary }]}>
                        {itemTitle}
                      </Text>
                      <Badge
                        label={isActive ? 'ACTIVE' : 'INACTIVE'}
                        variant={isActive ? 'success' : 'outlined'}
                        size="sm"
                      />
                    </View>

                    <Text style={[styles.productPrice, { color: theme.colors.primary }]}>
                      {formatPrice(item.price)}
                      <Text style={[styles.productUnit, { color: theme.colors.textTertiary }]}>
                        {' '}/ {item.unit || 'unit'}
                      </Text>
                    </Text>

                    <View style={styles.metaRow}>
                      <Text style={[styles.stockText, { color: (item.stockQty ?? 0) > 0 ? '#10B981' : '#EF4444' }]}>
                        Stock: {item.stockQty ?? 0}
                      </Text>
                      {Boolean(item.brand) && (
                        <Text style={[styles.brandText, { color: theme.colors.textTertiary }]}>
                          • {item.brand}
                        </Text>
                      )}
                      {Boolean(item.is24HourDelivery) && (
                        <View style={styles.expressBadge}>
                          <Ionicons name="flash" size={10} color="#F59E0B" />
                          <Text style={styles.expressText}>24H</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Actions Row */}
                <View style={[styles.cardActionsRow, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                  <TouchableOpacity
                    onPress={() => {
                      navigation.navigate('ProductDetail', {
                        productId: item.productId || item.id,
                        product: {
                          ...item,
                          id: item.productId || item.id,
                          name: itemTitle,
                          imageUrl: itemImage,
                        },
                      });
                    }}
                    style={styles.viewActionBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="eye-outline" size={16} color="#059669" />
                    <Text style={styles.viewActionText}>View Details</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleOpenEditModal(item)}
                    style={styles.editActionBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={16} color="#0038A8" />
                    <Text style={styles.editActionText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setDeleteConfirmProduct(item)}
                    style={styles.deleteActionBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={styles.deleteActionText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 2-STEP PRODUCT CREATION / EDIT MODAL                      */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Modal
        visible={formModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          if (!isSavingProduct) setFormModalVisible(false);
        }}
      >
        <View style={[styles.modalScreen, { backgroundColor: theme.colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.cardBackground, borderBottomColor: theme.colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  if (!isSavingProduct) setFormModalVisible(false);
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <View>
                <Text style={[styles.modalHeaderTitle, { color: theme.colors.textPrimary }]}>
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.colors.textTertiary }}>
                  {editingProduct ? 'Update live backend catalog' : '2-Step Image S3 Upload & Creation'}
                </Text>
              </View>
            </View>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {/* Error Banner */}
            {Boolean(formError) && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorBannerText}>{formError}</Text>
              </View>
            )}

            {/* ── STEP 1: Image Selection & Preview ── */}
            <Card variant="outlined" style={[styles.formSectionCard, { backgroundColor: theme.colors.cardBackground }]}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                    Product Image (S3 Upload)
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.colors.textTertiary }]}>
                    Max size: 15 MB • Formats: JPEG, PNG, WebP
                  </Text>
                </View>
              </View>

              {/* Main Image Preview / Selector Box */}
              <View style={styles.imageSelectorContainer}>
                {activeImagePreview ? (
                  <View style={styles.previewBox}>
                    <Image
                      source={{ uri: activeImagePreview }}
                      style={styles.mainPreviewImage}
                      contentFit="cover"
                    />
                    <View style={styles.previewOverlay}>
                      {selectedMainImage && (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>New Selection</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedMainImage(null);
                          setExistingImageUrl('');
                        }}
                        style={styles.removeImageBtn}
                      >
                        <Ionicons name="trash" size={15} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.dropzoneBox, { borderColor: theme.colors.border, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                    <Ionicons name="cloud-upload-outline" size={36} color="#0038A8" />
                    <Text style={[styles.dropzoneTitle, { color: theme.colors.textPrimary }]}>
                      Select Main Product Image
                    </Text>
                    <Text style={[styles.dropzoneSub, { color: theme.colors.textTertiary }]}>
                      Uploads directly to S3 via POST /api/images/products
                    </Text>
                  </View>
                )}

                {/* Image Action Buttons */}
                <View style={styles.imageBtnRow}>
                  <TouchableOpacity
                    onPress={handlePickMainImage}
                    style={[styles.imgActionBtn, { backgroundColor: '#0038A8' }]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="images-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.imgActionBtnText}>Choose from Gallery</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleCaptureCamera}
                    style={[styles.imgActionBtn, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera-outline" size={16} color={theme.colors.textPrimary} />
                    <Text style={[styles.imgActionBtnText, { color: theme.colors.textPrimary }]}>Take Photo</Text>
                  </TouchableOpacity>
                </View>

                {/* Selected File Details */}
                {selectedMainImage && (
                  <View style={[styles.fileInfoPill, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text numberOfLines={1} style={[styles.fileInfoText, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
                      Ready: {selectedMainImage.name} {selectedMainImage.size ? `(${(selectedMainImage.size / (1024 * 1024)).toFixed(2)} MB)` : ''}
                    </Text>
                  </View>
                )}
              </View>

              {/* Optional Gallery Images */}
              <View style={{ marginTop: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: theme.colors.textPrimary }}>
                    Gallery Images (Optional)
                  </Text>
                  <TouchableOpacity onPress={handlePickGalleryImages}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#0038A8' }}>
                      + Add Gallery Photos
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                  {existingGalleryUrls.map((url, idx) => (
                    <View key={`exist_${idx}`} style={styles.galleryThumbWrapper}>
                      <Image source={{ uri: url }} style={styles.galleryThumb} contentFit="cover" />
                      <TouchableOpacity
                        onPress={() => setExistingGalleryUrls((prev) => prev.filter((_, i) => i !== idx))}
                        style={styles.galleryThumbRemove}
                      >
                        <Ionicons name="close" size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {selectedGalleryImages.map((file, idx) => (
                    <View key={`new_${idx}`} style={styles.galleryThumbWrapper}>
                      <Image source={{ uri: file.uri }} style={styles.galleryThumb} contentFit="cover" />
                      <TouchableOpacity
                        onPress={() => setSelectedGalleryImages((prev) => prev.filter((_, i) => i !== idx))}
                        style={styles.galleryThumbRemove}
                      >
                        <Ionicons name="close" size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </Card>

            {/* ── STEP 2: Product Required Information ── */}
            <Card variant="outlined" style={[styles.formSectionCard, { backgroundColor: theme.colors.cardBackground }]}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                    Product Details
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.colors.textTertiary }]}>
                    Required fields per ProductRequest.java specification
                  </Text>
                </View>
              </View>

              {/* Title */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
                  Product Title *
                </Text>
                <TextInput
                  style={[styles.inputField, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}
                  placeholder="e.g. UltraTech Super Cement 50kg"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={formTitle}
                  onChangeText={setFormTitle}
                />
              </View>

              {/* Price & Unit Row */}
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
                    Price (₹) *
                  </Text>
                  <TextInput
                    style={[styles.inputField, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}
                    placeholder="380.00"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={formPrice}
                    onChangeText={setFormPrice}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
                    Unit *
                  </Text>
                  <TextInput
                    style={[styles.inputField, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}
                    placeholder="bag / piece / kg"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={formUnit}
                    onChangeText={setFormUnit}
                  />
                </View>
              </View>

              {/* Stock Quantity & MRP Row */}
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
                    Stock Quantity *
                  </Text>
                  <TextInput
                    style={[styles.inputField, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}
                    placeholder="100"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={formStockQty}
                    onChangeText={setFormStockQty}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
                    MRP / Compare Price
                  </Text>
                  <TextInput
                    style={[styles.inputField, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}
                    placeholder="420.00"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={formMrp}
                    onChangeText={setFormMrp}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Category & Subcategory Selectors */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
                  Category
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                  {categories.map((cat) => {
                    const cId = Number(cat.categoryId || cat.id);
                    const isSelected = formCategoryId === cId;
                    return (
                      <TouchableOpacity
                        key={cId}
                        onPress={() => {
                          setFormCategoryId(cId);
                          // Auto set first matching subcategory
                          const matchSub = subcategories.find((s) => Number(s.categoryId) === cId);
                          if (matchSub) {
                            setFormSubcategoryId(Number(matchSub.subcategoryId || matchSub.id));
                          }
                        }}
                        style={[
                          styles.catPill,
                          isSelected
                            ? { backgroundColor: '#0038A8', borderColor: '#0038A8' }
                            : { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: theme.colors.border },
                        ]}
                      >
                        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: isSelected ? '#FFFFFF' : theme.colors.textSecondary }}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Subcategory Selector (Required) */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
                  Subcategory *
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                  {availableSubcategories.map((sub) => {
                    const sId = Number(sub.subcategoryId || sub.id);
                    const isSelected = formSubcategoryId === sId;
                    return (
                      <TouchableOpacity
                        key={sId}
                        onPress={() => setFormSubcategoryId(sId)}
                        style={[
                          styles.catPill,
                          isSelected
                            ? { backgroundColor: '#10B981', borderColor: '#10B981' }
                            : { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: theme.colors.border },
                        ]}
                      >
                        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: isSelected ? '#FFFFFF' : theme.colors.textSecondary }}>
                          {sub.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Brand & SKU */}
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
                    Brand Name
                  </Text>
                  <TextInput
                    style={[styles.inputField, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}
                    placeholder="e.g. UltraTech, Tata Steel"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={formBrand}
                    onChangeText={setFormBrand}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
                    SKU Code
                  </Text>
                  <TextInput
                    style={[styles.inputField, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}
                    placeholder="SKU-1002"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={formSku}
                    onChangeText={setFormSku}
                  />
                </View>
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
                  Product Description
                </Text>
                <TextInput
                  style={[styles.textAreaField, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}
                  placeholder="Detailed technical specifications, grade, standards..."
                  placeholderTextColor={theme.colors.textTertiary}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Switches: Active & 24H Delivery */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchLabel, { color: theme.colors.textPrimary }]}>
                    Active in Store Catalog
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11.5, color: theme.colors.textTertiary }}>
                    Visible to wholesale & retail buyers
                  </Text>
                </View>
                <Switch
                  value={formActive}
                  onValueChange={setFormActive}
                  trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchLabel, { color: theme.colors.textPrimary }]}>
                    24-Hour Express Delivery
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11.5, color: theme.colors.textTertiary }}>
                    Guaranteed same-day/next-day dispatch
                  </Text>
                </View>
                <Switch
                  value={formIs24HourDelivery}
                  onValueChange={setFormIs24HourDelivery}
                  trackColor={{ false: '#CBD5E1', true: '#F59E0B' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </Card>

            {/* ── Submit / Save Action Button ── */}
            <View style={{ marginTop: 8, marginBottom: 20 }}>
              <TouchableOpacity
                onPress={handleSubmitProduct}
                disabled={isSavingProduct || isUploadingImage}
                activeOpacity={0.85}
                style={styles.submitBtnWrapper}
              >
                <LinearGradient
                  colors={isSavingProduct ? ['#64748B', '#475569'] : ['#0038A8', '#002570']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitGradient}
                >
                  {isSavingProduct ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>
                        {uploadProgressText || 'Saving to Live Backend...'}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>
                        {editingProduct ? 'Update Product' : 'Upload Image & Create Product'}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* DELETE CONFIRMATION MODAL                                  */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Modal
        visible={Boolean(deleteConfirmProduct)}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmProduct(null)}
      >
        <View style={styles.deleteBackdrop}>
          <View style={[styles.deleteModalCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.border }]}>
            <View style={styles.deleteIconBox}>
              <Ionicons name="warning" size={28} color="#EF4444" />
            </View>
            <Text style={[styles.deleteModalTitle, { color: theme.colors.textPrimary }]}>
              Delete Product?
            </Text>
            <Text style={[styles.deleteModalDesc, { color: theme.colors.textSecondary }]}>
              Are you sure you want to delete &quot;{deleteConfirmProduct?.title || deleteConfirmProduct?.name}&quot;? This action will remove it from the live catalog (DELETE /api/products/{deleteConfirmProduct?.productId || deleteConfirmProduct?.id}).
            </Text>

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                onPress={() => setDeleteConfirmProduct(null)}
                style={[styles.deleteCancelBtn, { backgroundColor: theme.colors.surfaceVariant }]}
              >
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: theme.colors.textPrimary }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDeleteProduct}
                disabled={isDeleting}
                style={styles.deleteConfirmBtn}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13.5, color: '#FFFFFF' }}>
                    Confirm Delete
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
  },
  headerAddBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  addBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 40,
    gap: 6,
  },
  addBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  filterPillsWrapper: {
    paddingVertical: 8,
  },
  filterPillsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  emptyCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyAddBtn: {
    marginTop: 10,
    backgroundColor: '#0038A8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  productCard: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  productRow: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbImage: {
    width: 76,
    height: 76,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  productPrice: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    marginTop: 3,
  },
  productUnit: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  stockText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
  },
  brandText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
  },
  expressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
  },
  expressText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9.5,
    color: '#F59E0B',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 8,
    gap: 16,
  },
  viewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewActionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    color: '#059669',
  },
  editActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editActionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    color: '#0038A8',
  },
  deleteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteActionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    color: '#EF4444',
  },
  // Modal Styles
  modalScreen: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16.5,
  },
  modalScroll: {
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: '#EF4444',
  },
  formSectionCard: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0038A8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  sectionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    marginTop: 1,
  },
  imageSelectorContainer: {
    gap: 10,
  },
  previewBox: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  mainPreviewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    left: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  removeImageBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropzoneBox: {
    width: '100%',
    height: 140,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 4,
  },
  dropzoneTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
  },
  dropzoneSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    textAlign: 'center',
  },
  imageBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  imgActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  imgActionBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  fileInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  fileInfoText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    flex: 1,
  },
  galleryThumbWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  galleryThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  galleryThumbRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    marginBottom: 5,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
  },
  textAreaField: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  submitBtnWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  // Delete Modal
  deleteBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  deleteModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  deleteIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  deleteModalTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    marginBottom: 6,
  },
  deleteModalDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  deleteCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteConfirmBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
});
