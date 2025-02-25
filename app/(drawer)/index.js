import React from 'react';
import { View } from 'react-native';
import { VoiceAssistant } from '../../src/main';
import { useNavigation } from 'expo-router';
import { NavigationButtons } from '../../src/components/NavigationButtons';
import { DebugMenuButton } from '../../src/components/DebugMenuButton';
import { useComponentHistory } from '../../src/contexts/ComponentHistoryContext';
import { useRouter } from 'expo-router';
import { Settings } from 'lucide-react-native';

export default function Index() {
    const navigation = useNavigation();
    const router = useRouter();
    const { current, clearHistory } = useComponentHistory();
    
    // Set up the header
    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: true,
            headerStyle: {
                backgroundColor: '#f5f5f5',
            },
            headerTintColor: '#000',
            headerLeft: () => (
                <Settings 
                    size={24} 
                    color="#666" 
                    style={{ marginLeft: 8 }}
                    onPress={() => router.push('settings')}
                />
            ),
            headerTitle: () => (
                <NavigationButtons 
                    stopGeneration={() => {}}
                />
            ),
            headerRight: () => (
                <DebugMenuButton
                    onViewSource={() => {
                        if (current?.code) {
                            console.log('ViewSource - code preview:', current.code?.slice(0, 100) + '...');
                            router.push({
                                pathname: 'code-viewer',
                                params: { code: current.code }
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
            )
        });
    }, [navigation, current]);

    return (
        <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
            <View style={{ flex: 1, maxWidth: 800, width: '100%', alignSelf: 'center' }}>
                <VoiceAssistant />
            </View>
        </View>
    );
}
