import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useVoiceRoom } from './VoiceRoomContext';
import { useSettings } from '../hooks/useSettings';
import { useComponentHistory } from './ComponentHistoryContext';
import { processWithClaudeStream } from '../services/processStream';
import { getApiKeys, hasApiKeys } from '../services/settings';

// Create the unified context
const AssistantContext = createContext(null);

/**
 * Provider component that creates a unified API for the voice assistant
 */
export function AssistantProvider({ children }) {
  // Access external contexts
  const voiceRoom = useVoiceRoom();
  const { selectedModel, openrouterApiKey, ultravoxApiKey } = useSettings();
  console.log('AssistantProvider', { selectedModel, openrouterApiKey, ultravoxApiKey });
  const { addToHistory, activeConversationId } = useComponentHistory();
  
  // Direct state management for the assistant
  const [status, setStatus] = useState('IDLE'); // IDLE, LISTENING, THINKING, ERROR
  const [error, setError] = useState(null);
  const [transcribedText, setTranscribedText] = useState('');
  const [responseStream, setResponseStream] = useState('');
  const [modificationIntent, setModificationIntent] = useState(null);
  
  // Input mode states
  const [callActive, setCallActive] = useState(false);
  const [keyboardActive, setKeyboardActive] = useState(false);
  const [callStartTime, setCallStartTime] = useState(null);
  
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
    setCallActive(false);
    setCallStartTime(null);
  }, [activeConversationId, status, voiceRoom]);
  
  // Use partial results from VoiceRoom during LISTENING, otherwise use the final transcribed text
  const transcript = status === 'LISTENING' 
    ? voiceRoom.state.partialResults 
    : transcribedText;
  
  // Function to process transcribed text and generate response
  const processTranscription = useCallback(async (analysis) => {
    console.log(`[AssistantContext] Processing transcription:`, analysis.transcription);
    console.log(`[AssistantContext] Full analysis object:`, JSON.stringify(analysis));
    console.log(`[AssistantContext] Intent:`, analysis.intent);
    console.log(`[AssistantContext] Widget URL:`, analysis.widgetUrl);
    
    // Update the transcribed text
    setTranscribedText(analysis.transcription);
    
    // Update status to THINKING
    console.log(`[AssistantContext] Changing status to THINKING before component generation`);
    setStatus('THINKING');
    
    // Save modification intent if present
    if (analysis.intent) {
      setModificationIntent(analysis.intent);
    }
    
    try {
      // Create an abort controller
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      // Get API keys directly from settings storage
      const apiKeys = getApiKeys();
      
      // Check API keys before proceeding with generation
      if (!apiKeys.ultravox || !apiKeys.openrouter) {
        throw new Error('Please set your API keys in settings');
      }
      
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
      console.log(`[AssistantContext] Starting component generation with model: ${selectedModel}`);
      const result = await processWithClaudeStream({
        analysis,
        selectedModel,
        apiKey: apiKeys.openrouter, // Use directly from apiKeys
        currentComponentCode: null,
        abortController: controller,
        onResponseStream: throttledResponseHandler
      });
      
      console.log(`[AssistantContext] Component generation completed successfully`);
      
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
      
      // If not in call mode, reset to IDLE
      if (!callActive) {
        console.log(`[AssistantContext] Setting status back to IDLE after component generation`);
        setStatus('IDLE');
      } else {
        // If in call mode, go back to LISTENING
        console.log(`[AssistantContext] Setting status back to LISTENING (call mode) after component generation`);
        setStatus('LISTENING');
      }
      
      abortControllerRef.current = null;
      
    } catch (error) {
      console.error(`[AssistantContext] Generation error:`, error);
      setError(error.message);
      setStatus('ERROR');
    }
  }, [voiceRoom, selectedModel, openrouterApiKey, addToHistory, callActive]);
  
  // Handle press in for Push-to-Talk mode - using direct settings access
  const handlePressIn = () => {
    if (callActive || keyboardActive) return; // Don't start PTT during call/keyboard
    
    console.log('[AssistantContext] Starting PTT recording');
    
    // Get API keys directly from settings storage
    const apiKeys = getApiKeys();
    
    console.log('[AssistantContext] handlePressIn with API keys:', {
      ultravox: apiKeys.ultravox ? `Key present (length: ${apiKeys.ultravox.length})` : 'Missing',
      openrouter: apiKeys.openrouter ? `Key present (length: ${apiKeys.openrouter.length})` : 'Missing',
      callTime: new Date().toISOString()
    });
    
    // Check API keys before proceeding
    if (!apiKeys.ultravox || !apiKeys.openrouter) {
      setError('Please set your API keys in settings');
      setStatus('ERROR');
      return;
    }
    
    // Clear previous state
    setResponseStream('');
    setTranscribedText('');
    setError(null);
    
    // Update status to LISTENING
    setStatus('LISTENING');
    
    // Start recording in PTT mode
    voiceRoom.startRecording({
      onTranscription: processTranscription,
      onError: (error) => {
        console.log(`[AssistantContext] onError callback with error:`, error);
        setError(error);
        setStatus('ERROR');
      },
      continuousListening: false,
      apiKeys // Pass the entire keys object
    });
  };
  
  // Handle press out for Push-to-Talk mode - removed useCallback
  const handlePressOut = () => {
    if (callActive) return; // Don't end recording if in call mode
    
    console.log('[AssistantContext] Stopping PTT recording');
    voiceRoom.stopRecording();
  };
  
  // Handle press for Call mode toggle - using direct settings access
  const handlePress = () => {
    if (keyboardActive) return; // Don't toggle call if keyboard is active
    
    // Get API keys directly from settings storage
    const apiKeys = getApiKeys();
    
    console.log('[AssistantContext] handlePress with API keys:', {
      ultravox: apiKeys.ultravox ? `Key present (length: ${apiKeys.ultravox.length})` : 'Missing',
      openrouter: apiKeys.openrouter ? `Key present (length: ${apiKeys.openrouter.length})` : 'Missing'
    });
    
    if (!callActive) {
      // Check API keys before starting call
      if (!apiKeys.ultravox || !apiKeys.openrouter) {
        setError('Please set your API keys in settings');
        setStatus('ERROR');
        return;
      }
      
      // Start call
      console.log('[AssistantContext] Starting call');
      setCallActive(true);
      setCallStartTime(Date.now());
      setStatus('LISTENING');
      
      // Clear previous state
      setResponseStream('');
      setTranscribedText('');
      setError(null);
      
      // Start recording in call mode
      voiceRoom.startRecording({
        onTranscription: processTranscription,
        onError: (error) => {
          console.log(`[AssistantContext] onError callback with error:`, error);
          setError(error);
          setStatus('ERROR');
          setCallActive(false);
          setCallStartTime(null);
        },
        continuousListening: true,
        silenceThreshold: 1.5,
        apiKeys // Pass the entire keys object
      });
    } else {
      // End call
      console.log('[AssistantContext] Ending call');
      setCallActive(false);
      setCallStartTime(null);
      voiceRoom.stopRecording();
      setStatus('IDLE');
    }
  };
  
  // Toggle keyboard - removed useCallback
  const toggleKeyboard = () => {
    setKeyboardActive(prev => !prev);
    
    // If enabling keyboard and call is active, keep call going
    // If no call is active, ensure we're in IDLE state
    if (!keyboardActive && !callActive) {
      setStatus('IDLE');
    }
  };
  
  // Start listening method (for backward compatibility) - removed useCallback
  const listen = (options = {}) => {
    console.log(`[AssistantContext] listen() called with status=${status}`);
    
    // Use the new handlePress method to handle listening
    handlePress();
  };
  
  // Submit text method (for keyboard input) - using direct settings access
  const submitText = (text) => {
    console.log(`[AssistantContext] submitText() called with text:`, text);
    
    // Get API keys directly from settings storage
    const apiKeys = getApiKeys();
    
    // Check API keys before proceeding
    if (!apiKeys.ultravox || !apiKeys.openrouter) {
      setError('Please set your API keys in settings');
      setStatus('ERROR');
      return;
    }
    
    // Clear previous state
    setResponseStream('');
    setTranscribedText(text);
    setError(null);
    
    // Update status to THINKING
    setStatus('THINKING');
    
    // Process the text directly (simulate voice analysis)
    const analysis = {
      transcription: text,
      params: {}
    };
    
    processTranscription(analysis);
  };
  
  // Stop method - removed useCallback
  const stop = () => {
    console.log(`ASSISTANT: stop() called with status=${status}`);
    
    // If in call mode, end the call
    if (callActive) {
      setCallActive(false);
      setCallStartTime(null);
    }
    
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
  };
  
  // Reset method - removed useCallback
  const reset = () => {
    voiceRoom.reset();
    setStatus('IDLE');
    setError(null);
    setTranscribedText('');
    setResponseStream('');
    setModificationIntent(null);
    setCallActive(false);
    setKeyboardActive(false);
    setCallStartTime(null);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };
  
  // Abort generation method for components like NavigationButtons - removed useCallback
  const abortGeneration = () => {
    if (status === 'THINKING' && abortControllerRef.current) {
      console.log('ASSISTANT: Explicitly aborting generation');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      
      // If in call mode, go back to LISTENING, otherwise go to IDLE
      setStatus(callActive ? 'LISTENING' : 'IDLE');
    }
  };
  
  // Log API keys on each render to track their values
  console.log('[AssistantContext] Render with API keys:', {
    ultravoxApiKey: ultravoxApiKey ? `Set (length: ${ultravoxApiKey.length})` : 'Missing',
    openrouterApiKey: openrouterApiKey ? `Set (length: ${openrouterApiKey.length})` : 'Missing'
  });

  // Create context value directly without useMemo to avoid stale closures
  const assistantAPI = {
    // Unified state
    state: {
      status,
      volume: voiceRoom.state.volume,
      transcript,
      response: responseStream,
      error,
      modificationIntent,
      callActive,
      keyboardActive,
      callStartTime
    },
    
    // Unified methods
    listen,
    stop,
    reset,
    submitText,
    abortGeneration,
    
    // New gesture-based methods
    handlePressIn,
    handlePressOut,
    handlePress,
    toggleKeyboard
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
