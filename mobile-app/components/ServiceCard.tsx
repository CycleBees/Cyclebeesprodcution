/**
 * ServiceCard Component
 * Reusable service card component for displaying repair services with selection state
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/Styles';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface ServiceCardProps {
  id: number;
  name: string;
  description: string;
  price: number;
  isSelected: boolean;
  onPress: () => void;
}

export default function ServiceCard({
  name,
  description,
  price,
  isSelected,
  onPress,
}: ServiceCardProps) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      style={[
        styles.card, 
        { backgroundColor: colors.cardBackground, borderColor: colors.border },
        isSelected && { borderColor: colors.primary, backgroundColor: colors.background }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          <Text style={[styles.price, { color: colors.primary }]}>₹{price}</Text>
        </View>
        <Text style={[styles.description, { color: colors.gray }]} numberOfLines={2}>
          {description}
        </Text>
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    // backgroundColor and borderColor now handled dynamically
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    ...SHADOWS.md,
  },
  // cardSelected now handled dynamically
  content: {
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  name: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
    // color now handled dynamically
    flex: 1,
  },
  price: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    // color now handled dynamically
  },
  description: {
    fontSize: TYPOGRAPHY.sm,
    // color now handled dynamically
    lineHeight: TYPOGRAPHY.sm * 1.3,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
}); 