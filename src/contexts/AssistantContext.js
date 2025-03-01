import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useVoiceRoom } from './VoiceRoomContext';
import { useGeneration } from './GenerationContext';
import { useSettings } from '../hooks/useSettings';

// Create the unified context
const AssistantContext = createContext(null);

/**
 * Provider component that creates a unified API for the voice assistant
 * This sits inside both the VoiceRoomProvider and GenerationProvider
 */
export function AssistantProvider({ children }) {
  // Access internal contexts
  const voiceRoom = useVoiceRoom();
  const generation = useGeneration();
  const { selectedModel } = useSettings();
  
  // Create a unified status
  const status = useMemo(() => {
    let newStatus;
    if (voiceRoom.state.isRecording) {
      newStatus = 'LISTENING';
    } else if (generation.state.status === 'GENERATING') {
      newStatus = 'THINKING';
    } else if (generation.state.status === 'ERROR') {
      newStatus = 'ERROR';
    } else {
      newStatus = 'IDLE';
    }
    
    console.log(`[AssistantContext] Status calculated: ${newStatus} (voiceRoom.isRecording=${voiceRoom.state.isRecording}, voiceRoom.volume=${voiceRoom.state.volume}, generation.status=${generation.state.status})`);
    return newStatus;
  }, [
    voiceRoom.state.isRecording,
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
    console.log(`[AssistantContext] listen() called with status=${status}`);
    const { checkApiKeys } = options;
    
    // Prevent duplicate recording attempts
    if (status === 'LISTENING') {
      console.log('[AssistantContext] Already listening, ignoring duplicate listen request');
      return;
    }
    
    console.log('[AssistantContext] Starting recording sequence');
    
    // First update generation state
    generation.startRecording();
    
    // Then start actual recording
    voiceRoom.startRecording({
      onTranscription: (analysis) => {
        console.log(`[AssistantContext] onTranscription callback with analysis:`, analysis.transcription);
        
        // First update the transcribed text in generation context
        generation.stopRecording(analysis.transcription);
        
        // Then start generation with selectedModel from settings
        console.log(`[AssistantContext] Starting generation with model: ${selectedModel}`);
        generation.startGeneration(analysis, { 
          selectedModel: selectedModel 
        });
      },
      onError: (error) => {
        console.log(`[AssistantContext] onError callback with error:`, error);
        generation.handleError(error);
      },
      ...options
    });
  }, [voiceRoom, generation, status]);
  
  // Stop method
  const stop = useCallback(() => {
    console.log(`ASSISTANT: stop() called with status=${status}`);
    
    // First stop recording
    console.log('ASSISTANT: Calling voiceRoom.stopRecording()');
    voiceRoom.stopRecording();
    console.log('ASSISTANT: voiceRoom.stopRecording() completed');
    
    // Then abort generation if needed
    if (status === 'THINKING') {
      console.log('ASSISTANT: Calling generation.abortGeneration() because status is THINKING');
      generation.abortGeneration();
      console.log('ASSISTANT: generation.abortGeneration() completed');
    }
    
    console.log('ASSISTANT: stop() completed');
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
