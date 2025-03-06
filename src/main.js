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
import { useAssistant } from './contexts/AssistantContext';
import { ConversationView } from './components/ConversationView';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  componentContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 80, // Space for the input controls
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
    
    const { checkApiKeys } = useApiKeyCheck();
    const {
        state: assistantState,
        stop,
        reset: resetAssistant
    } = useAssistant();
    
    // Store the latest stop function in a ref for cleanup
    const stopRef = React.useRef(stop);
    useEffect(() => {
        stopRef.current = stop;
    }, [stop]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            console.log(`[${componentId}] Cleanup effect triggered during unmount - calling stop()`);
            stopRef.current();
        };
    }, []); 
    
    const [error, setError] = useState('');
    const {
        selectedLanguage,
        isSettingsLoaded
    } = useSettings();
    
    const {
        history: componentHistory,
        currentIndex: currentHistoryIndex,
        current: currentHistoryEntry
    } = useComponentHistory();
    
    // Recreate component from code whenever history entry changes
    const currentComponent = React.useMemo(() => {
        if (currentHistoryEntry?.code) {
            console.log('Attempting to recreate component from history entry code');
            try {
                const component = createComponent(currentHistoryEntry.code);
                console.log('Component successfully recreated from code');
                return component;
            } catch (error) {
                console.error('Error recreating component from history:', error);
                return null;
            }
        } else {
            console.log('No component code available in current history entry');
            return null;
        }
    }, [currentHistoryEntry?.code]);

    return (
        <View style={styles.container}>
            {/* Component Container */}
            {assistantState.status !== 'THINKING' ? (
                <View style={styles.componentContainer}>
                    {currentComponent ? (
                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
                            {(() => {
                                console.log(`Rendering component with status: ${assistantState.status}`);
                                const params = (currentHistoryIndex >= 0 && componentHistory[currentHistoryIndex]?.params) || {};
                                console.log(`Component params:`, params);
                                try {
                                    const renderedComponent = renderComponent(currentComponent, params);
                                    console.log('Component rendered successfully');
                                    return renderedComponent;
                                } catch (error) {
                                    console.error('Render error:', error);
                                    return null;
                                }
                            })()}
                        </ScrollView>
                    ) : (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <EmptyState />
                            <Text style={{ marginTop: 10 }}>Status: {assistantState.status}</Text>
                        </View>
                    )}
                </View>
            ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text>Thinking...</Text>
                    <Text style={{ marginTop: 10 }}>Status: {assistantState.status}</Text>
                </View>
            )}

            {/* Error Display */}
            {error && (
                <View style={[styles.transcriptionBox, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={{ color: '#DC2626' }}>{error}</Text>
                </View>
            )}

            {/* Voice Input UI (now with support for PTT, Call Mode, and Keyboard) */}
            <ConversationView />
        </View>
    );
}, (prevProps, nextProps) => {
    // Prevent unnecessary re-renders from props changes (we don't have any props)
    return true;
});
