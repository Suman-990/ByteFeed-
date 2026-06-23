import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import api from '../api';

interface SearchResult {
  type: 'community';
  id: number;
  name: string;
  description?: string;
  iconUrl?: string;
  memberCount?: number;
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get(`/communities/search?q=${encodeURIComponent(searchQuery)}`);
      setResults((res.data || []).map((c: any) => ({
        type: 'community' as const,
        id: c.ID || c.id,
        name: c.name,
        description: c.about || c.description,
        iconUrl: c.iconUrl,
        memberCount: c.memberCount,
      })));
    } catch (e) {
      console.error('Search failed:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <View className="flex-1 bg-[#f9f9f9]">
      <View className="bg-[#f9f9f9] border-b border-[#cfc4c5]" style={{ paddingTop: insets.top }}>
        <View className="px-4 py-3">
          <Text className="text-2xl font-bold text-black tracking-tight mb-3">Search</Text>
          <View className="flex-row items-center bg-white border border-[#cfc4c5] rounded-sm px-3">
            <Text className="text-base text-[#9e9e9e] mr-2">🔍</Text>
            <TextInput
              className="flex-1 h-11 text-sm text-black"
              placeholder="Search communities..."
              placeholderTextColor="#9e9e9e"
              value={query}
              onChangeText={(text) => { setQuery(text); handleSearch(text); }}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={() => handleSearch(query)}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
                <Text className="text-base text-[#5d5f5f]">✕</Text>
              </TouchableOpacity>
            )}
          </View>
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
          renderItem={({ item }) => (
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
              <Text className="text-base text-[#cfc4c5]">→</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center pt-15">
              <Text className="text-lg font-semibold text-black mb-2">
                {searched ? 'No results found' : 'Discover'}
              </Text>
              <Text className="text-sm text-[#5d5f5f] text-center">
                {searched ? 'Try a different search term' : 'Search for communities to explore'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
