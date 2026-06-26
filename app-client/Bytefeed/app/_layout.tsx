import React, { useContext } from 'react';
import { StatusBar, View, Text, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { registerGlobals } from '@livekit/react-native';
registerGlobals();

import { AuthProvider, AuthContext } from './auth/AuthContext';
import '../global.css';

function RootLayoutInner() {
  const { user, loading } = useContext(AuthContext);
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#f9f9f9]">
        <Text className="text-5xl font-extrabold tracking-tighter text-black mb-6">
          VOID
        </Text>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="post/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="post/create" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="community/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="community/create" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="channel/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="channel/create" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="dm/[userId]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="user/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="friend-requests" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="call" options={{ animation: 'fade', presentation: 'fullScreenModal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutInner />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
