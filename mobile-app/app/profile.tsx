import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import SimpleLoading from '@/components/SimpleLoading';
import { API_BASE_URL } from '@/config/api';
import EasterEgg from '@/components/EasterEgg';
import ThemeToggle from '@/components/ThemeToggle';
import { useAppTheme } from '@/hooks/useAppTheme';


interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  age: number;
  pincode: string;
  address: string;
  profilePhoto: string;
  created_at?: string;
  last_login?: string;
}

interface ProfileScreenProps {
  onNavigate?: (route: string) => void;
}

export default function ProfileScreen({ onNavigate }: ProfileScreenProps) {
  const router = useRouter();
  const { colors } = useAppTheme();

  const handleBackPress = () => {
    if (onNavigate) {
      onNavigate('home');
    } else {
      // Fallback to router navigation
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/main');
      }
    }
  };
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [easterEggTapCount, setEasterEggTapCount] = useState(0);
  const [editData, setEditData] = useState({
    full_name: '',
    email: '',
    age: '',
    pincode: '',
    address: ''
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('No token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Profile data received:', data); // Debug log
        
        if (data.success && data.data && data.data.user) {
          const userData = data.data.user;
          console.log('User data extracted:', userData); // Debug log
          setUser(userData);
          setEditData({
            full_name: userData.fullName || '',
            email: userData.email || '',
            age: userData.age ? userData.age.toString() : '',
            pincode: userData.pincode || '',
            address: userData.address || ''
          });
        } else {
          console.error('Invalid profile data format:', data);
        }
      } else {
        console.error('Failed to fetch profile:', response.status);
        const errorData = await response.json();
        console.error('Error response:', errorData);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserProfile();
    setRefreshing(false);
  };



  const handleSaveProfile = async () => {
    // Validate data
    if (!editData.full_name || !editData.email || !editData.age || !editData.pincode || !editData.address) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: editData.full_name,
          email: editData.email,
          age: parseInt(editData.age),
          pincode: editData.pincode,
          address: editData.address
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          Alert.alert('Success', 'Profile updated successfully!');
          setEditing(false);
          fetchUserProfile(); // Refresh profile data
        } else {
          Alert.alert('Error', data.message || 'Failed to update profile');
        }
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      console.log('Logging out from profile...');
      
      // Clear all storage
      await AsyncStorage.clear();
      console.log('All storage cleared');
      
      // Platform-specific navigation
      if (Platform.OS === 'web') {
        // Force page reload for web
        window.location.href = '/login';
        console.log('Web: Reloaded to login page');
      } else {
        // Use router for native
        setTimeout(() => {
          router.push('/login');
          console.log('Native: Navigated to login');
        }, 100);
      }
      
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handleEasterEggTap = () => {
    // Prevent taps while easter egg is active
    if (showEasterEgg) {
      return;
    }
    
    const newCount = easterEggTapCount + 1;
    setEasterEggTapCount(newCount);
    
    if (newCount === 6) {
      setShowEasterEgg(true);
      setEasterEggTapCount(0); // Reset counter
    }
  };

  const handleEasterEggClose = () => {
    // Only allow closing if the animation is complete
    // This prevents accidental closing during animation
    setShowEasterEgg(false);
  };

  if (loading && !user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Loading in content area */}
          <SimpleLoading message="Loading profile..." />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.errorContainer}>
            <Ionicons name="person-outline" size={60} color={colors.gray} />
            <Text style={[styles.errorTitle, { color: colors.text }]}>Failed to load profile</Text>
            <Text style={[styles.errorSubtitle, { color: colors.gray }]}>Please check your connection and try again</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
              <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView 
          style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 10 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Profile Photo Section */}
          <View style={[styles.profileCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.profileImageContainer}>
              <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.border, borderColor: colors.primary }]}>
                <Ionicons name="person" size={50} color={colors.gray} />
              </View>
            </View>
            <Text style={[styles.userName, { color: colors.text }]}>{user.fullName || 'User'}</Text>
            <Text style={[styles.userEmail, { color: colors.gray }]}>{user.email || 'No email'}</Text>
            <Text style={[styles.userPhone, { color: colors.gray }]}>{user.phone || 'No phone'}</Text>
          </View>

          {/* Edit Profile Button */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={() => setEditing(!editing)}
            >
              <Ionicons 
                name={editing ? "close-outline" : "create-outline"} 
                size={20} 
                color={colors.text} 
              />
              <Text style={[styles.editButtonText, { color: colors.text }]}>
                {editing ? 'Cancel Edit' : 'Edit Profile'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Personal Information Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={handleEasterEggTap} style={styles.easterEggIcon}>
                <Ionicons 
                  name="person-outline" 
                  size={18} 
                  color={colors.primary} 
                />
              </TouchableOpacity>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Personal Information</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>Full Name</Text>
                {editing ? (
                  <TextInput
                    style={[styles.editInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={editData.full_name}
                    onChangeText={(text) => setEditData({...editData, full_name: text})}
                    placeholder="Enter full name"
                    placeholderTextColor={colors.gray}
                  />
                ) : (
                  <Text style={[styles.infoValue, { color: colors.primary }]}>{user.fullName || 'Not provided'}</Text>
                )}
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>Email Address</Text>
                {editing ? (
                  <TextInput
                    style={[styles.editInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={editData.email}
                    onChangeText={(text) => setEditData({...editData, email: text})}
                    placeholder="Enter email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={colors.gray}
                  />
                ) : (
                  <Text style={[styles.infoValue, { color: colors.primary }]}>{user.email || 'Not provided'}</Text>
                )}
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>Phone Number</Text>
                <Text style={[styles.infoValue, { color: colors.primary }]}>{user.phone || 'Not provided'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>Age</Text>
                {editing ? (
                  <TextInput
                    style={[styles.editInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={editData.age}
                    onChangeText={(text) => setEditData({...editData, age: text})}
                    placeholder="Enter age"
                    keyboardType="number-pad"
                    placeholderTextColor={colors.gray}
                  />
                ) : (
                  <Text style={[styles.infoValue, { color: colors.primary }]}>{user.age ? `${user.age} years` : 'Not provided'}</Text>
                )}
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>Pincode</Text>
                {editing ? (
                  <TextInput
                    style={[styles.editInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={editData.pincode}
                    onChangeText={(text) => setEditData({...editData, pincode: text})}
                    placeholder="Enter pincode"
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholderTextColor={colors.gray}
                  />
                ) : (
                  <Text style={[styles.infoValue, { color: colors.primary }]}>{user.pincode || 'Not provided'}</Text>
                )}
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>Address</Text>
                {editing ? (
                  <TextInput
                    style={[styles.editInput, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={editData.address}
                    onChangeText={(text) => setEditData({...editData, address: text})}
                    placeholder="Enter address"
                    multiline
                    numberOfLines={3}
                    placeholderTextColor={colors.gray}
                  />
                ) : (
                  <Text style={[styles.infoValue, { color: colors.primary }]}>{user.address || 'Not provided'}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Account Information Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Account Information</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>Member Since</Text>
                <Text style={[styles.infoValue, { color: colors.primary }]}>
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>Last Login</Text>
                <Text style={[styles.infoValue, { color: colors.primary }]}>
                  {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                </Text>
              </View>
            </View>
          </View>

          {/* Theme Settings Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="settings-outline" size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>App Settings</Text>
            </View>
            <View style={styles.cardContent}>
              <ThemeToggle />
            </View>
          </View>

          {/* Save Button */}
          {editing && (
            <View style={styles.saveContainer}>
              <TouchableOpacity
                style={[styles.saveButton, loading && styles.disabledButton]}
                onPress={handleSaveProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background} size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-outline" size={20} color={colors.background} />
                    <Text style={[styles.saveButtonText, { color: colors.background }]}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Logout Button */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        
        {/* Enhanced Logout Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showLogoutModal}
          onRequestClose={cancelLogout}
        >
          <Pressable style={styles.modalOverlay} onPress={cancelLogout}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="log-out-outline" size={32} color={colors.primary} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Logout</Text>
              </View>
              
              <Text style={[styles.modalMessage, { color: colors.gray }]}>
                Are you sure you want to logout from CycleBees?
              </Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                  onPress={cancelLogout}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.gray }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalLogoutButton]}
                  onPress={confirmLogout}
                >
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>
        
        {/* Easter Egg Component */}
        <EasterEgg 
          isVisible={showEasterEgg} 
          onClose={handleEasterEggClose} 
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1E1E1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD11E',
    marginLeft: 8,
  },
  dashboardText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
    padding: 8,
  },
  profileCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD11E',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 2,
    textAlign: 'center',
  },
  userPhone: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  actionsContainer: {
    marginBottom: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E1E',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
    gap: 6,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  cardContent: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#FFD11E',
    flex: 2,
    textAlign: 'right',
    fontWeight: '600',
  },
  editInput: {
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#FFFFFF',
    flex: 2,
    textAlign: 'right',
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
    textAlign: 'left',
  },
  saveContainer: {
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  saveButton: {
    backgroundColor: '#FFD11E',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(255, 209, 30, 0.3)',
      },
      default: {
        shadowColor: '#FFD11E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  saveButtonText: {
    color: '#0F0F0F',
    fontSize: 14,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0F0F0F',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#FFD11E',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  retryButtonText: {
    color: '#0F0F0F',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
    minWidth: 320,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#0F0F0F',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalMessage: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333333',
  },
  cancelButtonText: {
    color: '#CCCCCC',
    fontSize: 16,
    fontWeight: '600',
  },
  modalLogoutButton: {
    backgroundColor: '#dc3545',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  easterEggIcon: {
    padding: 4,
  },
  logoutContainer: {
    paddingHorizontal: 8,
    paddingBottom: 20,
    marginTop: 12,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#dc3545',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(220, 53, 69, 0.3)',
      },
      default: {
        shadowColor: '#dc3545',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
}); 