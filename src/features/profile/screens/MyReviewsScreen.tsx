/**
 * HINCH MART — My Reviews Screen (IBO Home Building Megastore Theme)
 * - Safe area top header with back navigation & live Cart badge
 * - Rating summary overview card (Score, verified count, helpful votes)
 * - Filter pills (All, Published, Pending)
 * - Review cards with product image, star rating, verified purchase badge, edit/delete actions
 * - Interactive edit/write review modal
 */
import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  TextInput,
  Platform,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme';
import { reviewsApi } from '../../../services/api/reviews.api';
import { useAppSelector } from '../../../redux/hooks';
import { selectCartItemCount } from '../../../redux/slices/cartSlice';

interface UserReviewItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
  verified: boolean;
  status: 'published' | 'pending';
  likesCount: number;
}

export type ReviewTab = 'all' | 'published' | 'pending';

export function MyReviewsScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const cartCount = useAppSelector(selectCartItemCount);

  const [activeTab, setActiveTab] = useState<ReviewTab>('all');
  const [reviews, setReviews] = useState<UserReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<UserReviewItem | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftComment, setDraftComment] = useState('');
  const [draftRating, setDraftRating] = useState(5);

  const fetchLiveReviews = async () => {
    try {
      setIsLoading(true);
      const apiReviews = await reviewsApi.getReviews();
      if (Array.isArray(apiReviews) && apiReviews.length > 0) {
        const mapped: UserReviewItem[] = apiReviews.map((r: any, idx: number) => ({
          id: String(r.id || r.reviewId || idx + 1),
          productId: String(r.productId || 'p1'),
          productName: r.productTitle || r.productName || 'Industrial Construction Material',
          productImage:
            (r.imageUrls && r.imageUrls[0]) ||
            r.productImage ||
            'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300',
          rating: Number(r.rating) || 5,
          date: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : '2026-09-01',
          title: r.title || 'Verified Quality Review',
          comment: r.comment || '',
          verified: Boolean(r.verifiedPurchase ?? true),
          status:
            String(r.status || '').toLowerCase() === 'pending' ? 'pending' : 'published',
          likesCount: Number(r.helpfulCount) || 0,
        }));
        setReviews(mapped);
      }
    } catch {
      // Keep empty or fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveReviews();
  }, []);

  const filteredReviews = useMemo(
    () => (activeTab === 'all' ? reviews : reviews.filter((r) => r.status === activeTab)),
    [activeTab, reviews]
  );

  const averageRating = reviews.length
    ? reviews.reduce((total, r) => total + r.rating, 0) / reviews.length
    : 5.0;

  const helpfulVoteCount = reviews.reduce((total, r) => total + r.likesCount, 0);

  const tabs: { id: ReviewTab; label: string }[] = [
    { id: 'all', label: `All Reviews (${reviews.length})` },
    {
      id: 'published',
      label: `Published (${reviews.filter((r) => r.status === 'published').length})`,
    },
    {
      id: 'pending',
      label: `Pending (${reviews.filter((r) => r.status === 'pending').length})`,
    },
  ];

  const openEditReview = (review: UserReviewItem) => {
    setEditingReview(review);
    setDraftTitle(review.title);
    setDraftComment(review.comment);
    setDraftRating(review.rating);
  };

  const closeEditReview = () => {
    setEditingReview(null);
    setDraftTitle('');
    setDraftComment('');
  };

  const saveReview = async () => {
    if (!editingReview) return;

    const title = draftTitle.trim();
    const comment = draftComment.trim();
    if (!title || !comment) {
      Alert.alert('Complete Review', 'Please provide both a title and review comments.');
      return;
    }

    try {
      await reviewsApi.updateReview(editingReview.id, {
        rating: draftRating,
        title,
        comment,
      });
    } catch {
      // optimistic fallback
    }

    setReviews((curr) =>
      curr.map((r) =>
        r.id === editingReview.id
          ? { ...r, title, comment, rating: draftRating, date: new Date().toISOString().slice(0, 10) }
          : r
      )
    );
    closeEditReview();
  };

  const confirmDeleteReview = (review: UserReviewItem) => {
    Alert.alert(
      'Delete review?',
      `This will permanently remove your review for ${review.productName}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await reviewsApi.deleteReview(review.id);
            } catch {
              // local fallback
            }
            setReviews((curr) => curr.filter((r) => r.id !== review.id));
          },
        },
      ]
    );
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
            onPress={() => navigation.goBack()}
            style={styles.headerIconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              My Product Reviews
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Verified Feedback & Ratings
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Cart')}
            style={styles.headerIconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="cart-outline" size={24} color={theme.colors.textPrimary} />
            {cartCount > 0 && (
              <View style={[styles.cartBadge, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Overview Stat Banner */}
      <View style={styles.topSummaryWrapper}>
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.summaryLeft}>
            <Text style={[styles.avgRatingNumber, { color: theme.colors.textPrimary }]}>
              {averageRating.toFixed(1)}
            </Text>
            <View style={{ flexDirection: 'row', gap: 2, marginVertical: 4 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= Math.round(averageRating) ? 'star' : 'star-outline'}
                  size={15}
                  color="#F59E0B"
                />
              ))}
            </View>
            <Text style={[styles.avgRatingSub, { color: theme.colors.textTertiary }]}>
              Average Given Rating
            </Text>
          </View>

          <View style={[styles.dividerVertical, { backgroundColor: theme.colors.border }]} />

          <View style={styles.summaryRight}>
            <View style={styles.statLine}>
              <Ionicons name="shield-checkmark" size={16} color="#16A34A" />
              <Text style={[styles.statLineText, { color: theme.colors.textPrimary }]}>
                {reviews.filter((r) => r.verified).length} Verified Reviews
              </Text>
            </View>
            <View style={styles.statLine}>
              <Ionicons name="thumbs-up" size={15} color={theme.colors.primary} />
              <Text style={[styles.statLineText, { color: theme.colors.textPrimary }]}>
                {helpfulVoteCount} Helpful Votes
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Filter Tabs Bar */}
      <View
        style={[
          styles.tabsWrapper,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {tabs.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.75}
                style={[
                  styles.filterTabPill,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.colors.surfaceVariant,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterTabPillText,
                    {
                      color: active ? '#FFFFFF' : theme.colors.textSecondary,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Reviews List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading your reviews...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredReviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View
              style={[
                styles.reviewCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {/* Product Header */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ProductDetail', { productId: item.productId })}
                style={styles.productHeader}
              >
                <Image source={{ uri: item.productImage }} style={styles.productThumb} contentFit="cover" />
                <View style={styles.productInfo}>
                  <Text numberOfLines={1} style={[styles.productTitle, { color: theme.colors.textPrimary }]}>
                    {item.productName}
                  </Text>
                  <View style={styles.ratingDateRow}>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons
                          key={s}
                          name={s <= item.rating ? 'star' : 'star-outline'}
                          size={13}
                          color="#F59E0B"
                        />
                      ))}
                    </View>
                    <Text style={[styles.reviewDate, { color: theme.colors.textTertiary }]}>
                      {item.date}
                    </Text>
                  </View>
                </View>

                {item.verified && (
                  <View style={[styles.verifiedBadge, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.verifiedBadgeText, { color: '#16A34A' }]}>VERIFIED</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Review Content */}
              <View style={styles.reviewBodyContainer}>
                <Text style={[styles.reviewTitleText, { color: theme.colors.textPrimary }]}>
                  {item.title}
                </Text>
                <Text style={[styles.reviewCommentText, { color: theme.colors.textSecondary }]}>
                  {item.comment}
                </Text>
              </View>

              {/* Action Bar */}
              <View style={[styles.cardFooterBar, { borderTopColor: theme.colors.border }]}>
                <View style={styles.helpfulVoteContainer}>
                  <Ionicons name="thumbs-up-outline" size={14} color={theme.colors.textTertiary} />
                  <Text style={[styles.helpfulText, { color: theme.colors.textSecondary }]}>
                    {item.likesCount} found helpful
                  </Text>
                </View>

                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    onPress={() => openEditReview(item)}
                    style={styles.cardActionBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil-outline" size={15} color={theme.colors.primary} />
                    <Text style={[styles.cardActionText, { color: theme.colors.primary }]}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => confirmDeleteReview(item)}
                    style={styles.cardActionBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
                    <Text style={[styles.cardActionText, { color: theme.colors.danger }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Ionicons name="star-outline" size={42} color={theme.colors.textTertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                No Reviews Found
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                You haven't submitted any reviews in this tab. Products you purchase can be reviewed from your Order Details.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('OrderHistory')}
                style={[styles.emptyCtaBtn, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={styles.emptyCtaText}>View Past Orders</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Edit Review Modal */}
      <Modal visible={Boolean(editingReview)} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalHeading, { color: theme.colors.textPrimary }]}>
                Edit Product Review
              </Text>
              <TouchableOpacity onPress={closeEditReview}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalProdName, { color: theme.colors.textSecondary }]}>
              {editingReview?.productName}
            </Text>

            {/* Star Rating Selector */}
            <View style={styles.starPickerRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setDraftRating(star)}
                  style={{ padding: 4 }}
                >
                  <Ionicons
                    name={star <= draftRating ? 'star' : 'star-outline'}
                    size={32}
                    color="#F59E0B"
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>Headline</Text>
              <TextInput
                value={draftTitle}
                onChangeText={setDraftTitle}
                placeholder="Summarize your review..."
                placeholderTextColor={theme.colors.textTertiary}
                style={[
                  styles.textInputStyle,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  },
                ]}
              />
            </View>

            {/* Comments Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>Detailed Feedback</Text>
              <TextInput
                value={draftComment}
                onChangeText={setDraftComment}
                placeholder="Write your experience regarding quality, packaging, and dispatch..."
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={4}
                style={[
                  styles.textInputStyle,
                  styles.multilineInputStyle,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  },
                ]}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={saveReview}
              style={[styles.saveModalBtn, { backgroundColor: theme.colors.primary }]}
              activeOpacity={0.88}
            >
              <Text style={styles.saveModalBtnText}>Update Review</Text>
            </TouchableOpacity>
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
  cartBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  topSummaryWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  summaryCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLeft: {
    alignItems: 'center',
    paddingRight: 16,
  },
  avgRatingNumber: {
    fontSize: 28,
    fontWeight: '800',
  },
  avgRatingSub: {
    fontSize: 10.5,
    marginTop: 2,
  },
  dividerVertical: {
    width: 1,
    height: 48,
  },
  summaryRight: {
    flex: 1,
    paddingLeft: 16,
    gap: 8,
  },
  statLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLineText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabsWrapper: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterTabPillText: {
    fontSize: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  reviewCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  productThumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  ratingDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewDate: {
    fontSize: 11,
  },
  verifiedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  verifiedBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  reviewBodyContainer: {
    marginBottom: 10,
  },
  reviewTitleText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  reviewCommentText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  cardFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  helpfulVoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  helpfulText: {
    fontSize: 11.5,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
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
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalProdName: {
    fontSize: 13,
    marginBottom: 14,
  },
  starPickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  textInputStyle: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  multilineInputStyle: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveModalBtn: {
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  saveModalBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
