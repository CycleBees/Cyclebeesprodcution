// API Configuration for Expo Mobile App
// Environment-based API URL configuration

// 📱 MOBILE APP CONNECTION SETUP:
// When running on a physical device via Expo QR code, your phone needs your computer's IP address
// 
// To find your IP address:
// Windows: Open Command Prompt and run: ipconfig
// Mac/Linux: Open Terminal and run: ifconfig or ip addr show
// 
// Look for your local network IP (usually starts with 192.168.x.x or 10.x.x.x)
// Update the DEVELOPMENT_API_URL below with your computer's IP address

const DEVELOPMENT_API_URL = 'http://192.168.1.45:3000'; // ✅ Your computer's IP address

const getApiUrl = () => {
  // Check if we're in development mode
  if (__DEV__) {
    return DEVELOPMENT_API_URL;
  }
  
  // For production/preview builds, use the deployed API
  return 'https://your-backend-api.vercel.app';
};

export const API_BASE_URL = getApiUrl();

console.log('🌐 API Base URL:', API_BASE_URL);
console.log('📱 Environment:', __DEV__ ? 'Development' : 'Production'); 