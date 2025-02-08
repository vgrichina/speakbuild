import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import { analyzeRequest, getRequestHistory } from './services/analysis';
import { streamComponent, componentPrompt } from './services/componentGenerator';
import { widgetStorage } from './services/widgetStorage';
import { useComponentHistory } from './hooks/useComponentHistory';
import { useSettings } from './hooks/useSettings';
import DebugGeneration from './components/DebugGeneration';



import * as RN from 'react-native';
import { StyleSheet, View, Text, TextInput, ScrollView, Pressable, Animated, TouchableOpacity } from 'react-native';
import { VoiceButton } from './components/VoiceButton';
import { ViewCode } from './components/ViewCode';
import { SettingsModal } from './components/SettingsModal';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { Mic, MicOff, Square } from 'lucide-react-native';
import { Header } from './components/Header';
import { ResponseStream } from './components/ResponseStream';
import { TranscriptionBox } from './components/TranscriptionBox';
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
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    zIndex: 1000,
  }
});



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
    const [showDebugGeneration, setShowDebugGeneration] = useState(false);

    const {
        isListening: isSpeechListening,
        volume: speechVolume,
        partialResults: speechPartialResults,
        hasSpeechPermission,
        toggleListening
    } = useSpeechRecognition({
        selectedLanguage,
        onTranscription: (text) => {
            setTranscribedText(text);
            setResponseStream('');
            processWithClaudeStream(text);
        },
        onError: setError
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
        // Clear any previous error
        setError('');

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
            // Get current component params if any
            const currentParams = currentHistoryIndex >= 0 ? componentHistory[currentHistoryIndex]?.params : null;
            
            // Analyze the request with current params context
            const analysis = await analyzeRequest(text, currentController, componentHistory, currentHistoryIndex, currentParams);
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

                    // Add to history
                    addToHistory({
                        component: GeneratedComponent,
                        code: cachedWidget.code,
                        request: text,
                        params: analysis.params || {}
                    });
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

                    if (!code.match(/function Component\((props|\{[^}]*\})\)/)) {
                        throw new Error('Invalid component code format - must use function Component(props) or function Component({prop1, prop2})');
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

                    // Test render before storing
                    const testParams = analysis.params || {};
                    try {
                        React.createElement(GeneratedComponent, testParams);
                        
                        // Only store and add to history if render succeeds
                        widgetStorage.store(analysis.widgetUrl, componentCode)
                            .then(() => {
                                addToHistory({
                                    component: GeneratedComponent,
                                    code: componentCode,
                                    request: text,
                                    params: testParams
                                });
                                // Clear states only on success
                                setError('');
                                setTranscribedText('');
                            })
                            .catch(error => {
                                console.error('Widget storage error:', error);
                                setError(`Storage error: ${error.message}`);
                            });
                    } catch (error) {
                        console.error('Component render error:', error);
                        setError(`Component error: ${error.message}`);
                    }

                } catch (error) {
                    console.error('Error creating component:', error);
                    setError(`Failed to create component: ${error.message}`);
                } finally {
                    setIsProcessing(false);
                    setModificationIntent(null);
                }
            };

            try {
                setError(''); // Clear error at start of stream
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
                if (error.name === 'AbortError' || error.message === 'Stream aborted') {
                    // Silently handle abort errors
                    console.log('Stream aborted by user');
                } else {
                    console.error('Stream error:', error);
                    setError(`Stream error: ${error.message}`);
                }
                setIsProcessing(false);
                setResponseStream('');
            }
        } catch (error) {
            if (error.name === 'AbortError' || error.message === 'Stream aborted') {
                console.log('Request aborted by user');
            } else {
                console.error('API call error:', error);
                if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
                    setError('Network error: Please check your internet connection');
                } else {
                    setError(`Error: ${error.message}`);
                }
            }
            setIsProcessing(false);
        }
    };


    const handleTextSubmit = (e) => {
        e.preventDefault();
        if (!textInput.trim()) return;

        setTranscribedText(textInput);
        processWithClaudeStream(textInput);
        setTextInput('');
    };

    return (
        <View style={styles.container}>
            <Header
                currentComponent={currentComponent}
                currentHistoryIndex={currentHistoryIndex}
                componentHistory={componentHistory}
                onNavigateBack={() => {
                    setCurrentHistoryIndex(currentHistoryIndex - 1);
                    setTranscribedText('');
                    setResponseStream('');
                }}
                onNavigateForward={() => {
                    setCurrentHistoryIndex(currentHistoryIndex + 1);
                    setTranscribedText('');
                    setResponseStream('');
                }}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onClearHistory={async () => {
                    await clearHistory();
                    setShowSourceCode(false);
                    setResponseStream('');
                    RN.Alert.alert('Storage cleared', 'Widget cache has been cleared');
                }}
                onDebugGeneration={() => setShowDebugGeneration(true)}
                onToggleSourceCode={() => setShowSourceCode(!showSourceCode)}
                showSourceCode={showSourceCode}
                stopGeneration={stopGeneration}
            />

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

            <TranscriptionBox
                isListening={isSpeechListening}
                partialResults={speechPartialResults}
                transcribedText={transcribedText}
                requestHistory={getRequestHistory(componentHistory, currentHistoryIndex)}
            />

            {(!currentComponent || isProcessing) && (
                <ResponseStream
                    responseStream={responseStream}
                    isProcessing={isProcessing}
                    modificationIntent={modificationIntent}
                />
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
                selectedModel={selectedModel}
                onSave={saveSettings}
            />
            <RN.Modal
                visible={showDebugGeneration}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setShowDebugGeneration(false)}
            >
                <RN.SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
                    <DebugGeneration
                        onClose={() => setShowDebugGeneration(false)}
                    />
                </RN.SafeAreaView>
            </RN.Modal>


            {/* Current Generated Component */}
            {currentComponent && !isProcessing && (
                <View style={{ flex: 1, width: '100%' }}>
                    <View style={{ 
                        backgroundColor: 'white',
                        flex: 1
                    }}>
                        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                            {(() => {
                                try {
                                    const params = (currentHistoryIndex >= 0 && componentHistory[currentHistoryIndex]?.params) || {};
                                    console.log('Rendering component with params:', params);
                                    return React.createElement(currentComponent, params);
                                } catch (error) {
                                    console.error('Component render error:', error);
                                    return (
                                        <View style={{ padding: 16, backgroundColor: '#FEE2E2' }}>
                                            <Text style={{ color: '#DC2626' }}>
                                                Failed to render component: {error.message}
                                            </Text>
                                        </View>
                                    );
                                }
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
