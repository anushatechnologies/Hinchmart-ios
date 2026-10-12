/**
 * HINCH MART — ProductGrid Component (HinchProductGrid)
 * Unified 2-column product grid with perfect horizontal alignment and zero height jitter
 */
import React from 'react';
import {
  View,
  FlatList,
  FlatListProps,
  StyleSheet,
  ViewStyle,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../theme';
import { ProductCard } from '../cards/ProductCard';

export interface ProductGridProps<T = any> extends Partial<FlatListProps<T>> {
  data: T[];
  onProductPress: (product: T) => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  ListHeaderComponent?: React.ReactElement | null;
  ListEmptyComponent?: React.ReactElement | null;
  ListFooterComponent?: React.ReactElement | null;
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
}

export function ProductGrid<T = any>({
  data,
  onProductPress,
  isRefreshing = false,
  onRefresh,
  ListHeaderComponent,
  ListEmptyComponent,
  ListFooterComponent,
  contentContainerStyle,
  style,
  ...rest
}: ProductGridProps<T>) {
  const { theme } = useTheme();

  return (
    <FlatList
      data={data}
      keyExtractor={(item: any, index) => String(item?.id || item?.productId || index)}
      numColumns={2}
      columnWrapperStyle={data && data.length > 0 ? styles.columnWrapper : undefined}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        ) : undefined
      }
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={ListFooterComponent}
      renderItem={({ item }) => (
        <ProductCard
          product={item}
          onPress={() => onProductPress(item)}
          variant="grid"
          style={styles.cardItem}
        />
      )}
      style={[styles.list, style]}
      {...rest}
    />
  );
}

export const HinchProductGrid = ProductGrid;

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  cardItem: {
    width: '48.5%',
  },
});
