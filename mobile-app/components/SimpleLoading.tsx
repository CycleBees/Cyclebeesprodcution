import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

interface SimpleLoadingProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
}

export default function SimpleLoading({ 
  message = "Loading...", 
  size = 'large',
  color,
  fullScreen = false
}: SimpleLoadingProps) {
  const { colors } = useAppTheme();
  const loadingColor = color || colors.primary;
  if (fullScreen) {
    return (
      <View style={[styles.fullScreenContainer, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.content}>
          <ActivityIndicator size={size} color={loadingColor} />
          {message && (
            <Text style={[styles.messageText, { color: colors.text }]}>{message}</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={loadingColor} />
      {message && (
        <Text style={[styles.messageText, { color: colors.text }]}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // backgroundColor now handled dynamically
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    fontSize: 16,
    // color now handled dynamically
    marginTop: 16,
    textAlign: 'center',
  },
}); 