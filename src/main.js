import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EmptyState } from './components/EmptyState';
import { VoiceButton } from './components/VoiceButton';
import { TranscriptionBox } from './components/TranscriptionBox';
import { ResponseStream } from './components/ResponseStream';
import { useSettings } from './hooks/useSettings';
import { createComponent, renderComponent } from './utils/componentUtils';
import { useAssistantController } from './controllers/AssistantController';
import { analysisPrompt } from './services/analysis';

/**
 * Main Voice Assistant component
 * Orchestrates audio, transcription, and component generation
 */
export const VoiceAssistant = React.memo(() => {
  // Track renders
  const renderCounter = React.useRef(0);
  React.useEffect(() => {
    renderCounter.current++;
    console.log(`VoiceAssistant rendered ${renderCounter.current} times`);
  });
  
  // Get settings
  const {
    getApiKeys,
    selectedModel,
    selectedLanguage,
    isSettingsLoaded
  } = useSettings();
  
  // Initialize keyboard mode
  const [keyboardActive, setKeyboardActive] = useState(false);
  const [keyboardInput, setKeyboardInput] = useState('');
  
  // Use the assistant controller
  const assistant = useAssistantController({
    getApiKeys,
    selectedModel,
    selectedLanguage
  });
  
  // Handle keyboard mode toggle
  const handleToggleKeyboard = () => {
    setKeyboardActive(prev => !prev);
  };
  
  // Handle keyboard input submit
  const handleKeyboardSubmit = () => {
    if (!keyboardInput.trim()) return;
    
    // TODO: Implement keyboard input processing
    // This will involve directly creating an analysis object
    // and passing it to the component generation process
    
    setKeyboardInput('');
  };
  
  // Recreate component from history when available
  const currentComponent = useMemo(() => {
    const current = assistant.componentHistory[0];
    if (current?.componentCode) {
      try {
        const component = createComponent(current.componentCode);
        return component;
      } catch (error) {
        console.error('Error creating component:', error);
        return null;
      }
    }
    return null;
  }, [assistant.componentHistory]);
  
  // Determine if we can render a component
  const canRenderComponent = 
    assistant.status !== assistant.STATUS.PROCESSING && 
    currentComponent !== null;
  
  return (
    <View style={styles.container}>
      {/* Error Boundary */}
      <ErrorBoundary>
        {/* Component Container or Empty State */}
        <View style={styles.componentContainer}>
          {canRenderComponent ? (
            <ScrollView style={styles.componentScroll}>
              {(() => {
                try {
                  // Get params from the current component
                  const params = assistant.componentHistory[0]?.params || {};
                  return renderComponent(currentComponent, params);
                } catch (error) {
                  console.error('Component render error:', error);
                  return (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>
                        Error rendering component: {error.message}
                      </Text>
                    </View>
                  );
                }
              })()}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <EmptyState />
              {assistant.status === assistant.STATUS.PROCESSING && (
                <Text style={styles.statusText}>Processing...</Text>
              )}
            </View>
          )}
        </View>
        
        {/* Response Stream (during generation) */}
        {assistant.status === assistant.STATUS.PROCESSING && (
          <ResponseStream
            responseStream={assistant.responseStream}
            status={assistant.status}
            intent={assistant.componentHistory[0]?.intent || 'new'}
            onRetry={assistant.retry}
          />
        )}
        
        {/* Transcription Display */}
        <TranscriptionBox
          finalTranscript={assistant.transcript}
          partialTranscript={assistant.partialTranscript}
          isListening={assistant.status === assistant.STATUS.LISTENING}
          requestHistory={assistant.componentHistory.map(item => item.transcription).slice(0, 5)}
        />
        
        {/* Voice Button */}
        <VoiceButton
          status={assistant.status}
          volume={assistant.volume}
          callActive={assistant.callActive}
          callStartTime={assistant.callStartTime}
          onPressIn={assistant.startPTT}
          onPressOut={assistant.stopPTT}
          onToggleCall={assistant.toggleCallMode}
          onToggleKeyboard={handleToggleKeyboard}
          keyboardActive={keyboardActive}
          disabled={!isSettingsLoaded}
        />
      </ErrorBoundary>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
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
    marginBottom: 16,
    overflow: 'hidden',
  },
  componentScroll: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  statusText: {
    marginTop: 16,
    color: '#666',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
  },
});