/**
 * ProfileCard Component
 * Reusable profile card component for displaying user information
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CachedImage, { DefaultPlaceholder, DefaultFallback } from './CachedImage';
import { Colors } from '@/constants/Colors';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/Styles';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface ProfileCardProps {
  fullName: string;
  email: string;
  phone: string;
  age: number;
  pincode: string;
  address: string;
  profilePhoto?: string;
  created_at?: string;
  last_login?: string;
  onEditPress: () => void;
  onLogoutPress: () => void;
}

export default function ProfileCard({
  fullName,
  email,
  phone,
  age,
  pincode,
  address,
  profilePhoto,
  created_at,
  last_login,
  onEditPress,
  onLogoutPress,
}: ProfileCardProps) {
  const { colors } = useAppTheme();
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {profilePhoto ? (
            <CachedImage
              source={profilePhoto}
              style={styles.avatar}
              resizeMode="cover"
              placeholder={<DefaultPlaceholder size={80} icon="person" text="" />}
              fallback={<DefaultFallback size={80} icon="person-outline" text="" />}
              priority="high"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.background }]}>
              <Ionicons name="person" size={40} color={colors.gray} />
            </View>
          )}
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={[styles.name, { color: colors.text }]}>{fullName}</Text>
          <Text style={[styles.email, { color: colors.gray }]}>{email}</Text>
          <View style={styles.phoneContainer}>
            <Ionicons name="call-outline" size={16} color={colors.gray} />
            <Text style={[styles.phone, { color: colors.gray }]}>{phone}</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.editButton} onPress={onEditPress}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Profile Details */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="person-outline" size={16} color={colors.gray} />
          </View>
          <View style={styles.detailContent}>
            <Text style={[styles.detailLabel, { color: colors.gray }]}>Age</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{age} years</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="location-outline" size={16} color={colors.gray} />
          </View>
          <View style={styles.detailContent}>
            <Text style={[styles.detailLabel, { color: colors.gray }]}>Pincode</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{pincode}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="home-outline" size={16} color={colors.gray} />
          </View>
          <View style={styles.detailContent}>
            <Text style={[styles.detailLabel, { color: colors.gray }]}>Address</Text>
            <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>{address}</Text>
          </View>
        </View>

        {created_at && (
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="calendar-outline" size={16} color={colors.gray} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.gray }]}>Member Since</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(created_at)}</Text>
            </View>
          </View>
        )}

        {last_login && (
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="time-outline" size={16} color={colors.gray} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.gray }]}>Last Login</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(last_login)}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.background, borderColor: colors.error }]} onPress={onLogoutPress}>
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={[styles.logoutText, { color: colors.error }]}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // backgroundColor and borderColor now handled dynamically
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    margin: SPACING.lg,
    borderWidth: 1,
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatarContainer: {
    marginRight: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.full,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.full,
    // backgroundColor now handled dynamically
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    // color now handled dynamically
    marginBottom: SPACING.xs,
  },
  email: {
    fontSize: TYPOGRAPHY.base,
    // color now handled dynamically
    marginBottom: SPACING.xs,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phone: {
    fontSize: TYPOGRAPHY.sm,
    // color now handled dynamically
    marginLeft: SPACING.xs,
  },
  editButton: {
    padding: SPACING.sm,
  },
  details: {
    gap: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIcon: {
    width: 24,
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.sm,
    // color now handled dynamically
    marginBottom: SPACING.xs,
  },
  detailValue: {
    fontSize: TYPOGRAPHY.base,
    // color now handled dynamically
    lineHeight: TYPOGRAPHY.base * 1.3,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor and borderColor now handled dynamically
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.lg,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
    // color now handled dynamically
    marginLeft: SPACING.sm,
  },
}); 