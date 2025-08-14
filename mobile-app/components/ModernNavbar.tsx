import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';

const { width } = Dimensions.get('window');

interface NavItem {
  name: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const navItems: NavItem[] = [
  { name: 'Home', route: 'home', icon: 'home' },
  { name: 'Repair', route: 'book-repair', icon: 'construct' },
  { name: 'Bicycle', route: 'book-rental', icon: 'bicycle' },
  { name: 'Requests', route: 'my-requests', icon: 'list' },
  { name: 'Profile', route: 'profile', icon: 'person' },
];

interface ModernNavbarProps {
  onNavigate?: (route: string) => void;
  currentRoute?: string;
}

export default function ModernNavbar({ onNavigate, currentRoute }: ModernNavbarProps) {
  const { colors } = useAppTheme();
  const router = useRouter();

  const handleNavigation = (route: string) => {
    if (currentRoute !== route) {
      if (onNavigate) {
        onNavigate(route);
      } else {
        router.push(`/${route}` as any);
      }
    }
  };

  const isActive = (route: string) => {
    return currentRoute === route;
  };

  return (
    <View style={[styles.navbarContainer, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
      {/* Navigation Items */}
      <View style={styles.navItems}>
        {navItems.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={[
              styles.navItem,
              isActive(item.route) && [styles.navItemActive, { backgroundColor: colors.background, borderColor: colors.primary }]
            ]}
            onPress={() => handleNavigation(item.route)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={item.icon}
              size={24}
              color={isActive(item.route) ? colors.primary : colors.gray}
            />
            <Text
              style={[
                styles.navItemText,
                { color: isActive(item.route) ? colors.primary : colors.gray },
                isActive(item.route) && { fontWeight: '600' }
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navbarContainer: {
    // backgroundColor and borderTopColor now handled dynamically
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: Platform.OS === 'ios' ? 90 : 76, // Fixed height for navbar
    ...Platform.select({
      web: {
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
      },
    }),
  },
  navItems: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: (width - 80) / 5,
  },
  navItemActive: {
    // backgroundColor and borderColor now handled dynamically
    borderWidth: 1,
  },
  navItemText: {
    fontSize: 12,
    // color now handled dynamically
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  // navItemTextActive now handled dynamically
}); 