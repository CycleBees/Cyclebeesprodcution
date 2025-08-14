/**
 * Card Component
 * Reusable card component with multiple variants and consistent styling
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  ViewProps,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/Styles';
import { useAppTheme } from '@/hooks/useAppTheme';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'flat';

export interface CardProps extends ViewProps {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  margin?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
  lightColor?: string;
  darkColor?: string;
}

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  margin = 'md',
  borderRadius = 'lg',
  style,
  lightColor,
  darkColor,
  ...props
}: CardProps) {
  const { colors, isDark } = useAppTheme();

  // Get card styles based on variant and props
  const getCardStyle = (): ViewStyle => {
    const baseStyle = styles.card;
    const paddingStyle = styles[`padding${padding.charAt(0).toUpperCase() + padding.slice(1)}` as keyof typeof styles];
    const marginStyle = styles[`margin${margin.charAt(0).toUpperCase() + margin.slice(1)}` as keyof typeof styles];
    const borderRadiusStyle = styles[`borderRadius${borderRadius.charAt(0).toUpperCase() + borderRadius.slice(1)}` as keyof typeof styles];

    // Use custom colors if provided, otherwise use theme colors
    const backgroundColor = lightColor && darkColor 
      ? (isDark ? darkColor : lightColor)
      : colors.cardBackground;

    // Dynamic variant styles based on theme
    const variantStyle = {
      default: { ...SHADOWS.base },
      elevated: { ...SHADOWS.lg },
      outlined: { 
        borderWidth: 1, 
        borderColor: colors.border 
      },
      flat: {}, // No shadow or border
    }[variant];

    return {
      ...baseStyle,
      ...variantStyle,
      ...paddingStyle,
      ...marginStyle,
      ...borderRadiusStyle,
      backgroundColor,
      ...style,
    };
  };

  return (
    <View style={getCardStyle()} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // Base card styles
  card: {
    // backgroundColor now handled dynamically
  },

  // Variant styles - now handled dynamically in getCardStyle

  // Padding variants
  paddingNone: {
    padding: 0,
  },
  paddingSm: {
    padding: SPACING.sm,
  },
  paddingMd: {
    padding: SPACING.md,
  },
  paddingLg: {
    padding: SPACING.lg,
  },
  paddingXl: {
    padding: SPACING.xl,
  },

  // Margin variants
  marginNone: {
    margin: 0,
  },
  marginSm: {
    margin: SPACING.sm,
  },
  marginMd: {
    margin: SPACING.md,
  },
  marginLg: {
    margin: SPACING.lg,
  },
  marginXl: {
    margin: SPACING.xl,
  },

  // Border radius variants
  borderRadiusNone: {
    borderRadius: 0,
  },
  borderRadiusSm: {
    borderRadius: BORDER_RADIUS.sm,
  },
  borderRadiusMd: {
    borderRadius: BORDER_RADIUS.md,
  },
  borderRadiusLg: {
    borderRadius: BORDER_RADIUS.lg,
  },
  borderRadiusXl: {
    borderRadius: BORDER_RADIUS.xl,
  },
}); 