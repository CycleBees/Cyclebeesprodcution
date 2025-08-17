/**
 * LoadingDots Component
 * Reusable loading dots animation component
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { SPACING } from '@/constants/Styles';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  lightColor?: string;
  darkColor?: string;
  style?: any;
}

export default function LoadingDots({
  size = 'md',
  color,
  lightColor,
  darkColor,
  style,
}: LoadingDotsProps) {
  const { colors } = useAppTheme();
  const defaultColor = lightColor || darkColor || colors.text;
  const dotColor = color || defaultColor;
  
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
    };

    createAnimation(dot1Anim, 0).start();
    createAnimation(dot2Anim, 200).start();
    createAnimation(dot3Anim, 400).start();
  }, []);

  const getDotSize = () => {
    switch (size) {
      case 'sm': return 6;
      case 'lg': return 12;
      default: return 8;
    }
  };

  const getDotSpacing = () => {
    switch (size) {
      case 'sm': return SPACING.xs;
      case 'lg': return SPACING.md;
      default: return SPACING.sm;
    }
  };

  const dotSize = getDotSize();
  const dotSpacing = getDotSpacing();

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: dotColor,
            marginRight: dotSpacing,
            opacity: dot1Anim,
            transform: [
              {
                scale: dot1Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: dotColor,
            marginRight: dotSpacing,
            opacity: dot2Anim,
            transform: [
              {
                scale: dot2Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: dotColor,
            opacity: dot3Anim,
            transform: [
              {
                scale: dot3Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    // Styles applied inline for dynamic sizing
  },
}); 