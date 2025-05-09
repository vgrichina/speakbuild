import React from 'react';
import { View } from 'react-native';
import { VoiceAssistant } from '../../src/main';
import { useNavigation } from 'expo-router';
import { NavigationButtons } from '../../src/components/NavigationButtons';
import { DebugMenuButton } from '../../src/components/DebugMenuButton';
import { useAssistantState } from '../../src/hooks/useAssistantState';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function Index() {
    const navigation = useNavigation();
    const router = useRouter();
    const { current, history, currentIndex: currentHistoryIndex, goBack, goForward, clearHistory } = useAssistantState();
    
    // Set up the header
    React.useLayoutEffect(() => {
        console.log('Setting up header in (drawer)/index.js');
        navigation.setOptions({
            headerShown: true,
            headerStyle: {
                backgroundColor: '#f5f5f5',
            },
            headerTintColor: '#000',
            headerTitle: () => (
                <NavigationButtons />
            ),
            headerLeft: () => (
                <Feather 
                    name="menu" 
                    size={24} 
                    color="#666" 
                    style={{ 
                        padding: 12,
                        marginLeft: 4
                    }}
                    onPress={() => navigation.openDrawer()}
                />
            ),
            headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather 
                        name="settings" 
                        size={24} 
                        color="#666" 
                        style={{ marginRight: 16 }}
                        onPress={() => router.push('settings')}
                    />
                    <DebugMenuButton
                        onViewSource={() => {
                            if (current?.component?.code) {
                                console.log('ViewSource - code preview:', current.component.code?.slice(0, 100) + '...');
                                router.push({
                                    pathname: 'code-viewer',
                                    params: { code: current.component.code }
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
            )
        });
        console.log('Header setup complete');
    }, [navigation, current]);

    return (
        <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
            <View style={{ flex: 1, maxWidth: 800, width: '100%', alignSelf: 'center' }}>
                <VoiceAssistant />
            </View>
        </View>
    );
}
