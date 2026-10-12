/**
 * HINCH MART — Customer Tax Invoices Screen
 * 100% Live Backend Integration with InvoiceController.java & OrderController.java:
 * - GET /api/invoices (with optional financialYear, startDate, endDate)
 * - GET /api/invoices/{orderId}/download-pdf
 * - GET /api/orders/{orderId}/invoice
 * - GET /api/orders/{orderId}/invoice/download & /pdf
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Linking,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme';
import { invoicesApi } from '../../../services/api/invoices.api';
import {
  CustomerTaxInvoiceSummary,
  DetailedInvoiceBreakdown,
} from '../../../types/invoice.types';
import { InvoiceDetailModal } from '../../../components/ui/InvoiceDetailModal';
import { formatPrice } from '../../../utils';

const FINANCIAL_YEARS = [
  { label: 'All Invoices', value: '' },
  { label: 'FY 2026-27', value: '2026-2027' },
  { label: 'FY 2025-26', value: '2025-2026' },
  { label: 'FY 2024-25', value: '2024-2025' },
];

export function TaxInvoicesScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [invoices, setInvoices] = useState<CustomerTaxInvoiceSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedFY, setSelectedFY] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Breakdown modal state
  const [selectedInvoice, setSelectedInvoice] =
    useState<DetailedInvoiceBreakdown | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [isModalLoading, setIsModalLoading] = useState<boolean>(false);
  const [downloadingOrderId, setDownloadingOrderId] = useState<number | null>(
    null,
  );

  const fetchInvoices = useCallback(
    async (refresh = false) => {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const params = selectedFY ? { financialYear: selectedFY } : undefined;
        const data = await invoicesApi.listInvoices(params);
        setInvoices(data || []);
      } catch (err: any) {
        console.warn('[TaxInvoicesScreen] Failed to load invoices:', err?.message);
        setInvoices([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedFY],
  );

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase().trim();
    return invoices.filter(
      (inv) =>
        inv.invoiceNumber?.toLowerCase().includes(q) ||
        inv.orderNumber?.toLowerCase().includes(q),
    );
  }, [invoices, searchQuery]);

  const handleViewInvoice = async (inv: CustomerTaxInvoiceSummary) => {
    setModalVisible(true);
    setIsModalLoading(true);
    setSelectedInvoice(null);
    try {
      const breakdown = await invoicesApi.getDetailedInvoice(inv.orderId);
      setSelectedInvoice(breakdown);
    } catch {
      // Invoice not available from backend yet
      setSelectedInvoice(null);
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleDownloadPdf = async (inv: CustomerTaxInvoiceSummary) => {
    try {
      setDownloadingOrderId(inv.orderId);
      await invoicesApi.downloadOrOpenInvoicePdf(
        inv.orderId,
        inv.downloadUrl,
        inv.invoiceNumber
      );
    } catch (err: any) {
      Alert.alert(
        'Download Error',
        err?.message || 'Could not download or open invoice PDF. Please try again.'
      );
    } finally {
      setDownloadingOrderId(null);
    }
  };

  const topPadding =
    Math.max(
      insets.top,
      Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20,
    ) + 6;

  const renderInvoiceCard = ({ item }: { item: CustomerTaxInvoiceSummary }) => {
    const isDownloading = downloadingOrderId === item.orderId;
    const isCancelled = item.status === 'CANCELLED';
    const dateFormatted = item.date
      ? new Date(item.date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Recent';

    return (
      <View
        style={[
          styles.invoiceCard,
          {
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.cardBorder,
          },
        ]}
      >
        {/* Top Card Row */}
        <View style={styles.cardHeader}>
          <View style={styles.invoiceBadge}>
            <Ionicons name="receipt-outline" size={14} color="#E31E24" />
            <Text style={styles.invoiceNumberText}>{item.invoiceNumber}</Text>
          </View>
          <View
            style={[
              styles.statusPill,
              isCancelled && styles.statusPillCancelled,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                isCancelled && styles.statusPillTextCancelled,
              ]}
            >
              {(item.status || 'PAID').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Card Details */}
        <View style={styles.cardDetailsRow}>
          <View style={styles.detailCol}>
            <Text
              style={[styles.detailLabel, { color: theme.colors.textTertiary }]}
            >
              ORDER NUMBER
            </Text>
            <Text
              style={[
                styles.detailOrderNum,
                { color: theme.colors.textPrimary },
              ]}
            >
              #{item.orderNumber}
            </Text>
          </View>

          <View style={styles.detailCol}>
            <Text
              style={[styles.detailLabel, { color: theme.colors.textTertiary }]}
            >
              INVOICE DATE
            </Text>
            <Text
              style={[styles.detailValue, { color: theme.colors.textPrimary }]}
            >
              {dateFormatted}
            </Text>
          </View>

          <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
            <Text
              style={[styles.detailLabel, { color: theme.colors.textTertiary }]}
            >
              TOTAL AMOUNT
            </Text>
            <Text style={styles.detailAmount}>{formatPrice(item.amount)}</Text>
          </View>
        </View>

        {/* Card Action Buttons */}
        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={[
              styles.breakdownBtn,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surfaceVariant,
              },
            ]}
            onPress={() => handleViewInvoice(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={15} color={theme.colors.textPrimary} />
            <Text
              style={[
                styles.breakdownBtnText,
                { color: theme.colors.textPrimary },
              ]}
            >
              View Invoice
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.downloadPdfBtn,
              isDownloading && { opacity: 0.7 },
            ]}
            onPress={() => handleDownloadPdf(item)}
            disabled={isDownloading}
            activeOpacity={0.85}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="cloud-download-outline"
                  size={15}
                  color="#FFFFFF"
                />
                <Text style={styles.downloadPdfBtnText}>Download PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#E31E24" translucent />

      {/* Top Navigation Bar */}
      <View style={[styles.topBar, { paddingTop: topPadding }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.topBarTitleCol}>
          <Text style={styles.topBarTitle}>Customer Tax Invoices</Text>
          <Text style={styles.topBarSubtitle}>Official GST B2B / B2C Invoices</Text>
        </View>
        <TouchableOpacity
          onPress={() => fetchInvoices(true)}
          style={styles.refreshBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.cardBorder,
          },
        ]}
      >
        <Ionicons name="search-outline" size={18} color="#94A3B8" />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          placeholder="Search by invoice or order number..."
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

      {/* Financial Year Filter Chips */}
      <View style={styles.chipsRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FINANCIAL_YEARS}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.chipsScroll}
          renderItem={({ item }) => {
            const isSelected = selectedFY === item.value;
            return (
              <TouchableOpacity
                style={[
                  styles.chip,
                  isSelected
                    ? styles.chipActive
                    : [
                        styles.chipInactive,
                        {
                          backgroundColor: theme.colors.cardBackground,
                          borderColor: theme.colors.cardBorder,
                        },
                      ],
                ]}
                onPress={() => setSelectedFY(item.value)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected
                      ? styles.chipTextActive
                      : [
                          styles.chipTextInactive,
                          { color: theme.colors.textSecondary },
                        ],
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Invoices List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#E31E24" />
          <Text style={[styles.loadingNotice, { color: theme.colors.textSecondary }]}>
            Loading Tax Invoices...
          </Text>
        </View>
      ) : filteredInvoices.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="receipt-outline" size={42} color="#E31E24" />
          </View>
          <Text
            style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}
          >
            No Tax Invoices Found
          </Text>
          <Text
            style={[styles.emptyText, { color: theme.colors.textTertiary }]}
          >
            {searchQuery
              ? `No invoices matched "${searchQuery}"`
              : 'Tax invoices are generated automatically after placing and confirming your orders.'}
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Shop' })}
            activeOpacity={0.85}
          >
            <Ionicons name="cart-outline" size={17} color="#FFFFFF" />
            <Text style={styles.browseBtnText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredInvoices}
          keyExtractor={(item) => String(item.orderId || item.invoiceNumber)}
          renderItem={renderInvoiceCard}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 30 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchInvoices(true)}
              colors={['#E31E24']}
              tintColor="#E31E24"
            />
          }
        />
      )}

      {/* Detailed Invoice Breakdown Modal */}
      <InvoiceDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        invoice={selectedInvoice}
        isLoading={isModalLoading}
      />
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
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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

  /* Filter Chips */
  chipsRow: {
    marginBottom: 10,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: '#E31E24',
    borderColor: '#E31E24',
  },
  chipInactive: {},
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipTextInactive: {},

  /* List */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 12,
  },
  invoiceCard: {
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
    marginBottom: 12,
  },
  invoiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  invoiceNumberText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#E31E24',
  },
  statusPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#16A34A',
  },
  statusPillCancelled: {
    backgroundColor: '#F1F5F9',
  },
  statusPillTextCancelled: {
    color: '#64748B',
  },

  cardDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailCol: {
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailOrderNum: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E31E24',
  },

  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  breakdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  breakdownBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  downloadPdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#E31E24',
  },
  downloadPdfBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Empty & Loading */
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconCircle: {
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
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E31E24',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 8,
  },
  browseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
