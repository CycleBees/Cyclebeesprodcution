import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/config/api';

interface PreloadData {
  user?: any;
  promotionalCards?: any[];
  contactSettings?: any;
  repairServices?: any[];
  bicycles?: any[];
}

class Preloader {
  private static instance: Preloader;
  private cache: Map<string, any> = new Map();
  private isPreloading = false;

  static getInstance(): Preloader {
    if (!Preloader.instance) {
      Preloader.instance = new Preloader();
    }
    return Preloader.instance;
  }

  async preloadUserData(): Promise<void> {
    if (this.isPreloading) return;
    
    this.isPreloading = true;
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      // Preload user profile
      const userResponse = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        this.cache.set('user', userData.data.user);
      }

      // Preload promotional cards
      try {
        const cardsResponse = await fetch(`${API_BASE_URL}/api/promotional/cards`);
        if (cardsResponse.ok) {
          const cardsData = await cardsResponse.json();
          this.cache.set('promotionalCards', cardsData.data);
        }
      } catch (error) {
        console.log('Failed to preload promotional cards:', error);
      }

      // Preload contact settings
      try {
        const contactResponse = await fetch(`${API_BASE_URL}/api/contact/settings`);
        if (contactResponse.ok) {
          const contactData = await contactResponse.json();
          this.cache.set('contactSettings', contactData.data);
        }
      } catch (error) {
        console.log('Failed to preload contact settings:', error);
      }

    } catch (error) {
      console.error('Preloading failed:', error);
    } finally {
      this.isPreloading = false;
    }
  }

  async preloadRepairData(): Promise<void> {
    try {
      // Preload repair services
      const servicesResponse = await fetch(`${API_BASE_URL}/api/repair/services`);
      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json();
        this.cache.set('repairServices', servicesData.data);
      }

      // Preload time slots
      const timeSlotsResponse = await fetch(`${API_BASE_URL}/api/repair/time-slots`);
      if (timeSlotsResponse.ok) {
        const timeSlotsData = await timeSlotsResponse.json();
        this.cache.set('timeSlots', timeSlotsData.data);
      }
    } catch (error) {
      console.log('Failed to preload repair data:', error);
    }
  }

  async preloadRentalData(): Promise<void> {
    try {
      // Preload bicycles
      const bicyclesResponse = await fetch(`${API_BASE_URL}/api/rental/bicycles`);
      if (bicyclesResponse.ok) {
        const bicyclesData = await bicyclesResponse.json();
        this.cache.set('bicycles', bicyclesData.data);
      }
    } catch (error) {
      console.log('Failed to preload rental data:', error);
    }
  }

  getCachedData(key: string): any {
    return this.cache.get(key);
  }

  setCachedData(key: string, data: any): void {
    this.cache.set(key, data);
  }

  clearCache(): void {
    this.cache.clear();
  }

  isDataCached(key: string): boolean {
    return this.cache.has(key);
  }
}

export default Preloader.getInstance(); 