import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-[#f9f9f9] p-6">
      <Text className="text-[64px] font-extrabold text-black tracking-[-2px] mb-4">404</Text>
      <Text className="text-base text-[#5d5f5f] mb-8">Page not found</Text>
      <TouchableOpacity
        className="bg-black px-6 py-3 rounded-sm"
        onPress={() => router.replace('/')}
      >
        <Text className="text-white text-sm font-semibold">Go Home</Text>
      </TouchableOpacity>
    </View>
  );
}
