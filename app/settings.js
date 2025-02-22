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

    const handleSave = async (ultravoxKey, openrouterKey, model, language) => {
        try {
            console.log('Saving settings...');
            await saveSettings(ultravoxKey, openrouterKey, model, language);
            console.log('Settings saved, now dismissing');
            router.dismiss();
        } catch (error) {
            console.error('Error saving settings:', error);
            // Handle error appropriately
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <Settings
                onClose={() => router.dismiss()}
                ultravoxApiKey={ultravoxApiKey}
                openrouterApiKey={openrouterApiKey}
                selectedLanguage={selectedLanguage}
                selectedModel={selectedModel}
                onSave={handleSave}
            />
        </View>
    );
}
