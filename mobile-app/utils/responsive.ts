/**
 * Responsive utilities for consistent layouts across different screen sizes
 */

import { Dimensions } from 'react-native';
import { SPACING } from '@/constants/Styles';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Calculate grid dimensions for consistent card layouts
 */
export const getGridDimensions = (
  columns: number = 2,
  horizontalPadding: number = SPACING.md,
  gap: number = SPACING.md
) => {
  const totalHorizontalPadding = horizontalPadding * 2;
  const totalGaps = gap * (columns - 1);
  const availableWidth = screenWidth - totalHorizontalPadding - totalGaps;
  const itemWidth = availableWidth / columns;
  
  return {
    itemWidth: Math.floor(itemWidth),
    gap,
    columns,
    availableWidth,
    totalHorizontalPadding
  };
};

/**
 * Get responsive font size based on screen size
 */
export const getResponsiveFontSize = (baseSize: number) => {
  if (screenWidth < 375) {
    return baseSize * 0.9; // Small screens: 10% smaller
  } else if (screenWidth > 414) {
    return baseSize * 1.1; // Large screens: 10% larger
  }
  return baseSize;
};

/**
 * Get responsive spacing based on screen size
 */
export const getResponsiveSpacing = (baseSpacing: number) => {
  if (screenWidth < 375) {
    return Math.max(baseSpacing * 0.8, 4); // Small screens: 20% smaller, min 4px
  } else if (screenWidth > 414) {
    return baseSpacing * 1.2; // Large screens: 20% larger
  }
  return baseSpacing;
};

/**
 * Check if screen is small/medium/large
 */
export const getScreenSize = () => {
  if (screenWidth < 375) return 'small';
  if (screenWidth < 414) return 'medium';
  return 'large';
};

/**
 * Get responsive grid layout for different components
 */
export const getCardGridLayout = (cardType: 'bicycle' | 'service' | 'promotional' = 'bicycle') => {
  const baseColumns = cardType === 'bicycle' ? 2 : cardType === 'service' ? 1 : 2;
  const basePadding = SPACING.md;
  const baseGap = SPACING.md;
  
  // Adjust for small screens
  if (screenWidth < 375) {
    return getGridDimensions(
      cardType === 'service' ? 1 : 2, // Services stay single column on small screens
      basePadding * 0.8,
      baseGap * 0.8
    );
  }
  
  return getGridDimensions(baseColumns, basePadding, baseGap);
};

/**
 * Get consistent button sizing across screens
 */
export const getButtonDimensions = (size: 'sm' | 'md' | 'lg' = 'md') => {
  const baseSizes = {
    sm: { height: 40, fontSize: SPACING.sm + 6 }, // 14
    md: { height: 48, fontSize: SPACING.md }, // 16  
    lg: { height: 56, fontSize: SPACING.lg - 6 } // 18
  };
  
  const sizeConfig = baseSizes[size];
  
  if (screenWidth < 375) {
    return {
      height: sizeConfig.height * 0.9,
      fontSize: sizeConfig.fontSize * 0.9
    };
  }
  
  return sizeConfig;
};

export default {
  getGridDimensions,
  getResponsiveFontSize,
  getResponsiveSpacing,
  getScreenSize,
  getCardGridLayout,
  getButtonDimensions
};