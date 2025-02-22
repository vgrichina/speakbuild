import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, Pressable, Modal, Linking, ActivityIndicator, SafeAreaView, FlatList } from 'react-native';
import { Key } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Language name mapping for common locales
const MODELS = [
    { code: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
    { code: 'deepseek/deepseek-r1', name: 'DeepSeek R1' }
];

const LANGUAGES = [
    { code: 'ar', name: 'Arabic' },
    { code: 'bg', name: 'Bulgarian' },
    { code: 'zh', name: 'Chinese' },
    { code: 'cs', name: 'Czech' },
    { code: 'da', name: 'Danish' },
    { code: 'nl', name: 'Dutch' },
    { code: 'en', name: 'English' },
    { code: 'fi', name: 'Finnish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'el', name: 'Greek' },
    { code: 'hi', name: 'Hindi' },
    { code: 'hu', name: 'Hungarian' },
    { code: 'it', name: 'Italian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'pl', name: 'Polish' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ro', name: 'Romanian' },
    { code: 'ru', name: 'Russian' },
    { code: 'sk', name: 'Slovak' },
    { code: 'es', name: 'Spanish' },
    { code: 'sv', name: 'Swedish' },
    { code: 'ta', name: 'Tamil' },
    { code: 'tr', name: 'Turkish' },
    { code: 'uk', name: 'Ukrainian' },
    { code: 'vi', name: 'Vietnamese' }
];

const styles = StyleSheet.create({
    selectionButton: {
        padding: 12,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        marginVertical: 4,
    },
    selectedValue: {
        color: '#666',
        marginTop: 4,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalCloseButton: {
        color: '#007AFF',
        fontSize: 16,
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

export const Settings = ({ onClose, ultravoxApiKey, openrouterApiKey, selectedLanguage, selectedModel, onSave }) => {
    const [draftUltravoxKey, setDraftUltravoxKey] = useState('');
    const [draftOpenrouterKey, setDraftOpenrouterKey] = useState('');
    const [draftLanguage, setDraftLanguage] = useState(selectedLanguage);
    const [draftModel, setDraftModel] = useState(selectedModel);
    const [showLanguageSelect, setShowLanguageSelect] = useState(false);
    const [showModelSelect, setShowModelSelect] = useState(false);


    // Reset drafts when component mounts
    React.useEffect(() => {
        setDraftUltravoxKey(ultravoxApiKey || '');
        setDraftOpenrouterKey(openrouterApiKey || '');
        setDraftModel(selectedModel || '');
        setDraftLanguage(selectedLanguage || '');
    }, [ultravoxApiKey, openrouterApiKey, selectedModel, selectedLanguage]);

    return (
            <SafeAreaView style={{
                flex: 1,
                backgroundColor: '#F9FAFB',
            }}>
                <ScrollView 
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={{ gap: 16 }}>
                        <View style={{ gap: 8 }}>
                                <Text style={{ fontWeight: 'bold' }}>Ultravox API Key</Text>
                                <TextInput
                                    secureTextEntry
                                    value={draftUltravoxKey}
                                    onChangeText={setDraftUltravoxKey}
                                    style={styles.input}
                                    placeholder="ultravox-..."
                                />
                                <Pressable 
                                    onPress={() => Linking.openURL('https://app.ultravox.ai')}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                >
                                    <Key size={12} color="#3B82F6" />
                                    <Text style={{ color: '#3B82F6' }}>Get Ultravox API key</Text>
                                </Pressable>
                            </View>

                            <View style={{ gap: 8 }}>
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
                        <Pressable 
                            style={styles.selectionButton}
                            onPress={() => setShowLanguageSelect(true)}
                        >
                            <View>
                                <Text style={{ fontWeight: 'bold' }}>Recognition Language</Text>
                                <Text style={styles.selectedValue}>
                                    {LANGUAGES.find(l => l.code === draftLanguage)?.name || 'Select language'}
                                </Text>
                            </View>
                        </Pressable>

                        <Pressable 
                            style={styles.selectionButton}
                            onPress={() => setShowModelSelect(true)}
                        >
                            <View>
                                <Text style={{ fontWeight: 'bold' }}>Model Selection</Text>
                                <Text style={styles.selectedValue}>
                                    {MODELS.find(m => m.code === draftModel)?.name || 'Select model'}
                                </Text>
                            </View>
                        </Pressable>

                        <Pressable
                            style={[styles.button, (!draftUltravoxKey || !draftOpenrouterKey) && styles.buttonDisabled]}
                            onPress={() => {
                                if (draftUltravoxKey && draftOpenrouterKey) {
                                    onSave(draftUltravoxKey, draftOpenrouterKey, draftModel, draftLanguage);
                                }
                            }}
                            disabled={!draftUltravoxKey || !draftOpenrouterKey}
                        >
                            <Text style={styles.buttonText}>Save Settings</Text>
                        </Pressable>
                    </View>
                </ScrollView>

                {/* Language Selection Modal */}
                <Modal
                    visible={showLanguageSelect}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowLanguageSelect(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Language</Text>
                                <Pressable onPress={() => setShowLanguageSelect(false)}>
                                    <Text style={styles.modalCloseButton}>Close</Text>
                                </Pressable>
                            </View>
                            <FlatList
                                data={LANGUAGES}
                                keyExtractor={item => item.code}
                                renderItem={({ item }) => (
                                    <Pressable
                                        style={[
                                            styles.languageOption,
                                            draftLanguage === item.code && styles.languageOptionSelected
                                        ]}
                                        onPress={() => {
                                            setDraftLanguage(item.code);
                                            setShowLanguageSelect(false);
                                        }}
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
                        </View>
                    </View>
                </Modal>

                {/* Model Selection Modal */}
                <Modal
                    visible={showModelSelect}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowModelSelect(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Model</Text>
                                <Pressable onPress={() => setShowModelSelect(false)}>
                                    <Text style={styles.modalCloseButton}>Close</Text>
                                </Pressable>
                            </View>
                            <FlatList
                                data={MODELS}
                                keyExtractor={item => item.code}
                                renderItem={({ item }) => (
                                    <Pressable
                                        style={[
                                            styles.languageOption,
                                            draftModel === item.code && styles.languageOptionSelected
                                        ]}
                                        onPress={() => {
                                            setDraftModel(item.code);
                                            setShowModelSelect(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.languageOptionText,
                                            draftModel === item.code && styles.languageOptionTextSelected
                                        ]}>
                                            {item.name}
                                        </Text>
                                    </Pressable>
                                )}
                            />
                        </View>
                    </View>
                </Modal>

            </SafeAreaView>
    );
};
