/**
 * Enhanced Color System for Cycle-Bees Mobile App
 * Comprehensive color definitions with semantic naming and consistent theming
 * 
 * Brand Colors:
 * - Primary: #FFD11E (Yellow) - Main brand color for CTAs and highlights
 * - Secondary: #2D3E50 (Dark Blue) - Secondary brand color for backgrounds
 * - Accent: #FBE9A0, #FFF5CC - Light accent colors for subtle highlights
 * - Dark: #2F2500, #2B2E00 - Dark variants for contrast
 * - Gray: #4A4A4A - Neutral gray for text and borders
 */

// Core brand colors
const primaryColor = '#FFD11E';
const secondaryColor = '#2D3E50';
const accentColor1 = '#FBE9A0';
const accentColor2 = '#FFF5CC';
const darkColor1 = '#2F2500';
const darkColor2 = '#2B2E00';
const grayColor = '#4A4A4A';

// Semantic color definitions
export const SEMANTIC_COLORS = {
  // Brand colors with variants
  primary: {
    main: primaryColor,
    light: accentColor1,
    dark: darkColor1,
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: primaryColor,
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  secondary: {
    main: secondaryColor,
    light: '#4A5568',
    dark: '#1A202C',
    50: '#F7FAFC',
    100: '#EDF2F7',
    200: '#E2E8F0',
    300: '#CBD5E0',
    400: '#A0AEC0',
    500: '#718096',
    600: secondaryColor,
    700: '#2D3748',
    800: '#1A202C',
    900: '#171923',
  },
  
  // Status colors
  success: {
    main: '#28A745',
    light: '#D4EDDA',
    dark: '#155724',
    50: '#F0FFF4',
    100: '#C6F6D5',
    200: '#9AE6B4',
    300: '#68D391',
    400: '#48BB78',
    500: '#28A745',
    600: '#2F855A',
    700: '#276749',
    800: '#22543A',
    900: '#1C4532',
  },
  warning: {
    main: '#FFC107',
    light: '#FFF3CD',
    dark: '#856404',
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#FFC107',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  error: {
    main: '#DC3545',
    light: '#F8D7DA',
    dark: '#721C24',
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#DC3545',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },
  info: {
    main: '#17A2B8',
    light: '#D1ECF1',
    dark: '#0C5460',
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#17A2B8',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  
  // Neutral colors
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  
  // Gray scale
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: grayColor,
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
} as const;

export const Colors = {
  light: {
    text: '#1A1A1A',
    background: '#FFFFFF',
    tint: primaryColor,
    icon: '#4A4A4A',
    tabIconDefault: '#6B7280',
    tabIconSelected: primaryColor,
    primary: primaryColor,
    secondary: secondaryColor,
    accent1: '#FFF8E1',
    accent2: '#FFFDE7',
    dark1: '#2F2500',
    dark2: '#2B2E00',
    gray: '#6B7280',
    cardBackground: '#FFFFFF',
    border: '#E5E7EB',
    shadow: 'rgba(0, 0, 0, 0.08)',
    success: '#28A745',
    error: '#DC3545',
    warning: '#FFC107',
    info: '#17A2B8',
  },
  dark: {
    text: '#FFFFFF',
    background: '#0F0F0F',
    tint: primaryColor,
    icon: '#CCCCCC',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: primaryColor,
    primary: primaryColor,
    secondary: secondaryColor,
    accent1: '#2F2500',
    accent2: '#2B2E00',
    dark1: '#1A1A1A',
    dark2: '#2D2D2D',
    gray: '#9CA3AF',
    cardBackground: '#1E1E1E',
    border: '#333333',
    shadow: 'rgba(0, 0, 0, 0.3)',
    success: '#28A745',
    error: '#DC3545',
    warning: '#FFC107',
    info: '#17A2B8',
  },
};
