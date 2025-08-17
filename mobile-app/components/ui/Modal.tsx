/**
 * Modal Component
 * Reusable modal component with consistent styling and animations
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal as RNModal,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  Animated,
  Dimensions,
  Pressable,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { SPACING, BORDER_RADIUS, SHADOWS, Z_INDEX } from '@/constants/Styles';
import { useAppTheme } from '@/hooks/useAppTheme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeOnBackdropPress?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  lightColor?: string;
  darkColor?: string;
}

export default function Modal({
  visible,
  onClose,
  children,
  title,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropPress = true,
  style,
  contentStyle,
  lightColor,
  darkColor,
}: ModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const { colors } = useAppTheme();
  const backgroundColor = lightColor || darkColor || colors.cardBackground;

  // Animation effects
  useEffect(() => {
    if (visible) {
      // Fade in animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade out animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim, slideAnim]);

  // Get modal size styles
  const getModalSize = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return { width: screenWidth * 0.8, maxWidth: 320 };
      case 'md':
        return { width: screenWidth * 0.9, maxWidth: 480 };
      case 'lg':
        return { width: screenWidth * 0.95, maxWidth: 640 };
      case 'xl':
        return { width: screenWidth * 0.98, maxWidth: 800 };
      case 'full':
        return { width: screenWidth, height: screenHeight };
      default:
        return { width: screenWidth * 0.9, maxWidth: 480 };
    }
  };

  // Handle backdrop press
  const handleBackdropPress = () => {
    if (closeOnBackdropPress) {
      onClose();
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Pressable
          style={styles.backdropPressable}
          onPress={handleBackdropPress}
        />
      </Animated.View>

      {/* Modal Content */}
      <View style={styles.modalContainer}>
        <Animated.View
          style={[
            styles.modalContent,
            getModalSize(),
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim },
              ],
              backgroundColor,
            },
            style,
          ]}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
              {showCloseButton && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={colors.gray}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Content */}
          <View style={[styles.content, contentStyle]}>
            {children}
          </View>
        </Animated.View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  // Backdrop styles
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: Z_INDEX.modalOverlay,
  },
  backdropPressable: {
    flex: 1,
  },

  // Modal container styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: Z_INDEX.modal,
  },

  // Modal content styles
  modalContent: {
    // backgroundColor now handled dynamically
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.xl,
    maxHeight: screenHeight * 0.9,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    // borderBottomColor now handled dynamically
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    // color now handled dynamically
    flex: 1,
  },
  closeButton: {
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },

  // Content styles
  content: {
    padding: SPACING.lg,
  },
}); 