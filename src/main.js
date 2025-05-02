import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Keyboard } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { KeyboardInput } from './components/KeyboardInput';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EmptyState } from './components/EmptyState';
import { VoiceButton } from './components/VoiceButton';
import { TranscriptionBox } from './components/TranscriptionBox';
import { ResponseStream } from './components/ResponseStream';
import { hasApiKeys } from './services/settings';
import { createComponent, renderComponent } from './utils/componentUtils';
import { useAssistantState } from './hooks/useAssistantState';
import { componentHistoryService } from './services/componentHistoryService';
import { AssistantService } from './services/assistantService';

/**
 * Main Voice Assistant component
 * Orchestrates audio, transcription, and component generation
 */
// Initialize componentHistoryService
console.log('Initializing componentHistoryService...');
componentHistoryService.initialize();
console.log('ComponentHistoryService initialized successfully');

export const VoiceAssistant = React.memo(() => {
  // Track renders
  const renderCounter = React.useRef(0);
  React.useEffect(() => {
    renderCounter.current++;
    console.log(`VoiceAssistant rendered ${renderCounter.current} times`);
  });
  
  // Initialize keyboard mode
  const [keyboardActive, setKeyboardActive] = useState(false);
  const [keyboardInput, setKeyboardInput] = useState('');
  
  // Use our new non-React-context assistant state 
  const assistant = useAssistantState();
  
  // Check if API keys are set
  const isApiKeysSet = hasApiKeys();
  
  // Calculate transcripts at the top level of the component
  const transcripts = useMemo(() => {
    // Get all transcripts from history (no arbitrary limit)
    const historyTranscripts = (assistant.history || [])
      .map(item => item?.transcript || '');

    // Only include history items UP TO the current index (inclusive)
    const filteredHistory = historyTranscripts.slice(0, assistant.currentHistoryIndex + 1);
    
    // Add partial transcript if present (regardless of state)
    // This ensures text input shows up immediately
    if (assistant.partialTranscript) {
      return [...filteredHistory, assistant.partialTranscript];
    }
    
    return filteredHistory;
  }, [assistant.history, assistant.currentHistoryIndex, assistant.partialTranscript]);
  
  // Handle keyboard mode toggle
  const handleToggleKeyboard = () => {
    setKeyboardActive(prev => !prev);
    
    // If closing keyboard, ensure keyboard is dismissed
    if (keyboardActive) {
      Keyboard.dismiss();
    }
  };
  
  // Handle keyboard input submit
  const handleKeyboardSubmit = async (text) => {
    if (!text.trim()) return;
    
    console.log('Processing keyboard input:', text);
    
    // Process the text input using the AssistantService
    await AssistantService.processTextInput(text);
    
    // Close keyboard after submission
    setKeyboardActive(false);
  };
  
  // Recreate component from history when available
  const currentComponent = useMemo(() => {
    const current = assistant.currentComponent;
    console.log('Current component from history:', current ? 
      { 
        hasCode: Boolean(current.code), 
        codeLength: current.code?.length,
        availableProps: current ? Object.keys(current) : []
      } : 'No component');
    
    if (current?.code) {
      try {
        const component = createComponent(current.code);
        console.log('Component created successfully');
        return component;
      } catch (error) {
        console.error('Error creating component:', error);
        return null;
      }
    }
    return null;
  }, [assistant.currentComponent]);
  
  // Determine if we can render a component
  const canRenderComponent = 
    assistant.status !== assistant.STATUS.PROCESSING && 
    currentComponent !== null;
  
  return (
    <View style={styles.container}>
      {/* Error Boundary */}
      <ErrorBoundary>
        {/* Main Content Area - Either Component Container or Response Stream */}
        {(assistant.status === assistant.STATUS.PROCESSING || 
          assistant.status === assistant.STATUS.THINKING || 
          (assistant.status === assistant.STATUS.ERROR && assistant.responseStream)) ? (
          /* Response Stream (during generation or error if we have content) */
          <View style={styles.componentContainer}>
            <ResponseStream
              responseStream={assistant.responseStream}
              status={assistant.status}
              intent={assistant.currentComponent?.intent || 'new'}
              onRetry={assistant.retry}
              onCancel={assistant.abortGeneration}
            />
          </View>
        ) : (
          /* Component Container or Empty State - full width/height */
          <View style={styles.componentContainer}>
            {canRenderComponent ? (
              <ScrollView style={styles.componentScroll}>
                {(() => {
                  try {
                    // Get params from the current component
                    const params = assistant.currentComponent?.params || {};
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
              </View>
            )}
          </View>
        )}
        
        {/* Transcription Box with Floating Voice Button */}
        <View style={styles.transcriptionContainer}>
          <TranscriptionBox
            isListening={assistant.status === assistant.STATUS.LISTENING}
            transcripts={transcripts}
            style={keyboardActive ? { display: 'none' } : undefined}
          />
          
          {/* Floating Voice Button - hide when keyboard is active */}
          {!keyboardActive && (
            <View style={styles.floatingButtonContainer}>
              <VoiceButton
                status={assistant.status}
                volume={assistant.volume}
                callActive={assistant.callActive}
                callStartTime={assistant.callStartTime}
                onPressIn={assistant.startRecording}
                onPressOut={{
                  setMode: (mode) => assistant.setMode(mode === 'call' ? assistant.MODE.CALL : assistant.MODE.PTT),
                  stopRecording: assistant.stopRecording,
                  endCall: assistant.endCall
                }}
                disabled={!isApiKeysSet}
              />
            </View>
          )}
          
        </View>
        
        {/* Keyboard toggle button positioned absolutely */}
        <View style={styles.keyboardButtonContainer}>
          <TouchableOpacity 
            style={[
              styles.keyboardToggleButton,
              keyboardActive && styles.keyboardToggleButtonActive
            ]}
            onPress={handleToggleKeyboard}
            disabled={assistant.status === assistant.STATUS.PROCESSING}
          >
            <Feather 
              name="type" 
              size={24} 
              color={keyboardActive ? "#FFFFFF" : "#4F46E5"} 
            />
          </TouchableOpacity>
        </View>
        
        {/* Keyboard input component */}
        {keyboardActive && (
          <KeyboardInput 
            active={keyboardActive}
            onSubmit={handleKeyboardSubmit}
            onToggle={handleToggleKeyboard}
            callActive={assistant.callActive}
          />
        )}
      </ErrorBoundary>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  componentContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    overflow: 'hidden',
    zIndex: 10,
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
  transcriptionContainer: {
    position: 'relative',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0, // Positioned at the bottom edge
    alignSelf: 'center',
    zIndex: 10, // Ensure it's above the transcription box
  },
  keyboardButtonContainer: {
    position: 'absolute',
    bottom: 20,
    right: 36, // Adjusted to account for removed container padding
    zIndex: 20,
  },
  keyboardToggleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  keyboardToggleButtonActive: {
    backgroundColor: '#4F46E5',
  },
});
