import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useVoiceRoom } from './VoiceRoomContext';
import { useSettings } from '../hooks/useSettings';
import { useComponentHistory } from './ComponentHistoryContext';
import { processWithClaudeStream } from '../services/processStream';

// Create the unified context
const AssistantContext = createContext(null);

/**
 * Provider component that creates a unified API for the voice assistant
 */
export function AssistantProvider({ children }) {
  // Access external contexts
  const voiceRoom = useVoiceRoom();
  const { selectedModel } = useSettings();
  const { addToHistory, activeConversationId } = useComponentHistory();
  
  // Direct state management for the assistant
  const [status, setStatus] = useState('IDLE'); // IDLE, LISTENING, THINKING, ERROR
  const [error, setError] = useState(null);
  const [transcribedText, setTranscribedText] = useState('');
  const [responseStream, setResponseStream] = useState('');
  const [modificationIntent, setModificationIntent] = useState(null);
  const abortControllerRef = useRef(null);
  
  // Reset state when conversation changes
  useEffect(() => {
    console.log('[AssistantContext] Conversation changed, resetting state');
    
    // Stop recording if active
    if (status === 'LISTENING') {
      console.log('[AssistantContext] Stopping active recording due to conversation change');
      voiceRoom.stopRecording();
    }
    
    // Abort any in-progress generation
    if (abortControllerRef.current) {
      console.log('[AssistantContext] Aborting active generation due to conversation change');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Reset state
    setStatus('IDLE');
    setError(null);
    setTranscribedText('');
    setResponseStream('');
    setModificationIntent(null);
    
  }, [activeConversationId, status, voiceRoom]);
  
  // Derived value for transcript (either partial results during listening or final transcribed text)
  const transcript = status === 'LISTENING' 
    ? voiceRoom.state.partialResults 
    : transcribedText;
  
  // Start listening method
  const listen = useCallback((options = {}) => {
    console.log(`[AssistantContext] listen() called with status=${status}`);
    const { checkApiKeys } = options;
    
    // Prevent duplicate recording attempts
    if (status === 'LISTENING') {
      console.log('[AssistantContext] Already listening, ignoring duplicate listen request');
      return;
    }
    
    // Clear previous state
    setResponseStream('');
    setError(null);
    
    console.log('[AssistantContext] Starting recording sequence');
    
    // Update status to LISTENING
    setStatus('LISTENING');
    
    // Start actual recording
    voiceRoom.startRecording({
      onTranscription: async (analysis) => {
        console.log(`[AssistantContext] onTranscription callback with analysis:`, analysis.transcription);
        
        // Update the transcribed text
        setTranscribedText(analysis.transcription);
        
        // Update status to THINKING
        setStatus('THINKING');
        
        // Save modification intent if present
        if (analysis.intent) {
          setModificationIntent(analysis.intent);
        }
        
        try {
          // Create an abort controller
          const controller = new AbortController();
          abortControllerRef.current = controller;
          
          console.log(`[AssistantContext] Starting generation with model: ${selectedModel}`);
          
          // Generate the component directly
          const result = await processWithClaudeStream({
            analysis,
            selectedModel,
            currentComponentCode: null,
            abortController: controller,
            onResponseStream: (content) => {
              setResponseStream(prev => prev + content);
            }
          });
          
          // Create the component history entry
          const componentEntry = {
            component: result.component,
            code: result.code,
            request: analysis.transcription,
            params: analysis.params || {},
            widgetUrl: analysis.widgetUrl,
            intent: analysis.intent
          };
          
          // Add to history
          console.log(`[AssistantContext] Adding component to history:`, componentEntry);
          addToHistory(componentEntry);
          
          // Reset status to IDLE
          setStatus('IDLE');
          abortControllerRef.current = null;
          
        } catch (error) {
          console.error(`[AssistantContext] Generation error:`, error);
          setError(error.message);
          setStatus('ERROR');
        }
      },
      onError: (error) => {
        console.log(`[AssistantContext] onError callback with error:`, error);
        setError(error);
        setStatus('ERROR');
      },
      ...options
    });
  }, [voiceRoom, status, selectedModel, addToHistory]);
  
  // Stop method
  const stop = useCallback(() => {
    console.log(`ASSISTANT: stop() called with status=${status}`);
    
    // Stop recording if needed
    if (status === 'LISTENING') {
      console.log('ASSISTANT: Stopping recording');
      voiceRoom.stopRecording();
    }
    
    // Abort generation if needed
    if (status === 'THINKING' && abortControllerRef.current) {
      console.log('ASSISTANT: Aborting generation');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Reset to IDLE
    setStatus('IDLE');
    
    console.log('ASSISTANT: stop() completed');
  }, [status, voiceRoom]);
  
  // Reset method
  const reset = useCallback(() => {
    voiceRoom.reset();
    setStatus('IDLE');
    setError(null);
    setTranscribedText('');
    setResponseStream('');
    setModificationIntent(null);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [voiceRoom]);
  
  // Text input method (bypass voice)
  const speak = useCallback((text) => {
    setTranscribedText(text);
    // Additional logic to process text directly
  }, []);
  
  // Abort generation method for components like NavigationButtons
  const abortGeneration = useCallback(() => {
    if (status === 'THINKING' && abortControllerRef.current) {
      console.log('ASSISTANT: Explicitly aborting generation');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStatus('IDLE');
    }
  }, [status]);
  
  // Create the unified API
  const assistantAPI = {
    // Unified state
    state: {
      status,
      volume: voiceRoom.state.volume,
      transcript,
      response: responseStream,
      error,
      modificationIntent
    },
    
    // Unified methods
    listen,
    stop,
    reset,
    speak,
    abortGeneration
  };
  
  return (
    <AssistantContext.Provider value={assistantAPI}>
      {children}
    </AssistantContext.Provider>
  );
}

/**
 * Hook to use the unified assistant API
 */
export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
}