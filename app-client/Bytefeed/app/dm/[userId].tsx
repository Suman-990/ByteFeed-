import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import api from '../api';
import { AuthContext } from '../auth/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const fmtTime = (d?: string) => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';

export default function DMChatPage() {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const { userId, username } = useLocalSearchParams<{ userId: string; username?: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = useCallback(async () => {
    try { const r = await api.get(`/dm/${userId}`); setMessages(r.data || []); } catch {} finally { setLoading(false); }
  }, [userId]);

  useEffect(() => {
    fetchMessages();
    const connectWS = async () => {
      const jwt = await AsyncStorage.getItem('jwt'); if (!jwt) return;
      try {
        const wsBase = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8080/ws';
        const ws = new WebSocket(`${wsBase}/dm/${userId}?token=${jwt}`); wsRef.current = ws;
        ws.onmessage = (e) => { try { const msg = JSON.parse(e.data); setMessages((p) => [...p, msg]); setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100); } catch {} };
      } catch {}
    };
    connectWS();
    return () => { wsRef.current?.close(); wsRef.current = null; };
  }, [userId, fetchMessages]);

  const handleSend = async () => {
    if (!input.trim()) return; setSending(true);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try { wsRef.current.send(JSON.stringify({ content: input, receiverId: parseInt(userId!, 10) })); setInput(''); setSending(false); return; } catch {}
    }
    try { await api.post('/messages', { content: input, receiverId: parseInt(userId!, 10) }); setInput(''); fetchMessages(); }
    catch (e: any) { Alert.alert('Send failed', e?.response?.data?.error || e.message); }
    finally { setSending(false); }
  };

  const startCall = async () => {
    try { const r = await api.get(`/dm/${userId}/call-token`); router.push({ pathname: '/call', params: r.data }); }
    catch (e: any) { Alert.alert('Call failed', e?.response?.data?.error || e.message); }
  };

  if (loading) return <View className="flex-1 justify-center items-center bg-[#f9f9f9]"><ActivityIndicator size="large" color="#000000" /></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-[#f9f9f9]">
      <View className="bg-[#f9f9f9] border-b border-[#cfc4c5]" style={{ paddingTop: insets.top }}>
        <View className="h-14 flex-row items-center px-4 gap-3">
          <TouchableOpacity onPress={() => router.back()} className="p-1"><Text className="text-xl text-black">←</Text></TouchableOpacity>
          <View className="flex-1"><Text className="text-lg font-semibold text-black">@{username || 'User'}</Text><Text className="text-[11px] text-[#5d5f5f] font-mono">Direct Message</Text></View>
          <TouchableOpacity onPress={startCall} className="bg-black px-3 py-2 rounded-sm"><Text className="text-white text-xs font-semibold">📞 Call</Text></TouchableOpacity>
        </View>
      </View>

      <FlatList ref={flatListRef} data={messages} keyExtractor={(m) => (m.ID || m.id || Math.random()).toString()} contentContainerClassName="py-4 grow justify-end" onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const isOwn = (item.senderId || item.sender?.ID || item.sender?.id) === user?.id;
          return (
            <View className={`px-4 mb-2 items-${isOwn ? 'end' : 'start'}`}>
              <View className={`p-3 rounded-sm max-w-[75%] ${isOwn ? 'bg-black border-0' : 'bg-white border border-[#cfc4c5]'}`}>
                <Text className={`text-sm leading-[21px] ${isOwn ? 'text-white' : 'text-[#1b1b1b]'}`}>{item.content}</Text>
              </View>
              <Text className="text-[10px] text-[#9e9e9e] mt-0.5 font-mono">{fmtTime(item.CreatedAt || item.created_at)}</Text>
            </View>
          );
        }}
        ListEmptyComponent={<View className="items-center justify-center flex-1"><Text className="text-base font-semibold text-black mb-1">@{username || 'User'}</Text><Text className="text-sm text-[#5d5f5f]">Say hello! 👋</Text></View>}
      />

      <View className="flex-row items-center px-4 py-3 bg-white border-t border-[#cfc4c5] gap-2" style={{ paddingBottom: Math.max(12, insets.bottom) }}>
        <TextInput className="flex-1 border border-[#cfc4c5] rounded-sm px-3 py-2.5 text-sm text-black bg-[#f9f9f9]" placeholder="Message..." placeholderTextColor="#9e9e9e" value={input} onChangeText={setInput} returnKeyType="send" onSubmitEditing={handleSend} />
        <TouchableOpacity className={`px-4 py-2.5 rounded-sm ${input.trim() ? 'bg-black' : 'bg-[#dadada]'}`} onPress={handleSend} disabled={sending || !input.trim()}>
          {sending ? <ActivityIndicator color="#ffffff" size="small" /> : <Text className="text-white text-sm font-semibold">Send</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
