/**
 * HINCH MART — Customer Support Tickets & Helpdesk System
 * 100% Live Backend Integration with SupportTicketController.java:
 * - Step 1: POST /api/help/tickets (Subject, Category, Priority, OrderId, Message)
 * - Step 2: GET /api/help/tickets (Status filter, pagination, newest first)
 * - Step 3: GET /api/help/tickets/{id} (Full conversation thread, chronological)
 * - Step 4: POST /api/help/tickets/{id}/messages (Reply with auto-reopen if closed)
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../theme';
import { helpApi } from '../../../services/api/help.api';
import {
  ApiSupportTicket,
  TicketMessage,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../../../types/backend.types';

// Allowed Categories according to Backend SupportTicket.java
const TICKET_CATEGORIES: Array<{
  id: TicketCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: 'DELIVERY', label: 'Delivery & Logistics', icon: 'car-outline' },
  { id: 'PAYMENT', label: 'Payment & Billing', icon: 'card-outline' },
  { id: 'QUALITY', label: 'Product Quality', icon: 'shield-checkmark-outline' },
  { id: 'RFQ', label: 'Custom RFQ / Quote', icon: 'document-text-outline' },
  { id: 'TECHNICAL', label: 'App / Technical', icon: 'hardware-chip-outline' },
  { id: 'GENERAL', label: 'General Inquiry', icon: 'help-circle-outline' },
];

const TICKET_PRIORITIES: Array<{
  id: TicketPriority;
  label: string;
  color: string;
  bgColor: string;
}> = [
  { id: 'LOW', label: 'Low', color: '#64748B', bgColor: '#F1F5F9' },
  { id: 'MEDIUM', label: 'Medium', color: '#2563EB', bgColor: '#EFF6FF' },
  { id: 'HIGH', label: 'High', color: '#D97706', bgColor: '#FEF3C7' },
  { id: 'URGENT', label: 'Urgent', color: '#DC2626', bgColor: '#FEE2E2' },
];

const STATUS_TABS: Array<{ label: string; value: string }> = [
  { label: 'All Tickets', value: '' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
];

export function SupportTicketsScreen({ route, navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const initialOrderId = route?.params?.orderId || null;

  // Tickets List State
  const [tickets, setTickets] = useState<ApiSupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create Ticket Modal State
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(
    Boolean(initialOrderId)
  );
  const [newCategory, setNewCategory] = useState<TicketCategory>(
    initialOrderId ? 'DELIVERY' : 'GENERAL'
  );
  const [newPriority, setNewPriority] = useState<TicketPriority>('MEDIUM');
  const [newOrderId, setNewOrderId] = useState<string>(
    initialOrderId ? String(initialOrderId) : ''
  );
  const [newSubject, setNewSubject] = useState<string>(
    initialOrderId ? `Issue regarding Order #${initialOrderId}` : ''
  );
  const [newMessage, setNewMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Thread / Chat Modal State
  const [threadModalVisible, setThreadModalVisible] = useState<boolean>(false);
  const [activeTicket, setActiveTicket] = useState<ApiSupportTicket | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState<boolean>(false);
  const [replyText, setReplyText] = useState<string>('');
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
  const [isSendingReply, setIsSendingReply] = useState<boolean>(false);

  const chatScrollRef = useRef<ScrollView>(null);
  const formScrollRef = useRef<ScrollView>(null);
  const subjectInputRef = useRef<TextInput>(null);
  const orderIdInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);

  const isFormDirty = useMemo(() => {
    const defaultSub = initialOrderId ? `Issue regarding Order #${initialOrderId}` : '';
    const defaultOrd = initialOrderId ? String(initialOrderId) : '';
    const defaultCat = initialOrderId ? 'DELIVERY' : 'GENERAL';
    const defaultPrio = 'MEDIUM';

    return (
      newSubject.trim() !== defaultSub ||
      newMessage.trim() !== '' ||
      newOrderId.trim() !== defaultOrd ||
      newCategory !== defaultCat ||
      newPriority !== defaultPrio
    );
  }, [newSubject, newMessage, newOrderId, newCategory, newPriority, initialOrderId]);

  const resetFormState = useCallback(() => {
    setNewCategory(initialOrderId ? 'DELIVERY' : 'GENERAL');
    setNewPriority('MEDIUM');
    setNewOrderId(initialOrderId ? String(initialOrderId) : '');
    setNewSubject(initialOrderId ? `Issue regarding Order #${initialOrderId}` : '');
    setNewMessage('');
  }, [initialOrderId]);

  const handlePromptCloseCreateModal = useCallback(() => {
    if (isFormDirty) {
      Alert.alert(
        'Discard Ticket Draft?',
        'You have unsaved changes in your support ticket form. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              resetFormState();
              setCreateModalVisible(false);
            },
          },
        ]
      );
    } else {
      resetFormState();
      setCreateModalVisible(false);
    }
  }, [isFormDirty, resetFormState]);

  const fetchTickets = useCallback(
    async (refresh = false) => {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const params: any = { limit: 50 };
        if (selectedStatus) params.status = selectedStatus;
        const res = await helpApi.listTickets(params);
        setTickets(res || []);
      } catch (err: any) {
        console.warn('[SupportTicketsScreen] fetch error:', err?.message);
        setTickets([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedStatus]
  );

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets;
    const q = searchQuery.toLowerCase().trim();
    return tickets.filter(
      (t) =>
        t.ticketNumber?.toLowerCase().includes(q) ||
        t.subject?.toLowerCase().includes(q) ||
        String(t.orderId || '').includes(q) ||
        t.category?.toLowerCase().includes(q)
    );
  }, [tickets, searchQuery]);

  // Open Chat Thread
  const handleOpenThread = async (ticket: ApiSupportTicket) => {
    setActiveTicket(ticket);
    setThreadModalVisible(true);
    setIsLoadingThread(true);
    const tId = ticket.ticketId || ticket.id;
    if (tId) {
      try {
        const details = await helpApi.getTicketDetails(tId);
        if (details) setActiveTicket(details);
      } catch (err) {
        console.warn('[handleOpenThread] Failed to load details:', err);
      } finally {
        setIsLoadingThread(false);
      }
    } else {
      setIsLoadingThread(false);
    }
  };

  // Submit New Ticket
  const handleCreateTicket = async () => {
    if (!newSubject.trim()) {
      Alert.alert('Subject Required', 'Please enter a brief subject for your ticket.');
      formScrollRef.current?.scrollTo({ y: 140, animated: true });
      subjectInputRef.current?.focus();
      return;
    }
    if (!newMessage.trim()) {
      Alert.alert('Message Required', 'Please enter the details of your inquiry.');
      formScrollRef.current?.scrollToEnd({ animated: true });
      descriptionInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await helpApi.createTicket({
        subject: newSubject.trim(),
        category: newCategory,
        priority: newPriority,
        orderId: newOrderId.trim() ? Number(newOrderId.trim()) || newOrderId.trim() : undefined,
        message: newMessage.trim(),
        description: newMessage.trim(),
      });

      resetFormState();
      setCreateModalVisible(false);

      Alert.alert(
        'Ticket Created',
        `Your support ticket #${created?.ticketNumber || 'NEW'} has been successfully created. Our logistics desk will respond shortly.`
      );
      await fetchTickets(true);
    } catch (err: any) {
      Alert.alert(
        'Submission Error',
        err?.response?.data?.message || err?.message || 'Could not submit ticket.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pick Attachment Image
  const handlePickAttachment = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Permission to access media library is required.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setAttachmentUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Image Error', 'Could not select photo.');
    }
  };

  // Send Reply in Thread
  const handleSendReply = async () => {
    const tId = activeTicket?.ticketId || activeTicket?.id;
    if (!tId || (!replyText.trim() && !attachmentUri) || isSendingReply) return;

    setIsSendingReply(true);
    const contentToSend = replyText.trim();
    const currentAttachment = attachmentUri;

    try {
      await helpApi.replyTicket(tId, {
        content: contentToSend,
        attachmentUrl: currentAttachment,
      });

      setReplyText('');
      setAttachmentUri(null);

      // Re-fetch details to see newly appended message and auto-reopened status if closed
      const refreshed = await helpApi.getTicketDetails(tId);
      if (refreshed) {
        setActiveTicket(refreshed);
      }
      fetchTickets(true);

      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 300);
    } catch (err: any) {
      Alert.alert('Reply Failed', err?.response?.data?.message || 'Could not send reply.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || 'OPEN').toUpperCase();
    switch (s) {
      case 'OPEN':
        return { label: 'Open', color: '#D97706', bg: '#FEF3C7' };
      case 'IN_PROGRESS':
        return { label: 'In Progress', color: '#2563EB', bg: '#DBEAFE' };
      case 'RESOLVED':
        return { label: 'Resolved', color: '#16A34A', bg: '#DCFCE7' };
      case 'CLOSED':
        return { label: 'Closed', color: '#64748B', bg: '#F1F5F9' };
      default:
        return { label: s, color: '#D97706', bg: '#FEF3C7' };
    }
  };

  const getPriorityBadge = (priority?: string) => {
    const p = (priority || 'MEDIUM').toUpperCase();
    const found = TICKET_PRIORITIES.find((tp) => tp.id === p);
    return found || { id: 'MEDIUM', label: 'Medium', color: '#2563EB', bgColor: '#EFF6FF' };
  };

  const topPadding =
    Math.max(
      insets.top,
      Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20
    ) + 6;

  // Render individual ticket card
  const renderTicketCard = ({ item }: { item: ApiSupportTicket }) => {
    const statusInfo = getStatusBadge(item.status);
    const priorityInfo = getPriorityBadge(item.priority);
    const dateFormatted = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Recent';

    const categoryItem = TICKET_CATEGORIES.find((c) => c.id === item.category);

    return (
      <TouchableOpacity
        onPress={() => handleOpenThread(item)}
        activeOpacity={0.85}
        style={[
          styles.ticketCard,
          {
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.cardBorder,
          },
        ]}
      >
        {/* Card Header: Ticket Number & Status */}
        <View style={styles.cardHeader}>
          <View style={styles.ticketNumWrap}>
            <Ionicons name="chatbubbles-outline" size={15} color="#E31E24" />
            <Text style={styles.ticketNumText}>
              {item.ticketNumber || `TKT-${item.ticketId || item.id}`}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* Subject & Description */}
        <Text
          style={[styles.ticketSubject, { color: theme.colors.textPrimary }]}
          numberOfLines={2}
        >
          {item.subject}
        </Text>
        <Text
          style={[styles.ticketDesc, { color: theme.colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.description || item.lastMessage || 'No recent messages'}
        </Text>

        {/* Metadata Chips: Category, Priority, Order ID */}
        <View style={styles.metaRow}>
          <View style={styles.categoryChip}>
            <Ionicons
              name={categoryItem?.icon || 'help-circle-outline'}
              size={12}
              color="#0F172A"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.categoryChipText}>
              {categoryItem?.label || item.category || 'General'}
            </Text>
          </View>

          <View style={[styles.priorityChip, { backgroundColor: priorityInfo.bgColor }]}>
            <Text style={[styles.priorityChipText, { color: priorityInfo.color }]}>
              {priorityInfo.label}
            </Text>
          </View>

          {Boolean(item.orderId) && (
            <View style={styles.orderChip}>
              <Ionicons name="cart-outline" size={11} color="#0038A8" style={{ marginRight: 3 }} />
              <Text style={styles.orderChipText}>Order #{item.orderId}</Text>
            </View>
          )}
        </View>

        {/* Card Footer: Timestamp & Action */}
        <View style={[styles.cardFooter, { borderTopColor: theme.colors.cardBorder }]}>
          <Text style={[styles.dateText, { color: theme.colors.textTertiary }]}>
            Logged on {dateFormatted}
          </Text>
          <View style={styles.threadLink}>
            <Text style={styles.threadLinkText}>View Thread</Text>
            <Ionicons name="arrow-forward" size={13} color="#E31E24" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#E31E24" translucent />

      {/* Top Navbar */}
      <View style={[styles.topBar, { paddingTop: topPadding }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.topBarTitleCol}>
          <Text style={styles.topBarTitle}>Support Tickets</Text>
          <Text style={styles.topBarSubtitle}>Logistics & Procurement Helpdesk</Text>
        </View>
        <TouchableOpacity
          onPress={() => setCreateModalVisible(true)}
          style={styles.newTicketTopBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#E31E24" />
          <Text style={styles.newTicketTopText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.cardBorder,
          },
        ]}
      >
        <Ionicons name="search-outline" size={17} color="#94A3B8" />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          placeholder="Search by ticket #, subject, or order..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {Boolean(searchQuery) && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filter Chips */}
      <View style={styles.tabsRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_TABS}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.tabsScroll}
          renderItem={({ item }) => {
            const isSelected = selectedStatus === item.value;
            return (
              <TouchableOpacity
                onPress={() => setSelectedStatus(item.value)}
                style={[
                  styles.tabChip,
                  isSelected
                    ? styles.tabChipActive
                    : [
                        styles.tabChipInactive,
                        {
                          backgroundColor: theme.colors.cardBackground,
                          borderColor: theme.colors.cardBorder,
                        },
                      ],
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    isSelected
                      ? styles.tabChipTextActive
                      : [styles.tabChipTextInactive, { color: theme.colors.textSecondary }],
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Tickets List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#E31E24" />
          <Text style={[styles.loadingNotice, { color: theme.colors.textSecondary }]}>
            Loading support tickets...
          </Text>
        </View>
      ) : filteredTickets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="chatbox-ellipses-outline" size={44} color="#E31E24" />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
            No Support Tickets
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>
            {searchQuery
              ? `No tickets match "${searchQuery}"`
              : 'Have an issue with delivery, materials, or billing? Raise a support ticket for immediate resolution.'}
          </Text>
          <TouchableOpacity
            style={styles.emptyCreateBtn}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={17} color="#FFFFFF" />
            <Text style={styles.emptyCreateBtnText}>Create Support Ticket</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredTickets}
          keyExtractor={(item) => String(item.ticketId || item.id || item.ticketNumber)}
          renderItem={renderTicketCard}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchTickets(true)}
              colors={['#E31E24']}
              tintColor="#E31E24"
            />
          }
        />
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. FULL-SCREEN CREATE TICKET MODAL                           */}
      {/* ──────────────────────────────────────────────────────────── */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={handlePromptCloseCreateModal}
      >
        <View style={[styles.fullScreenContainer, { backgroundColor: theme.colors.background }]}>
          <StatusBar barStyle="light-content" backgroundColor="#E31E24" translucent />

          {/* Sticky Full-Screen Header */}
          <View style={[styles.fullScreenHeader, { paddingTop: topPadding }]}>
            <TouchableOpacity
              onPress={handlePromptCloseCreateModal}
              style={styles.fullScreenBackBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.fullScreenHeaderTitleCol}>
              <Text style={styles.fullScreenHeaderTitle}>New Support Ticket</Text>
              <Text style={styles.fullScreenHeaderSubtitle}>
                Logistics & Procurement Helpdesk
              </Text>
            </View>
            <TouchableOpacity
              onPress={handlePromptCloseCreateModal}
              style={styles.fullScreenHeaderCloseBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Keyboard-Aware Form Body */}
          <KeyboardAvoidingView
            style={styles.fullScreenKeyboardAvoid}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              ref={formScrollRef}
              style={styles.fullScreenScroll}
              contentContainerStyle={[
                styles.fullScreenScrollContent,
                { paddingBottom: Math.max(insets.bottom, 24) + 60 },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Context Banner */}
              <View
                style={[
                  styles.formInfoBanner,
                  {
                    backgroundColor: theme.colors.cardBackground,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
              >
                <View style={styles.formInfoBannerIconWrap}>
                  <Ionicons name="shield-checkmark" size={18} color="#E31E24" />
                </View>
                <View style={styles.formInfoBannerTextCol}>
                  <Text style={[styles.formInfoBannerTitle, { color: theme.colors.textPrimary }]}>
                    Dedicated Helpdesk Resolution
                  </Text>
                  <Text style={[styles.formInfoBannerDesc, { color: theme.colors.textSecondary }]}>
                    Direct escalation to dispatch yards, material suppliers, and accounts for prompt settlement.
                  </Text>
                </View>
              </View>

              {/* Form Card */}
              <View
                style={[
                  styles.formCard,
                  {
                    backgroundColor: theme.colors.cardBackground,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
              >
                {/* Category Picker */}
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                  Issue Category *
                </Text>
                <View style={styles.categoryGrid}>
                  {TICKET_CATEGORIES.map((cat) => {
                    const isSelected = newCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setNewCategory(cat.id)}
                        style={[
                          styles.categoryOption,
                          isSelected
                            ? styles.categoryOptionActive
                            : [styles.categoryOptionInactive, { borderColor: theme.colors.cardBorder }],
                        ]}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={cat.icon}
                          size={15}
                          color={isSelected ? '#E31E24' : '#64748B'}
                        />
                        <Text
                          style={[
                            styles.categoryOptionText,
                            isSelected
                              ? styles.categoryOptionTextActive
                              : { color: theme.colors.textPrimary },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Priority Picker */}
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary, marginTop: 16 }]}>
                  Urgency / Priority *
                </Text>
                <View style={styles.priorityRow}>
                  {TICKET_PRIORITIES.map((p) => {
                    const isSelected = newPriority === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => setNewPriority(p.id)}
                        style={[
                          styles.priorityOption,
                          isSelected
                            ? { backgroundColor: p.color, borderColor: p.color }
                            : [styles.priorityOptionInactive, { borderColor: theme.colors.cardBorder }],
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.priorityOptionText,
                            isSelected ? { color: '#FFFFFF' } : { color: theme.colors.textPrimary },
                          ]}
                        >
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Subject */}
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary, marginTop: 16 }]}>
                  Subject *
                </Text>
                <TextInput
                  ref={subjectInputRef}
                  value={newSubject}
                  onChangeText={setNewSubject}
                  placeholder="e.g. Delayed order delivery or unloading issue"
                  placeholderTextColor="#94A3B8"
                  returnKeyType="next"
                  onSubmitEditing={() => orderIdInputRef.current?.focus()}
                  blurOnSubmit={false}
                  style={[
                    styles.textInput,
                    {
                      color: theme.colors.textPrimary,
                      borderColor: theme.colors.cardBorder,
                      backgroundColor: theme.colors.surfaceVariant,
                    },
                  ]}
                />

                {/* Associated Order ID (Optional) */}
                <View style={styles.fieldHeaderRow}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary, marginTop: 16 }]}>
                    Order Number / ID (Optional)
                  </Text>
                  <Text style={[styles.fieldOptionalHint, { color: theme.colors.textTertiary, marginTop: 16 }]}>
                    Recommended for dispatch issues
                  </Text>
                </View>
                <TextInput
                  ref={orderIdInputRef}
                  value={newOrderId}
                  onChangeText={setNewOrderId}
                  placeholder="e.g. 105 or ORD-2026-0001"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  returnKeyType="next"
                  onSubmitEditing={() => descriptionInputRef.current?.focus()}
                  blurOnSubmit={false}
                  style={[
                    styles.textInput,
                    {
                      color: theme.colors.textPrimary,
                      borderColor: theme.colors.cardBorder,
                      backgroundColor: theme.colors.surfaceVariant,
                    },
                  ]}
                />

                {/* Detailed Message */}
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary, marginTop: 16 }]}>
                  Detailed Description *
                </Text>
                <TextInput
                  ref={descriptionInputRef}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  multiline
                  numberOfLines={5}
                  scrollEnabled={false}
                  placeholder="Describe your issue, site gate details, or contact person at site..."
                  placeholderTextColor="#94A3B8"
                  textAlignVertical="top"
                  style={[
                    styles.textArea,
                    {
                      color: theme.colors.textPrimary,
                      borderColor: theme.colors.cardBorder,
                      backgroundColor: theme.colors.surfaceVariant,
                    },
                  ]}
                />

                {/* Submit CTA */}
                <TouchableOpacity
                  onPress={handleCreateTicket}
                  disabled={isSubmitting}
                  style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                  activeOpacity={0.85}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>Submit Support Request</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. CHAT / THREAD CONVERSATION MODAL                         */}
      {/* ──────────────────────────────────────────────────────────── */}
      <Modal
        visible={threadModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setThreadModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.chatSheet,
              {
                backgroundColor: theme.colors.cardBackground,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            {/* Chat Header */}
            <View style={styles.chatHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.chatHeaderBadgeRow}>
                  <Text style={styles.chatTicketNum}>
                    {activeTicket?.ticketNumber || `TKT-${activeTicket?.ticketId || activeTicket?.id}`}
                  </Text>
                  {Boolean(activeTicket?.orderId) && (
                    <View style={styles.chatOrderChip}>
                      <Text style={styles.chatOrderChipText}>
                        Order #{activeTicket?.orderId}
                      </Text>
                    </View>
                  )}
                  {Boolean(activeTicket?.status) && (
                    <View
                      style={[
                        styles.chatStatusPill,
                        { backgroundColor: getStatusBadge(activeTicket?.status).bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chatStatusPillText,
                          { color: getStatusBadge(activeTicket?.status).color },
                        ]}
                      >
                        {getStatusBadge(activeTicket?.status).label}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[styles.chatSubject, { color: theme.colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {activeTicket?.subject}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setThreadModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Auto-reopen Warning Banner if Closed */}
            {activeTicket?.status === 'CLOSED' && (
              <View style={styles.closedBanner}>
                <Ionicons name="information-circle" size={14} color="#0038A8" />
                <Text style={styles.closedBannerText}>
                  This ticket is closed. Replying will automatically reopen it to In Progress.
                </Text>
              </View>
            )}

            {/* Messages Scroll Thread */}
            {isLoadingThread ? (
              <View style={styles.centered}>
                <ActivityIndicator size="small" color="#E31E24" />
                <Text style={styles.loadingThreadText}>Loading conversation...</Text>
              </View>
            ) : (
              <ScrollView
                ref={chatScrollRef}
                style={styles.chatMessagesArea}
                contentContainerStyle={styles.chatMessagesContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: false })}
              >
                {/* Initial Description from Ticket Creator */}
                {Boolean(activeTicket?.description) && (
                  <View style={styles.bubbleUser}>
                    <Text style={styles.bubbleSenderName}>You (Original Request)</Text>
                    <Text style={styles.bubbleContent}>{activeTicket?.description}</Text>
                    <Text style={styles.bubbleTimestamp}>
                      {activeTicket?.createdAt
                        ? new Date(activeTicket.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </Text>
                  </View>
                )}

                {/* Thread Messages */}
                {activeTicket?.messages && activeTicket.messages.length > 0 ? (
                  activeTicket.messages.map((msg: TicketMessage, idx: number) => {
                    const isUser =
                      msg.senderRole === 'USER' ||
                      msg.senderType === 'USER' ||
                      msg.senderType === 'CUSTOMER';
                    const timeStr = msg.timestamp || msg.sentAt || msg.createdAt;
                    const formattedTime = timeStr
                      ? new Date(timeStr).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';

                    if (isUser) {
                      return (
                        <View key={String(msg.messageId || msg.id || idx)} style={styles.bubbleUser}>
                          <Text style={styles.bubbleSenderName}>
                            {msg.senderName || 'You'}
                          </Text>
                          <Text style={styles.bubbleContent}>
                            {msg.content || msg.message}
                          </Text>
                          {Boolean(msg.attachmentUrl) && (
                            <Image
                              source={{ uri: msg.attachmentUrl! }}
                              style={styles.attachmentThumb}
                              contentFit="cover"
                            />
                          )}
                          <Text style={styles.bubbleTimestamp}>{formattedTime}</Text>
                        </View>
                      );
                    }

                    // Support Agent message
                    return (
                      <View key={String(msg.messageId || msg.id || idx)} style={styles.bubbleAgent}>
                        <View style={styles.agentTagRow}>
                          <Ionicons name="headset" size={13} color="#E31E24" />
                          <Text style={styles.agentSenderName}>
                            {msg.senderName || 'HinchMart Support Desk'}
                          </Text>
                        </View>
                        <Text style={styles.bubbleAgentContent}>
                          {msg.content || msg.message}
                        </Text>
                        {Boolean(msg.attachmentUrl) && (
                          <Image
                            source={{ uri: msg.attachmentUrl! }}
                            style={styles.attachmentThumb}
                            contentFit="cover"
                          />
                        )}
                        <Text style={styles.bubbleAgentTimestamp}>{formattedTime}</Text>
                      </View>
                    );
                  })
                ) : null}
              </ScrollView>
            )}

            {/* Attached preview */}
            {attachmentUri && (
              <View style={styles.attachmentPreviewRow}>
                <Image source={{ uri: attachmentUri }} style={styles.previewImage} />
                <Text style={styles.previewText} numberOfLines={1}>
                  Photo attached
                </Text>
                <TouchableOpacity onPress={() => setAttachmentUri(null)}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}

            {/* Reply Input Bar */}
            <View
              style={[
                styles.replyBar,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderTopColor: theme.colors.cardBorder,
                },
              ]}
            >
              <TouchableOpacity
                onPress={handlePickAttachment}
                style={styles.attachBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-outline" size={20} color="#64748B" />
              </TouchableOpacity>

              <TextInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Type your reply to support..."
                placeholderTextColor="#94A3B8"
                style={[styles.replyInput, { color: theme.colors.textPrimary }]}
                multiline
                maxLength={1000}
              />

              <TouchableOpacity
                onPress={handleSendReply}
                disabled={isSendingReply || (!replyText.trim() && !attachmentUri)}
                style={[
                  styles.sendBtn,
                  (!replyText.trim() && !attachmentUri) && { opacity: 0.5 },
                ]}
                activeOpacity={0.8}
              >
                {isSendingReply ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={16} color="#FFFFFF" />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E31E24',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 10,
  },
  topBarTitleCol: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topBarSubtitle: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
  },
  newTicketTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  newTicketTopText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E31E24',
  },

  /* Search */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
    paddingVertical: 0,
  },

  /* Status Tabs */
  tabsRow: {
    marginBottom: 10,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabChipActive: {
    backgroundColor: '#E31E24',
    borderColor: '#E31E24',
  },
  tabChipInactive: {},
  tabChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
  },
  tabChipTextInactive: {},

  /* Tickets List */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 12,
  },
  ticketCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketNumWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  ticketNumText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#E31E24',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  ticketSubject: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 19,
  },
  ticketDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },

  /* Metadata row */
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryChipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  priorityChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityChipText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  orderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0038A8',
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  dateText: {
    fontSize: 11,
  },
  threadLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  threadLinkText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#E31E24',
  },

  /* Empty State */
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E31E24',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 8,
  },
  emptyCreateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingNotice: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '500',
  },

  /* ── Modal Common (Thread Chat) ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Full-Screen Create Ticket Form ── */
  fullScreenContainer: {
    flex: 1,
  },
  fullScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E31E24',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  fullScreenBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 10,
  },
  fullScreenHeaderTitleCol: {
    flex: 1,
  },
  fullScreenHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fullScreenHeaderSubtitle: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
  },
  fullScreenHeaderCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  fullScreenKeyboardAvoid: {
    flex: 1,
  },
  fullScreenScroll: {
    flex: 1,
  },
  fullScreenScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  formInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
    gap: 10,
  },
  formInfoBannerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formInfoBannerTextCol: {
    flex: 1,
  },
  formInfoBannerTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  formInfoBannerDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  formCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },

  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldOptionalHint: {
    fontSize: 11,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  categoryOptionActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#E31E24',
  },
  categoryOptionInactive: {
    backgroundColor: '#F8FAFC',
  },
  categoryOptionText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  categoryOptionTextActive: {
    color: '#E31E24',
    fontWeight: '700',
  },

  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  priorityOptionInactive: {
    backgroundColor: '#F8FAFC',
  },
  priorityOptionText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  textInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  textArea: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E31E24',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 22,
    marginBottom: 6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ── Chat Modal ── */
  chatSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '88%',
    display: 'flex',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  chatHeaderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  chatTicketNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E31E24',
  },
  chatOrderChip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chatOrderChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  chatStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chatStatusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  chatSubject: {
    fontSize: 13.5,
    fontWeight: '700',
  },

  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  closedBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#0038A8',
    fontWeight: '500',
  },

  chatMessagesArea: {
    flex: 1,
  },
  chatMessagesContent: {
    padding: 16,
    gap: 12,
  },
  loadingThreadText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748B',
  },

  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderTopRightRadius: 2,
    padding: 12,
    maxWidth: '82%',
  },
  bubbleSenderName: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 3,
  },
  bubbleContent: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  bubbleTimestamp: {
    fontSize: 9.5,
    color: '#94A3B8',
    alignSelf: 'flex-end',
    marginTop: 4,
  },

  bubbleAgent: {
    alignSelf: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderTopLeftRadius: 2,
    padding: 12,
    maxWidth: '84%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  agentTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  agentSenderName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E31E24',
  },
  bubbleAgentContent: {
    fontSize: 13,
    color: '#0F172A',
    lineHeight: 18,
  },
  bubbleAgentTimestamp: {
    fontSize: 9.5,
    color: '#94A3B8',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  attachmentThumb: {
    width: 140,
    height: 100,
    borderRadius: 8,
    marginTop: 6,
  },

  attachmentPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#FEF2F2',
    gap: 8,
  },
  previewImage: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  previewText: {
    flex: 1,
    fontSize: 11,
    color: '#E31E24',
    fontWeight: '600',
  },

  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  replyInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E31E24',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
