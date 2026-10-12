/**
 * HINCH MART — Clean Modern SearchBar with Ionicons
 * Streamlined 44px height, crisp borders, professional ecommerce search styling
 */
import React, { useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ViewStyle, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  onVoicePress?: () => void;
  onScanPress?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  editable?: boolean;
  style?: ViewStyle;
}

export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  onClear,
  onVoicePress,
  onScanPress,
  placeholder = 'Search cement, steel, tools...',
  autoFocus = false,
  editable = true,
  style,
}: SearchBarProps) {
  const { theme, isDark } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onChangeText('');
    }
    inputRef.current?.focus();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isFocused ? theme.colors.primary : isDark ? '#334155' : '#E2E8F0',
          borderWidth: isFocused ? 1.5 : 1,
        },
        style,
      ]}
    >
      {/* Search Icon */}
      <Ionicons
        name="search"
        size={18}
        color={isFocused ? theme.colors.primary : isDark ? '#94A3B8' : '#64748B'}
        style={styles.searchIcon}
      />

      {/* Text Input */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
        autoFocus={autoFocus}
        editable={editable}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.input,
          { color: isDark ? '#F1F5F9' : '#0F172A' },
        ]}
      />

      {/* Clear / Voice / Scan Buttons */}
      {value.length > 0 ? (
        <TouchableOpacity
          onPress={handleClear}
          style={styles.actionBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.6}
        >
          <View style={[styles.clearCircle, { backgroundColor: isDark ? '#475569' : '#CBD5E1' }]}>
            <Ionicons name="close" size={12} color={isDark ? '#F1F5F9' : '#334155'} />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {onScanPress && (
            <TouchableOpacity
              onPress={onScanPress}
              style={styles.actionBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.6}
            >
              <Ionicons name="scan-outline" size={19} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          )}
          {onVoicePress && (
            <TouchableOpacity
              onPress={onVoicePress}
              style={styles.actionBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.6}
            >
              <Ionicons name="mic-outline" size={19} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    width: '100%',
    direction: 'ltr',
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13.5,
    height: '100%',
    paddingVertical: 0,
    textAlign: 'left',
    writingDirection: 'ltr',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  actionBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  clearCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const HinchSearchBar = SearchBar;
