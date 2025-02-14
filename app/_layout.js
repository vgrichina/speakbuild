import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { registerGlobals } from '@livekit/react-native-webrtc';
import { setLogLevel, setLogExtension } from 'livekit-client';

// Register WebRTC globals
registerGlobals();

// Setup LiveKit logging
setLogLevel('trace');
setLogExtension((level, msg, context) => {
  console.log(`LiveKit [${level}]:`, msg, context);
});

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
