import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, Pressable, Modal, Linking, ActivityIndicator } from 'react-native';
import { Key } from 'lucide-react-native';
import { getSupportedLocales } from 'expo-speech-recognition';

// Language name mapping for common locales
const MODELS = [
    { code: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
    { code: 'deepseek/deepseek-r1', name: 'DeepSeek R1' }
];

const LANGUAGE_NAMES = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ru': 'Russian',
    'pt': 'Portuguese',
    'nl': 'Dutch',
    'pl': 'Polish',
    'tr': 'Turkish',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'th': 'Thai',
    'vi': 'Vietnamese'
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    button: {
        backgroundColor: '#3B82F6',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    languageOption: {
        padding: 12,
        borderRadius: 4,
        marginVertical: 2,
    },
    languageOptionSelected: {
        backgroundColor: '#EBF8FF',
    },
    languageOptionText: {
        color: '#666',
    },
    languageOptionTextSelected: {
        color: '#3B82F6',
        fontWeight: 'bold',
    },
});

export const SettingsModal = ({ isOpen, onClose, apiKey, onSave, selectedLanguage, selectedModel }) => {
    const [draftKey, setDraftKey] = useState('');
    const [draftLanguage, setDraftLanguage] = useState(selectedLanguage);
    const [draftModel, setDraftModel] = useState(selectedModel);
    const modalContentRef = useRef(null);
    const [modalLayout, setModalLayout] = useState(null);
    const [languages, setLanguages] = useState([]);
    const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setIsLoadingLanguages(true);
            getSupportedLocales({
                androidRecognitionServicePackage: "com.google.android.as"
            })
            .then((supportedLocales) => {
                // Combine both online and installed locales
                const allLocales = [...new Set([
                    ...supportedLocales.locales,
                    ...supportedLocales.installedLocales
                ])].sort();

                // Format locales with readable names
                const formattedLocales = allLocales.map(locale => {
                    const [lang, region] = locale.split('-');
                    const baseName = LANGUAGE_NAMES[lang] || lang;
                    return {
                        code: locale,
                        name: region ? `${baseName} (${region})` : baseName
                    };
                });

                setLanguages(formattedLocales);
            })
            .catch((error) => {
                console.error('Error getting supported locales:', error);
                // Fallback to basic language list
                setLanguages([{ code: 'en-US', name: 'English (US)' }]);
            })
            .finally(() => {
                setIsLoadingLanguages(false);
            });
        }
    }, [isOpen]);

    // Reset drafts when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setDraftKey(apiKey || '');
            setDraftLanguage(selectedLanguage);
        }
    }, [isOpen, apiKey, selectedLanguage]);

    const handleOutsideClick = (event) => {
        const { pageX, pageY } = event.nativeEvent;

        if (!modalLayout) return;

        // Check if touch is outside modal bounds
        if (
            pageX < modalLayout.x ||
            pageX > modalLayout.x + modalLayout.width ||
            pageY < modalLayout.y ||
            pageY > modalLayout.y + modalLayout.height
        ) {
            onClose();
        }
    };

    return (
        <Modal
            visible={isOpen}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable 
                style={styles.modalContainer} 
                onTouchStart={handleOutsideClick}
            >
                <View 
                    style={styles.modalContent} 
                    ref={modalContentRef}
                    onLayout={(event) => {
                        const { x, y, width, height } = event.nativeEvent.layout;
                        setModalLayout({ x, y, width, height });
                    }}
                >
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Settings</Text>
                        <Pressable 
                            onPress={onClose}
                            style={{
                                padding: 12,
                                margin: -8,
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ fontSize: 24 }}>×</Text>
                        </Pressable>
                    </View>

                    <View style={{ gap: 24 }}>
                        <View style={{ gap: 16 }}>
                            <Text style={{ fontWeight: 'bold' }}>OpenRouter API Key</Text>
                            <TextInput
                                secureTextEntry
                                value={draftKey}
                                onChangeText={setDraftKey}
                                style={styles.input}
                                placeholder="sk-or-..."
                            />
                            <Pressable 
                                onPress={() => Linking.openURL('https://openrouter.ai/keys')}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                            >
                                <Key size={12} color="#3B82F6" />
                                <Text style={{ color: '#3B82F6' }}>Get your API key</Text>
                            </Pressable>
                        </View>

                        <View style={{ gap: 8 }}>
                            <Text style={{ fontWeight: 'bold' }}>Recognition Language</Text>
                            <View style={{ maxHeight: 150 }}>
                                {isLoadingLanguages ? (
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <ActivityIndicator size="small" color="#3B82F6" />
                                        <Text style={{ marginTop: 8, color: '#666' }}>Loading languages...</Text>
                                    </View>
                                ) : (
                                    <ScrollView>
                                        {languages.map(lang => (
                                        <Pressable
                                            key={lang.code}
                                            style={[
                                                styles.languageOption,
                                                selectedLanguage === lang.code && styles.languageOptionSelected
                                            ]}
                                            onPress={() => setDraftLanguage(lang.code)}
                                        >
                                            <Text style={[
                                                styles.languageOptionText,
                                                draftLanguage === lang.code && styles.languageOptionTextSelected
                                            ]}>
                                                {lang.name}
                                            </Text>
                                        </Pressable>
                                        ))}
                                    </ScrollView>
                                )}
                            </View>
                        </View>

                        <View style={{ gap: 8 }}>
                            <Text style={{ fontWeight: 'bold' }}>Model Selection</Text>
                            <View style={{ maxHeight: 150 }}>
                                <ScrollView>
                                    {MODELS.map(model => (
                                        <Pressable
                                            key={model.code}
                                            style={[
                                                styles.languageOption,
                                                draftModel === model.code && styles.languageOptionSelected
                                            ]}
                                            onPress={() => setDraftModel(model.code)}
                                        >
                                            <Text style={[
                                                styles.languageOptionText,
                                                draftModel === model.code && styles.languageOptionTextSelected
                                            ]}>
                                                {model.name}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>

                        <Pressable
                            style={[styles.button, !draftKey && styles.buttonDisabled]}
                            onPress={() => {
                                if (draftKey) {
                                    onSave(draftKey, draftLanguage, draftModel);
                                    onClose();
                                }
                            }}
                            disabled={!draftKey}
                        >
                            <Text style={styles.buttonText}>Save Settings</Text>
                        </Pressable>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
};
