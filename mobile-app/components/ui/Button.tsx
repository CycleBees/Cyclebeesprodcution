/**
 * Button Component
 * Reusable button component with multiple variants and consistent styling
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from '@/constants/Colors';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/Styles';
import { composeStyles, conditionalStyle } from '@/utils/styleUtils';
import { useAppTheme } from '@/hooks/useAppTheme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  lightColor?: string;
  darkColor?: string;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  lightColor,
  darkColor,
}: ButtonProps) {
  const { colors, isDark } = useAppTheme();

  // Get button styles based on variant and size
  const getButtonStyle = (): ViewStyle => {
    const baseStyle = styles.button;
    const sizeStyle = styles[size];
    const widthStyle = fullWidth ? styles.fullWidth : {};

    // Dynamic variant styles based on theme
    const variantStyle = {
      primary: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        borderWidth: 1,
      },
      secondary: {
        backgroundColor: 'transparent',
        borderColor: colors.primary,
        borderWidth: 1,
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: colors.border,
        borderWidth: 1,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderWidth: 0,
      },
      danger: {
        backgroundColor: colors.error,
        borderColor: colors.error,
        borderWidth: 1,
      },
    }[variant];

    const stateStyle = disabled ? { 
      backgroundColor: colors.gray, 
      borderColor: colors.gray, 
      opacity: 0.6 
    } : {};

    return {
      ...baseStyle,
      ...variantStyle,
      ...sizeStyle,
      ...stateStyle,
      ...widthStyle,
      ...style,
    };
  };

  // Get text styles based on variant and size
  const getTextStyle = (): TextStyle => {
    const baseTextStyle = styles.text;
    const sizeTextStyle = styles[`${size}Text`];

    // Dynamic variant text styles based on theme
    const variantTextStyle = {
      primary: { color: '#2D3E50' }, // Dark text on yellow background for visibility
      secondary: { color: colors.primary },
      outline: { color: colors.text },
      ghost: { color: colors.primary },
      danger: { color: colors.background },
    }[variant];

    const stateTextStyle = disabled ? { color: colors.gray } : {};

    return {
      ...baseTextStyle,
      ...variantTextStyle,
      ...sizeTextStyle,
      ...stateTextStyle,
      ...textStyle,
    };
  };

  // Get icon styles
  const getIconStyle = (): TextStyle => {
    const baseIconStyle = styles.icon;
    const sizeIconStyle = styles[`${size}Icon`];
    const stateIconStyle = disabled ? styles.disabledIcon : {};

    return {
      ...baseIconStyle,
      ...sizeIconStyle,
      ...stateIconStyle,
    };
  };

  // Render icon
  const renderIcon = () => {
    if (!icon || loading) return null;

    const iconColor = disabled 
      ? colors.gray 
      : variant === 'primary' 
        ? '#2D3E50' // Dark icon on yellow background for visibility
        : colors.primary;

    return (
      <Ionicons
        name={icon}
        size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18}
        color={iconColor}
        style={getIconStyle()}
      />
    );
  };

  // Render loading indicator
  const renderLoading = () => {
    if (!loading) return null;

    const indicatorColor = variant === 'primary' 
      ? '#2D3E50' // Dark indicator on yellow background for visibility
      : colors.primary;

    return (
      <ActivityIndicator
        size={size === 'sm' ? 'small' : 'small'}
        color={indicatorColor}
        style={styles.loadingIndicator}
      />
    );
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {iconPosition === 'left' && renderIcon()}
      {renderLoading()}
      <Text style={getTextStyle()}>{title}</Text>
      {iconPosition === 'right' && renderIcon()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Base button styles
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.base,
  },

  // Variant styles - now handled dynamically in getButtonStyle

  // Size styles
  sm: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    minHeight: 47,
  },
  md: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 56,
  },
  lg: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    minHeight: 56,
  },


  // State styles - now handled dynamically in getButtonStyle
  fullWidth: {
    width: '100%',
  },

  // Text styles
  text: {
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
    textAlign: 'center',
    flex: 0,
  },
  // Variant text styles - now handled dynamically in getTextStyle

  // Size-specific text styles
  smText: {
    fontSize: TYPOGRAPHY.sm,
  },
  mdText: {
    fontSize: TYPOGRAPHY.base,
  },
  lgText: {
    fontSize: TYPOGRAPHY.lg,
  },


  // State text styles - now handled dynamically in getTextStyle

  // Icon styles
  icon: {
    marginHorizontal: SPACING.xs,
  },
  smIcon: {
    marginHorizontal: SPACING.xs,
  },
  mdIcon: {
    marginHorizontal: SPACING.xs,
  },
  lgIcon: {
    marginHorizontal: SPACING.xs,
  },

  disabledIcon: {
    opacity: 0.6,
  },

  // Loading indicator styles
  loadingIndicator: {
    marginHorizontal: SPACING.xs,
  },
}); 