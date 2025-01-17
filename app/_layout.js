import { Stack } from 'expo-router';
import { VoiceAssistant } from '../src/main';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function Layout() {
    return (
        <SafeAreaProvider>
            <Stack>
                <Stack.Screen 
                    name="index" 
                    options={{ headerShown: false }}
                />
            </Stack>
            <VoiceAssistant />
        </SafeAreaProvider>
    );
}
