import { VoiceAssistant } from '../src/main';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function Layout() {
    return (
        <SafeAreaProvider>
            <VoiceAssistant />
        </SafeAreaProvider>
    );
}
