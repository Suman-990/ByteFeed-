import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

export default function CallPage() {
  const insets = useSafeAreaInsets();
  const { token, room, wsUrl, identity } = useLocalSearchParams<{ token: string; room: string; wsUrl: string; identity: string }>();
  const [connecting, setConnecting] = useState(true);
  const [connected, setConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => { const t = setTimeout(() => { setConnecting(false); setConnected(true); }, 1500); return () => clearTimeout(t); }, []);
  useEffect(() => { let i: ReturnType<typeof setInterval>; if (connected) i = setInterval(() => setCallDuration((p) => p + 1), 1000); return () => clearInterval(i); }, [connected]);

  const fmtDur = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View className="flex-row justify-between items-center px-6 py-4">
        <View><Text className="text-white text-lg font-semibold">{room || 'Call'}</Text><Text className="text-[#9e9e9e] text-xs font-mono">{identity || 'user'}</Text></View>
        {connected && <View className="bg-[#1b1b1b] px-3 py-1.5 rounded-sm"><Text className="text-white text-sm font-mono">{fmtDur(callDuration)}</Text></View>}
      </View>

      <View className="flex-1 justify-center items-center">
        {connecting ? (
          <View className="items-center"><ActivityIndicator size="large" color="#ffffff" /><Text className="text-white text-base font-medium mt-4">Connecting...</Text></View>
        ) : (
          <View className="items-center">
            <View className="w-[120px] h-[120px] rounded-full bg-[#1b1b1b] justify-center items-center mb-6"><Text className="text-[#5d5f5f] text-5xl font-extrabold">?</Text></View>
            <Text className="text-white text-lg font-semibold">Waiting for participant...</Text>
            <Text className="text-[#5d5f5f] text-xs mt-2 font-mono">Room: {room}</Text>
          </View>
        )}
      </View>

      <View className="flex-row justify-center items-center gap-6 py-8">
        <TouchableOpacity className="w-14 h-14 rounded-full bg-[#1b1b1b] justify-center items-center"><Text className="text-white text-xl">🎙️</Text></TouchableOpacity>
        <TouchableOpacity className="w-16 h-16 rounded-full bg-[#ba1a1a] justify-center items-center" onPress={() => router.back()}><Text className="text-white text-[22px]">✕</Text></TouchableOpacity>
        <TouchableOpacity className="w-14 h-14 rounded-full bg-[#1b1b1b] justify-center items-center"><Text className="text-white text-xl">📹</Text></TouchableOpacity>
      </View>
    </View>
  );
}
