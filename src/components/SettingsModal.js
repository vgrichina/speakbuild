import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, Pressable, Modal, Linking } from 'react-native';
import { Key } from 'lucide-react-native';

const LANGUAGES = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'fr-FR', name: 'French' },
    { code: 'de-DE', name: 'German' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'ko-KR', name: 'Korean' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'ru-RU', name: 'Russian' }
];

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

export const SettingsModal = ({ isOpen, onClose, apiKey, onSave, selectedLanguage, setSelectedLanguage }) => {
    const [key, setKey] = useState(apiKey);
    const modalContentRef = useRef(null);
    const [modalLayout, setModalLayout] = useState(null);

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
                                value={key}
                                onChangeText={setKey}
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
                                <ScrollView>
                                    {LANGUAGES.map(lang => (
                                        <Pressable
                                            key={lang.code}
                                            style={[
                                                styles.languageOption,
                                                selectedLanguage === lang.code && styles.languageOptionSelected
                                            ]}
                                            onPress={() => setSelectedLanguage(lang.code)}
                                        >
                                            <Text style={[
                                                styles.languageOptionText,
                                                selectedLanguage === lang.code && styles.languageOptionTextSelected
                                            ]}>
                                                {lang.name}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>

                        <Text style={{ color: '#666' }}>
                            Using Claude as the default model for optimal results.
                        </Text>

                        <Pressable
                            style={[styles.button, !key && styles.buttonDisabled]}
                            onPress={() => {
                                if (key) {
                                    onSave(key);
                                    onClose();
                                }
                            }}
                            disabled={!key}
                        >
                            <Text style={styles.buttonText}>Save Settings</Text>
                        </Pressable>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
};
