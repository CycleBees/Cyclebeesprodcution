/**
 * Logo Component
 * Reusable logo component with SVG support and theme-aware background selection
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Colors } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';

export type LogoVariant = 'icon' | 'text' | 'full';
export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

export interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  style?: ViewStyle;
  useDarkBackground?: boolean;
}

export default function Logo({ 
  size = 'md', 
  variant = 'full', 
  style,
  useDarkBackground 
}: LogoProps) {
  const { isDark } = useAppTheme();
  const shouldUseDarkBackground = useDarkBackground !== undefined ? useDarkBackground : isDark;
  
  const getSizeValue = (): number => {
    switch (size) {
      case 'sm': return 32;
      case 'md': return 48;
      case 'lg': return 64;
      case 'xl': return 80;
      default: return 48;
    }
  };

  const getLogoSvg = (): string => {
    // SVG content for black background (dark theme) - Logo-Black-Bg.svg
    const blackBgSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg width="100%" height="100%" viewBox="0 0 200 200" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;">
    <g transform="matrix(0.437985,0,0,0.437985,-593.669,-281.679)">
        <g id="CycleBeesTransparent" transform="matrix(0.737123,0,0,0.737123,1583.77,882.213)">
            <g transform="matrix(1,0,0,1,-366,-366)">
                <g transform="matrix(1,0,0,1,-0.6435,0)">
                    <g>
                        <g>
                            <path d="M321.194,376.826C321.194,429.994 278.028,473.16 224.86,473.16C171.692,473.16 128.526,429.994 128.526,376.826C128.526,323.658 171.692,280.492 224.86,280.492" style="fill:rgb(255,209,30);fill-opacity:0;stroke:white;stroke-width:45.52px;"/>
                            <path d="M281.04,320.205L375.434,226.84L450.21,420.42" style="fill:none;stroke:white;stroke-width:52.08px;"/>
                            <circle cx="522.906" cy="391.305" r="81.855" style="fill:rgb(255,221,88);stroke:white;stroke-width:45.57px;"/>
                        </g>
                    </g>
                </g>
            </g>
            <g>
            </g>
        </g>
    </g>
</svg>`;

    // SVG content for white background (light theme) - Logo-White-Bg.svg
    const whiteBgSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg width="100%" height="100%" viewBox="0 0 200 200" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;">
    <g transform="matrix(1.11296,0,0,1.11296,-1255.37,-3267.27)">
        <g>
            <g>
                <g transform="matrix(1,0,0,1,-378.339,-0.828352)">
                    <path d="M1583.08,3034.05C1583.08,3049.34 1570.67,3061.75 1555.38,3061.75C1540.1,3061.75 1527.68,3049.34 1527.68,3034.05C1527.68,3018.77 1540.1,3006.36 1555.38,3006.36" style="fill:rgb(255,209,30);fill-opacity:0;stroke:rgb(20,15,0);stroke-width:13.09px;"/>
                </g>
                <g transform="matrix(1,0,0,1,-417.303,0)">
                    <path d="M1610.5,3016.95L1637.64,2990.1L1659.14,3045.76" style="fill:none;stroke:rgb(20,15,0);stroke-width:14.98px;"/>
                </g>
                <g transform="matrix(0.82141,0,0,0.82141,-150.163,548.444)">
                    <circle cx="1720.09" cy="3030.09" r="28.652" style="fill:rgb(255,209,30);stroke:rgb(20,15,0);stroke-width:15.95px;"/>
                </g>
            </g>
        </g>
    </g>
</svg>`;

    // Use the appropriate SVG based on theme mode
    // Light mode: use Logo-White-Bg.svg (dark logo for light backgrounds)
    // Dark mode: use Logo-Black-Bg.svg (white logo for dark backgrounds)
    return shouldUseDarkBackground ? blackBgSvg : whiteBgSvg;
  };

  const sizeValue = getSizeValue();
  const logoSvg = getLogoSvg();

  if (variant === 'icon') {
    return (
      <View style={[styles.container, { width: sizeValue, height: sizeValue }, style]}>
        <SvgXml
          width={sizeValue}
          height={sizeValue}
          xml={logoSvg}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <SvgXml
        width={sizeValue}
        height={sizeValue}
        xml={logoSvg}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 