import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { ConversationList } from '../../src/components/ConversationList';
import { Feather } from '@expo/vector-icons';
// Both context providers have been removed:
// - AssistantProvider - replaced by AssistantService
// - VoiceRoomProvider - replaced by audioSession service

export default function DrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Now using service-based architecture instead of context providers */}
      <Drawer
        screenOptions={{
          headerShown: true,
          drawerStyle: {
            width: 300,
          },
        }}
        drawerContent={(props) => <ConversationList {...props} />}
      >
        <Drawer.Screen
          name="index"
          options={{
            drawerLabel: "Home",
            headerShown: true,
            drawerIcon: ({ color }) => <Feather name="home" size={24} color={color} />
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
