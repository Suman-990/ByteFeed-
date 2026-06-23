import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import api from '../api';
import { AuthContext } from '../auth/AuthContext';

interface Comment { ID?: number; id?: number; content: string; CreatedAt?: string; created_at?: string; user?: { username: string }; parentId?: number; parent_id?: number; upVotes?: number; downVotes?: number; up_votes?: number; down_votes?: number; }
interface PostData { ID?: number; id?: number; title: string; content: string; imageUrls?: string[]; tags?: string[]; author?: { username: string; pfpUrl?: string; ID?: number; id?: number }; upVotes?: number; downVotes?: number; saves?: number; CreatedAt?: string; created_at?: string; }

const fmtTime = (d?: string) => { if (!d) return ''; const dt = new Date(d); const h = Math.floor((Date.now() - dt.getTime()) / 3600000); if (h < 1) return 'Just now'; if (h < 24) return `${h}h ago`; return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };

export default function PostDetailPage() {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<PostData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<number | null>(null);

  const fetchPost = useCallback(async () => { try { const r = await api.get(`/posts/${id}`); setPost(r.data); } catch { Alert.alert('Error', 'Could not load post'); router.back(); } finally { setLoading(false); } }, [id]);
  const fetchComments = useCallback(async () => { try { const r = await api.get(`/posts/${id}/comments`); setComments(r.data || []); } catch {} }, [id]);

  useEffect(() => { fetchPost(); fetchComments(); }, [fetchPost, fetchComments]);

  const handleVote = async (v: number) => { try { await api.post(`/posts/${id}/vote`, { value: v }); fetchPost(); } catch {} };
  const handleSave = async () => { try { await api.post(`/posts/${id}/save`); Alert.alert('Done', 'Post saved'); } catch {} };
  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try { const body: any = { content: commentText }; if (replyTo) body.parentId = replyTo; await api.post(`/posts/${id}/comments`, body); setCommentText(''); setReplyTo(null); fetchComments(); }
    catch { Alert.alert('Error', 'Could not post comment'); }
    finally { setSubmitting(false); }
  };
  const handleVoteComment = async (cId: number, v: number) => { try { await api.post(`/comments/${cId}/vote`, { value: v }); fetchComments(); } catch {} };

  const cId = (c: Comment) => c.ID || c.id || 0;

  if (loading || !post) return <View className="flex-1 justify-center items-center bg-[#f9f9f9]"><ActivityIndicator size="large" color="#000000" /></View>;

  const authorId = post.author?.ID || post.author?.id;
  const pc = post.CreatedAt || post.created_at;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-[#f9f9f9]">
      <View className="bg-[#f9f9f9] border-b border-[#cfc4c5]" style={{ paddingTop: insets.top }}>
        <View className="h-14 flex-row items-center px-4 gap-4">
          <TouchableOpacity onPress={() => router.back()} className="p-1"><Text className="text-xl text-black">←</Text></TouchableOpacity>
          <Text className="text-xl font-semibold text-black flex-1">Post</Text>
          {authorId === user?.id && <TouchableOpacity onPress={() => router.push({ pathname: '/post/create', params: { editPostId: id } })} className="p-1"><Text className="text-sm text-[#5d5f5f] font-semibold">Edit</Text></TouchableOpacity>}
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="bg-white border-b border-[#cfc4c5] p-6">
          {/* Author */}
          <View className="flex-row items-center mb-4 gap-3">
            {post.author?.pfpUrl ? <Image source={{ uri: post.author.pfpUrl }} className="w-10 h-10 rounded-full border border-[#cfc4c5]" /> : (
              <View className="w-10 h-10 rounded-full bg-[#e2e2e2] border border-[#cfc4c5] justify-center items-center">
                <Text className="text-base font-bold text-[#4c4546]">{(post.author?.username || '?')[0].toUpperCase()}</Text>
              </View>
            )}
            <View><Text className="text-base font-bold text-[#1b1b1b]">@{post.author?.username || 'anonymous'}</Text><Text className="text-xs text-[#5d5f5f] font-mono">{fmtTime(pc)}</Text></View>
          </View>
          {post.title ? <Text className="text-2xl font-bold text-black mb-3 tracking-[-0.3px]">{post.title}</Text> : null}
          <Text className="text-base font-medium leading-[25.6px] text-[#4c4546] mb-4">{post.content}</Text>
          {post.imageUrls && post.imageUrls.length > 0 && <View className="border border-[#cfc4c5] overflow-hidden mb-4"><Image source={{ uri: post.imageUrls[0] }} className="w-full h-[280px]" resizeMode="cover" /></View>}
          {post.tags && post.tags.length > 0 && <View className="flex-row flex-wrap gap-1.5 mb-4">{post.tags.map((t) => <View key={t} className="px-2 py-1 bg-[#eeeeee] rounded-sm"><Text className="text-[11px] text-[#5d5f5f] font-mono">{t}</Text></View>)}</View>}

          {/* Actions */}
          <View className="flex-row items-center justify-between border-t border-[#cfc4c5] pt-3">
            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center bg-[#f3f3f3] border border-[#cfc4c5] rounded-sm">
                <TouchableOpacity className="p-2" onPress={() => handleVote(1)}><Text className="text-base">▲</Text></TouchableOpacity>
                <Text className="text-xs font-bold px-1.5 text-black font-mono">{(post.upVotes || 0) - (post.downVotes || 0)}</Text>
                <TouchableOpacity className="p-2" onPress={() => handleVote(-1)}><Text className="text-base">▼</Text></TouchableOpacity>
              </View>
              <View className="flex-row items-center gap-1"><Text className="text-sm text-[#5d5f5f]">💬</Text><Text className="text-xs font-bold font-mono">{comments.length}</Text></View>
            </View>
            <TouchableOpacity className="p-2" onPress={handleSave}><Text className="text-base text-[#5d5f5f]">🔖</Text></TouchableOpacity>
          </View>
        </View>

        {/* Comments */}
        <View className="p-6">
          <Text className="text-xl font-semibold text-black mb-5">Comments ({comments.length})</Text>
          {user && (
            <View className="mb-6 bg-white border border-[#cfc4c5] p-4">
              {replyTo && <View className="flex-row justify-between items-center mb-2 pb-2 border-b border-[#eeeeee]"><Text className="text-xs text-[#5d5f5f] font-mono">Replying to comment...</Text><TouchableOpacity onPress={() => setReplyTo(null)}><Text className="text-xs text-black font-semibold">Cancel</Text></TouchableOpacity></View>}
              <TextInput className="border border-[#cfc4c5] rounded-sm p-3 text-sm bg-white text-black min-h-[60px]" style={{ textAlignVertical: 'top' }} placeholder="Add a comment..." placeholderTextColor="#9e9e9e" value={commentText} onChangeText={setCommentText} multiline maxLength={1000} />
              <TouchableOpacity className={`py-2.5 px-5 rounded-sm self-start mt-3 ${commentText.trim() ? 'bg-black' : 'bg-[#dadada]'}`} onPress={handleSubmitComment} disabled={submitting || !commentText.trim()}>
                {submitting ? <ActivityIndicator color="#ffffff" size="small" /> : <Text className="text-white text-sm font-semibold">{replyTo ? 'Post Reply' : 'Comment'}</Text>}
              </TouchableOpacity>
            </View>
          )}

          {comments.length === 0 ? <View className="items-center py-10"><Text className="text-base text-[#5d5f5f]">No comments yet. Be the first!</Text></View> :
            comments.filter((c) => !(c.parentId || c.parent_id)).map((comment) => {
              const ci = cId(comment); const cd = comment.CreatedAt || comment.created_at;
              const uv = comment.upVotes ?? comment.up_votes ?? 0; const dv = comment.downVotes ?? comment.down_votes ?? 0;
              return (
                <View key={ci} className="mb-5 border-l-2 border-[#eeeeee] pl-4">
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-sm font-bold text-black">@{comment.user?.username || 'user'}</Text>
                    <Text className="text-[11px] text-[#5d5f5f] font-mono">{fmtTime(cd)}</Text>
                  </View>
                  <Text className="text-sm text-[#1b1b1b] leading-[21px] mb-2">{comment.content}</Text>
                  <View className="flex-row items-center gap-4">
                    <TouchableOpacity className="flex-row items-center gap-1" onPress={() => handleVoteComment(ci, 1)}><Text className="text-xs text-[#5d5f5f]">▲ {uv}</Text></TouchableOpacity>
                    <TouchableOpacity className="flex-row items-center gap-1" onPress={() => handleVoteComment(ci, -1)}><Text className="text-xs text-[#5d5f5f]">▼ {dv}</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setReplyTo(ci)}><Text className="text-xs text-black font-semibold">Reply</Text></TouchableOpacity>
                  </View>
                  {/* Replies */}
                  {comments.filter((r) => (r.parentId || r.parent_id) === ci).map((reply) => {
                    const ri = cId(reply); const rd = reply.CreatedAt || reply.created_at;
                    return (
                      <View key={ri} className="mt-3 ml-4 border-l-2 border-[#dadada] pl-3">
                        <View className="flex-row justify-between mb-1">
                          <Text className="text-[13px] font-bold text-black">@{reply.user?.username || 'user'}</Text>
                          <Text className="text-[11px] text-[#5d5f5f] font-mono">{fmtTime(rd)}</Text>
                        </View>
                        <Text className="text-[13px] text-[#1b1b1b] leading-[19.5px]">{reply.content}</Text>
                      </View>
                    );
                  })}
                </View>
              );
            })
          }
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
