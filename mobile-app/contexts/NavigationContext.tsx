import React, { createContext, useContext, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Animated } from 'react-native';

interface NavigationContextType {
  navigateTo: (route: string, direction?: 'left' | 'right') => void;
  goBack: () => void;
  currentRoute: string;
  isTransitioning: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

interface NavigationProviderProps {
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const router = useRouter();
  const [currentRoute, setCurrentRoute] = useState('/home');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionAnim = useRef(new Animated.Value(0)).current;

  const navigateTo = (route: string, direction: 'left' | 'right' = 'right') => {
    if (isTransitioning || currentRoute === route) return;
    
    setIsTransitioning(true);
    
    // Start transition animation
    Animated.timing(transitionAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // Navigate to new route
      setCurrentRoute(route);
      router.push(route as any);
      
      // Reset animation
      Animated.timing(transitionAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setIsTransitioning(false);
      });
    });
  };

  const goBack = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    // Start transition animation
    Animated.timing(transitionAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // Go back
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/main');
      }
      
      // Reset animation
      Animated.timing(transitionAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setIsTransitioning(false);
      });
    });
  };

  return (
    <NavigationContext.Provider
      value={{
        navigateTo,
        goBack,
        currentRoute,
        isTransitioning,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}; 