import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ComponentHistoryProvider } from '../src/contexts/ComponentHistoryContext';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';

const styles = StyleSheet.create({
    generateButton: {
        backgroundColor: '#007AFF',
        padding: 8,
        borderRadius: 6,
        alignSelf: 'flex-start'
    },
    buttonText: {
        color: '#fff',
        fontSize: 14
    }
});

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <ComponentHistoryProvider>
                <Stack screenOptions={{
                    headerShown: false
                }}>
                    <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
                    <Stack.Screen 
                        name="settings" 
                        options={{
                            headerShown: true,
                            presentation: 'modal',
                            animation: 'slide_from_bottom',
                            title: 'Settings'
                        }}
                    />
                    <Stack.Screen 
                        name="debug" 
                        options={{
                            headerShown: true,
                            presentation: 'modal',
                            animation: 'slide_from_bottom',
                            title: 'Debug Generation',
                            headerRight: () => (
                                <Pressable
                                    style={styles.generateButton}
                                    onPress={() => {
                                        console.log('Generate All pressed');
                                    }}
                                >
                                    <Text style={styles.buttonText}>Generate All</Text>
                                </Pressable>
                            )
                        }}
                    />
                    <Stack.Screen 
                        name="code-viewer" 
                        options={({ route }) => ({
                            headerShown: true,
                            presentation: 'modal',
                            animation: 'slide_from_bottom',
                            title: 'Source Code',
                            headerRight: () => (
                                <Pressable 
                                    onPress={async () => {
                                        try {
                                            await Clipboard.setStringAsync(route.params.code);
                                        } catch (error) {
                                            console.error('Failed to copy:', error);
                                        }
                                    }}
                                    style={{ padding: 12 }}
                                >
                                    <Text style={{ color: '#007AFF' }}>Copy</Text>
                                </Pressable>
                            )
                        })}
                    />
                </Stack>
            </ComponentHistoryProvider>
        </SafeAreaProvider>
    );
}
