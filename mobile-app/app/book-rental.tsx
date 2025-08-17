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
  Dimensions,
  Platform,
  Modal
} from 'react-native';
import CachedImage, { DefaultPlaceholder, DefaultFallback } from '../components/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import SimpleLoading from '@/components/SimpleLoading';
import StepIndicator from '@/components/StepIndicator';
import { API_BASE_URL } from '@/config/api';
import Button from '@/components/ui/Button';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getCardGridLayout } from '@/utils/responsive';
import { TYPOGRAPHY, SPACING } from '@/constants/Styles';


interface Bicycle {
  id: number;
  name: string;
  model: string;
  description: string;
  special_instructions: string;
  daily_rate: number;
  weekly_rate: number;
  delivery_charge: number;
  specifications: string;
  photos: {
    id: number;
    photo_url: string;
    display_order: number;
  }[];
}

interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  address?: string;
}

const { width } = Dimensions.get('window');

const STEPS = [
  { id: 'bicycles', title: 'Bicycles', icon: 'bicycle' },
  { id: 'details', title: 'Details', icon: 'document-text' },
  { id: 'summary', title: 'Summary', icon: 'checkmark-circle' },
];

interface BookRentalScreenProps {
  onNavigate?: (route: string) => void;
}

export default function BookRentalScreen({ onNavigate }: BookRentalScreenProps) {
  const router = useRouter();
  const { colors } = useAppTheme();
  
  // Get responsive grid dimensions for bicycle cards
  const gridLayout = getCardGridLayout('bicycle');

  const styles = StyleSheet.create({
    container: {
      flex: 1,
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
      fontSize: TYPOGRAPHY.lg,
      fontWeight: TYPOGRAPHY.fontWeightSemibold,
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
    backButton: {
      padding: 8,
      borderRadius: 16,
      backgroundColor: colors.cardBackground,
    },
    headerSpacer: {
      width: 40,
    },
    stepContainer: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: Platform.OS === 'ios' ? 90 : 76, // Account for navbar
    },
    stepTitle: {
      fontSize: TYPOGRAPHY.lg,
      fontWeight: TYPOGRAPHY.fontWeightBold,
      color: colors.text,
      marginBottom: 3,
    },
    stepSubtitle: {
      fontSize: TYPOGRAPHY.xs,
      color: colors.secondary,
      marginBottom: SPACING.md - 4,
    },
    bicyclesList: {
      flex: 1,
    },
    searchContainer: {
      marginBottom: 16,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: TYPOGRAPHY.sm,
      color: colors.text,
      paddingVertical: 4,
    },
    clearSearchButton: {
      padding: 4,
    },
    clearSearchText: {
      color: colors.secondary,
      fontSize: TYPOGRAPHY.xs,
    },
    bicycleCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bicycleCardSelected: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    bicycleImage: {
      width: '100%',
      height: 200,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    },
    bicycleInfo: {
      padding: 16,
    },
    bicycleName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    bicycleModel: {
      fontSize: 14,
      color: colors.secondary,
      marginBottom: 8,
    },
    bicycleDescription: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      marginBottom: 12,
    },
    bicycleSpecs: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    specItem: {
      alignItems: 'center',
      flex: 1,
    },
    specLabel: {
      fontSize: 12,
      color: colors.secondary,
      marginBottom: 2,
    },
    specValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    bicyclePricing: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    pricingInfo: {
      flex: 1,
    },
    dailyRate: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    weeklyRate: {
      fontSize: 14,
      color: colors.secondary,
      marginTop: 2,
    },
    deliveryCharge: {
      fontSize: 14,
      color: colors.secondary,
      marginTop: 2,
    },
    selectButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    selectButtonText: {
      color: colors.background,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    selectedButton: {
      backgroundColor: colors.success,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    selectedButtonText: {
      color: colors.background,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    formSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: TYPOGRAPHY.base,
      fontWeight: TYPOGRAPHY.fontWeightSemibold,
      color: colors.text,
      marginBottom: 12,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginTop: 2,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.cardBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.text,
    },
    inputError: {
      backgroundColor: colors.cardBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.error,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.text,
    },
    errorText: {
      color: colors.error,
      fontSize: 12,
      marginTop: 4,
    },
    durationContainer: {
      marginBottom: 16,
    },
    durationTypeContainer: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    durationTypeButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      marginHorizontal: 4,
    },
    durationTypeButtonActive: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.primary,
      alignItems: 'center',
      marginHorizontal: 4,
    },
    durationTypeButtonText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    durationTypeButtonTextActive: {
      fontSize: 14,
      color: colors.background,
      fontWeight: '500',
    },
    durationCountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    durationCountButton: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    durationCountText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginHorizontal: 20,
      minWidth: 30,
      textAlign: 'center',
    },
    couponContainer: {
      marginBottom: 16,
    },
    couponInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    couponInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderRadius: 6,
      marginRight: 8,
    },
    applyCouponButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
      marginLeft: 8,
    },
    applyCouponButtonText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: '600',
    },
    couponSuccessContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.success,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      marginTop: 8,
    },
    couponSuccess: {
      color: colors.background,
      fontSize: 12,
      fontWeight: '500',
      marginLeft: 6,
    },
    paymentMethodContainer: {
      marginBottom: 16,
    },
    paymentOption: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 8,
    },
    paymentOptionSelected: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 8,
    },
    paymentOptionDisabled: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 8,
      opacity: 0.5,
    },
    paymentOptionText: {
      fontSize: 14,
      color: colors.text,
      marginLeft: 8,
    },
    paymentOptionTextDisabled: {
      fontSize: 14,
      color: colors.secondary,
      marginLeft: 8,
    },
    summaryContainer: {
      flex: 1,
    },
    summaryCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    summaryIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    summaryCardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    summaryText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    addressInfo: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    },
    notesInfo: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    },
    scheduleInfo: {
      gap: 12,
    },
    scheduleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    contactIcon: {
      marginTop: 2,
    },
    totalContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    totalItem: {
      fontSize: 14,
      color: colors.text,
    },
    totalValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    totalRowFinal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 8,
    },
    totalItemFinal: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    totalValueFinal: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary,
    },
    summaryTotalCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryTotalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      margin: 20,
      maxWidth: '90%',
      maxHeight: '75%',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 2,
    },
    modalCloseButton: {
      padding: 4,
    },
    modalImage: {
      width: '100%',
      height: 200,
      borderRadius: 8,
      marginBottom: 16,
    },
    modalInfo: {
      marginBottom: 16,
    },
    modalBicycleName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    modalBicycleModel: {
      fontSize: 14,
      color: colors.secondary,
      marginBottom: 8,
    },
    modalBicycleDescription: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      marginBottom: 12,
    },
    modalSpecifications: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      marginBottom: 16,
    },
    modalSelectButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 4,
    },
    modalSelectButtonText: {
      color: colors.background,
      fontSize: 15,
      fontWeight: '600',
    },
    confirmationModalContent: {
      backgroundColor: colors.background,
      borderRadius: 16,
      padding: 24,
      margin: 20,
      maxWidth: '90%',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    confirmationModalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 20,
    },
    confirmationModalSubtitle: {
      fontSize: 16,
      color: colors.text,
      textAlign: 'center',
      marginBottom: 24,
    },
    confirmationDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    confirmationDetailLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    confirmationDetailLabel: {
      fontSize: 14,
      color: colors.text,
      marginLeft: 8,
    },
    confirmationDetailValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'right',
      flex: 1,
    },
    confirmationTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 12,
    },
    confirmationTotalLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    confirmationTotalValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary,
    },
    confirmationModalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 24,
      gap: 12,
    },
    confirmationModalCancelButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
    },
    confirmationModalCancelText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    confirmationModalConfirmButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: colors.primary,
    },
    confirmationModalConfirmText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '600',
    },
    totalBarEnhanced: {
      backgroundColor: colors.cardBackground,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderTopWidth: 2,
      borderTopColor: colors.primary,
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 160 : 146, // Position well above navigation with large gap
      left: 0,
      right: 0,
      zIndex: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    totalBarText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    navigationContainer: {
      flexDirection: 'row',
      padding: 16,
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 12,
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 90 : 76, // Position at bottom
      left: 0,
      right: 0,
      zIndex: 998,
    },
    navButton: {
      flex: 1,
    },
    rentalCostCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rentalCostRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    rentalCostIcon: {
      marginRight: 6,
    },
    rentalCostLabel: {
      fontSize: 13,
      color: colors.secondary,
      flex: 1,
    },
    rentalCostValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
    },
    rentalCostTotalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 6,
    },
    rentalCostTotalLabel: {
      fontSize: 14,
      color: colors.text,
      fontWeight: 'bold',
    },
    rentalCostTotalValue: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: 'bold',
    },
    bicyclesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      gap: gridLayout.gap,
      paddingBottom: 4,
    },
    bicycleCardCompact: {
      width: gridLayout.itemWidth,
      backgroundColor: colors.cardBackground,
      borderRadius: SPACING.sm + 2, // 10px
      borderWidth: 2,
      borderColor: colors.border,
      padding: SPACING.sm + 4, // 12px
      minHeight: 140,
      marginBottom: gridLayout.gap,
    },
    bicycleCardContentCompact: {
      position: 'relative',
      flex: 1,
    },
    bicyclePhotoCompact: {
      width: '100%',
      height: 80,
      borderRadius: 8,
      marginBottom: 8,
    },
    photoPlaceholderCompact: {
      width: '100%',
      height: 80,
      borderRadius: 8,
      backgroundColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    bicycleInfoCompact: {
      flex: 1,
    },
    bicycleNameCompact: {
      fontSize: TYPOGRAPHY.xs,
      fontWeight: TYPOGRAPHY.fontWeightBold,
      color: colors.text,
      flex: 1,
      marginRight: 6,
    },
    bicycleModelCompact: {
      fontSize: 11,
      color: colors.secondary,
      marginBottom: 3,
    },
    bicycleDescriptionCompact: {
      fontSize: 11,
      color: colors.secondary,
      lineHeight: 14,
      flex: 1,
    },
    bicycleRatesCompact: {
      marginTop: 6,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    rateTextCompact: {
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.primary,
    },
    selectedIndicatorCompact: {
      position: 'absolute',
      top: -8,
      right: -8,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      paddingHorizontal: 4,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    loadingText: {
      fontSize: 14,
      marginTop: 12,
      textAlign: 'center',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyStateText: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: 12,
      textAlign: 'center',
    },
    emptyStateSubtext: {
      fontSize: 14,
      marginTop: 4,
      textAlign: 'center',
    },
    formContainer: {
      flex: 1,
    },
    sectionContainer: {
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    inputGroup: {
      marginBottom: 12,
    },
    readOnlyInput: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      padding: 10,
    },
    inputIcon: {
      marginRight: 8,
    },
    readOnlyText: {
      fontSize: 14,
      color: colors.text,
      marginLeft: 6,
    },
    textInput: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
    },
    textAreaContainer: {
      marginBottom: 16,
    },
    textAreaInput: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    textAreaIcon: {
      marginRight: 8,
    },
    paymentOptionsContainer: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    paymentNotice: {
      fontSize: 12,
      color: colors.secondary,
      marginTop: 8,
      textAlign: 'center',
    },
    finalTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 8,
    },
    finalTotalText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    finalTotalAmount: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary,
    },
    modalPhotosContainer: {
      position: 'relative',
      width: width - 80,
      height: 180,
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 16,
      alignSelf: 'center',
    },
    photoCounter: {
      position: 'absolute',
      top: 12,
      right: 12,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
      zIndex: 1,
    },
    photoCounterText: {
      fontSize: 13,
      fontWeight: 'bold',
    },
    modalPhotoContainer: {
      width: width - 80,
      height: 180,
      borderRadius: 10,
      overflow: 'hidden',
    },
    modalPhoto: {
      width: '100%',
      height: '100%',
    },
    modalPhotoPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
      height: 200,
    },
    modalPhotoPlaceholderText: {
      marginTop: 12,
      fontSize: 15,
      fontWeight: '500',
    },
    modalBicycleInfo: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    modalBicycleRates: {
      marginTop: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    modalRateText: {
      fontSize: 14,
      fontWeight: 'bold',
    },
    modalDeliveryText: {
      fontSize: 14,
      fontWeight: 'bold',
    },
    modalSpecificationsContainer: {
      marginTop: 12,
    },
    modalSpecificationsTitle: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
    },
    modalSpecificationItem: {
      fontSize: 13,
      marginBottom: 4,
    },
    modalFooter: {
      padding: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    closeButton: {
      padding: 8,
      marginLeft: 'auto',
      marginRight: 16,
    },
    modalBody: {
      flex: 1,
      padding: 16,
    },
    photoIndicators: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 12,
      gap: 6,
    },
    photoIndicator: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    durationTypeSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    durationTypeText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    durationTypeTextSelected: {
      fontSize: 14,
      color: colors.background,
      fontWeight: '500',
    },
    bicycleModelText: {
      fontSize: 12,
      color: colors.secondary,
      fontStyle: 'italic',
    },
    contactInfo: {
      gap: 8,
    },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    applyCouponText: {
      color: colors.background,
      fontWeight: 'bold',
      fontSize: 12,
    },
    couponError: {
      color: colors.error,
      marginTop: 2,
      fontSize: 12,
    },
    totalBreakdown: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
    },
    contentContainer: {
      flex: 1,
      position: 'relative',
    },
    totalBarSticky: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderTopWidth: 2,
      position: 'absolute',
      bottom: 67, // Position directly above navigation buttons (connected)
      left: 0,
      right: 0,
      zIndex: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navigationContainerSticky: {
      flexDirection: 'row',
      padding: 10,
      borderTopWidth: 1,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 998,
      gap: 12,
    },
    confirmationModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    confirmationModalHeader: {
      alignItems: 'center',
      padding: 20,
      paddingBottom: 16,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    confirmationIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 4,
    },
    confirmationModalBody: {
      padding: 20,
      paddingBottom: 16,
    },
    confirmationModalDetails: {
      gap: 8,
    },
    confirmationDetailCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    confirmationTotalCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    confirmationModalFooter: {
      flexDirection: 'row',
      padding: 16,
      paddingTop: 0,
      gap: 10,
    },
    modalHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    modalBicycleIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalHeaderText: {
      flex: 1,
    },
    modalSubtitle: {
      fontSize: 13,
      color: colors.gray,
      fontWeight: '500',
    },
    modalInfoCard: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    modalInfoCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 6,
    },
    modalInfoCardTitle: {
      fontSize: 15,
      fontWeight: '600',
    },
    modalInfoCardContent: {
      gap: 6,
    },
    modalInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      minHeight: 20,
    },
    modalInfoLabel: {
      fontSize: 14,
      fontWeight: '500',
      flex: 1,
      marginRight: 10,
    },
    modalInfoValue: {
      fontSize: 14,
      fontWeight: '600',
      flex: 1,
      textAlign: 'right',
    },
    modalPricingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
      gap: 12,
    },
    modalPricingItem: {
      flex: 1,
      alignItems: 'center',
    },
    modalPricingLabel: {
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
      marginBottom: 3,
    },
    modalPricingValue: {
      fontSize: 15,
      fontWeight: '600',
      textAlign: 'center',
    },
    modalDeliveryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 0,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    modalDeliveryLabel: {
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 6,
    },
    modalDeliveryValue: {
      fontSize: 15,
      fontWeight: '600',
    },
    modalSpecRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 6,
      minHeight: 20,
    },
    modalSpecLabel: {
      fontSize: 14,
      fontWeight: '500',
      flex: 1,
      marginRight: 10,
    },
    modalSpecValue: {
      fontSize: 14,
      fontWeight: '600',
      flex: 1,
      textAlign: 'right',
    },
    modalSelectButtonIcon: {
      marginRight: 8,
    },
    modalQuickInfoCard: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    modalQuickInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalQuickInfoItem: {
      flex: 1,
      alignItems: 'center',
    },
    modalQuickInfoLabel: {
      fontSize: 12,
      fontWeight: '500',
      marginTop: 4,
      marginBottom: 2,
    },
    modalQuickInfoValue: {
      fontSize: 14,
      fontWeight: '600',
    },
    modalQuickInfoDivider: {
      width: 1,
      height: 40,
      backgroundColor: colors.border,
      marginHorizontal: 8,
    },
    summaryDisplayText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      paddingVertical: 2,
    },
    bicycleDisplayContainer: {
      flex: 1,
    },
    totalBreakdownContainer: {
      flex: 1,
    },
  });

  // Removed unused handleBackPress function
  const [step, setStep] = useState<'bicycles' | 'details' | 'summary'>('bicycles');
  const [loading, setLoading] = useState(false);
  const [loadingBicycles, setLoadingBicycles] = useState(false);
  const [loadingCoupon, setLoadingCoupon] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [bicycles, setBicycles] = useState<Bicycle[]>([]);
  
  // Form data
  const [selectedBicycle, setSelectedBicycle] = useState<Bicycle | null>(null);
  const [formData, setFormData] = useState({
    alternate_number: '',
    email: '',
    delivery_address: '',
    special_instructions: '',
    duration_type: 'daily' as 'daily' | 'weekly',
    duration: 1
  });

  const [coupon, setCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'offline'>('offline');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Animation states

  const [showBicycleModal, setShowBicycleModal] = useState(false);
  const [selectedBicycleForModal, setSelectedBicycleForModal] = useState<Bicycle | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  // Confirmation modal state
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBicycles, setFilteredBicycles] = useState<Bicycle[]>([]);

  useEffect(() => {
    fetchUserProfile();
    fetchBicycles();
  }, []);

  // Filter bicycles based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBicycles(bicycles);
    } else {
      const filtered = bicycles.filter(bicycle =>
        bicycle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bicycle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bicycle.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBicycles(filtered);
    }
  }, [searchQuery, bicycles]);

  const getCurrentStepIndex = () => {
    return STEPS.findIndex(s => s.id === step);
  };

  const fetchUserProfile = async () => {
    try {
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
        setFormData(prev => ({
          ...prev,
          email: data.data.user.email,
          delivery_address: data.data.user.address || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchBicycles = async () => {
    try {
      setLoadingBicycles(true);
      const response = await fetch(`${API_BASE_URL}/api/rental/bicycles`);
      if (response.ok) {
        const data = await response.json();
        setBicycles(data.data || []);
      } else {
        Alert.alert('Error', 'Failed to load bicycles. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching bicycles:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setLoadingBicycles(false);
    }
  };

  const calculateTotal = () => {
    if (!selectedBicycle) return 0;
    const baseRate = formData.duration_type === 'daily' 
      ? selectedBicycle.daily_rate 
      : selectedBicycle.weekly_rate;
    const total = (baseRate * formData.duration) + selectedBicycle.delivery_charge;
    return total;
  };

  const applyCoupon = async () => {
    setCouponError('');
    setDiscount(0);
    setAppliedCoupon(null);
    if (!coupon.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }
    try {
      setLoadingCoupon(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setCouponError('Please login first');
        return;
      }
      
      // Prepare items array for rental - match backend expectations
      const items = ['rental_services', 'delivery_charge'];
      const totalAmount = calculateTotal();
      
      const response = await fetch(`${API_BASE_URL}/api/coupon/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: coupon, 
          requestType: 'rental',
          items: items,
          totalAmount: totalAmount
        })
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setAppliedCoupon(data.data);
        setDiscount(data.data.discount || 0);
        setCouponError('');
      } else {
        setCouponError(data.message || 'Invalid coupon');
      }
    } catch (error) {
      console.error('Coupon apply error:', error);
      setCouponError('Network error. Please try again.');
    } finally {
      setLoadingCoupon(false);
    }
  };

  const calculateTotalWithDiscount = () => {
    const total = calculateTotal();
    if (appliedCoupon) {
      if (appliedCoupon.discountType === 'percentage') {
        const discount = (total * appliedCoupon.discountValue) / 100;
        return Math.max(total - discount, 0);
      } else {
        return Math.max(total - appliedCoupon.discountValue, 0);
      }
    }
    return total;
  };

  const handleDurationChange = (type: 'daily' | 'weekly') => {
    setFormData(prev => ({
      ...prev,
      duration_type: type,
      duration: 1 // Reset to 1 when changing type
    }));
  };

  const handleDurationCountChange = (count: number) => {
    setFormData(prev => ({
      ...prev,
      duration: count
    }));
  };

  const handleSubmit = async () => {
    // Clear previous errors
    setErrors({});
    
    if (!selectedBicycle) {
      setErrors({ bicycle: 'Please select a bicycle to continue.' });
      return;
    }
    if (!formData.delivery_address.trim()) {
      setErrors({ delivery_address: 'Please enter delivery address to continue.' });
      return;
    }
    if (!formData.email.trim()) {
      setErrors({ email: 'Please enter your email address to continue.' });
      return;
    }
    
    // Show confirmation modal instead of submitting directly
    setShowConfirmationModal(true);
  };

  const confirmSubmit = async () => {
    setShowConfirmationModal(false);
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Authentication Error', 'Please log in again to continue.');
        setLoading(false);
        return;
      }
      
      // Use JSON instead of FormData to avoid validation issues
      const requestData: {
        bicycleId: number;
        contactNumber: string;
        alternateNumber: string;
        email: string;
        deliveryAddress: string;
        specialInstructions: string;
        durationType: 'daily' | 'weekly';
        durationCount: number;
        paymentMethod: 'online' | 'offline';
        totalAmount: number;
        couponCode?: string;
      } = {
        bicycleId: selectedBicycle!.id,
        contactNumber: user?.phone || '',
        alternateNumber: formData.alternate_number || '',
        email: formData.email || '',
        deliveryAddress: formData.delivery_address,
        specialInstructions: formData.special_instructions || '',
        durationType: formData.duration_type,
        durationCount: formData.duration,
        paymentMethod: paymentMethod,
        totalAmount: calculateTotalWithDiscount()
      };
      
      // Add coupon if applied
      if (appliedCoupon) {
        requestData.couponCode = appliedCoupon.code;
      }
      
      console.log('Submitting rental request with data:', requestData);
      
      const response = await fetch(`${API_BASE_URL}/api/rental/requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok && data.success) {
        console.log('Rental request submitted successfully');
        
        // Reset loading state first
        setLoading(false);
        
        // Show success message
        Alert.alert(
          'Success!',
          'Your rental request has been submitted successfully. You will receive a confirmation shortly.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to My Requests with rental tab active
                if (onNavigate) {
                  console.log('🚲 Rental: Calling onNavigate with my-requests:rental');
                  onNavigate('my-requests:rental');
                } else {
                  console.log('🚲 Rental: Using router.replace with tab=rental');
                  router.replace('/my-requests');
                }
              }
            }
          ]
        );
        
      } else {
        console.error('Backend error:', data);
        const errorMessage = data.message || data.errors?.map((e: any) => e.msg).join(', ') || 'Failed to submit rental request';
        Alert.alert('Error', errorMessage);
        setLoading(false);
      }
    } catch (error) {
      console.error('Network error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
      setLoading(false);
    }
  };

  const handleStepChange = (newStep: 'bicycles' | 'details' | 'summary') => {
      setStep(newStep);
  };

  const nextStep = () => {
    // Clear previous errors
    setErrors({});
    
    if (step === 'bicycles') {
      if (!selectedBicycle) {
        setErrors({ bicycle: 'Please select a bicycle to continue.' });
        return;
      }
      handleStepChange('details');
    } else if (step === 'details') {
      const newErrors: {[key: string]: string} = {};
      
      if (!formData.delivery_address.trim()) {
        newErrors.delivery_address = 'Please enter delivery address to continue.';
      }
      if (!formData.email.trim()) {
        newErrors.email = 'Please enter your email address to continue.';
      }
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      
      handleStepChange('summary');
    } else if (step === 'summary') {
      // Call handleSubmit when on summary step
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (step === 'details') {
      handleStepChange('bicycles');
    } else if (step === 'summary') {
      handleStepChange('details');
    }
  };

  const openBicycleModal = (bicycle: Bicycle) => {
    setSelectedBicycleForModal(bicycle);
    setCurrentPhotoIndex(0);
    setShowBicycleModal(true);
  };

  const closeBicycleModal = () => {
    setShowBicycleModal(false);
    setSelectedBicycleForModal(null);
  };

  const selectBicycleFromModal = () => {
    if (selectedBicycleForModal) {
      setSelectedBicycle(selectedBicycleForModal);
      closeBicycleModal();
    }
  };

  const renderBicyclesStep = () => (
    <View style={styles.stepContainer}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { marginTop: 8 }]}>
                    <View style={[styles.searchInputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.gray} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search bicycles by name, model, or description..."
            placeholderTextColor={colors.gray}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={18} color={colors.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
        <View style={styles.bicyclesGrid}>
        {loadingBicycles ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.secondary }]}>
              Loading bicycles...
            </Text>
          </View>
        ) : filteredBicycles.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bicycle-outline" size={48} color={colors.gray} />
            <Text style={[styles.emptyStateText, { color: colors.secondary }]}>
              No bicycles available at the moment
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.gray }]}>
              Please check back later or contact support
            </Text>
          </View>
        ) : (
          filteredBicycles.map((bicycle) => {
            const isSelected = selectedBicycle?.id === bicycle.id;
            return (
              <TouchableOpacity
                key={bicycle.id}
              style={[
                styles.bicycleCardCompact, 
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
                isSelected && { borderColor: colors.primary, backgroundColor: colors.background }
              ]}
                onPress={() => openBicycleModal(bicycle)}
              >
                <View style={styles.bicycleCardContentCompact}>
                  {/* Bicycle Photo */}
                  {bicycle.photos && bicycle.photos.length > 0 ? (
                    <CachedImage
                      source={bicycle.photos[0].photo_url.startsWith('http') 
                        ? bicycle.photos[0].photo_url 
                        : `${API_BASE_URL}/${bicycle.photos[0].photo_url}`
                      }
                      style={styles.bicyclePhotoCompact}
                      resizeMode="cover"
                    placeholder={<DefaultPlaceholder size={60} icon="bicycle" text="" />}
                    fallback={<DefaultFallback size={60} icon="bicycle-outline" text="" />}
                      priority="normal"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                  <View style={[styles.photoPlaceholderCompact, { backgroundColor: colors.border }]}>
                  <Ionicons name="bicycle" size={20} color={colors.gray} />
                    </View>
                  )}
                  
                  <View style={styles.bicycleInfoCompact}>
                  <Text style={[styles.bicycleNameCompact, { color: colors.text }]} numberOfLines={1}>
                      {bicycle.name}
                    </Text>
                  <Text style={[styles.bicycleModelCompact, { color: colors.gray }]} numberOfLines={1}>
                      {bicycle.model}
                    </Text>
                  <Text style={[styles.bicycleDescriptionCompact, { color: colors.gray }]} numberOfLines={2}>
                      {bicycle.description}
                    </Text>
                    <View style={styles.bicycleRatesCompact}>
                    <Text style={[styles.rateTextCompact, { color: colors.primary }]}>₹{bicycle.daily_rate}/day</Text>
                    <Text style={[styles.rateTextCompact, { color: colors.primary }]}>₹{bicycle.weekly_rate}/week</Text>
                    </View>
                  </View>
                  
                  {isSelected && (
                    <View style={styles.selectedIndicatorCompact}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
        </View>

      {errors.bicycle && (
        <View style={[styles.errorContainer, { backgroundColor: `rgba(220, 53, 69, 0.1)`, borderLeftColor: colors.error }]}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{errors.bicycle}</Text>
        </View>
      )}


    </View>
  );

  const renderDetailsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Contact & Details</Text>
      <Text style={[styles.stepSubtitle, { color: colors.gray }]}>Provide additional information for your rental request</Text>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        {/* Contact Information Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Primary Contact Number</Text>
            <View style={[styles.readOnlyInput, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Ionicons name="call" size={18} color={colors.primary} style={styles.inputIcon} />
              <Text style={[styles.readOnlyText, { color: colors.text }]}>{user?.phone}</Text>
            </View>
          </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Alternate Number (Optional)</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Ionicons name="call-outline" size={18} color={colors.gray} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                value={formData.alternate_number}
                onChangeText={(text) => setFormData({...formData, alternate_number: text})}
                placeholder="Enter alternate number"
                placeholderTextColor={colors.gray}
                keyboardType="phone-pad"
              />
            </View>
          </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Email Address *</Text>
            <View style={[
              styles.inputContainer, 
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
              errors.email && { borderColor: colors.error }
            ]}>
              <Ionicons name="mail" size={18} color={colors.gray} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                value={formData.email}
                onChangeText={(text) => {
                  setFormData({...formData, email: text});
                  if (errors.email) setErrors(prev => ({...prev, email: ''}));
                }}
                placeholder="Enter email address"
                placeholderTextColor={colors.gray}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
              {errors.email && (
                <View style={[styles.errorContainer, { backgroundColor: `rgba(220, 53, 69, 0.1)`, borderLeftColor: colors.error }]}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{errors.email}</Text>
                </View>
              )}
          </View>
        </View>

        {/* Rental Details Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Rental Details</Text>
          
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Duration Type</Text>
              <View style={styles.durationTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.durationTypeButton,
                    formData.duration_type === 'daily' && styles.durationTypeSelected
                  ]}
                  onPress={() => handleDurationChange('daily')}
                >
                  <Text style={[
                    styles.durationTypeText,
                    formData.duration_type === 'daily' && styles.durationTypeTextSelected
                  ]}>Daily</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.durationTypeButton,
                    formData.duration_type === 'weekly' && styles.durationTypeSelected
                  ]}
                  onPress={() => handleDurationChange('weekly')}
                >
                  <Text style={[
                    styles.durationTypeText,
                    formData.duration_type === 'weekly' && styles.durationTypeTextSelected
                  ]}>Weekly</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Duration Count</Text>
              <View style={styles.durationCountContainer}>
                <TouchableOpacity
                  style={styles.durationCountButton}
                  onPress={() => handleDurationCountChange(Math.max(1, formData.duration - 1))}
                >
                <Ionicons name="remove" size={20} color={colors.background} />
                </TouchableOpacity>
                <Text style={styles.durationCountText}>{formData.duration}</Text>
                <TouchableOpacity
                  style={styles.durationCountButton}
                  onPress={() => handleDurationCountChange(formData.duration + 1)}
                >
                <Ionicons name="add" size={20} color={colors.background} />
                </TouchableOpacity>
          </View>
        </View>

          {/* Total Amount Display */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Rental Cost</Text>
            <View style={[styles.rentalCostCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={styles.rentalCostRow}>
                <Ionicons name="pricetag" size={16} color={colors.primary} style={styles.rentalCostIcon} />
                <Text style={[styles.rentalCostLabel, { color: colors.gray }]}>Rate per {formData.duration_type === 'daily' ? 'day' : 'week'}:</Text>
                <Text style={[styles.rentalCostValue, { color: colors.text }]}>
                  ₹{formData.duration_type === 'daily' ? (selectedBicycle?.daily_rate || 0) : (selectedBicycle?.weekly_rate || 0)}
              </Text>
            </View>
              <View style={styles.rentalCostRow}>
                <Ionicons name="calendar" size={16} color={colors.primary} style={styles.rentalCostIcon} />
                <Text style={[styles.rentalCostLabel, { color: colors.gray }]}>Duration:</Text>
                <Text style={[styles.rentalCostValue, { color: colors.text }]}>
                  {formData.duration} {formData.duration_type === 'daily' ? 'Day(s)' : 'Week(s)'}
              </Text>
            </View>
              <View style={styles.rentalCostRow}>
                <Ionicons name="car" size={16} color={colors.primary} style={styles.rentalCostIcon} />
                <Text style={[styles.rentalCostLabel, { color: colors.gray }]}>Delivery Charge:</Text>
                <Text style={[styles.rentalCostValue, { color: colors.text }]}>₹{selectedBicycle?.delivery_charge || 0}</Text>
            </View>
              <View style={[styles.rentalCostTotalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.rentalCostTotalLabel, { color: colors.text }]}>Total Amount:</Text>
                <Text style={[styles.rentalCostTotalValue, { color: colors.primary }]}>₹{calculateTotal()}</Text>
            </View>
          </View>
        </View>
            </View>

        {/* Delivery Information Section */}
        <View style={styles.sectionContainer}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Delivery Address *</Text>
            <View style={[
              styles.inputContainer, 
              styles.textAreaContainer, 
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
              errors.delivery_address && { borderColor: colors.error }
            ]}>
              <Ionicons name="location" size={18} color={colors.gray} style={[styles.inputIcon, styles.textAreaIcon]} />
              <TextInput
                style={[styles.textInput, styles.textAreaInput, { color: colors.text }]}
                value={formData.delivery_address}
                onChangeText={(text) => {
                  setFormData({...formData, delivery_address: text});
                  if (errors.delivery_address) setErrors(prev => ({...prev, delivery_address: ''}));
                }}
                placeholder="Enter your complete delivery address"
                placeholderTextColor={colors.gray}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
              {errors.delivery_address && (
                <View style={[styles.errorContainer, { backgroundColor: `rgba(220, 53, 69, 0.1)`, borderLeftColor: colors.error }]}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{errors.delivery_address}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Special Instructions (Optional)</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Ionicons name="document-text" size={18} color={colors.gray} style={[styles.inputIcon, styles.textAreaIcon]} />
              <TextInput
                style={[styles.textInput, styles.textAreaInput, { color: colors.text }]}
                value={formData.special_instructions}
                onChangeText={(text) => setFormData({...formData, special_instructions: text})}
                placeholder="Any special instructions for delivery"
                placeholderTextColor={colors.gray}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const renderSummaryStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Review & Submit</Text>
      <Text style={[styles.stepSubtitle, { color: colors.gray }]}>Please review your rental request details before submitting</Text>
      
      <ScrollView style={styles.summaryContainer} showsVerticalScrollIndicator={false}>
        {/* Selected Bicycle */}
        <View style={styles.sectionContainer}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Selected Bicycle</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Ionicons name="bicycle" size={18} color={colors.primary} style={styles.inputIcon} />
              <View style={styles.bicycleDisplayContainer}>
                <Text style={[styles.summaryDisplayText, { color: colors.text }]}>{selectedBicycle?.name}</Text>
                <Text style={[styles.bicycleModelText, { color: colors.gray }]}>{selectedBicycle?.model}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.sectionContainer}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Primary Contact Number</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Ionicons name="call" size={18} color={colors.primary} style={styles.inputIcon} />
              <Text style={[styles.summaryDisplayText, { color: colors.text }]}>{user?.phone}</Text>
            </View>
          </View>

          {formData.alternate_number && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Alternate Contact Number</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Ionicons name="call-outline" size={18} color={colors.gray} style={styles.inputIcon} />
                <Text style={[styles.summaryDisplayText, { color: colors.text }]}>{formData.alternate_number}</Text>
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Email Address</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Ionicons name="mail" size={18} color={colors.gray} style={styles.inputIcon} />
              <Text style={[styles.summaryDisplayText, { color: colors.text }]}>{formData.email}</Text>
            </View>
          </View>
        </View>

        {/* Delivery Information */}
        <View style={styles.sectionContainer}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Delivery Address</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Ionicons name="location" size={18} color={colors.gray} style={[styles.inputIcon, styles.textAreaIcon]} />
              <Text style={[styles.summaryDisplayText, styles.textAreaText, { color: colors.text }]}>{formData.delivery_address}</Text>
            </View>
          </View>

          {formData.special_instructions && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Special Instructions</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Ionicons name="document-text" size={18} color={colors.gray} style={[styles.inputIcon, styles.textAreaIcon]} />
                <Text style={[styles.summaryDisplayText, styles.textAreaText, { color: colors.text }]}>{formData.special_instructions}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Rental Details */}
        <View style={styles.sectionContainer}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Rental Duration</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} style={styles.inputIcon} />
              <Text style={[styles.summaryDisplayText, { color: colors.text }]}>
                {formData.duration} {formData.duration_type === 'daily' ? 'Day(s)' : 'Week(s)'}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Rental Rate</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Ionicons name="pricetag" size={18} color={colors.primary} style={styles.inputIcon} />
              <Text style={[styles.summaryDisplayText, { color: colors.text }]}>
                ₹{formData.duration_type === 'daily' ? (selectedBicycle?.daily_rate || 0) : (selectedBicycle?.weekly_rate || 0)} per {formData.duration_type === 'daily' ? 'day' : 'week'}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Delivery Charge</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Ionicons name="car" size={18} color={colors.primary} style={styles.inputIcon} />
              <Text style={[styles.summaryDisplayText, { color: colors.text }]}>₹{selectedBicycle?.delivery_charge || 0}</Text>
            </View>
          </View>
        </View>

        {/* Coupon Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Discount Coupon</Text>
            <View style={styles.couponInputContainer}>
              <TextInput
                style={[styles.couponInput, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                value={coupon}
                onChangeText={setCoupon}
                placeholder="Enter coupon code"
                autoCapitalize="characters"
                placeholderTextColor={colors.secondary}
              />
              <TouchableOpacity 
                style={[styles.applyCouponButton, loadingCoupon && { opacity: 0.6 }]} 
                onPress={applyCoupon}
                disabled={loadingCoupon}
              >
                {loadingCoupon ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.applyCouponText}>Apply</Text>
                )}
              </TouchableOpacity>
            </View>
            {couponError ? <Text style={[styles.couponError, { color: colors.error }]}>{couponError}</Text> : null}
            {appliedCoupon && (
              <View style={styles.couponSuccessContainer}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.couponSuccess, { color: colors.success }]}>
                  Coupon &quot;{appliedCoupon.code}&quot; applied! Discount: ₹{discount}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.sectionContainer}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Payment Method</Text>
            <View style={styles.paymentOptionsContainer}>
              <TouchableOpacity
                style={[styles.paymentOption, styles.paymentOptionDisabled]}
                disabled={true}
              >
                <Ionicons name="radio-button-off" size={20} color={colors.secondary} />
                <Text style={[styles.paymentOptionTextDisabled, { color: colors.gray }]}>Online (Coming Soon)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentOption, paymentMethod === 'offline' && styles.paymentOptionSelected]}
                onPress={() => setPaymentMethod('offline')}
              >
                <Ionicons name={paymentMethod === 'offline' ? 'radio-button-on' : 'radio-button-off'} size={20} color={colors.primary} />
                <Text style={[styles.paymentOptionText, { color: colors.text }]}>Offline (Cash)</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.paymentNotice, { color: colors.gray }]}>
              Online payment will be available soon. For now, please use offline payment.
            </Text>
          </View>
        </View>

        {/* Total Amount */}
        <View style={styles.sectionContainer}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Payment Summary</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Ionicons name="calculator" size={18} color={colors.primary} style={styles.inputIcon} />
              <View style={styles.totalBreakdownContainer}>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalItem, { color: colors.text }]}>Rental Cost</Text>
                  <Text style={[styles.totalValue, { color: colors.text }]}>₹{formData.duration_type === 'daily' ? (selectedBicycle?.daily_rate || 0) * formData.duration : (selectedBicycle?.weekly_rate || 0) * formData.duration}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalItem, { color: colors.text }]}>Delivery Charge</Text>
                  <Text style={[styles.totalValue, { color: colors.text }]}>₹{selectedBicycle?.delivery_charge || 0}</Text>
                </View>
                {discount > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalItem, { color: colors.text }]}>Discount</Text>
                    <Text style={[styles.totalValue, { color: colors.success }]}>-₹{discount}</Text>
                  </View>
                )}
                <View style={[styles.finalTotalRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.finalTotalText, { color: colors.text }]}>Total</Text>
                  <Text style={[styles.finalTotalAmount, { color: colors.primary }]}>₹{calculateTotalWithDiscount()}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Step Indicator */}
        <StepIndicator
          steps={STEPS}
          currentStep={getCurrentStepIndex()}
          showStepNumbers={false}
        />

      {/* Content Area */}
        <View style={styles.contentContainer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80 }}
          >
          {step === 'bicycles' && renderBicyclesStep()}
          {step === 'details' && renderDetailsStep()}
          {step === 'summary' && renderSummaryStep()}
          </ScrollView>
        </View>

      {/* Sticky Total Bar - Above SPA Navbar */}
      <View style={[styles.totalBarSticky, { backgroundColor: colors.background, borderTopColor: colors.primary }]}>
        <Text style={[styles.totalBarText, { color: colors.text }]}>
          Total:₹{calculateTotalWithDiscount()}
        </Text>
      </View>

      {/* Sticky Navigation Buttons - Above SPA Navbar */}
      <View style={[styles.navigationContainerSticky, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          {step !== 'bicycles' && (
            <Button
              title="Back"
              onPress={prevStep}
              variant="outline"
              icon="arrow-back"
              size="sm"
              style={styles.navButton}
            />
          )}
          <Button
            title={step === 'summary' ? 'Submit' : 'Next'}
            onPress={nextStep}
            variant="primary"
            icon={step === 'summary' ? 'checkmark' : 'arrow-forward'}
            size="sm"
            style={styles.navButton}
          />
        </View>

        {/* Bicycle Detail Modal */}
        <Modal
          visible={showBicycleModal}
          transparent={true}
          animationType="slide"
          onRequestClose={closeBicycleModal}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
              {selectedBicycleForModal && (
                <>
                  {/* Enhanced Header */}
                  <View style={styles.modalHeader}>
                    <View style={styles.modalHeaderLeft}>
                      <View style={[styles.modalBicycleIcon, { backgroundColor: colors.primary }]}>
                        <Ionicons name="bicycle" size={18} color={colors.background} />
                      </View>
                      <View style={styles.modalHeaderText}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Bicycle Details</Text>
                        <Text style={[styles.modalSubtitle, { color: colors.gray }]}>{selectedBicycleForModal.name}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={closeBicycleModal} style={styles.closeButton}>
                      <Ionicons name="close" size={22} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                    {/* Enhanced Photos Section */}
                    {selectedBicycleForModal.photos && selectedBicycleForModal.photos.length > 0 ? (
                      <View style={styles.modalPhotosContainer}>
                        {/* Photo Counter */}
                        {selectedBicycleForModal.photos.length > 1 && (
                          <View style={[styles.photoCounter, { backgroundColor: colors.background }]}>
                            <Text style={[styles.photoCounterText, { color: colors.text }]}>
                              {currentPhotoIndex + 1} / {selectedBicycleForModal.photos.length}
                            </Text>
                          </View>
                        )}
                        
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          pagingEnabled={true}
                          snapToInterval={width - 80}
                          decelerationRate="fast"
                          onMomentumScrollEnd={(event) => {
                            const index = Math.round(event.nativeEvent.contentOffset.x / (width - 80));
                            setCurrentPhotoIndex(index);
                          }}
                        >
                          {selectedBicycleForModal.photos.map((photo, index) => (
                            <View key={index} style={styles.modalPhotoContainer}>
                              <CachedImage
                                source={photo.photo_url.startsWith('http') 
                                  ? photo.photo_url 
                                  : `${API_BASE_URL}/${photo.photo_url}`
                                }
                                style={styles.modalPhoto}
                                resizeMode="cover"
                                placeholder={<DefaultPlaceholder size={100} icon="bicycle" text="" />}
                                fallback={<DefaultFallback size={100} icon="bicycle-outline" text="" />}
                                priority="high"
                                cachePolicy="memory-disk"
                              />
                            </View>
                          ))}
                        </ScrollView>
                        
                        {/* Photo Indicators */}
                        {selectedBicycleForModal.photos.length > 1 && (
                          <View style={styles.photoIndicators}>
                            {selectedBicycleForModal.photos.map((_, index) => (
                              <View 
                                key={index} 
                                style={[
                                  styles.photoIndicator,
                                  { backgroundColor: colors.border },
                                  index === currentPhotoIndex && { backgroundColor: colors.primary }
                                ]} 
                              />
                            ))}
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={styles.modalPhotoPlaceholder}>
                        <Ionicons name="bicycle" size={50} color={colors.gray} />
                        <Text style={[styles.modalPhotoPlaceholderText, { color: colors.gray }]}>No photos available</Text>
                      </View>
                    )}
                    
                    {/* Redesigned Bicycle Information */}
                    <View style={styles.modalBicycleInfo}>
                      {/* Quick Info Section */}
                      <View style={[styles.modalQuickInfoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <View style={styles.modalQuickInfoRow}>
                          <View style={styles.modalQuickInfoItem}>
                            <Ionicons name="pricetag" size={16} color={colors.primary} />
                            <Text style={[styles.modalQuickInfoLabel, { color: colors.gray }]}>Daily</Text>
                            <Text style={[styles.modalQuickInfoValue, { color: colors.primary }]}>₹{selectedBicycleForModal.daily_rate}</Text>
                          </View>
                          <View style={styles.modalQuickInfoDivider} />
                          <View style={styles.modalQuickInfoItem}>
                            <Ionicons name="calendar" size={16} color={colors.primary} />
                            <Text style={[styles.modalQuickInfoLabel, { color: colors.gray }]}>Weekly</Text>
                            <Text style={[styles.modalQuickInfoValue, { color: colors.primary }]}>₹{selectedBicycleForModal.weekly_rate}</Text>
                          </View>
                          <View style={styles.modalQuickInfoDivider} />
                          <View style={styles.modalQuickInfoItem}>
                            <Ionicons name="car" size={16} color={colors.primary} />
                            <Text style={[styles.modalQuickInfoLabel, { color: colors.gray }]}>Delivery</Text>
                            <Text style={[styles.modalQuickInfoValue, { color: colors.primary }]}>₹{selectedBicycleForModal.delivery_charge}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Basic Info Card */}
                      <View style={[styles.modalInfoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <View style={styles.modalInfoCardHeader}>
                          <Ionicons name="information-circle" size={16} color={colors.primary} />
                          <Text style={[styles.modalInfoCardTitle, { color: colors.text }]}>Basic Information</Text>
                        </View>
                        <View style={styles.modalInfoCardContent}>
                          <View style={styles.modalInfoRow}>
                            <Text style={[styles.modalInfoLabel, { color: colors.gray }]}>Model:</Text>
                            <Text style={[styles.modalInfoValue, { color: colors.text }]}>{selectedBicycleForModal.model}</Text>
                          </View>
                          <View style={styles.modalInfoRow}>
                            <Text style={[styles.modalInfoLabel, { color: colors.gray }]}>Description:</Text>
                            <Text style={[styles.modalInfoValue, { color: colors.text }]} numberOfLines={3}>
                        {selectedBicycleForModal.description}
                      </Text>
                          </View>
                        </View>
                      </View>
                      
                      {/* Specifications Card */}
                      {selectedBicycleForModal.specifications && (
                        <View style={[styles.modalInfoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                          <View style={styles.modalInfoCardHeader}>
                            <Ionicons name="settings" size={16} color={colors.primary} />
                            <Text style={[styles.modalInfoCardTitle, { color: colors.text }]}>Specifications</Text>
                          </View>
                          <View style={styles.modalInfoCardContent}>
                          {(() => {
                            try {
                              const specs = JSON.parse(selectedBicycleForModal.specifications);
                              return Object.entries(specs).map(([key, value]) => (
                                  <View key={key} style={styles.modalSpecRow}>
                                    <Text style={[styles.modalSpecLabel, { color: colors.gray }]}>
                                      {key.charAt(0).toUpperCase() + key.slice(1)}:
                                </Text>
                                    <Text style={[styles.modalSpecValue, { color: colors.text }]}>
                                      {String(value)}
                                    </Text>
                                  </View>
                              ));
                            } catch {
                                return (
                                  <Text style={[styles.modalSpecValue, { color: colors.text }]}>
                                    {selectedBicycleForModal.specifications}
                                  </Text>
                                );
                            }
                          })()}
                          </View>
                        </View>
                      )}
                    </View>
                  </ScrollView>
                  
                  {/* Enhanced Footer */}
                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.modalSelectButton, { backgroundColor: colors.primary }]}
                      onPress={selectBicycleFromModal}
                    >
                      <Ionicons name="checkmark-circle" size={18} color={colors.background} style={styles.modalSelectButtonIcon} />
                      <Text style={[styles.modalSelectButtonText, { color: colors.background }]}>Select This Bicycle</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Confirmation Modal */}
        <Modal
          visible={showConfirmationModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowConfirmationModal(false)}
        >
          <View style={styles.confirmationModalOverlay}>
            <View style={[styles.confirmationModalContent, { backgroundColor: colors.cardBackground }]}>
              {/* Header with Icon and Title */}
              <View style={styles.confirmationModalHeader}>
                <View style={[styles.confirmationIconContainer, { backgroundColor: colors.primary }]}>
                  <Ionicons name="bicycle" size={24} color={colors.background} />
                </View>
                <Text style={[styles.confirmationModalTitle, { color: colors.text }]}>Confirm Rental</Text>
              </View>
              
              {/* Body with Details */}
              <View style={styles.confirmationModalBody}>
                <View style={styles.confirmationModalDetails}>
                  <View style={styles.confirmationDetailCard}>
                    <View style={styles.confirmationDetailRow}>
                      <View style={styles.confirmationDetailLeft}>
                        <Ionicons name="bicycle-outline" size={16} color={colors.primary} />
                        <Text style={styles.confirmationDetailLabel}>Bicycle</Text>
                      </View>
                      <Text style={styles.confirmationDetailValue}>{selectedBicycle?.name}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.confirmationDetailCard}>
                    <View style={styles.confirmationDetailRow}>
                      <View style={styles.confirmationDetailLeft}>
                        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                        <Text style={styles.confirmationDetailLabel}>Duration</Text>
                      </View>
                      <Text style={styles.confirmationDetailValue}>
                        {formData.duration} {formData.duration_type === 'daily' ? 'Day(s)' : 'Week(s)'}
                      </Text>
                    </View>
                  </View>
                  
                                  <View style={styles.confirmationDetailCard}>
                  <View style={styles.confirmationDetailRow}>
                    <View style={styles.confirmationDetailLeft}>
                      <Ionicons name="location-outline" size={16} color={colors.primary} />
                      <Text style={styles.confirmationDetailLabel}>Address</Text>
                    </View>
                    <Text style={styles.confirmationDetailValue} numberOfLines={3}>
                      {formData.delivery_address}
                    </Text>
                  </View>
                </View>
                  
                  <View style={styles.confirmationTotalCard}>
                    <View style={styles.confirmationDetailRow}>
                      <View style={styles.confirmationDetailLeft}>
                        <Ionicons name="pricetag-outline" size={16} color={colors.success} />
                        <Text style={styles.confirmationTotalLabel}>Total</Text>
                      </View>
                      <Text style={styles.confirmationTotalValue}>₹{calculateTotalWithDiscount()}</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              {/* Footer with Action Buttons */}
              <View style={styles.confirmationModalFooter}>
                <TouchableOpacity
                  style={styles.confirmationModalCancelButton}
                  onPress={() => setShowConfirmationModal(false)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close-outline" size={16} color={colors.secondary} />
                  <Text style={styles.confirmationModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmationModalConfirmButton}
                  onPress={confirmSubmit}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-outline" size={16} color={colors.background} />
                  <Text style={styles.confirmationModalConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Loading Overlay */}
        {loading && (
          <SimpleLoading message="Submitting rental request..." fullScreen={true} />
        )}
      </View>
  );
}