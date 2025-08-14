import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import SimpleLoading from '@/components/SimpleLoading';

export default function IndexScreen() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuthAndDecideFlow();
  }, []);

  const checkAuthAndDecideFlow = async () => {
    try {
      setIsCheckingAuth(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (token) {
        // User is authenticated, redirect directly to main app
        console.log('Token found, redirecting to main app');
        router.replace('/main');
      } else {
        // User is not authenticated, redirect to login
        console.log('No token found, redirecting to login');
          router.replace('/login');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      // On error, redirect to login
        router.replace('/login');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Show simple loading while checking auth
  if (isCheckingAuth) {
    return <SimpleLoading message="Checking authentication..." fullScreen={true} />;
  }

  return null; // Don't render anything while redirecting
} 