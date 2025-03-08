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
  
  // Handle keyboard mode toggle
  const handleToggleKeyboard = () => {
    setKeyboardActive(prev => !prev);
    
    // If closing keyboard, ensure keyboard is dismissed
    if (keyboardActive) {
      Keyboard.dismiss();
    }
  };
  
  // Handle keyboard input submit
  const handleKeyboardSubmit = (text) => {
    if (!text.trim()) return;
    
    console.log('Processing keyboard input:', text);
    
    // Create an analysis object similar to what speech would create
    const analysis = {
      transcript: text,
      widgetUrl: 'keyboard-input', // Special identifier for keyboard inputs
      confidence: 1.0, // Keyboard input has perfect confidence
      source: 'keyboard'
    };
    
    // Process the input using the assistant service
    assistant.processAnalysis(analysis);
    
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
        {/* Component Container or Empty State - full width/height */}
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
              {assistant.status === assistant.STATUS.PROCESSING && (
                <Text style={styles.statusText}>Processing...</Text>
              )}
            </View>
          )}
        </View>
        
        {/* Response Stream (during generation or error if we have content) */}
        {(assistant.status === assistant.STATUS.PROCESSING || 
          assistant.status === assistant.STATUS.THINKING || 
          (assistant.status === assistant.STATUS.ERROR && assistant.responseStream)) && (
          <ResponseStream
            responseStream={assistant.responseStream}
            status={assistant.status}
            intent={assistant.currentComponent?.intent || 'new'}
            onRetry={assistant.retry}
            onCancel={assistant.abortGeneration}
          />
        )}
        
        {/* Transcription Box with Floating Voice Button */}
        <View style={styles.transcriptionContainer}>
          <TranscriptionBox
            isListening={assistant.status === assistant.STATUS.LISTENING}
            transcripts={useMemo(() => {
              // Get transcripts from history
              const historyTranscripts = (assistant.history || [])
                .map(item => item?.transcript || '')
                .slice(0, 5);
              
              // Only include history items up to the current index
              const filteredHistory = assistant.currentHistoryIndex > 0
                ? historyTranscripts.slice(0, assistant.currentHistoryIndex)
                : historyTranscripts;
              
              // Add current transcript to the list if it exists and isn't already in history
              const allTranscripts = [...filteredHistory];
              if (assistant.partialTranscript) {
                allTranscripts.push(assistant.partialTranscript);
              } else if (assistant.transcript && 
                        (!filteredHistory.length || 
                          filteredHistory[filteredHistory.length - 1] !== assistant.transcript)) {
                allTranscripts.push(assistant.transcript);
              }
              
              return allTranscripts;
            }, [assistant.history, assistant.currentHistoryIndex, assistant.transcript, assistant.partialTranscript])}
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  transcriptionContainer: {
    position: 'relative',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: -30, // Position it to overlap with the bottom of the transcription box
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
