/**
 * Badge Component
 * Reusable badge component for status indicators and labels
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from '@/constants/Colors';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/constants/Styles';
import { useAppTheme } from '@/hooks/useAppTheme';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  outlined?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  lightColor?: string;
  darkColor?: string;
}

export default function Badge({
  label,
  variant = 'default',
  size = 'md',
  icon,
  iconPosition = 'left',
  outlined = false,
  style,
  textStyle,
  lightColor,
  darkColor,
}: BadgeProps) {
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    'background'
  );
  const { colors } = useAppTheme();

  // Get badge styles based on variant, size, and outlined state
  const getBadgeStyle = (): ViewStyle => {
    const baseStyle = styles.badge;
    const sizeStyle = styles[size];

    // Dynamic variant styles based on theme
    const variantStyle = outlined ? {
      default: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.gray },
      primary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
      success: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.success },
      warning: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.warning },
      error: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.error },
      info: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.info },
    }[variant] : {
      default: { backgroundColor: colors.gray },
      primary: { backgroundColor: colors.primary },
      success: { backgroundColor: colors.success },
      warning: { backgroundColor: colors.warning },
      error: { backgroundColor: colors.error },
      info: { backgroundColor: colors.info },
    }[variant];

    return {
      ...baseStyle,
      ...variantStyle,
      ...sizeStyle,
      ...style,
    };
  };

  // Get text styles based on variant, size, and outlined state
  const getTextStyle = (): TextStyle => {
    const baseTextStyle = styles.text;
    const sizeTextStyle = styles[`${size}Text`];

    // Dynamic variant text styles based on theme
    const variantTextStyle = outlined ? {
      default: { color: colors.gray },
      primary: { color: colors.primary },
      success: { color: colors.success },
      warning: { color: colors.warning },
      error: { color: colors.error },
      info: { color: colors.info },
    }[variant] : {
      default: { color: colors.background },
      primary: { color: colors.background },
      success: { color: colors.background },
      warning: { color: colors.background },
      error: { color: colors.background },
      info: { color: colors.background },
    }[variant];

    return {
      ...baseTextStyle,
      ...variantTextStyle,
      ...sizeTextStyle,
      ...textStyle,
    };
  };

  // Get icon styles
  const getIconStyle = (): TextStyle => {
    const baseIconStyle = styles.icon;
    const sizeIconStyle = styles[`${size}Icon`];

    return {
      ...baseIconStyle,
      ...sizeIconStyle,
    };
  };

  // Get icon color based on variant and outlined state
  const getIconColor = (): string => {
    if (outlined) {
      switch (variant) {
        case 'primary':
          return colors.primary;
        case 'success':
          return colors.success;
        case 'warning':
          return colors.warning;
        case 'error':
          return colors.error;
        case 'info':
          return colors.info;
        default:
          return colors.gray;
      }
    } else {
      switch (variant) {
        case 'primary':
          return colors.background;
        case 'success':
          return colors.background;
        case 'warning':
          return colors.background;
        case 'error':
          return colors.background;
        case 'info':
          return colors.background;
        default:
          return colors.text;
      }
    }
  };

  // Render icon
  const renderIcon = () => {
    if (!icon) return null;

    return (
      <Ionicons
        name={icon}
        size={size === 'sm' ? 12 : size === 'lg' ? 16 : 14}
        color={getIconColor()}
        style={getIconStyle()}
      />
    );
  };

  return (
    <View style={getBadgeStyle()}>
      {iconPosition === 'left' && renderIcon()}
      <Text style={getTextStyle()}>{label}</Text>
      {iconPosition === 'right' && renderIcon()}
    </View>
  );
}

const styles = StyleSheet.create({
  // Base badge styles
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
  },

  // Variant styles - now handled dynamically in getBadgeStyle

  // Size styles
  sm: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    minHeight: 20,
  },
  md: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    minHeight: 24,
  },
  lg: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    minHeight: 28,
  },

  // Text styles
  text: {
    fontWeight: TYPOGRAPHY.fontWeightMedium,
    textAlign: 'center',
  },
  // Variant text styles - now handled dynamically in getTextStyle

  // Size-specific text styles
  smText: {
    fontSize: TYPOGRAPHY.xs,
  },
  mdText: {
    fontSize: TYPOGRAPHY.sm,
  },
  lgText: {
    fontSize: TYPOGRAPHY.base,
  },

  // Icon styles
  icon: {
    marginHorizontal: SPACING.xs,
  },
  smIcon: {
    marginHorizontal: 2,
  },
  mdIcon: {
    marginHorizontal: SPACING.xs,
  },
  lgIcon: {
    marginHorizontal: SPACING.sm,
  },
}); 