/**
 * RequestCard Component
 * Reusable request card component for displaying repair and rental requests
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CachedImage, { DefaultPlaceholder, DefaultFallback } from './CachedImage';
import CachedVideo, { DefaultVideoPlaceholder, DefaultVideoFallback } from './CachedVideo';
import { ResizeMode } from 'expo-av';
import { Colors } from '@/constants/Colors';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/Styles';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface RequestFile {
  id: number;
  file_url: string;
  file_type: string;
  fileType?: string;
  display_order: number;
  downloadUrl?: string;
}

export interface RequestCardProps {
  id: number;
  type: 'repair' | 'rental';
  status: string;
  totalAmount: number;
  date: string;
  time?: string;
  paymentMethod?: string;
  address?: string;
  files?: RequestFile[];
  expiresAt?: string;
  onPress: () => void;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  getStatusIcon: (status: string) => string;
  getTimeRemaining?: (expiresAt: string) => string;
}

export default function RequestCard({
  id,
  type,
  status,
  totalAmount,
  date,
  time,
  paymentMethod,
  address,
  files,
  expiresAt,
  onPress,
  getStatusColor,
  getStatusText,
  getStatusIcon,
  getTimeRemaining,
}: RequestCardProps) {
  const { colors } = useAppTheme();
  const iconName = type === 'repair' ? 'construct-outline' : 'bicycle-outline';
  const isPending = status === 'pending';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Card Header */}
      <View style={styles.header}>
        <View style={styles.requestIdContainer}>
          <Ionicons name={iconName as any} size={14} color={colors.primary} />
          <Text style={[styles.requestId, { color: colors.text }]}>#{id}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(status) }
        ]}>
          <Ionicons 
            name={getStatusIcon(status) as any} 
            size={10} 
            color={colors.background} 
          />
          <Text style={[styles.statusText, { color: colors.background }]}>
            {getStatusText(status)}
          </Text>
        </View>
      </View>
      
      {/* Card Content */}
      <View style={styles.content}>
        {/* Amount, Date, and Details Row */}
        <View style={styles.amountDateRow}>
          <View style={styles.amountContainer}>
            <Text style={[styles.amountLabel, { color: colors.text }]}>Total Amount</Text>
            <Text style={[styles.amountValue, { color: colors.primary }]}>₹{totalAmount}</Text>
          </View>
          <View style={styles.dateContainer}>
            <Text style={[styles.dateLabel, { color: colors.text }]}>Date</Text>
            <Text style={[styles.dateValue, { color: colors.text }]}>{date}</Text>
          </View>
        </View>
        
        {/* Time, Payment, and Address Row */}
          <View style={styles.detailsRow}>
            {time && (
              <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={12} color={colors.text} />
                <Text style={[styles.detailText, { color: colors.text }]}>{time}</Text>
              </View>
            )}
            {paymentMethod && (
              <View style={styles.detailItem}>
              <Ionicons name="card-outline" size={12} color={colors.text} />
                <Text style={[styles.detailText, { color: colors.text }]}>{paymentMethod}</Text>
              </View>
            )}
        {address && (
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={12} color={colors.text} />
            <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={1}>
              {address}
            </Text>
          </View>
        )}
        </View>
        
        {/* Media Files */}
        {files && files.length > 0 && (
          <View style={styles.mediaSection}>
            <View style={styles.mediaHeader}>
              <Ionicons name="images-outline" size={12} color={colors.text} />
              <Text style={[styles.mediaLabel, { color: colors.text }]}>
                {files.filter(f => f.file_type === 'image' || f.fileType === 'image').length} photos, 
                {files.filter(f => f.file_type === 'video' || f.fileType === 'video').length} video
              </Text>
            </View>
            <View style={styles.mediaGrid}>
              {files.slice(0, 3).map((file, index) => (
                <View key={file.id} style={styles.mediaItem}>
                  {(file.file_type === 'image' || file.fileType === 'image') && (file.downloadUrl || file.file_url) ? (
                    <CachedImage
                      source={file.downloadUrl || file.file_url}
                      style={styles.mediaImage}
                      resizeMode="cover"
                      placeholder={<DefaultPlaceholder size={60} icon="image" text="" />}
                      fallback={<DefaultFallback size={60} icon="image-outline" text="" />}
                      priority="normal"
                      cachePolicy="memory-disk"
                    />
                  ) : (file.file_type === 'video' || file.fileType === 'video') && (file.downloadUrl || file.file_url) ? (
                    <CachedVideo
                      source={file.downloadUrl || file.file_url || ''}
                      style={styles.mediaVideo}
                      resizeMode={ResizeMode.COVER}
                      placeholder={<DefaultVideoPlaceholder size={60} text="" />}
                      fallback={<DefaultVideoFallback size={60} text="" />}
                      shouldPlay={false}
                      isMuted={true}
                      useNativeControls={false}
                    />
                  ) : (file.file_type === 'image' || file.fileType === 'image') ? (
                    <View style={[styles.imageThumbnail, { backgroundColor: colors.background }]}>
                      <Text style={styles.mediaIcon}>📷</Text>
                    </View>
                  ) : (
                    <View style={[styles.videoThumbnail, { backgroundColor: colors.background }]}>
                      <Text style={styles.mediaIcon}>🎥</Text>
                    </View>
                  )}
                </View>
              ))}
              {files.length > 3 && (
                <View style={[styles.mediaMore, { backgroundColor: colors.background }]}>
                  <Text style={[styles.mediaMoreText, { color: colors.text }]}>+{files.length - 3}</Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        {/* Expiry Timer */}
        {isPending && expiresAt && getTimeRemaining && (
          <View style={styles.expirySection}>
            <Ionicons name="time-outline" size={12} color={colors.warning} />
            <Text style={[styles.expiryText, { color: colors.warning }]}>{getTimeRemaining(expiresAt)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    // backgroundColor and borderColor now handled dynamically
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  requestIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestId: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    // color now handled dynamically
    marginLeft: SPACING.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
    // color now handled dynamically
    marginLeft: 3,
  },
  content: {
    gap: 6,
  },
  amountDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountContainer: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 11,
    // color now handled dynamically
    marginBottom: 2,
    fontWeight: '500',
  },
  amountValue: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    // color now handled dynamically
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 11,
    // color now handled dynamically
    marginBottom: 2,
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
    // color now handled dynamically
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: '30%',
  },
  detailText: {
    fontSize: 12,
    // color now handled dynamically
    marginLeft: 4,
    fontWeight: '500',
  },
  addressText: {
    fontSize: 12,
    // color now handled dynamically
    marginLeft: 4,
    flex: 1,
    fontWeight: '500',
  },
  mediaSection: {
    marginTop: 4,
  },
  mediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mediaLabel: {
    fontSize: 10,
    // color now handled dynamically
    marginLeft: 4,
    fontWeight: '500',
  },
  mediaGrid: {
    flexDirection: 'row',
    gap: 4,
  },
  mediaItem: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.sm,
  },
  mediaVideo: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.sm,
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
    // backgroundColor now handled dynamically
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    // backgroundColor now handled dynamically
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  mediaIcon: {
    fontSize: TYPOGRAPHY.sm,
  },
  mediaMore: {
    width: 50,
    height: 50,
    // backgroundColor now handled dynamically
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  mediaMoreText: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    // color now handled dynamically
  },
  expirySection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  expiryText: {
    fontSize: 12,
    // color now handled dynamically
    marginLeft: 4,
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
  },
}); 