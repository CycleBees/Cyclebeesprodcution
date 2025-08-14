import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import AuthGuard from '@/components/AuthGuard';
import Logo from '@/components/Logo';
import { Colors } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SvgXml } from 'react-native-svg';

// Import screen components
import HomeScreen from './home';
import BookRepairScreen from './book-repair';
import BookRentalScreen from './book-rental';
import MyRequestsScreen from './my-requests';
import ProfileScreen from './profile';



type Route = 'home' | 'book-repair' | 'book-rental' | 'my-requests' | 'profile';

// Enhanced route parameter types
interface RouteParameters {
  'my-requests': {
    tab?: 'repair' | 'rental';
  };
  'book-repair': {
    step?: number;
  };
  'book-rental': {
    bicycleId?: string;
  };
}

interface NavItem {
  id: Route;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', title: 'Home', icon: 'home' },
  { id: 'book-repair', title: 'Repair', icon: 'construct' },
  { id: 'book-rental', title: 'Rent', icon: 'bicycle' },
  { id: 'my-requests', title: 'Requests', icon: 'list' },
  { id: 'profile', title: 'Profile', icon: 'person' },
];

const logoWhiteBgSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg width="32" height="32" viewBox="0 0 200 200" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;">
    <g transform="matrix(1.11296,0,0,1.11296,-1255.37,-3267.27)">
        <g>
            <g>
                <g transform="matrix(1,0,0,1,-378.339,-0.828352)">
                    <path d="M1583.08,3034.05C1583.08,3049.34 1570.67,3061.75 1555.38,3061.75C1540.1,3061.75 1527.68,3049.34 1527.68,3034.05C1527.68,3018.77 1540.1,3006.36 1555.38,3006.36" style="fill:rgb(255,209,30);fill-opacity:0;stroke:rgb(20,15,0);stroke-width:13.09px;"/>
                </g>
                <g transform="matrix(1,0,0,1,-417.303,0)">
                    <path d="M1610.5,3016.95L1637.64,2990.1L1659.14,3045.76" style="fill:none;stroke:rgb(20,15,0);stroke-width:14.98px;"/>
                </g>
                <g transform="matrix(0.82141,0,0,0.82141,-150.163,548.444)">
                    <circle cx="1720.09" cy="3030.09" r="28.652" style="fill:rgb(255,209,30);stroke:rgb(20,15,0);stroke-width:15.95px;"/>
                </g>
            </g>
        </g>
    </g>
</svg>`;

const logoBlackBgSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg width="32" height="32" viewBox="0 0 200 200" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;">
    <g transform="matrix(0.437985,0,0,0.437985,-593.669,-281.679)">
        <g id="CycleBeesTransparent" transform="matrix(0.737123,0,0,0.737123,1583.77,882.213)">
            <g transform="matrix(1,0,0,1,-366,-366)">
                <g transform="matrix(1,0,0,1,-0.6435,0)">
                    <g>
                        <g>
                            <path d="M321.194,376.826C321.194,429.994 278.028,473.16 224.86,473.16C171.692,473.16 128.526,429.994 128.526,376.826C128.526,323.658 171.692,280.492 224.86,280.492" style="fill:rgb(255,209,30);fill-opacity:0;stroke:white;stroke-width:45.52px;"/>
                            <path d="M281.04,320.205L375.434,226.84L450.21,420.42" style="fill:none;stroke:white;stroke-width:52.08px;"/>
                            <circle cx="522.906" cy="391.305" r="81.855" style="fill:rgb(255,221,88);stroke:white;stroke-width:45.57px;"/>
                        </g>
                    </g>
                </g>
            </g>
            <g>
            </g>
        </g>
    </g>
</svg>`;

export default function MainApp() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const [currentRoute, setCurrentRoute] = useState<Route>('home');
  const [previousRoute, setPreviousRoute] = useState<Route>('home');
  const [requestsInitialTab, setRequestsInitialTab] = useState<'repair' | 'rental' | undefined>(undefined);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Enhanced route parameter validation
  const validateRouteParameter = (route: Route, param: string): boolean => {
    console.log('🔍 Validating route parameter:', { route, param });
    
    switch (route) {
      case 'my-requests':
        return param === 'repair' || param === 'rental';
      case 'book-repair':
        const step = parseInt(param);
        return !isNaN(step) && step >= 1 && step <= 5;
      case 'book-rental':
        return param.length > 0; // Basic validation for bicycleId
      default:
        return false;
    }
  };

  // Enhanced route parsing with validation
  const parseRouteWithParams = (route: string): { 
    actualRoute: Route; 
    params: any; 
    isValid: boolean; 
    error?: string; 
  } => {
    console.log('🔍 Parsing route:', route);
    
    if (!route.includes(':')) {
      return {
        actualRoute: route as Route,
        params: {},
        isValid: true
      };
    }

    const [baseRoute, param] = route.split(':');
    const actualRoute = baseRoute as Route;
    
    // Validate the route exists
    if (!NAV_ITEMS.find(item => item.id === actualRoute)) {
      return {
        actualRoute: 'home' as Route,
        params: {},
        isValid: false,
        error: `Invalid route: ${baseRoute}`
      };
    }

    // Validate the parameter
    if (!validateRouteParameter(actualRoute, param)) {
      return {
        actualRoute: 'home' as Route,
        params: {},
        isValid: false,
        error: `Invalid parameter '${param}' for route '${actualRoute}'`
      };
    }

    // Parse parameters based on route
    let params: any = {};
    switch (actualRoute) {
      case 'my-requests':
        params = { tab: param as 'repair' | 'rental' };
        break;
      case 'book-repair':
        params = { step: parseInt(param) };
        break;
      case 'book-rental':
        params = { bicycleId: param };
        break;
    }

    console.log('🔍 Route parsed successfully:', { actualRoute, params });
    return { actualRoute, params, isValid: true };
  };

  useEffect(() => {
    // Check if user is authenticated
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.replace('/login');
    }
  };

  const navigateTo = (route: Route | string) => {
    console.log('🔍 navigateTo called with route:', route);
    
    // Parse route with enhanced validation
    const { actualRoute, params, isValid, error } = parseRouteWithParams(route);
    
    if (!isValid) {
      console.error('❌ Navigation error:', error);
      // Fallback to home route on error
      if (currentRoute !== 'home') {
        navigateTo('home');
      }
      return;
    }
    
    if (currentRoute === actualRoute) {
      console.log('🔍 Already on route:', actualRoute);
      return;
    }

    console.log('🔍 Navigating to:', { actualRoute, params });

    // Store previous route before changing
    setPreviousRoute(currentRoute);

    // Set transitioning state
    setIsTransitioning(true);

    // Smooth loading transition with black overlay
    Animated.sequence([
      // Step 1: Fade content out and overlay in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]),
      // Step 2: Change route while overlay is visible
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Change route
      setCurrentRoute(actualRoute);
      
      // Step 3: Fade overlay out and content in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => {
        setIsTransitioning(false);
      });
    });
    
    // Handle route-specific parameters
    if (actualRoute === 'my-requests' && params.tab) {
      console.log('🔍 Setting requestsInitialTab to:', params.tab);
      setRequestsInitialTab(params.tab);
    }
    
    // Log successful navigation
    console.log('✅ Navigation completed:', { 
      from: currentRoute, 
      to: actualRoute, 
      params
    });
  };

  const renderContent = () => {
    return (
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {currentRoute === 'home' && <HomeScreen onNavigate={(route: string) => navigateTo(route as Route)} />}
        {currentRoute === 'book-repair' && <BookRepairScreen onNavigate={(route: string) => navigateTo(route as Route)} />}
        {currentRoute === 'book-rental' && <BookRentalScreen onNavigate={(route: string) => navigateTo(route as Route)} />}
        {currentRoute === 'my-requests' && <MyRequestsScreen 
          onNavigate={(route: string) => navigateTo(route as Route)} 
          initialTab={requestsInitialTab}
          onInitialTabUsed={() => setRequestsInitialTab(undefined)}
        />}
        {currentRoute === 'profile' && <ProfileScreen onNavigate={(route: string) => navigateTo(route as Route)} />}
      </Animated.View>
    );
  };

  return (
    <AuthGuard message="Loading your app...">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Static Header */}
        <SafeAreaView style={[styles.headerContainer, { backgroundColor: isDark ? colors.cardBackground : colors.primary }]}>
          <View style={[styles.header, { backgroundColor: isDark ? colors.cardBackground : colors.primary }]}>
            <View style={styles.logoContainer}>
              {isDark ? (
                <SvgXml width={32} height={32} xml={logoBlackBgSvg} />
              ) : (
                <SvgXml width={32} height={32} xml={logoWhiteBgSvg} />
              )}
              <Text style={[styles.logoText, { color: isDark ? colors.primary : '#2D3E50' }]}>CycleBees</Text>
            </View>
            <Text style={[styles.titleText, { color: isDark ? colors.text : '#2D3E50' }]}>
              {NAV_ITEMS.find(item => item.id === currentRoute)?.title || 'CycleBees'}
            </Text>
          </View>
        </SafeAreaView>

        {/* Content Area */}
        <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
          {renderContent()}
          
          {/* Transition Overlay for Smooth Transitions */}
          <Animated.View 
            style={[
              styles.transitionOverlay,
              { opacity: overlayAnim, backgroundColor: colors.background }
            ]}
            pointerEvents={isTransitioning ? 'auto' : 'none'}
          />
        </View>

        {/* Static Bottom Navigation */}
        <View style={[styles.bottomNavContainer, { backgroundColor: colors.cardBackground }]}>
          <View style={[styles.bottomNav, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
            {NAV_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.navItem}
                onPress={() => navigateTo(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={item.icon} 
                  size={24} 
                  color={currentRoute === item.id ? colors.primary : colors.gray} 
                />
                <Text style={[
                  styles.navText,
                  { color: colors.gray },
                  currentRoute === item.id && { color: colors.primary, fontWeight: '600' }
                ]}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
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
    marginLeft: 8,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    width: '100%',
  },
  transitionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // backgroundColor now handled dynamically
    zIndex: 1000,
  },
  bottomNavContainer: {
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    paddingTop: 6,
    minHeight: Platform.OS === 'ios' ? 75 : 65,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  navText: {
    fontSize: 11,
    marginTop: 1,
    fontWeight: '500',
  },
  navTextActive: {
    fontWeight: '600',
  },
}); 