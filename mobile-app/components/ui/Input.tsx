/**
 * Input Component
 * Reusable input component with validation states and consistent styling
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from '@/constants/Colors';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/constants/Styles';
import { useAppTheme } from '@/hooks/useAppTheme';

export type InputVariant = 'default' | 'outlined' | 'filled';
export type InputSize = 'sm' | 'md' | 'lg';
export type InputState = 'default' | 'focused' | 'error' | 'success';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: InputVariant;
  size?: InputSize;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  fullWidth?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  helperStyle?: TextStyle;
  lightColor?: string;
  darkColor?: string;
}

export default function Input({
  label,
  error,
  helperText,
  variant = 'default',
  size = 'md',
  leftIcon,
  rightIcon,
  onRightIconPress,
  fullWidth = false,
  style,
  inputStyle,
  labelStyle,
  errorStyle,
  helperStyle,
  lightColor,
  darkColor,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  
  const { colors, isDark } = useAppTheme();
  
  // Use custom colors if provided, otherwise use theme colors
  const backgroundColor = lightColor && darkColor 
    ? (isDark ? darkColor : lightColor)
    : colors.background;
  const textColor = colors.text;
  const borderColor = colors.border;

  // Determine input state
  const getInputState = (): InputState => {
    if (error) return 'error';
    if (isFocused) return 'focused';
    return 'default';
  };

  const inputState = getInputState();

  // Get input container styles
  const getContainerStyle = (): ViewStyle => {
    const baseStyle = styles.container;
    const sizeStyle = styles[size];
    const widthStyle = fullWidth ? styles.fullWidth : {};

    // Dynamic variant styles based on theme
    const variantStyle = {
      default: { backgroundColor: colors.cardBackground },
      outlined: { backgroundColor: 'transparent' },
      filled: { backgroundColor: colors.accent1 },
    }[variant];

    // Dynamic state styles based on theme
    const stateStyle = {
      default: { borderColor: colors.border },
      focused: { borderColor: colors.primary, borderWidth: 2 },
      error: { borderColor: colors.error },
      success: { borderColor: colors.success },
    }[inputState];

    return {
      ...baseStyle,
      ...variantStyle,
      ...sizeStyle,
      ...stateStyle,
      ...widthStyle,
      ...style,
    };
  };

  // Get input styles
  const getInputStyle = (): TextStyle => {
    const baseInputStyle = styles.input;
    const sizeInputStyle = styles[`${size}Input`];

    return {
      ...baseInputStyle,
      ...sizeInputStyle,
      color: colors.text,
      ...inputStyle,
    };
  };

  // Get label styles
  const getLabelStyle = (): TextStyle => {
    const baseLabelStyle = styles.label;

    // Dynamic label styles based on theme and state
    const stateLabelStyle = {
      default: { color: colors.text },
      focused: { color: colors.primary },
      error: { color: colors.error },
      success: { color: colors.success },
    }[inputState];

    return {
      ...baseLabelStyle,
      ...stateLabelStyle,
      ...labelStyle,
    };
  };

  // Handle focus events
  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  // Render left icon
  const renderLeftIcon = () => {
    if (!leftIcon) return null;

    const iconColor = inputState === 'error' 
      ? colors.error 
      : inputState === 'focused' 
        ? colors.primary 
        : colors.gray;

    return (
      <Ionicons
        name={leftIcon}
        size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18}
        color={iconColor}
        style={styles.leftIcon}
      />
    );
  };

  // Render right icon
  const renderRightIcon = () => {
    if (!rightIcon) return null;

    const iconColor = inputState === 'error' 
      ? colors.error 
      : inputState === 'focused' 
        ? colors.primary 
        : colors.gray;

    return (
      <Ionicons
        name={rightIcon}
        size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18}
        color={iconColor}
        style={styles.rightIcon}
        onPress={onRightIconPress}
      />
    );
  };

  return (
    <View style={styles.wrapper}>
      {label && <Text style={getLabelStyle()}>{label}</Text>}
      
      <View style={getContainerStyle()}>
        {renderLeftIcon()}
        
        <TextInput
          style={getInputStyle()}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={colors.gray}
          {...props}
        />
        
        {renderRightIcon()}
      </View>
      
      {(error || helperText) && (
        <Text style={[
          styles.helperText,
          { color: error ? colors.error : colors.gray },
          error ? errorStyle : helperStyle,
        ]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Wrapper styles
  wrapper: {
    marginBottom: SPACING.md,
  },

  // Container styles
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
  },

  // Variant styles - now handled dynamically in getContainerStyle

  // Size styles
  sm: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minHeight: 36,
  },
  md: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 56,
  },
  lg: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 56,
  },

  // State styles - now handled dynamically in getContainerStyle

  // Width styles
  fullWidth: {
    width: '100%',
  },

  // Input styles
  input: {
    flex: 1,
    fontSize: TYPOGRAPHY.base,
  },
  smInput: {
    fontSize: TYPOGRAPHY.sm,
  },
  mdInput: {
    fontSize: TYPOGRAPHY.base,
  },
  lgInput: {
    fontSize: TYPOGRAPHY.lg,
  },

  // State-specific input styles - now handled dynamically in getInputStyle

  // Label styles
  label: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontWeightMedium,
    marginBottom: SPACING.xs,
  },
  // State-specific label styles - now handled dynamically in getLabelStyle

  // Icon styles
  leftIcon: {
    marginRight: SPACING.sm,
  },
  rightIcon: {
    marginLeft: SPACING.sm,
  },

  // Helper text styles
  helperText: {
    fontSize: TYPOGRAPHY.xs,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  // Helper text colors - now handled dynamically in render
}); 