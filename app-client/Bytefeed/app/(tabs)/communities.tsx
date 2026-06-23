import React, { useEffect, useState, useContext } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import api from '../api';
import { AuthContext } from '../auth/AuthContext';

interface Community {
  ID?: number; id?: number; name: string; about?: string; description?: string;
  iconUrl?: string; bannerUrl?: string; memberCount?: number; isMember?: boolean; topics?: string[];
}

export default function CommunitiesTab() {
  const insets = useSafeAreaInsets();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCommunities = async () => {
    try {
      const res = await api.get('/communities/search');
      setCommunities(res.data || []);
    } catch (e) { console.error('Failed to load communities', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchCommunities(); }, []);

  const handleJoin = async (communityId: number, isMember: boolean) => {
    try {
      if (isMember) await api.delete(`/communities/${communityId}/leave`);
      else await api.post(`/communities/${communityId}/join`);
      fetchCommunities();
    } catch (e) { console.error('Failed to update membership', e); }
  };

  const getCId = (c: Community) => c.ID || c.id || 0;

  if (loading) {
    return <View className="flex-1 justify-center items-center bg-[#f9f9f9]"><ActivityIndicator size="large" color="#000000" /></View>;
  }

  return (
    <View className="flex-1 bg-[#f9f9f9]">
      <View className="bg-[#f9f9f9] border-b border-[#cfc4c5]" style={{ paddingTop: insets.top }}>
        <View className="h-14 flex-row justify-between items-center px-4">
          <Text className="text-2xl font-bold text-black tracking-tight">Communities</Text>
          <Text className="text-[13px] text-[#5d5f5f] font-mono">{communities.length} total</Text>
        </View>
      </View>

      <FlatList
        data={communities}
        keyExtractor={(item) => getCId(item).toString()}
        contentContainerClassName="p-4 pb-[100px]"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCommunities(); }} tintColor="#000000" />}
        renderItem={({ item }) => {
          const cId = getCId(item);
          return (
            <TouchableOpacity
              className="bg-white border border-[#cfc4c5] mb-3 overflow-hidden"
              onPress={() => router.push(`/community/${cId}`)}
              activeOpacity={0.95}
            >
              <View className="h-20 bg-[#1b1b1b]">
                {item.bannerUrl && <Image source={{ uri: item.bannerUrl }} className="w-full h-full" resizeMode="cover" />}
              </View>
              <View className="p-4">
                <View className="flex-row items-center mb-2">
                  <View className="-mt-8 mr-3">
                    {item.iconUrl ? (
                      <Image source={{ uri: item.iconUrl }} className="w-14 h-14 rounded-full border-[3px] border-white bg-[#e2e2e2]" />
                    ) : (
                      <View className="w-14 h-14 rounded-full bg-[#e2e2e2] border-[3px] border-white justify-center items-center">
                        <Text className="text-xl font-extrabold text-[#4c4546]">{item.name[0]?.toUpperCase() || 'C'}</Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-black">{item.name}</Text>
                    <Text className="text-[11px] text-[#5d5f5f] font-mono">👥 {item.memberCount || 0} members</Text>
                  </View>
                </View>
                <Text className="text-sm text-[#4c4546] mb-3 leading-[21px]" numberOfLines={2}>
                  {item.about || item.description || 'No description available'}
                </Text>
                <TouchableOpacity
                  className={`py-2.5 px-4 rounded-sm items-center border ${item.isMember ? 'bg-white border-[#cfc4c5]' : 'bg-black border-black'}`}
                  onPress={() => handleJoin(cId, !!item.isMember)}
                >
                  <Text className={`text-[13px] font-semibold ${item.isMember ? 'text-[#5d5f5f]' : 'text-white'}`}>
                    {item.isMember ? 'Joined ✓' : 'Join Community'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View className="items-center pt-15">
            <Text className="text-lg font-semibold text-black mb-2">No communities found</Text>
            <Text className="text-sm text-[#5d5f5f]">Be the first to create one!</Text>
          </View>
        }
      />

      <TouchableOpacity
        className="absolute bottom-6 right-4 bg-black px-5 py-3.5 rounded-sm flex-row items-center gap-2 shadow-md shadow-black/15 elevation-4"
        onPress={() => router.push('/community/create')}
        activeOpacity={0.8}
      >
        <Text className="text-white text-lg">+</Text>
        <Text className="text-white text-[13px] font-bold">Create</Text>
      </TouchableOpacity>
    </View>
  );
}
