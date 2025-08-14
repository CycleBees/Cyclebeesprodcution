/**
 * Global Styles System
 * Standardized spacing, typography, and layout constants for consistent styling across the app
 */

import { Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Screen dimensions
export const SCREEN = {
  width,
  height,
  isSmall: width < 375,
  isMedium: width >= 375 && width < 414,
  isLarge: width >= 414,
};

// Spacing system (8px base unit)
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

// Typography scale
export const TYPOGRAPHY = {
  // Font sizes
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 36,
  
  // Line heights (multiplier)
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.75,
  
  // Font weights
  fontWeightNormal: '400' as const,
  fontWeightMedium: '500' as const,
  fontWeightSemibold: '600' as const,
  fontWeightBold: '700' as const,
  fontWeightExtrabold: '800' as const,
} as const;

// Border radius system
export const BORDER_RADIUS = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

// Shadow system
export const SHADOWS = {
  sm: {
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  base: {
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  md: {
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  lg: {
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 12,
  },
  xl: {
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 16,
  },
} as const;

// Layout constants
export const LAYOUT = {
  // Container max widths
  container: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
  
  // Common padding
  padding: {
    screen: SPACING.md,
    card: SPACING.lg,
    button: SPACING.md,
    input: SPACING.md,
  },
  
  // Common margins
  margin: {
    section: SPACING.xl,
    card: SPACING.md,
    button: SPACING.sm,
    input: SPACING.sm,
  },
  
  // Heights
  height: {
    button: 48,
    input: 48,
    header: 60,
    tabBar: 80,
    card: 120,
  },
  
  // Widths
  width: {
    button: {
      sm: 80,
      md: 120,
      lg: 160,
      full: '100%',
    },
    input: '100%',
    card: '100%',
  },
} as const;

// Animation constants
export const ANIMATION = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    ease: 'ease' as const,
    easeIn: 'ease-in' as const,
    easeOut: 'ease-out' as const,
    easeInOut: 'ease-in-out' as const,
  },
} as const;

// Z-index system
export const Z_INDEX = {
  base: 0,
  card: 1,
  modal: 10,
  overlay: 20,
  tooltip: 30,
  dropdown: 40,
  toast: 50,
  modalOverlay: 100,
} as const;

// Platform-specific adjustments
export const PLATFORM = {
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  isWeb: Platform.OS === 'web',
  
  // Platform-specific shadows
  shadow: Platform.select({
    ios: {
      shadowColor: 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
    web: {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
  }),
} as const;

// Common style patterns
export const PATTERNS = {
  // Card pattern
  card: {
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.lg,
    padding: LAYOUT.padding.card,
    margin: LAYOUT.margin.card,
    ...SHADOWS.base,
  },
  
  // Button pattern
  button: {
    height: LAYOUT.height.button,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: LAYOUT.padding.button,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  
  // Input pattern
  input: {
    height: LAYOUT.height.input,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: LAYOUT.padding.input,
    borderWidth: 1,
    fontSize: TYPOGRAPHY.base,
  },
  
  // Section pattern
  section: {
    marginVertical: LAYOUT.margin.section,
  },
} as const;

export default {
  SCREEN,
  SPACING,
  TYPOGRAPHY,
  BORDER_RADIUS,
  SHADOWS,
  LAYOUT,
  ANIMATION,
  Z_INDEX,
  PLATFORM,
  PATTERNS,
}; 