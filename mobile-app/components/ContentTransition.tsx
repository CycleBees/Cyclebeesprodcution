import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

interface ContentTransitionProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  isVisible?: boolean;
}

export default function ContentTransition({ 
  children, 
  direction = 'right',
  duration = 300,
  isVisible = true
}: ContentTransitionProps) {
  const slideAnim = useRef(new Animated.Value(isVisible ? 0 : width)).current;
  const fadeAnim = useRef(new Animated.Value(isVisible ? 1 : 0)).current;

  useEffect(() => {
    const targetSlideValue = isVisible ? 0 : width;
    const targetFadeValue = isVisible ? 1 : 0;

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: targetSlideValue,
        duration: duration,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: targetFadeValue,
        duration: duration * 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isVisible, direction, duration]);

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
  },
}); 