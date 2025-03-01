import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { getRequestHistory } from './services/analysis';
import { widgetStorage } from './services/widgetStorage';
import { processWithClaudeStream } from './services/processStream';
import { useComponentHistory } from './contexts/ComponentHistoryContext';
import { useSettings, useApiKeyCheck } from './hooks/useSettings';
import { EmptyState } from './components/EmptyState';
import { createComponent, renderComponent } from './utils/componentUtils';
import { VoiceButton } from './components/VoiceButton';
import { ResponseStream } from './components/ResponseStream';
import { TranscriptionBox } from './components/TranscriptionBox';
import { useAssistant } from './contexts/AssistantContext';


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
    const renderCount = React.useRef(0);
    React.useEffect(() => {
        renderCount.current += 1;
        console.log(`VoiceAssistant rendered ${renderCount.current} times`);
    });
    
    console.log('Rendering VoiceAssistant');
    const scrollViewRef = React.useRef(null);
    const { checkApiKeys } = useApiKeyCheck();
    const {
        state: assistantState,
        listen,
        stop,
        reset: resetAssistant
    } = useAssistant();
    
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
            stop();
        };
    }, [stop]);
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






    return (
        <View style={styles.container}>

            {/* Floating Voice/Stop Button */}
            <View style={styles.floatingButtonContainer}>
                <VoiceButton
                    status={assistantState.status}
                    onStart={() => {
                        listen({
                            selectedLanguage,
                            componentHistory,
                            currentHistoryIndex,
                            checkApiKeys
                        });
                    }}
                    onStop={() => {
                        stop();
                    }}
                    volume={assistantState.volume}
                    disabled={!isSettingsLoaded}
                />
            </View>


            <TranscriptionBox
                status={assistantState.status}
                partialResults={assistantState.transcript}
                transcribedText={assistantState.transcript}
                requestHistory={getRequestHistory(componentHistory, currentHistoryIndex)}
            />

            {(!currentComponent || assistantState.status === 'THINKING') && (
                <ResponseStream
                    responseStream={assistantState.response}
                    status={assistantState.status}
                    modificationIntent={assistantState.modificationIntent}
                />
            )}

            {/* Error Display */}
            {error && (
                <View style={[styles.transcriptionBox, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={{ color: '#DC2626' }}>{error}</Text>
                </View>
            )}




            {/* Component Container */}
            {assistantState.status !== 'THINKING' && (
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
