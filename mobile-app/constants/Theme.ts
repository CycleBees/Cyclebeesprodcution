/**
 * Theme System
 * Comprehensive theme definitions with semantic color names and consistent theming
 */

import { Colors } from './Colors';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from './Styles';

// Semantic color definitions
export const SEMANTIC_COLORS = {
  // Brand colors
  primary: {
    main: Colors.light.primary,
    light: Colors.light.accent1,
    dark: Colors.light.dark1,
    contrast: Colors.light.background,
  },
  secondary: {
    main: Colors.light.secondary,
    light: Colors.light.gray,
    dark: Colors.light.dark2,
    contrast: Colors.light.background,
  },
  
  // Status colors
  success: {
    main: Colors.light.success,
    light: '#d4edda',
    dark: '#155724',
    contrast: '#ffffff',
  },
  warning: {
    main: Colors.light.warning,
    light: '#fff3cd',
    dark: '#856404',
    contrast: '#000000',
  },
  error: {
    main: Colors.light.error,
    light: '#f8d7da',
    dark: '#721c24',
    contrast: '#ffffff',
  },
  info: {
    main: Colors.light.info,
    light: '#d1ecf1',
    dark: '#0c5460',
    contrast: '#ffffff',
  },
  
  // Neutral colors
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
} as const;

// Light theme
export const lightTheme = {
  // Colors
  colors: {
    // Background colors
    background: Colors.light.background,
    surface: Colors.light.cardBackground,
    surfaceVariant: Colors.light.accent1,
    
    // Text colors
    text: {
      primary: Colors.light.text,
      secondary: Colors.light.gray,
      disabled: Colors.light.gray,
      inverse: Colors.light.background,
    },
    
    // Border colors
    border: {
      primary: Colors.light.border,
      secondary: Colors.light.accent1,
      focus: Colors.light.primary,
      error: Colors.light.error,
    },
    
    // Interactive colors
    interactive: {
      primary: Colors.light.primary,
      secondary: Colors.light.secondary,
      disabled: Colors.light.gray,
      hover: Colors.light.accent1,
    },
    
    // Status colors
    status: {
      success: SEMANTIC_COLORS.success,
      warning: SEMANTIC_COLORS.warning,
      error: SEMANTIC_COLORS.error,
      info: SEMANTIC_COLORS.info,
    },
    
    // Brand colors
    brand: {
      primary: SEMANTIC_COLORS.primary,
      secondary: SEMANTIC_COLORS.secondary,
    },
    
    // Neutral colors
    neutral: SEMANTIC_COLORS.neutral,
  },
  
  // Typography
  typography: {
    // Headings
    h1: {
      fontSize: TYPOGRAPHY['4xl'],
      fontWeight: TYPOGRAPHY.fontWeightBold,
      lineHeight: TYPOGRAPHY['4xl'] * TYPOGRAPHY.lineHeightTight,
      color: Colors.light.text,
    },
    h2: {
      fontSize: TYPOGRAPHY['3xl'],
      fontWeight: TYPOGRAPHY.fontWeightBold,
      lineHeight: TYPOGRAPHY['3xl'] * TYPOGRAPHY.lineHeightTight,
      color: Colors.light.text,
    },
    h3: {
      fontSize: TYPOGRAPHY['2xl'],
      fontWeight: TYPOGRAPHY.fontWeightSemibold,
      lineHeight: TYPOGRAPHY['2xl'] * TYPOGRAPHY.lineHeightTight,
      color: Colors.light.text,
    },
    h4: {
      fontSize: TYPOGRAPHY.xl,
      fontWeight: TYPOGRAPHY.fontWeightSemibold,
      lineHeight: TYPOGRAPHY.xl * TYPOGRAPHY.lineHeightNormal,
      color: Colors.light.text,
    },
    
    // Body text
    body1: {
      fontSize: TYPOGRAPHY.base,
      fontWeight: TYPOGRAPHY.fontWeightNormal,
      lineHeight: TYPOGRAPHY.base * TYPOGRAPHY.lineHeightNormal,
      color: Colors.light.text,
    },
    body2: {
      fontSize: TYPOGRAPHY.sm,
      fontWeight: TYPOGRAPHY.fontWeightNormal,
      lineHeight: TYPOGRAPHY.sm * TYPOGRAPHY.lineHeightNormal,
      color: Colors.light.gray,
    },
    
    // Special text
    caption: {
      fontSize: TYPOGRAPHY.xs,
      fontWeight: TYPOGRAPHY.fontWeightNormal,
      lineHeight: TYPOGRAPHY.xs * TYPOGRAPHY.lineHeightNormal,
      color: Colors.light.gray,
    },
    button: {
      fontSize: TYPOGRAPHY.base,
      fontWeight: TYPOGRAPHY.fontWeightSemibold,
      lineHeight: TYPOGRAPHY.base * TYPOGRAPHY.lineHeightTight,
      color: Colors.light.background,
    },
    link: {
      fontSize: TYPOGRAPHY.base,
      fontWeight: TYPOGRAPHY.fontWeightMedium,
      lineHeight: TYPOGRAPHY.base * TYPOGRAPHY.lineHeightNormal,
      color: Colors.light.primary,
    },
  },
  
  // Component styles
  components: {
    // Button variants
    button: {
      primary: {
        backgroundColor: Colors.light.primary,
        borderColor: Colors.light.primary,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        ...SHADOWS.base,
      },
      secondary: {
        backgroundColor: 'transparent',
        borderColor: Colors.light.primary,
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: Colors.light.border,
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
      },
    },
    
    // Input variants
    input: {
      default: {
        backgroundColor: Colors.light.background,
        borderColor: Colors.light.border,
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        fontSize: TYPOGRAPHY.base,
        color: Colors.light.text,
      },
      focused: {
        backgroundColor: Colors.light.background,
        borderColor: Colors.light.primary,
        borderWidth: 2,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        fontSize: TYPOGRAPHY.base,
        color: Colors.light.text,
      },
      error: {
        backgroundColor: Colors.light.background,
        borderColor: Colors.light.error,
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        fontSize: TYPOGRAPHY.base,
        color: Colors.light.text,
      },
    },
    
    // Card variants
    card: {
      default: {
        backgroundColor: Colors.light.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        margin: SPACING.md,
        ...SHADOWS.base,
      },
      elevated: {
        backgroundColor: Colors.light.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        margin: SPACING.md,
        ...SHADOWS.lg,
      },
      outlined: {
        backgroundColor: Colors.light.cardBackground,
        borderColor: Colors.light.border,
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        margin: SPACING.md,
      },
    },
  },
} as const;

// Dark theme
export const darkTheme = {
  // Colors
  colors: {
    // Background colors
    background: Colors.dark.background,
    surface: Colors.dark.cardBackground,
    surfaceVariant: Colors.dark.dark1,
    
    // Text colors
    text: {
      primary: Colors.dark.text,
      secondary: Colors.dark.gray,
      disabled: Colors.dark.gray,
      inverse: Colors.dark.background,
    },
    
    // Border colors
    border: {
      primary: Colors.dark.border,
      secondary: Colors.dark.dark1,
      focus: Colors.dark.primary,
      error: Colors.dark.error,
    },
    
    // Interactive colors
    interactive: {
      primary: Colors.dark.primary,
      secondary: Colors.dark.secondary,
      disabled: Colors.dark.gray,
      hover: Colors.dark.dark1,
    },
    
    // Status colors (same as light for consistency)
    status: {
      success: SEMANTIC_COLORS.success,
      warning: SEMANTIC_COLORS.warning,
      error: SEMANTIC_COLORS.error,
      info: SEMANTIC_COLORS.info,
    },
    
    // Brand colors
    brand: {
      primary: SEMANTIC_COLORS.primary,
      secondary: SEMANTIC_COLORS.secondary,
    },
    
    // Neutral colors
    neutral: SEMANTIC_COLORS.neutral,
  },
  
  // Typography (same structure, different colors)
  typography: {
    h1: {
      ...lightTheme.typography.h1,
      color: Colors.dark.text,
    },
    h2: {
      ...lightTheme.typography.h2,
      color: Colors.dark.text,
    },
    h3: {
      ...lightTheme.typography.h3,
      color: Colors.dark.text,
    },
    h4: {
      ...lightTheme.typography.h4,
      color: Colors.dark.text,
    },
    body1: {
      ...lightTheme.typography.body1,
      color: Colors.dark.text,
    },
    body2: {
      ...lightTheme.typography.body2,
      color: Colors.dark.gray,
    },
    caption: {
      ...lightTheme.typography.caption,
      color: Colors.dark.gray,
    },
    button: {
      ...lightTheme.typography.button,
      color: Colors.dark.background,
    },
    link: {
      ...lightTheme.typography.link,
      color: Colors.dark.primary,
    },
  },
  
  // Component styles (same structure, different colors)
  components: {
    button: {
      primary: {
        ...lightTheme.components.button.primary,
        backgroundColor: Colors.dark.primary,
        borderColor: Colors.dark.primary,
      },
      secondary: {
        ...lightTheme.components.button.secondary,
        borderColor: Colors.dark.primary,
      },
      outline: {
        ...lightTheme.components.button.outline,
        borderColor: Colors.dark.border,
      },
      ghost: {
        ...lightTheme.components.button.ghost,
      },
    },
    input: {
      default: {
        ...lightTheme.components.input.default,
        backgroundColor: Colors.dark.background,
        borderColor: Colors.dark.border,
        color: Colors.dark.text,
      },
      focused: {
        ...lightTheme.components.input.focused,
        backgroundColor: Colors.dark.background,
        borderColor: Colors.dark.primary,
        color: Colors.dark.text,
      },
      error: {
        ...lightTheme.components.input.error,
        backgroundColor: Colors.dark.background,
        borderColor: Colors.dark.error,
        color: Colors.dark.text,
      },
    },
    card: {
      default: {
        ...lightTheme.components.card.default,
        backgroundColor: Colors.dark.cardBackground,
      },
      elevated: {
        ...lightTheme.components.card.elevated,
        backgroundColor: Colors.dark.cardBackground,
      },
      outlined: {
        ...lightTheme.components.card.outlined,
        backgroundColor: Colors.dark.cardBackground,
        borderColor: Colors.dark.border,
      },
    },
  },
} as const;

// Theme type
export type Theme = typeof lightTheme;
export type ThemeMode = 'light' | 'dark';

// Theme selector function
export const getTheme = (mode: ThemeMode): Theme => {
  return mode === 'dark' ? darkTheme : lightTheme;
};

export default {
  lightTheme,
  darkTheme,
  getTheme,
  SEMANTIC_COLORS,
}; 