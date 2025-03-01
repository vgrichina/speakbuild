import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { ConversationList } from '../../src/components/ConversationList';
import { Feather } from '@expo/vector-icons';
import { VoiceRoomProvider } from '../../src/contexts/VoiceRoomContext';

export default function DrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <VoiceRoomProvider>
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
      </VoiceRoomProvider>
    </GestureHandlerRootView>
  );
}
