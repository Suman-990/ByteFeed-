import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import api from '../api';
import { AuthContext } from '../auth/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const fmtTime = (d?: string) => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';

export default function ChannelChatPage() {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const { id, channelName } = useLocalSearchParams<{ id: string; channelName?: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = useCallback(async () => {
    try { const r = await api.get(`/channels/${id}/messages`); setMessages(r.data || []); }
    catch (e) { console.error('Failed to load channel messages:', e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchMessages();
    const connectWS = async () => {
      const jwt = await AsyncStorage.getItem('jwt'); if (!jwt) return;
      const wsBase = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8080/ws';
      const wsUrl = `${wsBase}/channel/${id}?token=${jwt}`;
      try {
        const ws = new WebSocket(wsUrl); wsRef.current = ws;
        ws.onmessage = (e) => { try { const msg = JSON.parse(e.data); setMessages((p) => [...p, msg]); setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100); } catch {} };
        ws.onerror = () => {}; ws.onclose = () => {};
      } catch {}
    };
    connectWS();
    return () => { wsRef.current?.close(); wsRef.current = null; };
  }, [id, fetchMessages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try { wsRef.current.send(JSON.stringify({ content: input, channelId: parseInt(id!, 10) })); setInput(''); setSending(false); return; } catch {}
    }
    try { await api.post('/messages', { content: input, channelId: parseInt(id!, 10) }); setInput(''); fetchMessages(); }
    catch (e: any) { Alert.alert('Send failed', e?.response?.data?.error || e.message); }
    finally { setSending(false); }
  };

  if (loading) return <View className="flex-1 justify-center items-center bg-[#f9f9f9]"><ActivityIndicator size="large" color="#000000" /></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-[#f9f9f9]">
      <View className="bg-[#f9f9f9] border-b border-[#cfc4c5]" style={{ paddingTop: insets.top }}>
        <View className="h-14 flex-row items-center px-4 gap-3">
          <TouchableOpacity onPress={() => router.back()} className="p-1"><Text className="text-xl text-black">←</Text></TouchableOpacity>
          <Text className="text-lg font-semibold text-black flex-1"># {channelName || 'Channel'}</Text>
        </View>
      </View>

      <FlatList ref={flatListRef} data={messages} keyExtractor={(m) => (m.ID || m.id || Math.random()).toString()} contentContainerClassName="py-4" onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const isOwn = (item.senderId || item.sender?.ID || item.sender?.id) === user?.id;
          return (
            <View className="flex-row items-start mb-3 px-4 gap-2">
              {!isOwn && <View className="w-8 h-8 rounded-full bg-[#e2e2e2] justify-center items-center"><Text className="text-xs font-bold text-[#4c4546]">{(item.sender?.username || '?')[0].toUpperCase()}</Text></View>}
              <View className={`flex-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && <Text className="text-xs font-semibold text-black mb-0.5">@{item.sender?.username || 'user'}</Text>}
                <View className={`p-3 rounded-sm max-w-[80%] ${isOwn ? 'bg-black border-0' : 'bg-white border border-[#cfc4c5]'}`}>
                  <Text className={`text-sm leading-[21px] ${isOwn ? 'text-white' : 'text-[#1b1b1b]'}`}>{item.content}</Text>
                </View>
                <Text className="text-[10px] text-[#9e9e9e] mt-0.5 font-mono">{fmtTime(item.CreatedAt || item.created_at)}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<View className="items-center pt-15"><Text className="text-lg font-semibold text-black mb-2"># {channelName || 'Channel'}</Text><Text className="text-sm text-[#5d5f5f]">Start the conversation!</Text></View>}
      />

      <View className="flex-row items-center px-4 py-3 bg-white border-t border-[#cfc4c5] gap-2" style={{ paddingBottom: Math.max(12, insets.bottom) }}>
        <TextInput className="flex-1 border border-[#cfc4c5] rounded-sm px-3 py-2.5 text-sm text-black bg-[#f9f9f9]" placeholder={`Message #${channelName || 'channel'}...`} placeholderTextColor="#9e9e9e" value={input} onChangeText={setInput} returnKeyType="send" onSubmitEditing={handleSend} />
        <TouchableOpacity className={`px-4 py-2.5 rounded-sm ${input.trim() ? 'bg-black' : 'bg-[#dadada]'}`} onPress={handleSend} disabled={sending || !input.trim()}>
          {sending ? <ActivityIndicator color="#ffffff" size="small" /> : <Text className="text-white text-sm font-semibold">Send</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
