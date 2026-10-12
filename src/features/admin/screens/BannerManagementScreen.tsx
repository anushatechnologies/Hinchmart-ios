/**
 * HINCH MART — Admin Banner Management Screen
 * Complete CRUD for Live Banners (/api/banners)
 * Restricted strictly to users with role === 'ADMIN'
 */
import React, { useState, useEffect, useCallback } from 'react';
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
import { useTheme } from '../../../theme';
import { Header } from '../../../components/layout/Screen';
import { useAppSelector } from '../../../redux/hooks';
import { bannersApi } from '../../../services/api/banners.api';
import { invalidateBannerCache } from '../../../hooks/useLiveBanners';
import { AdminListSkeleton } from '../../../components/feedback/SkeletonLoader';
import {
  ApiBanner,
  BannerCreateRequest,
  BannerUpdateRequest,
  BannerPosition,
  BannerLinkType,
} from '../../../types/banner.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const POSITION_FILTERS: { label: string; value?: BannerPosition }[] = [
  { label: 'All Banners', value: undefined },
  { label: 'Hero Carousel', value: 'HOME_HERO' },
  { label: 'Promotional Video', value: 'HOME_VIDEO' },
  { label: 'Promo Strip', value: 'PROMO_STRIP' },
  { label: 'Popup Offer', value: 'POPUP' },
  { label: 'Category Top', value: 'CATEGORY_TOP' },
  { label: 'Offer Card', value: 'OFFER_CARD' },
];

const LINK_TYPES: BannerLinkType[] = ['CATEGORY', 'PRODUCT', 'URL', 'EXTERNAL', 'SCREEN'];

const PRESET_IMAGE_TEMPLATES = [
  { label: 'Building / Cement', url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Steel & TMT', url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Wholesale Depot', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Mega Deals', url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80' },
];

export function BannerManagementScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { user } = useAppSelector((state) => state.auth);

  // Admin access validation
  const isAdmin = user?.role === 'ADMIN' || (user as any)?.accountType === 'admin';

  const [selectedPosition, setSelectedPosition] = useState<BannerPosition | undefined>(undefined);
  const [banners, setBanners] = useState<ApiBanner[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Modal State
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<ApiBanner | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formPosition, setFormPosition] = useState<BannerPosition>('HOME_HERO');
  const [formLinkType, setFormLinkType] = useState<BannerLinkType>('CATEGORY');
  const [formLinkValue, setFormLinkValue] = useState('');
  const [formSortOrder, setFormSortOrder] = useState('0');
  const [formActive, setFormActive] = useState(true);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formError, setFormError] = useState('');

  // Fetch all banners from live backend
  const fetchBanners = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      // Admin views all banners (both active and inactive)
      const data = await bannersApi.getBanners({
        position: selectedPosition,
      });
      setBanners(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('[AdminBanner] Fetch error:', err?.message || err);
      Alert.alert('Error', err?.message || 'Failed to fetch banners from live backend');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedPosition]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const openCreateModal = () => {
    setEditingBanner(null);
    setFormTitle('');
    setFormSubtitle('');
    setFormImageUrl(PRESET_IMAGE_TEMPLATES[0].url);
    setFormPosition(selectedPosition || 'HOME_HERO');
    setFormLinkType('CATEGORY');
    setFormLinkValue('cat_steel');
    setFormSortOrder('0');
    setFormActive(true);
    setFormStartDate(new Date().toISOString().slice(0, 10) + 'T00:00:00');
    setFormEndDate(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) + 'T23:59:00');
    setFormError('');
    setFormModalVisible(true);
  };

  const openEditModal = (banner: ApiBanner) => {
    setEditingBanner(banner);
    setFormTitle(banner.title || '');
    setFormSubtitle(banner.subtitle || '');
    setFormImageUrl(banner.imageUrl || banner.image || '');
    setFormPosition(banner.position || 'HOME_HERO');
    setFormLinkType(banner.linkType || 'CATEGORY');
    setFormLinkValue(banner.linkValue || '');
    setFormSortOrder(String(banner.sortOrder ?? 0));
    setFormActive(banner.active !== false && banner.isActive !== false);
    setFormStartDate(banner.startDate || '');
    setFormEndDate(banner.endDate || '');
    setFormError('');
    setFormModalVisible(true);
  };

  const handleSaveBanner = async () => {
    if (!formTitle.trim()) {
      setFormError('Banner title is required and cannot be blank');
      return;
    }

    setActionLoading(true);
    setFormError('');

    try {
      if (editingBanner) {
        // Update existing banner: PUT /api/banners/{id}
        const bannerId = (editingBanner.bannerId ?? editingBanner.id ?? '') as string | number;
        if (!bannerId) {
          setFormError('Invalid banner ID for update');
          return;
        }
        const updatePayload: BannerUpdateRequest = {
          title: formTitle.trim(),
          subtitle: formSubtitle.trim() || undefined,
          imageUrl: formImageUrl.trim() || undefined,
          videoUrl: formPosition === 'HOME_VIDEO' ? formImageUrl.trim() : undefined,
          mediaType: formPosition === 'HOME_VIDEO' ? 'VIDEO' : 'IMAGE',
          position: formPosition,
          linkType: formLinkType,
          linkValue: formLinkValue.trim() || undefined,
          sortOrder: parseInt(formSortOrder, 10) || 0,
          active: formActive,
          startDate: formStartDate.trim() || undefined,
          endDate: formEndDate.trim() || undefined,
        };

        await bannersApi.updateBanner(bannerId, updatePayload);
        invalidateBannerCache();
        Alert.alert('Success', 'Banner updated successfully!');
      } else {
        // Create new banner: POST /api/banners
        const createPayload: BannerCreateRequest = {
          title: formTitle.trim(),
          subtitle: formSubtitle.trim() || undefined,
          imageUrl: formImageUrl.trim() || undefined,
          videoUrl: formPosition === 'HOME_VIDEO' ? formImageUrl.trim() : undefined,
          mediaType: formPosition === 'HOME_VIDEO' ? 'VIDEO' : 'IMAGE',
          position: formPosition,
          linkType: formLinkType,
          linkValue: formLinkValue.trim() || undefined,
          sortOrder: parseInt(formSortOrder, 10) || 0,
          active: formActive,
          startDate: formStartDate.trim() || undefined,
          endDate: formEndDate.trim() || undefined,
        };

        await bannersApi.createBanner(createPayload);
        invalidateBannerCache();
        Alert.alert('Success', 'Banner created successfully on live backend!');
      }

      setFormModalVisible(false);
      fetchBanners();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save banner. Please check all fields.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (banner: ApiBanner) => {
    const bannerId = (banner.bannerId ?? banner.id ?? '') as string | number;
    if (!bannerId) return;
    const currentActive = banner.active !== false && banner.isActive !== false;
    const newActive = !currentActive;

    try {
      // Optimistic update
      setBanners((prev) =>
        prev.map((b) =>
          (b.bannerId || b.id) === bannerId ? { ...b, active: newActive, isActive: newActive } : b
        )
      );

      await bannersApi.updateBanner(bannerId, { active: newActive });
      invalidateBannerCache();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update banner status');
      fetchBanners();
    }
  };

  const handleDeleteBanner = (banner: ApiBanner) => {
    const bannerId = (banner.bannerId ?? banner.id ?? '') as string | number;
    if (!bannerId) return;
    Alert.alert(
      'Delete Banner',
      `Are you sure you want to permanently delete "${banner.title}" from the database and S3?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await bannersApi.deleteBanner(bannerId);
              invalidateBannerCache();
              setBanners((prev) => prev.filter((b) => (b.bannerId || b.id) !== bannerId));
              Alert.alert('Deleted', 'Banner removed successfully');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete banner');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // If not admin, show guard view
  if (!isAdmin) {
    return (
      <View style={[styles.root, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <Header title="Admin Access" showBack onBackPress={() => navigation.goBack()} />
        <View style={styles.guardContainer}>
          <View style={styles.guardIconWrap}>
            <Ionicons name="lock-closed" size={44} color="#EF4444" />
          </View>
          <Text style={[styles.guardTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            Admin Privileges Required
          </Text>
          <Text style={[styles.guardDesc, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Only verified administrators can create, update, and manage promotional banners on the HINCH MART live platform.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.guardBackBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.guardBackBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#0B1120' : '#F8FAFC' }]}>
      <Header
        title="Banner Management"
        showBack
        onBackPress={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={openCreateModal}
            style={styles.headerAddBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.headerAddBtnText}>Add</Text>
          </TouchableOpacity>
        }
      />

      {/* Position Filter Tabs */}
      <View style={[styles.filterBar, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderBottomColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {POSITION_FILTERS.map((pf, idx) => {
            const isSelected = selectedPosition === pf.value;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedPosition(pf.value)}
                style={[
                  styles.filterPill,
                  isSelected && styles.filterPillActive,
                  { borderColor: isSelected ? '#3B82F6' : isDark ? '#334155' : '#E2E8F0' },
                ]}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected ? styles.filterPillTextActive : { color: isDark ? '#94A3B8' : '#64748B' },
                  ]}
                >
                  {pf.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main List */}
      {isLoading ? (
        <AdminListSkeleton count={4} />
      ) : banners.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={54} color={isDark ? '#475569' : '#CBD5E1'} />
          <Text style={[styles.emptyTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            No Banners Found
          </Text>
          <Text style={[styles.emptySubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {selectedPosition
              ? `No banners currently configured for position "${selectedPosition}".`
              : 'No promotional banners have been created yet on the live backend.'}
          </Text>
          <TouchableOpacity
            onPress={openCreateModal}
            style={styles.emptyAddBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.emptyAddBtnText}>Create New Banner</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={banners}
          keyExtractor={(item, idx) => String(item.bannerId || item.id || idx)}
          refreshing={isRefreshing}
          onRefresh={() => fetchBanners(true)}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
          renderItem={({ item }) => {
            const isActive = item.active !== false && item.isActive !== false;
            const imgUri = item.imageUrl || item.image || '';

            return (
              <View
                style={[
                  styles.bannerCard,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                {/* Banner Thumbnail & Position Badge */}
                <View style={styles.thumbnailWrap}>
                  {imgUri ? (
                    <Image source={{ uri: imgUri }} style={styles.thumbnailImg} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumbnailPlaceholder, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                      <Ionicons name="image" size={28} color="#94A3B8" />
                    </View>
                  )}
                  <View style={styles.cardPositionBadge}>
                    <Text style={styles.cardPositionText}>{item.position || 'HOME_HERO'}</Text>
                  </View>
                  <View
                    style={[
                      styles.cardStatusBadge,
                      { backgroundColor: isActive ? '#10B981' : '#64748B' },
                    ]}
                  >
                    <Text style={styles.cardStatusText}>{isActive ? 'ACTIVE' : 'INACTIVE'}</Text>
                  </View>
                </View>

                {/* Banner Meta */}
                <View style={styles.cardBody}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={[styles.cardTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.cardSortOrder, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                      #{item.sortOrder ?? 0}
                    </Text>
                  </View>

                  {item.subtitle ? (
                    <Text style={[styles.cardSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={2}>
                      {item.subtitle}
                    </Text>
                  ) : null}

                  {/* Target link info */}
                  <View style={styles.linkInfoRow}>
                    <Ionicons name="link" size={13} color="#3B82F6" />
                    <Text style={styles.linkInfoText}>
                      {item.linkType || 'CATEGORY'}: {item.linkValue || 'all'}
                    </Text>
                  </View>

                  {/* Actions Row */}
                  <View style={[styles.cardActionsRow, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    <View style={styles.activeToggleRow}>
                      <Text style={[styles.toggleLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                        {isActive ? 'Active' : 'Disabled'}
                      </Text>
                      <Switch
                        value={isActive}
                        onValueChange={() => handleToggleActive(item)}
                        trackColor={{ false: '#64748B', true: '#3B82F6' }}
                        thumbColor="#FFFFFF"
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                      />
                    </View>

                    <View style={styles.btnGroup}>
                      <TouchableOpacity
                        onPress={() => openEditModal(item)}
                        style={[styles.actionIconBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="pencil" size={16} color={isDark ? '#F8FAFC' : '#1E293B'} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDeleteBanner(item)}
                        style={[styles.actionIconBtn, { backgroundColor: '#FEE2E2' }]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ── Create / Edit Banner Modal ── */}
      <Modal
        visible={formModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFormModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
              <Text style={[styles.modalTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                {editingBanner ? 'Edit Banner' : 'Create New Banner'}
              </Text>
              <TouchableOpacity
                onPress={() => setFormModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
              {formError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color="#EF4444" />
                  <Text style={styles.errorBoxText}>{formError}</Text>
                </View>
              ) : null}

              {/* Title Field (Required) */}
              <Text style={[styles.inputLabel, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                Banner Title <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="e.g. Summer Mega Sale"
                placeholderTextColor="#94A3B8"
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#CBD5E1',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                  },
                ]}
              />

              {/* Subtitle Field */}
              <Text style={[styles.inputLabel, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                Subtitle / Offer Tag
              </Text>
              <TextInput
                value={formSubtitle}
                onChangeText={setFormSubtitle}
                placeholder="e.g. Save up to 50% on all materials"
                placeholderTextColor="#94A3B8"
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#CBD5E1',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                  },
                ]}
              />

              {/* Position Selector */}
              <Text style={[styles.inputLabel, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                Position
              </Text>
              <View style={styles.pillSelectorRow}>
                {(['HOME_HERO', 'HOME_VIDEO', 'PROMO_STRIP', 'POPUP', 'CATEGORY_TOP', 'OFFER_CARD'] as BannerPosition[]).map((pos) => (
                  <TouchableOpacity
                    key={pos}
                    onPress={() => setFormPosition(pos)}
                    style={[
                      styles.choicePill,
                      formPosition === pos && styles.choicePillActive,
                      { borderColor: formPosition === pos ? '#3B82F6' : isDark ? '#334155' : '#E2E8F0' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        formPosition === pos && styles.choicePillTextActive,
                      ]}
                    >
                      {pos === 'HOME_VIDEO' ? 'HOME_VIDEO (Promo Video)' : pos}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Image URL Input & Presets */}
              <Text style={[styles.inputLabel, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                Image URL (S3 or CDN)
              </Text>
              <TextInput
                value={formImageUrl}
                onChangeText={setFormImageUrl}
                placeholder="https://example.com/banner.png"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#CBD5E1',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                  },
                ]}
              />

              {/* Quick Preset Selector */}
              <Text style={[styles.subLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Or pick a preset template:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
                {PRESET_IMAGE_TEMPLATES.map((tpl, tIdx) => (
                  <TouchableOpacity
                    key={tIdx}
                    onPress={() => setFormImageUrl(tpl.url)}
                    style={[
                      styles.presetItem,
                      formImageUrl === tpl.url && styles.presetItemActive,
                    ]}
                  >
                    <Image source={{ uri: tpl.url }} style={styles.presetThumb} contentFit="cover" />
                    <Text style={styles.presetLabel}>{tpl.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Link Type & Value */}
              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.inputLabel, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                    Link Type
                  </Text>
                  <View style={styles.pillSelectorRow}>
                    {LINK_TYPES.map((lt) => (
                      <TouchableOpacity
                        key={lt}
                        onPress={() => setFormLinkType(lt)}
                        style={[
                          styles.choicePillSm,
                          formLinkType === lt && styles.choicePillActive,
                          { borderColor: formLinkType === lt ? '#3B82F6' : isDark ? '#334155' : '#E2E8F0' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.choicePillTextSm,
                            formLinkType === lt && styles.choicePillTextActive,
                          ]}
                        >
                          {lt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                Link Value (Category ID / Product ID / URL)
              </Text>
              <TextInput
                value={formLinkValue}
                onChangeText={setFormLinkValue}
                placeholder="e.g. fruits or 1"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#CBD5E1',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                  },
                ]}
              />

              {/* Sort Order & Active Switch */}
              <View style={styles.rowTwoCols}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.inputLabel, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                    Sort Order
                  </Text>
                  <TextInput
                    value={formSortOrder}
                    onChangeText={setFormSortOrder}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                        borderColor: isDark ? '#334155' : '#CBD5E1',
                        color: isDark ? '#F8FAFC' : '#0F172A',
                      },
                    ]}
                  />
                </View>

                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={[styles.inputLabel, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                    Active Status
                  </Text>
                  <View style={styles.switchInModalRow}>
                    <Text style={{ color: formActive ? '#10B981' : '#64748B', fontFamily: 'Inter_600SemiBold' }}>
                      {formActive ? 'Active' : 'Inactive'}
                    </Text>
                    <Switch
                      value={formActive}
                      onValueChange={setFormActive}
                      trackColor={{ false: '#64748B', true: '#3B82F6' }}
                    />
                  </View>
                </View>
              </View>

              {/* Submit Buttons */}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  onPress={() => setFormModalVisible(false)}
                  style={[styles.modalCancelBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}
                >
                  <Text style={[styles.modalCancelBtnText, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveBanner}
                  disabled={actionLoading}
                  style={styles.modalSubmitBtn}
                  activeOpacity={0.85}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.modalSubmitBtnText}>
                        {editingBanner ? 'Update Banner' : 'Publish Banner'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  headerAddBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
    marginLeft: 2,
  },

  // Guard
  guardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  guardIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  guardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  guardDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  guardBackBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  guardBackBtnText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    fontSize: 14,
  },

  // Filter Bar
  filterBar: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterPillActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },

  // List States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyAddBtnText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    fontSize: 14,
  },

  // Banner Card
  listContent: {
    padding: 16,
    gap: 14,
  },
  bannerCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbnailWrap: {
    height: 120,
    width: '100%',
    position: 'relative',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardPositionBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardPositionText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  cardStatusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardStatusText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  cardBody: {
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  cardSortOrder: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  cardSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  linkInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  linkInfoText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#3B82F6',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  activeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginRight: 4,
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  modalCloseBtn: {
    padding: 4,
  },
  formScroll: {
    padding: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    gap: 8,
  },
  errorBoxText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: '#EF4444',
    flex: 1,
  },
  inputLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 10,
  },
  subLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 6,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  pillSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  choicePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  choicePillSm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  choicePillActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  choicePillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#64748B',
  },
  choicePillTextSm: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#64748B',
  },
  choicePillTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },
  presetScroll: {
    marginBottom: 10,
  },
  presetItem: {
    width: 90,
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  presetItemActive: {
    borderColor: '#3B82F6',
  },
  presetThumb: {
    width: '100%',
    height: 48,
  },
  presetLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#FFFFFF',
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowTwoCols: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  switchInModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  modalSubmitBtn: {
    flex: 1.8,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    fontSize: 14,
  },
});
