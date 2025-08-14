/**
 * Navigation Utility
 * Centralized navigation functions with enhanced validation and fallback logic
 */

import { Alert, Linking } from 'react-native';

// Internal route definitions
export const INTERNAL_ROUTES = [
  'home',
  'book-repair', 
  'book-rental',
  'my-requests',
  'profile'
] as const;

export type InternalRoute = typeof INTERNAL_ROUTES[number];

// Navigation error types
export interface NavigationError {
  type: 'invalid_route' | 'external_link_failed' | 'navigation_failed';
  message: string;
  originalError?: any;
}

// Route validation result
export interface RouteValidationResult {
  isValid: boolean;
  type: 'internal' | 'external' | 'invalid';
  route?: string;
  error?: NavigationError;
}

export class NavigationUtils {
  /**
   * Validate if a route is an internal route
   */
  static isInternalRoute(route: string): boolean {
    const cleanRoute = route.replace(/^\/+/, ''); // Remove leading slashes
    return INTERNAL_ROUTES.includes(cleanRoute as InternalRoute);
  }

  /**
   * Validate if a link is an external link
   */
  static isExternalLink(link: string): boolean {
    return link.startsWith('http://') || link.startsWith('https://');
  }

  /**
   * Validate a route and determine its type
   */
  static validateRoute(route: string): RouteValidationResult {
    console.log('🔍 Validating route:', route);

    if (!route || typeof route !== 'string') {
      return {
        isValid: false,
        type: 'invalid',
        error: {
          type: 'invalid_route',
          message: 'Route is empty or invalid'
        }
      };
    }

    // Check if it's an internal route
    if (this.isInternalRoute(route)) {
      const cleanRoute = route.replace(/^\/+/, '');
      return {
        isValid: true,
        type: 'internal',
        route: cleanRoute
      };
    }

    // Check if it's an external link
    if (this.isExternalLink(route)) {
      return {
        isValid: true,
        type: 'external',
        route: route
      };
    }

    // Invalid route
    return {
      isValid: false,
      type: 'invalid',
      error: {
        type: 'invalid_route',
        message: `Invalid route: ${route}`
      }
    };
  }

  /**
   * Safe navigation with comprehensive fallback logic
   */
  static async safeNavigate(
    route: string,
    onNavigate?: (route: string) => void,
    router?: any,
    fallbackRoute: string = 'home'
  ): Promise<{ success: boolean; error?: NavigationError }> {
    console.log('🚀 Safe navigation called with:', { route, hasOnNavigate: !!onNavigate, hasRouter: !!router });

    try {
      const validation = this.validateRoute(route);

      if (!validation.isValid) {
        console.error('❌ Route validation failed:', validation.error);
        return {
          success: false,
          error: validation.error
        };
      }

      if (validation.type === 'internal') {
        console.log('🏠 Navigating to internal route:', validation.route);
        
        if (onNavigate) {
          onNavigate(validation.route!);
          return { success: true };
        } else if (router) {
          router.push(`/${validation.route}`);
          return { success: true };
        } else {
          throw new Error('No navigation method available');
        }
      }

      if (validation.type === 'external') {
        console.log('🌐 Opening external link:', validation.route);
        
        try {
          await Linking.openURL(validation.route!);
          return { success: true };
        } catch (error) {
          console.error('❌ Failed to open external link:', error);
          return {
            success: false,
            error: {
              type: 'external_link_failed',
              message: 'Failed to open external link',
              originalError: error
            }
          };
        }
      }

      return { success: false };

    } catch (error) {
      console.error('❌ Navigation error:', error);
      return {
        success: false,
        error: {
          type: 'navigation_failed',
          message: 'Navigation failed',
          originalError: error
        }
      };
    }
  }

  /**
   * Handle navigation errors gracefully
   */
  static handleNavigationError(
    error: NavigationError,
    fallbackRoute: string = 'home',
    onNavigate?: (route: string) => void
  ): void {
    console.error('🚨 Navigation error:', error);

    // Show user-friendly error message
    let userMessage = 'Navigation failed';
    
    switch (error.type) {
      case 'invalid_route':
        userMessage = 'Invalid destination';
        break;
      case 'external_link_failed':
        userMessage = 'Unable to open link';
        break;
      case 'navigation_failed':
        userMessage = 'Navigation failed';
        break;
    }

    Alert.alert('Navigation Error', userMessage, [
      {
        text: 'OK',
        onPress: () => {
          // Navigate to fallback route if available
          if (onNavigate && fallbackRoute) {
            console.log('🔄 Navigating to fallback route:', fallbackRoute);
            onNavigate(fallbackRoute);
          }
        }
      }
    ]);
  }

  /**
   * Extract link from promotional card with fallback
   */
  static extractCardLink(card: any): string | null {
    const possibleFields = [
      'externalLink',
      'external_link', 
      'link',
      'url',
      'redirect_url',
      'redirectUrl',
      'action_url',
      'actionUrl'
    ];

    for (const field of possibleFields) {
      if (card[field] && typeof card[field] === 'string') {
        return card[field];
      }
    }

    return null;
  }

  /**
   * Enhanced promotional card navigation
   */
  static async handleCardNavigation(
    card: any,
    onNavigate?: (route: string) => void,
    router?: any
  ): Promise<{ success: boolean; error?: NavigationError }> {
    console.log('🎯 Handling card navigation:', card);

    const link = this.extractCardLink(card);

    if (!link) {
      console.log('❌ No link found in card');
      return {
        success: false,
        error: {
          type: 'invalid_route',
          message: 'No link found in promotional card'
        }
      };
    }

    console.log('📎 Extracted link:', link);

    return await this.safeNavigate(link, onNavigate, router);
  }
}

export default NavigationUtils; 