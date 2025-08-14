/**
 * Style Utilities
 * Helper functions for common styling patterns and theme management
 */

import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { Colors } from '@/constants/Colors';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/Styles';
import { getTheme, ThemeMode } from '@/constants/Theme';

// Type for style objects
export type StyleObject = ViewStyle | TextStyle | ImageStyle;

// Theme-aware style creation
export const createThemedStyle = (mode: ThemeMode, styleFn: (theme: ReturnType<typeof getTheme>) => StyleObject) => {
  const theme = getTheme(mode);
  return styleFn(theme);
};

// Spacing utilities
export const spacing = {
  // Margin utilities
  m: (value: keyof typeof SPACING | number) => ({ margin: typeof value === 'number' ? value : SPACING[value] }),
  mt: (value: keyof typeof SPACING | number) => ({ marginTop: typeof value === 'number' ? value : SPACING[value] }),
  mr: (value: keyof typeof SPACING | number) => ({ marginRight: typeof value === 'number' ? value : SPACING[value] }),
  mb: (value: keyof typeof SPACING | number) => ({ marginBottom: typeof value === 'number' ? value : SPACING[value] }),
  ml: (value: keyof typeof SPACING | number) => ({ marginLeft: typeof value === 'number' ? value : SPACING[value] }),
  mx: (value: keyof typeof SPACING | number) => ({ 
    marginHorizontal: typeof value === 'number' ? value : SPACING[value] 
  }),
  my: (value: keyof typeof SPACING | number) => ({ 
    marginVertical: typeof value === 'number' ? value : SPACING[value] 
  }),
  
  // Padding utilities
  p: (value: keyof typeof SPACING | number) => ({ padding: typeof value === 'number' ? value : SPACING[value] }),
  pt: (value: keyof typeof SPACING | number) => ({ paddingTop: typeof value === 'number' ? value : SPACING[value] }),
  pr: (value: keyof typeof SPACING | number) => ({ paddingRight: typeof value === 'number' ? value : SPACING[value] }),
  pb: (value: keyof typeof SPACING | number) => ({ paddingBottom: typeof value === 'number' ? value : SPACING[value] }),
  pl: (value: keyof typeof SPACING | number) => ({ paddingLeft: typeof value === 'number' ? value : SPACING[value] }),
  px: (value: keyof typeof SPACING | number) => ({ 
    paddingHorizontal: typeof value === 'number' ? value : SPACING[value] 
  }),
  py: (value: keyof typeof SPACING | number) => ({ 
    paddingVertical: typeof value === 'number' ? value : SPACING[value] 
  }),
} as const;

// Typography utilities
export const typography = {
  // Font size utilities
  textXs: { fontSize: TYPOGRAPHY.xs },
  textSm: { fontSize: TYPOGRAPHY.sm },
  textBase: { fontSize: TYPOGRAPHY.base },
  textLg: { fontSize: TYPOGRAPHY.lg },
  textXl: { fontSize: TYPOGRAPHY.xl },
  text2xl: { fontSize: TYPOGRAPHY['2xl'] },
  text3xl: { fontSize: TYPOGRAPHY['3xl'] },
  text4xl: { fontSize: TYPOGRAPHY['4xl'] },
  text5xl: { fontSize: TYPOGRAPHY['5xl'] },
  
  // Font weight utilities
  fontNormal: { fontWeight: TYPOGRAPHY.fontWeightNormal },
  fontMedium: { fontWeight: TYPOGRAPHY.fontWeightMedium },
  fontSemibold: { fontWeight: TYPOGRAPHY.fontWeightSemibold },
  fontBold: { fontWeight: TYPOGRAPHY.fontWeightBold },
  fontExtrabold: { fontWeight: TYPOGRAPHY.fontWeightExtrabold },
  
  // Line height utilities
  leadingTight: { lineHeight: TYPOGRAPHY.lineHeightTight },
  leadingNormal: { lineHeight: TYPOGRAPHY.lineHeightNormal },
  leadingRelaxed: { lineHeight: TYPOGRAPHY.lineHeightRelaxed },
} as const;

// Layout utilities
export const layout = {
  // Flex utilities
  flex: (value: number = 1) => ({ flex: value }),
  flexRow: { flexDirection: 'row' as const },
  flexCol: { flexDirection: 'column' as const },
  flexWrap: { flexWrap: 'wrap' as const },
  flexNowrap: { flexWrap: 'nowrap' as const },
  
  // Justify content utilities
  justifyStart: { justifyContent: 'flex-start' as const },
  justifyEnd: { justifyContent: 'flex-end' as const },
  justifyCenter: { justifyContent: 'center' as const },
  justifyBetween: { justifyContent: 'space-between' as const },
  justifyAround: { justifyContent: 'space-around' as const },
  justifyEvenly: { justifyContent: 'space-evenly' as const },
  
  // Align items utilities
  itemsStart: { alignItems: 'flex-start' as const },
  itemsEnd: { alignItems: 'flex-end' as const },
  itemsCenter: { alignItems: 'center' as const },
  itemsStretch: { alignItems: 'stretch' as const },
  itemsBaseline: { alignItems: 'baseline' as const },
  
  // Align self utilities
  selfStart: { alignSelf: 'flex-start' as const },
  selfEnd: { alignSelf: 'flex-end' as const },
  selfCenter: { alignSelf: 'center' as const },
  selfStretch: { alignSelf: 'stretch' as const },
  selfBaseline: { alignSelf: 'baseline' as const },
  
  // Position utilities
  relative: { position: 'relative' as const },
  absolute: { position: 'absolute' as const },
  fixed: { position: 'absolute' as const }, // React Native doesn't have fixed
  
  // Width and height utilities
  wFull: { width: '100%' },
  hFull: { height: '100%' },
  wScreen: { width: '100vw' }, // Note: React Native doesn't support vw
  hScreen: { height: '100vh' }, // Note: React Native doesn't support vh
  
  // Overflow utilities
  overflowHidden: { overflow: 'hidden' as const },
  overflowScroll: { overflow: 'scroll' as const },
  overflowVisible: { overflow: 'visible' as const },
} as const;

// Border utilities
export const borders = {
  // Border radius utilities
  roundedNone: { borderRadius: BORDER_RADIUS.none },
  roundedSm: { borderRadius: BORDER_RADIUS.sm },
  rounded: { borderRadius: BORDER_RADIUS.base },
  roundedMd: { borderRadius: BORDER_RADIUS.md },
  roundedLg: { borderRadius: BORDER_RADIUS.lg },
  roundedXl: { borderRadius: BORDER_RADIUS.xl },
  rounded2xl: { borderRadius: BORDER_RADIUS['2xl'] },
  roundedFull: { borderRadius: BORDER_RADIUS.full },
  
  // Border width utilities
  border: { borderWidth: 1 },
  border0: { borderWidth: 0 },
  border2: { borderWidth: 2 },
  border4: { borderWidth: 4 },
  border8: { borderWidth: 8 },
} as const;

// Shadow utilities
export const shadows = {
  shadowSm: SHADOWS.sm,
  shadow: SHADOWS.base,
  shadowMd: SHADOWS.md,
  shadowLg: SHADOWS.lg,
  shadowXl: SHADOWS.xl,
  shadowNone: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;

// Color utilities (theme-aware)
export const createColorUtils = (mode: ThemeMode) => {
  const theme = getTheme(mode);
  
  return {
    // Background colors
    bgPrimary: { backgroundColor: theme.colors.brand.primary.main },
    bgSecondary: { backgroundColor: theme.colors.brand.secondary.main },
    bgSurface: { backgroundColor: theme.colors.surface },
    bgSurfaceVariant: { backgroundColor: theme.colors.surfaceVariant },
    
    // Text colors
    textPrimary: { color: theme.colors.text.primary },
    textSecondary: { color: theme.colors.text.secondary },
    textDisabled: { color: theme.colors.text.disabled },
    textInverse: { color: theme.colors.text.inverse },
    
    // Border colors
    borderPrimary: { borderColor: theme.colors.border.primary },
    borderSecondary: { borderColor: theme.colors.border.secondary },
    borderFocus: { borderColor: theme.colors.border.focus },
    borderError: { borderColor: theme.colors.border.error },
    
    // Status colors
    bgSuccess: { backgroundColor: theme.colors.status.success.main },
    bgWarning: { backgroundColor: theme.colors.status.warning.main },
    bgError: { backgroundColor: theme.colors.status.error.main },
    bgInfo: { backgroundColor: theme.colors.status.info.main },
    
    textSuccess: { color: theme.colors.status.success.main },
    textWarning: { color: theme.colors.status.warning.main },
    textError: { color: theme.colors.status.error.main },
    textInfo: { color: theme.colors.status.info.main },
  };
};

// Common style combinations
export const commonStyles = {
  // Card styles
  card: {
    ...spacing.p('lg'),
    ...borders.roundedLg,
    ...shadows.shadow,
  },
  
  // Button base styles
  buttonBase: {
    ...spacing.px('lg'),
    ...spacing.py('md'),
    ...borders.roundedMd,
    ...layout.itemsCenter,
    ...layout.justifyCenter,
  },
  
  // Input base styles
  inputBase: {
    ...spacing.px('md'),
    ...spacing.py('md'),
    ...borders.roundedMd,
    ...borders.border,
    ...typography.textBase,
  },
  
  // Section styles
  section: {
    ...spacing.my('xl'),
  },
  
  // Row styles
  row: {
    ...layout.flexRow,
    ...layout.itemsCenter,
  },
  
  // Center styles
  center: {
    ...layout.itemsCenter,
    ...layout.justifyCenter,
  },
  
  // Full width styles
  fullWidth: {
    ...layout.wFull,
  },
  
  // Full height styles
  fullHeight: {
    ...layout.hFull,
  },
} as const;

// Style composition utility
export const composeStyles = (...styles: (StyleObject | undefined | null | false)[]): StyleObject => {
  return styles.reduce((composed, style) => {
    if (style && typeof style === 'object') {
      return { ...composed, ...style };
    }
    return composed;
  }, {} as any);
};

// Conditional style utility
export const conditionalStyle = (
  condition: boolean,
  trueStyle: StyleObject,
  falseStyle?: StyleObject
): StyleObject => {
  return condition ? trueStyle : (falseStyle || {});
};

// Responsive style utility (basic implementation)
export const responsiveStyle = (
  breakpoint: 'sm' | 'md' | 'lg',
  style: StyleObject
): StyleObject => {
  // Note: React Native doesn't have true responsive breakpoints
  // This is a placeholder for future web implementation
  return style;
};

// Animation style utilities
export const animationStyles = {
  // Fade animations
  fadeIn: {
    opacity: 1,
  },
  fadeOut: {
    opacity: 0,
  },
  
  // Scale animations
  scaleIn: {
    transform: [{ scale: 1 }],
  },
  scaleOut: {
    transform: [{ scale: 0 }],
  },
  
  // Slide animations
  slideInRight: {
    transform: [{ translateX: 0 }],
  },
  slideOutRight: {
    transform: [{ translateX: 100 }],
  },
  slideInLeft: {
    transform: [{ translateX: 0 }],
  },
  slideOutLeft: {
    transform: [{ translateX: -100 }],
  },
  slideInUp: {
    transform: [{ translateY: 0 }],
  },
  slideOutUp: {
    transform: [{ translateY: -100 }],
  },
  slideInDown: {
    transform: [{ translateY: 0 }],
  },
  slideOutDown: {
    transform: [{ translateY: 100 }],
  },
} as const;

// Export all utilities
export default {
  spacing,
  typography,
  layout,
  borders,
  shadows,
  createColorUtils,
  commonStyles,
  composeStyles,
  conditionalStyle,
  responsiveStyle,
  animationStyles,
  createThemedStyle,
}; 