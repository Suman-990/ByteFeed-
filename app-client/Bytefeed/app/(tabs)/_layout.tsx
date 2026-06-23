import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#f9f9f9',
          borderTopWidth: 1,
          borderTopColor: '#cfc4c5',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#7e7576',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <Text className="text-lg -mb-0.5" style={{ color }}>{focused ? '●' : '○'}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused, color }) => (
            <Text className="text-lg -mb-0.5" style={{ color }}>{focused ? '◉' : '◎'}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          title: 'Groups',
          tabBarIcon: ({ focused, color }) => (
            <Text className="text-lg -mb-0.5" style={{ color }}>{focused ? '▣' : '▢'}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused, color }) => (
            <Text className="text-lg -mb-0.5" style={{ color }}>{focused ? '◼' : '◻'}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <Text className="text-lg -mb-0.5" style={{ color }}>{focused ? '◆' : '◇'}</Text>
          ),
        }}
      />
    </Tabs>
  );
}
