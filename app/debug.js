import { SafeAreaView, Pressable, Text, ActivityIndicator, View } from 'react-native';
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
    const [canStop, setCanStop] = useState(false);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <Pressable
                    style={[
                        styles.generateButton,
                        isGenerating && { opacity: 0.7 }
                    ]}
                    onPress={async () => {
                        if (isGenerating) {
                            // Stop generation
                            if (debugGenerationRef.current?.stopGeneration) {
                                debugGenerationRef.current.stopGeneration();
                                setCanStop(false);
                            }
                        } else {
                            // Start generation
                            setIsGenerating(true);
                            setCanStop(true);
                            if (debugGenerationRef.current?.generateAllWidgets) {
                                try {
                                    await debugGenerationRef.current.generateAllWidgets();
                                } finally {
                                    setIsGenerating(false);
                                    setCanStop(false);
                                }
                            }
                        }
                    }}
                >
                    <View style={styles.buttonContent}>
                        {isGenerating && (
                            <ActivityIndicator 
                                size="small" 
                                color="#fff" 
                                style={{ marginRight: 5 }} 
                            />
                        )}
                        <Text style={styles.buttonText}>{isGenerating ? "Stop" : "Generate All"}</Text>
                    </View>
                </Pressable>
            ),
        });
    }, [isGenerating, canStop]);

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
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignSelf: 'flex-start',
        minWidth: 110,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 14
    }
};
