import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
  const { selectedModel, openrouterApiKey } = useSettings();
  const { addToHistory, activeConversationId } = useComponentHistory();
  
  
  // Direct state management for the assistant
  const [status, setStatus] = useState('IDLE'); // IDLE, LISTENING, THINKING, ERROR
  const [error, setError] = useState(null);
  const [transcribedText, setTranscribedText] = useState('');
  const [responseStream, setResponseStream] = useState('');
  const [modificationIntent, setModificationIntent] = useState(null);
  const abortControllerRef = useRef(null);
  
  // Track previous conversation ID to detect actual changes
  const prevConversationIdRef = useRef(null);
  

  // Reset state when conversation changes
  useEffect(() => {
    // Skip the effect on initial mount
    if (prevConversationIdRef.current === null) {
      prevConversationIdRef.current = activeConversationId;
      return;
    }
    
    // Skip if the conversation ID hasn't actually changed
    if (prevConversationIdRef.current === activeConversationId) {
      return;
    }
    
    console.log('[AssistantContext] Conversation changed from', 
      prevConversationIdRef.current, 'to', activeConversationId);
    prevConversationIdRef.current = activeConversationId;
    
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
  
  // Use partial results from VoiceRoom during LISTENING, otherwise use the final transcribed text
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
    setTranscribedText('');
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
          
          // Create an accumulating response buffer with throttling
          let responseBuffer = '';
          let lastUpdateTime = 0;
          const UPDATE_INTERVAL = 250; // Update UI at most every 250ms
          
          // Function to process the buffer and update the UI
          const processBuffer = () => {
            if (responseBuffer.length === 0) {
              return;
            }
            
            // Save buffer content before processing to check it was fully added
            const bufferToProcess = responseBuffer;
            
            setResponseStream(prev => {
              const newValue = prev + bufferToProcess;
              // Only keep critical error logging
              if (newValue.length !== prev.length + bufferToProcess.length) {
                console.error(`[ProcessBuffer] Content length mismatch: Expected ${prev.length + bufferToProcess.length} but got ${newValue.length}`);
              }
              return newValue;
            });
            
            // Clear the buffer after updating
            responseBuffer = '';
          };
          
          // Custom response handler with throttling
          const throttledResponseHandler = (content) => {
            // Always add new content to the buffer
            responseBuffer += content;
            
            // Check if we should update now
            const now = Date.now();
            if (now - lastUpdateTime >= UPDATE_INTERVAL) {
              lastUpdateTime = now;
              processBuffer();
            }
          };
          
          // Generate the component directly
          const result = await processWithClaudeStream({
            analysis,
            selectedModel,
            apiKey: openrouterApiKey,
            currentComponentCode: null,
            abortController: controller,
            onResponseStream: throttledResponseHandler
          });
          
          // Process any remaining buffer content at the end of generation
          processBuffer();
          
          // Safety check - verify content was processed (should never happen)
          if (responseBuffer.length > 0) {
            console.warn(`Remaining buffer content found (${responseBuffer.length} chars), processing again`);
            processBuffer();
          }
          
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
  }, [voiceRoom, status, selectedModel, openrouterApiKey, addToHistory]);
  
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
  
  // Create the unified API with memoization to prevent unnecessary re-renders
  const assistantAPI = useMemo(() => ({
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
  }), [
    status, 
    voiceRoom.state.volume,
    transcript,
    responseStream,
    error,
    modificationIntent,
    listen,
    stop,
    reset,
    speak,
    abortGeneration
  ]);
  
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