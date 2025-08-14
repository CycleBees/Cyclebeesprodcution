import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button, Card } from '@/components/ui';
import Logo from '@/components/Logo';
import { Colors } from '@/constants/Colors';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/Styles';
import { useAppTheme } from '@/hooks/useAppTheme';

const { width, height } = Dimensions.get('window');

interface ModernLoginScreenProps {
  onSendOTP: (phone: string) => Promise<void>;
  loading: boolean;
}

export default function ModernLoginScreen({ onSendOTP, loading }: ModernLoginScreenProps) {
  const { colors, isDark } = useAppTheme();
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isValidPhone, setIsValidPhone] = useState(false);
  
  const logoScale = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;
  useEffect(() => {
    // Start entrance animations
    Animated.sequence([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    validatePhone(phone);
  }, [phone]);

  const validatePhone = (value: string) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    const isValid = phoneRegex.test(value);
    setIsValidPhone(isValid);
    
    if (value.length > 0 && !isValid) {
      setPhoneError('Please enter a valid 10-digit Indian mobile number');
    } else {
      setPhoneError('');
    }
  };

  const handlePhoneChange = (value: string) => {
    // Only allow digits
    const numericValue = value.replace(/[^0-9]/g, '');
    setPhone(numericValue);
  };

  const handleSendOTP = async () => {
    if (!isValidPhone) {
      setPhoneError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    try {
      await onSendOTP(phone);
    } catch (error) {
      console.error('Error sending OTP:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          {/* Background gradient */}
          <View style={styles.backgroundGradient}>
            <View style={[styles.gradientCircle1, { backgroundColor: colors.primary }]} />
            <View style={[styles.gradientCircle2, { backgroundColor: colors.accent1 }]} />
          </View>

          {/* Logo section */}
          <Animated.View
            style={[
              styles.logoSection,
              {
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
              <Logo size="md" useDarkBackground={!isDark} />
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>CycleBees</Text>
            <Text style={[styles.tagline, { color: colors.gray }]}>Your ride. Our responsibility.</Text>
          </Animated.View>

          {/* Login form */}
          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: formOpacity,
                transform: [{ translateY: formTranslateY }],
              },
            ]}
          >
            <Card style={[styles.formCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }] as any}>
              <Text style={[styles.loginTitle, { color: colors.text }]}>Login / Sign Up</Text>

              {/* Phone input */}
              <Input
                value={phone}
                onChangeText={handlePhoneChange}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                maxLength={10}
                leftIcon="call-outline"
                rightIcon={phone.length > 0 ? "close-circle" : undefined}
                onRightIconPress={() => setPhone('')}
                variant="outlined"
                error={phoneError}
                style={styles.phoneInput}
                inputStyle={styles.phoneInputText}
              />

              {/* Send OTP button */}
              <Button
                title={loading ? "Sending..." : "Send OTP"}
                onPress={handleSendOTP}
                disabled={!isValidPhone || loading}
                variant="primary"
                size="lg"
                icon="send"
                loading={loading}
                style={styles.sendOtpButton}
              />

              {/* Terms and conditions */}
              <Text style={[styles.termsText, { color: colors.gray }]}>
                By continuing, you agree to our{' '}
                <Text style={[styles.termsLink, { color: colors.primary }]}>Terms of Service</Text> and{' '}
                <Text style={[styles.termsLink, { color: colors.primary }]}>Privacy Policy</Text>
              </Text>
            </Card>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: 80,
    paddingBottom: SPACING.lg,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  gradientCircle1: {
    position: 'absolute',
    top: '10%',
    right: '-20%',
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.1,
  },
  gradientCircle2: {
    position: 'absolute',
    bottom: '10%',
    left: '-20%',
    width: 150,
    height: 150,
    borderRadius: 75,
    opacity: 0.05,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: 'rgba(0, 0, 0, 0.2)',
        shadowOffset: {
          width: 0,
          height: 8,
        },
        shadowOpacity: 0.4,
        shadowRadius: 32,
        elevation: 12,
      },
    }),
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  formContainer: {
    zIndex: 1,
    width: '100%',
    maxWidth: 400,
  },
  formCard: {
    padding: SPACING.lg,
    borderRadius: 20,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
  },
  loginTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    textAlign: 'center',
    marginBottom: SPACING.md,
    letterSpacing: 0.5,
  },
  loginSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: TYPOGRAPHY.lineHeightNormal * TYPOGRAPHY.sm,
    fontWeight: '400',
  },
  phoneInput: {
    marginBottom: SPACING.xs,
    minHeight: 56,
  },
  phoneInputText: {
    letterSpacing: 0,
  },
  sendOtpButton: {
    marginBottom: SPACING.lg,
    borderRadius: 16,
    paddingVertical: 18,
    minHeight: 56,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  termsText: {
    fontSize: TYPOGRAPHY.xs,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.lineHeightNormal * TYPOGRAPHY.xs,
    fontWeight: '400',
  },
  termsLink: {
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
    textDecorationLine: 'underline',
  },
}); 