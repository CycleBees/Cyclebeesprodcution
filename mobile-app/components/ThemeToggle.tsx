import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppTheme } from '@/hooks/useAppTheme';

interface ThemeToggleProps {
  style?: any;
}

export default function ThemeToggle({ style }: ThemeToggleProps) {
  const { themeMode, toggleTheme, setThemeMode } = useTheme();
  const { colors, isDark } = useAppTheme();

  const getThemeIcon = () => {
    if (themeMode === 'system') {
      return isDark ? 'moon' : 'sunny';
    }
    return isDark ? 'moon' : 'sunny';
  };

  const getThemeText = () => {
    if (themeMode === 'system') {
      return `System (${isDark ? 'Dark' : 'Light'})`;
    }
    return isDark ? 'Dark Mode' : 'Light Mode';
  };

  const handlePress = () => {
    if (themeMode === 'system') {
      // If system mode, switch to explicit light/dark
      setThemeMode(isDark ? 'light' : 'dark');
    } else {
      // If explicit mode, toggle between light and dark
      toggleTheme();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.border }, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons 
          name={getThemeIcon() as any} 
          size={20} 
          color={colors.primary} 
        />
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          Theme
        </Text>
        <Text style={[styles.subtitle, { color: colors.gray }]}>
          {getThemeText()}
        </Text>
      </View>
      
      <View style={styles.arrowContainer}>
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={colors.gray} 
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 209, 30, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  arrowContainer: {
    marginLeft: 8,
  },
}); 