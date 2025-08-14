import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  Platform,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import CachedImage, { DefaultPlaceholder, DefaultFallback } from '../components/CachedImage';
import CachedVideo, { DefaultVideoPlaceholder, DefaultVideoFallback } from '../components/CachedVideo';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ResizeMode } from 'expo-av';
import { RequestCard, EmptyState, Button, Badge } from '@/components/ui';
import { Colors } from '@/constants/Colors';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/Styles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { API_BASE_URL } from '@/config/api';
import { useAppTheme } from '@/hooks/useAppTheme';


interface RepairRequest {
  id: number;
  contact_number: string;
  alternate_number?: string;
  email?: string;
  notes?: string;
  address?: string;
  preferred_date: string;
  time_slot_id: number;
  total_amount: number;
  payment_method: string;
  status: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  start_time: string;
  end_time: string;
  rejection_note?: string;
  services?: Array<{
    id: number;
    name: string;
    description: string;
    special_instructions: string;
    price: number;
    discount_amount: number;
  }>;
  files?: Array<{
    id: number;
    file_url: string;
    file_type: string;
    fileType?: string; // Alternative field name from backend
    display_order: number;
    downloadUrl?: string; // Added for direct image display
  }>;
}

interface RentalRequest {
  id: number;
  bicycle_name: string;
  duration_type: string;
  duration_count: number;
  total_amount: number;
  status: string;
  created_at: string;
  delivery_address: string;
  delivery_charge: number;
  rejection_note?: string;
}

const { width } = Dimensions.get('window');

interface MyRequestsScreenProps {
  onNavigate?: (route: string) => void;
  initialTab?: 'repair' | 'rental';
  onInitialTabUsed?: () => void;
}

export default function MyRequestsScreen({ onNavigate, initialTab, onInitialTabUsed }: MyRequestsScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors, isDark } = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      flex: 1,
      position: 'relative',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: colors.cardBackground,
      shadowColor: colors.shadow,
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
      color: colors.primary,
      marginLeft: 8,
    },
    dashboardText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    headerContent: {
      flex: 1,
      alignItems: 'center',
      marginLeft: 8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 2,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.text,
      opacity: 0.8,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: colors.cardBackground,
      padding: 6,
      marginHorizontal: 12,
      marginTop: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 6,
      gap: 6,
    },
    activeTabButton: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    tabButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    activeTabButtonText: {
      color: colors.text,
      fontWeight: 'bold',
    },
    requestsList: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyStateTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 20,
      marginBottom: 10,
    },
    emptyStateSubtitle: {
      fontSize: 16,
      color: colors.text,
      textAlign: 'center',
      marginBottom: 30,
      lineHeight: 24,
    },
    emptyStateButton: {
      backgroundColor: colors.primary,
      paddingVertical: 15,
      paddingHorizontal: 30,
      borderRadius: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    emptyStateButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: 'bold',
    },
    requestsGrid: {
      flexDirection: 'column',
      gap: 6,
    },
    requestCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    requestCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    requestId: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    requestStatus: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    requestStatusText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.background,
    },
    requestCardBody: {
      padding: 16,
    },
    requestInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    requestInfoLabel: {
      fontSize: 14,
      color: isDark ? '#CCCCCC' : colors.secondary,
      flex: 1,
    },
    requestInfoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'right',
      flex: 1,
    },
    requestAmount: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary,
      textAlign: 'right',
    },
    requestCardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      paddingTop: 0,
    },
    requestDate: {
      fontSize: 12,
      color: isDark ? '#CCCCCC' : colors.secondary,
    },
    viewDetailsButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    viewDetailsButtonText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: 16,
      margin: 20,
      width: '95%',
      maxHeight: '80%',
      minHeight: 600,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    modalCloseButton: {
      padding: 4,
    },
    modalBody: {
      flex: 1,
      padding: 16,
    },
    modalHeaderSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    modalHeaderLeft: {
      flex: 1,
    },
    modalRequestIdContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    modalRequestId: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginLeft: 6,
    },
    modalStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 16,
      gap: 3,
    },
    modalStatusText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    modalAmountContainer: {
      alignItems: 'flex-end',
    },
    modalAmountLabel: {
      fontSize: 12,
      color: isDark ? '#CCCCCC' : colors.secondary,
      marginBottom: 2,
    },
    modalAmountValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary,
    },
    modalServiceChargeLabel: {
      fontSize: 12,
      color: isDark ? '#CCCCCC' : colors.secondary,
      marginTop: 6,
      marginBottom: 2,
    },
    modalServiceChargeValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    modalCardsContainer: {
      gap: 12,
    },
    modalInfoCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    modalCardTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginLeft: 6,
      flex: 1,
    },
    modalMediaCount: {
      fontSize: 12,
      color: isDark ? '#CCCCCC' : colors.secondary,
    },
    modalCardContent: {
      gap: 6,
    },
    modalServiceItem: {
      marginBottom: 8,
    },
    modalServiceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 3,
    },
    modalServiceName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    modalServicePrice: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    modalServiceDescription: {
      fontSize: 13,
      color: isDark ? '#CCCCCC' : colors.secondary,
      lineHeight: 16,
      marginBottom: 3,
    },
    modalServiceInstructions: {
      fontSize: 13,
      color: isDark ? '#CCCCCC' : colors.secondary,
      lineHeight: 16,
    },
    modalServiceInstructionsLabel: {
      fontWeight: '600',
      color: colors.text,
    },
    modalServiceDiscount: {
      marginTop: 3,
    },
    modalServiceDiscountText: {
      fontSize: 12,
      color: colors.success,
      fontWeight: '600',
    },
    modalServiceDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginTop: 6,
    },
    modalInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    modalInfoLabel: {
      fontSize: 14,
      color: isDark ? '#CCCCCC' : colors.secondary,
      flex: 1,
    },
    modalInfoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'right',
      flex: 1,
    },
    modalExpiryCard: {
      borderColor: colors.warning,
      backgroundColor: colors.cardBackground,
    },
    modalExpiryText: {
      fontSize: 14,
      color: colors.warning,
      fontWeight: '600',
      textAlign: 'center',
    },
    modalRejectionCard: {
      borderColor: colors.error,
      backgroundColor: colors.cardBackground,
    },
    modalRejectionText: {
      fontSize: 14,
      color: colors.error,
      lineHeight: 20,
    },
    closeButton: {
      backgroundColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
      margin: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    closeButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '600',
    },
    statusUpdateModal: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    statusUpdateModalContent: {
      backgroundColor: colors.background,
      borderRadius: 16,
      padding: 24,
      margin: 20,
      maxWidth: 300,
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    statusUpdateModalHeader: {
      alignItems: 'center',
      marginBottom: 16,
    },
    statusUpdateModalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 12,
      textAlign: 'center',
    },
    statusUpdateModalBody: {
      marginBottom: 20,
    },
    statusUpdateModalMessage: {
      fontSize: 14,
      color: colors.text,
      textAlign: 'center',
      lineHeight: 20,
    },
    statusUpdateModalButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    statusUpdateModalButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '600',
    },
    modalAddressText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    modalNotesText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      fontStyle: 'italic',
    },
    modalMediaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 6,
    },
    modalMediaItem: {
      width: '48%',
      aspectRatio: 1,
      borderRadius: 6,
      overflow: 'hidden',
      marginBottom: 6,
    },
    modalImageThumbnail: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
    },
    modalVideoThumbnail: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
    },
    modalMediaIcon: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    modalMediaLabel: {
      fontSize: 11,
      color: colors.text,
      marginTop: 3,
      fontWeight: '500',
    },
  });

  console.log('📋 MyRequestsScreen: initialTab =', initialTab, 'params.tab =', params.tab);

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
  const colorScheme = useColorScheme();
  const legacyColors = Colors[colorScheme ?? 'light'];
  
  const [activeTab, setActiveTab] = useState<'repair' | 'rental'>(
    initialTab || (params.tab as string) === 'rental' ? 'rental' : 'repair'
  );
  
  console.log('📋 MyRequestsScreen: Setting activeTab to', activeTab);
  
  // Handle initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      console.log('📋 MyRequestsScreen: initialTab changed to', initialTab);
      setActiveTab(initialTab);
      // Notify parent that initialTab has been used
      if (onInitialTabUsed) {
        setTimeout(() => onInitialTabUsed(), 100);
      }
    }
  }, [initialTab, onInitialTabUsed]);
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [rentalRequests, setRentalRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Request details modal
  const [selectedRepairRequest, setSelectedRepairRequest] = useState<RepairRequest | null>(null);
  const [selectedRentalRequest, setSelectedRentalRequest] = useState<RentalRequest | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Status update notification modal
  const [showStatusUpdateModal, setShowStatusUpdateModal] = useState(false);
  const [statusUpdateInfo, setStatusUpdateInfo] = useState<{
    type: 'repair' | 'rental';
    requestId: number;
    oldStatus: string;
    newStatus: string;
    title: string;
    message: string;
    icon: string;
    color: string;
  } | null>(null);
  
  // Track previous statuses for comparison
  const previousRepairRequests = useRef<RepairRequest[]>([]);
  const previousRentalRequests = useRef<RentalRequest[]>([]);
  
  // Track shown notifications to prevent duplicates
  const shownNotifications = useRef<Set<string>>(new Set());
  
  // Animation values
  const modalScale = useRef(new Animated.Value(0)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const iconRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchRequests();
    
    // Auto-refresh every 5 seconds to update countdown and check status changes
    const interval = setInterval(() => {
      fetchRequests();
    }, 5000);
    
    // Cleanup function
    return () => {
      clearInterval(interval);
      // Clear shown notifications when component unmounts or tab changes
      shownNotifications.current.clear();
    };
  }, [activeTab]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (activeTab === 'repair') {
        const response = await fetch(`${API_BASE_URL}/api/repair/requests`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const newRequests = data.success && data.data ? data.data : [];
          

          
          // Check for status changes
          checkStatusChanges('repair', previousRepairRequests.current, newRequests);
          
          setRepairRequests(newRequests);
          previousRepairRequests.current = newRequests;
        } else {
          setRepairRequests([]);
        }
      } else {
        const response = await fetch(`${API_BASE_URL}/api/rental/requests`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const newRequests = data.success && data.data ? data.data : [];
          
          // Check for status changes
          checkStatusChanges('rental', previousRentalRequests.current, newRequests);
          
          setRentalRequests(newRequests);
          previousRentalRequests.current = newRequests;
        } else {
          setRentalRequests([]);
        }
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      if (activeTab === 'repair') {
        setRepairRequests([]);
      } else {
        setRentalRequests([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkStatusChanges = (
    type: 'repair' | 'rental',
    previousRequests: any[],
    newRequests: any[]
  ) => {
    if (previousRequests.length === 0) return;

    newRequests.forEach(newRequest => {
      const previousRequest = previousRequests.find(req => req.id === newRequest.id);
      if (previousRequest && previousRequest.status !== newRequest.status) {
        // Create a unique key for this status change
        const notificationKey = `${type}-${newRequest.id}-${previousRequest.status}-${newRequest.status}`;
        
        // Only show notification if we haven't shown it before
        if (!shownNotifications.current.has(notificationKey)) {
          shownNotifications.current.add(notificationKey);
          showStatusUpdateNotification(type, newRequest, previousRequest.status, newRequest.status);
          
          // Remove the notification key after 10 seconds to allow future status changes
          setTimeout(() => {
            shownNotifications.current.delete(notificationKey);
          }, 10000);
        }
      }
    });
  };

  const showStatusUpdateNotification = (
    type: 'repair' | 'rental',
    request: any,
    oldStatus: string,
    newStatus: string
  ) => {
    // Don't show notification if modal is already visible
    if (showStatusUpdateModal) {
      return;
    }
    
    const statusConfig = getStatusUpdateConfig(type, request, oldStatus, newStatus);
    
    // Reset animation values first
    modalScale.setValue(0);
    modalOpacity.setValue(0);
    iconRotation.setValue(0);
    
    // Set the modal info and show modal
    setStatusUpdateInfo(statusConfig);
    setShowStatusUpdateModal(true);
    
    // Use setTimeout to ensure state is updated before animation starts
    setTimeout(() => {
      // Animate modal entrance with smoother timing
      Animated.parallel([
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(modalScale, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]).start();
      
      // Animate icon rotation after a slight delay
      setTimeout(() => {
        Animated.timing(iconRotation, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }).start();
      }, 150);
    }, 50);
  };

  const getStatusUpdateConfig = (
    type: 'repair' | 'rental',
    request: any,
    oldStatus: string,
    newStatus: string
  ) => {
    const isPositive = ['approved', 'active', 'active_rental', 'completed'].includes(newStatus);
    const isNegative = ['rejected', 'expired'].includes(newStatus);
    const isNeutral = ['waiting_payment', 'arranging_delivery'].includes(newStatus);

    let title = 'Status Update';
    let message = `Your ${type} request status has been updated to ${newStatus}.`;
    let icon = 'information-circle';
    let color = colors.info;

    if (isPositive) {
      color = colors.success;
      icon = 'checkmark-circle';
      if (newStatus === 'approved') {
        title = 'Request Approved! 🎉';
        message = type === 'repair' 
          ? 'Your repair request has been approved. We\'ll contact you soon to arrange the service.'
          : 'Your rental request has been approved. We\'ll arrange delivery shortly.';
      } else if (newStatus === 'active' || newStatus === 'active_rental') {
        title = 'Service Started! 🚀';
        message = type === 'repair'
          ? 'Your repair service is now active. Our team is working on your request.'
          : 'Your rental is now active. Enjoy your ride!';
      } else if (newStatus === 'completed') {
        title = 'Service Completed! ✅';
        message = type === 'repair'
          ? 'Your repair service has been completed. Thank you for choosing us!'
          : 'Your rental has been completed. We hope you enjoyed the experience!';
      }
    } else if (isNegative) {
      color = colors.error;
      icon = 'close-circle';
      if (newStatus === 'rejected') {
        title = 'Request Update';
        message = request.rejection_note || 'Your request has been rejected. Please contact us for more information.';
      } else if (newStatus === 'expired') {
        title = 'Request Expired';
        message = 'Your request has expired. Please submit a new request if needed.';
      }
    } else {
      color = colors.info;
      icon = 'information-circle';
      if (newStatus === 'waiting_payment') {
        title = 'Payment Required';
        message = 'Please complete the payment to proceed with your request.';
      } else if (newStatus === 'arranging_delivery') {
        title = 'Arranging Delivery';
        message = 'We\'re arranging delivery for your rental. You\'ll be contacted soon.';
      }
    }

    return {
      type,
      requestId: request.id,
      oldStatus,
      newStatus,
      title,
      message,
      icon,
      color,
    };
  };

  const closeStatusUpdateModal = () => {
    // Animate modal exit
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowStatusUpdateModal(false);
      setStatusUpdateInfo(null);
      // Reset animation values
      modalScale.setValue(0);
      modalOpacity.setValue(0);
      iconRotation.setValue(0);
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'waiting_payment': return colors.info;
      case 'active': return colors.success;
      case 'arranging_delivery': return colors.secondary;
      case 'active_rental': return colors.success;
      case 'completed': return colors.gray;
      case 'expired': return colors.error;
      case 'rejected': return colors.error;
      default: return colors.gray;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending Approval';
      case 'waiting_payment': return 'Waiting for Payment';
      case 'active': return 'Active';
      case 'arranging_delivery': return 'Arranging Delivery';
      case 'active_rental': return 'Active Rental';
      case 'completed': return 'Completed';
      case 'expired': return 'Expired';
      case 'rejected': return 'Rejected';
      default: return status.replace('_', ' ').toUpperCase();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'waiting_payment': return 'card-outline';
      case 'active': return 'checkmark-circle-outline';
      case 'arranging_delivery': return 'car-outline';
      case 'active_rental': return 'bicycle-outline';
      case 'completed': return 'checkmark-done-outline';
      case 'expired': return 'close-circle-outline';
      case 'rejected': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${minutes}m ${seconds}s remaining`;
  };

  const openRepairRequestDetails = (request: RepairRequest) => {
    setSelectedRepairRequest(request);
    setSelectedRentalRequest(null);
    setShowRequestModal(true);
  };

  const openRentalRequestDetails = (request: RentalRequest) => {
    console.log('Opening rental request details:', request); // Debug log
    setSelectedRentalRequest(request);
    setSelectedRepairRequest(null);
    setShowRequestModal(true);
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setSelectedRepairRequest(null);
    setSelectedRentalRequest(null);
  };

  const renderRepairRequests = () => (
    <ScrollView
      style={styles.requestsList}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {!Array.isArray(repairRequests) || repairRequests.length === 0 ? (
        <EmptyState
          icon="construct-outline"
          title="No Repair Requests"
          subtitle="You haven't made any repair requests yet"
          buttonText="Book Your First Repair"
          onButtonPress={() => onNavigate && onNavigate('book-repair')}
        />
      ) : (
        <View style={styles.requestsGrid}>
          {repairRequests.map((request) => (
            <RequestCard
              key={request.id}
              id={request.id}
              type="repair"
              status={request.status}
              totalAmount={request.total_amount}
              date={request.preferred_date}
              time={`${request.start_time} - ${request.end_time}`}
              paymentMethod={request.payment_method}
              address={request.address}
              files={request.files}
              expiresAt={request.expires_at}
              onPress={() => openRepairRequestDetails(request)}
              getStatusColor={getStatusColor}
              getStatusText={getStatusText}
              getStatusIcon={getStatusIcon}
              getTimeRemaining={getTimeRemaining}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderRentalRequests = () => (
    <ScrollView
      style={styles.requestsList}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {!Array.isArray(rentalRequests) || rentalRequests.length === 0 ? (
        <EmptyState
          icon="bicycle-outline"
          title="No Rental Requests"
          subtitle="You haven't made any rental requests yet"
          buttonText="Book Your First Rental"
          onButtonPress={() => onNavigate && onNavigate('book-rental')}
        />
      ) : (
        <View style={styles.requestsGrid}>
          {rentalRequests.map((request) => (
            <RequestCard
              key={request.id}
              id={request.id}
              type="rental"
              status={request.status}
              totalAmount={Number(request.total_amount) || 0}
              date={request.created_at ? new Date(request.created_at).toLocaleDateString() : 'N/A'}
              address={request.delivery_address || 'No address provided'}
              onPress={() => openRentalRequestDetails(request)}
              getStatusColor={getStatusColor}
              getStatusText={getStatusText}
              getStatusIcon={getStatusIcon}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Tab Container */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton, 
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
            activeTab === 'repair' && { backgroundColor: colors.primary, borderColor: colors.primary }
          ]}
          onPress={() => setActiveTab('repair')}
        >
          <Ionicons 
            name="construct-outline" 
            size={20} 
            color={activeTab === 'repair' ? colors.background : (isDark ? '#CCCCCC' : colors.gray)} 
          />
          <Text style={[
            styles.tabButtonText,
            { color: isDark ? '#CCCCCC' : colors.gray },
            activeTab === 'repair' && { color: colors.background, fontWeight: '600' }
          ]}>
            Repair Requests
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton, 
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
            activeTab === 'rental' && { backgroundColor: colors.primary, borderColor: colors.primary }
          ]}
          onPress={() => setActiveTab('rental')}
        >
          <Ionicons 
            name="bicycle-outline" 
            size={20} 
            color={activeTab === 'rental' ? colors.background : (isDark ? '#CCCCCC' : colors.gray)} 
          />
          <Text style={[
            styles.tabButtonText,
            { color: isDark ? '#CCCCCC' : colors.gray },
            activeTab === 'rental' && { color: colors.background, fontWeight: '600' }
          ]}>
            Rental Requests
          </Text>
        </TouchableOpacity>
      </View>

        {/* Content Container */}
      <View style={styles.contentContainer}>
        {activeTab === 'repair' ? renderRepairRequests() : renderRentalRequests()}
      </View>

      {showRequestModal && (
        <Modal
          visible={showRequestModal}
          animationType="slide"
          transparent={true}
          onRequestClose={closeRequestModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {selectedRepairRequest ? 'Repair Request Details' : 'Rental Request Details'}
                </Text>
                              <TouchableOpacity onPress={closeRequestModal} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={isDark ? '#CCCCCC' : colors.gray} />
              </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {selectedRepairRequest && (
                  <View>
                    {/* Header with Status and Amount */}
                    <View style={styles.modalHeaderSection}>
                      <View style={styles.modalHeaderLeft}>
                        <View style={styles.modalRequestIdContainer}>
                          <Ionicons name="construct-outline" size={20} color={colors.primary} />
                          <Text style={styles.modalRequestId}>#{selectedRepairRequest.id}</Text>
                        </View>
                        <View style={[
                          styles.modalStatusBadge,
                          { backgroundColor: getStatusColor(selectedRepairRequest.status) }
                        ]}>
                          <Ionicons 
                            name={getStatusIcon(selectedRepairRequest.status) as any} 
                            size={14} 
                            color={colors.background} 
                          />
                          <Text style={styles.modalStatusText}>
                            {getStatusText(selectedRepairRequest.status)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.modalAmountContainer}>
                        <Text style={styles.modalAmountLabel}>Total Amount</Text>
                        <Text style={styles.modalAmountValue}>₹{selectedRepairRequest.total_amount}</Text>
                        {selectedRepairRequest.services && selectedRepairRequest.services.length > 0 && (
                          <>
                            <Text style={styles.modalServiceChargeLabel}>Service Charge</Text>
                            <Text style={styles.modalServiceChargeValue}>
                              ₹{selectedRepairRequest.total_amount - selectedRepairRequest.services.reduce((sum, service) => sum + service.price, 0)}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                    
                    {/* Key Information Cards */}
                    <View style={styles.modalCardsContainer}>
                      {/* Selected Services Card */}
                      {selectedRepairRequest.services && selectedRepairRequest.services.length > 0 && (
                        <View style={styles.modalInfoCard}>
                          <View style={styles.modalCardHeader}>
                            <Ionicons name="construct-outline" size={18} color={colors.primary} />
                            <Text style={styles.modalCardTitle}>Selected Services</Text>
                            <Text style={styles.modalMediaCount}>
                              ({selectedRepairRequest.services.length} services)
                            </Text>
                          </View>
                          <View style={styles.modalCardContent}>
                            {selectedRepairRequest.services.map((service, index) => (
                              <View key={service.id} style={styles.modalServiceItem}>
                                <View style={styles.modalServiceHeader}>
                                  <Text style={styles.modalServiceName}>{service.name}</Text>
                                  <Text style={styles.modalServicePrice}>₹{service.price}</Text>
                                </View>
                                {service.description && (
                                  <Text style={styles.modalServiceDescription}>{service.description}</Text>
                                )}
                                {service.special_instructions && (
                                  <Text style={styles.modalServiceInstructions}>
                                    <Text style={styles.modalServiceInstructionsLabel}>Instructions: </Text>
                                    {service.special_instructions}
                                  </Text>
                                )}
                                {service.discount_amount > 0 && (
                                  <View style={styles.modalServiceDiscount}>
                                    <Text style={styles.modalServiceDiscountText}>
                                      Discount: ₹{service.discount_amount}
                                    </Text>
                                  </View>
                                )}
                                {selectedRepairRequest.services && index < selectedRepairRequest.services.length - 1 && (
                                  <View style={styles.modalServiceDivider} />
                                )}
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* Service Details Card */}
                      <View style={styles.modalInfoCard}>
                        <View style={styles.modalCardHeader}>
                                                      <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                          <Text style={styles.modalCardTitle}>Service Details</Text>
                        </View>
                        <View style={styles.modalCardContent}>
                          <View style={styles.modalInfoRow}>
                            <Text style={styles.modalInfoLabel}>Date:</Text>
                            <Text style={styles.modalInfoValue}>{selectedRepairRequest.preferred_date}</Text>
                          </View>
                          <View style={styles.modalInfoRow}>
                            <Text style={styles.modalInfoLabel}>Time:</Text>
                            <Text style={styles.modalInfoValue}>{selectedRepairRequest.start_time} - {selectedRepairRequest.end_time}</Text>
                          </View>
                          <View style={styles.modalInfoRow}>
                            <Text style={styles.modalInfoLabel}>Payment:</Text>
                            <Text style={styles.modalInfoValue}>{selectedRepairRequest.payment_method}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Contact Information Card */}
                      <View style={styles.modalInfoCard}>
                        <View style={styles.modalCardHeader}>
                                                      <Ionicons name="person-outline" size={18} color={colors.primary} />
                          <Text style={styles.modalCardTitle}>Contact Information</Text>
                        </View>
                        <View style={styles.modalCardContent}>
                          <View style={styles.modalInfoRow}>
                            <Text style={styles.modalInfoLabel}>Phone:</Text>
                            <Text style={styles.modalInfoValue}>{selectedRepairRequest.contact_number}</Text>
                          </View>
                      {selectedRepairRequest.alternate_number && (
                            <View style={styles.modalInfoRow}>
                              <Text style={styles.modalInfoLabel}>Alternate:</Text>
                              <Text style={styles.modalInfoValue}>{selectedRepairRequest.alternate_number}</Text>
                            </View>
                      )}
                      {selectedRepairRequest.email && (
                            <View style={styles.modalInfoRow}>
                              <Text style={styles.modalInfoLabel}>Email:</Text>
                              <Text style={styles.modalInfoValue}>{selectedRepairRequest.email}</Text>
                            </View>
                      )}
                        </View>
                      </View>

                      {/* Address Card */}
                      {selectedRepairRequest.address && (
                        <View style={styles.modalInfoCard}>
                          <View style={styles.modalCardHeader}>
                            <Ionicons name="location-outline" size={18} color={colors.primary} />
                            <Text style={styles.modalCardTitle}>Service Address</Text>
                    </View>
                          <View style={styles.modalCardContent}>
                            <Text style={styles.modalAddressText}>{selectedRepairRequest.address}</Text>
                          </View>
                        </View>
                      )}
                    
                      {/* Notes Card */}
                      {selectedRepairRequest.notes && (
                        <View style={styles.modalInfoCard}>
                          <View style={styles.modalCardHeader}>
                            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                            <Text style={styles.modalCardTitle}>Special Notes</Text>
                    </View>
                          <View style={styles.modalCardContent}>
                            <Text style={styles.modalNotesText}>{selectedRepairRequest.notes}</Text>
                          </View>
                        </View>
                      )}
                    
                      {/* Media Files Card */}
                    {selectedRepairRequest.files && selectedRepairRequest.files.length > 0 && (
                        <View style={styles.modalInfoCard}>
                          <View style={styles.modalCardHeader}>
                            <Ionicons name="images-outline" size={18} color={colors.primary} />
                            <Text style={styles.modalCardTitle}>Media Files</Text>
                            <Text style={styles.modalMediaCount}>
                              ({selectedRepairRequest.files.length} files)
                            </Text>
                          </View>
                          <View style={styles.modalCardContent}>
                        <View style={styles.modalMediaGrid}>
                          {selectedRepairRequest.files.map((file, index) => (
                            <View key={file.id} style={styles.modalMediaItem}>
                              {(file.file_type === 'image' || file.fileType === 'image') && (file.downloadUrl || file.file_url) ? (
                                <CachedImage
                                  source={file.downloadUrl || file.file_url || ''}
                                  style={{ width: '100%', height: '100%', borderRadius: 8 }}
                                  resizeMode="cover"
                                  placeholder={<DefaultPlaceholder size={80} icon="image" text="" />}
                                  fallback={<DefaultFallback size={80} icon="image-outline" text="" />}
                                  priority="normal"
                                  cachePolicy="memory-disk"
                                />
                              ) : (file.file_type === 'video' || file.fileType === 'video') && (file.downloadUrl || file.file_url) ? (
                                <CachedVideo
                                  source={file.downloadUrl || file.file_url || ''}
                                  style={{ width: '100%', height: '100%', borderRadius: 8 }}
                                  resizeMode={ResizeMode.COVER}
                                  placeholder={<DefaultVideoPlaceholder size={80} text="" />}
                                  fallback={<DefaultVideoFallback size={80} text="" />}
                                  shouldPlay={false}
                                  isMuted={true}
                                  useNativeControls={true}
                                />
                              ) : (file.file_type === 'image' || file.fileType === 'image') ? (
                                <View style={styles.modalImageThumbnail}>
                                      <Text style={styles.modalMediaIcon}>📷</Text>
                                  <Text style={styles.modalMediaLabel}>Photo {index + 1}</Text>
                                </View>
                              ) : (
                                <View style={styles.modalVideoThumbnail}>
                                      <Text style={styles.modalMediaIcon}>🎥</Text>
                                  <Text style={styles.modalMediaLabel}>Video</Text>
                                </View>
                              )}
                            </View>
                          ))}
                            </View>
                        </View>
                      </View>
                    )}
                    
                      {/* Expiry Timer Card */}
                    {selectedRepairRequest.status === 'pending' && selectedRepairRequest.expires_at && (
                        <View style={[styles.modalInfoCard, styles.modalExpiryCard]}>
                          <View style={styles.modalCardHeader}>
                            <Ionicons name="time-outline" size={18} color={colors.warning} />
                            <Text style={styles.modalCardTitle}>Request Expiry</Text>
                          </View>
                          <View style={styles.modalCardContent}>
                            <Text style={styles.modalExpiryText}>
                          {getTimeRemaining(selectedRepairRequest.expires_at)}
                        </Text>
                          </View>
                      </View>
                    )}

                      {/* Rejected Status Card */}
                      {selectedRepairRequest.status === 'rejected' && selectedRepairRequest.rejection_note && (
                        <View style={[styles.modalInfoCard, styles.modalRejectionCard]}>
                          <View style={styles.modalCardHeader}>
                            <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                            <Text style={styles.modalCardTitle}>Request Rejected</Text>
                          </View>
                          <View style={styles.modalCardContent}>
                            <Text style={styles.modalRejectionText}>{selectedRepairRequest.rejection_note}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                )}
                
                {selectedRentalRequest && (
                  <View>
                    {/* Header with Status and Amount */}
                    <View style={styles.modalHeaderSection}>
                      <View style={styles.modalHeaderLeft}>
                        <View style={styles.modalRequestIdContainer}>
                          <Ionicons name="bicycle-outline" size={20} color={colors.primary} />
                          <Text style={styles.modalRequestId}>#{selectedRentalRequest.id}</Text>
                        </View>
                        <View style={[
                          styles.modalStatusBadge,
                          { backgroundColor: getStatusColor(selectedRentalRequest.status) }
                        ]}>
                          <Ionicons 
                            name={getStatusIcon(selectedRentalRequest.status) as any} 
                            size={14} 
                            color={colors.background} 
                          />
                          <Text style={styles.modalStatusText}>
                            {getStatusText(selectedRentalRequest.status)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.modalAmountContainer}>
                        <Text style={styles.modalAmountLabel}>Total Amount</Text>
                        <Text style={styles.modalAmountValue}>₹{Number(selectedRentalRequest.total_amount) || 0}</Text>
                      </View>
                    </View>
                    
                    {/* Amount Details Card */}
                    <View style={styles.modalInfoCard}>
                      <View style={styles.modalCardHeader}>
                                                    <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
                        <Text style={styles.modalCardTitle}>Amount Details</Text>
                      </View>
                      <View style={styles.modalCardContent}>
                        <View style={styles.modalInfoRow}>
                          <Text style={styles.modalInfoLabel}>Rental Rate:</Text>
                          <Text style={styles.modalInfoValue}>
                            ₹{(() => {
                              const total = Number(selectedRentalRequest.total_amount) || 0;
                              const delivery = Number(selectedRentalRequest.delivery_charge) || 0;
                              const duration = Number(selectedRentalRequest.duration_count) || 1;
                              const rate = Math.round((total - delivery) / duration);
                              return rate > 0 ? rate : 0;
                            })()}/{selectedRentalRequest.duration_type === 'daily' ? 'day' : 'week'}
                          </Text>
                        </View>
                        <View style={styles.modalInfoRow}>
                          <Text style={styles.modalInfoLabel}>Delivery Charge:</Text>
                          <Text style={styles.modalInfoValue}>₹{Number(selectedRentalRequest.delivery_charge) || 0}</Text>
                        </View>
                      </View>
                    </View>
                    
                    {/* Key Information Cards */}
                    <View style={styles.modalCardsContainer}>
                      {/* Bicycle Details Card */}
                      <View style={styles.modalInfoCard}>
                        <View style={styles.modalCardHeader}>
                          <Ionicons name="bicycle-outline" size={18} color={colors.primary} />
                          <Text style={styles.modalCardTitle}>Bicycle Details</Text>
                        </View>
                        <View style={styles.modalCardContent}>
                          <View style={styles.modalInfoRow}>
                            <Text style={styles.modalInfoLabel}>Bicycle:</Text>
                            <Text style={styles.modalInfoValue}>{selectedRentalRequest.bicycle_name}</Text>
                          </View>
                          <View style={styles.modalInfoRow}>
                            <Text style={styles.modalInfoLabel}>Duration:</Text>
                            <Text style={styles.modalInfoValue}>
                              {selectedRentalRequest.duration_count} {selectedRentalRequest.duration_type === 'daily' ? 'Day(s)' : 'Week(s)'}
                            </Text>
                          </View>
                          <View style={styles.modalInfoRow}>
                            <Text style={styles.modalInfoLabel}>Delivery Charge:</Text>
                            <Text style={styles.modalInfoValue}>₹{Number(selectedRentalRequest.delivery_charge) || 0}</Text>
                          </View>
                        </View>
                    </View>
                    
                      {/* Delivery Information Card */}
                      <View style={styles.modalInfoCard}>
                        <View style={styles.modalCardHeader}>
                          <Ionicons name="location-outline" size={18} color={colors.primary} />
                          <Text style={styles.modalCardTitle}>Delivery Information</Text>
                        </View>
                        <View style={styles.modalCardContent}>
                          <Text style={styles.modalAddressText}>{selectedRentalRequest.delivery_address}</Text>
                        </View>
                    </View>
                    
                      {/* Request Information Card */}
                      <View style={styles.modalInfoCard}>
                        <View style={styles.modalCardHeader}>
                          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                          <Text style={styles.modalCardTitle}>Request Information</Text>
                        </View>
                        <View style={styles.modalCardContent}>
                          <View style={styles.modalInfoRow}>
                            <Text style={styles.modalInfoLabel}>Request Date:</Text>
                            <Text style={styles.modalInfoValue}>
                              {new Date(selectedRentalRequest.created_at).toLocaleDateString()}
                      </Text>
                          </View>
                          <View style={styles.modalInfoRow}>
                            <Text style={styles.modalInfoLabel}>Request Time:</Text>
                            <Text style={styles.modalInfoValue}>
                              {new Date(selectedRentalRequest.created_at).toLocaleTimeString()}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Pending Status Card */}
                      {selectedRentalRequest.status === 'pending' && (
                        <View style={[styles.modalInfoCard, styles.modalExpiryCard]}>
                          <View style={styles.modalCardHeader}>
                            <Ionicons name="time-outline" size={18} color={colors.warning} />
                            <Text style={styles.modalCardTitle}>Request Status</Text>
                          </View>
                          <View style={styles.modalCardContent}>
                            <Text style={styles.modalExpiryText}>Pending approval</Text>
                          </View>
                        </View>
                      )}

                      {/* Rejected Status Card */}
                      {selectedRentalRequest.status === 'rejected' && selectedRentalRequest.rejection_note && (
                        <View style={[styles.modalInfoCard, styles.modalRejectionCard]}>
                          <View style={styles.modalCardHeader}>
                            <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                            <Text style={styles.modalCardTitle}>Request Rejected</Text>
                          </View>
                          <View style={styles.modalCardContent}>
                            <Text style={styles.modalRejectionText}>{selectedRentalRequest.rejection_note}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </ScrollView>
              
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeRequestModal}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {showStatusUpdateModal && statusUpdateInfo && (
        <Animated.View
          style={[
            styles.statusUpdateModal,
            {
              transform: [{ scale: modalScale }],
              opacity: modalOpacity,
            },
          ]}
        >
          <View style={styles.statusUpdateModalContent}>
            <View style={styles.statusUpdateModalHeader}>
              <Ionicons
                name={statusUpdateInfo.icon as any}
                size={40}
                color={statusUpdateInfo.color}
              />
              <Text style={styles.statusUpdateModalTitle}>{statusUpdateInfo.title}</Text>
            </View>
            <View style={styles.statusUpdateModalBody}>
              <Text style={styles.statusUpdateModalMessage}>{statusUpdateInfo.message}</Text>
            </View>
            <TouchableOpacity
              style={styles.statusUpdateModalButton}
              onPress={closeStatusUpdateModal}
            >
              <Text style={styles.statusUpdateModalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Status Update Notification Modal */}
      {showStatusUpdateModal && statusUpdateInfo && (
        <Modal
          visible={showStatusUpdateModal}
          transparent={true}
          animationType="none"
          onRequestClose={closeStatusUpdateModal}
          statusBarTranslucent={true}
        >
          <Animated.View
            style={[
              styles.statusUpdateModal,
              {
                opacity: modalOpacity,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.statusUpdateModalContent,
                {
                  transform: [{ scale: modalScale }],
                },
              ]}
            >
              <View style={styles.statusUpdateModalHeader}>
                <Ionicons
                  name={statusUpdateInfo.icon as any}
                  size={48}
                  color={statusUpdateInfo.color}
                />
                <Text style={styles.statusUpdateModalTitle}>{statusUpdateInfo.title}</Text>
              </View>
              <View style={styles.statusUpdateModalBody}>
                <Text style={styles.statusUpdateModalMessage}>{statusUpdateInfo.message}</Text>
              </View>
              <TouchableOpacity
                style={[styles.statusUpdateModalButton, { backgroundColor: colors.primary }]}
                onPress={closeStatusUpdateModal}
                activeOpacity={0.8}
              >
                <Text style={styles.statusUpdateModalButtonText}>
                  Got it!
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </Modal>
      )}
    </View>
  );
}