import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { AuthContext } from '../auth/AuthContext';
import api from '../api';

export default function UserProfilePage() {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'friends'>('posts');

  const fetchData = useCallback(async () => {
    try {
      const [pRes, postsRes, fRes] = await Promise.all([
        api.get(`/users/${id}`), api.get(`/users/${id}/posts`), api.get(`/users/${id}/friends`),
      ]);
      const d = pRes.data;
      setProfile({ id: d.ID || d.id, username: d.username, email: d.email, about: d.about, pfpUrl: d.pfpUrl, bannerUrl: d.bannerUrl, rating: d.rating, interests: d.interests });
      setPosts(postsRes.data || []);
      setFriends((fRes.data || []).map((f: any) => ({ id: f.ID || f.id, username: f.username, pfpUrl: f.pfpUrl })));
    } catch { console.error('Failed to load user profile'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFriendRequest = async () => {
    try { await api.post(`/users/${id}/friend-request`); Alert.alert('Sent', 'Friend request sent!'); }
    catch (e: any) { Alert.alert('Error', typeof e?.response?.data === 'string' ? e.response.data : 'Could not send request'); }
  };

  if (loading) return <View className="flex-1 justify-center items-center bg-[#f9f9f9]"><ActivityIndicator size="large" color="#000000" /></View>;
  if (!profile) return <View className="flex-1 justify-center items-center bg-[#f9f9f9]"><Text className="text-base text-[#5d5f5f]">User not found</Text></View>;

  return (
    <View className="flex-1 bg-[#f9f9f9]">
      <ScrollView>
        {/* Header */}
        <View className="absolute z-10 left-4" style={{ paddingTop: insets.top }}>
          <TouchableOpacity onPress={() => router.back()} className="bg-black/50 w-9 h-9 rounded-full justify-center items-center">
            <Text className="text-white text-lg">←</Text>
          </TouchableOpacity>
        </View>

        {/* Banner */}
        {profile.bannerUrl ? <Image source={{ uri: profile.bannerUrl }} className="w-full h-[140px]" resizeMode="cover" /> : <View className="w-full h-[140px] bg-[#1b1b1b]" />}

        <View className="px-4">
          {/* Avatar */}
          <View className="-mt-10">
            {profile.pfpUrl ? <Image source={{ uri: profile.pfpUrl }} className="w-[88px] h-[88px] rounded-full border-4 border-[#f9f9f9] bg-[#e2e2e2]" /> : (
              <View className="w-[88px] h-[88px] rounded-full bg-[#e2e2e2] border-4 border-[#f9f9f9] justify-center items-center">
                <Text className="text-[32px] font-extrabold text-[#4c4546]">{(profile.username || '?')[0].toUpperCase()}</Text>
              </View>
            )}
          </View>

          <View className="flex-row justify-between items-center mt-3 mb-1">
            <Text className="text-2xl font-bold text-black tracking-[-0.5px]">@{profile.username}</Text>
            <TouchableOpacity onPress={handleFriendRequest} className="bg-black px-4 py-2 rounded-sm">
              <Text className="text-xs font-semibold text-white">Add Friend</Text>
            </TouchableOpacity>
          </View>

          {profile.about && <View className="bg-white border border-[#cfc4c5] p-4 mt-3 mb-4">
            <Text className="text-sm text-[#1b1b1b] leading-[21px]">{profile.about}</Text>
          </View>}

          {profile.interests?.length > 0 && <View className="flex-row flex-wrap gap-1.5 mb-4">
            {profile.interests.map((i: string) => <View key={i} className="border border-[#cfc4c5] px-2.5 py-1 rounded-sm bg-white"><Text className="text-[11px] text-[#1b1b1b] font-mono">{i}</Text></View>)}
          </View>}

          <View className="flex-row gap-6 mb-4 pb-4 border-b border-[#cfc4c5]">
            <View className="items-center"><Text className="text-lg font-bold text-black">{posts.length}</Text><Text className="text-[11px] text-[#5d5f5f] font-mono">POSTS</Text></View>
            <View className="items-center"><Text className="text-lg font-bold text-black">{friends.length}</Text><Text className="text-[11px] text-[#5d5f5f] font-mono">FRIENDS</Text></View>
            <View className="items-center"><Text className="text-lg font-bold text-black">{profile.rating || 0}</Text><Text className="text-[11px] text-[#5d5f5f] font-mono">RATING</Text></View>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row border-b border-[#cfc4c5]">
          {(['posts', 'friends'] as const).map((tab) => (
            <TouchableOpacity key={tab} className={`flex-1 py-3.5 border-b-2 ${activeTab === tab ? 'border-black' : 'border-transparent'}`} onPress={() => setActiveTab(tab)}>
              <Text className={`text-center text-sm capitalize ${activeTab === tab ? 'font-bold text-black' : 'font-normal text-[#5d5f5f]'}`}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="p-4 pb-[100px]">
          {activeTab === 'posts' && posts.map((post) => {
            const pId = post.ID || post.id;
            return <TouchableOpacity key={pId} className="bg-white border border-[#cfc4c5] p-4 mb-2" onPress={() => router.push(`/post/${pId}`)}>
              {post.title && <Text className="text-base font-bold text-black mb-1" numberOfLines={1}>{post.title}</Text>}
              <Text className="text-sm text-[#4c4546]" numberOfLines={2}>{post.content}</Text>
            </TouchableOpacity>;
          })}
          {activeTab === 'friends' && friends.map((f) => (
            <TouchableOpacity key={f.id} className="flex-row items-center gap-3 bg-white border border-[#cfc4c5] p-4 mb-2" onPress={() => router.push(`/user/${f.id}`)}>
              <View className="w-10 h-10 rounded-full bg-[#e2e2e2] justify-center items-center"><Text className="text-base font-bold text-[#4c4546]">{f.username?.[0]?.toUpperCase()}</Text></View>
              <Text className="text-base font-semibold text-black">@{f.username}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
