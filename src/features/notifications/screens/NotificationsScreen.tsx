/**
 * HINCH MART — Notifications, B2B Chat & FAQ Center (IBO Home Building Megastore Theme)
 * - NotificationsScreen: Filter pills (All, Orders, Quotations, Wallet), mark-all-as-read, unread dots, navigation routing
 * - ChatListScreen: Supplier B2B messages list, verified badge, avatar initials, unread previews
 * - FAQScreen: Expandable accordion FAQs with search filter and quick support contact
 * - NewsScreen re-export
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  ScrollView,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { notificationsApi } from '../../../services/api/notifications.api';
import { chatApi } from '../../../services/api/chat.api';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  type: 'order' | 'rfq' | 'wallet' | 'promo';
  read: boolean;
  orderId?: string;
  rfqId?: string;
}

const FILTER_TABS = ['All', 'Orders', 'Quotations', 'Wallet'];

/* ================================================================== */
/* 1. NOTIFICATIONS SCREEN                                            */
/* ================================================================== */
export function NotificationsScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    let isMounted = true;
    notificationsApi
      .getNotifications()
      .then((items) => {
        if (!isMounted) return;
        const mapped: NotificationItem[] = (items || []).map((n) => ({
          id: String(n.id),
          title: n.title || 'Order Update',
          body: n.body || '',
          time: n.createdAt
            ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Recent',
          type: (n.type as any) || 'order',
          read: Boolean(n.read || n.isRead),
          orderId: n.orderId,
          rfqId: n.rfqId,
        }));
        setNotifications(mapped);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20
  );

  const handleMarkAllAsRead = () => {
    notificationsApi.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationPress = (item: NotificationItem) => {
    notificationsApi.markAsRead(item.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );

    if (item.type === 'order') {
      if (item.orderId) {
        navigation.navigate('OrderTracking', {
          orderId: item.orderId,
        });
      } else {
        navigation.navigate('OrderHistory');
      }
    } else if (item.type === 'rfq') {
      if (item.rfqId) {
        navigation.navigate('RFQDetail', { rfqId: item.rfqId });
      } else {
        navigation.navigate('RFQList');
      }
    }
  };

  const filteredData = notifications.filter((n) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Orders') return n.type === 'order';
    if (activeFilter === 'Quotations') return n.type === 'rfq';
    if (activeFilter === 'Wallet') return n.type === 'wallet';
    return true;
  });

  const getNotifIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'order':
        return { name: 'cube-outline' as const, bg: '#FEF3C7', color: '#D97706' };
      case 'rfq':
        return { name: 'document-text-outline' as const, bg: '#DBEAFE', color: '#2563EB' };
      case 'wallet':
        return { name: 'wallet-outline' as const, bg: '#DCFCE7', color: '#16A34A' };
      case 'promo':
        return { name: 'pricetag-outline' as const, bg: '#F3E8FF', color: '#9333EA' };
      default:
        return { name: 'notifications-outline' as const, bg: '#F1F5F9', color: '#64748B' };
    }
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
          styles.topHeader,
          {
            paddingTop: topPadding + 6,
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HomeTab'))}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Notifications</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
          </Text>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            style={[styles.readAllBtn, { backgroundColor: theme.colors.primaryLight }]}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-done" size={15} color={theme.colors.primary} />
            <Text style={[styles.readAllText, { color: theme.colors.primary }]}>Mark read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs Bar */}
      <View
        style={[
          styles.filterTabsWrapper,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsContent}>
          {FILTER_TABS.map((tab) => {
            const active = tab === activeFilter;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveFilter(tab)}
                activeOpacity={0.75}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.colors.surfaceVariant,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: active ? '#FFFFFF' : theme.colors.textSecondary,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notifications List */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 30 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Ionicons name="notifications-off-outline" size={42} color={theme.colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No Notifications</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              You're all caught up with your orders, quotations, and account updates.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const iconInfo = getNotifIcon(item.type);
          return (
            <TouchableOpacity
              onPress={() => handleNotificationPress(item)}
              activeOpacity={0.85}
              style={[
                styles.notifCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: !item.read ? theme.colors.primary : theme.colors.border,
                  borderLeftWidth: !item.read ? 4 : 1,
                  borderLeftColor: !item.read ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              {/* Card Header Row */}
              <View style={styles.cardHeaderRow}>
                <View style={[styles.iconBox, { backgroundColor: iconInfo.bg }]}>
                  <Ionicons name={iconInfo.name} size={17} color={iconInfo.color} />
                </View>

                <View style={styles.titleInfo}>
                  <Text numberOfLines={1} style={[styles.notifTitle, { color: theme.colors.textPrimary }]}>
                    {item.title}
                  </Text>
                </View>

                <Text style={[styles.timeText, { color: theme.colors.textTertiary }]}>{item.time}</Text>

                {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />}
              </View>

              {/* Body Content */}
              <Text style={[styles.notifBody, { color: theme.colors.textSecondary }]}>{item.body}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

/* ================================================================== */
/* 2. CHAT LIST SCREEN                                                */
/* ================================================================== */
export function ChatListScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    chatApi
      .listConversations()
      .then((list) => {
        if (isMounted && Array.isArray(list) && list.length > 0) {
          setConversations(list);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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

      <View
        style={[
          styles.topHeader,
          {
            paddingTop: topPadding + 6,
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Supplier Messages
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            B2B Inquiries & Verified Sellers
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {conversations.length > 0 ? (
          conversations.map((conv, idx) => (
            <TouchableOpacity
              key={conv.conversationId || conv.id || idx}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('RFQDetail', { rfqId: conv.rfqId || 'rfq1' })}
              style={[
                styles.chatCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.chatRow}>
                <View style={[styles.avatarCircle, { backgroundColor: theme.colors.navy }]}>
                  <Text style={styles.avatarInitials}>
                    {(conv.participantName || conv.vendorName || 'HM').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[styles.chatName, { color: theme.colors.textPrimary }]}>
                      {conv.participantName || conv.vendorName || 'Verified Supplier'}
                    </Text>
                    <Text style={[styles.chatTime, { color: theme.colors.textTertiary }]}>
                      {conv.lastMessageAt
                        ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Recent'}
                    </Text>
                  </View>
                  <Text style={[styles.verifiedTag, { color: theme.colors.success }]}>
                    ✓ Verified Supplier
                  </Text>
                  <Text numberOfLines={2} style={[styles.lastMsgText, { color: theme.colors.textSecondary }]}>
                    {conv.lastMessage || 'Click to open B2B message thread'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
            <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: theme.colors.textPrimary, marginTop: 12 }}>
              No Conversations Yet
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 6 }}>
              Messages with vendors and customer support will appear here once started.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ================================================================== */
/* 3. FAQ SCREEN                                                      */
/* ================================================================== */
export function FAQScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const FAQ_ITEMS = [
    {
      q: 'How do RFQ bulk quotations work?',
      a: 'Submit your material specifications or bill of quantities (BOQ). Verified domestic manufacturers submit competitive bids within 24 hours. You can compare quotes and proceed with Escrow payment protection.',
    },
    {
      q: 'What payment methods are supported for bulk purchases?',
      a: 'We support Letters of Credit (L/C), Escrow Bank Wire Transfers, NEFT/RTGS, Corporate Credit Cards, and HINCH MART Business Wallet balance.',
    },
    {
      q: 'How does 24-Hour Express delivery operate in Hyderabad?',
      a: 'For serviceable pin codes across Hyderabad, materials marked with the 24-Hour badge are dispatched directly from our regional fulfillment centers within 24 hours of confirmation.',
    },
    {
      q: 'How is heavy equipment rental handled?',
      a: 'Equipment rentals include direct site mobilization, certified machine operators, mandatory safety inspections, and complete on-site logistics setup.',
    },
    {
      q: 'Can I request customized material specifications?',
      a: 'Yes, when creating an RFQ or placing a purchase order, you can specify custom steel grades, cement types, cutting lengths, and delivery milestones.',
    },
  ];

  const filteredFaqs = FAQ_ITEMS.filter(
    (item) =>
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      <View
        style={[
          styles.topHeader,
          {
            paddingTop: topPadding + 6,
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Help & FAQs</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Find quick answers to common questions
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {/* Search Input Box */}
        <View
          style={[
            styles.faqSearchBox,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search FAQs (e.g. RFQ, delivery, payment)..."
            placeholderTextColor={theme.colors.textTertiary}
            style={[styles.faqSearchInput, { color: theme.colors.textPrimary }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* FAQs Accordion */}
        {filteredFaqs.map((item, idx) => {
          const isExpanded = expandedIndex === idx;
          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.85}
              onPress={() => setExpandedIndex(isExpanded ? null : idx)}
              style={[
                styles.faqCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: isExpanded ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <View style={styles.faqHeaderRow}>
                <Text style={[styles.faqQuestion, { color: theme.colors.textPrimary }]}>
                  {item.q}
                </Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={isExpanded ? theme.colors.primary : theme.colors.textTertiary}
                />
              </View>
              {isExpanded && (
                <Text style={[styles.faqAnswer, { color: theme.colors.textSecondary }]}>
                  {item.a}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Need More Help Card */}
        <View
          style={[
            styles.helpCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Ionicons name="headset-outline" size={24} color={theme.colors.primary} style={{ marginBottom: 8 }} />
          <Text style={[styles.helpCardTitle, { color: theme.colors.textPrimary }]}>
            Still have questions?
          </Text>
          <Text style={[styles.helpCardSub, { color: theme.colors.textSecondary }]}>
            Our B2B construction procurement specialists are available 24/7 to assist with your requirements.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('HelpSupport')}
            style={[styles.helpCtaBtn, { backgroundColor: theme.colors.primary }]}
            activeOpacity={0.85}
          >
            <Text style={styles.helpCtaBtnText}>Contact Support Team</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export { NewsScreen } from './NewsScreen';

/* ================================================================== */
/* STYLES                                                             */
/* ================================================================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
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
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 17,
  },
  headerSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12,
    marginTop: 1,
  },
  readAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  readAllText: {
    fontWeight: '600',
    fontSize: 11.5,
  },
  filterTabsWrapper: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  filterTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  notifCard: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  titleInfo: {
    flex: 1,
    marginRight: 8,
  },
  notifTitle: {
    fontWeight: '600',
    fontSize: 13,
  },
  timeText: {
    fontSize: 11,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 6,
  },
  notifBody: {
    fontSize: 12.5,
    lineHeight: 18,
    paddingLeft: 38,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
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
    fontWeight: '700',
    fontSize: 16,
  },
  emptySubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 280,
  },
  chatCard: {
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  chatName: {
    fontSize: 14,
    fontWeight: '700',
  },
  chatTime: {
    fontSize: 11,
  },
  verifiedTag: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 4,
  },
  lastMsgText: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  faqSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  faqSearchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  faqCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  faqHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 13.5,
    fontWeight: '600',
    flex: 1,
    paddingRight: 8,
    lineHeight: 18,
  },
  faqAnswer: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
  },
  helpCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  helpCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  helpCardSub: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
    maxWidth: 290,
  },
  helpCtaBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  helpCtaBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
});

export default NotificationsScreen;
