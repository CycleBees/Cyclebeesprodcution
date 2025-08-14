// API Configuration for Expo Mobile App
// Environment-based API URL configuration

const getApiUrl = () => {
  // Check if we're in development mode
  if (__DEV__) {
    // For development, use local IP - update this to your computer's IP
    return 'http://192.168.1.48:3000';
  }
  
  // For production/preview builds, use the deployed API
  return 'https://your-backend-api.vercel.app';
};

export const API_BASE_URL = getApiUrl();

console.log('🌐 API Base URL:', API_BASE_URL);
console.log('📱 Environment:', __DEV__ ? 'Development' : 'Production'); 