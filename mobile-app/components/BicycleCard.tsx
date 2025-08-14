/**
 * BicycleCard Component
 * Reusable bicycle card component for displaying rental bicycles with selection state
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
import CachedImage, { DefaultPlaceholder, DefaultFallback } from './CachedImage';
import { Colors } from '@/constants/Colors';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/Styles';
import { useAppTheme } from '@/hooks/useAppTheme';

const { width } = Dimensions.get('window');

export interface BicyclePhoto {
  id: number;
  photo_url: string;
  display_order: number;
}

export interface BicycleCardProps {
  id: number;
  name: string;
  model: string;
  description: string;
  daily_rate: number;
  weekly_rate: number;
  delivery_charge: number;
  photos: BicyclePhoto[];
  isSelected: boolean;
  onPress: () => void;
  onViewDetails: () => void;
  apiBaseUrl?: string;
}

export default function BicycleCard({
  name,
  model,
  description,
  daily_rate,
  weekly_rate,
  delivery_charge,
  photos,
  isSelected,
  onPress,
  onViewDetails,
  apiBaseUrl = '',
}: BicycleCardProps) {
  const { colors } = useAppTheme();
  const mainPhoto = photos.length > 0 ? photos[0] : null;
  const imageSource = mainPhoto?.photo_url?.startsWith('http') 
    ? mainPhoto.photo_url
    : `${apiBaseUrl}/${mainPhoto?.photo_url || ''}`;

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
      <View style={styles.imageContainer}>
        {mainPhoto ? (
          <CachedImage
            source={imageSource}
            style={styles.image}
            resizeMode="cover"
            placeholder={<DefaultPlaceholder size={120} icon="bicycle" text="Loading..." />}
            fallback={<DefaultFallback size={120} icon="bicycle-outline" text="No Image" />}
            priority="normal"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.background }]}>
            <Ionicons name="bicycle" size={48} color={colors.gray} />
            <Text style={[styles.imagePlaceholderText, { color: colors.gray }]}>No Image</Text>
          </View>
        )}
        
        {isSelected && (
          <View style={[styles.selectedIndicator, { backgroundColor: colors.background }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          <TouchableOpacity onPress={onViewDetails} style={styles.detailsButton}>
            <Ionicons name="information-circle" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.model, { color: colors.primary }]}>{model}</Text>
        <Text style={[styles.description, { color: colors.gray }]} numberOfLines={2}>
          {description}
        </Text>

        <View style={styles.pricing}>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.gray }]}>Daily:</Text>
            <Text style={[styles.priceValue, { color: colors.text }]}>₹{daily_rate}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.gray }]}>Weekly:</Text>
            <Text style={[styles.priceValue, { color: colors.text }]}>₹{weekly_rate}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.gray }]}>Delivery:</Text>
            <Text style={[styles.priceValue, { color: colors.text }]}>₹{delivery_charge}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    // backgroundColor and borderColor now handled dynamically
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  // cardSelected now handled dynamically
  imageContainer: {
    position: 'relative',
    height: 120,
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor now handled dynamically
  },
  imagePlaceholderText: {
    fontSize: TYPOGRAPHY.sm,
    // color now handled dynamically
    marginTop: SPACING.xs,
  },
  selectedIndicator: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    // backgroundColor now handled dynamically
    borderRadius: BORDER_RADIUS.full,
  },
  content: {
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  name: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    // color now handled dynamically
    flex: 1,
  },
  detailsButton: {
    padding: SPACING.xs,
  },
  model: {
    fontSize: TYPOGRAPHY.sm,
    // color now handled dynamically
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: TYPOGRAPHY.sm,
    // color now handled dynamically
    lineHeight: TYPOGRAPHY.sm * 1.3,
    marginBottom: SPACING.sm,
  },
  pricing: {
    gap: SPACING.xs,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: TYPOGRAPHY.sm,
    // color now handled dynamically
  },
  priceValue: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
    // color now handled dynamically
  },
}); 