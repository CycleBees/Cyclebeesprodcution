// API Configuration for Admin Dashboard
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL || 'https://your-backend-api.vercel.app'
  : 'http://localhost:3000';

console.log('🌐 Admin Dashboard API URL:', API_BASE_URL);
console.log('📊 Environment:', process.env.NODE_ENV); 