import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, TextInput, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AuthContext } from '../auth/AuthContext';
import api from '../api';
import * as ImagePicker from 'expo-image-picker';

interface Post { ID?: number; id?: number; title: string; content: string; CreatedAt?: string; created_at?: string; upVotes?: number; downVotes?: number; }
interface FriendData { id: number; username: string; pfpUrl?: string; }
interface UserProfile { id: number; username: string; email: string; about?: string; pfpUrl?: string; bannerUrl?: string; rating?: number; interests?: string[]; }

const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

export default function ProfileTab() {
  const { user, logout, refreshUser } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'friends'>('posts');
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutText, setAboutText] = useState('');

  const fetchData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const [meRes, postsRes, friendsRes] = await Promise.all([
        api.get('/users/me'),
        api.get(`/users/${user.id}/posts`),
        api.get(`/users/${user.id}/friends`),
      ]);
      const data = meRes.data;
      setProfile({ id: data.ID || data.id, username: data.username, email: data.email, about: data.about, pfpUrl: data.pfpUrl, bannerUrl: data.bannerUrl, rating: data.rating, interests: data.interests });
      setAboutText(data.about || '');
      setPosts(postsRes.data || []);
      setFriends((friendsRes.data || []).map((f: any) => ({ id: f.ID || f.id, username: f.username, pfpUrl: f.pfpUrl })));
      try { const savedRes = await api.get('/users/me/saved'); setSavedPosts(savedRes.data || []); } catch {}
    } catch (e) { console.error('Failed to load profile:', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUploadAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets?.length) {
      try {
        const fd = new FormData();
        fd.append('file', { uri: result.assets[0].uri, type: 'image/jpeg', name: 'avatar.jpg' } as any);
        await api.post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        refreshUser(); fetchData();
      } catch { Alert.alert('Upload failed', 'Could not upload avatar'); }
    }
  };

  const handleUploadBanner = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 5], quality: 0.8 });
    if (!result.canceled && result.assets?.length) {
      try {
        const fd = new FormData();
        fd.append('file', { uri: result.assets[0].uri, type: 'image/jpeg', name: 'banner.jpg' } as any);
        await api.post('/users/me/banner', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        refreshUser(); fetchData();
      } catch { Alert.alert('Upload failed', 'Could not upload banner'); }
    }
  };

  const handleSaveAbout = async () => {
    try { await api.put(`/users/${user?.id}`, { about: aboutText }); setEditingAbout(false); fetchData(); }
    catch { Alert.alert('Error', 'Could not update bio'); }
  };

  if (!user) return <View className="flex-1 justify-center items-center bg-[#f9f9f9]"><Text className="text-base text-[#5d5f5f]">Not logged in</Text></View>;
  if (loading) return <View className="flex-1 justify-center items-center bg-[#f9f9f9]"><ActivityIndicator size="large" color="#000000" /></View>;

  const p = profile || user;

  return (
    <View className="flex-1 bg-[#f9f9f9]">
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#000000" />}>
        {/* Banner */}
        <TouchableOpacity activeOpacity={0.8} onPress={handleUploadBanner}>
          {(p as any)?.bannerUrl ? (
            <Image source={{ uri: (p as any).bannerUrl }} className="w-full h-[140px] bg-[#e2e2e2]" resizeMode="cover" />
          ) : (
            <View className="w-full h-[140px] bg-[#1b1b1b] justify-center items-center">
              <Text className="text-[#5d5f5f] text-xs font-mono">Tap to add banner</Text>
            </View>
          )}
        </TouchableOpacity>

        <View className="px-4">
          {/* Avatar */}
          <TouchableOpacity activeOpacity={0.8} onPress={handleUploadAvatar} className="-mt-10">
            {(p as any)?.pfpUrl ? (
              <Image source={{ uri: (p as any).pfpUrl }} className="w-[88px] h-[88px] rounded-full border-4 border-[#f9f9f9] bg-[#e2e2e2]" />
            ) : (
              <View className="w-[88px] h-[88px] rounded-full bg-[#e2e2e2] border-4 border-[#f9f9f9] justify-center items-center">
                <Text className="text-[32px] font-extrabold text-[#4c4546]">{(p?.username || '?')[0].toUpperCase()}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Username & Logout */}
          <View className="flex-row justify-between items-center mt-3 mb-1">
            <Text className="text-2xl font-bold text-black tracking-tight">@{p?.username}</Text>
            <TouchableOpacity onPress={logout} className="border border-[#cfc4c5] px-4 py-2 rounded-sm">
              <Text className="text-xs font-semibold text-[#ba1a1a]">Logout</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-[13px] text-[#5d5f5f] font-mono mb-3">{p?.email}</Text>

          {/* Bio */}
          <View className="bg-white border border-[#cfc4c5] p-4 mb-4">
            {editingAbout ? (
              <View>
                <TextInput className="border border-[#cfc4c5] rounded-sm p-3 text-sm text-black min-h-[60px] mb-2" style={{ textAlignVertical: 'top' }} value={aboutText} onChangeText={setAboutText} multiline placeholder="Write something about yourself..." placeholderTextColor="#9e9e9e" />
                <View className="flex-row gap-2">
                  <TouchableOpacity onPress={handleSaveAbout} className="bg-black px-4 py-2 rounded-sm">
                    <Text className="text-white text-xs font-semibold">Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingAbout(false)} className="border border-[#cfc4c5] px-4 py-2 rounded-sm">
                    <Text className="text-[#5d5f5f] text-xs">Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity activeOpacity={0.8} onPress={() => setEditingAbout(true)}>
                <Text className={`text-sm leading-[21px] ${(p as any)?.about ? 'text-[#1b1b1b]' : 'text-[#9e9e9e]'}`}>
                  {(p as any)?.about || 'Tap to add a bio...'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Interests */}
          {(p as any)?.interests && (p as any).interests.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5 mb-4">
              {(p as any).interests.map((i: string) => (
                <View key={i} className="border border-[#cfc4c5] px-2.5 py-1 rounded-sm bg-white">
                  <Text className="text-[11px] text-[#1b1b1b] font-mono">{i}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Stats */}
          <View className="flex-row gap-6 mb-4 pb-4 border-b border-[#cfc4c5]">
            <View className="items-center"><Text className="text-lg font-bold text-black">{posts.length}</Text><Text className="text-[11px] text-[#5d5f5f] font-mono">POSTS</Text></View>
            <View className="items-center"><Text className="text-lg font-bold text-black">{friends.length}</Text><Text className="text-[11px] text-[#5d5f5f] font-mono">FRIENDS</Text></View>
            <View className="items-center"><Text className="text-lg font-bold text-black">{(p as any)?.rating || 0}</Text><Text className="text-[11px] text-[#5d5f5f] font-mono">RATING</Text></View>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row border-b border-[#cfc4c5]">
          {(['posts', 'saved', 'friends'] as const).map((tab) => (
            <TouchableOpacity key={tab} className={`flex-1 py-3.5 border-b-2 ${activeTab === tab ? 'border-black' : 'border-transparent'}`} onPress={() => setActiveTab(tab)}>
              <Text className={`text-center text-sm capitalize ${activeTab === tab ? 'font-bold text-black' : 'font-normal text-[#5d5f5f]'}`}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View className="p-4 pb-[100px]">
          {activeTab === 'posts' && (posts.length === 0 ? (
            <View className="items-center py-10"><Text className="text-sm text-[#5d5f5f]">No posts yet</Text></View>
          ) : posts.map((post) => {
            const pId = post.ID || post.id || 0;
            return (
              <TouchableOpacity key={pId} className="bg-white border border-[#cfc4c5] p-4 mb-2" onPress={() => router.push(`/post/${pId}`)}>
                {post.title ? <Text className="text-base font-bold text-black mb-1" numberOfLines={1}>{post.title}</Text> : null}
                <Text className="text-sm text-[#4c4546]" numberOfLines={2}>{post.content}</Text>
                <View className="flex-row justify-between mt-2">
                  <Text className="text-[11px] text-[#5d5f5f] font-mono">{formatDate(post.CreatedAt || post.created_at)}</Text>
                  <Text className="text-[11px] text-[#5d5f5f] font-mono">▲ {(post.upVotes || 0) - (post.downVotes || 0)}</Text>
                </View>
              </TouchableOpacity>
            );
          }))}

          {activeTab === 'saved' && (savedPosts.length === 0 ? (
            <View className="items-center py-10"><Text className="text-sm text-[#5d5f5f]">No saved posts</Text></View>
          ) : savedPosts.map((post) => {
            const pId = post.ID || post.id || 0;
            return (
              <TouchableOpacity key={pId} className="bg-white border border-[#cfc4c5] p-4 mb-2" onPress={() => router.push(`/post/${pId}`)}>
                {post.title ? <Text className="text-base font-bold text-black mb-1" numberOfLines={1}>{post.title}</Text> : null}
                <Text className="text-sm text-[#4c4546]" numberOfLines={2}>{post.content}</Text>
              </TouchableOpacity>
            );
          }))}

          {activeTab === 'friends' && (friends.length === 0 ? (
            <View className="items-center py-10"><Text className="text-sm text-[#5d5f5f]">No friends yet</Text></View>
          ) : friends.map((friend) => (
            <TouchableOpacity key={friend.id} className="flex-row items-center gap-3 bg-white border border-[#cfc4c5] p-4 mb-2" onPress={() => router.push(`/user/${friend.id}`)}>
              {friend.pfpUrl ? (
                <Image source={{ uri: friend.pfpUrl }} className="w-10 h-10 rounded-full bg-[#e2e2e2]" />
              ) : (
                <View className="w-10 h-10 rounded-full bg-[#e2e2e2] justify-center items-center">
                  <Text className="text-base font-bold text-[#4c4546]">{friend.username[0]?.toUpperCase()}</Text>
                </View>
              )}
              <Text className="text-base font-semibold text-black">@{friend.username}</Text>
            </TouchableOpacity>
          )))}
        </View>
      </ScrollView>
    </View>
  );
}
