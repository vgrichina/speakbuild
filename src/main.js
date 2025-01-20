import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, Pressable, Modal, Linking, Platform, Animated, Image } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Mic, MicOff, Radio, Loader2, Settings, Key } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';

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
  container: {
    padding: 16,
    flex: 1,
    width: '100%',
  },
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
  buttonDisabled: {
    opacity: 0.5,
  },
  linkText: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  voiceButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButtonListening: {
    backgroundColor: '#EF4444',
  },
  transcriptionBox: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  heading: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  linkText: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  errorText: {
    color: '#EF4444',
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectLabel: {
    fontSize: 16,
    color: '#374151',
  },
  select: {
    position: 'relative',
    minWidth: 150,
  },
  selectButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#374151',
  }
});

// Settings modal component
const SettingsModal = ({ isOpen, onClose, apiKey, onSave }) => {
    const [key, setKey] = useState(apiKey);

    return (
        <Modal
            visible={isOpen}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Settings</Text>
                    <Pressable onPress={onClose}>
                        <Text style={{ fontSize: 24 }}>×</Text>
                    </Pressable>
                </View>
                
                <View style={{ gap: 16 }}>
                    <View style={{ gap: 8 }}>
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
            </View>
        </Modal>
    );
};


const Alert = ({ children, variant }) => (
    <View style={{
        padding: 16,
        borderRadius: 8,
        backgroundColor: variant === 'destructive' ? '#FEE2E2' : '#DBEAFE',
    }}>
        {children}
    </View>
);

const AlertDescription = ({ children }) => (
    <Text style={{ fontSize: 14 }}>{children}</Text>
);

const PulsatingCircle = ({ isActive, volume }) => {
    const animation = React.useRef(new Animated.Value(1)).current;
    
    React.useEffect(() => {
        if (isActive) {
            // Scale based on volume (1.0 to 1.5)
            const targetScale = 1 + (volume * 0.5);
            Animated.spring(animation, {
                toValue: targetScale,
                friction: 3,
                tension: 40,
                useNativeDriver: true,
            }).start();
        } else {
            animation.setValue(1);
        }
    }, [isActive, volume]);

    if (!isActive) return null;

    return (
        <Animated.View
            style={{
                position: 'absolute',
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: '#EF4444',
                opacity: 0.3,
                transform: [{ scale: animation }],
            }}
        />
    );
};

const VoiceButton = ({ isListening, onClick, disabled, volume }) => {
    const [isPressed, setIsPressed] = useState(false);
    
    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <PulsatingCircle isActive={isListening} volume={volume} />
            <Pressable
                onPress={onClick}
                onPressIn={() => setIsPressed(true)}
                onPressOut={() => setIsPressed(false)}
                disabled={disabled}
                style={[
                    {
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isListening ? '#EF4444' : '#3B82F6',
                        transform: [{ scale: isPressed ? 0.95 : 1 }],
                    },
                    disabled && { opacity: 0.5 }
                ]}
            >
                {isListening ? 
                    <MicOff size={32} color="white" /> : 
                    <Mic size={32} color="white" />
                }
            </Pressable>
            <Text style={{ 
                marginTop: 8, 
                color: isListening ? '#EF4444' : '#666',
                fontSize: 12 
            }}>
                {isListening ? 'Tap to stop' : 'Tap to speak'}
            </Text>
        </View>
    );
};

export const VoiceAssistant = () => {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const checkApiKey = async () => {
            const currentApiKey = await AsyncStorage.getItem('openrouter_api_key');
            if (!currentApiKey) {
                setIsSettingsOpen(true);
            }
        };
        checkApiKey();
    }, []);
    const [partialResults, setPartialResults] = useState('');
    const [transcribedText, setTranscribedText] = useState('');
    const [responseStream, setResponseStream] = useState('');
    const [error, setError] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('en-US');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [apiKey, setApiKey] = useState('');

    // Load API key from AsyncStorage on mount
    useEffect(() => {
        const loadApiKey = async () => {
            const savedKey = await AsyncStorage.getItem('openrouter_api_key');
            if (savedKey) {
                setApiKey(savedKey);
            }
        };
        loadApiKey();
    }, []);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [currentComponent, setCurrentComponent] = useState(null);
    const [currentComponentCode, setCurrentComponentCode] = useState('');
    const [showSourceCode, setShowSourceCode] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);

    const [isSpeechListening, setIsSpeechListening] = useState(false);
    const [speechVolume, setSpeechVolume] = useState(0);
    const [speechPartialResults, setSpeechPartialResults] = useState('');
    const [hasSpeechPermission, setHasSpeechPermission] = useState(false);

    useEffect(() => {
        const checkPermissions = async () => {
            const result = await ExpoSpeechRecognitionModule.getPermissionsAsync();
            if (result.granted) {
                setHasSpeechPermission(true);
            } else if (result.canAskAgain) {
                const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
                setHasSpeechPermission(granted);
            }
        };
        checkPermissions();
    }, []);

    // Speech recognition event handlers
    useSpeechRecognitionEvent("start", () => setIsSpeechListening(true));
    useSpeechRecognitionEvent("end", () => {
        setIsSpeechListening(false);
        setSpeechVolume(0);
    });

    useSpeechRecognitionEvent("result", (event) => {
        if (event.results?.[0]) {
            if (event.isFinal) {
                setTranscribedText(event.results[0].transcript);
                processWithClaudeStream(event.results[0].transcript);
                setSpeechVolume(0);
            } else {
                setSpeechPartialResults(event.results[0].transcript);
            }
        }
    });

    useSpeechRecognitionEvent("volumechange", (event) => {
        if (typeof event.value === 'number') {
            const normalizedVolume = Math.max(0, Math.min(1, (event.value + 2) / 12));
            setSpeechVolume(normalizedVolume);
        }
    });

    useSpeechRecognitionEvent("error", (event) => {
        setError(`Recognition error: ${event.error}`);
        setIsSpeechListening(false);
    });


    const processWithClaudeStream = async (text) => {
        const currentApiKey = await AsyncStorage.getItem('openrouter_api_key');
        if (!currentApiKey) {
            setError('Please set your OpenRouter API key in settings');
            setIsSettingsOpen(true);
            return;
        }

        setIsProcessing(true);
        setResponseStream('');
        
        try {
            console.log('Making OpenRouter API request...');
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentApiKey}`,
                    'Content-Type': 'application/json',
                    'X-Title': 'Voice Assistant Web App',
                },
                body: JSON.stringify({
                    model: 'anthropic/claude-3.5-sonnet',
                    messages: [
                        ...(currentComponentCode ? [{
                            role: 'system',
                            content: `Previous component code for reference:\n\`\`\`jsx\n${currentComponentCode}\n\`\`\`\nUse this as reference if the new request is similar or builds upon it.`
                        }] : []),
                        {
                            role: 'user',
                            content: `Generate a React Native component based on this request: "${text}".
                                     Return ONLY the component code using React.createElement (no JSX).
                                     Define the component as 'function Component() {' (no export statement).
                                     Use only React Native components: View, Text, Image, ScrollView, etc.
                                     Use only React Native compatible styles (no web-specific CSS).
                                     Use React.useState for any state management.
                                     Do not include any explanation or markdown - just the pure JavaScript code.
                                     The code should start directly with 'function Component() {'.
                                     Start your response with \`\`\` and end with \`\`\`.
                                     
                                     Example format:
                                     \`\`\`
                                     function Component() {
                                       const [state, setState] = React.useState(null);
                                       return React.createElement(View, {
                                         style: { padding: 10 }
                                       }, React.createElement(Text, null, 'Hello'));
                                     }
                                     \`\`\``
                        }
                    ],
                    stream: true
                }),
            });

            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API error response:', errorText);
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (!line.trim() || !line.startsWith('data: ')) continue;
                    if (line === 'data: [DONE]') break;

                    try {
                        const data = JSON.parse(line.slice(6));
                        const content = data.choices?.[0]?.delta?.content;
                        if (content) {
                            fullResponse += content;
                            setResponseStream(fullResponse);
                        }
                    } catch (e) {
                        console.error('Error parsing stream:', e);
                    }
                }
            }

            // After receiving complete response, try to create component
            try {
                console.log('Full response:', fullResponse);
                
                // Extract code from markdown code block
                const codeMatch = fullResponse.match(/```(?:jsx|javascript)?\n([\s\S]*?)```/);
                if (!codeMatch) {
                    throw new Error('No code block found in response');
                }
                const code = codeMatch[1].trim();
                console.log('Extracted code:', code);
                
                // Create component function with proper scope access
                const componentCode = `
                    const React = arguments[0];
                    const { View, Text, Image, ScrollView } = arguments[1];
                    ${code}
                    return Component;
                `;
                
                // Create and execute the function with React and RN components in scope
                const createComponent = new Function(componentCode);
                const GeneratedComponent = createComponent(React, { 
                    View, Text, Image, ScrollView 
                });

                // Store the current component and its source code
                setCurrentComponent(() => GeneratedComponent);
                setCurrentComponentCode(code);

            } catch (error) {
                console.error('Error creating component:', error);
                setError(`Failed to create component: ${error.message}`);
            } finally {
                setIsProcessing(false);
            }
        } catch (error) {
            console.error('API call error:', error);
            if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
                setError('Network error: Please check your internet connection');
            } else {
                setError(`Error: ${error.message}`);
            }
            setIsProcessing(false);
        }
    };

    const toggleListening = useCallback(async () => {
        try {
            if (isSpeechListening) {
                await ExpoSpeechRecognitionModule.stop();
            } else {
                setSpeechPartialResults('');
                setTranscribedText('');
                setResponseStream('');
                await ExpoSpeechRecognitionModule.start({
                    lang: selectedLanguage,
                    interimResults: true,
                    maxAlternatives: 1,
                    volumeChangeEventOptions: {
                        enabled: true,
                        intervalMillis: 300
                    }
                });
            }
        } catch (error) {
            setError(`Toggle error: ${error.message}`);
        }
    }, [isSpeechListening, selectedLanguage]);

    const handleTextSubmit = (e) => {
        e.preventDefault();
        if (!textInput.trim()) return;
        
        setTranscribedText(textInput);
        processWithClaudeStream(textInput);
        setTextInput('');
    };

    return (
        <View style={styles.container}>
            {/* Header with Settings and Language Controls */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => setIsSettingsOpen(true)}
                    style={styles.button}
                >
                    <Settings size={20} color="white" />
                    <Text style={styles.buttonText}>Settings</Text>
                </Pressable>
                
                <View style={styles.selectContainer}>
                    <Text style={styles.selectLabel}>Language:</Text>
                    <Pressable
                        onPress={() => setShowLanguageModal(true)}
                        style={styles.selectButton}
                    >
                        <Text style={styles.selectButtonText}>
                            {LANGUAGES.find(lang => lang.code === selectedLanguage)?.name || selectedLanguage}
                        </Text>
                    </Pressable>
                </View>
            </View>

            {/* Voice Button */}
            {hasSpeechPermission && (
                <View style={{ alignItems: 'center', marginVertical: 16 }}>
                    <VoiceButton
                        isListening={isSpeechListening}
                        onClick={toggleListening}
                        disabled={!hasSpeechPermission}
                        volume={speechVolume}
                    />
                </View>
            )}

            {/* Text Input */}
            {!hasSpeechPermission && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={textInput}
                        onChangeText={setTextInput}
                        placeholder="Type your message here..."
                    />
                    <Pressable
                        style={styles.button}
                        onPress={handleTextSubmit}
                        disabled={!textInput.trim() || isProcessing}
                    >
                        <Text style={styles.buttonText}>Send</Text>
                    </Pressable>
                </View>
            )}

            {/* Live Transcription */}
            {isSpeechListening && speechPartialResults && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <Radio size={16} color="#EF4444" />
                    <Text style={{ marginLeft: 8, fontStyle: 'italic', color: '#666' }}>
                        {speechPartialResults}
                    </Text>
                </View>
            )}

            {/* Final Transcription */}
            {transcribedText && (
                <View style={styles.transcriptionBox}>
                    <Text style={styles.heading}>Transcribed:</Text>
                    <Text>{transcribedText}</Text>
                </View>
            )}

            {/* Response Stream */}
            {(responseStream || isProcessing) && (!currentComponent || isProcessing) && (
                <View style={[styles.transcriptionBox, { backgroundColor: '#EBF8FF' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={styles.heading}>Response:</Text>
                        {isProcessing && <Loader2 size={16} color="currentColor" />}
                    </View>
                    <ScrollView style={{ maxHeight: 300 }}>
                        <Text>{responseStream}</Text>
                    </ScrollView>
                </View>
            )}

            {/* Error Display */}
            {error && (
                <View style={[styles.transcriptionBox, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={{ color: '#DC2626' }}>{error}</Text>
                </View>
            )}

            {/* Settings Modal */}
            <SettingsModal 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                apiKey={apiKey}
                onSave={async (newKey) => {
                    setApiKey(newKey);
                    await AsyncStorage.setItem('openrouter_api_key', newKey);
                    setError(''); // Clear any previous API key errors
                }}
            />

            {/* Language Selection Modal */}
            <Modal
                visible={showLanguageModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowLanguageModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Language</Text>
                            <Pressable onPress={() => setShowLanguageModal(false)}>
                                <Text style={{ fontSize: 24 }}>×</Text>
                            </Pressable>
                        </View>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {LANGUAGES.map(lang => (
                                <Pressable
                                    key={lang.code}
                                    style={[
                                        styles.button,
                                        { 
                                            marginVertical: 4,
                                            backgroundColor: selectedLanguage === lang.code ? '#1D4ED8' : '#3B82F6'
                                        }
                                    ]}
                                    onPress={() => {
                                        setSelectedLanguage(lang.code);
                                        setShowLanguageModal(false);
                                    }}
                                >
                                    <Text style={styles.buttonText}>{lang.name}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Current Generated Component */}
            {currentComponent && !isProcessing && (
                <View style={{ marginTop: 16, flex: 1, minHeight: 200 }}>
                    <View style={[styles.transcriptionBox, { 
                        backgroundColor: 'white',
                        flex: 1
                    }]}>
                        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                            {React.createElement(currentComponent)}
                        </ScrollView>
                    </View>
                    <Pressable
                        onPress={() => setShowSourceCode(!showSourceCode)}
                        style={{ alignItems: 'center', marginTop: 8 }}
                    >
                        <Text style={{ color: '#3B82F6', textDecorationLine: 'underline' }}>
                            {showSourceCode ? 'Hide source' : 'View source'}
                        </Text>
                    </Pressable>
                    {showSourceCode && (
                        <View style={[styles.transcriptionBox, { backgroundColor: '#F9FAFB' }]}>
                            <ScrollView horizontal>
                                <Text style={{ fontFamily: 'monospace' }}>{currentComponentCode}</Text>
                            </ScrollView>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

