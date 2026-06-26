import React, { useEffect, useState, useContext } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import api from '../api';
import { AuthContext } from '../auth/AuthContext';

const fmtTime = (d?: string) => { if (!d) return ''; const dt = new Date(d); const h = Math.floor((Date.now() - dt.getTime()) / 3600000); if (h < 1) return 'Just now'; if (h < 24) return `${h}h ago`; return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };

export default function CommunityDetailPage() {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [community, setCommunity] = useState<any>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'channels'>('posts');
  const [isMember, setIsMember] = useState(false);

  useEffect(() => { if (id) fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      const [cRes, chRes, pRes] = await Promise.all([
        api.get(`/communities/${id}`), api.get(`/communities/${id}/channels`), api.get(`/communities/${id}/posts`),
      ]);
      setCommunity(cRes.data); setChannels(chRes.data || []); setPosts(pRes.data || []);
      try { const mRes = await api.get(`/communities/${id}/members`); setIsMember((mRes.data || []).some((m: any) => (m.userId || m.UserID) === user?.id)); } catch { setIsMember(false); }
    } catch { console.error('Error fetching community'); }
    finally { setLoading(false); }
  };

  const handleJoin = async () => { try { await api.post(`/communities/${id}/join`); setIsMember(true); setCommunity((p: any) => p ? { ...p, memberCount: (p.memberCount || 0) + 1 } : p); } catch (e: any) { Alert.alert('Error', e?.response?.data || 'Failed to join'); } };
  const handleLeave = async () => { try { await api.delete(`/communities/${id}/leave`); setIsMember(false); setCommunity((p: any) => p ? { ...p, memberCount: Math.max(0, (p.memberCount || 0) - 1) } : p); } catch (e: any) { Alert.alert('Error', e?.response?.data || 'Failed to leave'); } };

  const handleChannelPress = async (channel: any) => {
    const chId = channel.ID || channel.id;
    if (channel.isVoice) {
      try { const r = await api.get(`/channels/${chId}/voice-token`); router.push({ pathname: '/call', params: { token: r.data.token, room: r.data.room, wsUrl: r.data.wsUrl, identity: user?.username || 'user' } }); }
      catch { Alert.alert('Error', 'Could not get voice token'); }
    } else { router.push({ pathname: '/channel/[id]', params: { id: chId.toString(), channelName: channel.name } }); }
  };

  if (loading) return <View className="flex-1 justify-center items-center bg-[#f9f9f9]"><ActivityIndicator size="large" color="#000000" /></View>;
  if (!community) return <View className="flex-1 justify-center items-center bg-[#f9f9f9]"><Text className="text-base text-[#5d5f5f]">Community not found</Text></View>;

  const listData = activeTab === 'posts' ? posts : channels;

  return (
    <View className="flex-1 bg-[#f9f9f9]">
      <View className="bg-[#f9f9f9]" style={{ paddingTop: insets.top }}>
        <View className="h-14 flex-row items-center px-4 gap-3">
          <TouchableOpacity onPress={() => router.back()} className="p-1"><Text className="text-xl text-black">←</Text></TouchableOpacity>
          <Text className="text-lg font-semibold text-black flex-1" numberOfLines={1}>{community.name}</Text>
        </View>
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item: any) => ((activeTab === 'posts' ? (item.ID || item.id) : (item.ID || item.id)) || Math.random()).toString()}
        ListHeaderComponent={
          <>
            <View className="h-[140px] bg-[#1b1b1b]">{community.bannerUrl && <Image source={{ uri: community.bannerUrl }} className="w-full h-full" resizeMode="cover" />}</View>
            <View className="p-4">
              <View className="flex-row items-end -mt-10 mb-3">
                {community.iconUrl ? <Image source={{ uri: community.iconUrl }} className="w-[72px] h-[72px] rounded-full border-4 border-[#f9f9f9] bg-[#e2e2e2] mr-3" /> : (
                  <View className="w-[72px] h-[72px] rounded-full bg-[#e2e2e2] border-4 border-[#f9f9f9] justify-center items-center mr-3">
                    <Text className="text-[28px] font-extrabold text-[#4c4546]">{community.name?.[0]?.toUpperCase()}</Text>
                  </View>
                )}
                <View className="flex-1 pb-1">
                  <Text className="text-[22px] font-bold text-black">{community.name}</Text>
                  <Text className="text-xs text-[#5d5f5f] font-mono">👥 {community.memberCount || 0} members</Text>
                </View>
              </View>
              <Text className="text-sm text-[#4c4546] leading-[21px] mb-4">{community.about || 'No description available'}</Text>
              <TouchableOpacity className={`py-3 px-5 rounded-sm items-center border mb-4 ${isMember ? 'bg-white border-[#cfc4c5]' : 'bg-black border-black'}`} onPress={isMember ? handleLeave : handleJoin}>
                <Text className={`text-sm font-semibold ${isMember ? 'text-[#5d5f5f]' : 'text-white'}`}>{isMember ? 'Leave Community' : 'Join Community'}</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row border-b border-[#cfc4c5]">
              {(['posts', 'channels'] as const).map((tab) => (
                <TouchableOpacity key={tab} className={`flex-1 py-3.5 border-b-2 ${activeTab === tab ? 'border-black' : 'border-transparent'}`} onPress={() => setActiveTab(tab)}>
                  <Text className={`text-center text-sm ${activeTab === tab ? 'font-bold text-black' : 'font-normal text-[#5d5f5f]'}`}>
                    {tab === 'posts' ? `Posts (${posts.length})` : `Channels (${channels.length})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        renderItem={({ item }: { item: any }) => {
          if (activeTab === 'posts') {
            const pId = item.ID || item.id;
            return (
              <TouchableOpacity className="bg-white border border-[#cfc4c5] p-4 mx-4 mt-2" onPress={() => router.push(`/post/${pId}`)}>
                <View className="flex-row items-center mb-2 gap-2">
                  <View className="w-7 h-7 rounded-full bg-[#e2e2e2] justify-center items-center"><Text className="text-xs font-bold text-[#4c4546]">{(item.author?.username || '?')[0].toUpperCase()}</Text></View>
                  <Text className="text-sm font-bold text-black">@{item.author?.username || 'user'}</Text>
                  <Text className="text-[11px] text-[#5d5f5f] font-mono">{fmtTime(item.CreatedAt || item.created_at)}</Text>
                </View>
                {item.title && <Text className="text-base font-bold text-black mb-1" numberOfLines={2}>{item.title}</Text>}
                <Text className="text-sm text-[#4c4546]" numberOfLines={3}>{item.content}</Text>
                <Text className="text-[11px] text-[#5d5f5f] font-mono mt-2">▲ {(item.upVotes || 0) - (item.downVotes || 0)}</Text>
              </TouchableOpacity>
            );
          } else {
            return (
              <TouchableOpacity className="bg-white border border-[#cfc4c5] p-4 mx-4 mt-2 flex-row items-center gap-3" onPress={() => handleChannelPress(item)}>
                <View className={`w-10 h-10 rounded justify-center items-center ${item.isVoice ? 'bg-[#1b1b1b]' : 'bg-[#e2e2e2]'}`}>
                  <Text className="text-lg">{item.isVoice ? '🎙️' : '💬'}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-black">{item.name}</Text>
                  {item.description && <Text className="text-xs text-[#5d5f5f] mt-0.5" numberOfLines={1}>{item.description}</Text>}
                </View>
                <Text className="text-sm text-[#cfc4c5]">→</Text>
              </TouchableOpacity>
            );
          }
        }}
        ListEmptyComponent={
          <View className="items-center py-10 px-4">
            <Text className="text-sm text-[#5d5f5f]">{activeTab === 'posts' ? 'No posts yet' : 'No channels yet'}</Text>
            {isMember && <TouchableOpacity className="mt-4 bg-black px-5 py-2.5 rounded-sm" onPress={() => activeTab === 'posts' ? router.push({ pathname: '/post/create', params: { communityId: id } }) : router.push({ pathname: '/channel/create', params: { communityId: id } })}>
              <Text className="text-white text-[13px] font-semibold">{activeTab === 'posts' ? 'Create First Post' : 'Create First Channel'}</Text>
            </TouchableOpacity>}
          </View>
        }
        contentContainerClassName="pb-[100px]"
      />

      {/* Admin FAB for Channel Management */}
      {activeTab === 'channels' && (user?.id === community?.AdminID || user?.id === community?.adminId) && (
        <TouchableOpacity
          className="absolute bottom-6 right-4 bg-black px-5 py-3.5 rounded-sm flex-row items-center gap-2 shadow-md shadow-black/15 elevation-4"
          onPress={() => router.push({ pathname: '/channel/create', params: { communityId: id } })}
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg">+</Text>
          <Text className="text-white text-[13px] font-bold">Channel</Text>
        </TouchableOpacity>
      )}

      {/* Member FAB for Post Creation */}
      {activeTab === 'posts' && isMember && (
        <TouchableOpacity
          className="absolute bottom-6 right-4 w-14 h-14 bg-black rounded-full justify-center items-center shadow-md shadow-black/15 elevation-4"
          onPress={() => router.push({ pathname: '/post/create', params: { communityId: id } })}
          activeOpacity={0.8}
        >
          <Text className="text-[28px] text-white leading-[30px]">+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
