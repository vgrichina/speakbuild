import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function Layout() {
    return (
        <SafeAreaProvider>
            <Stack>
                <Stack.Screen 
                    name="index" 
                    options={{ headerShown: false }}
                />
                <Stack.Screen 
                    name="settings" 
                    options={{
                        presentation: 'modal',
                        animation: 'slide_from_bottom',
                        title: 'Settings'
                    }}
                />
                <Stack.Screen 
                    name="debug" 
                    options={{
                        presentation: 'modal',
                        animation: 'slide_from_bottom',
                        title: 'Debug Generation'
                    }}
                />
            </Stack>
        </SafeAreaProvider>
    );
}
