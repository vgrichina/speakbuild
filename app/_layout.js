import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Settings } from 'lucide-react-native';
import { NavigationButtons } from '../src/components/NavigationButtons';
import { DebugMenuButton } from '../src/components/DebugMenuButton';
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
import { useComponentHistory } from '../src/hooks/useComponentHistory';

export default function Layout() {
    const {
        history: componentHistory,
        currentIndex: currentHistoryIndex,
        setCurrentIndex: setCurrentHistoryIndex,
        clearHistory,
        current: currentHistoryEntry
    } = useComponentHistory();

    return (
        <SafeAreaProvider>
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
                                onPress={() => navigation.push('settings')}
                                style={{ padding: 12, marginLeft: -8 }}
                            >
                                <Settings size={24} color="#666" />
                            </Pressable>
                        ),
                        headerTitle: () => (
                            <NavigationButtons 
                                componentHistory={componentHistory}
                                currentHistoryIndex={currentHistoryIndex}
                                onNavigateBack={() => setCurrentHistoryIndex(currentHistoryIndex - 1)}
                                onNavigateForward={() => setCurrentHistoryIndex(currentHistoryIndex + 1)}
                                stopGeneration={() => {}}
                            />
                        ),
                        headerRight: () => (
                            <View style={{ overflow: 'visible' }}>
                                {console.log('Debug menu state:', {
                                    currentHistoryEntry,
                                    component: currentHistoryEntry?.component,
                                    code: currentHistoryEntry?.code
                                })}
                                <DebugMenuButton
                                    onViewSource={() => {
                                        if (currentHistoryEntry?.code) {
                                            navigation.push('code-viewer', {
                                                code: currentHistoryEntry.code
                                            });
                                        }
                                    }}
                                    onDebugGeneration={() => navigation.push('debug')}
                                    onClearHistory={clearHistory}
                                    currentHistoryEntry={currentHistoryEntry}
                                    showSourceCode={false}
                                />
                            </View>
                        )
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
                    options={{
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
                    }}
                />
            </Stack>
        </SafeAreaProvider>
    );
}
