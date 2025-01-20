import { View } from 'react-native';
import { VoiceAssistant } from '../src/main';

export default function Index() {
    return (
        <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
            <View style={{ flex: 1, maxWidth: 800, width: '100%', alignSelf: 'center' }}>
                <VoiceAssistant />
            </View>
        </View>
    );
}
