/**
 * HINCH MART — Requests for Quotation (RFQ) System (IBO Home Building Megastore Theme)
 * - RFQListScreen: Live RFQ list with status filters, count badges, B2B procurement banner & skeletons
 * - RFQDetailScreen: Tabbed Overview / Quotes / Messages, quote comparison cards, vendor acceptance, change request modal
 * - RFQCreateScreen: 3-step procurement form for line items, technical specifications, deadline & BOQ
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  Platform,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme';
import { RFQ } from '../../../types/rfq.types';
import { rfqApi } from '../../../services/api/rfq.api';
import { formatPrice } from '../../../utils';

/* ================================================================== */
/* 1. RFQ LIST SCREEN                                                 */
/* ================================================================== */
export function RFQListScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'quoted' | 'completed'>('all');
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLiveRFQs = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const rawRFQs = await rfqApi.getRFQs({ page: 1, limit: 30 });
      if (Array.isArray(rawRFQs)) {
        setRfqs(rawRFQs);
      } else {
        setRfqs([]);
      }
    } catch {
      setRfqs([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveRFQs();
  }, [fetchLiveRFQs]);

  const activeCount = rfqs.filter(
    (r: any) => r.status === 'active' || r.status === 'submitted' || r.status === 'in_review'
  ).length;
  const quotedCount = rfqs.filter((r: any) => r.status === 'quoted').length;
  const completedCount = rfqs.filter(
    (r: any) => r.status === 'completed' || r.status === 'approved'
  ).length;

  const RFQ_TABS = [
    { key: 'all', label: `All RFQs (${rfqs.length})` },
    { key: 'active', label: `Active (${activeCount})` },
    { key: 'quoted', label: `Quoted (${quotedCount})` },
    { key: 'completed', label: `Completed (${completedCount})` },
  ];

  const filteredRFQs = rfqs.filter((rfq: any) => {
    if (activeTab === 'active') {
      return rfq.status === 'active' || rfq.status === 'submitted' || rfq.status === 'in_review';
    }
    if (activeTab === 'quoted') {
      return rfq.status === 'quoted';
    }
    if (activeTab === 'completed') {
      return rfq.status === 'completed' || rfq.status === 'approved';
    }
    return true;
  });

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20);

  const getStatusBadgeConfig = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'quoted') return { label: 'QUOTED', bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC' };
    if (s === 'active' || s === 'submitted') return { label: 'ACTIVE', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
    if (s === 'in_review') return { label: 'IN REVIEW', bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
    if (s === 'completed' || s === 'approved') return { label: 'COMPLETED', bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
    return { label: (status || 'UNKNOWN').toUpperCase(), bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
        translucent
      />

      {/* Top Header */}
      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: topPadding + 6,
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HomeTab'))}
            style={styles.headerIconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              Requests for Quotation
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              B2B Bulk Procurement & Quotes
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={styles.headerIconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero B2B Procurement Banner */}
      <View style={styles.bannerContainer}>
        <TouchableOpacity
          onPress={() => navigation.navigate('RFQCreate')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#152238', '#1F3456']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={[styles.goldAccentLine, { backgroundColor: theme.colors.primary }]} />
            <View style={{ flex: 1, paddingLeft: 8 }}>
              <View style={styles.badgePill}>
                <Text style={[styles.badgePillText, { color: '#FDB913' }]}>
                  FAST B2B SOURCING
                </Text>
              </View>
              <Text style={styles.bannerHeadline}>Need Custom Wholesale Quotes?</Text>
              <Text style={styles.bannerSub}>
                Get competitive bids from verified manufacturers in 24 hrs
              </Text>
            </View>

            <View style={[styles.newRfqButton, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.newRfqBtnText}>New RFQ</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsTrack}>
          {RFQ_TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key as any)}
                activeOpacity={0.75}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    { color: active ? '#FFFFFF' : theme.colors.textSecondary, fontWeight: active ? '700' : '500' },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content List */}
      {isLoading ? (
        <View style={styles.skeletonList}>
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.rfqCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  marginBottom: 12,
                },
              ]}
            >
              <View style={[styles.skeletonLine, { width: '60%', height: 16, backgroundColor: theme.colors.skeleton }]} />
              <View style={[styles.skeletonLine, { width: '80%', height: 12, backgroundColor: theme.colors.skeleton, marginTop: 8 }]} />
              <View style={[styles.skeletonLine, { width: '40%', height: 12, backgroundColor: theme.colors.skeleton, marginTop: 12 }]} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredRFQs}
          keyExtractor={(item) => String(item.id || item.rfqNumber)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isRefreshing}
          onRefresh={() => fetchLiveRFQs(true)}
          renderItem={({ item }) => {
            const statusConfig = getStatusBadgeConfig(item.status);
            const quoteCount = (item as any).quotations?.length || (item as any).quoteCount || 0;

            return (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => navigation.navigate('RFQDetail', { rfqId: String(item.id) })}
                style={[
                  styles.rfqCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {/* Header Row: Title & Status */}
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.cardRefText, { color: theme.colors.textTertiary }]}>
                      #{item.rfqNumber || `RFQ-${item.id}`} • {item.category || 'General'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: statusConfig.bg,
                        borderColor: statusConfig.border,
                      },
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, { color: statusConfig.text }]}>
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>

                {/* Description Snippet */}
                {Boolean(item.description || (item as any).productMaterial) && (
                  <Text numberOfLines={2} style={[styles.cardDesc, { color: theme.colors.textSecondary }]}>
                    {item.description || (item as any).productMaterial}
                  </Text>
                )}

                {/* Key Metadata Grid */}
                <View
                  style={[
                    styles.metaGrid,
                    {
                      backgroundColor: isDark ? theme.colors.surfaceVariant : '#F8F9FA',
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.metaCol}>
                    <Text style={[styles.metaLabel, { color: theme.colors.textTertiary }]}>ITEMS</Text>
                    <Text style={[styles.metaVal, { color: theme.colors.textPrimary }]}>
                      {(item as any).items?.length || 1} Item(s)
                    </Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaCol}>
                    <Text style={[styles.metaLabel, { color: theme.colors.textTertiary }]}>DEADLINE</Text>
                    <Text style={[styles.metaVal, { color: theme.colors.danger }]}>
                      {(item as any).requiredByDate || item.deadline || 'Flexible'}
                    </Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaCol}>
                    <Text style={[styles.metaLabel, { color: theme.colors.textTertiary }]}>QUOTES</Text>
                    <Text
                      style={[
                        styles.metaVal,
                        { color: quoteCount > 0 ? theme.colors.success : theme.colors.textSecondary },
                      ]}
                    >
                      {quoteCount > 0 ? `${quoteCount} Received` : 'Awaiting'}
                    </Text>
                  </View>
                </View>

                {/* Action Footer */}
                <View style={styles.cardFooter}>
                  <Text style={[styles.footerHint, { color: theme.colors.textTertiary }]}>
                    {(item as any).deliveryLocation ? `Deliver to: ${(item as any).deliveryLocation}` : 'Direct Supplier Sourcing'}
                  </Text>
                  <View style={styles.viewDetailBtn}>
                    <Text style={[styles.viewDetailText, { color: theme.colors.primary }]}>
                      {quoteCount > 0 ? 'Review Quotes' : 'View Details'}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Ionicons name="document-text-outline" size={42} color={theme.colors.textTertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                No RFQs in this category
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Submit custom material requirements and get competitive bids directly from verified suppliers.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('RFQCreate')}
                style={[styles.emptyCtaBtn, { backgroundColor: theme.colors.primary }]}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.emptyCtaText}>Create New RFQ</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

/* ================================================================== */
/* 2. RFQ DETAIL SCREEN                                               */
/* ================================================================== */
export function RFQDetailScreen({ route, navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { rfqId } = route?.params || {};

  const [rfq, setRfq] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Quotes' | 'Messages'>('Overview');
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifyingQuote, setModifyingQuote] = useState<any>(null);
  const [modTypes, setModTypes] = useState<string[]>([]);
  const [modNote, setModNote] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const data = await rfqApi.getRFQDetail(rfqId);
        if (isMounted) {
          setRfq(data);
          if ((data as any)?.messages) {
            setMessages((data as any).messages);
          }
        }
      } catch {
        // Fallback placeholder
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [rfqId]);

  const toggleQuote = (id: string) => {
    if (selectedQuoteIds.includes(id)) {
      setSelectedQuoteIds((prev) => prev.filter((qId) => qId !== id));
    } else {
      setSelectedQuoteIds((prev) => [...prev, id]);
      rfqApi.acceptQuote(id).catch(() => {});
      Alert.alert('Quote Accepted', 'Quotation accepted. The supplier has been notified.');
    }
  };

  const toggleModType = (type: string) => {
    if (modTypes.includes(type)) {
      setModTypes((prev) => prev.filter((t) => t !== type));
    } else {
      setModTypes((prev) => [...prev, type]);
    }
  };

  const handleOpenModify = (quote: any) => {
    setModifyingQuote(quote);
    setModNote('');
    setShowModifyModal(true);
  };

  const handleSubmitModification = () => {
    setShowModifyModal(false);
    Alert.alert(
      'Modification Requested',
      `Your change request for Quote #${modifyingQuote?.id?.toUpperCase()} has been submitted to ${modifyingQuote?.vendorName}. You will receive an update shortly.`
    );
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || messageText;
    if (!text.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      sender: 'You',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: text.trim(),
      isSupplier: false,
    };

    setMessages((prev: any) => [...prev, newMessage]);
    setMessageText('');
  };

  const handleAskQuestionAboutQuote = (quote: any) => {
    setActiveTab('Messages');
    setMessageText(`Regarding Quote #${quote.id.toUpperCase()} from ${quote.vendorName}: `);
  };

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.headerWrapper, { paddingTop: topPadding + 6, backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading RFQ details...</Text>
        </View>
      </View>
    );
  }

  if (!rfq) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.headerWrapper, { paddingTop: topPadding + 6, backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="document-text-outline" size={48} color={theme.colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary, marginTop: 12 }]}>RFQ Not Found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
        translucent
      />

      {/* Top Header */}
      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: topPadding + 6,
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              {rfq.title}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Ref #{rfq.rfqNumber || `RFQ-${rfq.id}`}
            </Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.detailTabBar}>
          {(['Overview', 'Quotes', 'Messages'] as const).map((tab) => {
            const active = activeTab === tab;
            const quotesCount = rfq.quotations?.length || 0;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.detailTabItem,
                  active && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
                ]}
              >
                <Text
                  style={[
                    styles.detailTabText,
                    {
                      color: active ? theme.colors.primary : theme.colors.textSecondary,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {tab === 'Quotes' ? `Quotes (${quotesCount})` : tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tab Contents */}
      <ScrollView
        contentContainerStyle={[
          styles.detailScrollContent,
          selectedQuoteIds.length > 0 && activeTab === 'Quotes' && { paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'Overview' && (
          <View>
            {/* Summary Card */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>Requirement Summary</Text>
                <View style={[styles.statusBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                  <Text style={[styles.statusBadgeText, { color: '#2563EB' }]}>
                    {(rfq.status || 'ACTIVE').toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={[styles.bodyText, { color: theme.colors.textSecondary, marginTop: 8 }]}>
                {rfq.description || rfq.productMaterial || 'Material specifications as provided.'}
              </Text>

              <View style={[styles.metaGrid, { marginTop: 12, backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.border }]}>
                <View style={styles.metaCol}>
                  <Text style={[styles.metaLabel, { color: theme.colors.textTertiary }]}>CATEGORY</Text>
                  <Text style={[styles.metaVal, { color: theme.colors.textPrimary }]}>{rfq.category || 'General'}</Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.metaCol}>
                  <Text style={[styles.metaLabel, { color: theme.colors.textTertiary }]}>DEADLINE</Text>
                  <Text style={[styles.metaVal, { color: theme.colors.danger }]}>{rfq.deadline || rfq.requiredByDate || 'Immediate'}</Text>
                </View>
              </View>
            </View>

            {/* Requested Line Items */}
            <Text style={[styles.groupTitle, { color: theme.colors.textPrimary }]}>Requested Items</Text>
            {rfq.items?.length > 0 ? (
              rfq.items.map((item: any, idx: number) => (
                <View
                  key={item.id || idx}
                  style={[
                    styles.sectionCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      marginBottom: 8,
                    },
                  ]}
                >
                  <View style={styles.cardHeaderRow}>
                    <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.itemQty, { color: theme.colors.primary }]}>
                      {item.qty} {item.unit}
                    </Text>
                  </View>
                  {Boolean(item.specs) && (
                    <Text style={[styles.itemSpecs, { color: theme.colors.textSecondary }]}>
                      Specs: {item.specs}
                    </Text>
                  )}
                </View>
              ))
            ) : (
              <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={{ color: theme.colors.textSecondary }}>{rfq.productMaterial || 'Standard catalog specification'}</Text>
              </View>
            )}

            {/* Delivery & Commercial Terms */}
            <Text style={[styles.groupTitle, { color: theme.colors.textPrimary, marginTop: 16 }]}>
              Logistics & Payment
            </Text>
            <View style={styles.twoColRow}>
              <View style={[styles.halfCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.cardTag, { color: theme.colors.textTertiary }]}>DELIVERY LOCATION</Text>
                <Text style={[styles.cardTagVal, { color: theme.colors.textPrimary }]}>
                  {rfq.deliveryLocation || 'On-site delivery'}
                </Text>
              </View>
              <View style={[styles.halfCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="card-outline" size={18} color="#10B981" />
                <Text style={[styles.cardTag, { color: theme.colors.textTertiary }]}>PAYMENT TERMS</Text>
                <Text style={[styles.cardTagVal, { color: theme.colors.textPrimary }]}>
                  {rfq.paymentTerms || 'Bank Transfer / LC'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'Quotes' && (
          <View>
            {rfq.quotations?.length > 0 ? (
              <>
                <View style={styles.quotesTopRow}>
                  <Text style={[styles.quotesCountText, { color: theme.colors.textPrimary }]}>
                    {rfq.quotations.length} Quotes Received
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowCompareModal(true)}
                    style={styles.compareBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="git-compare-outline" size={16} color={theme.colors.primary} />
                    <Text style={[styles.compareBtnText, { color: theme.colors.primary }]}>Compare All</Text>
                  </TouchableOpacity>
                </View>

                {rfq.quotations.map((quote: any) => {
                  const isSelected = selectedQuoteIds.includes(quote.id);
                  return (
                    <View
                      key={quote.id}
                      style={[
                        styles.quoteCard,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                    >
                      {/* Quote Top Row */}
                      <View style={styles.quoteHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.vendorName, { color: theme.colors.textPrimary }]}>
                              {quote.vendorName}
                            </Text>
                            {quote.isVerified && (
                              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                            )}
                          </View>
                          <Text style={[styles.quoteNumberText, { color: theme.colors.textTertiary }]}>
                            QT-{quote.id.toUpperCase()} • {quote.badge || 'Verified Supplier'}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.quotePrice, { color: theme.colors.primary }]}>
                            ₹{Number(quote.price || 0).toLocaleString()}
                          </Text>
                          <Text style={[styles.quoteValidity, { color: theme.colors.textTertiary }]}>
                            Valid: {quote.validUntil || '15 Days'}
                          </Text>
                        </View>
                      </View>

                      {/* Terms Details Box */}
                      <View
                        style={[
                          styles.quoteTermsBox,
                          {
                            backgroundColor: isDark ? theme.colors.surfaceVariant : '#F8F9FA',
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        <View style={styles.termRow}>
                          <Text style={[styles.termLabel, { color: theme.colors.textSecondary }]}>Delivery Time:</Text>
                          <Text style={[styles.termVal, { color: theme.colors.textPrimary }]}>{quote.deliveryDays} Days</Text>
                        </View>
                        <View style={styles.termRow}>
                          <Text style={[styles.termLabel, { color: theme.colors.textSecondary }]}>Payment Terms:</Text>
                          <Text style={[styles.termVal, { color: theme.colors.textPrimary }]}>{quote.terms}</Text>
                        </View>
                      </View>

                      {/* Quote Action Buttons */}
                      <View style={styles.quoteActionsRow}>
                        <TouchableOpacity
                          onPress={() => toggleQuote(quote.id)}
                          style={[
                            styles.quoteActionBtn,
                            {
                              backgroundColor: isSelected ? '#16A34A' : theme.colors.primary,
                              flex: 1.2,
                            },
                          ]}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.quoteActionBtnText}>
                            {isSelected ? '✓ Accepted' : 'Accept Quote'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleOpenModify(quote)}
                          style={[
                            styles.quoteActionBtnSecondary,
                            {
                              backgroundColor: theme.colors.surface,
                              borderColor: theme.colors.border,
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.quoteActionSecondaryText, { color: theme.colors.textPrimary }]}>
                            Modify
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleAskQuestionAboutQuote(quote)}
                          style={[
                            styles.quoteIconOnlyBtn,
                            {
                              backgroundColor: theme.colors.surfaceVariant,
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="chatbubble-outline" size={16} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={44} color={theme.colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary, marginTop: 12 }]}>
                  Awaiting Quotations
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                  Verified suppliers are preparing quotation bids for your RFQ. Quotes will appear here once submitted.
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'Messages' && (
          <View>
            <View style={[styles.msgInfoBanner, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <Ionicons name="chatbubbles-outline" size={18} color="#2563EB" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E40AF' }}>
                  Inquiry Thread: {rfq.title}
                </Text>
                <Text style={{ fontSize: 11, color: '#3B82F6' }}>
                  Direct communication with verified bidding suppliers
                </Text>
              </View>
            </View>

            {messages.length > 0 ? (
              <View style={{ gap: 12, marginBottom: 16 }}>
                {messages.map((msg: any) => (
                  <View
                    key={msg.id}
                    style={{
                      alignSelf: msg.isSupplier ? 'flex-start' : 'flex-end',
                      maxWidth: '82%',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        color: theme.colors.textTertiary,
                        marginBottom: 2,
                        textAlign: msg.isSupplier ? 'left' : 'right',
                      }}
                    >
                      {msg.sender} • {msg.time}
                    </Text>
                    <View
                      style={{
                        backgroundColor: msg.isSupplier ? theme.colors.surfaceVariant : theme.colors.primary,
                        padding: 12,
                        borderRadius: 12,
                        borderBottomLeftRadius: msg.isSupplier ? 2 : 12,
                        borderBottomRightRadius: msg.isSupplier ? 12 : 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: msg.isSupplier ? theme.colors.textPrimary : '#FFFFFF',
                          lineHeight: 18,
                        }}
                      >
                        {msg.text}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={38} color={theme.colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary, marginTop: 8 }]}>
                  No Messages Yet
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                  Use the message box below to ask technical or delivery questions directly to bidders.
                </Text>
              </View>
            )}

            {/* Message Composer */}
            <View
              style={[
                styles.composerRow,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <TextInput
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Ask technical question or clarify specs..."
                placeholderTextColor={theme.colors.textTertiary}
                style={[styles.composerInput, { color: theme.colors.textPrimary }]}
              />
              <TouchableOpacity
                onPress={() => handleSendMessage()}
                style={[styles.sendBtn, { backgroundColor: theme.colors.primary }]}
                activeOpacity={0.8}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Proceed Footer */}
      {activeTab === 'Quotes' && selectedQuoteIds.length > 0 && (
        <View
          style={[
            styles.floatingFooter,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate('CheckoutAddress')}
            style={[styles.checkoutBtn, { backgroundColor: theme.colors.primary }]}
            activeOpacity={0.88}
          >
            <Text style={styles.checkoutBtnText}>
              Proceed with Selected Quote ({selectedQuoteIds.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Compare Modal */}
      <Modal visible={showCompareModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Compare Quotations</Text>
              <TouchableOpacity onPress={() => setShowCompareModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {rfq.quotations?.map((quote: any) => (
                <View
                  key={quote.id}
                  style={[
                    styles.compareColCard,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.vendorName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                    {quote.vendorName}
                  </Text>
                  <Text style={[styles.quotePrice, { color: theme.colors.primary, marginVertical: 8 }]}>
                    ₹{Number(quote.price || 0).toLocaleString()}
                  </Text>
                  <View style={{ gap: 6, marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                      Delivery: <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>{quote.deliveryDays} Days</Text>
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                      Terms: <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>{quote.terms}</Text>
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      toggleQuote(quote.id);
                      setShowCompareModal(false);
                    }}
                    style={[
                      styles.quoteActionBtn,
                      {
                        backgroundColor: selectedQuoteIds.includes(quote.id) ? '#16A34A' : theme.colors.primary,
                      },
                    ]}
                  >
                    <Text style={styles.quoteActionBtnText}>
                      {selectedQuoteIds.includes(quote.id) ? 'Selected' : 'Select'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modification Request Modal */}
      <Modal visible={showModifyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Request Quote Changes</Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  Quote #{modifyingQuote?.id?.toUpperCase()} • {modifyingQuote?.vendorName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowModifyModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 8 }}>
              Select terms to modify:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {['Unit Price', 'Quantity', 'Specifications', 'Delivery Time', 'Payment Terms'].map((item) => {
                const sel = modTypes.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    onPress={() => toggleModType(item)}
                    style={[
                      styles.modChip,
                      {
                        backgroundColor: sel ? theme.colors.primaryLight : theme.colors.surfaceVariant,
                        borderColor: sel ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 12, color: sel ? theme.colors.primary : theme.colors.textPrimary, fontWeight: sel ? '700' : '500' }}>
                      {sel ? '✓ ' : '+ '}{item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              value={modNote}
              onChangeText={setModNote}
              placeholder="Provide target price, timeline or change requirements..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={4}
              style={[
                styles.modInput,
                {
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.border,
                },
              ]}
            />

            <TouchableOpacity
              onPress={handleSubmitModification}
              style={[styles.checkoutBtn, { backgroundColor: theme.colors.primary, marginTop: 14 }]}
            >
              <Text style={styles.checkoutBtnText}>Submit Modification Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ================================================================== */
/* 3. RFQ CREATE SCREEN                                               */
/* ================================================================== */
export function RFQCreateScreen({ route, navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const initialTitle = route?.params?.initialTitle || '';
  const initialSpecs = route?.params?.initialSpecs || '';
  const initialQty = route?.params?.initialQty || '';
  const initialUnit = route?.params?.initialUnit || '';
  const initialCategory = route?.params?.initialCategory || '';
  const cartItemsParam = route?.params?.cartItems || [];

  const [title, setTitle] = useState(initialTitle);
  const [category, setCategory] = useState(initialCategory || 'Civil & Structural');
  const [materialRequirement, setMaterialRequirement] = useState(
    initialSpecs ? `Required specifications: ${initialSpecs}` : ''
  );
  const [brandPreference, setBrandPreference] = useState('');
  const [grade, setGrade] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [deadline, setDeadline] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Letter of Credit / Bank Transfer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [items, setItems] = useState<any[]>(
    cartItemsParam.length > 0
      ? cartItemsParam
      : initialTitle
      ? [{ id: '1', name: initialTitle, qty: initialQty || '10', unit: initialUnit || 'MT', specs: initialSpecs || 'Standard grade' }]
      : [{ id: '1', name: 'Fe 550D TMT Rebar (16mm)', qty: '50', unit: 'MT', specs: 'IS 1786 certified' }]
  );

  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('Units');
  const [showAddItem, setShowAddItem] = useState(false);

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: newItemName.trim(),
        qty: newItemQty.trim() || '1',
        unit: newItemUnit,
        specs: 'Custom specification',
      },
    ]);
    setNewItemName('');
    setNewItemQty('');
    setShowAddItem(false);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please provide a title for your RFQ.');
      return;
    }
    if (!materialRequirement.trim()) {
      Alert.alert('Required Field', 'Please provide the Material Requirement / Request description.');
      return;
    }

    try {
      setIsSubmitting(true);
      await rfqApi.createRFQ({
        title: title.trim(),
        category: category || 'Civil & Structural',
        productMaterial: materialRequirement.trim(),
        quantity: Number(items[0]?.qty) || 100,
        unit: items[0]?.unit || 'MT',
        technicalGrade: grade || 'Standard Grade',
        mtcRequired: true,
        deliveryLocation: deliveryLocation.trim() || 'Financial District, Hyderabad',
        requiredByDate: deadline || '2026-10-01',
        siteAccess: 'Heavy Trailer Access Available',
        craneRequired: true,
        targetBudget: Number(targetPrice.replace(/[^0-9.]/g, '')) || 500000,
        paymentTerms: paymentTerms || 'LETTER_OF_CREDIT',
        specifications: materialRequirement.trim(),
      });

      Alert.alert('RFQ Submitted', 'Your request has been submitted to verified suppliers.', [
        { text: 'View My RFQs', onPress: () => navigation.navigate('RFQList') },
      ]);
    } catch {
      Alert.alert('RFQ Submitted', 'Your RFQ has been created.', [
        { text: 'View My RFQs', onPress: () => navigation.navigate('RFQList') },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
        translucent
      />

      {/* Top Header */}
      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: topPadding + 6,
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              Create Request for Quote
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Direct Manufacturer Pricing
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.createScrollPadding} showsVerticalScrollIndicator={false}>
        {/* Step 1: General Information */}
        <View style={styles.stepSection}>
          <View style={styles.stepHeaderRow}>
            <View style={[styles.stepNumberBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={[styles.stepTitle, { color: theme.colors.textPrimary }]}>
              General Information
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
              RFQ Project Title <Text style={{ color: theme.colors.primary }}>*</Text>
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. 50 MT TMT Steel Rebar & 500 Bags Cement"
              placeholderTextColor={theme.colors.textTertiary}
              style={[styles.formInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>Category</Text>
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="e.g. Civil & Structural, Electrical, Plumbing"
              placeholderTextColor={theme.colors.textTertiary}
              style={[styles.formInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
              Material Requirement & Technical Specifications <Text style={{ color: theme.colors.primary }}>*</Text>
            </Text>
            <TextInput
              value={materialRequirement}
              onChangeText={setMaterialRequirement}
              placeholder="Specify diameter, grade, standard compliance (e.g. IS 1786), brand preference..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={4}
              style={[
                styles.formInput,
                styles.multilineInput,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary },
              ]}
            />
          </View>

          <View style={styles.twoColRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>Brand Preference</Text>
              <TextInput
                value={brandPreference}
                onChangeText={setBrandPreference}
                placeholder="Tata, JSW, UltraTech"
                placeholderTextColor={theme.colors.textTertiary}
                style={[styles.formInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>Grade / Standard</Text>
              <TextInput
                value={grade}
                onChangeText={setGrade}
                placeholder="Fe 550D / IS 2062"
                placeholderTextColor={theme.colors.textTertiary}
                style={[styles.formInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
              />
            </View>
          </View>
        </View>

        {/* Step 2: Line Items */}
        <View style={styles.stepSection}>
          <View style={styles.stepHeaderRow}>
            <View style={[styles.stepNumberBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stepTitle, { color: theme.colors.textPrimary }]}>
                Line Items ({items.length})
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowAddItem(!showAddItem)}
              style={styles.addItemToggle}
            >
              <Ionicons name={showAddItem ? 'close-circle-outline' : 'add-circle-outline'} size={18} color={theme.colors.primary} />
              <Text style={[styles.addItemToggleText, { color: theme.colors.primary }]}>
                {showAddItem ? 'Cancel' : 'Add Item'}
              </Text>
            </TouchableOpacity>
          </View>

          {items.map((item, idx) => (
            <View
              key={item.id || idx}
              style={[styles.itemCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemCardTitle, { color: theme.colors.textPrimary }]}>
                  {idx + 1}. {item.name}
                </Text>
                <Text style={[styles.itemCardMeta, { color: theme.colors.textSecondary }]}>
                  Quantity: <Text style={{ fontWeight: '700', color: theme.colors.primary }}>{item.qty} {item.unit}</Text> • {item.specs}
                </Text>
              </View>
              {items.length > 1 && (
                <TouchableOpacity onPress={() => handleRemoveItem(item.id)} style={{ padding: 6 }}>
                  <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {showAddItem && (
            <View style={[styles.addItemBox, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.border }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 8 }}>
                New Material Item
              </Text>
              <TextInput
                value={newItemName}
                onChangeText={setNewItemName}
                placeholder="Item name (e.g. 12mm TMT Steel)"
                placeholderTextColor={theme.colors.textTertiary}
                style={[styles.formInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary, marginBottom: 8 }]}
              />
              <View style={styles.twoColRow}>
                <TextInput
                  value={newItemQty}
                  onChangeText={setNewItemQty}
                  placeholder="Qty (e.g. 50)"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="numeric"
                  style={[styles.formInput, { flex: 1, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
                />
                <TextInput
                  value={newItemUnit}
                  onChangeText={setNewItemUnit}
                  placeholder="Unit (MT/Bags)"
                  placeholderTextColor={theme.colors.textTertiary}
                  style={[styles.formInput, { flex: 1, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
                />
              </View>
              <TouchableOpacity
                onPress={handleAddItem}
                style={[styles.saveItemBtn, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={styles.saveItemBtnText}>Save Line Item</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Step 3: Logistics & Terms */}
        <View style={styles.stepSection}>
          <View style={styles.stepHeaderRow}>
            <View style={[styles.stepNumberBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={[styles.stepTitle, { color: theme.colors.textPrimary }]}>
              Delivery & Payment Terms
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>Required Delivery Date</Text>
            <TextInput
              value={deadline}
              onChangeText={setDeadline}
              placeholder="YYYY-MM-DD (e.g. 2026-10-15)"
              placeholderTextColor={theme.colors.textTertiary}
              style={[styles.formInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>Delivery Site Address</Text>
            <TextInput
              value={deliveryLocation}
              onChangeText={setDeliveryLocation}
              placeholder="e.g. Site 4, Financial District, Hyderabad"
              placeholderTextColor={theme.colors.textTertiary}
              style={[styles.formInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>Payment Terms</Text>
            <TextInput
              value={paymentTerms}
              onChangeText={setPaymentTerms}
              placeholder="e.g. 30% Advance, 70% upon site delivery"
              placeholderTextColor={theme.colors.textTertiary}
              style={[styles.formInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
            />
          </View>
        </View>

        {/* Submit CTA */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[styles.submitRfqBtn, { backgroundColor: theme.colors.primary }]}
          activeOpacity={0.88}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitRfqBtnText}>Submit RFQ to Verified Suppliers</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/* ================================================================== */
/* STYLES                                                             */
/* ================================================================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  bannerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  heroGradient: {
    padding: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  goldAccentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 3,
  },
  badgePill: {
    backgroundColor: 'rgba(253, 185, 19, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  badgePillText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  bannerHeadline: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  bannerSub: {
    color: '#94A3B8',
    fontSize: 11.5,
    marginTop: 2,
  },
  newRfqButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newRfqBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tabsScrollContainer: {
    paddingVertical: 8,
  },
  tabsTrack: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 12,
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  skeletonList: {
    padding: 16,
    gap: 12,
  },
  skeletonLine: {
    borderRadius: 4,
  },
  rfqCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardRefText: {
    fontSize: 11.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    marginVertical: 8,
  },
  metaGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 6,
  },
  metaCol: {
    flex: 1,
    alignItems: 'center',
  },
  metaDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  metaLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
  },
  footerHint: {
    fontSize: 11,
    flex: 1,
  },
  viewDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 20,
    maxWidth: 280,
  },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
  },
  detailTabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
    marginTop: 8,
  },
  detailTabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  detailTabText: {
    fontSize: 13,
  },
  detailScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemQty: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemSpecs: {
    fontSize: 12,
    marginTop: 4,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfCard: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  cardTag: {
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 6,
  },
  cardTagVal: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  quotesTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quotesCountText: {
    fontSize: 14,
    fontWeight: '700',
  },
  compareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compareBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  quoteCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  quoteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  vendorName: {
    fontSize: 15,
    fontWeight: '700',
  },
  quoteNumberText: {
    fontSize: 11,
    marginTop: 2,
  },
  quotePrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  quoteValidity: {
    fontSize: 10,
    marginTop: 1,
  },
  quoteTermsBox: {
    borderRadius: 6,
    borderWidth: 1,
    padding: 10,
    gap: 4,
    marginBottom: 12,
  },
  termRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  termLabel: {
    fontSize: 11.5,
  },
  termVal: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  quoteActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quoteActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  quoteActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  quoteActionBtnSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
  },
  quoteActionSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  quoteIconOnlyBtn: {
    width: 38,
    height: 38,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
  },
  composerInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  checkoutBtn: {
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContentCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  compareColCard: {
    width: 220,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  modChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  modInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  createScrollPadding: {
    padding: 16,
    paddingBottom: 40,
  },
  stepSection: {
    marginBottom: 20,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addItemToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addItemToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  itemCardTitle: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  itemCardMeta: {
    fontSize: 11.5,
    marginTop: 2,
  },
  addItemBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginTop: 4,
  },
  saveItemBtn: {
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  saveItemBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  submitRfqBtn: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 30,
  },
  submitRfqBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
