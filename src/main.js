import React, { useState, useEffect, useCallback } from 'react';
import EventSource from 'react-native-sse';
import * as RN from 'react-native';
import { StyleSheet, View, Text, TextInput, ScrollView, Pressable, Modal, Linking, Platform, Animated, Image, TouchableOpacity, Button } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Mic, MicOff, Radio, Loader2, Settings, Key, Square } from 'lucide-react-native';
import * as ExpoSensors from 'expo-sensors';
import { ExpoModules } from './expo-modules';
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
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 56,
   overflow: 'visible',
  },
  debugMenu: {
    position: 'absolute',
    right: 8,
    top: 48,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 150,
    zIndex: 1002,
  },
  menuItem: {
    padding: 12,
    borderRadius: 4,
  },
  menuItemText: {
    color: '#666',
    fontSize: 14,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 24,
    left: '50%',
    transform: [{ translateX: -24 }],
    zIndex: 1000,
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
const SettingsModal = ({ isOpen, onClose, apiKey, onSave, selectedLanguage, setSelectedLanguage }) => {
    const [key, setKey] = useState(apiKey);

     const modalContentRef = React.useRef(null);
    const [modalLayout, setModalLayout] = React.useState(null);

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

const VoiceButton = ({ isListening, onClick, disabled, volume, isGenerating, onStopGeneration }) => {
    const [isPressed, setIsPressed] = useState(false);

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            {!isGenerating && <PulsatingCircle isActive={isListening} volume={volume} />}
            <Pressable
                onPress={isGenerating ? onStopGeneration : onClick}
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
                        backgroundColor: isGenerating ? '#EF4444' : (isListening ? '#EF4444' : '#3B82F6'),
                        transform: [{ scale: isPressed ? 0.95 : 1 }],
                    },
                    disabled && { opacity: 0.5 }
                ]}
            >
                {isGenerating ? 
                    <Square size={24} color="white" /> :
                    (isListening ? 
                        <MicOff size={32} color="white" /> : 
                        <Mic size={32} color="white" />
                    )
                }
            </Pressable>
            <Text style={{ 
                marginTop: 8,
                color: (isGenerating || isListening) ? '#EF4444' : '#666',
                fontSize: 12 
            }}>
                {isGenerating ? 'Stop generating' : (isListening ? 'Tap to stop' : 'Tap to speak')}
            </Text>
        </View>
    );
};

export const VoiceAssistant = () => {
    const scrollViewRef = React.useRef(null);
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
    const [showDebugMenu, setShowDebugMenu] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const spinValue = React.useRef(new RN.Animated.Value(0)).current;

    React.useEffect(() => {
        if (isProcessing) {
            Animated.loop(
                Animated.timing(spinValue, {
                    toValue: 1,
                    duration: 1000,
                    easing: RN.Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            spinValue.setValue(0);
        }
    }, [isProcessing]);

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


    const analyzeIntent = async (text) => {
        if (!currentComponent) return false;
        
        const currentApiKey = await AsyncStorage.getItem('openrouter_api_key');
        if (!currentApiKey) return false;

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentApiKey}`,
                    'Content-Type': 'application/json',
                    'X-Title': 'Voice Assistant Web App'
                },
                body: JSON.stringify({
                    model: 'mistralai/mistral-tiny',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a binary classifier. Determine if the user wants to modify an existing component or create a new one. Reply with only "modify" or "new".'
                        },
                        {
                            role: 'user',
                            content: `There is an existing component. Does this request intend to modify it or create something new? Request: "${text}"`
                        }
                    ],
                    max_tokens: 1,
                    temperature: 0.1
                })
            });

            const data = await response.json();
            const intent = data.choices[0].message.content.toLowerCase().trim();
            return intent === 'modify';
        } catch (error) {
            console.error('Intent analysis error:', error);
            return false;
        }
    };

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
            // Determine intent using the small LLM
            const isModifying = await analyzeIntent(text);
            console.log('Making OpenRouter API request...');
            window.currentEventSource = new EventSource('https://openrouter.ai/api/v1/chat/completions', {
                headers: {
                    'Authorization': `Bearer ${currentApiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                    'X-Title': 'Voice Assistant Web App',
                },
                method: 'POST',
                body: JSON.stringify({
                    model: 'anthropic/claude-3.5-sonnet',
                    messages: [
                        ...(currentComponentCode ? [{
                            role: 'system',
                            content: `Previous component code for reference:\n\`\`\`jsx\n${currentComponentCode}\n\`\`\`\nUse this as reference if the new request is similar or builds upon it.`
                        }] : []),
                        {
                            role: 'user',
                            content: `${isModifying ? 
                                `Modify the existing component based on this request: "${text}". Use the existing code as context.` :
                                `Generate a React Native component based on this request: "${text}".`}
                                     Return ONLY the component code using React.createElement.
                                     Start with 'function Component() {'.

                                     Available APIs:
                                     React Hooks:
                                     Use hooks directly via React namespace (e.g., React.useState, React.useEffect)

                                     React Native (RN namespace):
                                     - Core UI: RN.View, RN.Text, RN.Image, RN.ScrollView, RN.TextInput
                                     - Interaction: RN.Pressable, RN.TouchableOpacity, RN.Alert
                                     - Device Features: RN.Vibration, RN.Share, RN.Platform
                                     - Layout: RN.Dimensions.get('window') for screen size
                                     - Animation: RN.Animated for smooth animations
                                     - Appearance: RN.Appearance for dark/light mode

                                     Expo Modules (Expo namespace):
                                     - Expo.Haptics - vibration patterns and haptic feedback
                                     - Expo.Clipboard - copy/paste functionality
                                     - Expo.ImagePicker - select images from device
                                     - Expo.MediaLibrary - access device media
                                     - Expo.FileSystem - file operations
                                     - Expo.Sharing - share content
                                     - Expo.Location - geolocation services
                                     - Expo.AV - audio/video playback
                                     - Expo.Maps - map components and location services
                                     - Expo.Reanimated - advanced animations
                                     - Expo.Gesture - gesture handling
                                     - Expo.Linking - deep linking and URL handling
                                     - Expo.Sensors - device sensors:
                                       • Accelerometer - device motion data
                                     Example patterns:
                                     - Expo.Sensors.Accelerometer.isAvailableAsync().then(available => { ... })
                                     - const subscription = Expo.Sensors.Accelerometer.addListener(data => { ... })
                                     - Expo.Sensors.Accelerometer.setUpdateInterval(1000)
                                     - subscription.remove()  // cleanup in useEffect
                                     - RN.Share.share({ message: "Hello!" }).then(result => { ... })
                                     - Expo.Clipboard.setString("text").then(() => { ... })

                                     Avoid async/await - use .then() for promises.
                                     Use React.useEffect for cleanup and subscriptions.

                                     Example usage:
                                     - RN.Vibration.vibrate() for haptic feedback
                                     - RN.Share.share({ message: "Hello!" })
                                     - RN.Alert.alert("Title", "Message")
                                     - const { width, height } = RN.Dimensions.get('window')

                                     Use React.useState for state management.
                                     Use only React Native compatible styles (no web-specific CSS).
                                     Do not include any explanation or markdown - just the pure JavaScript code.
                                     The code should start directly with 'function Component() {'.
                                     Start your response with \`\`\` and end with \`\`\`.

                                     Example format:
                                     \`\`\`
                                     function Component() {
                                       const [count, setCount] = React.useState(0);

                                       const styles = {
                                         container: {
                                           flex: 1,
                                           justifyContent: 'center',
                                           alignItems: 'center'
                                         },
                                         button: {
                                           backgroundColor: '#3B82F6',
                                           padding: 16,
                                           borderRadius: 8
                                         },
                                         buttonText: {
                                           color: 'white'
                                         }
                                       };

                                       return React.createElement(
                                         RN.View,
                                         { style: styles.container },
                                         React.createElement(
                                           RN.TouchableOpacity,
                                           { style: styles.button, onPress: () => setCount(c => c + 1) },
                                           React.createElement(
                                             RN.Text,
                                             { style: styles.buttonText },
                                             \`Count: \${count}\`
                                           )
                                         )
                                       );
                                     }
                                     \`\`\``
                        }
                    ],
                    stream: true
                })
            });

            let fullResponse = '';

            const processCompleteResponse = (response) => {
                try {
                    console.log('Full response:', response);

                    // Extract code from markdown code block with more flexible pattern
                    const codeMatch = response.match(/```(?:jsx|javascript|)?\s*([\s\S]*?)```/);
                    if (!codeMatch) {
                        console.error('Response content:', response);
                        throw new Error('No code block found in response');
                    }
                    const code = codeMatch[1].trim();
                    console.log('Extracted code:', code);

                    if (!code.includes('function Component()')) {
                        throw new Error('Invalid component code format');
                    }

                    // Create component function with proper scope access
                    const componentCode = `
                        const React = arguments[0];
                        const RN = arguments[1];
                        const Expo = arguments[2];
                        const { useState } = React;
                        ${code}
                        return Component;
                    `;

                    // Create and execute the function with React and RN components in scope
                    const createComponent = new Function(componentCode);
                    const GeneratedComponent = createComponent(React, RN, ExpoModules);

                    // Store the current component and its source code
                    setCurrentComponent(() => GeneratedComponent);
                    setCurrentComponentCode(code);
                    // Clear error and transcribed text after successful generation
                    setError('');
                    setTranscribedText('');

                } catch (error) {
                    console.error('Error creating component:', error);
                    setError(`Failed to create component: ${error.message}`);
                } finally {
                    setIsProcessing(false);
                }
            };

            window.currentEventSource.addEventListener('message', (event) => {
                if (event.data === '[DONE]') {
                    window.currentEventSource.close();
                    window.currentEventSource = null;
                    // Process the complete response after stream ends
                    processCompleteResponse(fullResponse);
                    return;
                }

                try {
                    const data = JSON.parse(event.data);
                    const content = data.choices?.[0]?.delta?.content;
                    if (content) {
                        fullResponse += content;
                        setResponseStream(prev => prev + content);
                    }
                } catch (e) {
                    console.error('Error parsing SSE message:', e);
                    setError(`Failed to parse response: ${e.message}`);
                }
            });

            window.currentEventSource.addEventListener('error', (error) => {
                console.error('SSE error:', error);
                setError(`Stream error: ${error.message}`);
                window.currentEventSource.close();
                window.currentEventSource = null;
                setIsProcessing(false);
            });
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
            {/* Header with Settings and Debug Menu */}
            <View style={styles.compactHeader}>
                <Pressable
                    onPress={() => setIsSettingsOpen(true)}
                    style={{
                        padding: 12,
                        marginLeft: -8,
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}
                >
                    <Settings size={24} color="#666" />
                </Pressable>

                {currentComponent && (
                    <View style={{ overflow: 'visible' }}>
                        <Pressable
                            onPress={() => setShowDebugMenu(!showDebugMenu)}
                            style={{
                                padding: 12,
                                marginRight: -8,
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#666', fontSize: 24, lineHeight: 24, height: 32, textAlignVertical: 'center' }}>⋮</Text>
                        </Pressable>
                        {showDebugMenu && (
                            <View style={styles.debugMenu}>
                                <Pressable
                                    style={styles.menuItem}
                                    onPress={() => {
                                        setShowSourceCode(!showSourceCode);
                                        setShowDebugMenu(false);
                                    }}
                                >
                                    <Text style={styles.menuItemText}>
                                        {showSourceCode ? 'Hide source' : 'View source'}
                                    </Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                )}
            </View>

            {/* Floating Voice/Stop Button */}
            <View style={styles.floatingButtonContainer}>
                <VoiceButton
                    isListening={isSpeechListening}
                    onClick={toggleListening}
                    disabled={!hasSpeechPermission && !isProcessing}
                    volume={speechVolume}
                    isGenerating={isProcessing}
                    onStopGeneration={() => {
                        if (window.currentEventSource) {
                            window.currentEventSource.close();
                            setIsProcessing(false);
                        }
                    }}
                />
            </View>

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
                <View style={[
                    styles.transcriptionBox, 
                    { 
                        backgroundColor: '#EBF8FF',
                        flex: 1,
                        marginBottom: 16
                    }
                ]}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={styles.heading}>Response:</Text>
                            {isProcessing && (
                                <Animated.View
                                    style={{
                                        marginLeft: 8,
                                        transform: [{
                                            rotate: spinValue.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0deg', '360deg']
                                            })
                                        }]
                                    }}
                                >
                                    <Loader2 size={16} color="#666" />
                                </Animated.View>
                            )}
                        </View>
                        <ScrollView 
                            style={{ flex: 1 }}
                            ref={scrollViewRef => {
                                if (scrollViewRef) {
                                    scrollViewRef.scrollToEnd({ animated: true });
                                }
                            }}
                            onContentSizeChange={() => {
                                if (scrollViewRef.current) {
                                    scrollViewRef.current.scrollToEnd({ animated: true });
                                }
                            }}
                        >
                            <Text>{responseStream}</Text>
                        </ScrollView>
                    </View>
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
                selectedLanguage={selectedLanguage}
                setSelectedLanguage={setSelectedLanguage}
                onSave={async (newKey) => {
                    setApiKey(newKey);
                    await AsyncStorage.setItem('openrouter_api_key', newKey);
                    setError(''); // Clear any previous API key errors
                }}
            />


            {/* Current Generated Component */}
            {currentComponent && !isProcessing && (
                <View style={{ flex: 1, minHeight: 200, width: '100%' }}>
                    <View style={{ 
                        backgroundColor: 'white',
                        flex: 1
                    }}>
                        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                            {React.createElement(currentComponent)}
                        </ScrollView>
                    </View>
                    {showSourceCode && (
                        <View style={{
                            position: 'absolute',
                            top: -56, // Position above normal header to cover it
                            left: 0,
                            right: 0,
                            bottom: -56, // Extend past bottom to compensate for top offset
                            backgroundColor: '#F9FAFB',
                            zIndex: 1000,
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
                                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Source Code</Text>
                                <Pressable
                                    onPress={() => setShowSourceCode(false)}
                                    style={{
                                        padding: 8,
                                        marginRight: -8,
                                    }}
                                >
                                    <Text style={{ fontSize: 24, color: '#666' }}>×</Text>
                                </Pressable>
                            </View>
                            <ScrollView 
                                style={{ flex: 1 }}
                                contentContainerStyle={{ padding: 16 }}
                            >
                                <Text style={{ 
                                    fontFamily: Platform.select({
                                        ios: 'Menlo',
                                        android: 'monospace',
                                        default: 'monospace'
                                    }),
                                    fontSize: 14,
                                    lineHeight: 20,
                                }}>{currentComponentCode}</Text>
                            </ScrollView>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};
