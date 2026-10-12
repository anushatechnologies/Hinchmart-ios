import React from 'react';
import { StyleProp, ImageStyle } from 'react-native';
import { Image } from 'expo-image';

export interface GoogleIconProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export const GoogleIcon: React.FC<GoogleIconProps> = ({ size = 20, style }) => {
  return (
    <Image
      source={require('../../../assets/google_icon.png')}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      transition={200}
    />
  );
};

export default GoogleIcon;
