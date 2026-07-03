import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Image, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import api from '../api';

type SearchType = 'communities' | 'users';

interface CommunityResult {
  type: 'community';
  id: number;
  name: string;
  description?: string;
  iconUrl?: string;
  memberCount?: number;
  isMember?: boolean;
}

interface UserResult {
  type: 'user';
  id: number;
  username: string;
  pfpUrl?: string;
  about?: string;
}

type SearchResult = CommunityResult | UserResult;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchType>('communities');

  // Root cause: previously returned nothing until a query was typed.
  // Now calls the API with an empty query which returns defaults (most popular
  // communities or most recently registered users).
  const doSearch = useCallback(async (searchQuery: string, tab: SearchType) => {
    setLoading(true);
    try {
      if (tab === 'communities') {
        const res = await api.get(`/communities/search?q=${encodeURIComponent(searchQuery)}`);
        setResults((res.data || []).map((c: any) => ({
          type: 'community' as const,
          id: c.ID || c.id,
          name: c.name,
          description: c.about || c.description,
          iconUrl: c.iconUrl,
          memberCount: c.memberCount,
          isMember: c.isMember ?? false,
        })));
      } else {
        const res = await api.get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
        setResults((res.data || []).map((u: any) => ({
          type: 'user' as const,
          id: u.ID || u.id,
          username: u.username,
          pfpUrl: u.pfpUrl,
          about: u.about,
        })));
      }
    } catch (e) {
      console.error('Search failed:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load defaults immediately when the screen mounts or tab changes
  useEffect(() => {
    doSearch(query, activeTab);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQueryChange = (text: string) => {
    setQuery(text);
    doSearch(text, activeTab);
  };

  const switchTab = (tab: SearchType) => {
    setActiveTab(tab);
    setQuery('');
    // useEffect above will trigger doSearch('', tab)
  };

  const handleJoinLeave = async (communityId: number, isMember: boolean) => {
    try {
      if (isMember) {
        await api.delete(`/communities/${communityId}/leave`);
      } else {
        await api.post(`/communities/${communityId}/join`);
      }
      // Optimistic toggle in search results
      setResults((prev) =>
        prev.map((r) =>
          r.type === 'community' && r.id === communityId
            ? { ...r, isMember: !isMember, memberCount: (r.memberCount || 0) + (isMember ? -1 : 1) }
            : r
        )
      );
    } catch (e: any) {
      Alert.alert('Error', typeof e?.response?.data === 'string' ? e.response.data : 'Could not update membership');
    }
  };

  const handleSendFriendRequest = async (userId: number) => {
    try {
      await api.post(`/users/${userId}/friend-request`);
      Alert.alert('Sent!', 'Friend request sent successfully.');
    } catch (e: any) {
      Alert.alert('Error', typeof e?.response?.data === 'string' ? e.response.data : 'Could not send request');
    }
  };

  const renderCommunity = (item: CommunityResult) => (
    <TouchableOpacity
      className="bg-white border border-[#cfc4c5] mb-2 p-4 flex-row items-center gap-3"
      onPress={() => router.push(`/community/${item.id}`)}
    >
      {item.iconUrl ? (
        <Image source={{ uri: item.iconUrl }} className="w-12 h-12 rounded-full border border-[#cfc4c5] bg-[#e2e2e2]" />
      ) : (
        <View className="w-12 h-12 rounded-full bg-[#e2e2e2] border border-[#cfc4c5] justify-center items-center">
          <Text className="text-lg font-bold text-[#4c4546]">{item.name[0]?.toUpperCase() || '?'}</Text>
        </View>
      )}
      <View className="flex-1">
        <Text className="text-base font-bold text-black">{item.name}</Text>
        {item.description && <Text className="text-[13px] text-[#5d5f5f] mt-0.5" numberOfLines={1}>{item.description}</Text>}
        {item.memberCount !== undefined && (
          <Text className="text-[11px] text-[#7e7576] mt-1 font-mono">👥 {item.memberCount} members</Text>
        )}
      </View>
      <TouchableOpacity
        className={`px-3 py-1.5 rounded-sm border ${item.isMember ? 'bg-white border-[#cfc4c5]' : 'bg-black border-black'}`}
        onPress={() => handleJoinLeave(item.id, !!item.isMember)}
      >
        <Text className={`text-xs font-semibold ${item.isMember ? 'text-[#5d5f5f]' : 'text-white'}`}>
          {item.isMember ? 'Joined' : 'Join'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderUser = (item: UserResult) => (
    <View className="bg-white border border-[#cfc4c5] mb-2 p-4 flex-row items-center gap-3">
      <TouchableOpacity className="flex-row items-center gap-3 flex-1" onPress={() => router.push(`/user/${item.id}`)}>
        {item.pfpUrl ? (
          <Image source={{ uri: item.pfpUrl }} className="w-12 h-12 rounded-full border border-[#cfc4c5] bg-[#e2e2e2]" />
        ) : (
          <View className="w-12 h-12 rounded-full bg-[#e2e2e2] border border-[#cfc4c5] justify-center items-center">
            <Text className="text-lg font-bold text-[#4c4546]">{item.username[0]?.toUpperCase() || '?'}</Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="text-base font-bold text-black">@{item.username}</Text>
          {item.about && <Text className="text-[13px] text-[#5d5f5f] mt-0.5" numberOfLines={1}>{item.about}</Text>}
        </View>
      </TouchableOpacity>
      <TouchableOpacity className="bg-black px-3 py-2 rounded-sm" onPress={() => handleSendFriendRequest(item.id)}>
        <Text className="text-white text-xs font-semibold">Add</Text>
      </TouchableOpacity>
    </View>
  );

  const headerTitle = query === ''
    ? activeTab === 'communities' ? 'Discover Communities' : 'Discover Users'
    : `Results for "${query}"`;

  return (
    <View className="flex-1 bg-[#f9f9f9]">
      <View className="bg-[#f9f9f9] border-b border-[#cfc4c5]" style={{ paddingTop: insets.top }}>
        <View className="px-4 py-3">
          <Text className="text-2xl font-bold text-black tracking-tight mb-3">Search</Text>
          <View className="flex-row items-center bg-white border border-[#cfc4c5] rounded-sm px-3">
            <Text className="text-base text-[#9e9e9e] mr-2">🔍</Text>
            <TextInput
              className="flex-1 h-11 text-sm text-black"
              placeholder={activeTab === 'communities' ? 'Search communities...' : 'Search users...'}
              placeholderTextColor="#9e9e9e"
              value={query}
              onChangeText={handleQueryChange}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={() => doSearch(query, activeTab)}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); doSearch('', activeTab); }}>
                <Text className="text-base text-[#5d5f5f]">✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {/* Tabs */}
        <View className="flex-row border-t border-[#cfc4c5]">
          {(['communities', 'users'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              className={`flex-1 py-3 border-b-2 ${activeTab === tab ? 'border-black' : 'border-transparent'}`}
              onPress={() => switchTab(tab)}
            >
              <Text className={`text-center text-sm capitalize ${activeTab === tab ? 'font-bold text-black' : 'font-normal text-[#5d5f5f]'}`}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#000000" />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerClassName="p-4 pb-[100px]"
          renderItem={({ item }) =>
            item.type === 'community' ? renderCommunity(item) : renderUser(item)
          }
          ListHeaderComponent={
            results.length > 0 ? (
              <Text className="text-[11px] font-bold tracking-[1.1px] text-[#5d5f5f] uppercase mb-3">
                {headerTitle}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center pt-15">
              <Text className="text-lg font-semibold text-black mb-2">
                {query ? 'No results found' : 'Nothing here yet'}
              </Text>
              <Text className="text-sm text-[#5d5f5f] text-center">
                {query ? 'Try a different search term' : 'Check back later'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
