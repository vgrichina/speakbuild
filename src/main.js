import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { api } from './services/api';
import { analyzeRequest, getRequestHistory } from './services/analysis';
import { widgetStorage } from './services/widgetStorage';
import { processWithClaudeStream } from './services/processStream';
import { useComponentHistory } from './contexts/ComponentHistoryContext';
import { useSettings, useApiKeyCheck } from './hooks/useSettings';
import DebugGeneration from './components/DebugGeneration';
import { EmptyState } from './components/EmptyState';
import { createComponent, renderComponent } from './utils/componentUtils';



import * as RN from 'react-native';
import { StyleSheet, View, Text, TextInput, ScrollView, Pressable, Animated, TouchableOpacity } from 'react-native';
import { VoiceButton } from './components/VoiceButton';
import { ViewCode } from './components/ViewCode';
import { Settings } from './components/Settings';
import { useVoiceRoom } from './hooks/useVoiceRoom';
import { Mic, MicOff, Square } from 'lucide-react-native';
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
    const [isGenerating, setIsGenerating] = useState(false);
    const [modificationIntent, setModificationIntent] = useState(null); // 'modify' or 'new'
    const abortControllerRef = React.useRef(null);
    const { checkApiKeys } = useApiKeyCheck();
    
    const handleApiError = useCallback((error) => {
        if (error.message.includes('API key')) {
            setError(error.message);
        } else {
            setError('An error occurred');
            console.error(error);
        }
    }, []);


    useEffect(() => {
        // Cleanup function to abort any ongoing streams when component unmounts
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, []);
    const [partialResults, setPartialResults] = useState('');
    const [transcribedText, setTranscribedText] = useState('');
    const [responseStream, setResponseStream] = useState('');
    const [error, setError] = useState('');
    const {
        isSettingsOpen,
        setIsSettingsOpen,
        ultravoxApiKey,
        openrouterApiKey,
        selectedModel,
        selectedLanguage,
        isSettingsLoaded,
        error: settingsError,
        saveSettings
    } = useSettings();
    const [textInput, setTextInput] = useState('');
    const {
        history: componentHistory,
        currentIndex: currentHistoryIndex,
        current: currentHistoryEntry,
        addToHistory
    } = useComponentHistory();
    
    const currentComponent = currentHistoryEntry?.component;
    const currentComponentCode = currentHistoryEntry?.code;
    const [showSourceCode, setShowSourceCode] = useState(false);
    const [showDebugMenu, setShowDebugMenu] = useState(false);
    const router = useRouter();

    const stopGeneration = () => {
        const controller = abortControllerRef.current;
        if (controller) {
            controller.abort();
            abortControllerRef.current = null;
            setIsGenerating(false);
        }
    };

    const handleAnalysis = useCallback(async (analysis) => {
        console.log('Received analysis:', analysis);
        setTranscribedText(analysis.transcription);
        setError('');
        setIsGenerating(true);
        setResponseStream('');
        
        try {
            await checkApiKeys();
            
            // Abort any existing stream
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            const currentController = new AbortController();
            abortControllerRef.current = currentController;

            // Check cache first
            const cachedWidget = await widgetStorage.find(analysis.widgetUrl);
            if (cachedWidget) {
                console.log('Found cached widget:', analysis.widgetUrl);
                try {
                    const GeneratedComponent = createComponent(cachedWidget.code);
                    addToHistory({
                        component: GeneratedComponent,
                        code: cachedWidget.code,
                        request: analysis.transcription,
                        params: analysis.params || {},
                        intent: analysis.intent
                    });
                    return;
                } catch (error) {
                    console.error('Error creating component from cache:', error);
                }
            }

            const result = await processWithClaudeStream({
                analysis,
                selectedModel,
                currentComponentCode,
                abortController: currentController,
                onResponseStream: setResponseStream
            });
            
            addToHistory(result);
            setModificationIntent(result.intent);
        } catch (error) {
            if (error.message.includes('API key')) {
                handleApiError(error);
            } else {
                console.error('Analysis error:', error);
                setError(error.message);
            }
        } finally {
            setIsGenerating(false);
            setResponseStream('');
        }
    }, [selectedModel]);


    const {
        isRecording,
        volume,
        startRecording,
        stopRecording,
        cancelRecording
    } = useVoiceRoom({
        onTranscription: handleAnalysis,
        onError: handleApiError,
        selectedLanguage,
        componentHistory,
        currentHistoryIndex,
        checkApiKeys
    });


    const handleTextSubmit = (e) => {
        e.preventDefault();
        if (!textInput.trim()) return;

        setTranscribedText(textInput);
        processWithClaudeStream(textInput);
        setTextInput('');
    };

    return (
        <View style={styles.container}>

            {/* Floating Voice/Stop Button */}
            <View style={styles.floatingButtonContainer}>
                <VoiceButton
                    isActive={isRecording || isGenerating}
                    onToggle={() => {
                        if (isGenerating) {
                            stopGeneration();
                        }
                        if (isRecording) {
                            stopRecording();
                        } else {
                            startRecording();
                        }
                    }}
                    volume={volume}
                    disabled={!isSettingsLoaded}
                />
            </View>


            <TranscriptionBox
                isListening={isRecording}
                partialResults=""
                transcribedText={transcribedText}
                requestHistory={getRequestHistory(componentHistory, currentHistoryIndex)}
                isGenerating={isGenerating}
            />

            {(!currentComponent || isGenerating) && (
                <ResponseStream
                    responseStream={responseStream}
                    isGenerating={isGenerating}
                    modificationIntent={modificationIntent}
                />
            )}

            {/* Error Display */}
            {error && (
                <View style={[styles.transcriptionBox, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={{ color: '#DC2626' }}>{error}</Text>
                </View>
            )}



            {/* Component Container */}
            {!isGenerating && (
                <View style={{ flex: 1, width: '100%' }}>
                    <View style={{ 
                        backgroundColor: '#ffffff',
                        flex: 1,
                        borderRadius: 8,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3
                    }}>
                    {currentComponent ? (
                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
                            {(() => {
                                const params = (currentHistoryIndex >= 0 && componentHistory[currentHistoryIndex]?.params) || {};
                                console.log('Rendering component:', currentHistoryIndex);
                                try {
                                    return renderComponent(currentComponent, params);
                                } catch (error) {
                                    console.error('Render error:', error);
                                    return null;
                                }
                            })()}
                        </ScrollView>
                    ) : (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <EmptyState />
                        </View>
                    )}
                    </View>
                </View>
            )}

            {/* Modals at root level */}
        </View>
    );
};
