/**
 * HINCH MART — Vendor, Company, RFQ & Order Cards
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Rating } from '../ui/Rating';
import { Button } from '../ui/Button';
import { Vendor } from '../../types/vendor.types';
import { Company } from '../../types/company.types';
import { RFQ } from '../../types/rfq.types';
import { Order } from '../../types/order.types';
import { formatPrice, formatDate } from '../../utils';

// Vendor Card
export function VendorCard({ vendor, onPress }: { vendor: Vendor; onPress: () => void }) {
  const { theme } = useTheme();

  return (
    <Card onPress={onPress} variant="outlined" style={styles.vendorCard}>
      <View style={styles.vendorHeader}>
        <Image source={{ uri: vendor.logo }} style={styles.vendorLogo} contentFit="cover" />
        <View style={styles.vendorMeta}>
          <View style={styles.rowAlign}>
            <Text style={[styles.vendorName, { color: theme.colors.textPrimary }]}>
              {vendor.name}
            </Text>
            {vendor.isVerified && <Badge label="Verified" variant="success" size="sm" style={styles.ml4} />}
          </View>
          <Text style={[styles.vendorSub, { color: theme.colors.textTertiary }]}>
            📍 {vendor.address.city}, {vendor.address.country}
          </Text>
          <Rating rating={vendor.rating} count={vendor.reviewCount} showCount size={12} />
        </View>
      </View>

      <View style={[styles.vendorDivider, { backgroundColor: theme.colors.divider }]} />

      <View style={styles.vendorStats}>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: theme.colors.textPrimary }]}>{vendor.productCount}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>Products</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: theme.colors.textPrimary }]}>{vendor.responseTime}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>Response</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: theme.colors.success }]}>
            {vendor.performance.onTimeDelivery}%
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>On-Time</Text>
        </View>
      </View>
    </Card>
  );
}

// Company Card
export function CompanyCard({ company, onPress }: { company: Company; onPress: () => void }) {
  const { theme } = useTheme();

  return (
    <Card onPress={onPress} variant="outlined" style={styles.vendorCard}>
      <View style={styles.vendorHeader}>
        <Image source={{ uri: company.logo }} style={styles.vendorLogo} contentFit="cover" />
        <View style={styles.vendorMeta}>
          <View style={styles.rowAlign}>
            <Text style={[styles.vendorName, { color: theme.colors.textPrimary }]}>
              {company.name}
            </Text>
            {company.isVerified && <Badge label="Verified" variant="info" size="sm" style={styles.ml4} />}
          </View>
          <Text style={[styles.vendorSub, { color: theme.colors.textTertiary }]}>
            🏗️ {company.industry}
          </Text>
          <Text style={[styles.vendorSub, { color: theme.colors.textSecondary }]}>
            👥 {company.totalEmployees} Employees · 📁 {company.totalProjects} Active Projects
          </Text>
        </View>
      </View>
    </Card>
  );
}

// RFQ Card
export function RFQCard({ rfq, onPress }: { rfq: RFQ; onPress: () => void }) {
  const { theme, isDark } = useTheme();

  const getStatusVariant = () => {
    switch (rfq.status) {
      case 'quoted':
        return 'success';
      case 'in_review':
        return 'warning';
      case 'approved':
        return 'primary';
      case 'rejected':
        return 'danger';
      default:
        return 'info';
    }
  };

  return (
    <Card onPress={onPress} variant="outlined" style={[styles.rfqCard, { borderRadius: 18, padding: 16, marginBottom: 14 }]}>
      <View style={styles.rowSpaceBetween}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ backgroundColor: `${theme.colors.primary}20`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, color: theme.colors.textPrimary }}>#{rfq.rfqNumber}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: theme.colors.surfaceVariant, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 }}>
            <Ionicons name="location-outline" size={10} color={theme.colors.textSecondary} />
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 10, color: theme.colors.textSecondary }}>
              {(rfq as any)?.deliveryLocation || (rfq as any)?.city || 'Hyderabad, TS'}
            </Text>
          </View>
        </View>
        <Badge label={(rfq.status || 'QUOTED').replace('_', ' ').toUpperCase()} variant={getStatusVariant()} size="sm" />
      </View>

      <Text style={[styles.rfqTitle, { color: theme.colors.textPrimary, marginTop: 10, fontSize: 15, fontFamily: 'Poppins_600SemiBold' }]}>
        {rfq.title}
      </Text>
      <Text numberOfLines={2} style={[styles.rfqDesc, { color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 }]}>
        {rfq.description || rfq.specifications || rfq.productMaterial || ''}
      </Text>

      <View style={[styles.vendorDivider, { backgroundColor: theme.colors.divider, marginVertical: 12 }]} />

      <View style={styles.rowSpaceBetween}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.textTertiary} />
          <Text style={[styles.rfqSub, { color: theme.colors.textTertiary, fontSize: 11 }]}>
            Deadline: {rfq.deadline || rfq.requiredByDate ? formatDate(rfq.deadline || rfq.requiredByDate || '', 'short') : 'Open'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${theme.colors.success}15`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
          <Ionicons name="mail-unread" size={12} color={theme.colors.success} />
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 11, color: theme.colors.success }}>
            {rfq.quotesCount ?? rfq.quotations?.length ?? 1} Quotes Received
          </Text>
        </View>
      </View>
    </Card>
  );
}

// Order Card — Premium B2B Logistics Card
export function VendorOrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const { theme, isDark } = useTheme();

  const getStatusVariant = () => {
    switch (String(order.status || order.orderStatus || '').toLowerCase()) {
      case 'delivered':
        return 'success';
      case 'shipped':
        return 'info';
      case 'processing':
        return 'warning';
      case 'cancelled':
        return 'danger';
      default:
        return 'navy';
    }
  };

  const primaryItem = order.items?.[0];
  const itemImage =
    primaryItem?.imageUrl ||
    primaryItem?.productImage ||
    order.firstItemImage ||
    'https://cdn.hinchmart.com/products/tmt_steel_12mm.jpg';

  return (
    <Card onPress={onPress} variant="outlined" style={orderCardStyles.cardContainer}>
      {/* Top Header */}
      <View style={orderCardStyles.headerRow}>
        <View style={orderCardStyles.orderNumberWrap}>
          <Ionicons name="receipt-outline" size={16} color={theme.colors.primary} />
          <Text style={[orderCardStyles.orderNumberText, { color: theme.colors.textPrimary }]}>
            Order #{order.orderNumber || order.orderId || order.id}
          </Text>
        </View>
        <Badge label={String(order.orderStatus || order.status || 'CONFIRMED').toUpperCase()} variant={getStatusVariant()} size="sm" />
      </View>

      <Text style={[orderCardStyles.orderDateText, { color: theme.colors.textTertiary }]}>
        Placed on {order.createdAt ? formatDate(order.createdAt, 'medium') : 'Recent'} · B2B Invoice Attached
      </Text>

      {/* Main Item Row */}
      <View style={[orderCardStyles.itemBox, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Image source={{ uri: itemImage }} style={orderCardStyles.itemThumb} contentFit="cover" />
        <View style={orderCardStyles.itemMeta}>
          <Text numberOfLines={1} style={[orderCardStyles.itemNameText, { color: theme.colors.textPrimary }]}>
            {primaryItem?.title || primaryItem?.productName || order.firstItemTitle || 'TMT Steel Rebars Fe 550D (12mm)'}
          </Text>
          <Text style={[orderCardStyles.itemQtyText, { color: theme.colors.textSecondary }]}>
            Qty: {primaryItem?.quantity || 1} units {(order.items?.length || 1) > 1 ? `(+${(order.items?.length || 1) - 1} more items)` : ''}
          </Text>
          <Text style={[orderCardStyles.itemPriceText, { color: isDark ? theme.colors.primary : '#152238' }]}>
            {formatPrice(order.totalAmount || order.total || order.grandTotal || 634260, order.currency)}
          </Text>
        </View>
      </View>

      {/* Visual Shipping Progress Bar */}
      <View style={orderCardStyles.timelineWrap}>
        <View style={orderCardStyles.timelineHeader}>
          <Text style={[orderCardStyles.timelineTitle, { color: theme.colors.textSecondary }]}>
            🚚 Estimated Site Delivery: <Text style={{ fontFamily: 'Inter_700Bold', color: theme.colors.textPrimary }}>{order.estimatedDelivery || 'Aug 24, 2026'}</Text>
          </Text>
        </View>
        <View style={orderCardStyles.progressTrack}>
          <View
            style={[
              orderCardStyles.progressFill,
              {
                width: order.status === 'delivered' ? '100%' : order.status === 'shipped' ? '66%' : '33%',
                backgroundColor: order.status === 'delivered' ? '#10B981' : '#FDB913',
              },
            ]}
          />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={[orderCardStyles.actionsRow, { borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={onPress}
          style={[orderCardStyles.actionBtn, { backgroundColor: theme.colors.surfaceVariant }]}
          activeOpacity={0.75}
        >
          <Ionicons name="location-outline" size={14} color={theme.colors.textPrimary} />
          <Text style={[orderCardStyles.actionBtnText, { color: theme.colors.textPrimary }]}>Track Shipment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onPress}
          style={orderCardStyles.primaryActionBtn}
          activeOpacity={0.85}
        >
          <Text style={orderCardStyles.primaryActionText}>View Order Details</Text>
          <Ionicons name="chevron-forward" size={14} color="#152238" />
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const orderCardStyles = StyleSheet.create({
  cardContainer: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  orderNumberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderNumberText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
  },
  orderDateText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    marginBottom: 12,
  },
  itemBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    marginBottom: 12,
  },
  itemThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#F1F3F5',
  },
  itemMeta: {
    flex: 1,
    marginLeft: 12,
  },
  itemNameText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  itemQtyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    marginTop: 2,
  },
  itemPriceText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    marginTop: 2,
  },
  timelineWrap: {
    marginBottom: 12,
  },
  timelineHeader: {
    marginBottom: 6,
  },
  timelineTitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 0.5,
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  actionBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDB913',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  primaryActionText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#152238',
  },
});

const styles = StyleSheet.create({
  vendorCard: {
    marginBottom: 12,
    width: '100%',
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vendorLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F3F5',
  },
  vendorMeta: {
    marginLeft: 12,
    flex: 1,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowSpaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vendorName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  vendorSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginVertical: 2,
  },
  ml4: {
    marginLeft: 6,
  },
  vendorDivider: {
    height: 1,
    marginVertical: 12,
  },
  vendorStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statNum: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  rfqCard: {
    marginBottom: 12,
    width: '100%',
  },
  rfqNumber: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  rfqTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    marginTop: 6,
  },
  rfqDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  rfqSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  rfqQuoteCount: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  orderDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  orderItemsSummary: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  orderTotal: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
  },
  orderActions: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
});
