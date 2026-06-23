import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { AuthContext } from '../auth/AuthContext';
import { router } from 'expo-router';

export default function LoginScreen() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      // AuthContext already shows alert on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center"
        keyboardShouldPersistTaps="handled"
        className="bg-white"
      >
        <View className="flex-1 justify-center items-center px-6">
          {/* Logo */}
          <Text className="text-[48px] font-extrabold tracking-[-2px] text-black mb-16">
            VOID
          </Text>

          {/* Form Container */}
          <View className="w-full max-w-[400px]">
            {/* Email Input */}
            <View className="mb-6">
              <Text className="text-[11px] font-bold tracking-[1.1px] text-black uppercase mb-2">
                EMAIL ADDRESS
              </Text>
              <TextInput
                className="w-full h-12 px-3 border border-[#E5E5E5] bg-white text-black text-base rounded-sm"
                placeholder="enter.email@void.com"
                placeholderTextColor="#9e9e9e"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password Input */}
            <View className="mb-6">
              <Text className="text-[11px] font-bold tracking-[1.1px] text-black uppercase mb-2">
                PASSWORD
              </Text>
              <TextInput
                className="w-full h-12 px-3 border border-[#E5E5E5] bg-white text-black text-base rounded-sm"
                placeholder="••••••••"
                placeholderTextColor="#9e9e9e"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              className={`w-full h-12 rounded-sm justify-center items-center flex-row gap-2 mt-2 ${loading ? 'bg-[#333333]' : 'bg-black'}`}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text className="text-white text-xl font-semibold">
                    Login
                  </Text>
                  <Text className="text-white text-lg">→</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <View className="mt-10 flex-row items-center">
            <Text className="text-sm text-[#5d5f5f]">
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text className="text-sm text-black font-semibold">
                Register
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
