/**
 * HINCH MART — Search Screen (Clean Initial State + Animated Placeholder)
 * Features:
 * - Clean initial state: Starts clean with ONLY the search interface (no default suggestions or discovery cards)
 * - Animated cycling placeholder: Smooth, lightweight cycling through search categories
 * - Clean Search Bar: Back button + Search icon + text input + clear button (no barcode/camera/mic)
 * - Live search functionality: Real backend API search, skeleton loader, and responsive 2-column grid / list toggle
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
  StatusBar,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { ProductCard } from '../../../components/cards/ProductCard';
import { ApiProduct } from '../../../types/product.types';
import { searchApi } from '../../../services/api/search.api';
import { ProductCardSkeleton } from '../../../components/feedback/SkeletonLoader';

const SEARCH_PLACEHOLDERS = [
  'Search building materials...',
  'Search power tools...',
  'Search cement & concrete...',
  'Search pipes & fittings...',
  'Search electrical & lights...',
];

export function SearchScreen({ navigation, route }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const gridCardWidth = Math.floor((windowWidth - 32 - 12) / 2);

  const initialQuery = route?.params?.query || '';
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ApiProduct[]>([]);
  const [hasSearched, setHasSearched] = useState(Boolean(initialQuery));
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Animated placeholder state & values
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholderFadeAnim = useRef(new Animated.Value(1)).current;
  const placeholderTranslateAnim = useRef(new Animated.Value(0)).current;

  const inputRef = useRef<TextInput>(null);
  const debounceTimerRef = useRef<any>(null);

  // Cycling animated placeholder text when search input is empty
  useEffect(() => {
    if (query.length > 0) return;

    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(placeholderFadeAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(placeholderTranslateAnim, {
          toValue: -8,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
        placeholderTranslateAnim.setValue(8);
        Animated.parallel([
          Animated.timing(placeholderFadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(placeholderTranslateAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 2800);

    return () => clearInterval(interval);
  }, [query.length, placeholderFadeAnim, placeholderTranslateAnim]);

  const performSearch = useCallback(async (searchTerm: string) => {
    const clean = searchTerm.trim();
    if (!clean) {
      setSearchResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const results = await searchApi.searchProducts(clean);
      setSearchResults(Array.isArray(results) ? results : []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced typing handler
  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (!text.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }
    debounceTimerRef.current = setTimeout(() => {
      performSearch(text);
    }, 400);
  };

  const handleClear = () => {
    setQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setIsSearching(false);
    inputRef.current?.focus();
  };

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
        translucent
      />

      {/* Top Header & Search Bar Container */}
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
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          {/* Clean Focused Search Input Box */}
          <View
            style={[
              styles.searchInputContainer,
              {
                backgroundColor: isDark ? theme.colors.surfaceVariant : '#F1F3F5',
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={theme.colors.textSecondary}
              style={{ marginRight: 8 }}
            />

            <View style={styles.inputInnerWrapper}>
              {query.length === 0 && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.animatedPlaceholderWrap,
                    {
                      opacity: placeholderFadeAnim,
                      transform: [{ translateY: placeholderTranslateAnim }],
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.animatedPlaceholderText,
                      { color: theme.colors.textTertiary },
                    ]}
                  >
                    {SEARCH_PLACEHOLDERS[placeholderIndex]}
                  </Text>
                </Animated.View>
              )}

              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={handleQueryChange}
                onSubmitEditing={() => performSearch(query)}
                placeholder=""
                placeholderTextColor="transparent"
                style={[styles.textInput, { color: theme.colors.textPrimary }]}
                returnKeyType="search"
                autoFocus={!initialQuery}
                clearButtonMode="never"
              />
            </View>

            {query.length > 0 && (
              <TouchableOpacity
                onPress={handleClear}
                style={styles.innerActionBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Clear search input"
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Content Area */}
      {isSearching ? (
        <View style={styles.skeletonContainer}>
          <View style={styles.resultsHeaderRow}>
            <View style={[styles.skeletonPill, { backgroundColor: theme.colors.skeleton }]} />
          </View>
          <View style={styles.gridRow}>
            <View style={{ width: gridCardWidth, marginBottom: 12 }}>
              <ProductCardSkeleton style={{ width: '100%', marginBottom: 0 }} />
            </View>
            <View style={{ width: gridCardWidth, marginBottom: 12 }}>
              <ProductCardSkeleton style={{ width: '100%', marginBottom: 0 }} />
            </View>
            <View style={{ width: gridCardWidth, marginBottom: 12 }}>
              <ProductCardSkeleton style={{ width: '100%', marginBottom: 0 }} />
            </View>
            <View style={{ width: gridCardWidth, marginBottom: 12 }}>
              <ProductCardSkeleton style={{ width: '100%', marginBottom: 0 }} />
            </View>
          </View>
        </View>
      ) : hasSearched ? (
        <View style={{ flex: 1 }}>
          {/* Results Summary Bar */}
          <View
            style={[
              styles.resultsMetaBar,
              {
                backgroundColor: theme.colors.surface,
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.resultsCountText, { color: theme.colors.textSecondary }]}>
              Found <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>{searchResults.length}</Text>{' '}
              results for "{query}"
            </Text>

            {/* View Mode Toggle: Grid vs List */}
            <View style={styles.viewToggleGroup}>
              <TouchableOpacity
                onPress={() => setViewMode('grid')}
                style={[
                  styles.toggleBtn,
                  viewMode === 'grid' && { backgroundColor: theme.colors.primaryLight },
                ]}
                accessibilityLabel="Grid view"
                accessibilityRole="button"
              >
                <Ionicons
                  name="grid-outline"
                  size={16}
                  color={viewMode === 'grid' ? theme.colors.primary : theme.colors.textTertiary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setViewMode('list')}
                style={[
                  styles.toggleBtn,
                  viewMode === 'list' && { backgroundColor: theme.colors.primaryLight },
                ]}
                accessibilityLabel="List view"
                accessibilityRole="button"
              >
                <Ionicons
                  name="list-outline"
                  size={17}
                  color={viewMode === 'list' ? theme.colors.primary : theme.colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {searchResults.length > 0 ? (
            <FlatList
              key={viewMode}
              data={searchResults}
              numColumns={viewMode === 'grid' ? 2 : 1}
              columnWrapperStyle={viewMode === 'grid' ? styles.gridColumnWrapper : undefined}
              contentContainerStyle={styles.listContentPadding}
              keyExtractor={(item, index) => String(item.id || item.productId || index)}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={viewMode === 'grid' ? { width: gridCardWidth, marginBottom: 12 } : { marginBottom: 10 }}>
                  <ProductCard
                    product={item}
                    variant={viewMode === 'grid' ? 'grid' : 'list'}
                    style={viewMode === 'grid' ? { width: '100%', marginBottom: 0 } : undefined}
                    onPress={() =>
                      navigation.navigate('ProductDetail', {
                        productId: String(item.id || item.productId),
                        product: item,
                      })
                    }
                  />
                </View>
              )}
            />
          ) : (
            /* Empty State */
            <View style={styles.emptyResultsBox}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Ionicons name="search-outline" size={42} color={theme.colors.textTertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                No Products Found
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                We couldn't find any products matching "{query}". Try checking your spelling or search using more general terms.
              </Text>
            </View>
          )}
        </View>
      ) : (
        /* Clean Initial State — Intentionally empty space below search bar */
        <View style={styles.cleanInitialState} />
      )}
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
    gap: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputContainer: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  inputInnerWrapper: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    position: 'relative',
  },
  animatedPlaceholderWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  animatedPlaceholderText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    height: '100%',
    padding: 0,
  },
  innerActionBtn: {
    paddingHorizontal: 4,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cleanInitialState: {
    flex: 1,
  },
  resultsMetaBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultsCountText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  viewToggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContentPadding: {
    padding: 16,
    paddingBottom: 40,
  },
  gridColumnWrapper: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  skeletonContainer: {
    padding: 16,
  },
  resultsHeaderRow: {
    marginBottom: 16,
  },
  skeletonPill: {
    width: 140,
    height: 18,
    borderRadius: 4,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emptyResultsBox: {
    padding: 32,
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
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
    maxWidth: 290,
  },
});
