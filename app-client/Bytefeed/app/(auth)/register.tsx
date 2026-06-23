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

const INTERESTS = [
  'Design', 'Tech', 'Architecture', 'Philosophy',
  'Gaming', 'Minimalism', 'Web3', 'Cybernetics',
];

export default function RegisterScreen() {
  const { register } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert('Missing fields', 'Please fill all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(username, email, password, selectedInterests);
    } catch (e) {
      // AuthContext handles alert
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
        className="bg-[#f9f9f9]"
      >
        <View className="items-center py-16 px-4">
          <View className="w-full max-w-[600px] border border-[#cfc4c5] p-6 bg-white">
            {/* Header */}
            <View className="mb-12 items-center">
              <Text className="text-[48px] font-extrabold tracking-[-2px] text-black mb-4">
                VOID
              </Text>
              <Text className="text-sm text-[#4c4546]">Essentialist creation.</Text>
            </View>

            {/* Credentials */}
            <View className="mb-10">
              <View className="mb-4">
                <Text className="text-xs tracking-[0.24px] text-[#1b1b1b] mb-2 font-mono">
                  USERNAME
                </Text>
                <TextInput
                  className="w-full border border-[#cfc4c5] rounded-sm p-4 text-base font-medium bg-white text-black"
                  placeholder="void_user"
                  placeholderTextColor="#9e9e9e"
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>
              <View className="mb-4">
                <Text className="text-xs tracking-[0.24px] text-[#1b1b1b] mb-2 font-mono">
                  EMAIL
                </Text>
                <TextInput
                  className="w-full border border-[#cfc4c5] rounded-sm p-4 text-base font-medium bg-white text-black"
                  placeholder="hello@void.network"
                  placeholderTextColor="#9e9e9e"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
              <View className="mb-4">
                <Text className="text-xs tracking-[0.24px] text-[#1b1b1b] mb-2 font-mono">
                  PASSWORD
                </Text>
                <TextInput
                  className="w-full border border-[#cfc4c5] rounded-sm p-4 text-base font-medium bg-white text-black"
                  placeholder="••••••••"
                  placeholderTextColor="#9e9e9e"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            {/* Interests */}
            <View className="mb-8">
              <Text className="text-xl font-semibold text-black mb-1">Select Interests</Text>
              <Text className="text-sm text-[#4c4546] mb-4">Curate your initial frequency.</Text>
              <View className="flex-row flex-wrap gap-2">
                {INTERESTS.map((interest) => {
                  const isActive = selectedInterests.includes(interest);
                  return (
                    <TouchableOpacity
                      key={interest}
                      className={`border rounded-sm py-2 px-4 ${isActive ? 'border-black bg-black' : 'border-[#cfc4c5] bg-white'}`}
                      onPress={() => toggleInterest(interest)}
                      activeOpacity={0.7}
                    >
                      <Text className={`text-xs tracking-[0.24px] font-mono ${isActive ? 'text-white' : 'text-[#1b1b1b]'}`}>
                        {interest}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Submit */}
            <View className="pt-4 mt-4 border-t border-[#cfc4c5]">
              <TouchableOpacity
                className={`w-full py-5 rounded-sm items-center ${loading ? 'bg-[#333333]' : 'bg-black'}`}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-white text-[11px] font-bold tracking-[1.1px] uppercase">
                    CREATE ACCOUNT
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Login link */}
          <View className="mt-8 flex-row items-center">
            <Text className="text-sm text-[#5d5f5f]">Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text className="text-sm text-black font-semibold">Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
