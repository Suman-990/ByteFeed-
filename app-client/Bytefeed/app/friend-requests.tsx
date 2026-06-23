import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import api from './api';

export default function FriendRequestsPage() {
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/users/me/friend-requests');
      const data = res.data || [];
      const enriched = await Promise.all(data.map(async (req: any) => {
        try { const u = await api.get(`/users/${req.senderId}`); return { ...req, senderUsername: u.data?.username || 'Unknown' }; }
        catch { return { ...req, senderUsername: 'Unknown' }; }
      }));
      setRequests(enriched);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleRespond = async (reqId: number, action: 'accepted' | 'rejected') => {
    try { await api.put(`/friend-requests/${reqId}`, { action }); Alert.alert('Done', action === 'accepted' ? 'Friend added!' : 'Request declined'); fetchRequests(); }
    catch (e: any) { Alert.alert('Error', e?.response?.data || 'Failed'); }
  };

  if (loading) return <View className="flex-1 justify-center items-center bg-[#f9f9f9]"><ActivityIndicator size="large" color="#000000" /></View>;

  return (
    <View className="flex-1 bg-[#f9f9f9]">
      <View className="bg-[#f9f9f9] border-b border-[#cfc4c5]" style={{ paddingTop: insets.top }}>
        <View className="h-14 flex-row items-center px-4 gap-3">
          <TouchableOpacity onPress={() => router.back()} className="p-1"><Text className="text-xl text-black">←</Text></TouchableOpacity>
          <Text className="text-xl font-semibold text-black flex-1">Friend Requests</Text>
          <Text className="text-[13px] text-[#5d5f5f] font-mono">{requests.length} pending</Text>
        </View>
      </View>

      <FlatList data={requests} keyExtractor={(i) => (i.ID || i.id || 0).toString()} contentContainerClassName="p-4 pb-[100px]"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRequests(); }} tintColor="#000000" />}
        renderItem={({ item }) => {
          const reqId = item.ID || item.id;
          return (
            <View className="bg-white border border-[#cfc4c5] p-4 mb-2">
              <View className="flex-row items-center gap-3 mb-3">
                <View className="w-10 h-10 rounded-full bg-[#e2e2e2] justify-center items-center">
                  <Text className="text-base font-bold text-[#4c4546]">{(item.senderUsername || '?')[0].toUpperCase()}</Text>
                </View>
                <View className="flex-1"><Text className="text-base font-semibold text-black">@{item.senderUsername}</Text><Text className="text-xs text-[#5d5f5f] font-mono">wants to be friends</Text></View>
              </View>
              <View className="flex-row gap-2">
                <TouchableOpacity className="flex-1 bg-black py-2.5 rounded-sm items-center" onPress={() => handleRespond(reqId, 'accepted')}><Text className="text-white text-[13px] font-semibold">Accept</Text></TouchableOpacity>
                <TouchableOpacity className="flex-1 border border-[#cfc4c5] py-2.5 rounded-sm items-center" onPress={() => handleRespond(reqId, 'rejected')}><Text className="text-[#5d5f5f] text-[13px] font-semibold">Decline</Text></TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<View className="items-center pt-15"><Text className="text-base font-semibold text-black mb-2">No pending requests</Text><Text className="text-sm text-[#5d5f5f]">You're all caught up!</Text></View>}
      />
    </View>
  );
}
