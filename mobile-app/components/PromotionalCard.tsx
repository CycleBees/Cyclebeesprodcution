/*
 * PromotionalCard Component
 * Reusable promotional card component for displaying promotional content
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

export interface PromotionalCardProps {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  imageUrl?: string;
  external_link?: string;
  externalLink?: string;
  link?: string;
  url?: string;
  redirect_url?: string;
  redirectUrl?: string;
  action_url?: string;
  actionUrl?: string;
  display_order: number;
  onPress: (card: PromotionalCardProps) => void;
  apiBaseUrl?: string;
}

export default function PromotionalCard({
  id,
  title,
  description,
  image_url,
  imageUrl,
  external_link,
  externalLink,
  link,
  url,
  redirect_url,
  redirectUrl,
  action_url,
  actionUrl,
  display_order,
  onPress,
  apiBaseUrl = '',
}: PromotionalCardProps) {
  const { colors } = useAppTheme();
  const imageSource = (image_url || imageUrl || '').startsWith('http') 
    ? (image_url || imageUrl || '')
    : `${apiBaseUrl}/${image_url || imageUrl || ''}`;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBackground }]}
      onPress={() => onPress({ 
        id, 
        title, 
        description, 
        image_url, 
        imageUrl,
        external_link, 
        externalLink,
        link,
        url,
        redirect_url,
        redirectUrl,
        action_url,
        actionUrl,
        display_order, 
        onPress: () => {} 
      })}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        {(image_url || imageUrl) ? (
          <CachedImage
            source={imageSource}
            style={styles.image}
            resizeMode="cover"
            placeholder={<DefaultPlaceholder size={200} icon="image" text="Loading..." />}
            fallback={<DefaultFallback size={200} icon="image-outline" text="Failed to load" />}
            priority="high"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.background }]}>
            <Ionicons name="image" size={48} color={colors.gray} />
            <Text style={[styles.imagePlaceholderText, { color: colors.gray }]}>No Image</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: width - 40,
    height: 200,
    // backgroundColor now handled dynamically
    borderRadius: BORDER_RADIUS.lg,
    marginRight: SPACING.md,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.lg,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
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
}); 