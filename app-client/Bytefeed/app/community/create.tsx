import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import api from '../api';

const TOPICS = ['Tech', 'Design', 'Gaming', 'Philosophy', 'Architecture', 'Minimalism', 'Web3', 'Cybernetics', 'Art', 'Music', 'Science'];

export default function CreateCommunityPage() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleTopic = (t: string) => setTopics((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]);

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Missing name', 'Please enter a community name'); return; }
    setLoading(true);
    try { await api.post('/communities', { name: name.trim(), about, topics, isPrivate }); Alert.alert('Created', 'Community created successfully'); router.back(); }
    catch (e: any) { Alert.alert('Error', typeof e?.response?.data === 'string' ? e.response.data : 'Failed to create community'); }
    finally { setLoading(false); }
  };

  return (
    <View className="flex-1 bg-[#f9f9f9]">
      <View className="bg-[#f9f9f9] border-b border-[#cfc4c5]" style={{ paddingTop: insets.top }}>
        <View className="h-14 flex-row items-center justify-between px-4">
          <TouchableOpacity onPress={() => router.back()} className="p-1"><Text className="text-xl text-black">←</Text></TouchableOpacity>
          <Text className="text-xl font-semibold text-black">New Community</Text>
          <TouchableOpacity onPress={handleCreate} disabled={loading || !name.trim()} className={`px-4 py-2 rounded-sm ${name.trim() ? 'bg-black' : 'bg-[#dadada]'}`}>
            {loading ? <ActivityIndicator color="#ffffff" size="small" /> : <Text className="text-white text-sm font-bold">Create</Text>}
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerClassName="p-6">
        <View className="mb-6">
          <Text className="text-[11px] font-bold tracking-[1.1px] text-[#5d5f5f] uppercase mb-2">COMMUNITY NAME</Text>
          <TextInput className="border border-[#cfc4c5] rounded-sm p-4 text-base font-medium bg-white text-black" placeholder="e.g. Brutalist Design" placeholderTextColor="#9e9e9e" value={name} onChangeText={setName} maxLength={50} />
        </View>
        <View className="mb-6">
          <Text className="text-[11px] font-bold tracking-[1.1px] text-[#5d5f5f] uppercase mb-2">DESCRIPTION</Text>
          <TextInput className="border border-[#cfc4c5] rounded-sm p-4 text-sm bg-white text-black min-h-[80px]" style={{ textAlignVertical: 'top' }} placeholder="What's this community about?" placeholderTextColor="#9e9e9e" value={about} onChangeText={setAbout} multiline />
        </View>
        <View className="mb-6">
          <Text className="text-[11px] font-bold tracking-[1.1px] text-[#5d5f5f] uppercase mb-2">TOPICS</Text>
          <View className="flex-row flex-wrap gap-2">
            {TOPICS.map((t) => { const a = topics.includes(t); return (
              <TouchableOpacity key={t} className={`border rounded-sm py-2 px-3.5 ${a ? 'border-black bg-black' : 'border-[#cfc4c5] bg-white'}`} onPress={() => toggleTopic(t)}>
                <Text className={`text-xs font-mono ${a ? 'text-white' : 'text-[#1b1b1b]'}`}>{t}</Text>
              </TouchableOpacity>
            ); })}
          </View>
        </View>
        <View className="flex-row justify-between items-center bg-white border border-[#cfc4c5] p-4">
          <View><Text className="text-sm font-semibold text-black">Private Community</Text><Text className="text-xs text-[#5d5f5f] mt-0.5">Only invited members can join</Text></View>
          <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ false: '#dadada', true: '#000000' }} thumbColor="#ffffff" />
        </View>
      </ScrollView>
    </View>
  );
}
