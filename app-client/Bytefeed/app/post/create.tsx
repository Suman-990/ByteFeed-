import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Image, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import api from '../api';
import { AuthContext } from '../auth/AuthContext';
import * as ImagePicker from 'expo-image-picker';

const CATEGORIES = [
  { id: 'tech', label: 'Tech', icon: '💻' }, { id: 'design', label: 'Design', icon: '🎨' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' }, { id: 'philosophy', label: 'Philosophy', icon: '🤔' },
  { id: 'architecture', label: 'Architecture', icon: '🏛️' }, { id: 'minimalism', label: 'Minimalism', icon: '✨' },
  { id: 'web3', label: 'Web3', icon: '🌐' }, { id: 'cybernetics', label: 'Cybernetics', icon: '🤖' },
];

export default function CreatePostPage() {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ editPostId?: string; communityId?: string }>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const isEditing = !!params.editPostId;

  useEffect(() => {
    if (isEditing && params.editPostId) {
      (async () => {
        try {
          const res = await api.get(`/posts/${params.editPostId}`);
          setTitle(res.data.title || ''); setContent(res.data.content || ''); setTags(res.data.tags || []);
          if (res.data.imageUrls?.length) setSelectedImage(res.data.imageUrls[0]);
        } catch (e) { console.error('Failed to load post for editing', e); }
      })();
    }
  }, [isEditing, params.editPostId]);

  const handleImagePick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission required', 'Please allow photo library access'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8 });
    if (!result.canceled && result.assets?.length) setSelectedImage(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!content.trim()) { Alert.alert('Missing content', 'Please write something'); return; }
    setLoading(true);
    try {
      const postData: any = { title, content, tags };
      if (params.communityId) postData.communityId = parseInt(params.communityId, 10);

      let created: any;
      if (isEditing) {
        const r = await api.put(`/posts/${params.editPostId}`, postData);
        created = r.data;
      } else {
        const r = await api.post('/posts', postData);
        created = r.data;
      }

      // Upload image BEFORE navigating away — the component must remain mounted
      // for the async FormData upload to complete. Previously this ran after
      // router.back(), causing the upload to be silently cancelled.
      if (selectedImage && !selectedImage.startsWith('http')) {
        const pId = created.ID || created.id;
        const fd = new FormData();
        fd.append('file', { uri: selectedImage, type: 'image/jpeg', name: 'post-image.jpg' } as any);
        try {
          await api.post(`/posts/${pId}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        } catch (imgErr) {
          console.error('Image upload failed', imgErr);
          // Post was created — notify the user the text was saved but image failed
          Alert.alert('Post saved', 'The post was created but the image could not be uploaded.');
          router.back();
          return;
        }
      }

      Alert.alert('Success', isEditing ? 'Post updated' : 'Post published');
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to submit post');
    } finally {
      setLoading(false);
    }
  };


  const toggleTag = (tag: string) => setTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);

  return (
    <View className="flex-1 bg-[#f9f9f9]">
      <View className="bg-[#f9f9f9] border-b border-[#cfc4c5]" style={{ paddingTop: insets.top }}>
        <View className="h-14 flex-row items-center justify-between px-4">
          <TouchableOpacity onPress={() => router.back()} className="p-1"><Text className="text-xl text-black">←</Text></TouchableOpacity>
          <Text className="text-xl font-semibold text-black">{isEditing ? 'Edit Post' : 'New Post'}</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading || !content.trim()} className={`px-4 py-2 rounded-sm ${content.trim() ? 'bg-black' : 'bg-[#dadada]'}`}>
            {loading ? <ActivityIndicator color="#ffffff" size="small" /> : <Text className="text-white text-sm font-bold">{isEditing ? 'Update' : 'Publish'}</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-6">
        <TextInput className="border-b border-[#cfc4c5] pb-4 mb-6 text-2xl font-bold text-black tracking-[-0.3px]" placeholder="Title (optional)" placeholderTextColor="#9e9e9e" value={title} onChangeText={setTitle} maxLength={100} />
        <TextInput className="text-base font-medium text-[#1b1b1b] leading-[25.6px] min-h-[120px] mb-6" style={{ textAlignVertical: 'top' }} placeholder="What's on your mind?" placeholderTextColor="#9e9e9e" value={content} onChangeText={setContent} multiline />

        <View className="mb-6">
          <Text className="text-[11px] font-bold tracking-[1.1px] text-[#5d5f5f] uppercase mb-3">CATEGORIES</Text>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const sel = tags.includes(c.id);
              return (
                <TouchableOpacity key={c.id} className={`flex-row items-center gap-1 px-3 py-2 border rounded-sm ${sel ? 'border-black bg-black' : 'border-[#cfc4c5] bg-white'}`} onPress={() => sel ? toggleTag(c.id) : tags.length < 3 && toggleTag(c.id)} disabled={!sel && tags.length >= 3}>
                  <Text className="text-sm">{c.icon}</Text>
                  <Text className={`text-xs font-semibold ${sel ? 'text-white' : 'text-[#1b1b1b]'}`}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity className="border-2 border-dashed border-[#cfc4c5] rounded p-6 items-center justify-center mb-6 bg-white" onPress={handleImagePick}>
          {selectedImage ? (
            <View className="w-full">
              <Image source={{ uri: selectedImage }} className="w-full h-40 rounded-sm" resizeMode="cover" />
              <TouchableOpacity className="absolute top-2 right-2 bg-black px-2 py-1 rounded-sm" onPress={() => setSelectedImage(null)}>
                <Text className="text-white text-xs">Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <><Text className="text-base text-[#5d5f5f] mb-1">+ Add Image</Text><Text className="text-xs text-[#9e9e9e] font-mono">PNG, JPG (optional)</Text></>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
