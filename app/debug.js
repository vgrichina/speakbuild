import { SafeAreaView, Pressable, Text } from 'react-native';
import DebugGeneration from '../src/components/DebugGeneration';
import { useRouter, useNavigation } from 'expo-router';
import { useSettings } from '../src/hooks/useSettings';
import { useEffect, useRef } from 'react';

export default function DebugScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const { selectedModel } = useSettings();
    const debugGenerationRef = useRef();

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <Pressable
                    style={styles.generateButton}
                    onPress={async () => {
                        if (debugGenerationRef.current?.generateAllWidgets) {
                            await debugGenerationRef.current.generateAllWidgets();
                        }
                    }}
                >
                    <Text style={styles.buttonText}>Generate All</Text>
                </Pressable>
            ),
        });
    }, []);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
            <DebugGeneration
                ref={debugGenerationRef}
                onClose={() => router.dismiss()}
                selectedModel={selectedModel}
            />
        </SafeAreaView>
    );
}

const styles = {
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
};
