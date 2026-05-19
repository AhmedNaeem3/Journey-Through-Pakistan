import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// IMPORTANT: API URL Configuration
// For Android emulator: http://10.0.2.2:3000 (already set)
// For iOS simulator: http://localhost:3000 (already set)
// For Physical Device: Change to your computer's IP address
//   Example: http://192.168.1.100:3000
//   To find your IP: Run 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux)
const API_URL = __DEV__ 
  ? Platform.OS === 'android' 
    ? 'http://10.0.2.2:3000' // Android emulator - DO NOT CHANGE
    : 'http://localhost:3000' // iOS simulator - DO NOT CHANGE
  : 'http://localhost:3000'; // Production - change to your server URL

// Export API_URL for use in other files
export { API_URL };

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// List of endpoints that should fail silently (non-critical features)
const SILENT_FAIL_ENDPOINTS = [
  '/gemini/generate', // Auto description generation - not critical
];

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log('API Success:', response.config.method?.toUpperCase(), response.config.url);
    return response;
  },
  async (error) => {
    const requestUrl = error.config?.url || '';
    const isSilentEndpoint = SILENT_FAIL_ENDPOINTS.some(endpoint => requestUrl.includes(endpoint));
    
    // Log error for debugging (skip for silent endpoints)
    if (error.response) {
      // Server responded with error status
      if (!isSilentEndpoint) {
        console.error('API Error Response:', error.response.status, error.response.data);
      }
    } else if (error.request) {
      // Request was made but no response received (network error)
      if (!isSilentEndpoint) {
        console.error('API Request Error - No response from server');
        console.error('Request URL:', requestUrl);
        console.error('Base URL:', API_URL);
        console.error('Full URL:', error.config?.baseURL + requestUrl);
        console.error('Error details:', error.message);
      }
      
      // Create a more helpful error message
      const networkError = new Error(
        `Cannot connect to server at ${API_URL}.\n\n` +
        `Please check:\n` +
        `1. Server is running on port 3000\n` +
        `2. For Android Emulator: Use http://10.0.2.2:3000\n` +
        `3. For Physical Device: Use your computer's IP (e.g., http://192.168.1.XXX:3000)\n` +
        `4. For iOS Simulator: Use http://localhost:3000`
      );
      networkError.isNetworkError = true;
      return Promise.reject(networkError);
    } else {
      // Error setting up request
      if (!isSilentEndpoint) {
        console.error('API Setup Error:', error.message);
      }
    }
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;

