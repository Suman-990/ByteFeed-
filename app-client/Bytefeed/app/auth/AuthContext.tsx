import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

export interface User {
  id: number;
  username: string;
  email: string;
  about?: string;
  pfpUrl?: string;
  bannerUrl?: string;
  rating?: number;
  interests?: string[];
}

interface AuthContextProps {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, interests?: string[]) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load token/user from storage on app start
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('jwt');
        const storedUser = await AsyncStorage.getItem('user');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Failed to load auth state', e);
      } finally {
        setLoading(false);
      }
    };
    loadAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Backend AuthResponse: { userId, username, pfpUrl, token }
      const response = await api.post('/auth/login', { email, password });
      const data = response.data;
      const jwt = data.token;
      const loggedUser: User = {
        id: data.userId,
        username: data.username,
        email: email,
        pfpUrl: data.pfpUrl || '',
      };
      await AsyncStorage.setItem('jwt', jwt);
      await AsyncStorage.setItem('user', JSON.stringify(loggedUser));
      setToken(jwt);
      setUser(loggedUser);
    } catch (e: any) {
      const msg = e?.response?.data || e.message;
      Alert.alert('Login failed', typeof msg === 'string' ? msg : JSON.stringify(msg));
      throw e;
    }
  };

  const register = async (username: string, email: string, password: string, interests?: string[]) => {
    try {
      const requestBody: any = { username, email, password };
      if (interests && interests.length > 0) {
        requestBody.interests = interests;
      }
      // Backend AuthResponse: { userId, username, pfpUrl, token }
      const response = await api.post('/auth/register', requestBody);
      const data = response.data;
      const jwt = data.token;
      const newUser: User = {
        id: data.userId,
        username: data.username,
        email: email,
        interests: interests || [],
      };
      await AsyncStorage.setItem('jwt', jwt);
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
      setToken(jwt);
      setUser(newUser);
    } catch (e: any) {
      const msg = e?.response?.data || e.message;
      Alert.alert('Registration failed', typeof msg === 'string' ? msg : JSON.stringify(msg));
      throw e;
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/users/me');
      const userData = response.data;
      const refreshedUser: User = {
        id: userData.ID || userData.id,
        username: userData.username,
        email: userData.email,
        about: userData.about,
        pfpUrl: userData.pfpUrl,
        bannerUrl: userData.bannerUrl,
        rating: userData.rating,
        interests: userData.interests,
      };
      await AsyncStorage.setItem('user', JSON.stringify(refreshedUser));
      setUser(refreshedUser);
    } catch (e) {
      console.error('Failed to refresh user', e);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('jwt');
    await AsyncStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
