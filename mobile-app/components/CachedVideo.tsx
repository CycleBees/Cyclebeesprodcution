import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

interface CachedVideoProps {
  source: string;
  style: any;
  resizeMode?: ResizeMode;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: () => void;
  onLoad?: () => void;
  onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void;
  shouldPlay?: boolean;
  isLooping?: boolean;
  isMuted?: boolean;
  useNativeControls?: boolean;
  posterSource?: string;
  posterStyle?: any;
}

const CachedVideo: React.FC<CachedVideoProps> = ({
  source,
  style,
  resizeMode = ResizeMode.CONTAIN,
  placeholder,
  fallback,
  onError,
  onLoad,
  onPlaybackStatusUpdate,
  shouldPlay = false,
  isLooping = false,
  isMuted = true,
  useNativeControls = true,
  posterSource,
  posterStyle
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<Video>(null);

  const handleError = () => {
    console.log('CachedVideo error loading:', source);
    setHasError(true);
    setIsLoading(false);
    onError?.();
  };

  const handleLoad = () => {
    console.log('CachedVideo loaded successfully:', source);
    setIsLoading(false);
    onLoad?.();
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);
    }
    onPlaybackStatusUpdate?.(status);
  };

  // Show fallback if there's an error
  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  // Show placeholder while loading
  if (isLoading && placeholder) {
    return <>{placeholder}</>;
  }

  return (
    <Video
      ref={videoRef}
      source={{ uri: source }}
      style={style}
      resizeMode={resizeMode}
      shouldPlay={shouldPlay}
      isLooping={isLooping}
      isMuted={isMuted}
      useNativeControls={useNativeControls}
      posterSource={posterSource ? { uri: posterSource } : undefined}
      posterStyle={posterStyle}
      onError={handleError}
      onLoad={handleLoad}
      onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
    />
  );
};

// Default placeholder component for videos
export const DefaultVideoPlaceholder: React.FC<{ size?: number; text?: string }> = ({ 
  size = 80, 
  text = 'Loading video...' 
}) => (
  <View style={[styles.videoPlaceholder, { width: size, height: size }]}>
    <Ionicons name="videocam" size={size * 0.3} color="#ccc" />
    {text && <Text style={styles.videoPlaceholderText}>{text}</Text>}
  </View>
);

// Default fallback component for videos
export const DefaultVideoFallback: React.FC<{ size?: number; text?: string }> = ({ 
  size = 80, 
  text = 'Video unavailable' 
}) => (
  <View style={[styles.videoFallback, { width: size, height: size }]}>
    <Ionicons name="videocam-outline" size={size * 0.3} color="#999" />
    {text && <Text style={styles.videoFallbackText}>{text}</Text>}
  </View>
);

const styles = StyleSheet.create({
  videoPlaceholder: {
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  videoPlaceholderText: {
    fontSize: 10,
    color: '#ccc',
    marginTop: 4,
    textAlign: 'center',
  },
  videoFallback: {
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  videoFallbackText: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default CachedVideo; 