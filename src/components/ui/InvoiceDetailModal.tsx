/**
 * HINCH MART — GST-Compliant Tax Invoice Detail Modal
 * Displays comprehensive itemized B2B / B2C tax invoice breakdown:
 * - Supplier & Buyer details with GSTIN & Place of Supply
 * - Itemized table with HSN codes, GST rates, and line totals
 * - Tax breakdown: Taxable value, CGST, SGST, IGST, crane & freight
 * - One-tap Download PDF and In-Browser Preview PDF
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DetailedInvoiceBreakdown } from '../../types/invoice.types';
import { invoicesApi } from '../../services/api/invoices.api';
import { formatPrice } from '../../utils';

interface InvoiceDetailModalProps {
  visible: boolean;
  onClose: () => void;
  invoice: DetailedInvoiceBreakdown | null;
  isLoading?: boolean;
}

export function InvoiceDetailModal({
  visible,
  onClose,
  invoice,
  isLoading = false,
}: InvoiceDetailModalProps) {
  const insets = useSafeAreaInsets();
  const [downloading, setDownloading] = useState(false);

  if (!visible) return null;

  const handleDownloadPdf = async () => {
    if (!invoice?.orderId) return;
    try {
      setDownloading(true);
      await invoicesApi.downloadOrOpenInvoicePdf(
        invoice.orderId,
        invoice.pdfUrl,
        invoice.invoiceNumber
      );
    } catch (err: any) {
      Alert.alert('Download Error', err?.message || 'Could not open invoice PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePreviewPdf = async () => {
    if (!invoice?.orderId) return;
    try {
      setDownloading(true);
      await invoicesApi.downloadOrOpenInvoicePdf(
        invoice.orderId,
        invoice.pdfUrl,
        invoice.invoiceNumber
      );
    } catch (err: any) {
      Alert.alert('Preview Error', err?.message || 'Could not open inline PDF preview.');
    } finally {
      setDownloading(false);
    }
  };

  const sellerName =
    invoice?.sellerLegalName || invoice?.supplierName || 'HINCH MART';
  const sellerGstin = invoice?.sellerGstin || invoice?.supplierGstin || '';
  const buyerName =
    invoice?.buyerLegalName || invoice?.recipientName || 'Customer';
  const buyerGstin = invoice?.buyerGstin || invoice?.recipientGstin || null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            {
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Sheet Header */}
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <View style={styles.headerRow}>
              <View style={styles.headerIconBadge}>
                <Ionicons name="receipt-outline" size={20} color="#E31E24" />
              </View>
              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>Tax Invoice Details</Text>
                <Text style={styles.headerSubtitle}>
                  {invoice?.invoiceNumber || 'Official GST Document'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#E31E24" />
              <Text style={styles.loadingText}>Fetching GST Tax Invoice...</Text>
            </View>
          ) : !invoice ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="alert-circle-outline" size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Invoice Not Available</Text>
              <Text style={styles.emptyDesc}>
                This invoice could not be loaded or is being processed.
              </Text>
            </View>
          ) : (
            <>
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Invoice Meta Bar */}
                <View style={styles.metaCard}>
                  <View style={styles.metaRow}>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>INVOICE NO.</Text>
                      <Text style={styles.metaValHighlight}>
                        {invoice.invoiceNumber}
                      </Text>
                    </View>
                    <View style={[styles.metaCol, { alignItems: 'flex-end' }]}>
                      <Text style={styles.metaLabel}>DATE</Text>
                      <Text style={styles.metaVal}>{invoice.invoiceDate}</Text>
                    </View>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaRow}>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>ORDER NUMBER</Text>
                      <Text style={styles.metaVal}>{invoice.orderNumber}</Text>
                    </View>
                    <View style={[styles.metaCol, { alignItems: 'flex-end' }]}>
                      <Text style={styles.metaLabel}>PAYMENT METHOD</Text>
                      <View style={styles.badgeSuccess}>
                        <Text style={styles.badgeSuccessText}>
                          {invoice.paymentMethod || 'PAID'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Seller & Buyer Party Cards */}
                <View style={styles.partyGrid}>
                  {/* Seller */}
                  <View style={styles.partyBox}>
                    <View style={styles.partyTag}>
                      <Ionicons name="business" size={12} color="#0038A8" />
                      <Text style={styles.partyTagText}>SUPPLIER / SELLER</Text>
                    </View>
                    <Text style={styles.partyName}>{sellerName}</Text>
                    {sellerGstin ? (
                      <Text style={styles.partyGstin}>
                        GSTIN: <Text style={styles.gstinBold}>{sellerGstin}</Text>
                      </Text>
                    ) : null}
                    <Text style={styles.partyAddress} numberOfLines={2}>
                      {invoice.supplierAddress || ''}
                    </Text>
                  </View>

                  {/* Buyer */}
                  <View style={styles.partyBox}>
                    <View style={styles.partyTag}>
                      <Ionicons name="person" size={12} color="#16A34A" />
                      <Text style={[styles.partyTagText, { color: '#16A34A' }]}>
                        BILLED TO / BUYER
                      </Text>
                    </View>
                    <Text style={styles.partyName}>{buyerName}</Text>
                    {buyerGstin ? (
                      <Text style={styles.partyGstin}>
                        GSTIN: <Text style={styles.gstinBold}>{buyerGstin}</Text>
                      </Text>
                    ) : (
                      <Text style={styles.consumerTag}>Unregistered (B2C)</Text>
                    )}
                    <Text style={styles.partyAddress} numberOfLines={2}>
                      {invoice.recipientAddress || ''}
                    </Text>
                    {Boolean(invoice.placeOfSupply) && (
                      <Text style={styles.placeOfSupplyText}>
                        POS: {invoice.placeOfSupply}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Itemized GST Breakdown Table */}
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="list" size={15} color="#0F172A" />
                  <Text style={styles.sectionTitle}>
                    Itemized Supplies ({invoice.items?.length || 0})
                  </Text>
                </View>

                <View style={styles.itemsCard}>
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((item, idx) => (
                      <View
                        key={item.itemId || idx}
                        style={[
                          styles.itemRow,
                          idx > 0 && styles.itemRowBorder,
                        ]}
                      >
                        <View style={styles.itemMainRow}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.itemTitle} numberOfLines={2}>
                              {item.description}
                            </Text>
                            <View style={styles.itemSubRow}>
                              {Boolean(item.hsnCode) && (
                                <View style={styles.hsnChip}>
                                  <Text style={styles.hsnText}>
                                    HSN {item.hsnCode}
                                  </Text>
                                </View>
                              )}
                              <Text style={styles.itemQtyText}>
                                Qty: {item.quantity} {item.unit || 'Units'} ×{' '}
                                {formatPrice(item.unitPrice)}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.itemTotal}>
                            {formatPrice(item.lineTotal)}
                          </Text>
                        </View>
                        {/* Tax Tag */}
                        <View style={styles.taxPillRow}>
                          <Text style={styles.taxPillText}>
                            GST {item.gstRate}% : {formatPrice(item.gstAmount)}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noItemsText}>
                      No item details recorded on this invoice.
                    </Text>
                  )}
                </View>

                {/* Tax Breakdown & Grand Total */}
                <View style={styles.calcCard}>
                  <Text style={styles.calcTitle}>Tax Calculation Summary</Text>

                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Taxable Value</Text>
                    <Text style={styles.calcVal}>
                      {formatPrice(invoice.taxableAmount || invoice.subtotal)}
                    </Text>
                  </View>

                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>CGST</Text>
                    <Text style={styles.calcVal}>
                      {formatPrice(invoice.cgst || 0)}
                    </Text>
                  </View>

                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>SGST</Text>
                    <Text style={styles.calcVal}>
                      {formatPrice(invoice.sgst || 0)}
                    </Text>
                  </View>

                  {Boolean(invoice.igst && invoice.igst > 0) && (
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>IGST</Text>
                      <Text style={styles.calcVal}>
                        {formatPrice(invoice.igst)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabelBold}>Total GST</Text>
                    <Text style={styles.calcValBold}>
                      {formatPrice(invoice.totalGst || 0)}
                    </Text>
                  </View>

                  {Boolean(
                    invoice.freightCharge && invoice.freightCharge > 0,
                  ) && (
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>Freight / Logistics</Text>
                      <Text style={styles.calcVal}>
                        {formatPrice(invoice.freightCharge)}
                      </Text>
                    </View>
                  )}

                  {Boolean(
                    invoice.craneUnloadingCharge &&
                      invoice.craneUnloadingCharge > 0,
                  ) && (
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>
                        Crane Unloading Charges
                      </Text>
                      <Text style={styles.calcVal}>
                        {formatPrice(invoice.craneUnloadingCharge)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.calcDivider} />

                  <View style={styles.calcRowTotal}>
                    <View>
                      <Text style={styles.totalLabel}>Invoice Total</Text>
                      <Text style={styles.taxInclusiveTag}>
                        Inclusive of all GST
                      </Text>
                    </View>
                    <Text style={styles.totalVal}>
                      {formatPrice(invoice.grandTotal)}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.previewBtn}
                  onPress={handlePreviewPdf}
                  activeOpacity={0.8}
                >
                  <Ionicons name="eye-outline" size={17} color="#0F172A" />
                  <Text style={styles.previewBtnText}>Preview</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.downloadBtn, downloading && { opacity: 0.7 }]}
                  onPress={handleDownloadPdf}
                  disabled={downloading}
                  activeOpacity={0.85}
                >
                  {downloading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="cloud-download-outline"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.downloadBtnText}>Download PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '65%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },

  /* Meta Card */
  metaCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaCol: {
    justifyContent: 'center',
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  metaValHighlight: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#E31E24',
    marginTop: 2,
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 2,
  },
  metaDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  badgeSuccess: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  badgeSuccessText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },

  /* Party Grid */
  partyGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  partyBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  partyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  partyTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0038A8',
    letterSpacing: 0.5,
  },
  partyName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  partyGstin: {
    fontSize: 10.5,
    color: '#475569',
    marginBottom: 2,
  },
  gstinBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  consumerTag: {
    fontSize: 10.5,
    color: '#64748B',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  partyAddress: {
    fontSize: 10.5,
    color: '#64748B',
    lineHeight: 14,
  },
  placeOfSupplyText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0038A8',
    marginTop: 4,
  },

  /* Items Table */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  itemsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    paddingHorizontal: 12,
  },
  itemRow: {
    paddingVertical: 10,
  },
  itemRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  itemMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  itemSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  hsnChip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  hsnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  itemQtyText: {
    fontSize: 11,
    color: '#64748B',
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  taxPillRow: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  taxPillText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  noItemsText: {
    paddingVertical: 14,
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
  },

  /* Calc Card */
  calcCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calcTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  calcLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  calcVal: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0F172A',
  },
  calcLabelBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  calcValBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  calcDivider: {
    height: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: 8,
  },
  calcRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  taxInclusiveTag: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '600',
  },
  totalVal: {
    fontSize: 17,
    fontWeight: '800',
    color: '#E31E24',
  },

  /* Actions */
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  previewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  downloadBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#E31E24',
  },
  downloadBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
