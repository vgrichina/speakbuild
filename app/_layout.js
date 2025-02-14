import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { registerGlobals } from '@livekit/react-native-webrtc';

// Register WebRTC globals
registerGlobals();

export default function Layout() {
    return (
        <SafeAreaProvider>
            <Stack>
                <Stack.Screen 
                    name="index" 
                    options={{ headerShown: false }}
                />
            </Stack>
        </SafeAreaProvider>
    );
}
