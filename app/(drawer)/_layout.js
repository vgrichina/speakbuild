import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { useComponentHistory } from '../../src/contexts/ComponentHistoryContext';
import { ConversationList } from '../../src/components/ConversationList';
import { Feather } from '@expo/vector-icons';

export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: false,
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
          title: "Voice Assistant",
          drawerIcon: ({ color }) => <Feather name="home" size={24} color={color} />
        }}
      />
    </Drawer>
  );
}
