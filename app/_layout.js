import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ComponentHistoryProvider } from '../src/contexts/ComponentHistoryContext';
import { Settings } from 'lucide-react-native';
import { NavigationButtons } from '../src/components/NavigationButtons';
import { DebugMenuButton } from '../src/components/DebugMenuButton';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useComponentHistory } from '../src/contexts/ComponentHistoryContext';

function HeaderRightButtons({ navigation }) {
    const { current, clearHistory } = useComponentHistory();
    const router = useRouter();
    
    return (
        <View style={{ overflow: 'visible' }}>
            <DebugMenuButton
                onViewSource={() => {
                    if (current?.code) {
                        console.log('ViewSource - code preview:', current.code?.slice(0, 100) + '...');
                        const encoded = encodeURIComponent(current.code);
                        console.log('ViewSource - encoded preview:', encoded?.slice(0, 100) + '...');
                        router.push({
                            pathname: 'code-viewer',
                            params: { code: encoded }
                        });
                    } else {
                        console.log('ViewSource - no code in current:', current);
                    }
                }}
                onDebugGeneration={() => router.push('debug')}
                onClearHistory={clearHistory}
                currentHistoryEntry={current}
                showSourceCode={false}
            />
        </View>
    );
}

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
export default function Layout() {
    const router = useRouter();
    return (
        <SafeAreaProvider>
            <ComponentHistoryProvider>
                <Stack
                screenOptions={{
                    headerStyle: {
                        backgroundColor: '#f5f5f5',
                    },
                    headerTintColor: '#000',
                }}
            >
                <Stack.Screen 
                    name="index" 
                    options={({ navigation }) => ({
                        headerLeft: () => (
                            <Pressable 
                                onPress={() => router.push('settings')}
                                style={{ padding: 12, marginLeft: -8 }}
                            >
                                <Settings size={24} color="#666" />
                            </Pressable>
                        ),
                        headerTitle: () => (
                            <NavigationButtons 
                                stopGeneration={() => {}}
                            />
                        ),
                        headerRight: () => <HeaderRightButtons navigation={navigation} />
                    })}
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
                        title: 'Debug Generation',
                        headerRight: () => (
                            <Pressable
                                style={styles.generateButton}
                                onPress={() => {
                                    // We'll need to lift this state and logic up
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
