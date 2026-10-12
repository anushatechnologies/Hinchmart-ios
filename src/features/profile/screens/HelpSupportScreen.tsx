/**
 * HINCH MART — Help & Support Screen
 * Enterprise B2B Procurement Helpdesk & Logistics Support
 * 
 * Features:
 * - 24/7 Procurement Assistance Header (Clean alignment & safe-area insets)
 * - Instant Phone Assistance Card (Theme-matching surface, full-width touch target)
 * - Quick Support Action Cards (Email Support Desk & FAQs with consistent spacing & chevrons)
 * - Procurement Tickets Desk (Responsive header & actions row — prevents clipping on narrow screens)
 * - Centered "No Open Tickets" Empty State & Real Ticket List
 * - Built-in Create Support Ticket Modal & Ticket Thread Conversation Modal
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme';
import { helpApi } from '../../../services/api/help.api';
import { ApiSupportTicket, TicketCategory } from '../../../types/backend.types';

export function HelpSupportScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isTabletOrDesktop = windowWidth >= 600;

  // Support Tickets State
  const [tickets, setTickets] = useState<ApiSupportTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [threadModalVisible, setThreadModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ApiSupportTicket | null>(null);

  // Form State
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<TicketCategory>('GENERAL');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Reply State
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const loadTickets = useCallback(async () => {
    setIsLoadingTickets(true);
    try {
      const data = await helpApi.listTickets({ limit: 20 });
      if (Array.isArray(data)) {
        setTickets(data);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleCall = () => {
    Linking.openURL('tel:+918388899999');
  };

  const handleEmail = () => {
    Linking.openURL('mailto:support@hinchmart.com?subject=HINCH%20MART%20Support%20Inquiry');
  };

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newDescription.trim()) {
      Alert.alert('Incomplete Ticket', 'Please provide a subject line and description of your inquiry.');
      return;
    }
    setIsSubmittingTicket(true);
    try {
      await helpApi.createTicket({
        subject: newSubject.trim(),
        category: newCategory,
        description: newDescription.trim(),
        message: newDescription.trim(),
      });
      setCreateModalVisible(false);
      setNewSubject('');
      setNewDescription('');
      Alert.alert(
        'Ticket Created',
        'Your support request has been logged. An engineering/logistics specialist will respond shortly.'
      );
      await loadTickets();
    } catch (err: any) {
      Alert.alert('Ticket Error', err?.response?.data?.message || err?.message || 'Unable to submit ticket.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const handleOpenTicketThread = async (ticket: ApiSupportTicket) => {
    setSelectedTicket(ticket);
    setThreadModalVisible(true);
    const ticketId = ticket.ticketId || ticket.id;
    if (ticketId) {
      try {
        const details = await helpApi.getTicketDetails(ticketId);
        if (details) {
          setSelectedTicket(details);
        }
      } catch {}
    }
  };

  const handleSendReply = async () => {
    const ticketId = selectedTicket?.ticketId || selectedTicket?.id;
    if (!ticketId || !replyMessage.trim() || isReplying) return;
    setIsReplying(true);
    try {
      await helpApi.replyTicket(ticketId, { message: replyMessage.trim() });
      setReplyMessage('');
      const refreshed = await helpApi.getTicketDetails(ticketId);
      if (refreshed) {
        setSelectedTicket(refreshed);
      }
      loadTickets();
    } catch (err: any) {
      Alert.alert('Reply Failed', err?.response?.data?.message || err?.message || 'Unable to post reply.');
    } finally {
      setIsReplying(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'RESOLVED':
      case 'CLOSED':
        return { text: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' };
      case 'IN_PROGRESS':
        return { text: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' };
      default:
        return { text: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' };
    }
  };

  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
        translucent
      />

      {/* ── 1. COMPACT STANDARDIZED HEADER ── */}
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
            onPress={() => navigation.goBack()}
            style={[
              styles.headerIconBtn,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9' },
            ]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextCol}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              Help & Support
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              24/7 Procurement Assistance
            </Text>
          </View>
        </View>
      </View>

      {/* ── 2. MAIN SCROLLABLE CONTENT ── */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollPadding,
          {
            paddingHorizontal: isTabletOrDesktop ? Math.max((windowWidth - 720) / 2, 24) : 16,
            paddingBottom: Math.max(insets.bottom, 24) + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Instant Phone Assistance Card */}
        <View
          style={[
            styles.assistanceCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.assistanceHeaderRow}>
            <View
              style={[
                styles.assistanceIconBox,
                { backgroundColor: isDark ? 'rgba(227, 30, 36, 0.15)' : '#FEF2F2' },
              ]}
            >
              <Ionicons name="call" size={22} color="#E31E24" />
            </View>
            <View style={styles.assistanceTextCol}>
              <Text style={[styles.assistanceTitle, { color: theme.colors.textPrimary }]}>
                Need Instant Assistance?
              </Text>
              <Text style={[styles.assistanceSubtitle, { color: theme.colors.textSecondary }]}>
                Our dedicated procurement desk is active 24/7.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleCall}
            style={styles.callNowBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Call support at +91 8388899999"
          >
            <Ionicons name="call" size={16} color="#FFFFFF" />
            <Text style={styles.callNowBtnText}>Call Us Now: +91 8388899999</Text>
            <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Quick Support Action Cards: Email & FAQs */}
        <View style={styles.quickActionsWrap}>
          {/* Email Support Card */}
          <TouchableOpacity
            onPress={handleEmail}
            style={[
              styles.actionCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Send email to support@hinchmart.com"
          >
            <View
              style={[
                styles.actionIconBox,
                { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF' },
              ]}
            >
              <Ionicons name="mail" size={20} color="#2563EB" />
            </View>
            <View style={styles.actionTextCol}>
              <Text style={[styles.actionTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                Email Support Desk
              </Text>
              <Text style={[styles.actionSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                support@hinchmart.com
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          {/* FAQs Option Card */}
          <TouchableOpacity
            onPress={() => navigation.navigate('FAQ')}
            style={[
              styles.actionCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="View Frequently Asked Questions"
          >
            <View
              style={[
                styles.actionIconBox,
                { backgroundColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7' },
              ]}
            >
              <Ionicons name="help-circle" size={22} color="#D97706" />
            </View>
            <View style={styles.actionTextCol}>
              <Text style={[styles.actionTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                Frequently Asked Questions
              </Text>
              <Text style={[styles.actionSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                Orders, payments & delivery answers
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* ── 3. PROCUREMENT TICKETS DESK (RESPONSIVE NON-CLIPPING SECTION) ── */}
        <View style={styles.ticketsSectionWrap}>
          {isTabletOrDesktop ? (
            /* Tablet/Desktop Horizontal Layout */
            <View style={styles.deskHeaderDesktopRow}>
              <View style={styles.deskTitleCol}>
                <Text style={[styles.deskSectionTitle, { color: theme.colors.textPrimary }]}>
                  Procurement Tickets Desk
                </Text>
                <Text style={[styles.deskSectionSubtitle, { color: theme.colors.textSecondary }]}>
                  Official resolution tracking with Hinch Mart logistics.
                </Text>
              </View>
              <View style={styles.deskActionsDesktopRow}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('SupportTickets')}
                  style={[
                    styles.viewAllBtn,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="View all support tickets"
                >
                  <Ionicons name="list-outline" size={15} color={theme.colors.textPrimary} />
                  <Text style={[styles.viewAllBtnText, { color: theme.colors.textPrimary }]}>View All</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCreateModalVisible(true)}
                  style={styles.newTicketBtn}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Create a new support ticket"
                >
                  <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.newTicketBtnText}>New Ticket</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Mobile 2-Row Layout — Solves clipping completely */
            <View style={styles.deskHeaderMobileWrap}>
              <View style={styles.deskTitleCol}>
                <Text style={[styles.deskSectionTitle, { color: theme.colors.textPrimary }]}>
                  Procurement Tickets Desk
                </Text>
                <Text style={[styles.deskSectionSubtitle, { color: theme.colors.textSecondary }]}>
                  Official resolution tracking with Hinch Mart logistics.
                </Text>
              </View>

              <View style={styles.deskActionsMobileRow}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('SupportTickets')}
                  style={[
                    styles.viewAllBtnMobile,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="View all support tickets"
                >
                  <Ionicons name="list-outline" size={14} color={theme.colors.textPrimary} />
                  <Text style={[styles.viewAllBtnText, { color: theme.colors.textPrimary }]}>View All</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCreateModalVisible(true)}
                  style={styles.newTicketBtnMobile}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Create a new support ticket"
                >
                  <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.newTicketBtnText}>New Ticket</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Tickets Loading Indicator */}
          {isLoadingTickets ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#E31E24" size="small" />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading support tickets...
              </Text>
            </View>
          ) : tickets.length === 0 ? (
            /* Centered Balanced Empty State */
            <View
              style={[
                styles.emptyStateCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC' },
                ]}
              >
                <Ionicons name="ticket-outline" size={26} color={theme.colors.textTertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No Open Tickets</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Need help with a material delivery or freight logistics? Open a support ticket.
              </Text>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(true)}
                style={[
                  styles.raiseInquiryBtn,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.border,
                  },
                ]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Raise a new support inquiry"
              >
                <Ionicons name="add" size={16} color={theme.colors.textPrimary} />
                <Text style={[styles.raiseInquiryBtnText, { color: theme.colors.textPrimary }]}>
                  Raise New Inquiry
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Real Active Tickets List */
            tickets.map((t, idx) => {
              const sc = getStatusColor(t.status);
              return (
                <TouchableOpacity
                  key={String(t.ticketId || t.id || idx)}
                  onPress={() => handleOpenTicketThread(t)}
                  activeOpacity={0.8}
                  style={[
                    styles.ticketCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Ticket ${t.id || t.ticketId}: ${t.subject}`}
                >
                  <View style={styles.ticketCardTopRow}>
                    <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: sc.text }]}>
                        {t.status || 'OPEN'}
                      </Text>
                    </View>
                    <Text style={[styles.categoryBadgeText, { color: theme.colors.textTertiary }]}>
                      {t.category ? t.category.replace('_', ' ') : 'GENERAL'}
                    </Text>
                  </View>

                  <Text
                    style={[styles.ticketSubjectText, { color: theme.colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {t.subject}
                  </Text>
                  <Text
                    style={[styles.ticketDescriptionText, { color: theme.colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {t.description || t.lastMessage || 'No recent messages'}
                  </Text>

                  <View style={[styles.ticketCardFooter, { borderTopColor: theme.colors.border }]}>
                    <Text style={[styles.ticketIdText, { color: theme.colors.textTertiary }]}>
                      Ticket #{t.ticketId || t.id}
                    </Text>
                    <View style={styles.viewThreadRow}>
                      <Text style={styles.viewThreadText}>View Thread</Text>
                      <Ionicons name="arrow-forward" size={12} color="#E31E24" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── 4. CREATE SUPPORT TICKET MODAL ── */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                  Create Support Ticket
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                  Hinch Mart Logistics & Procurement Helpdesk
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close create ticket form"
              >
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Category Selector */}
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Issue Category
              </Text>
              <View style={styles.categoryChipsRow}>
                {(['DELIVERY', 'PAYMENT', 'QUALITY', 'RFQ', 'TECHNICAL', 'GENERAL'] as const).map((cat) => {
                  const isActive = newCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setNewCategory(cat)}
                      style={[
                        styles.catChip,
                        {
                          backgroundColor: isActive ? '#E31E24' : theme.colors.surfaceVariant,
                          borderColor: isActive ? '#E31E24' : theme.colors.border,
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          { color: isActive ? '#FFFFFF' : theme.colors.textPrimary },
                        ]}
                      >
                        {cat.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Subject Input */}
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Subject Line *
              </Text>
              <TextInput
                value={newSubject}
                onChangeText={setNewSubject}
                placeholder="e.g. Delayed dispatch for order #8492048"
                placeholderTextColor={theme.colors.textTertiary}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  },
                ]}
              />

              {/* Description Input */}
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Description & Site Details *
              </Text>
              <TextInput
                value={newDescription}
                onChangeText={setNewDescription}
                multiline
                numberOfLines={4}
                placeholder="Describe the issue, PO number, or project site destination..."
                placeholderTextColor={theme.colors.textTertiary}
                style={[
                  styles.textAreaInput,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  },
                ]}
              />
            </ScrollView>

            <TouchableOpacity
              onPress={handleCreateTicket}
              disabled={isSubmittingTicket}
              style={[styles.submitTicketBtn, isSubmittingTicket && { opacity: 0.7 }]}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Submit support ticket"
            >
              {isSubmittingTicket && <ActivityIndicator color="#FFFFFF" size="small" />}
              <Text style={styles.submitTicketBtnText}>
                {isSubmittingTicket ? 'Submitting Ticket...' : 'Submit Support Request'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 5. TICKET THREAD CONVERSATION MODAL ── */}
      <Modal
        visible={threadModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setThreadModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                maxHeight: '85%',
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  Ticket #{selectedTicket?.ticketId || selectedTicket?.id}: {selectedTicket?.subject}
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                  Category: {selectedTicket?.category || 'GENERAL'} • Status: {selectedTicket?.status || 'OPEN'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setThreadModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close ticket thread modal"
              >
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.threadScroll} showsVerticalScrollIndicator={false}>
              {/* Original Description Bubble */}
              <View
                style={[
                  styles.threadOriginalBox,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.threadOriginalLabel, { color: theme.colors.textSecondary }]}>
                  Initial Inquiry
                </Text>
                <Text style={[styles.threadOriginalContent, { color: theme.colors.textPrimary }]}>
                  {selectedTicket?.description || selectedTicket?.lastMessage || 'No description recorded.'}
                </Text>
              </View>

              {/* Thread Messages */}
              {Array.isArray(selectedTicket?.messages) &&
                selectedTicket!.messages.map((m: any, idx: number) => {
                  const isAgent = Boolean(m.isAgent || m.isAdmin || m.senderRole === 'ADMIN');
                  return (
                    <View
                      key={String(m.id || idx)}
                      style={[
                        styles.messageBubble,
                        isAgent ? styles.agentBubble : styles.userBubble,
                        {
                          backgroundColor: isAgent
                            ? theme.colors.surfaceVariant
                            : isDark
                            ? '#B71C1C'
                            : '#E31E24',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageSender,
                          {
                            color: isAgent
                              ? theme.colors.textSecondary
                              : 'rgba(255, 255, 255, 0.85)',
                          },
                        ]}
                      >
                        {isAgent ? m.senderName || 'HinchMart Support' : 'You'}
                      </Text>
                      <Text
                        style={[
                          styles.messageText,
                          {
                            color: isAgent ? theme.colors.textPrimary : '#FFFFFF',
                          },
                        ]}
                      >
                        {m.message || m.content}
                      </Text>
                    </View>
                  );
                })}
            </ScrollView>

            {/* Reply Input Bar */}
            <View style={[styles.replyBarRow, { borderTopColor: theme.colors.border }]}>
              <TextInput
                value={replyMessage}
                onChangeText={setReplyMessage}
                placeholder="Type your response to support desk..."
                placeholderTextColor={theme.colors.textTertiary}
                style={[
                  styles.replyInput,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  },
                ]}
              />
              <TouchableOpacity
                onPress={handleSendReply}
                disabled={isReplying || !replyMessage.trim()}
                style={[
                  styles.sendReplyBtn,
                  (!replyMessage.trim() || isReplying) && { opacity: 0.5 },
                ]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Send reply to ticket thread"
              >
                {isReplying ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
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
  headerWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  scrollPadding: {
    paddingTop: 16,
  },

  /* Instant Phone Assistance Card */
  assistanceCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  assistanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assistanceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistanceTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  assistanceTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
  },
  assistanceSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    lineHeight: 17,
  },
  callNowBtn: {
    backgroundColor: '#E31E24',
    height: 46,
    borderRadius: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    gap: 8,
  },
  callNowBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontFamily: 'Inter_700Bold',
    flexShrink: 1,
    textAlign: 'center',
  },

  /* Quick Support Action Cards */
  quickActionsWrap: {
    marginBottom: 14,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    minWidth: 0,
  },
  actionTitle: {
    fontSize: 13.5,
    fontFamily: 'Poppins_600SemiBold',
  },
  actionSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },

  /* Procurement Tickets Desk Section */
  ticketsSectionWrap: {
    marginTop: 6,
  },
  deskHeaderDesktopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  deskHeaderMobileWrap: {
    marginBottom: 12,
  },
  deskTitleCol: {
    flex: 1,
  },
  deskSectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  deskSectionSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    lineHeight: 16,
  },
  deskActionsDesktopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deskActionsMobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  viewAllBtn: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllBtnMobile: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  viewAllBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  newTicketBtn: {
    height: 38,
    backgroundColor: '#E31E24',
    paddingHorizontal: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  newTicketBtnMobile: {
    flex: 1.3,
    height: 38,
    backgroundColor: '#E31E24',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  newTicketBtnText: {
    fontSize: 12.5,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },

  /* Loading State */
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
  },

  /* Empty State Card */
  emptyStateCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginTop: 4,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12.5,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
    maxWidth: 290,
  },
  raiseInquiryBtn: {
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  raiseInquiryBtnText: {
    fontSize: 12.5,
    fontFamily: 'Inter_700Bold',
  },

  /* Ticket Card */
  ticketCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  ticketCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  ticketSubjectText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  ticketDescriptionText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
    lineHeight: 16,
  },
  ticketCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  ticketIdText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  viewThreadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewThreadText: {
    fontSize: 11.5,
    fontFamily: 'Inter_600SemiBold',
    color: '#E31E24',
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  modalSubtitle: {
    fontSize: 11.5,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 6,
    marginTop: 8,
  },
  categoryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginBottom: 6,
  },
  textAreaInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    minHeight: 85,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitTicketBtn: {
    backgroundColor: '#E31E24',
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  submitTicketBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },

  /* Thread Modal Styles */
  threadScroll: {
    maxHeight: 280,
    marginVertical: 10,
  },
  threadOriginalBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  threadOriginalLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 3,
  },
  threadOriginalContent: {
    fontSize: 12.5,
    fontFamily: 'Inter_400Regular',
    lineHeight: 17,
  },
  messageBubble: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  agentBubble: {
    alignSelf: 'flex-start',
  },
  messageSender: {
    fontSize: 10.5,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 12.5,
    fontFamily: 'Inter_400Regular',
    lineHeight: 17,
  },
  replyBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  replyInput: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
  },
  sendReplyBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#E31E24',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HelpSupportScreen;
