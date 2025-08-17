import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  Animated
} from 'react-native';
import CachedImage, { DefaultPlaceholder, DefaultFallback } from '../components/CachedImage';
import CachedVideo, { DefaultVideoPlaceholder, DefaultVideoFallback } from '../components/CachedVideo';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ResizeMode } from 'expo-av';


import StepIndicator from '@/components/StepIndicator';
import { ServiceCard, FileUpload, Button, Card, Input, Badge } from '@/components/ui';
import { Colors } from '@/constants/Colors';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/Styles';
import { API_BASE_URL } from '@/config/api';
import * as FileSystem from 'expo-file-system';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getCardGridLayout } from '@/utils/responsive';


interface RepairService {
  id: number;
  name: string;
  description: string;
  special_instructions: string;
  price: number;
}

interface TimeSlot {
  id: number;
  start_time: string;
  end_time: string;
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
  { id: 'services', title: 'Services', icon: 'construct' },
  { id: 'details', title: 'Details', icon: 'document-text' },
  { id: 'summary', title: 'Summary', icon: 'checkmark-circle' },
];

interface BookRepairScreenProps {
  onNavigate?: (route: string) => void;
}

export default function BookRepairScreen({ onNavigate }: BookRepairScreenProps) {
  const router = useRouter();
  const { colors } = useAppTheme();

  const handleBackPress = () => {
    // Use onNavigate if available, otherwise fallback to router
    if (onNavigate) {
      onNavigate('home');
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/main');
    }
  };
  const [step, setStep] = useState<'services' | 'details' | 'summary'>('services');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [repairServices, setRepairServices] = useState<RepairService[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [mechanicCharge, setMechanicCharge] = useState(0);



  // Form data
  const [selectedServices, setSelectedServices] = useState<RepairService[]>([]);
  const [formData, setFormData] = useState({
    alternate_number: '',
    email: '',
    notes: '',
    address: '',
    preferred_date: new Date(),
    time_slot_id: 0
  });

  // File uploads
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState<string | null>(null);

  // ✅ NEW: Upload progress state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

  // ✅ NEW: File validation constants
  const FILE_LIMITS = {
    MAX_IMAGES: 5,
    MAX_VIDEO_DURATION: 30, // seconds
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB
    IMAGE_QUALITY: 0.7, // 70% quality for compression
    VIDEO_QUALITY: 0.8 // 80% quality for compression
  };

  const [coupon, setCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'offline'>('offline');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimeSlotPicker, setShowTimeSlotPicker] = useState(false);
  
  // Confirmation modal state
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredServices, setFilteredServices] = useState<RepairService[]>([]);

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // ✅ UTILITY FUNCTION TO GET FILE TYPE
  const getFileTypeFromUri = (uri: string): string => {
    const extension = uri.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'mp4':
        return 'video/mp4';
      case 'avi':
        return 'video/avi';
      case 'mov':
        return 'video/quicktime';
      case 'mkv':
        return 'video/x-matroska';
      default:
        return 'image/jpeg'; // fallback
    }
  };

  // ✅ NEW: File validation function
  const validateFile = async (uri: string, fileType: 'image' | 'video'): Promise<{ isValid: boolean; error?: string; size?: number; duration?: number }> => {
    try {
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
      
      if (!fileInfo.exists) {
        return {
          isValid: false,
          error: 'File does not exist.'
        };
      }

      const fileSize = (fileInfo as any).size || 0;

      // Check file size
      const maxSize = fileType === 'image' ? FILE_LIMITS.MAX_IMAGE_SIZE : FILE_LIMITS.MAX_VIDEO_SIZE;
      if (fileSize > maxSize) {
        return {
          isValid: false,
          error: `${fileType === 'image' ? 'Image' : 'Video'} size too large. Maximum ${Math.round(maxSize / (1024 * 1024))}MB allowed.`
        };
      }

      // For videos, check duration
      if (fileType === 'video') {
        try {
          // Get video duration using expo-av (we'll implement this later)
          // For now, we'll skip duration check and add it later
          console.log('Video duration check will be implemented with expo-av');
        } catch (error) {
          console.warn('Could not check video duration:', error);
        }
      }

      return {
        isValid: true,
        size: fileSize
      };
    } catch (error) {
      console.error('Error validating file:', error);
      return {
        isValid: false,
        error: 'Could not validate file. Please try again.'
      };
    }
  };

  // ✅ NEW: Compress image function
  const compressImage = async (uri: string): Promise<string> => {
    try {
      // Use expo-image-picker's built-in compression
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: FILE_LIMITS.IMAGE_QUALITY,
        base64: false
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }
      return uri; // Return original if compression fails
    } catch (error) {
      console.error('Error compressing image:', error);
      return uri; // Return original if compression fails
    }
  };

  // ✅ NEW: Compress video function
  const compressVideo = async (uri: string): Promise<string> => {
    try {
      // For now, return original URI
      // Video compression would require additional libraries like react-native-video-processing
      // We'll implement this later with proper video compression
      console.log('Video compression will be implemented with additional libraries');
      return uri;
    } catch (error) {
      console.error('Error compressing video:', error);
      return uri;
    }
  };

  // ✅ NEW FUNCTION: Upload files using pre-signed S3 URLs with progress tracking
  const uploadFilesToS3 = async (files: { uri: string; type: string; name: string }[]): Promise<{ s3Key: string; fileType: string; originalName: string; fileSize: number }[]> => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      // Step 1: Get pre-signed upload URLs from backend
      setUploadStatus('Getting upload URLs...');
      setUploadProgress(10);
      
      const uploadUrlsResponse = await fetch(`${API_BASE_URL}/api/repair/upload-urls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: files.map(file => ({
            fileName: file.name,
            fileType: file.type
          }))
        })
      });

      if (!uploadUrlsResponse.ok) {
        throw new Error('Failed to get upload URLs');
      }

      const uploadUrlsData = await uploadUrlsResponse.json();
      const uploadUrls = uploadUrlsData.data.uploadUrls;

      // Step 2: Upload files directly to S3 using pre-signed URLs
      const uploadedFiles = [];
      const progressPerFile = 80 / files.length; // 80% for uploads, 10% for setup, 10% for completion
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadInfo = uploadUrls[i];
        
        setUploadStatus(`Uploading ${file.name}...`);
        
        // Get file blob
        const response = await fetch(file.uri);
        const blob = await response.blob();
        
        // Upload to S3
        const uploadResponse = await fetch(uploadInfo.uploadUrl, {
          method: 'PUT',
          body: blob,
          headers: {
            'Content-Type': file.type
          }
        });

        if (uploadResponse.ok) {
          uploadedFiles.push({
            s3Key: uploadInfo.s3Key,
            fileType: file.type,
            originalName: file.name,
            fileSize: blob.size
          });
          console.log(`✅ File uploaded to S3: ${file.name}`);
          
          // Update progress
          const currentProgress = 10 + (i + 1) * progressPerFile;
          setUploadProgress(currentProgress);
        } else {
          throw new Error(`Failed to upload ${file.name} to S3`);
        }
      }

      setUploadStatus('Finalizing upload...');
      setUploadProgress(100);
      
      return uploadedFiles;
    } catch (error) {
      console.error('Error uploading files to S3:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchRepairServices();
    fetchTimeSlots();
    fetchMechanicCharge();
  }, []);

  // Filter services based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredServices(repairServices);
    } else {
      const filtered = repairServices.filter(service =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredServices(filtered);
    }
  }, [searchQuery, repairServices]);

  const getCurrentStepIndex = () => {
    return STEPS.findIndex(s => s.id === step);
  };

  const handleStepChange = (newStep: 'services' | 'details' | 'summary') => {
      setStep(newStep);
  };

  const nextStep = () => {
    // Clear previous errors
    setErrors({});

    if (step === 'services') {
      console.log('Services step - selectedServices.length:', selectedServices.length);
      if (selectedServices.length === 0) {
        console.log('No services selected - showing inline error');
        setErrors({ services: 'Please select at least one repair service to continue.' });
        return;
      }
      handleStepChange('details');
    } else if (step === 'details') {
      console.log('Details step validation:');
      console.log('- time_slot_id:', formData.time_slot_id);
      console.log('- address:', formData.address);
      console.log('- email:', formData.email);

      const newErrors: { [key: string]: string } = {};

      // Validate required fields before proceeding to summary
      if (!formData.time_slot_id) {
        console.log('No time slot selected - showing inline error');
        newErrors.timeSlot = 'Please select a preferred time slot for the repair service.';
      }
      if (!formData.address.trim()) {
        console.log('No address entered - showing inline error');
        newErrors.address = 'Please enter your service address to continue.';
      }
      if (!formData.email.trim()) {
        console.log('No email entered - showing inline error');
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
      handleStepChange('services');
    } else if (step === 'summary') {
      handleStepChange('details');
    }
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
          address: data.data.user.address || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchRepairServices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/repair/services`);
      if (response.ok) {
        const data = await response.json();
        setRepairServices(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching repair services:', error);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/repair/time-slots`);
      if (response.ok) {
        const data = await response.json();
        setTimeSlots(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
    }
  };

  const fetchMechanicCharge = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/repair/mechanic-charge`);
      if (response.ok) {
        const data = await response.json();
        setMechanicCharge(data.data.amount || 0);
      }
    } catch (error) {
      console.error('Error fetching mechanic charge:', error);
    }
  };

  const toggleService = (service: RepairService) => {
    const isSelected = selectedServices.some(s => s.id === service.id);
    if (isSelected) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const pickImage = async () => {
    if (images.length >= FILE_LIMITS.MAX_IMAGES) {
      Alert.alert('Error', `Maximum ${FILE_LIMITS.MAX_IMAGES} images allowed`);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: FILE_LIMITS.IMAGE_QUALITY,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // ✅ VALIDATE FILE
        const validation = await validateFile(imageUri, 'image');
        if (!validation.isValid) {
          Alert.alert('Error', validation.error || 'Invalid image file');
          return;
        }

        // ✅ COMPRESS IMAGE IF NEEDED
        let finalUri = imageUri;
        if (validation.size && validation.size > FILE_LIMITS.MAX_IMAGE_SIZE * 0.5) { // Compress if > 5MB
          setUploadStatus('Compressing image...');
          finalUri = await compressImage(imageUri);
        }

        setImages([...images, finalUri]);
        console.log(`✅ Image added: ${Math.round((validation.size || 0) / (1024 * 1024) * 100) / 100}MB`);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const pickVideo = async () => {
    if (video) {
      Alert.alert('Error', 'Only 1 video allowed. Please remove the current video first.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'videos',
        allowsEditing: true,
        quality: FILE_LIMITS.VIDEO_QUALITY,
      });

      if (!result.canceled && result.assets[0]) {
        const videoUri = result.assets[0].uri;
        
        // ✅ VALIDATE FILE
        const validation = await validateFile(videoUri, 'video');
        if (!validation.isValid) {
          Alert.alert('Error', validation.error || 'Invalid video file');
          return;
        }

        // ✅ CHECK VIDEO DURATION (basic check)
        if (result.assets[0].duration) {
          console.log('Video duration check:', {
            duration: result.assets[0].duration,
            maxAllowed: FILE_LIMITS.MAX_VIDEO_DURATION,
            isTooLong: result.assets[0].duration > FILE_LIMITS.MAX_VIDEO_DURATION
          });
          
          // Check if duration is in milliseconds (common issue)
          const durationInSeconds = result.assets[0].duration > 1000 ? result.assets[0].duration / 1000 : result.assets[0].duration;
          
          if (durationInSeconds > FILE_LIMITS.MAX_VIDEO_DURATION) {
            Alert.alert('Error', `Video too long. Maximum ${FILE_LIMITS.MAX_VIDEO_DURATION} seconds allowed.`);
            return;
          }
        }

        // ✅ COMPRESS VIDEO IF NEEDED
        let finalUri = videoUri;
        if (validation.size && validation.size > FILE_LIMITS.MAX_VIDEO_SIZE * 0.5) { // Compress if > 25MB
          setUploadStatus('Compressing video...');
          finalUri = await compressVideo(videoUri);
        }

        setVideo(finalUri);
        const durationInSeconds = result.assets[0].duration ? (result.assets[0].duration > 1000 ? result.assets[0].duration / 1000 : result.assets[0].duration) : 'unknown';
        console.log(`✅ Video added: ${Math.round((validation.size || 0) / (1024 * 1024) * 100) / 100}MB, Duration: ${durationInSeconds}s`);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    setVideo(null);
  };

  const calculateTotal = () => {
    const servicesTotal = selectedServices.reduce((sum, service) => sum + service.price, 0);
    return servicesTotal + mechanicCharge;
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
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setCouponError('Please login first');
        return;
      }
      // Prepare items array based on selected services and mechanic charge
      const items = ['service_mechanic_charge']; // Always include mechanic charge
      selectedServices.forEach(() => {
        items.push('repair_services');
      });

      const totalAmount = calculateTotal();
      console.log('Applying coupon:', {
        code: coupon,
        requestType: 'repair',
        items: items,
        totalAmount: totalAmount
      });
      
      const response = await fetch(`${API_BASE_URL}/api/coupon/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: coupon,
          requestType: 'repair',
          items: items,
          totalAmount: totalAmount
        })
      });
      const data = await response.json();
      console.log('Coupon response:', data);
      if (response.ok && data.success) {
        setAppliedCoupon(data.data);
        setDiscount(data.data.discount || 0);
        setCouponError(''); // Clear any previous errors
      } else {
        setCouponError(data.message || 'Invalid coupon');
      }
    } catch (error) {
      console.error('Coupon apply error:', error);
      setCouponError('Network error. Please try again.');
    }
  };

  const calculateTotalWithDiscount = () => {
    return Math.max(0, calculateTotal() - discount);
  };

  const handleSubmit = async () => {
    if (selectedServices.length === 0) {
      Alert.alert('Error', 'Please select at least one repair service');
      return;
    }
    if (!formData.time_slot_id) {
      Alert.alert('Error', 'Please select a time slot');
      return;
    }
    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter your address');
      return;
    }

    // Show confirmation modal instead of submitting directly
    setShowConfirmationModal(true);
  };

  const confirmSubmit = async () => {
    setShowConfirmationModal(false);
    setLoading(true);
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Preparing files...');
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      // Prepare files for upload
      const filesToUpload = [];
      
      // Add images
      images.forEach((imageUri, index) => {
        const timestamp = Date.now();
        const fileType = getFileTypeFromUri(imageUri);
        const extension = fileType.split('/')[1];
        const fileName = `image_${index}_${timestamp}.${extension}`;
        filesToUpload.push({
          uri: imageUri,
          type: fileType,
          name: fileName
        });
      });

      // Add video
      if (video) {
        const timestamp = Date.now();
        const fileType = getFileTypeFromUri(video);
        const extension = fileType.split('/')[1];
        const videoFileName = `video_${timestamp}.${extension}`;
        filesToUpload.push({
          uri: video,
          type: fileType,
          name: videoFileName
        });
      }

      // Upload files to S3 using pre-signed URLs
      let uploadedFiles: { s3Key: string; fileType: string; originalName: string; fileSize: number }[] = [];
      if (filesToUpload.length > 0) {
        try {
          uploadedFiles = await uploadFilesToS3(filesToUpload);
          console.log('✅ Files uploaded to S3:', uploadedFiles.length);
        } catch (uploadError) {
          console.error('❌ File upload failed:', uploadError);
          Alert.alert('Error', 'Failed to upload files. Please try again.');
          setLoading(false);
          setIsUploading(false);
          return;
        }
      }

      // Submit repair request with file information
      const requestData = {
        contactNumber: user?.phone || '',
        alternateNumber: formData.alternate_number || '',
        email: formData.email || '',
        notes: formData.notes || '',
        address: formData.address || '',
        preferredDate: formData.preferred_date.toISOString().split('T')[0],
        timeSlotId: formData.time_slot_id,
        paymentMethod: paymentMethod,
        totalAmount: calculateTotalWithDiscount(),
        services: selectedServices.map(service => ({
          serviceId: service.id,
          price: service.price,
          discountAmount: 0
        })),
        files: uploadedFiles
      };

      console.log('Submitting secure repair request with data:', {
        ...requestData,
        filesCount: uploadedFiles.length
      });

      const response = await fetch(`${API_BASE_URL}/api/repair/requests/secure`, {
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
        console.log('✅ Secure repair request submitted successfully');
        setLoading(false);
        setIsUploading(false);
        setTimeout(() => {
          if (onNavigate) {
            // Pass a special parameter to indicate repair tab should be active
            console.log('🔧 Repair: Calling onNavigate with my-requests:repair');
            onNavigate('my-requests:repair');
          } else {
            console.log('🔧 Repair: Using router.replace with tab=repair');
            router.replace('/my-requests');
          }
        }, 500);
        return;
      } else {
        console.error('❌ Backend error:', data);
        let errorMessage = 'Failed to submit repair request';
        
        if (data.message) {
          errorMessage = data.message;
        } else if (data.errors && Array.isArray(data.errors)) {
          errorMessage = data.errors.map((e: any) => e.msg).join(', ');
        }
        
        Alert.alert('Error', errorMessage);
        setLoading(false);
        setIsUploading(false);
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
      setLoading(false);
      setIsUploading(false);
    }
  };

  const selectDate = (date: Date) => {
    setFormData({ ...formData, preferred_date: date });
    setShowDatePicker(false);
  };

  const selectTimeSlot = (slotId: number) => {
    setFormData({ ...formData, time_slot_id: slotId });
    setShowTimeSlotPicker(false);
  };

  const getSelectedTimeSlotText = () => {
    const selectedSlot = timeSlots.find(s => s.id === formData.time_slot_id);
    return selectedSlot ? `${selectedSlot.start_time} - ${selectedSlot.end_time}` : 'Select time slot';
  };

  // ✅ NEW: Get available time slots based on selected date
  const getAvailableTimeSlots = () => {
    const today = new Date();
    const selectedDate = formData.preferred_date;
    
    // Check if selected date is today
    const isToday = selectedDate.toDateString() === today.toDateString();
    
    if (!isToday) {
      // For future dates, show all time slots
      return timeSlots;
    }
    
    // For today, filter out past time slots
    const currentTime = today.getHours() * 60 + today.getMinutes(); // Current time in minutes
    
    return timeSlots.filter(slot => {
      const [startHour, startMinute] = slot.start_time.split(':').map(Number);
      const slotStartTime = startHour * 60 + startMinute;
      
      // Only show slots that haven't started yet (with 30-minute buffer)
      return slotStartTime > currentTime + 30;
    });
  };

  // ✅ NEW: Check if selected time slot is still available
  const isSelectedTimeSlotAvailable = () => {
    const availableSlots = getAvailableTimeSlots();
    return availableSlots.some(slot => slot.id === formData.time_slot_id);
  };

  // ✅ NEW: Reset time slot if it's no longer available
  const resetTimeSlotIfNeeded = () => {
    if (formData.time_slot_id !== 0 && !isSelectedTimeSlotAvailable()) {
      setFormData({ ...formData, time_slot_id: 0 });
    }
  };

  // ✅ NEW: Effect to reset time slot when date changes or component mounts
  useEffect(() => {
    resetTimeSlotIfNeeded();
  }, [formData.preferred_date]);

  // ✅ NEW: Effect to check time slot availability periodically
  useEffect(() => {
    const interval = setInterval(() => {
      resetTimeSlotIfNeeded();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const renderServicesStep = () => (
    <View style={styles.stepContainer}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { marginTop: 8 }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.gray} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search services by name or description..."
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

      <View style={styles.servicesGrid}>
        {filteredServices.map((service) => {
          const isSelected = selectedServices.some(s => s.id === service.id);
          return (
            <TouchableOpacity
              key={service.id}
              style={[
                styles.serviceCardCompact,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
                isSelected && { borderColor: colors.primary, backgroundColor: colors.background }
              ]}
              onPress={() => toggleService(service)}
            >
              <View style={styles.serviceCardContent}>
                <View style={styles.serviceCardHeader}>
                  <Text style={[styles.serviceNameCompact, { color: colors.text }]}>{service.name}</Text>
                  <Text style={[styles.servicePriceCompact, { color: colors.primary }]}>₹{service.price}</Text>
                </View>
                <Text style={[styles.serviceDescriptionCompact, { color: colors.gray }]}>{service.description}</Text>
                {isSelected && (
                  <View style={styles.selectedIndicatorCompact}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {errors.services && (
        <View style={[styles.errorContainer, { backgroundColor: `rgba(220, 53, 69, 0.1)`, borderLeftColor: colors.error }]}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{errors.services}</Text>
        </View>
      )}
    </View>
  );

  const renderDetailsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Contact & Details</Text>
      <Text style={[styles.stepSubtitle, { color: colors.gray }]}>Provide additional information for your repair request</Text>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        {/* Contact Information Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Information</Text>
          
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
          onChangeText={(text) => setFormData({ ...formData, alternate_number: text })}
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
            setFormData({ ...formData, email: text });
            if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
          }}
          placeholder="Enter email address"
                placeholderTextColor={colors.gray}
          keyboardType="email-address"
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

        {/* Service Details Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Service Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Service Address *</Text>
            <View style={[
              styles.inputContainer, 
              styles.textAreaContainer, 
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
              errors.address && { borderColor: colors.error }
            ]}>
              <Ionicons name="location" size={18} color={colors.gray} style={[styles.inputIcon, styles.textAreaIcon]} />
              <TextInput
                style={[styles.textInput, styles.textAreaInput, { color: colors.text }]}
          value={formData.address}
          onChangeText={(text) => {
            setFormData({ ...formData, address: text });
            if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
          }}
                placeholder="Enter your complete address"
                placeholderTextColor={colors.gray}
          multiline
          numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
            {errors.address && (
              <View style={[styles.errorContainer, { backgroundColor: `rgba(220, 53, 69, 0.1)`, borderLeftColor: colors.error }]}>
                <Ionicons name="alert-circle" size={14} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.address}</Text>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Special Instructions (Optional)</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Ionicons name="document-text" size={18} color={colors.gray} style={[styles.inputIcon, styles.textAreaIcon]} />
              <TextInput
                style={[styles.textInput, styles.textAreaInput, { color: colors.text }]}
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Any special instructions or notes for the mechanic"
                placeholderTextColor={colors.gray}
          multiline
          numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Media Upload Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Media Upload</Text>

          <View style={styles.uploadSection}>
            <View style={[styles.uploadCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={styles.uploadHeader}>
                <Ionicons name="camera" size={20} color={colors.primary} />
                <Text style={[styles.uploadTitle, { color: colors.text }]}>Upload Images</Text>
                <Text style={[styles.uploadSubtitle, { color: colors.gray }]}>Max 6 images</Text>
              </View>
              <TouchableOpacity style={[styles.uploadButton, { backgroundColor: colors.primary }]} onPress={pickImage}>
                <Ionicons name="add-circle" size={24} color={colors.background} />
                <Text style={[styles.uploadButtonText, { color: colors.background }]}>Add Images</Text>
              </TouchableOpacity>
              {images.length > 0 && (
                <View style={styles.imagePreview}>
                  {images.map((uri, index) => (
                    <View key={index} style={styles.imageContainer}>
                      <CachedImage
                        source={uri}
                        style={styles.previewImage}
                        resizeMode="cover"
                        placeholder={<DefaultPlaceholder size={60} icon="image" text="" />}
                        fallback={<DefaultFallback size={60} icon="image-outline" text="" />}
                      />
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeImage(index)}
                      >
                        <Ionicons name="close-circle" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={[styles.uploadCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={styles.uploadHeader}>
                <Ionicons name="videocam" size={20} color={colors.primary} />
                <Text style={[styles.uploadTitle, { color: colors.text }]}>Upload Video</Text>
                <Text style={[styles.uploadSubtitle, { color: colors.gray }]}>Max 1 video</Text>
              </View>
              <TouchableOpacity style={[styles.uploadButton, { backgroundColor: colors.primary }]} onPress={pickVideo}>
                <Ionicons name="add-circle" size={24} color={colors.background} />
                <Text style={[styles.uploadButtonText, { color: colors.background }]}>Add Video</Text>
              </TouchableOpacity>
              {video && (
                <View style={styles.videoPreview}>
                  <CachedVideo
                    source={video}
                    style={styles.previewVideo}
                    resizeMode={ResizeMode.CONTAIN}
                    placeholder={<DefaultVideoPlaceholder size={120} text="Loading video..." />}
                    fallback={<DefaultVideoFallback size={120} text="Video unavailable" />}
                    shouldPlay={false}
                    isMuted={true}
                    useNativeControls={true}
                  />
                  <TouchableOpacity
                    style={styles.videoRemoveButton}
                    onPress={() => removeVideo()}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Schedule Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.scheduleHeader}>
            <View style={[styles.scheduleIconContainer, { backgroundColor: colors.primary }]}>
              <Ionicons name="calendar" size={20} color={colors.background} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Schedule Your Repair</Text>
          </View>

          <View style={[styles.scheduleCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            {/* Date Selection */}
            <View style={styles.scheduleItem}>
              <View style={styles.scheduleItemHeader}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={[styles.scheduleItemLabel, { color: colors.text }]}>Preferred Date</Text>
              </View>
          <TouchableOpacity
                style={[styles.schedulePickerButton, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => setShowDatePicker(true)}
          >
                <View style={styles.schedulePickerContent}>
                  <View style={styles.schedulePickerLeft}>
                    <Text style={[styles.schedulePickerDay, { color: colors.primary }]}>
                      {formData.preferred_date.toLocaleDateString('en-US', { day: 'numeric' })}
            </Text>
                    <Text style={[styles.schedulePickerMonth, { color: colors.text }]}>
                      {formData.preferred_date.toLocaleDateString('en-US', { month: 'short' })}
                    </Text>
                  </View>
                  <View style={styles.schedulePickerRight}>
                    <Text style={[styles.schedulePickerWeekday, { color: colors.text }]}>
                      {formData.preferred_date.toLocaleDateString('en-US', { weekday: 'long' })}
                    </Text>
                    <Text style={[styles.schedulePickerYear, { color: colors.gray }]}>
                      {formData.preferred_date.toLocaleDateString('en-US', { year: 'numeric' })}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>

            {/* Time Slot Selection */}
            <View style={styles.scheduleItem}>
              <View style={styles.scheduleItemHeader}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <Text style={[styles.scheduleItemLabel, { color: colors.text }]}>Time Slot *</Text>
              </View>
          <TouchableOpacity
                style={[
                  styles.schedulePickerButton, 
                  { backgroundColor: colors.background, borderColor: colors.border },
                  errors.timeSlot && { borderColor: colors.error },
                  getAvailableTimeSlots().length === 0 && { borderColor: colors.error, opacity: 0.6 }
                ]}
            onPress={() => setShowTimeSlotPicker(true)}
                disabled={getAvailableTimeSlots().length === 0}
              >
                <View style={styles.schedulePickerContent}>
                  <View style={styles.schedulePickerLeft}>
                    <Ionicons name="time" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.schedulePickerRight}>
            <Text style={[
                      styles.schedulePickerTime,
                      { color: colors.text },
                      formData.time_slot_id === 0 && { color: colors.gray },
                      getAvailableTimeSlots().length === 0 && { color: colors.error }
            ]}>
                      {getAvailableTimeSlots().length === 0 
                        ? 'No available slots for today' 
                        : getSelectedTimeSlotText()
                      }
            </Text>
                    {formData.time_slot_id !== 0 && (
                      <Text style={[styles.schedulePickerDuration, { color: colors.gray }]}>
                        Duration: 2 hours
                      </Text>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-down" size={18} color={colors.primary} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
              
              {/* Error Messages */}
          {errors.timeSlot && (
                <View style={[styles.scheduleErrorContainer, { backgroundColor: `rgba(220, 53, 69, 0.1)`, borderLeftColor: colors.error }]}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
                  <Text style={[styles.scheduleErrorText, { color: colors.error }]}>{errors.timeSlot}</Text>
            </View>
          )}
              {getAvailableTimeSlots().length === 0 && (
                <View style={[styles.scheduleErrorContainer, { backgroundColor: `rgba(220, 53, 69, 0.1)`, borderLeftColor: colors.error }]}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
                  <Text style={[styles.scheduleErrorText, { color: colors.error }]}>
                    No time slots available for today. Please select a future date.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const renderSummaryStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Review & Submit</Text>
      <Text style={[styles.stepSubtitle, { color: colors.gray }]}>Please review your repair request details before submitting</Text>
      
      <ScrollView style={styles.summaryContainer} showsVerticalScrollIndicator={false}>
        {/* Services Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Selected Services</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <View style={[styles.summaryIconContainer, { backgroundColor: colors.primary }]}>
              <Ionicons name="construct" size={20} color={colors.background} />
            </View>
              <Text style={[styles.summaryCardTitle, { color: colors.text }]}>{selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected</Text>
          </View>
          <View style={styles.servicesList}>
            {selectedServices.map((service, index) => (
                <View key={service.id} style={[styles.summaryItemRow, index === selectedServices.length - 1 && styles.lastItem]}>
                <View style={styles.serviceInfo}>
                    <Text style={[styles.summaryItemName, { color: colors.text }]}>{service.name}</Text>
                  <Text style={[styles.serviceDescription, { color: colors.gray }]}>{service.description}</Text>
                </View>
                  <Text style={[styles.summaryItemPrice, { color: colors.primary }]}>₹{service.price}</Text>
              </View>
            ))}
            </View>
          </View>
        </View>

        {/* Contact Information Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Information</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <View style={[styles.summaryIconContainer, { backgroundColor: colors.error }]}>
              <Ionicons name="person" size={20} color={colors.background} />
            </View>
              <Text style={[styles.summaryCardTitle, { color: colors.text }]}>Contact Details</Text>
          </View>
          <View style={styles.contactInfo}>
            <View style={styles.contactRow}>
                <Ionicons name="call" size={16} color={colors.primary} style={styles.contactIcon} />
                <Text style={[styles.summaryText, { color: colors.text }]}>{user?.phone}</Text>
            </View>
            {formData.alternate_number && (
              <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={16} color={colors.gray} style={styles.contactIcon} />
                  <Text style={[styles.summaryText, { color: colors.text }]}>{formData.alternate_number}</Text>
              </View>
            )}
            <View style={styles.contactRow}>
                <Ionicons name="mail" size={16} color={colors.gray} style={styles.contactIcon} />
                <Text style={[styles.summaryText, { color: colors.text }]}>{formData.email}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Service Details Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Service Details</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <View style={[styles.summaryIconContainer, { backgroundColor: colors.primary }]}>
              <Ionicons name="location" size={20} color={colors.background} />
            </View>
              <Text style={[styles.summaryCardTitle, { color: colors.text }]}>Service Address</Text>
          </View>
          <View style={styles.addressInfo}>
              <Ionicons name="location-outline" size={16} color={colors.gray} style={styles.contactIcon} />
              <Text style={[styles.summaryText, { color: colors.text }]}>{formData.address}</Text>
          </View>
        </View>

          {formData.notes && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardHeader}>
                <View style={[styles.summaryIconContainer, { backgroundColor: colors.success }]}>
                  <Ionicons name="document-text" size={20} color={colors.background} />
            </View>
                <Text style={[styles.summaryCardTitle, { color: colors.text }]}>Special Instructions</Text>
          </View>
              <View style={styles.notesInfo}>
                <Ionicons name="chatbubble-outline" size={16} color={colors.gray} style={styles.contactIcon} />
                <Text style={[styles.summaryText, { color: colors.text }]}>{formData.notes}</Text>
            </View>
            </View>
          )}
        </View>

        {/* Media Section */}
        {(images.length > 0 || video) && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Media Files</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardHeader}>
                <View style={[styles.summaryIconContainer, { backgroundColor: colors.primary }]}>
                  <Ionicons name="images" size={20} color={colors.background} />
              </View>
                <Text style={[styles.summaryCardTitle, { color: colors.text }]}>Uploaded Files</Text>
            </View>
              <View style={styles.mediaInfo}>
                {images.length > 0 && (
                  <View style={styles.mediaRow}>
                    <Ionicons name="camera" size={16} color={colors.gray} style={styles.contactIcon} />
                    <Text style={[styles.summaryText, { color: colors.text }]}>{images.length} image{images.length !== 1 ? 's' : ''} uploaded</Text>
                  </View>
                )}
                {video && (
                  <View style={styles.mediaRow}>
                    <Ionicons name="videocam" size={16} color={colors.gray} style={styles.contactIcon} />
                    <Text style={[styles.summaryText, { color: colors.text }]}>1 video uploaded</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Schedule Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Schedule</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <View style={[styles.summaryIconContainer, { backgroundColor: colors.primary }]}>
                <Ionicons name="calendar" size={20} color={colors.background} />
              </View>
              <Text style={[styles.summaryCardTitle, { color: colors.text }]}>Appointment Details</Text>
            </View>
            <View style={styles.scheduleInfo}>
              <View style={styles.scheduleRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.gray} style={styles.contactIcon} />
                <Text style={[styles.summaryText, { color: colors.text }]}>{formData.preferred_date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Ionicons name="time" size={16} color={colors.gray} style={styles.contactIcon} />
                <Text style={[styles.summaryText, { color: colors.text }]}>{timeSlots.find(s => s.id === formData.time_slot_id)?.start_time} - {timeSlots.find(s => s.id === formData.time_slot_id)?.end_time}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Coupon Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Discount</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <View style={[styles.summaryIconContainer, { backgroundColor: colors.primary }]}>
              <Ionicons name="pricetag" size={20} color={colors.background} />
            </View>
              <Text style={[styles.summaryCardTitle, { color: colors.text }]}>Apply Coupon</Text>
          </View>
            <View style={styles.couponInputContainer}>
            <TextInput
              style={[styles.couponInput, { color: colors.text, backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              value={coupon}
              onChangeText={setCoupon}
              placeholder="Enter coupon code"
              autoCapitalize="characters"
                placeholderTextColor={colors.gray}
            />
              <TouchableOpacity style={[styles.applyCouponButton, { backgroundColor: colors.primary }]} onPress={applyCoupon}>
                <Text style={[styles.applyCouponText, { color: colors.background }]}>Apply</Text>
            </TouchableOpacity>
          </View>
            {couponError ? <Text style={[styles.couponError, { color: colors.error }]}>{couponError}</Text> : null}
          {appliedCoupon && (
            <View style={styles.couponSuccessContainer}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.couponSuccess, { color: colors.success }]}>
                Coupon "{appliedCoupon.code}" applied! Discount: ₹{discount}
              </Text>
            </View>
          )}
          </View>
        </View>

        {/* Payment Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <View style={[styles.summaryIconContainer, { backgroundColor: colors.primary }]}>
              <Ionicons name="wallet" size={20} color={colors.background} />
            </View>
              <Text style={[styles.summaryCardTitle, { color: colors.text }]}>Payment Method</Text>
          </View>
            <View style={styles.paymentOptionsContainer}>
            <TouchableOpacity
                style={[styles.paymentOption, { backgroundColor: colors.cardBackground, borderColor: colors.border }, styles.paymentOptionDisabled]}
              disabled={true}
            >
                <Ionicons name="radio-button-off" size={20} color={colors.gray} />
              <Text style={[styles.paymentOptionTextDisabled, { color: colors.gray }]}>Online (Coming Soon)</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[
                  styles.paymentOption, 
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                  paymentMethod === 'offline' && { borderColor: colors.primary, backgroundColor: colors.background }
                ]}
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

        {/* Total Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Total Amount</Text>
          <View style={styles.summaryTotalCard}>
            <View style={styles.summaryCardHeader}>
              <View style={[styles.summaryIconContainer, { backgroundColor: colors.success }]}>
              <Ionicons name="cash" size={20} color={colors.background} />
            </View>
              <Text style={[styles.summaryTotalTitle, { color: colors.text }]}>Payment Summary</Text>
          </View>
            <View style={styles.totalBreakdown}>
            <View style={styles.totalRow}>
                <Text style={[styles.totalItem, { color: colors.text }]}>Services</Text>
                <Text style={[styles.totalValue, { color: colors.text }]}>₹{selectedServices.reduce((sum, s) => sum + s.price, 0)}</Text>
            </View>
            <View style={styles.totalRow}>
                <Text style={[styles.totalItem, { color: colors.text }]}>Mechanic Charge</Text>
                <Text style={[styles.totalValue, { color: colors.text }]}>₹{mechanicCharge}</Text>
            </View>
            {discount > 0 && (
              <View style={styles.totalRow}>
                  <Text style={[styles.totalItem, { color: colors.text }]}>Discount</Text>
                  <Text style={[styles.totalValue, { color: colors.success }]}>-₹{discount}</Text>
              </View>
            )}
            <View style={styles.finalTotalRow}>
              <Text style={[styles.finalTotalText, { color: colors.text }]}>Total</Text>
              <Text style={[styles.finalTotalAmount, { color: colors.success }]}>₹{calculateTotalWithDiscount()}</Text>
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
          {step === 'services' && renderServicesStep()}
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
        {step !== 'services' && (
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

        {/* Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select Preferred Date</Text>
              </View>
              
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Today's date option */}
                <TouchableOpacity
                  style={[styles.enhancedDateOption, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => selectDate(new Date())}
                >
                  <View style={styles.enhancedDateOptionContent}>
                    <View style={styles.enhancedDateOptionLeft}>
                      <Text style={[styles.enhancedDateOptionDay, { color: colors.primary }]}>
                        {new Date().getDate()}
                      </Text>
                      <Text style={[styles.enhancedDateOptionMonth, { color: colors.text }]}>
                        {new Date().toLocaleDateString('en-US', { month: 'short' })}
                      </Text>
                    </View>
                    <View style={styles.enhancedDateOptionRight}>
                      <Text style={[styles.enhancedDateOptionWeekday, { color: colors.text }]}>
                        Today
                      </Text>
                      <Text style={[styles.enhancedDateOptionFullDate, { color: colors.gray }]}>
                        {new Date().toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.enhancedDateOptionBadge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.enhancedDateOptionBadgeText, { color: colors.background }]}>NOW</Text>
                  </View>
                </TouchableOpacity>
                
                {/* Future dates starting from tomorrow */}
                {Array.from({ length: 30 }, (_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() + i + 1);
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.enhancedDateOption, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => selectDate(date)}
                    >
                      <View style={styles.enhancedDateOptionContent}>
                        <View style={styles.enhancedDateOptionLeft}>
                          <Text style={[styles.enhancedDateOptionDay, { color: colors.primary }]}>
                            {date.getDate()}
                          </Text>
                          <Text style={[styles.enhancedDateOptionMonth, { color: colors.text }]}>
                            {date.toLocaleDateString('en-US', { month: 'short' })}
                          </Text>
                        </View>
                        <View style={styles.enhancedDateOptionRight}>
                          <Text style={[styles.enhancedDateOptionWeekday, { color: colors.text }]}>
                            {date.toLocaleDateString('en-US', { weekday: 'long' })}
                          </Text>
                          <Text style={[styles.enhancedDateOptionFullDate, { color: colors.gray }]}>
                        {date.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Text>
                        </View>
                      </View>
                      <View style={[styles.enhancedDateOptionBadge, { backgroundColor: colors.gray }]}>
                        <Text style={[styles.enhancedDateOptionBadgeText, { color: colors.background }]}>
                          {i === 0 ? 'TOM' : i === 1 ? 'DAY 2' : `DAY ${i + 1}`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              
              <TouchableOpacity
                style={[styles.modalBottomButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={[styles.modalBottomButtonText, { color: colors.background }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      {/* Time Slot Picker Modal */}
      <Modal
        visible={showTimeSlotPicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Time Slot</Text>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {getAvailableTimeSlots().length > 0 ? (
                getAvailableTimeSlots().map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                    style={[styles.enhancedTimeSlotOption, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => selectTimeSlot(slot.id)}
                >
                    <View style={styles.enhancedTimeSlotContent}>
                      <View style={styles.enhancedTimeSlotLeft}>
                        <Ionicons name="time-outline" size={24} color={colors.primary} />
                      </View>
                      <View style={styles.enhancedTimeSlotRight}>
                        <Text style={[styles.enhancedTimeSlotTime, { color: colors.text }]}>
                    {slot.start_time} - {slot.end_time}
                  </Text>
                        <Text style={[styles.enhancedTimeSlotDuration, { color: colors.gray }]}>
                          Duration: 2 hours
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.enhancedTimeSlotBadge, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.enhancedTimeSlotBadgeText, { color: colors.background }]}>AVAILABLE</Text>
                    </View>
                </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noTimeSlotsContainer}>
                  <Ionicons name="time-outline" size={48} color={colors.gray} />
                  <Text style={[styles.noTimeSlotsText, { color: colors.gray }]}>
                    No available time slots for today
                  </Text>
                  <Text style={[styles.noTimeSlotsSubtext, { color: colors.gray }]}>
                    Please select a future date
                  </Text>
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity
              style={[styles.modalBottomButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowTimeSlotPicker(false)}
            >
              <Text style={[styles.modalBottomButtonText, { color: colors.background }]}>Close</Text>
            </TouchableOpacity>
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
                <Ionicons name="construct" size={24} color={colors.background} />
              </View>
              <Text style={[styles.confirmationModalTitle, { color: colors.text }]}>Confirm Repair</Text>
            </View>
            
            {/* Body with Details */}
            <View style={styles.confirmationModalBody}>
              <View style={styles.confirmationModalDetails}>
                <View style={[styles.confirmationDetailCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.confirmationDetailRow}>
                    <View style={styles.confirmationDetailLeft}>
                      <Ionicons name="construct-outline" size={16} color={colors.primary} />
                      <Text style={[styles.confirmationDetailLabel, { color: colors.text }]}>Services</Text>
                    </View>
                    <Text style={[styles.confirmationDetailValue, { color: colors.text }]}>
                      {selectedServices.length} service(s)
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.confirmationDetailCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.confirmationDetailRow}>
                    <View style={styles.confirmationDetailLeft}>
                      <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                      <Text style={[styles.confirmationDetailLabel, { color: colors.text }]}>Date</Text>
                    </View>
                    <Text style={[styles.confirmationDetailValue, { color: colors.text }]}>
                      {formData.preferred_date.toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.confirmationDetailCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.confirmationDetailRow}>
                    <View style={styles.confirmationDetailLeft}>
                      <Ionicons name="time-outline" size={16} color={colors.primary} />
                      <Text style={[styles.confirmationDetailLabel, { color: colors.text }]}>Time</Text>
                    </View>
                    <Text style={[styles.confirmationDetailValue, { color: colors.text }]}>
                      {getSelectedTimeSlotText()}
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.confirmationDetailCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.confirmationDetailRow}>
                    <View style={styles.confirmationDetailLeft}>
                      <Ionicons name="location-outline" size={16} color={colors.primary} />
                      <Text style={[styles.confirmationDetailLabel, { color: colors.text }]}>Address</Text>
                    </View>
                    <Text style={[styles.confirmationDetailValue, { color: colors.text }]} numberOfLines={3}>
                      {formData.address}
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.confirmationTotalCard, { backgroundColor: colors.success, borderColor: colors.success }]}>
                  <View style={styles.confirmationDetailRow}>
                    <View style={styles.confirmationDetailLeft}>
                      <Ionicons name="pricetag-outline" size={16} color={colors.background} />
                      <Text style={[styles.confirmationTotalLabel, { color: colors.background }]}>Total</Text>
                    </View>
                    <Text style={[styles.confirmationTotalValue, { color: colors.background }]}>₹{calculateTotalWithDiscount()}</Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Footer with Action Buttons */}
            <View style={styles.confirmationModalFooter}>
              <TouchableOpacity
                style={[
                  styles.confirmationModalCancelButton, 
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                  isUploading && styles.disabledButton
                ]}
                onPress={() => setShowConfirmationModal(false)}
                activeOpacity={0.8}
                disabled={isUploading}
              >
                <Ionicons name="close-outline" size={16} color={isUploading ? colors.gray : colors.gray} />
                <Text style={[
                  styles.confirmationModalCancelText, 
                  { color: colors.gray },
                  isUploading && styles.disabledButtonText
                ]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmationModalConfirmButton, 
                  { backgroundColor: colors.primary },
                  isUploading && styles.disabledButton
                ]}
                onPress={confirmSubmit}
                activeOpacity={0.8}
                disabled={isUploading}
              >
                <Ionicons name="checkmark-outline" size={16} color={isUploading ? colors.gray : colors.background} />
                <Text style={[
                  styles.confirmationModalConfirmText, 
                  { color: colors.background },
                  isUploading && styles.disabledButtonText
                ]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ NEW: Upload Progress Modal - Covers entire screen */}
      {isUploading && (
        <View style={styles.uploadOverlay}>
          <View style={[styles.uploadModal, { backgroundColor: colors.cardBackground }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.uploadTitle, { color: colors.text }]}>Uploading Files</Text>
            <Text style={[styles.uploadStatus, { color: colors.gray }]}>{uploadStatus}</Text>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${uploadProgress}%` }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.text }]}>{Math.round(uploadProgress)}%</Text>
          </View>
        </View>
      )}
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
    padding: 12,
    // backgroundColor now handled dynamically
        shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    // color now handled dynamically
    marginLeft: 6,
  },
  dashboardText: {
    fontSize: 16,
    fontWeight: '600',
    // color now handled dynamically
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginLeft: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    // color now handled dynamically
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    // color now handled dynamically
    opacity: 0.8,
  },
  backButton: {
    padding: 8,
    borderRadius: 16,
    // backgroundColor now handled dynamically
  },
  headerSpacer: {
    width: 40,
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },

  totalBarSticky: {
    // backgroundColor and borderTopColor now handled dynamically
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
    // backgroundColor and borderTopColor now handled dynamically
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0, // Position directly above SPA navbar
    left: 0,
    right: 0,
    zIndex: 998,
    gap: 12,
  },
  scrollView: {
    flex: 1,
  },

  navButton: {
    flex: 1,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600',
    // color now handled dynamically
    marginLeft: 6,
  },
  nextButton: {
    // backgroundColor and borderColor now handled dynamically
  },
  submitButton: {
    // backgroundColor now handled dynamically
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    // color now handled dynamically
    marginRight: 6,
  },
  stepProgressBar: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 6,
    // backgroundColor now handled dynamically
  },
  progressStep: {
    flex: 1,
    height: 3,
    // backgroundColor now handled dynamically
    marginHorizontal: 3,
    borderRadius: 2,
  },
  progressActive: {
    // backgroundColor now handled dynamically
  },
  stepContainer: {
    flex: 1,
    padding: 10,
    paddingBottom: 4,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    // color now handled dynamically
    marginBottom: 3,
  },
  stepSubtitle: {
    fontSize: 12,
    // color now handled dynamically
    marginBottom: 12,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor and borderColor now handled dynamically
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    // color now handled dynamically
    paddingVertical: 4,
  },
  clearSearchButton: {
    padding: 4,
  },
  servicesGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 4,
  },
  serviceCardCompact: {
    width: (width - 32) / 2,
    // backgroundColor and borderColor now handled dynamically
    borderRadius: 10,
    borderWidth: 2,
    padding: 12,
    minHeight: 100,
  },
  serviceCardSelected: {
    // borderColor and backgroundColor now handled dynamically
  },
  serviceCardContent: {
    position: 'relative',
    flex: 1,
  },
  serviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  serviceNameCompact: {
    fontSize: 13,
    fontWeight: 'bold',
    // color now handled dynamically
    flex: 1,
    marginRight: 6,
  },
  servicePriceCompact: {
    fontSize: 13,
    fontWeight: 'bold',
    // color now handled dynamically
  },
  serviceDescriptionCompact: {
    fontSize: 11,
    // color now handled dynamically
    lineHeight: 14,
    flex: 1,
  },
  selectedIndicatorCompact: {
    position: 'absolute',
    top: -8,
    right: -8,
    // backgroundColor now handled dynamically
    borderRadius: 12,
  },
  stepFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    // borderTopColor now handled dynamically
  },
  totalText: {
    fontSize: 15,
    fontWeight: 'bold',
    // color now handled dynamically
    textAlign: 'center',
    marginBottom: 12,
  },

  formContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    // color now handled dynamically
    marginBottom: 3,
  },
  input: {
    borderWidth: 1,
    // borderColor, backgroundColor, and color now handled dynamically
    borderRadius: 6,
    padding: 6,
    fontSize: 13,
  },
  textArea: {
    height: 50,
    textAlignVertical: 'top',
  },
  inputValue: {
    fontSize: 13,
    // color, backgroundColor, and borderColor now handled dynamically
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor and borderColor now handled dynamically
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  uploadButtonText: {
    fontSize: 11,
    fontWeight: '600',
    // color now handled dynamically
    marginLeft: 3,
  },
  imagePreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginTop: 3,
  },
  imageContainer: {
    position: 'relative',
  },
  previewImage: {
    width: 45,
    height: 45,
    borderRadius: 4,
  },
  removeButton: {
    position: 'absolute',
    top: -1,
    right: -1,
    // backgroundColor now handled dynamically
    borderRadius: 4,
    padding: 1,
  },
  videoPreview: {
    position: 'relative',
    // backgroundColor now handled dynamically
    borderRadius: 4,
    marginTop: 6,
    overflow: 'hidden',
  },
  videoPreviewPlayer: {
    width: '100%',
    height: 160,
    borderRadius: 8,
  },
  videoRemoveButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    // backgroundColor now handled dynamically
    borderRadius: 10,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  videoText: {
    fontSize: 15,
    // color now handled dynamically
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 10,
    borderWidth: 1,
    // borderColor and backgroundColor now handled dynamically
    borderRadius: 6,
  },
  datePickerText: {
    fontSize: 13,
    // color now handled dynamically
  },
  timeSlotPickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 10,
    borderWidth: 1,
    // borderColor and backgroundColor now handled dynamically
    borderRadius: 6,
  },
  timeSlotPickerText: {
    fontSize: 13,
    // color now handled dynamically
  },
  placeholderText: {
    color: '#CCCCCC',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 32,
  },
  modalContent: {
    // backgroundColor now handled dynamically
    borderRadius: 14,
    width: '95%',
    height: '75%', // Increased by 30% from 58% to 75%
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    // color now handled dynamically
    marginBottom: 10,
    textAlign: 'center',
  },
  dateList: {
    maxHeight: 220,
  },
  dateOption: {
    padding: 6,
    borderBottomWidth: 1,
    // borderBottomColor now handled dynamically
  },
  dateOptionText: {
    fontSize: 15,
    // color now handled dynamically
  },
  timeSlotList: {
    maxHeight: 220,
  },
  timeSlotOption: {
    padding: 6,
    borderBottomWidth: 1,
    // borderBottomColor now handled dynamically
  },
  timeSlotOptionText: {
    fontSize: 15,
    // color now handled dynamically
  },
  cancelButton: {
    marginTop: 12,
    padding: 8,
    // backgroundColor now handled dynamically
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    // color now handled dynamically
    fontSize: 16,
    fontWeight: '600',
  },
  summaryContainer: {
    flex: 1,
  },
  summaryCard: {
    // backgroundColor now handled dynamically
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    // color now handled dynamically
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  summaryItemName: {
    fontSize: 13,
    // color now handled dynamically
    flex: 1,
  },
  summaryItemPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    // color now handled dynamically
  },
  summaryText: {
    fontSize: 13,
    // color now handled dynamically
    marginBottom: 4,
  },
  totalBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingTop: 8,
  },
  totalItem: {
    fontSize: 13,
    // color now handled dynamically
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    // color now handled dynamically
    marginTop: 4,
  },
  couponInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  applyCouponButton: {
    // backgroundColor now handled dynamically
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 4,
  },
  applyCouponText: {
    // color now handled dynamically
    fontWeight: 'bold',
    fontSize: 12,
  },
  couponError: {
    color: '#dc3545',
    marginTop: 2,
    fontSize: 12,
  },
  couponSuccess: {
    color: '#28a745',
    marginTop: 2,
    fontSize: 12,
  },
  paymentOptionsContainer: {
    flexDirection: 'column',
    gap: 4,
    marginTop: 4,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    // backgroundColor and borderColor now handled dynamically
    borderWidth: 1,
  },
  paymentOptionSelected: {
    // borderColor and backgroundColor now handled dynamically
  },
  paymentOptionText: {
    fontSize: 12,
    // color now handled dynamically
    marginLeft: 4,
  },

  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  stepBackButton: {
    // backgroundColor now handled dynamically
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  backButtonText: {
    // color now handled dynamically
    fontSize: 15,
    fontWeight: 'bold',
  },
  testButtonsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  testButton: {
    // backgroundColor now handled dynamically
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  testButtonText: {
    // color now handled dynamically
    fontWeight: 'bold',
    fontSize: 11,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: 'bold',
    // color now handled dynamically
  },
  paymentOptionDisabled: {
    opacity: 0.5,
  },
  paymentOptionTextDisabled: {
    fontSize: 12,
    // color now handled dynamically
    marginLeft: 4,
  },
  paymentNotice: {
    fontSize: 12,
    // color now handled dynamically
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'center',
  },
  totalBar: {
    // backgroundColor and borderTopColor now handled dynamically
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalBarContent: {
    alignItems: 'center',
  },
  totalBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 1,
  },
  totalLabel: {
    fontSize: 13,
    // color now handled dynamically
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 13,
    // color now handled dynamically
    fontWeight: '600',
  },
  discountValue: {
    // color now handled dynamically
  },
  finalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#FFD11E',
    marginTop: 3,
  },
  finalTotalLabel: {
    fontSize: 15,
    // color now handled dynamically
    fontWeight: 'bold',
  },
  finalTotalValue: {
    fontSize: 17,
    // color now handled dynamically
    fontWeight: 'bold',
  },
  summaryTotalCard: {
    // backgroundColor now handled dynamically
    padding: 10,
    borderRadius: 8,
    marginBottom: 36,
  },
  summaryTotalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    // color now handled dynamically
    marginBottom: 8,
  },
  summaryCardEnhanced: {
    // backgroundColor and borderColor now handled dynamically
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
  },
  summaryCardHeaderEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    // backgroundColor now handled dynamically
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  summaryCardTitleEnhanced: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  serviceCount: {
    fontSize: 13,
    color: '#CCCCCC',
    fontStyle: 'italic',
  },
  servicesList: {
    gap: 8,
  },
  summaryItemRowEnhanced: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  serviceInfo: {
    flex: 1,
  },
  summaryItemNameEnhanced: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  serviceDescription: {
    fontSize: 13,
    color: '#CCCCCC',
    fontStyle: 'italic',
  },
  summaryItemPriceEnhanced: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  contactInfo: {
    gap: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactIcon: {
    marginRight: 6,
  },
  summaryTextEnhanced: {
    fontSize: 15,
    color: '#CCCCCC',
    lineHeight: 20,
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  scheduleInfo: {
    gap: 8,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notesInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  couponInputContainerEnhanced: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    // borderColor, color, and backgroundColor now handled dynamically
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
  },
  applyCouponButtonEnhanced: {
    // backgroundColor now handled dynamically
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyCouponTextEnhanced: {
    // color now handled dynamically
    fontWeight: 'bold',
    fontSize: 14,
  },
  couponErrorEnhanced: {
    color: '#dc3545',
    fontSize: 13,
    marginTop: 3,
  },
  couponSuccessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  couponSuccessEnhanced: {
    color: '#28a745',
    fontSize: 13,
  },
  paymentOptionsContainerEnhanced: {
    flexDirection: 'row',
    gap: 16,
  },
  paymentOptionEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    // borderColor now handled dynamically
    borderRadius: 8,
    flex: 1,
  },
  paymentOptionSelectedEnhanced: {
    // backgroundColor and borderColor now handled dynamically
  },
  paymentOptionTextEnhanced: {
    fontSize: 16,
    // color now handled dynamically
    fontWeight: '600',
  },
  paymentNoticeEnhanced: {
    fontSize: 14,
    // color now handled dynamically
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  summaryTotalCardEnhanced: {
    // backgroundColor and borderColor now handled dynamically
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
  },
  summaryTotalTitleEnhanced: {
    fontSize: 16,
    fontWeight: 'bold',
    // color now handled dynamically
    flex: 1,
  },
  totalBreakdownEnhanced: {
    borderTopWidth: 1,
    // borderTopColor now handled dynamically
    paddingTop: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  totalItemEnhanced: {
    fontSize: 15,
    // color now handled dynamically
    fontWeight: '500',
  },
  totalValueEnhanced: {
    fontSize: 15,
    // color now handled dynamically
    fontWeight: '600',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  finalTotalText: {
    fontSize: 16,
    fontWeight: 'bold',
    // color now handled dynamically
  },
  finalTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    // color now handled dynamically
  },

  totalBarText: {
    fontSize: 16,
    fontWeight: 'bold',
    // color now handled dynamically
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '500',
  },
  inputError: {
    borderColor: '#dc3545',
    borderWidth: 2,
  },
  // Confirmation Modal Styles
  confirmationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmationModalContent: {
    // backgroundColor now handled dynamically
    borderRadius: 16,
    padding: 0,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  confirmationModalHeader: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    // backgroundColor and borderBottomColor now handled dynamically
    borderBottomWidth: 1,
  },
  confirmationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    // backgroundColor now handled dynamically
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#FFD11E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmationModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    // color now handled dynamically
    textAlign: 'center',
  },
  confirmationModalSubtitle: {
    fontSize: 14,
    // color now handled dynamically
    textAlign: 'center',
  },
  confirmationModalBody: {
    padding: 20,
    paddingBottom: 16,
  },
  confirmationModalDetails: {
    gap: 8,
  },
  confirmationDetailCard: {
    // backgroundColor and borderColor now handled dynamically
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  confirmationDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  confirmationDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  confirmationDetailLabel: {
    fontSize: 13,
    // color now handled dynamically
    fontWeight: '500',
  },
  confirmationDetailValue: {
    fontSize: 13,
    // color now handled dynamically
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 6,
    lineHeight: 18,
  },
  confirmationTotalCard: {
    // backgroundColor and borderColor now handled dynamically
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  confirmationTotalLabel: {
    fontSize: 13,
    // color now handled dynamically
    fontWeight: '600',
  },
  confirmationTotalValue: {
    fontSize: 14,
    // color now handled dynamically
    fontWeight: 'bold',
    textAlign: 'right',
    flex: 1,
    marginLeft: 6,
  },
  confirmationModalFooter: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 10,
  },
  confirmationModalCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    // backgroundColor and borderColor now handled dynamically
    borderWidth: 1,
  },
  confirmationModalCancelText: {
    // color now handled dynamically
    fontSize: 14,
    fontWeight: '600',
  },
  confirmationModalConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    // backgroundColor now handled dynamically
    shadowColor: '#FFD11E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmationModalConfirmText: {
    // color now handled dynamically
    fontSize: 14,
    fontWeight: '600',
  },
  // ✅ NEW: Upload Progress Styles
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  uploadModal: {
    // backgroundColor now handled dynamically
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    // color now handled dynamically
    marginTop: 12,
    marginBottom: 6,
  },
  uploadStatus: {
    fontSize: 12,
    // color now handled dynamically
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 8,
    // backgroundColor now handled dynamically
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    // backgroundColor now handled dynamically
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    // color now handled dynamically
  },
  // ✅ NEW: Disabled Button Styles
  disabledButton: {
    opacity: 0.5,
    // backgroundColor now handled dynamically
  },
  disabledButtonText: {
    // color now handled dynamically
  },
  // ✅ NEW: Details Section Styles
  sectionContainer: {
    marginBottom: 12,
    paddingHorizontal: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    // color now handled dynamically
    marginBottom: 6,
    paddingHorizontal: 1,
  },
  readOnlyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor and borderColor now handled dynamically
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 3,
  },
  inputIcon: {
    marginRight: 6,
  },
  readOnlyText: {
    flex: 1,
    fontSize: 13,
    // color now handled dynamically
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor and borderColor now handled dynamically
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    // color now handled dynamically
    paddingVertical: 0,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingTop: 4,
    paddingBottom: 4,
  },
  textAreaIcon: {
    marginTop: 2,
  },
  textAreaInput: {
    minHeight: 40,
    textAlignVertical: 'top',
  },
  uploadSection: {
    gap: 6,
  },
  uploadCard: {
    // backgroundColor and borderColor now handled dynamically
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
  },
  uploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  uploadSubtitle: {
    fontSize: 9,
    color: '#999999',
  },
  previewVideo: {
    width: '100%',
    height: 50,
    borderRadius: 4,
  },

  summaryIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    // backgroundColor now handled dynamically
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  mediaInfo: {
    gap: 4,
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // ✅ NEW: No Time Slots Styles
  noTimeSlotsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noTimeSlotsText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  noTimeSlotsSubtext: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  // ✅ NEW: Enhanced Schedule Styles
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  scheduleIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  scheduleItem: {
    gap: 8,
  },
  scheduleItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleItemLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  schedulePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 60,
  },
  schedulePickerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  schedulePickerLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  schedulePickerDay: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  schedulePickerMonth: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  schedulePickerRight: {
    flex: 1,
    gap: 2,
  },
  schedulePickerWeekday: {
    fontSize: 16,
    fontWeight: '600',
  },
  schedulePickerYear: {
    fontSize: 13,
  },
  schedulePickerTime: {
    fontSize: 16,
    fontWeight: '600',
  },
  schedulePickerDuration: {
    fontSize: 13,
  },
  scheduleErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    gap: 6,
    marginTop: 4,
  },
  scheduleErrorText: {
    fontSize: 13,
    flex: 1,
  },
  // ✅ NEW: Enhanced Modal Styles
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.07)',
    paddingTop: 6, // Add top padding for header
  },
  modalIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enhancedDateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    minHeight: 80,
  },
  enhancedDateOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  enhancedDateOptionLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  enhancedDateOptionDay: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  enhancedDateOptionMonth: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  enhancedDateOptionRight: {
    flex: 1,
    gap: 4,
  },
  enhancedDateOptionWeekday: {
    fontSize: 18,
    fontWeight: '600',
  },
  enhancedDateOptionFullDate: {
    fontSize: 14,
  },
  enhancedDateOptionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  enhancedDateOptionBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  enhancedCancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  enhancedCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // ✅ NEW: Enhanced Time Slot Styles
  enhancedTimeSlotOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    minHeight: 80,
  },
  enhancedTimeSlotContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  enhancedTimeSlotLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  enhancedTimeSlotRight: {
    flex: 1,
    gap: 4,
  },
  enhancedTimeSlotTime: {
    fontSize: 18,
    fontWeight: '600',
  },
  enhancedTimeSlotDuration: {
    fontSize: 14,
  },
  enhancedTimeSlotBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  enhancedTimeSlotBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  // COMPACT: Enhanced Modal Styles
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.07)',
  },
  modalIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enhancedDateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    minHeight: 54,
  },
  enhancedDateOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  enhancedDateOptionLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
  },
  enhancedDateOptionDay: {
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  enhancedDateOptionMonth: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  enhancedDateOptionRight: {
    flex: 1,
    gap: 2,
  },
  enhancedDateOptionWeekday: {
    fontSize: 13,
    fontWeight: '600',
  },
  enhancedDateOptionFullDate: {
    fontSize: 11,
  },
  enhancedDateOptionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 36,
    alignItems: 'center',
  },
  enhancedDateOptionBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  enhancedCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  enhancedCancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // COMPACT: Enhanced Time Slot Styles
  enhancedTimeSlotOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    minHeight: 54,
  },
  enhancedTimeSlotContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  enhancedTimeSlotLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
  },
  enhancedTimeSlotRight: {
    flex: 1,
    gap: 2,
  },
  enhancedTimeSlotTime: {
    fontSize: 13,
    fontWeight: '600',
  },
  enhancedTimeSlotDuration: {
    fontSize: 11,
  },
  enhancedTimeSlotBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 48,
    alignItems: 'center',
  },
  enhancedTimeSlotBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  // COMPACT: Schedule Card
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  scheduleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    gap: 10,
  },
  scheduleItem: {
    gap: 6,
  },
  scheduleItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleItemLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  schedulePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    minHeight: 40,
  },
  schedulePickerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  schedulePickerLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 24,
  },
  schedulePickerDay: {
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  schedulePickerMonth: {
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  schedulePickerRight: {
    flex: 1,
    gap: 1,
  },
  schedulePickerWeekday: {
    fontSize: 11,
    fontWeight: '600',
  },
  schedulePickerYear: {
    fontSize: 9,
  },
  schedulePickerTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  schedulePickerDuration: {
    fontSize: 9,
  },
  scheduleErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 6,
    borderLeftWidth: 3,
    gap: 4,
    marginTop: 2,
  },
  scheduleErrorText: {
    fontSize: 10,
    flex: 1,
  },
  // ✅ NEW: Request Details Modal Style Matching
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalBottomButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    margin: 16,
    marginTop: 8,
  },
  modalBottomButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 