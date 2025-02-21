import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Settings } from 'lucide-react-native';
import { NavigationButtons } from '../src/components/NavigationButtons';
import { DebugMenuButton } from '../src/components/DebugMenuButton';
import { Pressable } from 'react-native';
import { useComponentHistory } from '../src/hooks/useComponentHistory';

export default function Layout() {
    const {
        history: componentHistory,
        currentIndex: currentHistoryIndex,
        setCurrentIndex: setCurrentHistoryIndex
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
                            <DebugMenuButton />
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
                        title: 'Debug Generation'
                    }}
                />
                <Stack.Screen 
                    name="code-viewer" 
                    options={{
                        presentation: 'modal',
                        animation: 'slide_from_bottom',
                        title: 'Source Code'
                    }}
                />
            </Stack>
        </SafeAreaProvider>
    );
}
