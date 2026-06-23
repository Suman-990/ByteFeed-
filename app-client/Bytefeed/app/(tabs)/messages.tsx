import React, { useEffect, useState, useContext } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import api from '../api';
import { AuthContext } from '../auth/AuthContext';

interface DMConversation {
  userId: number;
  username: string;
  avatarUrl?: string;
}

export default function MessagesTab() {
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/dm');
      setConversations(res.data || []);
    } catch (e) { console.error('Failed to load DMs', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchConversations(); }, []);

  if (loading) {
    return <View className="flex-1 justify-center items-center bg-[#f9f9f9]"><ActivityIndicator size="large" color="#000000" /></View>;
  }

  return (
    <View className="flex-1 bg-[#f9f9f9]">
      <View className="bg-[#f9f9f9] border-b border-[#cfc4c5]" style={{ paddingTop: insets.top }}>
        <View className="h-14 flex-row justify-between items-center px-4">
          <Text className="text-2xl font-bold text-black tracking-tight">Messages</Text>
          <Text className="text-[13px] text-[#5d5f5f] font-mono">{conversations.length} chats</Text>
        </View>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(i) => i.userId.toString()}
        contentContainerClassName="p-4 pb-[100px]"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchConversations(); }} tintColor="#000000" />}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="bg-white border border-[#cfc4c5] p-4 mb-2 flex-row items-center gap-3"
            onPress={() => router.push({ pathname: '/dm/[userId]', params: { userId: item.userId.toString(), username: item.username } })}
          >
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} className="w-11 h-11 rounded-full bg-[#e2e2e2]" />
            ) : (
              <View className="w-11 h-11 rounded-full bg-[#e2e2e2] justify-center items-center">
                <Text className="text-base font-bold text-[#4c4546]">{item.username[0]?.toUpperCase() || '?'}</Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="text-base font-semibold text-black">@{item.username}</Text>
              <Text className="text-xs text-[#5d5f5f] font-mono mt-0.5">Tap to continue conversation</Text>
            </View>
            <Text className="text-sm text-[#cfc4c5]">→</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center pt-15">
            <Text className="text-lg font-semibold text-black mb-2">No conversations</Text>
            <Text className="text-sm text-[#5d5f5f]">Start chatting with a friend</Text>
          </View>
        }
      />
    </View>
  );
}
