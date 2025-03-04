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




// Helper function to track renders - outside the component to avoid recreation
const renderCounts = {};

export const VoiceAssistant = React.memo(() => {
    const componentId = React.useRef(`voice-assistant-${Date.now()}`).current;
    
    // Initialize render counter if it doesn't exist
    if (!renderCounts[componentId]) {
        renderCounts[componentId] = 0;
        console.log(`[${componentId}] Component FIRST MOUNT`);
    }
    
    const prevStatusRef = React.useRef(null);
    const prevResponseStreamRef = React.useRef(null);
    
    // Track renders only in development
    if (process.env.NODE_ENV !== 'production') {
        renderCounts[componentId]++;
        console.log(`[${componentId}] VoiceAssistant rendered ${renderCounts[componentId]} times`);
    }
    
    // Add this effect to track unmounting
    React.useEffect(() => {
        return () => {
            console.log(`[${componentId}] Component UNMOUNTING`);
            delete renderCounts[componentId];
        };
    }, [componentId]);
    
    const scrollViewRef = React.useRef(null);
    const { checkApiKeys } = useApiKeyCheck();
    const {
        state: assistantState,
        listen,
        stop,
        reset: resetAssistant
    } = useAssistant();
    
    // Log status changes to help debug re-renders
    if (prevStatusRef.current !== assistantState.status) {
        console.log(`[${componentId}] Status changed from ${prevStatusRef.current} to ${assistantState.status}`);
        prevStatusRef.current = assistantState.status;
    }
    
    // Log response text length changes
    if (assistantState.response !== prevResponseStreamRef.current) {
        const prevLength = prevResponseStreamRef.current ? prevResponseStreamRef.current.length : 0;
        const currentLength = assistantState.response ? assistantState.response.length : 0;
        console.log(`[${componentId}] Response length changed from ${prevLength} to ${currentLength}`);
        prevResponseStreamRef.current = assistantState.response;
    }
    
    const handleApiError = useCallback((error) => {
        if (error && error.message && error.message.includes('API key')) {
            setError(error.message);
        } else {
            setError('An error occurred');
            console.error(error);
        }
    }, []);


    // Store the latest stop function in a ref
    const stopRef = React.useRef(stop);
    useEffect(() => {
        stopRef.current = stop;
    }, [stop]);

    // Use the ref in the cleanup effect with no dependencies
    useEffect(() => {
        console.log(`[${componentId}] Setting up cleanup effect (no dependencies)`);
        return () => {
            console.log(`[${componentId}] Cleanup effect triggered during unmount - calling stop()`);
            stopRef.current();
        };
    }, []); // Empty dependency array
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
                    onStart={useCallback(() => {
                        listen({
                            selectedLanguage,
                            componentHistory,
                            currentHistoryIndex,
                            checkApiKeys
                        });
                    }, [listen, selectedLanguage, componentHistory, currentHistoryIndex, checkApiKeys])}
                    onStop={useCallback(() => {
                        stop();
                    }, [stop])}
                    volume={assistantState.volume}
                    disabled={!isSettingsLoaded}
                />
            </View>


            <TranscriptionBox
                status={assistantState.status}
                transcript={assistantState.transcript}
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
}, (prevProps, nextProps) => {
    // In app/(drawer)/index.js, VoiceAssistant is used without any props: <VoiceAssistant />
    // When we add React.memo with this comparison function, we're telling React:
    // "Don't re-render this component unless its props change"
    // Since it receives no props, there's nothing to compare, so we can safely return true
    // to prevent all prop-based re-renders. The component will still re-render when its
    // internal state or context dependencies change.
    console.log('VoiceAssistant memo comparison function called');
    return true;
});
