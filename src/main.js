import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import { analyzeRequest, getRequestHistory } from './services/analysis';
import { streamComponent, componentPrompt } from './services/componentGenerator';
import { widgetStorage } from './services/widgetStorage';
import { useComponentHistory } from './hooks/useComponentHistory';
import { useSettings } from './hooks/useSettings';



import EventSource from 'react-native-sse';
import * as RN from 'react-native';
import { StyleSheet, View, Text, TextInput, ScrollView, Pressable, Animated, TouchableOpacity } from 'react-native';
import { VoiceButton } from './components/VoiceButton';
import { ViewCode } from './components/ViewCode';
import { SettingsModal } from './components/SettingsModal';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { Mic, MicOff, Radio, Loader2, Settings, Square, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { ExpoModules } from './expo-modules';
import AsyncStorage from '@react-native-async-storage/async-storage';


const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  navButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 2,
  },
  buttonPressed: {
    backgroundColor: '#e5e5e5',
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
  }
});



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


export const VoiceAssistant = () => {
    const scrollViewRef = React.useRef(null);
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [modificationIntent, setModificationIntent] = useState(null); // 'modify' or 'new'
    const abortControllerRef = React.useRef(null);

    useEffect(() => {
        // Cleanup function to abort any ongoing streams when component unmounts
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const loadSettings = async () => {
            const [currentApiKey, savedLanguage, savedModel] = await Promise.all([
                AsyncStorage.getItem('openrouter_api_key'),
                AsyncStorage.getItem('recognition_language'),
                AsyncStorage.getItem('selected_model')
            ]);
            
            // Load saved preferences even if no API key
            if (savedLanguage) {
                setSelectedLanguage(savedLanguage);
            }
            if (savedModel) {
                setSelectedModel(savedModel);
            }
            
            // Show settings modal if no API key
            if (!currentApiKey) {
                setIsSettingsOpen(true);
            }
        };
        loadSettings();
    }, []);
    const [partialResults, setPartialResults] = useState('');
    const [transcribedText, setTranscribedText] = useState('');
    const [responseStream, setResponseStream] = useState('');
    const [error, setError] = useState('');
    const {
        isSettingsOpen,
        setIsSettingsOpen,
        apiKey,
        selectedLanguage,
        selectedModel,
        isSettingsLoaded,
        error: settingsError,
        saveSettings
    } = useSettings();
    const [textInput, setTextInput] = useState('');
    const {
        history: componentHistory,
        currentIndex: currentHistoryIndex,
        current: currentHistoryEntry,
        addToHistory,
        setCurrentIndex: setCurrentHistoryIndex,
        clearHistory
    } = useComponentHistory();
    
    const currentComponent = currentHistoryEntry?.component;
    const currentComponentCode = currentHistoryEntry?.code;
    const [showSourceCode, setShowSourceCode] = useState(false);
    const [showDebugMenu, setShowDebugMenu] = useState(false);
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




    const stopGeneration = () => {
        const controller = abortControllerRef.current;
        if (controller) {
            controller.abort();
            abortControllerRef.current = null;
            setIsProcessing(false);
        }
    };

    const processWithClaudeStream = async (text) => {
        // Abort any existing stream
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        // Create new AbortController for this stream
        const currentController = new AbortController();
        abortControllerRef.current = currentController;
        
        const currentApiKey = await AsyncStorage.getItem('openrouter_api_key');
        if (!currentApiKey) {
            setError('Please set your OpenRouter API key in settings');
            setIsSettingsOpen(true);
            return;
        }

        setIsProcessing(true);
        setResponseStream('');

        try {
            // Analyze the request
            const analysis = await analyzeRequest(text, currentController, componentHistory, currentHistoryIndex);
            if (!analysis) {
                throw new Error('Failed to analyze request');
            }

            // Check cache for matching widget
            const cachedWidget = await widgetStorage.find(analysis.widgetUrl);
            if (cachedWidget) {
                console.log('Found cached widget:', analysis.widgetUrl);
                try {
                    // Create and execute the function with React and RN components in scope
                    const createComponent = new Function(cachedWidget.code);
                    const GeneratedComponent = createComponent(React, RN, ExpoModules);

                    // Update history and current state
                    const newHistory = componentHistory.slice(0, currentHistoryIndex + 1);
                    const newHistoryEntry = {
                        component: GeneratedComponent,
                        code: cachedWidget.code,
                        request: text,
                        params: analysis.params || {}
                    };
                    
                    console.log('Updating history for cached widget:', {
                        previousLength: newHistory.length,
                        newLength: newHistory.length + 1,
                        truncatedAt: currentHistoryIndex + 1,
                        params: newHistoryEntry.params
                    });
                    setComponentHistory([...newHistory, newHistoryEntry]);
                    setCurrentHistoryIndex(currentHistoryIndex + 1);
                    setCurrentComponent(() => GeneratedComponent);
                    setCurrentComponentCode(cachedWidget.code);
                    setError('');
                    setTranscribedText('');
                    setIsProcessing(false);
                    setModificationIntent(null);
                    return;
                } catch (error) {
                    console.error('Error creating component from cache:', error);
                    // Continue with API call if cache processing fails
                }
            }

            setModificationIntent(analysis.intent);
            console.log('Making OpenRouter API request...');
            
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
                    console.log(`Component << ${code}`);

                    if (!code.includes('function Component(props)')) {
                        throw new Error('Invalid component code format - must use function Component(props)');
                    }

                    // Create component function with proper scope access
                    const componentCode = `
                        const React = arguments[0];
                        const RN = arguments[1];
                        const Expo = arguments[2];
                        const { useState } = React;
                        console.log('Maps module:', Object.keys(Expo.Maps));
                        ${code}
                        return Component;
                    `;

                    // Create and execute the function with React and RN components in scope
                    const createComponent = new Function(componentCode);
                    const GeneratedComponent = createComponent(React, RN, ExpoModules);

                    // Cache the new widget with processed component code
                    widgetStorage.store(analysis.widgetUrl, GeneratedComponent, componentCode)
                        .then(() => {
                            addToHistory({
                                component: GeneratedComponent,
                                code: componentCode,
                                request: text,
                                params: analysis.params || {}
                            });
                        })
                        .catch(error => {
                            console.error('Widget storage error:', error);
                            setError(`Storage error: ${error.message}`);
                        });
                    
                    // Clear other states
                    setError('');
                    setTranscribedText('');

                } catch (error) {
                    console.error('Error creating component:', error);
                    setError(`Failed to create component: ${error.message}`);
                } finally {
                    setIsProcessing(false);
                    setModificationIntent(null);
                }
            };

            try {
                for await (const { content, fullResponse, done } of streamComponent(
                    analysis,
                    currentComponentCode,
                    selectedModel,
                    currentController
                )) {
                    // Early exit if aborted
                    if (currentController?.signal.aborted) break;

                    if (content) {
                        setResponseStream(prev => prev + content);
                    }
                    if (done) {
                        processCompleteResponse(fullResponse);
                    }
                }
            } catch (error) {
                console.error('Stream error:', error);
                if (error.message === 'Stream aborted') {
                    // Clear response stream when aborted
                    setResponseStream('');
                } else {
                    setError(`Stream error: ${error.message}`);
                }
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
            {/* Header with Navigation, Settings and Debug Menu */}
            <View style={styles.compactHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                        <View style={{ flexDirection: 'row', marginLeft: 8 }}>
                            <Pressable
                                onPress={() => {
                                    if (currentHistoryIndex > 0) {
                                        stopGeneration();
                                        setCurrentHistoryIndex(currentHistoryIndex - 1);
                                        setTranscribedText('');
                                        setResponseStream('');
                                    }
                                }}
                                disabled={currentHistoryIndex <= 0}
                                style={({ pressed }) => [
                                    styles.navButton,
                                    currentHistoryIndex <= 0 && styles.buttonDisabled,
                                    pressed && styles.buttonPressed
                                ]}
                            >
                                <ArrowLeft size={20} color={currentHistoryIndex <= 0 ? '#999' : '#666'} />
                            </Pressable>
                            
                            <Pressable
                                onPress={() => {
                                    if (currentHistoryIndex < componentHistory.length - 1) {
                                        stopGeneration();
                                        setCurrentHistoryIndex(currentHistoryIndex + 1);
                                        setTranscribedText('');
                                        setResponseStream('');
                                    }
                                }}
                                disabled={currentHistoryIndex >= componentHistory.length - 1}
                                style={({ pressed }) => [
                                    styles.navButton,
                                    currentHistoryIndex >= componentHistory.length - 1 && styles.buttonDisabled,
                                    pressed && styles.buttonPressed
                                ]}
                            >
                                <ArrowRight size={20} color={currentHistoryIndex >= componentHistory.length - 1 ? '#999' : '#666'} />
                            </Pressable>
                        </View>
                    )}
                </View>

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
                                <Pressable
                                    style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: '#eee' }]}
                                    onPress={async () => {
                                        await clearHistory();
                                        setShowSourceCode(false);
                                        setResponseStream('');
                                        setShowDebugMenu(false);
                                        RN.Alert.alert('Storage cleared', 'Widget cache has been cleared');
                                    }}
                                >
                                    <Text style={[styles.menuItemText, { color: '#EF4444' }]}>
                                        Clear storage
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
                    onStopGeneration={stopGeneration}
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
            {(() => {
                const requestHistory = getRequestHistory(componentHistory, currentHistoryIndex);
                return (transcribedText || requestHistory.length > 0) && (
                <View style={styles.transcriptionBox}>
                    {requestHistory.map((request, index) => (
                        <Text key={index} style={{ 
                            color: '#999',
                            fontSize: 14,
                            marginBottom: 4
                        }}>
                            {request}
                        </Text>
                    ))}
                    {transcribedText && (
                        <Text style={{ 
                            color: '#333',
                            fontSize: 14
                        }}>
                            {transcribedText}
                        </Text>
                    )}
                </View>
                );
            })()}

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
                            <Text style={styles.heading}>
                                {modificationIntent === 'modify' ? 'Modifying Component:' : 
                                 modificationIntent === 'new' ? 'Creating New Component:' : 
                                 'Response:'}
                            </Text>
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
                                    <Loader2 
                                        size={16} 
                                        color={modificationIntent === 'modify' ? '#EF4444' : 
                                              modificationIntent === 'new' ? '#3B82F6' : 
                                              '#666'} 
                                    />
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
            {combinedError && (
                <View style={[styles.transcriptionBox, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={{ color: '#DC2626' }}>{combinedError}</Text>
                </View>
            )}

            {/* Settings Modal */}
            <SettingsModal 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                apiKey={apiKey}
                selectedLanguage={selectedLanguage}
                selectedModel={selectedModel}
                onSave={saveSettings}
            />


            {/* Current Generated Component */}
            {currentComponent && !isProcessing && (
                <View style={{ flex: 1, minHeight: 200, width: '100%' }}>
                    <View style={{ 
                        backgroundColor: 'white',
                        flex: 1
                    }}>
                        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                            {(() => {
                                const params = (currentHistoryIndex >= 0 && componentHistory[currentHistoryIndex]?.params) || {};
                                console.log('Rendering component with params:', params);
                                return React.createElement(currentComponent, params);
                            })()}
                        </ScrollView>
                    </View>
                    <ViewCode 
                        isVisible={showSourceCode}
                        onClose={() => setShowSourceCode(false)}
                        code={currentComponentCode}
                    />
                </View>
            )}
        </View>
    );
};
