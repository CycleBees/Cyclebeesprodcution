import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import ModernLoginScreen from '@/components/ModernLoginScreen';
import SimpleLoading from '@/components/SimpleLoading';
import Logo from '@/components/Logo';
import { Button, Card, Input } from '@/components/ui';
import { Colors } from '@/constants/Colors';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/Styles';
import { API_BASE_URL } from '@/config/api';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const [step, setStep] = useState<'phone' | 'otp' | 'register'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [registrationData, setRegistrationData] = useState({
    full_name: '',
    email: '',
    age: '',
    pincode: '',
    address: ''
  });
  const [errors, setErrors] = useState({
    phone: '',
    email: '',
    full_name: '',
    age: '',
    pincode: '',
    address: '',
    general: ''
  });
  const [otpError, setOtpError] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsCheckingAuth(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (token) {
        // User is already authenticated, redirect to main app
        console.log('User already authenticated, redirecting to main app');
        router.replace('/main');
        return;
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Clear any existing user state when login page loads (only if not authenticated)
  useEffect(() => {
    if (!isCheckingAuth) {
      const clearUserState = async () => {
        try {
          // Clear all storage to ensure clean logout
          await AsyncStorage.clear();
          console.log('Cleared all storage on login page load');
          
          // Reset all state
          setPhone('');
          setOtp('');
          setIsNewUser(false);
          setRegistrationData({
            full_name: '',
            email: '',
            age: '',
            pincode: '',
            address: ''
          });
          console.log('Reset all login state');
        } catch (error) {
          console.error('Error clearing user state:', error);
        }
      };
      
      clearUserState();
    }
  }, [isCheckingAuth]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (otpCooldown > 0) {
      timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  const handleSendOTP = async (phoneNumber: string) => {
    setPhone(phoneNumber);
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: phoneNumber })
      });
      const data = await response.json();
      if (response.ok) {
        setStep('otp');
        setOtpCooldown(30);
        Alert.alert('Success', 'OTP sent to your phone number');
      } else {
        Alert.alert('Error', data.message || 'Failed to send OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (value: string) => {
    return /.+@.+\..+/.test(value);
  };

  const handleVerifyOTP = async () => {
    setOtpError('');
    if (!otp || otp.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone, otp })
      });
      const data = await response.json();
      if (response.ok) {
        if (data.data.isNewUser) {
          setIsNewUser(true);
          setStep('register');
        } else {
          await AsyncStorage.setItem('userToken', data.data.token);
          router.replace('/main');
        }
      } else {
        setOtpError(data.message || 'Invalid OTP');
      }
    } catch (error) {
      setOtpError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    // Validate registration data
    const { full_name, email, age, pincode, address } = registrationData;
    let hasError = false;
    let newErrors = { ...errors, general: '' };
    if (!full_name) {
      newErrors.full_name = 'Full name is required';
      hasError = true;
    } else {
      newErrors.full_name = '';
    }
    if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
      hasError = true;
    } else {
      newErrors.email = '';
    }
    if (!age || isNaN(Number(age)) || Number(age) < 1 || Number(age) > 120) {
      newErrors.age = 'Please enter a valid age';
      hasError = true;
    } else {
      newErrors.age = '';
    }
    if (!pincode || pincode.length !== 6) {
      newErrors.pincode = 'Pincode must be 6 digits';
      hasError = true;
    } else {
      newErrors.pincode = '';
    }
    if (!address || address.trim().length < 10) {
      newErrors.address = 'Please enter a valid address (minimum 10 characters)';
      hasError = true;
    } else {
      newErrors.address = '';
    }

    setErrors(newErrors);

    if (hasError) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone,
          ...registrationData
        })
      });
      const data = await response.json();
      if (response.ok) {
        await AsyncStorage.setItem('userToken', data.data.token);
        router.replace('/main');
      } else {
        setErrors(prev => ({ ...prev, general: data.message || 'Registration failed' }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, general: 'Network error. Please try again.' }));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (otpCooldown > 0) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone })
      });
      const data = await response.json();
      if (response.ok) {
        setOtpCooldown(30);
        Alert.alert('Success', 'OTP resent to your phone number');
      } else {
        Alert.alert('Error', data.message || 'Failed to resend OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show simple loading while checking auth
  if (isCheckingAuth) {
    return <SimpleLoading message="Checking authentication..." fullScreen={true} />;
  }

  // Show phone input step
  if (step === 'phone') {
    return <ModernLoginScreen onSendOTP={handleSendOTP} loading={loading} />;
  }

  const renderOTPStep = () => (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          {/* Back button at top left */}
          <TouchableOpacity
            style={styles.backButtonTop}
            onPress={() => setStep('phone')}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          {/* Logo section - centered like login page */}
          <View style={styles.logoSection}>
            <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
              <Logo size="md" useDarkBackground={!isDark} />
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>CycleBees</Text>
            <Text style={[styles.tagline, { color: colors.gray }]}>Your ride. Our responsibility.</Text>
          </View>

          {/* OTP Form */}
          <View style={styles.formContainer}>
            <Card style={[styles.formCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }] as any}>
              <Text style={[styles.loginTitle, { color: colors.text }]}>Verify OTP</Text>

              {/* OTP input */}
              <Input
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus={true}
                error={otpError}
                variant="outlined"
                style={styles.phoneInput}
                inputStyle={styles.phoneInputText}
              />

              {/* Verify OTP button */}
              <Button
                title={loading ? "Verifying..." : "Verify OTP"}
                onPress={handleVerifyOTP}
                disabled={!otp || otp.length !== 6 || loading}
                variant="primary"
                size="lg"
                icon="checkmark"
                loading={loading}
                style={styles.verifyOtpButton}
              />

              {/* Resend OTP button */}
              <Button
                title={otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend OTP"}
                onPress={handleResendOTP}
                disabled={otpCooldown > 0}
                variant="ghost"
                size="md"
                icon={otpCooldown > 0 ? "time-outline" : "refresh-outline"}
                style={styles.resendOtpButton}
              />

              {/* Terms and conditions */}
              <Text style={[styles.termsText, { color: colors.gray }]}>
                By continuing, you agree to our{' '}
                <Text style={[styles.termsLink, { color: colors.primary }]}>Terms of Service</Text> and{' '}
                <Text style={[styles.termsLink, { color: colors.primary }]}>Privacy Policy</Text>
              </Text>
            </Card>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );

  const renderRegisterStep = () => (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.registerContent}>
          {/* Back Button - Top Left */}
          <TouchableOpacity
            style={styles.registerBackButton}
            onPress={() => setStep('otp')}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          {/* Logo Section - Top Center */}
          <View style={styles.registerLogoSection}>
            <View style={[styles.registerLogoContainer, { backgroundColor: colors.primary }]}>
              <Logo size="md" useDarkBackground={!isDark} />
            </View>
            <Text style={[styles.registerAppName, { color: colors.text }]}>CycleBees</Text>
          </View>

          {/* Registration Form - Center */}
          <View style={styles.registerFormContainer}>
            <Card variant="elevated" padding="lg" style={styles.registrationCard}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Create Your Profile</Text>
              <Text style={[styles.formSubtitle, { color: colors.gray }]}>
                Please provide your details to complete registration
              </Text>

              {errors.general ? (
                <View style={[styles.errorContainer, { backgroundColor: `rgba(220, 53, 69, 0.1)`, borderLeftColor: colors.error }]}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{errors.general}</Text>
                </View>
              ) : null}

              <View style={styles.formFields}>
                <Input
                  label="Full Name *"
                  placeholder="Enter your full name"
                  value={registrationData.full_name}
                  onChangeText={(text) => setRegistrationData(prev => ({ ...prev, full_name: text }))}
                  error={errors.full_name}
                  fullWidth
                  style={styles.formInput}
                />

                <Input
                  label="Email Address *"
                  placeholder="Enter your email"
                  value={registrationData.email}
                  onChangeText={(text) => setRegistrationData(prev => ({ ...prev, email: text }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email}
                  fullWidth
                  style={styles.formInput}
                />

                <View style={styles.row}>
                  <View style={styles.ageInputContainer}>
                    <Input
                      label="Age *"
                      placeholder="Enter your age (e.g., 25)"
                      value={registrationData.age}
                      onChangeText={(text) => setRegistrationData(prev => ({ ...prev, age: text }))}
                      keyboardType="number-pad"
                      error={errors.age}
                      fullWidth
                      style={styles.ageInput}
                    />
                  </View>

                  <View style={styles.pincodeInputContainer}>
                    <Input
                      label="Pincode *"
                      placeholder="Enter your 6-digit pincode"
                      value={registrationData.pincode}
                      onChangeText={(text) => setRegistrationData(prev => ({ ...prev, pincode: text }))}
                      keyboardType="number-pad"
                      maxLength={6}
                      error={errors.pincode}
                      fullWidth
                      style={styles.pincodeInput}
                    />
                  </View>
                </View>

                <Input
                  label="Address *"
                  placeholder="Enter your complete address"
                  value={registrationData.address}
                  onChangeText={(text) => setRegistrationData(prev => ({ ...prev, address: text }))}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  inputStyle={styles.textArea}
                  error={errors.address}
                  fullWidth
                  style={styles.addressInput}
                />

                <Button
                  title="Complete Registration"
                  onPress={handleRegister}
                  loading={loading}
                  fullWidth
                  style={styles.registerButton}
                />
              </View>
            </Card>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );

  if (step === 'otp') {
    return renderOTPStep();
  }

  if (step === 'register') {
    return renderRegisterStep();
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
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
  mainContent: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
  },
  placeholder: {
    width: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 12,
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
  formTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
  },
  formSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: TYPOGRAPHY.sm * 1.4,
    fontWeight: '400',
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: TYPOGRAPHY.xl,
    fontWeight: '600',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  errorText: {
    fontSize: TYPOGRAPHY.xs,
    marginLeft: SPACING.xs,
    fontWeight: '500',
  },
  verifyButton: {
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
  resendContainer: {
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minWidth: 180,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resendButtonDisabled: {
    // These will be applied dynamically based on theme
  },
  resendButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendButtonText: {
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
    fontSize: TYPOGRAPHY.base,
    marginLeft: SPACING.sm,
    letterSpacing: 0.5,
  },
  resendButtonTextDisabled: {
    fontWeight: TYPOGRAPHY.fontWeightBold,
  },
  registerButton: {
    marginTop: SPACING.lg,
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
  // Additional styles for OTP page consistency
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
  // OTP page specific button styles
  verifyOtpButton: {
    marginBottom: SPACING.sm, // Reduced gap between verify and resend
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
  resendOtpButton: {
    marginBottom: SPACING.md, // Reduced by 20% from SPACING.lg
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  // Back button at top left
  backButtonTop: {
    position: 'absolute',
    top: 40,
    left: SPACING.md,
    zIndex: 10,
    padding: SPACING.sm,
  },
  // Registration form specific styles
  registrationCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
  },
  formFields: {
    marginTop: SPACING.sm,
  },
  formInput: {
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: SPACING.sm,
  },
  halfWidth: {
    flex: 1,
  },
  ageInput: {
    marginBottom: SPACING.sm,
    width: '100%',
  },
  pincodeInput: {
    marginBottom: SPACING.sm,
    width: '100%',
  },
  // Registration specific layout styles
  registerContent: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  registerBackButton: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    zIndex: 10,
    padding: SPACING.sm,
  },
  registerLogoSection: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  registerLogoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  registerAppName: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  registerFormContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: SPACING.lg,
  },
  addressInput: {
    marginBottom: SPACING.xs,
  },
  ageInputContainer: {
    width: '49%',
  },
  pincodeInputContainer: {
    width: '49%',
  },
}); 