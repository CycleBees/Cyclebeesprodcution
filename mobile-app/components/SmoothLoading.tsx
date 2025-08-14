import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/constants/Styles';
import { useAppTheme } from '@/hooks/useAppTheme';

const { width, height } = Dimensions.get('window');

interface SmoothLoadingProps {
  message?: string;
  fullScreen?: boolean;
  showIcon?: boolean;
}

export default function SmoothLoading({ 
  message = "Loading...", 
  fullScreen = false,
  showIcon = true
}: SmoothLoadingProps) {
  const { colors } = useAppTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous rotation animation
    const startRotation = () => {
      rotateAnim.setValue(0);
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }).start(() => startRotation());
    };
    startRotation();

    return () => {
      fadeAnim.stopAnimation();
      scaleAnim.stopAnimation();
      rotateAnim.stopAnimation();
    };
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const LoadingContent = () => (
    <Animated.View 
      style={[
        styles.content,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      {showIcon && (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="bicycle" size={48} color={colors.primary} />
        </Animated.View>
      )}
      {message && (
        <Text style={[styles.messageText, { color: colors.text }]}>{message}</Text>
      )}
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, { opacity: fadeAnim, backgroundColor: colors.primary }]} />
        <Animated.View style={[styles.dot, { opacity: fadeAnim, backgroundColor: colors.primary }]} />
        <Animated.View style={[styles.dot, { opacity: fadeAnim, backgroundColor: colors.primary }]} />
      </View>
    </Animated.View>
  );

  if (fullScreen) {
    return (
      <View style={[styles.fullScreenContainer, { backgroundColor: colors.cardBackground }]}>
        <LoadingContent />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LoadingContent />
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // backgroundColor now handled dynamically
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  messageText: {
    fontSize: TYPOGRAPHY.base,
    // color now handled dynamically
    marginTop: SPACING.md,
    textAlign: 'center',
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    // backgroundColor now handled dynamically
  },
}); 