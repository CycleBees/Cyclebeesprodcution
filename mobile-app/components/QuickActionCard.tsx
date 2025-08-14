/**
 * QuickActionCard Component
 * Reusable quick action card component for displaying action buttons
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/Styles';
import { useAppTheme } from '@/hooks/useAppTheme';

const { width } = Dimensions.get('window');

export interface QuickActionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}

export default function QuickActionCard({
  icon,
  title,
  subtitle,
  onPress,
}: QuickActionCardProps) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
        <Ionicons name={icon} size={32} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.gray }]}>{subtitle}</Text>
      <View style={[styles.arrow, { backgroundColor: colors.primary }]}>
        <Ionicons name="arrow-forward" size={16} color={colors.background} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: (width - 52) / 2,
    height: 120,
    // backgroundColor now handled dynamically
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: 0,
    position: 'relative',
    borderWidth: 1,
    // borderColor now handled dynamically
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.full,
    // backgroundColor now handled dynamically
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
    // color now handled dynamically
    textAlign: 'center',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.xs,
    // color now handled dynamically
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.xs * 1.2,
  },
  arrow: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 20,
    height: 20,
    borderRadius: BORDER_RADIUS.full,
    // backgroundColor now handled dynamically
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 