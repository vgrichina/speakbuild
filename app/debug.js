import { SafeAreaView, Pressable, Text, ActivityIndicator } from 'react-native';
import DebugGeneration from '../src/components/DebugGeneration';
import { useRouter, useNavigation } from 'expo-router';
import { useSettings } from '../src/hooks/useSettings';
import { useEffect, useRef, useState } from 'react';

export default function DebugScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const { selectedModel, openrouterApiKey } = useSettings();
    const debugGenerationRef = useRef();
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <Pressable
                    style={[
                        styles.generateButton,
                        isGenerating && { opacity: 0.7 }
                    ]}
                    disabled={isGenerating}
                    onPress={async () => {
                        if (isGenerating) return;
                        setIsGenerating(true);
                        if (debugGenerationRef.current?.generateAllWidgets) {
                            try {
                                await debugGenerationRef.current.generateAllWidgets();
                            } finally {
                                setIsGenerating(false);
                            }
                        }
                    }}
                >
                    {isGenerating && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 5 }} />}
                    <Text style={styles.buttonText}>{isGenerating ? "Generating..." : "Generate All"}</Text>
                </Pressable>
            ),
        });
    }, [isGenerating]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
            <DebugGeneration
                ref={debugGenerationRef}
                onClose={() => router.dismiss()}
                selectedModel={selectedModel}
                apiKey={openrouterApiKey}
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
