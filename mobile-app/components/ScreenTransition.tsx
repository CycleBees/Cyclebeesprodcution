import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface ScreenTransitionProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
}

export default function ScreenTransition({
  children,
  direction = 'right',
  duration = 300 
}: ScreenTransitionProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Determine slide direction
    let slideValue = 0;
    switch (direction) {
      case 'left':
        slideValue = -width;
        break;
      case 'right':
        slideValue = width;
        break;
      case 'up':
        slideValue = -height;
        break;
      case 'down':
        slideValue = height;
        break;
    }

    // Start animations
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: slideValue,
        duration: duration,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: duration * 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [direction, duration]);

  const getTransformStyle = () => {
    switch (direction) {
      case 'left':
      case 'right':
        return { transform: [{ translateX: slideAnim }] };
      case 'up':
      case 'down':
        return { transform: [{ translateY: slideAnim }] };
      default:
        return { transform: [{ translateX: slideAnim }] };
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        getTransformStyle(),
        { opacity: fadeAnim }
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
}); 