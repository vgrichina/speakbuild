import { registerRootComponent } from 'expo';
import { VoiceAssistant } from './src/main';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function App() {
    return (
        <SafeAreaProvider>
            <VoiceAssistant />
        </SafeAreaProvider>
    );
}

registerRootComponent(App);

export default App;
