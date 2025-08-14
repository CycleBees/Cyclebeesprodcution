import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import ModernNavbar from './ModernNavbar';
import ContentTransition from './ContentTransition';
import { Colors } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';

interface ScreenLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  showNavbar?: boolean;
  onBackPress?: () => void;
  onNavigate?: (route: string) => void;
  currentRoute?: string;
}

export default function ScreenLayout({ 
  children, 
  title = "CycleBees",
  showBackButton = false,
  showNavbar = true,
  onBackPress,
  onNavigate,
  currentRoute
}: ScreenLayoutProps) {
  const { colors } = useAppTheme();
  const router = useRouter();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/main');
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Static Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.headerLeft}>
          {showBackButton && (
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBackPress}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
          <View style={styles.logoContainer}>
            <Ionicons name="bicycle" size={28} color={colors.primary} />
            <Text style={[styles.logoText, { color: colors.primary }]}>CycleBees</Text>
          </View>
        </View>
        <Text style={[styles.titleText, { color: colors.text }]}>{title}</Text>
      </View>

      {/* Static Navbar */}
      {showNavbar && <ModernNavbar onNavigate={onNavigate} currentRoute={currentRoute} />}

      {/* Animated Content Area */}
      <ContentTransition>
        <View style={styles.content}>
          {children}
        </View>
      </ContentTransition>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor now handled dynamically
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    // backgroundColor now handled dynamically
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    // color now handled dynamically
    marginLeft: 8,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    // color now handled dynamically
  },
  content: {
    flex: 1,
  },
}); 