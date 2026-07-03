import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import api from '../api';
import { AuthContext } from '../auth/AuthContext';

interface Post {
  ID?: number;
  id?: number;
  title: string;
  content: string;
  imageUrls?: string[];
  tags?: string[];
  author?: { username: string; pfpUrl?: string; ID?: number; id?: number };
  upVotes?: number;
  downVotes?: number;
  saves?: number;
  CreatedAt?: string;
  created_at?: string;
}

const formatTimeAgo = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function FeedScreen() {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeed = useCallback(async (pageNum = 1, append = false) => {
    try {
      const res = await api.get(`/posts/feed?page=${pageNum}&limit=20`);
      const data = res.data || [];
      if (append) {
        setPosts((prev) => [...prev, ...data]);
      } else {
        setPosts(data);
      }
      setHasMore(data.length === 20);
    } catch (e) {
      console.error('Failed to load feed', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchFeed(1, false);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFeed(nextPage, true);
    }
  };

  const handleVote = async (postId: number, value: number) => {
    try {
      // The vote endpoint now returns the full post WITH author preloaded.
      // We merge only the vote-count fields to avoid losing any local state.
      const res = await api.post(`/posts/${postId}/vote`, { value });
      const updated = res.data;
      setPosts((prev) =>
        prev.map((p) => {
          if ((p.ID || p.id) !== postId) return p;
          // Merge upVotes / downVotes from response but keep existing author
          // (VotePost backend now returns Author, so this is doubly safe)
          return {
            ...p,
            upVotes: updated.upVotes ?? updated.UpVotes ?? p.upVotes,
            downVotes: updated.downVotes ?? updated.DownVotes ?? p.downVotes,
            author: updated.author || p.author,
          };
        })
      );
    } catch (e) {
      console.error('Vote failed', e);
    }
  };

  const handleSave = async (postId: number) => {
    try {
      await api.post(`/posts/${postId}/save`);
    } catch (e) {
      console.error('Save failed', e);
    }
  };

  const getPostId = (post: Post) => post.ID || post.id || 0;

  const renderPost = ({ item }: { item: Post }) => {
    const postId = getPostId(item);
    const createdAt = item.CreatedAt || item.created_at;

    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => router.push(`/post/${postId}`)}
        className="bg-white border border-[#cfc4c5] mb-2"
      >
        <View className="p-6">
          {/* Author Row */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3">
              {item.author?.pfpUrl ? (
                <Image
                  source={{ uri: item.author.pfpUrl }}
                  className="w-10 h-10 rounded-full border border-[#cfc4c5] bg-[#e2e2e2]"
                />
              ) : (
                <View className="w-10 h-10 rounded-full border border-[#cfc4c5] bg-[#e2e2e2] justify-center items-center">
                  <Text className="text-base font-bold text-[#4c4546]">
                    {(item.author?.username || '?')[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View>
                <Text className="text-base font-bold text-[#1b1b1b]">
                  @{item.author?.username || 'anonymous'}
                </Text>
                <Text className="text-xs text-[#5d5f5f] font-mono">
                  {formatTimeAgo(createdAt)}
                </Text>
              </View>
            </View>
            <TouchableOpacity className="p-1" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text className="text-lg text-[#5d5f5f]">•••</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {item.title ? (
            <Text className="text-xl font-bold text-black mb-2">{item.title}</Text>
          ) : null}
          <Text className="text-base font-medium leading-relaxed text-[#4c4546] mb-4" numberOfLines={5}>
            {item.content}
          </Text>

          {/* Image */}
          {item.imageUrls && item.imageUrls.length > 0 && (
            <View className="border border-[#cfc4c5] bg-[#f3f3f3] mb-4 overflow-hidden">
              <Image source={{ uri: item.imageUrls[0] }} className="w-full h-[200px]" resizeMode="cover" />
            </View>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5 mb-3">
              {item.tags.map((tag) => (
                <View key={tag} className="px-2 py-1 bg-[#eeeeee] rounded-sm">
                  <Text className="text-[11px] text-[#5d5f5f] font-mono">{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          <View className="flex-row items-center justify-between border-t border-[#cfc4c5] pt-3">
            <View className="flex-row items-center gap-3">
              <View className="flex-row items-center bg-[#f3f3f3] border border-[#cfc4c5] rounded-sm">
                <TouchableOpacity className="p-2" onPress={() => handleVote(postId, 1)}>
                  <Text className="text-base">▲</Text>
                </TouchableOpacity>
                <Text className="text-xs font-bold px-1.5 text-black font-mono">
                  {(item.upVotes || 0) - (item.downVotes || 0)}
                </Text>
                <TouchableOpacity className="p-2" onPress={() => handleVote(postId, -1)}>
                  <Text className="text-base">▼</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity className="flex-row items-center gap-1.5 p-2" onPress={() => router.push(`/post/${postId}`)}>
                <Text className="text-sm text-[#5d5f5f]">💬</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity className="p-2" onPress={() => handleSave(postId)}>
              <Text className="text-base text-[#5d5f5f]">🔖</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#f9f9f9]">
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#f9f9f9]">
      {/* Header */}
      <View className="bg-[#f9f9f9] border-b border-[#cfc4c5]" style={{ paddingTop: insets.top }}>
        <View className="h-14 flex-row justify-between items-center px-4">
          <TouchableOpacity className="p-2">
            <Text className="text-xl">☰</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold tracking-tight text-black">Void</Text>
          <TouchableOpacity className="p-2" onPress={() => router.push('/friend-requests')}>
            <Text className="text-xl">🔔</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => (item.ID || item.id || Math.random()).toString()}
        renderItem={renderPost}
        contentContainerClassName="py-2"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000000" />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View className="items-center pt-20">
            <Text className="text-xl font-bold text-black mb-2">No posts yet</Text>
            <Text className="text-sm text-[#5d5f5f]">Be the first to share something</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        className="absolute bottom-6 right-4 w-14 h-14 bg-black rounded-full justify-center items-center shadow-md shadow-black/15 elevation-4"
        onPress={() => router.push('/post/create')}
        activeOpacity={0.8}
      >
        <Text className="text-[28px] text-white leading-[30px]">+</Text>
      </TouchableOpacity>
    </View>
  );
}
