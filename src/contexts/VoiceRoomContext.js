import React, { createContext, useContext, useReducer, useRef, useState, useEffect, useCallback, useMemo } from 'react';
import AudioRecord from 'react-native-audio-record';
import { PERMISSIONS, request, check, RESULTS } from 'react-native-permissions';
import { Platform } from 'react-native';
import { storage, SETTINGS_KEY } from '../services/storage';
import { analysisPrompt } from '../services/analysis';
import { parse, STR, OBJ } from 'partial-json';
import { useGeneration } from './GenerationContext';

// Audio recording options
const options = {
  sampleRate: 16000,
  channels: 1,
  bitsPerSample: 16,
  audioSource: 6,
  wavFile: 'audio.wav'
};

// Initial state for the voice room
const initialState = {
  volume: 0,
  partialResults: '',
  isConnecting: false,
};

// Action types
const ACTIONS = {
  SET_VOLUME: 'SET_VOLUME',
  SET_PARTIAL_RESULTS: 'SET_PARTIAL_RESULTS',
  SET_CONNECTING: 'SET_CONNECTING',
  RESET: 'RESET',
};

// Reducer function
function voiceRoomReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_VOLUME:
      return { ...state, volume: action.payload };
    case ACTIONS.SET_PARTIAL_RESULTS:
      return { ...state, partialResults: action.payload };
    case ACTIONS.SET_CONNECTING:
      return { ...state, isConnecting: action.payload };
    case ACTIONS.RESET:
      return { ...initialState };
    default:
      return state;
  }
}

// Create the context
const VoiceRoomContext = createContext(null);

// Helper function to clean JSON text
const cleanJsonText = (text) => {
  return text.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
};

/**
 * Provider component for voice room functionality
 */
export function VoiceRoomProvider({ children }) {
  const [state, dispatch] = useReducer(voiceRoomReducer, initialState);
  const { 
    state: generationState, 
    startRecording: startGenerationRecording,
    stopRecording: stopGenerationRecording,
    handleError: handleGenerationError,
    setTranscribedText,
    abortGeneration
  } = useGeneration();
  
  // Refs for mutable state that shouldn't trigger re-renders
  const ws = useRef(null);
  const audioBuffer = useRef([]);
  const isCleaningUp = useRef(false);
  const isCancelling = useRef(false);
  const isStartingRecording = useRef(false);
  
  // Check microphone permission
  const checkPermission = async () => {
    try {
      const permission = Platform.select({
        ios: PERMISSIONS.IOS.MICROPHONE,
        android: PERMISSIONS.ANDROID.RECORD_AUDIO,
        default: null,
      });

      if (!permission) {
        throw new Error('Platform not supported');
      }

      const status = await check(permission);
      
      if (status === RESULTS.GRANTED) {
        return true;
      }

      // Request permission if not granted
      const result = await request(permission, {
        title: 'Microphone Permission',
        message: 'Voice Assistant needs access to your microphone to process voice commands.',
        buttonPositive: 'Grant Permission',
        buttonNegative: 'Cancel',
      });

      return result === RESULTS.GRANTED;
    } catch (err) {
      console.error('Permission check failed:', err);
      return false;
    }
  };

  // WebSocket cleanup function
  const cleanupWebSocket = useCallback(() => {
    console.log('Cleaning up WebSocket...');
  
    // Get the current WebSocket and immediately set the ref to null
    // This acts as a lock to prevent multiple cleanup attempts on the same instance
    const currentWs = ws.current;
    ws.current = null;
  
    // Only proceed with cleanup if we had an active WebSocket
    if (currentWs) {
      if (currentWs.readyState === WebSocket.OPEN || currentWs.readyState === WebSocket.CONNECTING) {
        console.log(`Closing WebSocket in state: ${currentWs.readyState}`);
        try {
          currentWs.close();
          console.log('WebSocket closed successfully');
        } catch (error) {
          console.error('Error closing WebSocket:', error);
        }
      } else {
        console.log(`WebSocket already closed or closing (state: ${currentWs.readyState})`);
      }
    } else {
      console.log('No active WebSocket to clean up');
    }
  }, []);

  // Main cleanup function
  const cleanup = useCallback(() => {
    if (isCleaningUp.current) {
      console.log('Cleanup already in progress, skipping');
      return;
    }
    
    isCleaningUp.current = true;
    
    try {
      console.log('Full cleanup of voice room...');
      cleanupWebSocket();
      console.log('Stopping AudioRecord');
      AudioRecord.stop();
      console.log('Setting volume to 0');
      dispatch({ type: ACTIONS.SET_CONNECTING, payload: false });
      dispatch({ type: ACTIONS.SET_VOLUME, payload: 0 });
      audioBuffer.current = [];
      console.log('Cleanup complete, status:', generationState.status);
    } finally {
      isCleaningUp.current = false;
    }
  }, [cleanupWebSocket, generationState.status]);

  // Initialize AudioRecord
  useEffect(() => {
    const initAudio = async () => {
      const hasPermission = await checkPermission();
      if (!hasPermission) {
        handleGenerationError('Microphone permission is required');
        return;
      }
      
      console.log('Initializing AudioRecord with options:', options);
      try {
        AudioRecord.init(options);
        console.log('AudioRecord initialized successfully');
      } catch (error) {
        console.error('AudioRecord initialization failed:', error);
        handleGenerationError('Failed to initialize audio recording');
      }
    };

    initAudio();
    
    return () => {
      console.log('Component unmounting, stopping AudioRecord');
      AudioRecord.stop();
    };
  }, [handleGenerationError]);

  // Clean up when component unmounts
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // We don't need to watch generationState.status anymore
  // VoiceRoomContext should only be concerned with its own state

  // Create a ref to track if we're actively recording
  const isActivelyRecording = useRef(false);
  
  // Set up audio data listener
  useEffect(() => {
    // Setup audio data handler
    const handleAudioData = (data) => {
      // Only process data if we're actively recording
      if (!isActivelyRecording.current) return;
      
      console.log(`Audio data received, data length: ${data.length}`);
      
      // Decode base64 once
      const binaryString = atob(data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // If WebSocket is open, send immediately, otherwise buffer
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(bytes.buffer);
      } else {
        audioBuffer.current.push(bytes.buffer);
      }
      
      // Calculate volume from PCM data
      const pcmData = new Int16Array(bytes.buffer);
      let sum = 0;
      for (let i = 0; i < pcmData.length; i++) {
        sum += Math.abs(pcmData[i]);
      }
      const average = sum / pcmData.length;
      const normalizedVolume = Math.min(average / 32768, 1);
      
      console.log(`Setting volume to ${normalizedVolume.toFixed(3)}`);
      dispatch({ type: ACTIONS.SET_VOLUME, payload: normalizedVolume });
    };
    
    console.log('Adding audio data listener');
    AudioRecord.on('data', handleAudioData);
    
    return () => {
      console.log('Removing audio data listener');
      // Check if removeListener exists before calling it
      if (AudioRecord && typeof AudioRecord.removeListener === 'function') {
        AudioRecord.removeListener('data', handleAudioData);
      } else {
        console.warn('AudioRecord.removeListener is not available');
      }
    };
  }, []);

  // Start recording function - decoupled from GenerationContext
  const startRecording = useCallback(async (options) => {
    const { 
      onTranscription, 
      onError, 
      selectedLanguage, 
      componentHistory, 
      currentHistoryIndex, 
      checkApiKeys 
    } = options;
    
    if (isStartingRecording.current || state.isConnecting) {
      console.log('Already connecting or recording');
      return;
    }

    isStartingRecording.current = true;
    isActivelyRecording.current = true;
    
    try {
      console.log('Starting recording flow...');

      // Check API keys BEFORE starting any recording
      const { ultravoxKey } = checkApiKeys();
      if (!ultravoxKey) {
        throw new Error('Please set your Ultravox and OpenRouter API keys in settings');
      }
      
      // Start audio recording directly
      AudioRecord.start();
      console.log('AudioRecord.start() called');

      // Create a new AbortController for this recording session
      const controller = new AbortController();

      dispatch({ type: ACTIONS.SET_CONNECTING, payload: true });

      // Get the analysis prompt
      const messages = analysisPrompt({ 
        text: '', // Empty since we're starting voice recording
        requestHistory: componentHistory?.map(entry => entry.request) || [],
        currentParams: currentHistoryIndex >= 0 ? componentHistory[currentHistoryIndex]?.params : null
      });

      const MAX_CALL_DURATION_SECONDS = 60; // 1 minute
      const response = await fetch('https://api.ultravox.ai/api/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': ultravoxKey
        },
        body: JSON.stringify({
          model: 'fixie-ai/ultravox',
          languageHint: selectedLanguage || 'en',
          initialMessages: [
            {
              role: 'MESSAGE_ROLE_AGENT',
              text: messages[0].content
            },
            {
              role: 'MESSAGE_ROLE_USER',
              text: messages[1].content
            }
          ],
          initialOutputMedium: 'MESSAGE_MEDIUM_TEXT',
          medium: { 
            serverWebSocket: {
              inputSampleRate: 16000,
              outputSampleRate: 16000
            }
          },
          firstSpeaker: 'FIRST_SPEAKER_USER',
          transcriptOptional: false,
          recordingEnabled: false,
          maxDuration: MAX_CALL_DURATION_SECONDS
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ultravox API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to create call: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const { joinUrl } = await response.json();
      cleanupWebSocket(); // Only cleanup WebSocket before creating a new one
      const wsInstance = new WebSocket(joinUrl);
      ws.current = wsInstance;
      
      wsInstance.onopen = () => {
        console.log('WebSocket opened with ID:', wsInstance.url.split('/').pop());
        dispatch({ type: ACTIONS.SET_CONNECTING, payload: false });
  
        // Only proceed if this is still the active WebSocket
        if (ws.current === wsInstance) {
          // Send buffered audio
          while (audioBuffer.current.length > 0) {
            const buffer = audioBuffer.current.shift();
            if (wsInstance.readyState === WebSocket.OPEN) {
              wsInstance.send(buffer);
            }
          }
        }
      };

      let accumulatedJson = '';
      
      wsInstance.onmessage = (event) => {
        // Only process messages if this is still the active WebSocket
        if (ws.current !== wsInstance) {
          console.log('Skipping message - WebSocket no longer active');
          return;
        }
        
        if (wsInstance.readyState !== WebSocket.OPEN) {
          console.log('Skipping message - WebSocket not open');
          return;
        }

        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          return;
        }
        
        // Only log non-audio messages
        if (msg.type !== 'audio') {
          if (msg.final) {
            console.log(`<< FINAL ${msg.role}: ${msg.text}`);
          } else if (msg.delta) {
            console.log(`<< ${msg.role}: ${msg.delta}`);
          }
        }

        // Handle agent transcripts
        if (msg.type === "transcript" && msg.role === "agent") {
          // Accumulate JSON text
          if (msg.text) {
            accumulatedJson = msg.text;
          } else if (msg.delta) {
            accumulatedJson += msg.delta;
          }

          // Only try parsing if we have some JSON structure
          if (accumulatedJson.includes('"transcription"')) {
            try {
              // Clean the JSON text before parsing
              const cleanedJson = cleanJsonText(accumulatedJson);
              
              // Try to parse partial JSON
              const partialResult = parse(cleanedJson, STR | OBJ);
              if (partialResult?.transcription) {
                console.log('Setting partial results:', partialResult.transcription);
                dispatch({ type: ACTIONS.SET_PARTIAL_RESULTS, payload: partialResult.transcription });
              }
            } catch (error) {
              // Ignore parsing errors for partial JSON
              console.debug('Partial JSON parse error:', error);
            }
          }

          // Handle final message
          if (msg.final && accumulatedJson) {
            try {
              // Clean the JSON text before parsing
              const jsonToProcess = cleanJsonText(accumulatedJson);
        
              // Use partial JSON parser instead of manual fixing
              const analysis = parse(jsonToProcess, STR | OBJ);
        
              // Validate required fields
              if (!analysis.transcription) {
                throw new Error('Missing transcription field in response');
              }
        
              // Only process if this WebSocket is still active
              if (ws.current === wsInstance) {
                // Explicitly close the WebSocket first to prevent more messages
                console.log('Received final analysis, closing WebSocket connection');
                cleanupWebSocket();
          
                // Set transcribed text directly in the context
                setTranscribedText(analysis.transcription);
                onTranscription?.(analysis);
          
                // Now update the state
                stopGenerationRecording(analysis.transcription);
              }
            } catch (error) {
              console.error('Error parsing final transcript:', error);
              console.error('Raw JSON:', accumulatedJson);
              if (ws.current === wsInstance) {
                onError?.('Failed to parse transcript');
                stopRecording();
              }
            }
            // Reset accumulated JSON
            accumulatedJson = '';
          }
        }
      };

      wsInstance.onerror = (error) => {
        console.error('WebSocket error:', {
          error,
          errorStack: error.stack || new Error().stack,
          wsState: wsInstance.readyState,
          wsUrl: wsInstance.url
        });
        
        // Only handle error if this is still the active WebSocket
        if (ws.current === wsInstance && generationState.status === 'RECORDING') {
          console.log('WebSocket error triggering stopRecording');
          onError?.('Connection error');
          stopRecording();
        }
      };

      wsInstance.onclose = (event) => {
        console.log('WebSocket connection closed with code:', event.code, 'reason:', event.reason);
  
        // Only handle close if this is still the active WebSocket
        if (ws.current === wsInstance && generationState.status === 'RECORDING') {
          console.log('WebSocket close triggering cleanup while recording is active');
          cleanup();
          stopGenerationRecording(); // Update generation context
        }
      };
    } catch (error) {
      console.error('Error starting recording:', error);
      onError?.(error.message);
      cleanup();
    } finally {
      isStartingRecording.current = false;
    }
  }, [
    state.isConnecting, 
    cleanupWebSocket, 
    cleanup, 
    setTranscribedText
  ]);

  // Stop recording function - decoupled from GenerationContext
  const stopRecording = useCallback(() => {
    console.log('stopRecording called');
    
    // Set recording state to false
    isActivelyRecording.current = false;
    
    // Always clean up WebSocket resources
    cleanup();
    
  }, [cleanup]);

  // Cancel recording function - simplified
  const cancelRecording = useCallback(() => {
    console.log('cancelRecording called');
    
    // Use a ref to track if cancellation is in progress
    if (isCancelling.current) {
      console.log('Cancellation already in progress, skipping');
      return;
    }
    
    isCancelling.current = true;
    
    try {
      // Set recording state to false
      isActivelyRecording.current = false;
      
      // Clean up resources
      cleanup();
    } finally {
      isCancelling.current = false;
    }
    
    console.log('Recording canceled');
  }, [cleanup]);

  // Reset function
  const reset = useCallback(() => {
    dispatch({ type: ACTIONS.RESET });
  }, []);

  // Memoize the context value to prevent unnecessary renders
  const contextValue = useMemo(() => ({
    state: {
      volume: state.volume,
      partialResults: state.partialResults,
      isConnecting: state.isConnecting
    },
    startRecording,
    stopRecording,
    cancelRecording,
    reset
  }), [
    state.volume,
    state.partialResults,
    state.isConnecting,
    startRecording,
    stopRecording,
    cancelRecording,
    reset
  ]);

  return (
    <VoiceRoomContext.Provider value={contextValue}>
      {children}
    </VoiceRoomContext.Provider>
  );
}

/**
 * Hook to use the voice room functionality
 */
export function useVoiceRoom() {
  const context = useContext(VoiceRoomContext);
  if (!context) {
    throw new Error('useVoiceRoom must be used within a VoiceRoomProvider');
  }
  return context;
}
