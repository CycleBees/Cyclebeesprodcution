import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  Linking,
  Platform,
  Modal,
  Pressable,
  Animated,
  FlatList,
} from 'react-native';
import CachedImage, { DefaultPlaceholder, DefaultFallback } from '../components/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import SmoothLoading from '@/components/SmoothLoading';

import PromotionalCard from '@/components/PromotionalCard';
import QuickActionCard from '@/components/QuickActionCard';
import { Button, Card, Badge } from '@/components/ui';
import { Colors } from '@/constants/Colors';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/Styles';
import { API_BASE_URL } from '@/config/api';
import NavigationUtils from '@/utils/navigation';
import { useAppTheme } from '@/hooks/useAppTheme';

interface PromotionalCard {
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
}

interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  age: number;
  pincode: string;
  address: string;
  profile_photo: string;
}

interface ContactSettings {
  type: 'phone' | 'email' | 'link';
  value: string;
  is_active: boolean;
}

const { width, height } = Dimensions.get('window');

interface HomeScreenProps {
  onNavigate?: (route: string) => void;
}

export default function HomeScreen({ onNavigate }: HomeScreenProps) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [user, setUser] = useState<User | null>(null);
  const [promotionalCards, setPromotionalCards] = useState<PromotionalCard[]>([]);
  const [contactSettings, setContactSettings] = useState<ContactSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  
  // Carousel state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchUserProfile();
    fetchPromotionalCards();
    fetchContactSettings();
  }, []);

  // Debug contact settings changes
  useEffect(() => {
    console.log('🔄 Contact settings state changed:', contactSettings);
  }, [contactSettings]);

  // Auto-scroll effect
  useEffect(() => {
    if (promotionalCards.length > 1 && isAutoScrolling) {
      autoScrollTimer.current = setInterval(() => {
        setCurrentCardIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % promotionalCards.length;
          flatListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
          return nextIndex;
        });
      }, 5000);
    }

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [promotionalCards.length, isAutoScrolling]);

  const fetchUserProfile = async () => {
    try {
      setIsLoadingUser(true);
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data.user);
      } else {
        // Token is invalid, redirect to login
        await AsyncStorage.removeItem('userToken');
        router.replace('/login');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      await AsyncStorage.removeItem('userToken');
      router.replace('/login');
    } finally {
      setIsLoadingUser(false);
    }
  };

  const fetchPromotionalCards = async () => {
    try {
      setLoading(true);
      console.log('🌐 Fetching promotional cards from:', `${API_BASE_URL}/api/promotional/cards`);
      
      const response = await fetch(`${API_BASE_URL}/api/promotional/cards`);
      
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Full API response:', data);
        console.log('🎴 Promotional cards data:', data.data);
        
        if (data.data && data.data.length > 0) {
          console.log('🔍 First card structure:', JSON.stringify(data.data[0], null, 2));
          console.log('🔍 All cards:', data.data.map((card: any, index: number) => ({
            index,
            title: card.title,
            allFields: Object.keys(card),
            linkFields: {
              external_link: card.external_link,
              externalLink: card.externalLink,
              link: card.link,
              url: card.url,
              redirect_url: card.redirect_url,
              redirectUrl: card.redirectUrl,
              action_url: card.action_url,
              actionUrl: card.actionUrl
            }
          })));
          
          // Test: Log the raw card object to see all properties
          console.log('🧪 Raw first card object:', data.data[0]);
          console.log('🧪 All properties of first card:', Object.getOwnPropertyNames(data.data[0]));
        } else {
          console.log('⚠️ No promotional cards found in response');
        }
        setPromotionalCards(data.data || []);
      } else {
        console.log('❌ API response not ok:', response.status);
        const errorText = await response.text();
        console.log('❌ Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Error fetching promotional cards:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchContactSettings = async () => {
    try {
      console.log('🔍 Fetching contact settings...');
      const response = await fetch(`${API_BASE_URL}/api/contact/settings`);
      
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Response data:', data);
        
        if (data.success && data.data) {
          console.log('✅ Setting contact settings:', data.data);
          setContactSettings(data.data);
        } else {
          console.log('❌ No contact settings data found');
        }
      } else {
        console.log('❌ Response not ok:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching contact settings:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchPromotionalCards(),
      fetchUserProfile(),
      fetchContactSettings()
    ]);
    setRefreshing(false);
  };

  // Define available routes in the app
  const availableRoutes = [
    '/home',
    '/book-repair',
    '/book-rental', 
    '/my-requests',
    '/profile',
    '/login'
  ];

  const handleCardPress = async (card: PromotionalCard) => {
    console.log('🎯 Card pressed:', card);
    
    const result = await NavigationUtils.handleCardNavigation(card, onNavigate, router);
    
    if (!result.success && result.error) {
      console.error('❌ Card navigation failed:', result.error);
      NavigationUtils.handleNavigationError(result.error, 'home', onNavigate);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      await AsyncStorage.clear();
      setShowLogoutModal(false);
      router.replace('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handleContactPress = () => {
    if (!contactSettings) {
      Alert.alert('Contact Information', 'Contact information not available');
      return;
    }

    const { type, value } = contactSettings;
    
    switch (type) {
      case 'phone':
        Linking.openURL(`tel:${value}`).catch((err) => {
          console.error('Error opening phone:', err);
          Alert.alert('Error', 'Unable to open phone app');
        });
        break;
      case 'email':
        Linking.openURL(`mailto:${value}`).catch((err) => {
          console.error('Error opening email:', err);
          Alert.alert('Error', 'Unable to open email app');
        });
        break;
      case 'link':
        Linking.openURL(value).catch((err) => {
          console.error('Error opening link:', err);
          Alert.alert('Error', 'Unable to open link');
        });
        break;
      default:
        Alert.alert('Contact Information', `Contact: ${value}`);
    }
  };

  const getContactIcon = () => {
    if (!contactSettings) return 'help-circle';
    
    switch (contactSettings.type) {
      case 'phone':
        return 'call';
      case 'email':
        return 'mail';
      case 'link':
        return 'globe';
      default:
        return 'help-circle';
    }
  };

  const getContactText = () => {
    if (!contactSettings) return 'Contact Support';
    
    switch (contactSettings.type) {
      case 'phone':
        return 'Call Us';
      case 'email':
        return 'Email Us';
      case 'link':
        return 'Visit Website';
      default:
        return 'Contact Support';
    }
  };

  const handleScrollBeginDrag = () => {
    setIsAutoScrolling(false);
  };

  const handleScrollEndDrag = () => {
    setIsAutoScrolling(true);
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentCardIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 50,
  }), []);

  const renderPromotionalCard = ({ item }: { item: PromotionalCard }) => (
    <PromotionalCard
      {...item}
      onPress={handleCardPress}
      apiBaseUrl={API_BASE_URL}
    />
  );

  const renderPaginationDots = () => {
    if (promotionalCards.length <= 1) return null;
    
    return (
      <View style={styles.paginationContainer}>
        {promotionalCards.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              { backgroundColor: colors.gray },
              index === currentCardIndex && { backgroundColor: colors.primary }
            ]}
          />
        ))}
      </View>
    );
  };

  // Show simple loading if user is not loaded yet
  if (isLoadingUser || !user) {
    return <SmoothLoading message="Loading your dashboard..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Modern Promotional Cards Section */}
          {promotionalCards.length > 0 && (
            <View style={styles.promotionalSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Special Offers</Text>
                <Badge label="New" variant="primary" size="sm" />
              </View>
              
              <View style={styles.carouselContainer}>
                <FlatList
                  ref={flatListRef}
                  data={promotionalCards}
                  renderItem={renderPromotionalCard}
                  keyExtractor={(item) => item.id.toString()}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScrollBeginDrag={handleScrollBeginDrag}
                  onScrollEndDrag={handleScrollEndDrag}
                  onViewableItemsChanged={onViewableItemsChanged}
                  viewabilityConfig={viewabilityConfig}
                  getItemLayout={(_, index) => ({
                    length: width - 40,
                    offset: (width - 40) * index,
                    index,
                  })}
                />
                {renderPaginationDots()}
              </View>
            </View>
          )}

          {/* Modern Quick Actions Section */}
          <View style={styles.quickActionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
              <Badge label="4" variant="info" size="sm" />
            </View>
            
            <View style={styles.actionsGrid}>
              <QuickActionCard
                icon="construct"
                title="Book Repair"
                subtitle="Professional repair services"
                onPress={() => onNavigate && onNavigate('book-repair')}
              />

              <QuickActionCard
                icon="bicycle"
                title="Rent Bicycle"
                subtitle="Quality bicycles for rent"
                onPress={() => onNavigate && onNavigate('book-rental')}
              />

              <QuickActionCard
                icon="list"
                title="My Requests"
                subtitle="Track your bookings"
                onPress={() => onNavigate && onNavigate('my-requests')}
              />

              <QuickActionCard
                icon="person"
                title="Profile"
                subtitle="Manage your account"
                onPress={() => onNavigate && onNavigate('profile')}
              />
            </View>
          </View>

          {/* Compact Contact Section */}
          <View style={styles.contactSection}>
            <TouchableOpacity
              style={[styles.contactBar, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={handleContactPress}
              disabled={!contactSettings}
              activeOpacity={0.7}
            >
              <View style={styles.contactBarContent}>
                <View style={styles.contactBarLeft}>
                  <Ionicons name={getContactIcon()} size={20} color={colors.primary} />
                  <Text style={[styles.contactBarTitle, { color: colors.text }]}>Need Help?</Text>
                </View>
                <View style={styles.contactBarRight}>
                  <Text style={[
                    styles.contactBarText,
                    { color: colors.gray },
                    contactSettings?.type === 'email' && { color: colors.primary }
                  ]}>
                    {getContactText()}
                </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.gray} />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Logout Modal */}
        <Modal
          visible={showLogoutModal}
          transparent
          animationType="fade"
          onRequestClose={cancelLogout}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Logout</Text>
              <Text style={[styles.modalMessage, { color: colors.gray }]}>
                Are you sure you want to logout? You'll need to sign in again to access your account.
              </Text>
              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  onPress={cancelLogout}
                  variant="outline"
                  style={styles.modalButton}
                />
                <Button
                  title="Logout"
                  onPress={confirmLogout}
                  variant="danger"
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 85 : 65,
  },
  promotionalSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  carouselContainer: {
    position: 'relative',
  },
  quickActionsSection: {
    paddingHorizontal: 16,
    paddingVertical: 2,
    marginBottom: 8,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    rowGap: 8,
  },
  contactSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 30,
  },
  contactBar: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  contactBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactBarTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  contactBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactBarText: {
    fontSize: 14,
    marginRight: 8,
  },
  contactBarTextYellow: {
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  paginationDotActive: {
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  modalButton: {
    flex: 1,
  },
}); 