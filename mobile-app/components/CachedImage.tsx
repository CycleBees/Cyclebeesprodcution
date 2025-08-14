import React from 'react';
import { View, Text, StyleSheet, Image as RNImage } from 'react-native';
import { Image, ImageContentFit } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface CachedImageProps {
  source: string;
  style: any;
  resizeMode?: ImageContentFit;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: () => void;
  onLoad?: () => void;
  priority?: 'low' | 'normal' | 'high';
  cachePolicy?: 'memory' | 'disk' | 'memory-disk';
  contentFit?: ImageContentFit;
  transition?: number;
}

const CachedImage: React.FC<CachedImageProps> = ({
  source,
  style,
  resizeMode = 'cover',
  placeholder,
  fallback,
  onError,
  onLoad,
  priority = 'normal',
  cachePolicy = 'memory-disk',
  contentFit,
  transition = 300
}) => {
  const [hasError, setHasError] = React.useState(false);

  const handleError = () => {
    console.log('CachedImage error loading:', source);
    setHasError(true);
    onError?.();
  };

  const handleLoad = () => {
    console.log('CachedImage loaded successfully:', source);
    onLoad?.();
  };

  // Show fallback if there's an error
  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  // Use expo-image with proper error handling
  return (
    <Image
      source={{ uri: source }}
      style={style}
      contentFit={contentFit || resizeMode}
      transition={transition}
      cachePolicy={cachePolicy}
      priority={priority}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
};

// Default placeholder component
export const DefaultPlaceholder: React.FC<{ size?: number; icon?: string; text?: string }> = ({ 
  size = 24, 
  icon = 'image', 
  text = 'Loading...' 
}) => (
  <View style={[styles.placeholder, { width: size, height: size }]}>
    <Ionicons name={icon as any} size={size * 0.4} color="#ccc" />
    {text && <Text style={styles.placeholderText}>{text}</Text>}
  </View>
);

// Default fallback component
export const DefaultFallback: React.FC<{ size?: number; icon?: string; text?: string }> = ({ 
  size = 24, 
  icon = 'image-outline', 
  text = 'Failed to load' 
}) => (
  <View style={[styles.fallback, { width: size, height: size }]}>
    <Ionicons name={icon as any} size={size * 0.4} color="#999" />
    {text && <Text style={styles.fallbackText}>{text}</Text>}
  </View>
);

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  placeholderText: {
    fontSize: 10,
    color: '#ccc',
    marginTop: 2,
  },
  fallback: {
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  fallbackText: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
});

export default CachedImage; 