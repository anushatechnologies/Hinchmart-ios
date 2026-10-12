/**
 * HINCH MART — Premium Construction Industry News & Expert Procurement Tips
 * - Dark & Light Mode Harmonized Design System
 * - Interactive Daily Commodity Price Index with Live Chart Insights & Price Alerts
 * - Instant RFQ Bridging & OEM Direct Procurement from Commodity Rates
 * - Dynamic Category Filtering (Market Trends, Procurement Tips, Quality Checks, Tech)
 * - Breaking News Hero Spotlight & Full Interactive Article Reader Modal
 * - Pro Contractor Field Tips Flashcards Carousel
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
  StatusBar,
  Modal,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../theme';
import { newsApi } from '../../../services/api';

export interface CommodityPrice {
  id: string;
  name: string;
  price: string;
  change: string;
  changeAmount: string;
  isUp: boolean;
  unit: string;
  dayHigh: string;
  dayLow: string;
  high52: string;
  low52: string;
  drivers: string;
  trendHistory: { [key: string]: number[] };
  oemBrands: string[];
  rfqMaterialName: string;
  rfqSpecs: string;
  categoryFilter: string;
}

const COMMODITY_INDEX_DATA: CommodityPrice[] = [];

const CATEGORIES = [
  'All Updates',
  'Market Trends',
  'Procurement Tips',
  'Civil & Quality',
  'Green Tech & Fleet',
  'Saved Articles',
];

interface Article {
  id: string;
  title: string;
  category: string;
  readTime: string;
  date: string;
  author: string;
  image: string;
  summary: string;
  badge?: string;
  isFeatured?: boolean;
  takeaways: string[];
  fullBody: string[];
  checklist?: string[];
}

const ARTICLES: Article[] = [];

const PRO_TIPS = [
  {
    id: 'tip-1',
    icon: 'hammer',
    title: 'Concrete Slump Tolerance',
    tip: 'For pumpable concrete in high-rise slabs, maintain slump between 125mm – 150mm with superplasticizers.',
    tag: 'CONCRETE',
  },
  {
    id: 'tip-2',
    icon: 'shield-check',
    title: 'Rebar Lap Length Rule',
    tip: 'Standard lap length for tension zones is 50d (where d is rebar diameter) to ensure full load transfer.',
    tag: 'STEEL',
  },
  {
    id: 'tip-3',
    icon: 'water',
    title: 'Curing Duration Standard',
    tip: 'Keep structural elements moist for minimum 7 days with OPC, and 10 days for PPC / mineral admixture concrete.',
    tag: 'CURING',
  },
  {
    id: 'tip-4',
    icon: 'flash',
    title: 'Cable Sizing Margin',
    tip: 'Always design main industrial feeder cables with minimum 25% safety headroom for future plant expansion.',
    tag: 'ELECTRICAL',
  },
];

export function NewsScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeCategory, setActiveCategory] = useState('All Updates');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [liveNews, setLiveNews] = useState<Article[]>([]);
  const [commodities, setCommodities] = useState<CommodityPrice[]>([]);

  const loadNewsFeed = useCallback(async () => {
    try {
      const items = await newsApi.getNewsFeed();
      if (Array.isArray(items) && items.length > 0) {
        const mappedArticles: Article[] = items.map((item, idx) => ({
          id: String(item.id || item.newsId || `news_${idx + 1}`),
          title: item.title,
          category: item.category === 'COMMODITY_PRICES' ? 'Market Trends' : item.category || 'Market Trends',
          readTime: '3 min read',
          date: item.publishedAt
            ? new Date(item.publishedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Recent',
          author: item.source || 'Hinchmart Intelligence',
          image:
            item.imageUrl ||
            'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
          summary: item.summary || (item.content ? (item.content.length > 160 ? item.content.slice(0, 160) + '...' : item.content) : item.title),
          takeaways: [
            item.trendDirection ? `Trend: ${item.trendDirection}` : 'Live intelligence from Hinchmart primary mill index.',
            item.priceChangePercentage != null ? `Change: ${item.priceChangePercentage > 0 ? '+' : ''}${item.priceChangePercentage}%` : 'Direct mill rates updated.',
          ],
          fullBody: item.content ? [item.content] : [item.title],
        }));

        setLiveNews(mappedArticles);

        const commodityNews = items.filter((x: any) => x.category === 'COMMODITY_PRICES' || x.priceChangePercentage != null);
        if (commodityNews.length > 0) {
          const updatedCommodities = COMMODITY_INDEX_DATA.map((c) => {
            const match = commodityNews.find((n: any) =>
              (n.title && n.title.toLowerCase().includes(c.name.toLowerCase().split(' ')[0])) ||
              (n.summary && n.summary.toLowerCase().includes(c.name.toLowerCase().split(' ')[0]))
            );
            if (match && match.priceChangePercentage != null) {
              const isUp = match.trendDirection === 'UP' || match.priceChangePercentage > 0;
              return {
                ...c,
                change: `${isUp ? '+' : ''}${match.priceChangePercentage}%`,
                isUp,
                drivers: match.summary || match.content || c.drivers,
              };
            }
            return c;
          });
          setCommodities(updatedCommodities);
        }
      }
    } catch {
      // Handled gracefully
    }
  }, []);

  useEffect(() => {
    loadNewsFeed();
  }, [loadNewsFeed]);

  // Commodity Detail Modal & Interactive States
  const [selectedCommodity, setSelectedCommodity] = useState<CommodityPrice | null>(null);
  const [commodityTimeframe, setCommodityTimeframe] = useState<'1W' | '1M' | '3M' | '1Y'>('1M');
  const [priceAlerts, setPriceAlerts] = useState<string[]>([]);
  const [isRefreshingTicker, setIsRefreshingTicker] = useState(false);
  const [tickerToast, setTickerToast] = useState<string | null>(null);

  const topSafePadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  ) + 8;

  const toggleBookmark = (id: string) => {
    if (bookmarkedIds.includes(id)) {
      setBookmarkedIds(bookmarkedIds.filter((bId) => bId !== id));
    } else {
      setBookmarkedIds([...bookmarkedIds, id]);
    }
  };

  const toggleLike = (id: string) => {
    if (likedIds.includes(id)) {
      setLikedIds(likedIds.filter((lId) => lId !== id));
    } else {
      setLikedIds([...likedIds, id]);
    }
  };

  const togglePriceAlert = (id: string) => {
    if (priceAlerts.includes(id)) {
      setPriceAlerts(priceAlerts.filter((pId) => pId !== id));
      setTickerToast('Price alert removed.');
    } else {
      setPriceAlerts([...priceAlerts, id]);
      setTickerToast('🔔 Price drop alert enabled! You will be notified of rate changes.');
    }
    setTimeout(() => setTickerToast(null), 3000);
  };

  const handleRefreshCommodities = async () => {
    setIsRefreshingTicker(true);
    await loadNewsFeed();
    setIsRefreshingTicker(false);
    setTickerToast('⚡ Live spot rates refreshed from primary mills & mandis');
    setTimeout(() => setTickerToast(null), 3000);
  };

  const handleShare = async (article: Article) => {
    try {
      await Share.share({
        message: `${article.title}\n\nRead more on Hinchmart B2B Construction Intelligence.\nhttps://hinchmart.com/news/${article.id}`,
        title: article.title,
      });
    } catch (e) {
      // Ignored
    }
  };

  const filteredArticles = liveNews.filter((art) => {
    if (activeCategory === 'Saved Articles') {
      return bookmarkedIds.includes(art.id);
    }
    const matchesCategory =
      activeCategory === 'All Updates' || art.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredArticle = liveNews.find((a) => a.isFeatured) || liveNews[0];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} translucent />

      {/* Top Header */}
      <View
        style={[
          styles.topHeader,
          {
            paddingTop: topSafePadding,
            backgroundColor: theme.colors.cardBackground,
            borderBottomColor: theme.colors.cardBorder,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={23} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>News & Expert Tips</Text>
            <View style={styles.liveIndicatorBadge}>
              <View style={styles.livePulseDot} />
              <Text style={styles.liveIndicatorText}>LIVE</Text>
            </View>
          </View>
          <Text style={[styles.headerSub, { color: theme.colors.textSecondary }]}>B2B Market Trends & Contractor Playbooks</Text>
        </View>

        <TouchableOpacity
          onPress={() => setActiveCategory(activeCategory === 'Saved Articles' ? 'All Updates' : 'Saved Articles')}
          activeOpacity={0.7}
          style={[
            styles.savedHeaderBtn,
            { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.cardBorder },
            activeCategory === 'Saved Articles' && styles.savedHeaderBtnActive,
          ]}
        >
          <Ionicons
            name={activeCategory === 'Saved Articles' ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={activeCategory === 'Saved Articles' ? '#FDB913' : theme.colors.textPrimary}
          />
          {bookmarkedIds.length > 0 && (
            <View style={styles.savedCountBadge}>
              <Text style={styles.savedCountText}>{bookmarkedIds.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Notification / Toast Banner */}
      {tickerToast && (
        <View style={styles.toastBanner}>
          <Ionicons name="information-circle" size={16} color="#152238" />
          <Text style={styles.toastBannerText}>{tickerToast}</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 1. Live Commodity Index Ticker */}
        {commodities.length > 0 && (
        <View
          style={[
            styles.tickerSection,
            {
              backgroundColor: isDark ? theme.colors.surfaceVariant : '#FFFFFF',
              borderBottomColor: theme.colors.cardBorder,
            },
          ]}
        >
          <View style={styles.tickerHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="analytics" size={15} color="#FDB913" />
              <Text style={[styles.tickerHeaderText, { color: theme.colors.textPrimary }]}>DAILY COMMODITY INDEX</Text>
              <View style={styles.tapTipBadge}>
                <Text style={styles.tapTipText}>Tap for Trends & RFQ</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleRefreshCommodities}
              activeOpacity={0.7}
              style={styles.refreshTickerBtn}
            >
              {isRefreshingTicker ? (
                <ActivityIndicator size="small" color="#FDB913" />
              ) : (
                <>
                  <Ionicons name="refresh" size={12} color="#FDB913" />
                  <Text style={styles.tickerUpdatedText}>Live Rates</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tickerScroll}>
            {commodities.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelectedCommodity(item)}
                activeOpacity={0.8}
                style={[
                  styles.tickerChip,
                  { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder },
                ]}
              >
                <View style={styles.tickerChipTopRow}>
                  <Text style={[styles.tickerChipName, { color: theme.colors.textPrimary }]}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={12} color={theme.colors.textTertiary} />
                </View>
                <View style={styles.tickerPriceRow}>
                  <Text style={[styles.tickerChipPrice, { color: theme.colors.textPrimary }]}>{item.price}</Text>
                  <Text style={[styles.tickerChipUnit, { color: theme.colors.textTertiary }]}>/{item.unit}</Text>
                  <View
                    style={[
                      styles.changeBadge,
                      { backgroundColor: item.isUp ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' },
                    ]}
                  >
                    <Ionicons
                      name={item.isUp ? 'trending-up' : 'trending-down'}
                      size={11}
                      color={item.isUp ? '#10B981' : '#EF4444'}
                    />
                    <Text
                      style={[
                        styles.changeBadgeText,
                        { color: item.isUp ? '#10B981' : '#EF4444' },
                      ]}
                    >
                      {item.change}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        )}

        {/* 2. Search Box */}
        <View style={styles.searchBoxWrap}>
          <View style={[styles.searchBox, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.cardBorder }]}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search steel prices, cement tips, GST guidelines..."
              placeholderTextColor="#94A3B8"
              style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 3. Category Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTabsScroll}>
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.75}
                style={[
                  styles.categoryPill,
                  isSelected
                    ? { backgroundColor: '#152238', borderColor: '#FDB913', borderWidth: 1.2 }
                    : { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder, borderWidth: 1 },
                ]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    {
                      color: isSelected ? '#FDB913' : theme.colors.textSecondary,
                      fontFamily: isSelected ? 'Inter_700Bold' : 'Inter_500Medium',
                    },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 4. Featured Spotlight Article (Only when on 'All Updates' or 'Market Trends') */}
        {activeCategory === 'All Updates' && searchQuery === '' && Boolean(featuredArticle) && (
          <View style={styles.featuredSection}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setSelectedArticle(featuredArticle)}
              style={styles.featuredCard}
            >
              <Image source={{ uri: featuredArticle.image }} style={styles.featuredImage} contentFit="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(15, 23, 42, 0.85)', '#0F172A']}
                style={styles.featuredGradient}
              >
                <View style={styles.featuredBadgeRow}>
                  <View style={styles.spotlightPill}>
                    <Ionicons name="flash" size={11} color="#152238" />
                    <Text style={styles.spotlightPillText}>{featuredArticle.badge}</Text>
                  </View>
                  <Text style={styles.featuredReadTime}>{featuredArticle.readTime}</Text>
                </View>

                <Text style={styles.featuredTitle}>{featuredArticle.title}</Text>
                <Text numberOfLines={2} style={styles.featuredSummary}>
                  {featuredArticle.summary}
                </Text>

                <View style={styles.featuredFooter}>
                  <Text style={styles.featuredMetaText}>
                    {featuredArticle.date} · {featuredArticle.author}
                  </Text>
                  <View style={styles.readNowBtn}>
                    <Text style={styles.readNowBtnText}>Read Deep-Dive</Text>
                    <Ionicons name="arrow-forward" size={13} color="#152238" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* 5. Pro Contractor Quick Tips Hub */}
        <View style={styles.proTipsSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="bulb" size={18} color="#FDB913" />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Contractor Field Tips</Text>
            </View>
            <Text style={[styles.sectionSub, { color: theme.colors.textTertiary }]}>Quick Reference Rules</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.proTipsScroll}>
            {PRO_TIPS.map((tip) => (
              <View
                key={tip.id}
                style={[
                  styles.proTipCard,
                  { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder },
                ]}
              >
                <View style={styles.proTipHeader}>
                  <View style={styles.proTipIconCircle}>
                    <MaterialCommunityIcons name={tip.icon as any} size={18} color="#FDB913" />
                  </View>
                  <View style={[styles.proTipTagPill, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text style={[styles.proTipTagText, { color: theme.colors.textSecondary }]}>{tip.tag}</Text>
                  </View>
                </View>
                <Text style={[styles.proTipTitle, { color: theme.colors.textPrimary }]}>{tip.title}</Text>
                <Text style={[styles.proTipBody, { color: theme.colors.textSecondary }]}>{tip.tip}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* 6. Feed of Articles */}
        <View style={styles.articlesFeedSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="newspaper-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                {activeCategory === 'Saved Articles' ? 'Your Bookmarked Articles' : 'Latest Articles & Guides'}
              </Text>
            </View>
            <Text style={[styles.sectionSub, { color: theme.colors.textTertiary }]}>{filteredArticles.length} articles</Text>
          </View>

          {filteredArticles.length === 0 ? (
            <View style={styles.emptyFeedWrap}>
              <Ionicons name="bookmark-outline" size={48} color="#CBD5E1" />
              <Text style={[styles.emptyFeedTitle, { color: theme.colors.textPrimary }]}>No Articles Found</Text>
              <Text style={[styles.emptyFeedSub, { color: theme.colors.textSecondary }]}>
                {activeCategory === 'Saved Articles'
                  ? 'Tap the bookmark icon on any article to save it for quick reference.'
                  : 'Try searching with different keywords.'}
              </Text>
            </View>
          ) : (
            filteredArticles.map((article) => {
              const isBookmarked = bookmarkedIds.includes(article.id);
              return (
                <TouchableOpacity
                  key={article.id}
                  activeOpacity={0.85}
                  onPress={() => setSelectedArticle(article)}
                  style={[
                    styles.articleCard,
                    { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder },
                  ]}
                >
                  <Image source={{ uri: article.image }} style={styles.articleThumb} contentFit="cover" />

                  <View style={styles.articleInfo}>
                    <View style={styles.articleMetaRow}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{article.category}</Text>
                      </View>
                      <Text style={[styles.readTimeText, { color: theme.colors.textTertiary }]}>{article.readTime}</Text>

                      <TouchableOpacity
                        onPress={() => toggleBookmark(article.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.bookmarkBtn}
                      >
                        <Ionicons
                          name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                          size={17}
                          color={isBookmarked ? '#FDB913' : theme.colors.textTertiary}
                        />
                      </TouchableOpacity>
                    </View>

                    <Text numberOfLines={2} style={[styles.articleCardTitle, { color: theme.colors.textPrimary }]}>
                      {article.title}
                    </Text>

                    <Text numberOfLines={2} style={[styles.articleCardSummary, { color: theme.colors.textSecondary }]}>
                      {article.summary}
                    </Text>

                    <View style={[styles.articleFooterRow, { borderTopColor: theme.colors.cardBorder }]}>
                      <Text style={[styles.articleDateText, { color: theme.colors.textTertiary }]}>{article.date}</Text>
                      <View style={styles.viewArticleArrow}>
                        <Text style={styles.viewArticleText}>Read Guide</Text>
                        <Ionicons name="chevron-forward" size={13} color="#FDB913" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* 7. Dedicated Commodity Price Intelligence Sheet / Modal */}
      <Modal
        visible={!!selectedCommodity}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedCommodity(null)}
      >
        {selectedCommodity && (
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
            {/* Commodity Modal Header */}
            <View
              style={[
                styles.modalHeader,
                { backgroundColor: theme.colors.cardBackground, borderBottomColor: theme.colors.cardBorder },
              ]}
            >
              <TouchableOpacity
                onPress={() => setSelectedCommodity(null)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={styles.liveDotSmall} />
                <Text style={[styles.commodityHeaderBadge, { color: theme.colors.textPrimary }]}>SPOT MARKET INTELLIGENCE</Text>
              </View>

              <TouchableOpacity
                onPress={() => togglePriceAlert(selectedCommodity.id)}
                style={styles.modalIconAction}
              >
                <Ionicons
                  name={priceAlerts.includes(selectedCommodity.id) ? 'notifications' : 'notifications-outline'}
                  size={20}
                  color={priceAlerts.includes(selectedCommodity.id) ? '#FDB913' : theme.colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <View style={styles.commodityHeroWrap}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View>
                    <Text style={[styles.commoditySubCategory, { color: theme.colors.textSecondary }]}>
                      {selectedCommodity.categoryFilter} Commodity Index
                    </Text>
                    <Text style={[styles.commodityTitleName, { color: theme.colors.textPrimary }]}>
                      {selectedCommodity.name}
                    </Text>
                  </View>
                  <View style={[styles.commodityLivePill, { backgroundColor: selectedCommodity.isUp ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                    <Ionicons
                      name={selectedCommodity.isUp ? 'arrow-up' : 'arrow-down'}
                      size={12}
                      color={selectedCommodity.isUp ? '#10B981' : '#EF4444'}
                    />
                    <Text style={[styles.commodityLivePillText, { color: selectedCommodity.isUp ? '#10B981' : '#EF4444' }]}>
                      {selectedCommodity.change} ({selectedCommodity.changeAmount})
                    </Text>
                  </View>
                </View>

                {/* Spot Price Display */}
                <View style={styles.spotPriceRow}>
                  <Text style={[styles.spotPriceLarge, { color: theme.colors.textPrimary }]}>
                    {selectedCommodity.price}
                  </Text>
                  <Text style={[styles.spotPriceUnit, { color: theme.colors.textSecondary }]}>
                    / {selectedCommodity.unit} (Ex-Warehouse Base Rate)
                  </Text>
                </View>

                {/* Day Range & 52W Range Stats Grid */}
                <View style={[styles.rangeStatsGrid, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>Day Low</Text>
                    <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{selectedCommodity.dayLow}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>Day High</Text>
                    <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{selectedCommodity.dayHigh}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>52W Low</Text>
                    <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{selectedCommodity.low52}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>52W High</Text>
                    <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{selectedCommodity.high52}</Text>
                  </View>
                </View>

                {/* Interactive Timeframe Filter Tabs */}
                <View style={[styles.timeframeTabsRow, { backgroundColor: theme.colors.surfaceVariant }]}>
                  {(['1W', '1M', '3M', '1Y'] as const).map((tf) => {
                    const isTfActive = commodityTimeframe === tf;
                    return (
                      <TouchableOpacity
                        key={tf}
                        onPress={() => setCommodityTimeframe(tf)}
                        style={[styles.tfTab, isTfActive && styles.tfTabActive]}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.tfTabText, { color: isTfActive ? '#FDB913' : theme.colors.textSecondary }]}>{tf}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Spark Trend Visualization Bars */}
                <View style={[styles.trendVisualCard, { backgroundColor: isDark ? '#0A0F1D' : '#0F172A', borderColor: theme.colors.cardBorder }]}>
                  <View style={styles.trendVisualHeader}>
                    <Text style={styles.trendVisualTitle}>Price Fluctuation History ({commodityTimeframe})</Text>
                    <Text style={styles.trendVisualSub}>Primary Mill Benchmark</Text>
                  </View>
                  <View style={styles.trendBarsRow}>
                    {(selectedCommodity.trendHistory[commodityTimeframe] || selectedCommodity.trendHistory['1M']).map((val, idx, arr) => {
                      const min = Math.min(...arr);
                      const max = Math.max(...arr);
                      const heightPercent = max === min ? 50 : Math.max(15, Math.min(100, Math.round(((val - min) / (max - min)) * 70 + 30)));
                      const isLast = idx === arr.length - 1;
                      return (
                        <View key={idx} style={styles.barCol}>
                          <View style={[styles.barStickWrap]}>
                            <LinearGradient
                              colors={isLast ? ['#FDB913', '#D97706'] : ['#3B82F6', '#1E40AF']}
                              style={[styles.barFill, { height: `${heightPercent}%` }]}
                            />
                          </View>
                          <Text style={styles.barValText}>₹{(val / 1000).toFixed(1)}k</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Market Driver Factors */}
                <View
                  style={[
                    styles.driversCard,
                    {
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB',
                      borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
                    },
                  ]}
                >
                  <View style={styles.driversHeader}>
                    <Ionicons name="analytics" size={16} color="#D97706" />
                    <Text style={[styles.driversTitle, { color: isDark ? '#FDB913' : '#B45309' }]}>WHAT IS MOVING THIS PRICE TODAY</Text>
                  </View>
                  <Text style={[styles.driversBody, { color: isDark ? '#FEF3C7' : '#78350F' }]}>{selectedCommodity.drivers}</Text>
                </View>

                {/* Verified OEM Sourcing Brands */}
                <View style={[styles.oemBrandsCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
                  <Text style={[styles.oemBrandsTitle, { color: theme.colors.textPrimary }]}>Verified Direct OEM Mills on Hinchmart:</Text>
                  <View style={styles.oemChipsWrap}>
                    {selectedCommodity.oemBrands.map((brandName) => (
                      <TouchableOpacity
                        key={brandName}
                        onPress={() => {
                          setSelectedCommodity(null);
                          navigation.navigate('ProductList', { brand: brandName, brandName, title: `${brandName} Supplies` });
                        }}
                        style={[styles.oemChipBtn, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.cardBorder }]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={[styles.oemChipBtnText, { color: theme.colors.textPrimary }]}>{brandName}</Text>
                        <Ionicons name="chevron-forward" size={12} color={theme.colors.textPrimary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Procurement Action CTA Buttons */}
                <View style={styles.commodityActionsWrap}>
                  <TouchableOpacity
                    onPress={() => {
                      const c = selectedCommodity;
                      setSelectedCommodity(null);
                      navigation.navigate('RFQCreate', {
                        materialName: c.rfqMaterialName,
                        targetBudget: c.price.replace(/[^\d]/g, ''),
                        specs: c.rfqSpecs,
                        category: c.categoryFilter,
                      });
                    }}
                    style={styles.rfqSpotBtn}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="document-text" size={18} color="#152238" />
                    <Text style={styles.rfqSpotBtnText}>Post RFQ at this Spot Price</Text>
                  </TouchableOpacity>

                  <View style={styles.secondaryActionsRow}>
                    <TouchableOpacity
                      onPress={() => togglePriceAlert(selectedCommodity.id)}
                      style={[
                        styles.secondaryActionBtn,
                        { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.cardBorder },
                        priceAlerts.includes(selectedCommodity.id) && styles.alertActiveBtn,
                      ]}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={priceAlerts.includes(selectedCommodity.id) ? 'notifications' : 'notifications-outline'}
                        size={16}
                        color={priceAlerts.includes(selectedCommodity.id) ? '#FFFFFF' : theme.colors.textPrimary}
                      />
                      <Text
                        style={[
                          styles.secondaryActionBtnText,
                          { color: theme.colors.textPrimary },
                          priceAlerts.includes(selectedCommodity.id) && { color: '#FFFFFF' },
                        ]}
                      >
                        {priceAlerts.includes(selectedCommodity.id) ? 'Alert Active ✓' : 'Set Price Alert'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        const c = selectedCommodity;
                        setSelectedCommodity(null);
                        navigation.navigate('ProductList', { isFeatured: true });
                      }}
                      style={[styles.secondaryActionBtn, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.cardBorder }]}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="cart-outline" size={16} color={theme.colors.textPrimary} />
                      <Text style={[styles.secondaryActionBtnText, { color: theme.colors.textPrimary }]}>Browse Catalog</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* 8. Interactive Full-Screen Article Reader Modal */}
      <Modal
        visible={!!selectedArticle}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedArticle(null)}
      >
        {selectedArticle && (
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
            {/* Modal Header */}
            <View
              style={[
                styles.modalHeader,
                { backgroundColor: theme.colors.cardBackground, borderBottomColor: theme.colors.cardBorder },
              ]}
            >
              <TouchableOpacity
                onPress={() => setSelectedArticle(null)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
              </TouchableOpacity>

              <View style={styles.modalHeaderActions}>
                <TouchableOpacity
                  onPress={() => toggleBookmark(selectedArticle.id)}
                  style={styles.modalIconAction}
                >
                  <Ionicons
                    name={bookmarkedIds.includes(selectedArticle.id) ? 'bookmark' : 'bookmark-outline'}
                    size={20}
                    color={bookmarkedIds.includes(selectedArticle.id) ? '#FDB913' : theme.colors.textPrimary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleShare(selectedArticle)}
                  style={styles.modalIconAction}
                >
                  <Ionicons name="share-social-outline" size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {/* Cover Image */}
              <Image source={{ uri: selectedArticle.image }} style={styles.modalHeroImage} contentFit="cover" />

              <View style={styles.modalBodyWrap}>
                {/* Meta details */}
                <View style={styles.modalBadgeRow}>
                  <View style={styles.modalCategoryPill}>
                    <Text style={styles.modalCategoryText}>{selectedArticle.category}</Text>
                  </View>
                  <Text style={[styles.modalMetaDetails, { color: theme.colors.textSecondary }]}>
                    {selectedArticle.readTime} · {selectedArticle.date}
                  </Text>
                </View>

                {/* Article Title */}
                <Text style={[styles.modalTitleText, { color: theme.colors.textPrimary }]}>
                  {selectedArticle.title}
                </Text>

                {/* Author Info */}
                <View style={[styles.authorRow, { borderColor: theme.colors.cardBorder }]}>
                  <View style={styles.authorAvatar}>
                    <Ionicons name="person" size={14} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={[styles.authorName, { color: theme.colors.textPrimary }]}>
                      {selectedArticle.author}
                    </Text>
                    <Text style={[styles.authorRole, { color: theme.colors.textTertiary }]}>Hinchmart Industrial Sourcing Intelligence</Text>
                  </View>
                </View>

                {/* Key Takeaways Card */}
                <View
                  style={[
                    styles.takeawaysCard,
                    {
                      backgroundColor: isDark ? 'rgba(253, 185, 19, 0.08)' : '#FFFBEB',
                      borderColor: isDark ? 'rgba(253, 185, 19, 0.3)' : '#FDE68A',
                    },
                  ]}
                >
                  <View style={styles.takeawaysHeader}>
                    <Ionicons name="flash" size={16} color="#FDB913" />
                    <Text style={[styles.takeawaysTitle, { color: isDark ? '#FDB913' : '#B45309' }]}>EXECUTIVE TAKEAWAYS</Text>
                  </View>
                  {selectedArticle.takeaways.map((item, idx) => (
                    <View key={idx} style={styles.takeawayItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginTop: 2 }} />
                      <Text style={[styles.takeawayText, { color: isDark ? '#FEF3C7' : '#78350F' }]}>{item}</Text>
                    </View>
                  ))}
                </View>

                {/* Full Article Body */}
                <View style={styles.articleContentWrap}>
                  {selectedArticle.fullBody.map((p, idx) => (
                    <Text key={idx} style={[styles.bodyParagraph, { color: theme.colors.textPrimary }]}>
                      {p}
                    </Text>
                  ))}
                </View>

                {/* Pro Checklist for Site Engineers */}
                {selectedArticle.checklist && selectedArticle.checklist.length > 0 && (
                  <View
                    style={[
                      styles.checklistCard,
                      {
                        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : '#EFF6FF',
                        borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
                      },
                    ]}
                  >
                    <View style={styles.checklistHeader}>
                      <Ionicons name="clipboard" size={16} color="#2563EB" />
                      <Text style={[styles.checklistTitle, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>ON-SITE CONTRACTOR CHECKLIST</Text>
                    </View>
                    {selectedArticle.checklist.map((c, idx) => (
                      <View key={idx} style={styles.checklistItem}>
                        <View style={styles.checkSquare}>
                          <Ionicons name="checkbox" size={16} color="#2563EB" />
                        </View>
                        <Text style={[styles.checklistText, { color: isDark ? '#DBEAFE' : '#1E3A8A' }]}>{c}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Article Footer Feedback Actions */}
                <View style={[styles.modalFooterFeedback, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
                  <Text style={[styles.feedbackPrompt, { color: theme.colors.textPrimary }]}>Was this market intelligence helpful?</Text>
                  <View style={styles.feedbackButtonsRow}>
                    <TouchableOpacity
                      onPress={() => toggleLike(selectedArticle.id)}
                      style={[
                        styles.likeBtn,
                        likedIds.includes(selectedArticle.id) && styles.likeBtnActive,
                      ]}
                    >
                      <Ionicons
                        name={likedIds.includes(selectedArticle.id) ? 'thumbs-up' : 'thumbs-up-outline'}
                        size={16}
                        color={likedIds.includes(selectedArticle.id) ? '#FFFFFF' : '#10B981'}
                      />
                      <Text
                        style={[
                          styles.likeBtnText,
                          likedIds.includes(selectedArticle.id) && { color: '#FFFFFF' },
                        ]}
                      >
                        {likedIds.includes(selectedArticle.id) ? 'Helpful (Liked)' : 'Helpful'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setSelectedArticle(null);
                        navigation.navigate('RFQCreate');
                      }}
                      style={styles.procureRfqBtn}
                    >
                      <Ionicons name="document-text" size={16} color="#152238" />
                      <Text style={styles.procureRfqBtnText}>Post RFQ for Material</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
  },
  liveIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveIndicatorText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: -2,
  },
  savedHeaderBtn: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    position: 'relative',
  },
  savedHeaderBtnActive: {
    backgroundColor: '#152238',
    borderColor: '#FDB913',
  },
  savedCountBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FDB913',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  savedCountText: {
    color: '#152238',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDB913',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  toastBannerText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#152238',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 50,
  },
  // Commodity Ticker
  tickerSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tickerHeaderText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 0.6,
  },
  tapTipBadge: {
    backgroundColor: 'rgba(253, 185, 19, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tapTipText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8.5,
    color: '#B45309',
  },
  refreshTickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#152238',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tickerUpdatedText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#FDB913',
  },
  tickerScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  tickerChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.2,
    minWidth: 155,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tickerChipTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  tickerChipName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
  },
  tickerPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tickerChipPrice: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13.5,
  },
  tickerChipUnit: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  changeBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9.5,
  },
  // Search
  searchBoxWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    height: '100%',
  },
  categoryTabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  categoryPillText: {
    fontSize: 12,
  },
  // Featured Spotlight Card
  featuredSection: {
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  featuredCard: {
    height: 270,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  featuredGradient: {
    ...StyleSheet.absoluteFill,
    padding: 16,
    justifyContent: 'flex-end',
  },
  featuredBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  spotlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDB913',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  spotlightPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9.5,
    color: '#152238',
    letterSpacing: 0.5,
  },
  featuredReadTime: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#E2E8F0',
  },
  featuredTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16.5,
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 6,
  },
  featuredSummary: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
    marginBottom: 12,
  },
  featuredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  featuredMetaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10.5,
    color: '#94A3B8',
    flex: 1,
    paddingRight: 8,
  },
  readNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FDB913',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  readNowBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
    color: '#152238',
  },
  // Pro Tips Section
  proTipsSection: {
    paddingVertical: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
  },
  sectionSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
  },
  proTipsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  proTipCard: {
    width: 220,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  proTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  proTipIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(253, 185, 19, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proTipTagPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proTipTagText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
  },
  proTipTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    marginBottom: 4,
  },
  proTipBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    lineHeight: 16,
  },
  // Articles Feed Section
  articlesFeedSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  articleCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1.2,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  articleThumb: {
    width: 110,
    height: '100%',
    minHeight: 125,
  },
  articleInfo: {
    flex: 1,
    padding: 12,
  },
  articleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#2563EB',
  },
  readTimeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
  },
  bookmarkBtn: {
    marginLeft: 'auto',
    padding: 2,
  },
  articleCardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    lineHeight: 18,
    marginBottom: 4,
  },
  articleCardSummary: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    lineHeight: 15,
    marginBottom: 8,
  },
  articleFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
  },
  articleDateText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
  },
  viewArticleArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewArticleText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#F59E0B',
  },
  emptyFeedWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFeedTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    marginTop: 10,
  },
  emptyFeedSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  // Modal Base
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconAction: {
    padding: 6,
  },
  modalScroll: {
    paddingBottom: 60,
  },
  // Commodity Modal Specific Styles
  commodityHeroWrap: {
    padding: 18,
  },
  commodityHeaderBadge: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  liveDotSmall: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  commoditySubCategory: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
  },
  commodityTitleName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    marginTop: 2,
  },
  commodityLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  commodityLivePillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  spotPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 10,
    marginBottom: 16,
  },
  spotPriceLarge: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 30,
  },
  spotPriceUnit: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  rangeStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
  },
  timeframeTabsRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  tfTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  tfTabActive: {
    backgroundColor: '#152238',
  },
  tfTabText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
  },
  trendVisualCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  trendVisualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  trendVisualTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  trendVisualSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#94A3B8',
  },
  trendBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 90,
    paddingTop: 10,
  },
  barCol: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  barStickWrap: {
    width: 14,
    height: 65,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barValText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    color: '#94A3B8',
  },
  driversCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  driversHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  driversTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10.5,
    letterSpacing: 0.5,
  },
  driversBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },
  oemBrandsCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  oemBrandsTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
    marginBottom: 10,
  },
  oemChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  oemChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  oemChipBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  commodityActionsWrap: {
    gap: 10,
  },
  rfqSpotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FDB913',
    paddingVertical: 14,
    borderRadius: 12,
  },
  rfqSpotBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#152238',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  alertActiveBtn: {
    backgroundColor: '#152238',
    borderColor: '#FDB913',
  },
  secondaryActionBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  // Modal Article Reader
  modalHeroImage: {
    width: '100%',
    height: 220,
  },
  modalBodyWrap: {
    padding: 18,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalCategoryPill: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modalCategoryText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  modalMetaDetails: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
  },
  modalTitleText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 19,
    lineHeight: 26,
    marginBottom: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#152238',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  authorRole: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10.5,
  },
  takeawaysCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  takeawaysHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  takeawaysTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  takeawayItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  takeawayText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
  },
  articleContentWrap: {
    marginBottom: 20,
  },
  bodyParagraph: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  checklistCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 24,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  checklistTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  checkSquare: {
    marginTop: 2,
  },
  checklistText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
  },
  modalFooterFeedback: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  feedbackPrompt: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    marginBottom: 12,
  },
  feedbackButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  likeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  likeBtnActive: {
    backgroundColor: '#10B981',
  },
  likeBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#10B981',
  },
  procureRfqBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#FDB913',
  },
  procureRfqBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: '#152238',
  },
});
