import { View } from 'react-native';
import { SettingsModal } from '../src/components/SettingsModal';
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
            <SettingsModal
                isOpen={true}
                onClose={() => router.back()}
                ultravoxApiKey={ultravoxApiKey}
                openrouterApiKey={openrouterApiKey}
                selectedLanguage={selectedLanguage}
                selectedModel={selectedModel}
                onSave={(ultravoxKey, openrouterKey, model, language) => {
                    saveSettings(ultravoxKey, openrouterKey, model, language);
                    router.back();
                }}
            />
        </View>
    );
}
