import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import api from '../api';

export default function CreateChannelPage() {
  const insets = useSafeAreaInsets();
  const { communityId } = useLocalSearchParams<{ communityId: string }>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isVoice, setIsVoice] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Missing name'); return; }
    if (!communityId) { Alert.alert('Error', 'Community ID missing'); return; }
    setLoading(true);
    try { await api.post(`/communities/${communityId}/channels`, { name: name.trim(), description, isVoice }); Alert.alert('Created', 'Channel created'); router.back(); }
    catch (e: any) { Alert.alert('Error', typeof e?.response?.data === 'string' ? e.response.data : 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <View className="flex-1 bg-[#f9f9f9]">
      <View className="bg-[#f9f9f9] border-b border-[#cfc4c5]" style={{ paddingTop: insets.top }}>
        <View className="h-14 flex-row items-center justify-between px-4">
          <TouchableOpacity onPress={() => router.back()} className="p-1"><Text className="text-xl text-black">←</Text></TouchableOpacity>
          <Text className="text-xl font-semibold text-black">New Channel</Text>
          <TouchableOpacity onPress={handleCreate} disabled={loading || !name.trim()} className={`px-4 py-2 rounded-sm ${name.trim() ? 'bg-black' : 'bg-[#dadada]'}`}>
            {loading ? <ActivityIndicator color="#ffffff" size="small" /> : <Text className="text-white text-sm font-bold">Create</Text>}
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerClassName="p-6">
        <View className="mb-6">
          <Text className="text-[11px] font-bold tracking-[1.1px] text-[#5d5f5f] uppercase mb-2">CHANNEL NAME</Text>
          <TextInput className="border border-[#cfc4c5] rounded-sm p-4 text-base font-medium bg-white text-black" placeholder="e.g. general-chat" placeholderTextColor="#9e9e9e" value={name} onChangeText={setName} autoCapitalize="none" maxLength={50} />
        </View>
        <View className="mb-6">
          <Text className="text-[11px] font-bold tracking-[1.1px] text-[#5d5f5f] uppercase mb-2">DESCRIPTION</Text>
          <TextInput className="border border-[#cfc4c5] rounded-sm p-4 text-sm bg-white text-black min-h-[60px]" style={{ textAlignVertical: 'top' }} placeholder="What's this channel about?" placeholderTextColor="#9e9e9e" value={description} onChangeText={setDescription} multiline />
        </View>
        <View className="flex-row justify-between items-center bg-white border border-[#cfc4c5] p-4">
          <View><Text className="text-sm font-semibold text-black">Voice Channel</Text><Text className="text-xs text-[#5d5f5f] mt-0.5">Enable voice/video chat</Text></View>
          <Switch value={isVoice} onValueChange={setIsVoice} trackColor={{ false: '#dadada', true: '#000000' }} thumbColor="#ffffff" />
        </View>
      </ScrollView>
    </View>
  );
}
