import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LiveKitRoom, useRoomContext, useLocalParticipant, VideoView, useTracks } from '@livekit/react-native';
import { Track, RoomEvent } from 'livekit-client';

export default function CallPage() {
  const insets = useSafeAreaInsets();
  const { token, room, wsUrl, identity } = useLocalSearchParams<{ token: string; room: string; wsUrl: string; identity: string }>();

  if (!token || !wsUrl) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <Text className="text-white text-base">Invalid call parameters.</Text>
        <TouchableOpacity className="mt-4 bg-[#1b1b1b] px-4 py-2 rounded-sm" onPress={() => router.back()}>
          <Text className="text-white">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={wsUrl}
      token={token}
      connect={true}
      audio={true}
      video={false} // Start with voice-only
    >
      <CallScreen roomName={room} identity={identity} insets={insets} />
    </LiveKitRoom>
  );
}

function CallScreen({ roomName, identity, insets }: { roomName: string; identity: string; insets: any }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [callDuration, setCallDuration] = useState(0);

  // We are connected when room state is connected
  const isConnected = room.state === 'connected';

  // Get all camera tracks in the room
  const tracks = useTracks([Track.Source.Camera]);

  useEffect(() => {
    let i: ReturnType<typeof setInterval>;
    if (isConnected) i = setInterval(() => setCallDuration((p) => p + 1), 1000);
    return () => clearInterval(i);
  }, [isConnected]);

  const fmtDur = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const toggleMic = async () => {
    if (localParticipant) {
      const isMuted = !localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(isMuted);
    }
  };

  const toggleCamera = async () => {
    if (localParticipant) {
      const isEnabled = localParticipant.isCameraEnabled;
      await localParticipant.setCameraEnabled(!isEnabled);
    }
  };

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View className="flex-row justify-between items-center px-6 py-4 z-10 absolute top-0 w-full" style={{ marginTop: insets.top }}>
        <View>
          <Text className="text-white text-lg font-semibold">{roomName || 'Call'}</Text>
          <Text className="text-[#9e9e9e] text-xs font-mono">{identity || 'user'}</Text>
        </View>
        {isConnected && (
          <View className="bg-[#1b1b1b] px-3 py-1.5 rounded-sm">
            <Text className="text-white text-sm font-mono">{fmtDur(callDuration)}</Text>
          </View>
        )}
      </View>

      <View className="flex-1 justify-center items-center">
        {!isConnected ? (
          <View className="items-center">
            <ActivityIndicator size="large" color="#ffffff" />
            <Text className="text-white text-base font-medium mt-4">Connecting to {roomName}...</Text>
          </View>
        ) : tracks.length > 0 ? (
          <View className="flex-1 w-full h-full flex-row flex-wrap">
            {tracks.map((trackRef, idx) => (
              <View key={idx} className="flex-1 min-w-[50%] min-h-[50%] border border-black relative">
                {trackRef.publication?.track && (
                  <VideoView
                    videoTrack={trackRef.publication.track as any}
                    style={{ position: 'absolute', width: '100%', height: '100%' }}
                    objectFit="cover"
                  />
                )}
                <View className="absolute bottom-4 left-4 bg-black/50 px-2 py-1 rounded-sm">
                  <Text className="text-white text-xs">{trackRef.participant.identity}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className="items-center">
            <View className="w-[120px] h-[120px] rounded-full bg-[#1b1b1b] justify-center items-center mb-6">
              <Text className="text-[#5d5f5f] text-5xl font-extrabold">{identity?.[0]?.toUpperCase() || '?'}</Text>
            </View>
            <Text className="text-white text-lg font-semibold">Voice Call Active</Text>
            <Text className="text-[#5d5f5f] text-xs mt-2 font-mono">{room.numParticipants} participants</Text>
          </View>
        )}
      </View>

      <View className="flex-row justify-center items-center gap-6 py-8 absolute bottom-0 w-full z-10 bg-gradient-to-t from-black to-transparent" style={{ paddingBottom: Math.max(32, insets.bottom) }}>
        <TouchableOpacity className={`w-14 h-14 rounded-full justify-center items-center ${localParticipant?.isMicrophoneEnabled ? 'bg-[#1b1b1b]' : 'bg-[#ffffff]'}`} onPress={toggleMic}>
          <Text className="text-xl">🎙️</Text>
        </TouchableOpacity>
        <TouchableOpacity className="w-16 h-16 rounded-full bg-[#ba1a1a] justify-center items-center" onPress={() => { room.disconnect(); router.back(); }}>
          <Text className="text-white text-[22px]">✕</Text>
        </TouchableOpacity>
        <TouchableOpacity className={`w-14 h-14 rounded-full justify-center items-center ${localParticipant?.isCameraEnabled ? 'bg-[#1b1b1b]' : 'bg-[#ffffff]'}`} onPress={toggleCamera}>
          <Text className="text-xl">📹</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
