import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, Pressable, Modal, Linking, ActivityIndicator, SafeAreaView, FlatList } from 'react-native';
import { Key } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const SettingsModal = ({ isOpen, onClose, ultravoxApiKey, openrouterApiKey, onSave, selectedModel }) => {
    const [draftUltravoxKey, setDraftUltravoxKey] = useState('');
    const [draftOpenrouterKey, setDraftOpenrouterKey] = useState('');
    const [draftModel, setDraftModel] = useState(selectedModel);

    useEffect(() => {
        if (isOpen) {
            setIsLoadingLanguages(false);
            setLanguages([{ code: 'en-US', name: 'English (US)' }]);
        }
    }, [isOpen]);

    // Reset drafts when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setDraftUltravoxKey(ultravoxApiKey || '');
            setDraftOpenrouterKey(openrouterApiKey || '');
            setDraftModel(selectedModel || '');
        }
    }, [isOpen, ultravoxApiKey, openrouterApiKey, selectedModel]);

    return (
        <Modal
            visible={isOpen}
            animationType="slide"
            onRequestClose={onClose}
            presentationStyle="fullScreen"
        >
            <SafeAreaView style={{
                flex: 1,
                backgroundColor: '#F9FAFB',
            }}>
                <View style={{
                    padding: 16,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottomWidth: 1,
                    borderBottomColor: '#E5E7EB',
                    backgroundColor: 'white',
                }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Settings</Text>
                    <Pressable
                        onPress={onClose}
                        style={{
                            padding: 8,
                            marginRight: -8,
                        }}
                    >
                        <Text style={{ fontSize: 24, color: '#666' }}>×</Text>
                    </Pressable>
                </View>
                <View style={{ flex: 1, padding: 16 }}>
                    <View style={{ gap: 24, flex: 1 }}>
                        <View style={{ gap: 24 }}>
                            <View style={{ gap: 16 }}>
                                <Text style={{ fontWeight: 'bold' }}>Ultravox API Key</Text>
                                <TextInput
                                    secureTextEntry
                                    value={draftUltravoxKey}
                                    onChangeText={setDraftUltravoxKey}
                                    style={styles.input}
                                    placeholder="ultravox-..."
                                />
                                <Pressable 
                                    onPress={() => Linking.openURL('https://ultravox.ai/dashboard')}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                >
                                    <Key size={12} color="#3B82F6" />
                                    <Text style={{ color: '#3B82F6' }}>Get Ultravox API key</Text>
                                </Pressable>
                            </View>

                            <View style={{ gap: 16 }}>
                                <Text style={{ fontWeight: 'bold' }}>OpenRouter API Key</Text>
                                <TextInput
                                    secureTextEntry
                                    value={draftOpenrouterKey}
                                    onChangeText={setDraftOpenrouterKey}
                                    style={styles.input}
                                    placeholder="sk-or-..."
                                />
                                <Pressable 
                                    onPress={() => Linking.openURL('https://openrouter.ai/keys')}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                >
                                    <Key size={12} color="#3B82F6" />
                                    <Text style={{ color: '#3B82F6' }}>Get OpenRouter API key</Text>
                                </Pressable>
                            </View>
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
                                    <FlatList
                                        data={languages}
                                        keyExtractor={item => item.code}
                                        style={{ maxHeight: 150 }}
                                        getItemLayout={(data, index) => ({
                                            length: 44, // Fixed height for each item
                                            offset: 44 * index,
                                            index,
                                        })}
                                        initialScrollIndex={languages.findIndex(l => l.code === selectedLanguage)}
                                        renderItem={({ item }) => (
                                            <Pressable
                                                style={[
                                                    styles.languageOption,
                                                    draftLanguage === item.code && styles.languageOptionSelected
                                                ]}
                                                onPress={() => setDraftLanguage(item.code)}
                                            >
                                                <Text style={[
                                                    styles.languageOptionText,
                                                    draftLanguage === item.code && styles.languageOptionTextSelected
                                                ]}>
                                                    {item.name}
                                                </Text>
                                            </Pressable>
                                        )}
                                    />
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
                                if (draftUltravoxKey && draftOpenrouterKey) {
                                    onSave(draftUltravoxKey, draftOpenrouterKey, draftModel);
                                    onClose();
                                }
                            }}
                            disabled={!draftUltravoxKey || !draftOpenrouterKey}
                        >
                            <Text style={styles.buttonText}>Save Settings</Text>
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
};
