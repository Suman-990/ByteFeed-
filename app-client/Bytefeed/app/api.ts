import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://unseated-bright-renovate.ngrok-free.dev/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    // Bypass ngrok's browser interstitial warning page for non-browser clients (mobile app).
    // This header is ignored by real servers and only affects ngrok's proxy layer.
    'ngrok-skip-browser-warning': 'true',
  },
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('jwt');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
