/**
 * FileUpload Component
 * Reusable file upload component for handling images and videos with preview
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CachedImage, { DefaultPlaceholder, DefaultFallback } from './CachedImage';
import CachedVideo, { DefaultVideoPlaceholder, DefaultVideoFallback } from './CachedVideo';
import { ResizeMode } from 'expo-av';
import { Colors } from '@/constants/Colors';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/Styles';

export interface FileUploadProps {
  type: 'image' | 'video';
  files: string[];
  maxFiles?: number;
  onAdd: () => void;
  onRemove: (index: number) => void;
  label?: string;
  disabled?: boolean;
}

export default function FileUpload({
  type,
  files,
  maxFiles = 5,
  onAdd,
  onRemove,
  label,
  disabled = false,
}: FileUploadProps) {
  const isImage = type === 'image';
  const iconName = isImage ? 'camera' : 'videocam';
  const buttonText = isImage ? 'Add Images' : 'Add Video';
  const maxText = isImage ? `Max ${maxFiles}` : 'Max 1';

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label} ({maxText})
        </Text>
      )}
      
      <TouchableOpacity 
        style={[styles.uploadButton, disabled && styles.uploadButtonDisabled]} 
        onPress={onAdd}
        disabled={disabled}
      >
        <Ionicons name={iconName} size={24} color={Colors.light.primary} />
        <Text style={styles.uploadButtonText}>{buttonText}</Text>
      </TouchableOpacity>

      {files.length > 0 && (
        <View style={styles.previewContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.previewScroll}
          >
            {files.map((uri, index) => (
              <View key={index} style={styles.fileContainer}>
                {isImage ? (
                  <CachedImage
                    source={uri}
                    style={styles.previewImage}
                    resizeMode="cover"
                    placeholder={<DefaultPlaceholder size={60} icon="image" text="" />}
                    fallback={<DefaultFallback size={60} icon="image-outline" text="" />}
                    priority="normal"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <CachedVideo
                    source={uri}
                    style={styles.previewVideo}
                    resizeMode={ResizeMode.CONTAIN}
                    placeholder={<DefaultVideoPlaceholder size={120} text="Loading video..." />}
                    fallback={<DefaultVideoFallback size={120} text="Video unavailable" />}
                    shouldPlay={false}
                    isMuted={true}
                    useNativeControls={true}
                  />
                )}
                
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => onRemove(index)}
                >
                  <Ionicons name="close-circle" size={20} color={Colors.light.error} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
    color: Colors.light.text,
    marginBottom: SPACING.sm,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.cardBackground,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
    borderColor: Colors.light.gray,
  },
  uploadButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
    color: Colors.light.primary,
    marginLeft: SPACING.sm,
  },
  previewContainer: {
    marginTop: SPACING.md,
  },
  previewScroll: {
    paddingRight: SPACING.md,
  },
  fileContainer: {
    position: 'relative',
    marginRight: SPACING.sm,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
  },
  previewVideo: {
    width: 120,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.dark.background,
    borderRadius: BORDER_RADIUS.full,
  },
}); 