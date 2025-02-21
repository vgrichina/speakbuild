import { SafeAreaView } from 'react-native';
import DebugGeneration from '../src/components/DebugGeneration';
import { useRouter } from 'expo-router';
import { useSettings } from '../src/hooks/useSettings';

export default function DebugScreen() {
    const router = useRouter();
    const { selectedModel } = useSettings();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
            <DebugGeneration
                onClose={() => router.back()}
                selectedModel={selectedModel}
            />
        </SafeAreaView>
    );
}
