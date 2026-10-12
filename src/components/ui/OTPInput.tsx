/**
 * HINCH MART — OTP Input Component
 */
import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

export interface OTPInputProps {
  length?: number;
  onCodeFilled: (code: string) => void;
  style?: ViewStyle;
}

export function OTPInput({ length = 6, onCodeFilled, style }: OTPInputProps) {
  const { theme } = useTheme();
  const [code, setCode] = useState<string[]>(Array(length).fill(''));
  const inputsRef = useRef<Array<TextInput | null>>([]);

  const handleChangeText = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text.length > 0 && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    const fullCode = newCode.join('');
    if (fullCode.length === length) {
      onCodeFilled(fullCode);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {code.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => { inputsRef.current[index] = ref; }}
          value={digit}
          onChangeText={(text) => handleChangeText(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
          style={[
            styles.box,
            {
              backgroundColor: theme.colors.inputBackground,
              borderColor: digit
                ? theme.colors.primary
                : theme.colors.inputBorder,
              color: theme.colors.textPrimary,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 16,
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
  },
});
