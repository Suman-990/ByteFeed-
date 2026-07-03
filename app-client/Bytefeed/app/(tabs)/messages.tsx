import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image, RefreshControl, SectionList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import api from '../api';
import { AuthContext } from '../auth/AuthContext';

interface DMConversation {
  userId: number;
  username: string;
  avatarUrl?: string;
  type: 'recent' | 'friend';
}

export default function MessagesTab() {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [friends, setFriends] = useState<DMConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Load both DM history and friends list in parallel.
      // The Messages tab was previously blank because /dm only returns users
      // with existing message history — new friends never appeared.
      const [dmRes, friendsRes] = await Promise.allSettled([
        api.get('/dm'),
        api.get('/users/me/friends'),
      ]);

      const dmList: DMConversation[] = dmRes.status === 'fulfilled'
        ? (dmRes.value.data || []).map((d: any) => ({
            userId: d.userId,
            username: d.username,
            avatarUrl: d.avatarUrl,
            type: 'recent' as const,
          }))
        : [];

      const friendList: DMConversation[] = friendsRes.status === 'fulfilled'
        ? (friendsRes.value.data || []).map((f: any) => ({
            userId: f.ID || f.id,
            username: f.username,
            avatarUrl: f.pfpUrl,
            type: 'friend' as const,
          }))
        : [];

      // Merge: show DM partners first, then friends who haven't been messaged yet
      const dmUserIds = new Set(dmList.map((d) => d.userId));
      const newFriends = friendList.filter((f) => !dmUserIds.has(f.userId));

      setConversations(dmList);
      setFriends(newFriends);
    } catch (e) {
      console.error('Failed to load messages/friends', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navigateToDM = (item: DMConversation) => {
    router.push({
      pathname: '/dm/[userId]',
      params: { userId: item.userId.toString(), username: item.username },
    });
  };

  const renderItem = (item: DMConversation) => (
    <TouchableOpacity
      className="bg-white border border-[#cfc4c5] p-4 mb-2 flex-row items-center gap-3"
      onPress={() => navigateToDM(item)}
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
        <Text className="text-xs text-[#5d5f5f] font-mono mt-0.5">
          {item.type === 'recent' ? 'Tap to continue conversation' : 'Start a conversation'}
        </Text>
      </View>
      <Text className="text-sm text-[#cfc4c5]">→</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <View className="flex-1 justify-center items-center bg-[#f9f9f9]"><ActivityIndicator size="large" color="#000000" /></View>;
  }

  const allEmpty = conversations.length === 0 && friends.length === 0;

  return (
    <View className="flex-1 bg-[#f9f9f9]">
      <View className="bg-[#f9f9f9] border-b border-[#cfc4c5]" style={{ paddingTop: insets.top }}>
        <View className="h-14 flex-row justify-between items-center px-4">
          <Text className="text-2xl font-bold text-black tracking-tight">Messages</Text>
          <Text className="text-[13px] text-[#5d5f5f] font-mono">{conversations.length} chats</Text>
        </View>
      </View>

      <SectionList
        sections={[
          ...(conversations.length > 0 ? [{ title: 'Recent', data: conversations }] : []),
          ...(friends.length > 0 ? [{ title: 'Friends', data: friends }] : []),
        ]}
        keyExtractor={(item) => `${item.type}-${item.userId}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor="#000000"
          />
        }
        renderSectionHeader={({ section }) => (
          <Text className="text-[11px] font-bold tracking-[1.1px] text-[#5d5f5f] uppercase mb-2 mt-2">
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => renderItem(item)}
        ListEmptyComponent={
          allEmpty ? (
            <View className="items-center pt-15">
              <Text className="text-lg font-semibold text-black mb-2">No conversations yet</Text>
              <Text className="text-sm text-[#5d5f5f] text-center">
                Add friends from the Search tab to start chatting
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
