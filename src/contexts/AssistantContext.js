import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useVoiceRoom } from './VoiceRoomContext';
import { useGeneration } from './GenerationContext';

// Create the unified context
const AssistantContext = createContext(null);

/**
 * Provider component that creates a unified API for the voice assistant
 * This sits inside both the VoiceRoomProvider and GenerationProvider
 */
export function AssistantProvider({ children }) {
  // Access both internal contexts
  const voiceRoom = useVoiceRoom();
  const generation = useGeneration();
  
  // Create a unified status
  const status = useMemo(() => {
    if (voiceRoom.state.isConnecting || 
        (voiceRoom.state.volume > 0 && generation.state.status === 'RECORDING')) {
      return 'LISTENING';
    }
    
    if (generation.state.status === 'GENERATING') {
      return 'THINKING';
    }
    
    if (generation.state.status === 'ERROR') {
      return 'ERROR';
    }
    
    return 'IDLE';
  }, [
    voiceRoom.state.isConnecting,
    voiceRoom.state.volume,
    generation.state.status
  ]);
  
  // Create a unified transcript value
  const transcript = useMemo(() => {
    if (status === 'LISTENING') {
      return voiceRoom.state.partialResults;
    }
    return generation.state.transcribedText;
  }, [
    status,
    voiceRoom.state.partialResults,
    generation.state.transcribedText
  ]);
  
  // Unified error handling
  const error = useMemo(() => {
    return generation.state.error;
  }, [generation.state.error]);
  
  // Start listening method
  const listen = useCallback((options = {}) => {
    const { checkApiKeys } = options;
    
    // First update generation state
    generation.startRecording();
    
    // Then start actual recording
    voiceRoom.startRecording({
      onTranscription: (analysis) => {
        generation.stopRecording(analysis.transcription);
        generation.startGeneration(analysis);
      },
      onError: (error) => {
        generation.handleError(error);
      },
      ...options
    });
  }, [voiceRoom, generation]);
  
  // Stop method
  const stop = useCallback(() => {
    // First stop recording
    voiceRoom.stopRecording();
    
    // Then abort generation if needed
    if (status === 'THINKING') {
      generation.abortGeneration();
    }
  }, [status, voiceRoom, generation]);
  
  // Reset method
  const reset = useCallback(() => {
    voiceRoom.reset();
    generation.reset();
  }, [voiceRoom, generation]);
  
  // Text input method (bypass voice)
  const speak = useCallback((text) => {
    generation.setTranscribedText(text);
    // Additional logic to process text directly
  }, [generation]);
  
  // Create the unified API
  const assistantAPI = useMemo(() => ({
    // Unified state
    state: {
      status,
      volume: voiceRoom.state.volume,
      transcript,
      response: generation.state.responseStream,
      error,
      modificationIntent: generation.state.modificationIntent
    },
    
    // Unified methods
    listen,
    stop,
    reset,
    speak
  }), [
    status,
    voiceRoom.state.volume,
    transcript,
    generation.state.responseStream,
    error,
    generation.state.modificationIntent,
    listen,
    stop,
    reset,
    speak
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
