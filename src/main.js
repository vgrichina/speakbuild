import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { getRequestHistory } from './services/analysis';
import { widgetStorage } from './services/widgetStorage';
import { processWithClaudeStream } from './services/processStream';
import { useComponentHistory } from './contexts/ComponentHistoryContext';
import { useGeneration } from './contexts/GenerationContext';
import { useSettings, useApiKeyCheck } from './hooks/useSettings';
import { EmptyState } from './components/EmptyState';
import { createComponent, renderComponent } from './utils/componentUtils';
import { VoiceButton } from './components/VoiceButton';
import { ResponseStream } from './components/ResponseStream';
import { TranscriptionBox } from './components/TranscriptionBox';
import { useVoiceRoom } from './hooks/useVoiceRoom';


const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  transcriptionBox: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    zIndex: 1000,
  }
});




export const VoiceAssistant = () => {
    console.log('Rendering VoiceAssistant');
    const scrollViewRef = React.useRef(null);
    const { checkApiKeys } = useApiKeyCheck();
    const { 
        state: generationState,
        setTranscribedText,
        setResponseStream,
        setModificationIntent,
        createAbortController,
        startGeneration,
        updateGenerationProgress,
        completeGeneration,
        abortGeneration,
        handleError
    } = useGeneration();
    
    const handleApiError = useCallback((error) => {
        if (error && error.message && error.message.includes('API key')) {
            setError(error.message);
        } else {
            setError('An error occurred');
            console.error(error);
        }
    }, []);


    useEffect(() => {
        // Cleanup function to abort any ongoing streams when component unmounts
        return () => {
            abortGeneration();
        };
    }, [abortGeneration]);
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
    const {
        history: componentHistory,
        currentIndex: currentHistoryIndex,
        current: currentHistoryEntry,
        addToHistory,
        goBack,
        goForward
    } = useComponentHistory();
    
    // Recreate component from code whenever history entry changes
    const currentComponent = React.useMemo(() => {
        if (currentHistoryEntry?.code) {
            try {
                return createComponent(currentHistoryEntry.code);
            } catch (error) {
                console.error('Error recreating component from history:', error);
                return null;
            }
        }
        return null;
    }, [currentHistoryEntry?.code]);
    
    const currentComponentCode = currentHistoryEntry?.code;
    const router = useRouter();

    // We no longer need the stopGeneration function as it's handled by the context

    const handleAnalysis = useCallback(async (analysis) => {
        console.log('Received analysis:', analysis);
        setTranscribedText(analysis.transcription);
        setError('');
        
        try {
            checkApiKeys();
            
            // Abort any existing generation
            abortGeneration();
            
            // Create a new controller
            const currentController = createAbortController();
            
            // Start generation process (this already sets responseStream to '')
            startGeneration(currentController);

            // Check cache first
            const cachedWidget = widgetStorage.find(analysis.widgetUrl);
            if (cachedWidget) {
                console.log('Found cached widget:', analysis.widgetUrl);
                try {
                    // Just test if it works, no need to store the component
                    createComponent(cachedWidget.code);
                    addToHistory({
                        code: cachedWidget.code,
                        request: analysis.transcription,
                        params: analysis.params || {},
                        intent: analysis.intent
                    });
                    completeGeneration();
                    return;
                } catch (error) {
                    console.error('Error creating component from cache:', error);
                }
            }

            console.log('handleAnalysis - selectedModel:', selectedModel);
            const result = await processWithClaudeStream({
                analysis,
                selectedModel,
                currentComponentCode,
                abortController: currentController,
                onResponseStream: updateGenerationProgress
            });
            
            // Store result but don't rely on component reference persisting
            addToHistory({
                ...result,
                component: undefined // Explicitly remove component reference
            });
            setModificationIntent(result.intent);
            completeGeneration();
        } catch (error) {
            console.error('Analysis error:', error);
            // Use the context's error handler which will update the state
            handleError(error.message || 'An unknown error occurred');
        }
    }, [selectedModel, abortGeneration, createAbortController, startGeneration, 
        updateGenerationProgress, completeGeneration, handleError, setTranscribedText, 
        setModificationIntent]);


    const {
        volume,
        startRecording,
        stopRecording,
        cancelRecording,
        partialResults
    } = useVoiceRoom({
        onTranscription: handleAnalysis,
        onError: handleApiError,
        selectedLanguage,
        componentHistory,
        currentHistoryIndex,
        checkApiKeys
    });



    return (
        <View style={styles.container}>

            {/* Floating Voice/Stop Button */}
            <View style={styles.floatingButtonContainer}>
                <VoiceButton
                    status={generationState.status}
                    onStart={startRecording}
                    onStop={cancelRecording}
                    volume={volume}
                    disabled={!isSettingsLoaded}
                />
            </View>


            <TranscriptionBox
                status={generationState.status}
                partialResults={partialResults}
                transcribedText={generationState.transcribedText}
                requestHistory={getRequestHistory(componentHistory, currentHistoryIndex)}
            />

            {(!currentComponent || generationState.status === 'GENERATING') && (
                <ResponseStream
                    responseStream={generationState.responseStream}
                    status={generationState.status}
                    modificationIntent={generationState.modificationIntent}
                />
            )}

            {/* Error Display */}
            {error && (
                <View style={[styles.transcriptionBox, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={{ color: '#DC2626' }}>{error}</Text>
                </View>
            )}




            {/* Component Container */}
            {generationState.status !== 'GENERATING' && (
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

        </View>
    );
};
