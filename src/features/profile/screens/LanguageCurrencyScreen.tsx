/**
 * HINCH MART — Language & Currency Selection Screen (IBO Home Building Megastore Theme)
 * - Safe area top header with back navigation
 * - Clean white card surfaces with subtle borders & selection checkmarks
 * - Language selection & Currency symbol pills
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { SUPPORTED_LANGUAGES, SUPPORTED_CURRENCIES, STORAGE_KEYS } from '../../../constants/app';
import { setAppLanguage } from '../../../localization';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { setLanguage, setCurrency } from '../../../redux/slices/themeSlice';
import { mmkvStorage } from '../../../services/storage/mmkv';

export function LanguageCurrencyScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const currentLang = useAppSelector((state) => state.theme.language);
  const currentCurr = useAppSelector((state) => state.theme.currency);

  const handleSelectLang = (code: string) => {
    setAppLanguage(code);
    dispatch(setLanguage(code));
  };

  const handleSelectCurr = (code: string) => {
    mmkvStorage.setString(STORAGE_KEYS.CURRENCY, code);
    dispatch(setCurrency(code));
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

      {/* Header */}
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              Language & Currency
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Regional Display Preferences
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
        {/* Language Selection */}
        <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>
          Application Language
        </Text>

        <View
          style={[
            styles.cardBox,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {SUPPORTED_LANGUAGES.map((lang, idx) => {
            const isSelected = currentLang === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                onPress={() => handleSelectLang(lang.code)}
                activeOpacity={0.7}
                style={[
                  styles.itemRow,
                  idx < SUPPORTED_LANGUAGES.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: 1 },
                  isSelected && { backgroundColor: theme.colors.primaryLight },
                ]}
              >
                <View style={styles.leftMeta}>
                  <Ionicons
                    name="globe-outline"
                    size={18}
                    color={isSelected ? theme.colors.primary : theme.colors.textTertiary}
                    style={{ marginRight: 12 }}
                  />
                  <Text style={[styles.itemText, { color: isSelected ? theme.colors.primary : theme.colors.textPrimary, fontWeight: isSelected ? '700' : '500' }]}>
                    {lang.name} ({lang.nativeName}){lang.rtl ? ' [RTL]' : ''}
                  </Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Currency Selection */}
        <Text style={[styles.heading, { color: theme.colors.textPrimary, marginTop: 24 }]}>
          Display Currency
        </Text>

        <View
          style={[
            styles.cardBox,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {SUPPORTED_CURRENCIES.map((curr, idx) => {
            const isSelected = currentCurr === curr.code;
            return (
              <TouchableOpacity
                key={curr.code}
                onPress={() => handleSelectCurr(curr.code)}
                activeOpacity={0.7}
                style={[
                  styles.itemRow,
                  idx < SUPPORTED_CURRENCIES.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: 1 },
                  isSelected && { backgroundColor: theme.colors.primaryLight },
                ]}
              >
                <View style={styles.leftMeta}>
                  <View style={[styles.symbolBadge, { backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceVariant }]}>
                    <Text style={[styles.symbolText, { color: isSelected ? '#FFFFFF' : theme.colors.textPrimary }]}>
                      {curr.symbol}
                    </Text>
                  </View>
                  <Text style={[styles.itemText, { color: isSelected ? theme.colors.primary : theme.colors.textPrimary, fontWeight: isSelected ? '700' : '500' }]}>
                    {curr.name} ({curr.code})
                  </Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
  scrollPadding: {
    padding: 16,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardBox: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  leftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  symbolBadge: {
    width: 30,
    height: 30,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  symbolText: {
    fontWeight: '700',
    fontSize: 14,
  },
  itemText: {
    fontSize: 13.5,
  },
});
