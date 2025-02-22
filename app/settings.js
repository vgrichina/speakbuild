import { View } from 'react-native';
import { Settings } from '../src/components/Settings';
import { useRouter } from 'expo-router';
import { useSettings } from '../src/hooks/useSettings';

export default function SettingsScreen() {
    const router = useRouter();
    const {
        ultravoxApiKey,
        openrouterApiKey,
        selectedLanguage,
        selectedModel,
        saveSettings
    } = useSettings();

    return (
        <View style={{ flex: 1 }}>
            <Settings
                onClose={() => router.dismiss()}
                ultravoxApiKey={ultravoxApiKey}
                openrouterApiKey={openrouterApiKey}
                selectedLanguage={selectedLanguage}
                selectedModel={selectedModel}
                onSave={(ultravoxKey, openrouterKey, model, language) => {
                    console.log('Saving settings...');
                    saveSettings(ultravoxKey, openrouterKey, model, language);
                    console.log('About to dismiss...');
                    router.dismiss();
                    console.log('After dismiss');
                }}
            />
        </View>
    );
}
