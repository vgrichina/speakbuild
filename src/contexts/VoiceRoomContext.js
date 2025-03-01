import React, { createContext, useContext, useReducer, useRef, useState, useEffect, useCallback, useMemo } from 'react';
import AudioRecord from 'react-native-audio-record';
import { PERMISSIONS, request, check, RESULTS } from 'react-native-permissions';
import { Platform } from 'react-native';
import { storage, SETTINGS_KEY } from '../services/storage';
import { analysisPrompt } from '../services/analysis';
import { parse, STR, OBJ } from 'partial-json';

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
  isRecording: false,
  error: null
};

// Action types
const ACTIONS = {
  SET_VOLUME: 'SET_VOLUME',
  SET_PARTIAL_RESULTS: 'SET_PARTIAL_RESULTS',
  SET_CONNECTING: 'SET_CONNECTING',
  SET_RECORDING: 'SET_RECORDING',
  SET_ERROR: 'SET_ERROR',
  RESET: 'RESET',
};

// Reducer function
function voiceRoomReducer(state, action) {
  let newState;
  switch (action.type) {
    case ACTIONS.SET_VOLUME:
      return { ...state, volume: action.payload };
    case ACTIONS.SET_PARTIAL_RESULTS:
      return { ...state, partialResults: action.payload };
    case ACTIONS.SET_CONNECTING:
      newState = { ...state, isConnecting: action.payload };
      console.log(`[VoiceRoomReducer] SET_CONNECTING: ${action.payload}`);
      return newState;
    case ACTIONS.SET_RECORDING:
      newState = { ...state, isRecording: action.payload };
      console.log(`[VoiceRoomReducer] SET_RECORDING: ${action.payload}`);
      return newState;
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
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
  
  // Refs for mutable state that shouldn't trigger re-renders
  const ws = useRef(null);
  const audioBuffer = useRef([]);
  const isCleaningUp = useRef(false); // Used for both cleanup and cancellation
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
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Microphone permission is required' });
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
  }, []); // Removed state.isRecording from dependency array to prevent stale closure issues

  // Main cleanup function
  const cleanup = useCallback(() => {
    console.log('CLEANUP: Function called, isCleaningUp.current =', isCleaningUp.current);
    console.log('CLEANUP: Stack trace:', new Error().stack);
    
    if (isCleaningUp.current) {
      console.log('CLEANUP: Already in progress, skipping');
      return;
    }
    
    isCleaningUp.current = true;
    
    try {
      console.log('CLEANUP: Starting full cleanup of voice room...');
      cleanupWebSocket();
      console.log('CLEANUP: WebSocket cleaned up, now stopping AudioRecord');
      AudioRecord.stop();
      console.log('CLEANUP: AudioRecord.stop() called successfully');
      
      // Replace the active listener with our no-op listener
      if (audioSubscriptionRef.current) {
        console.log('CLEANUP: Replacing audio data listener with no-op');
        AudioRecord.on('data', noopAudioListener);
        audioSubscriptionRef.current = null;
        console.log('CLEANUP: Audio listener replaced and ref cleared');
      } else {
        console.log('CLEANUP: No audio subscription ref to clean up');
      }
      
      console.log('CLEANUP: Setting volume to 0');
      dispatch({ type: ACTIONS.SET_CONNECTING, payload: false });
      dispatch({ type: ACTIONS.SET_VOLUME, payload: 0 });
      audioBuffer.current = [];
      console.log('CLEANUP: Cleanup complete');
    } catch (error) {
      console.error('CLEANUP ERROR:', error);
    } finally {
      isCleaningUp.current = false;
      console.log('CLEANUP: Reset isCleaningUp flag to false');
    }
  }, [cleanupWebSocket]);

  // Initialize AudioRecord
  useEffect(() => {
    const initAudio = async () => {
      const hasPermission = await checkPermission();
      if (!hasPermission) {
        dispatch({ type: ACTIONS.SET_ERROR, payload: 'Microphone permission is required' });
        return;
      }
      
      console.log('Initializing AudioRecord with options:', options);
      try {
        AudioRecord.init(options);
        console.log('AudioRecord initialized successfully');
      } catch (error) {
        console.error('AudioRecord initialization failed:', error);
        dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to initialize audio recording' });
      }
    };

    initAudio();
    
    return () => {
      console.log('Component unmounting, stopping AudioRecord');
      AudioRecord.stop();
    };
  }, []);

  // Clean up when component unmounts
  useEffect(() => {
    return cleanup;
  }, []); // Empty dependency array since cleanup is only needed on unmount

  // Create a ref to store the audio subscription
  const audioSubscriptionRef = useRef(null);

  // Define a no-op function that does nothing when we want to disable audio processing
  const noopAudioListener = () => {
    // Do nothing, just a placeholder
    console.log('No-op audio listener called - ignoring data');
  };
  
  // Define the audio data handler function
  function handleAudioData(data) {
    console.log(`AUDIO: Data received, data length: ${data.length}`);
    
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
  }
  
  // Clean up audio subscription when component unmounts
  useEffect(() => {
    return () => {
      if (audioSubscriptionRef.current) {
        console.log('Removing audio data listener on unmount');
        audioSubscriptionRef.current.remove();
        audioSubscriptionRef.current = null;
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
    
    if (isStartingRecording.current || state.isRecording) {
      console.log('Already recording');
      return;
    }

    isStartingRecording.current = true;
    
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
      
      // Set up the audio data listener
      console.log('Adding audio data listener');
      audioSubscriptionRef.current = AudioRecord.on('data', handleAudioData);

      // Create a new AbortController for this recording session
      const controller = new AbortController();

      console.log(`[VoiceRoom] [${Date.now()}] Setting isRecording=true`);
      dispatch({ type: ACTIONS.SET_RECORDING, payload: true });

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
          maxDuration: `${MAX_CALL_DURATION_SECONDS}s`
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
      console.log(`[VoiceRoom] [${Date.now()}] Creating WebSocket with URL: ${joinUrl}`);
      cleanupWebSocket(); // Only cleanup WebSocket before creating a new one
      const wsInstance = new WebSocket(joinUrl);
      ws.current = wsInstance;
      console.log(`[VoiceRoom] [${Date.now()}] WebSocket created`);
      
      wsInstance.onopen = () => {
        console.log(`[VoiceRoom] [${Date.now()}] WebSocket opened with ID:`, wsInstance.url.split('/').pop());
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
                // Explicitly close the WebSocket and stop recording to prevent more messages
                console.log('Received final analysis, performing full cleanup');
                cleanup();
          
                // Call the transcription callback with the analysis
                onTranscription?.(analysis);
                
                // Update recording state
                dispatch({ type: ACTIONS.SET_RECORDING, payload: false });
              }
            } catch (error) {
              console.error('Error parsing final transcript:', error);
              console.error('Raw JSON:', accumulatedJson);
              if (ws.current === wsInstance) {
                dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to parse transcript' });
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
        if (ws.current === wsInstance) {
          console.log('WebSocket error triggering stopRecording');
          dispatch({ type: ACTIONS.SET_ERROR, payload: 'Connection error' });
          onError?.('Connection error');
          stopRecording();
        }
      };

      wsInstance.onclose = (event) => {
        console.log('WebSocket connection closed with code:', event.code, 'reason:', event.reason);
  
        // Only handle close if this is still the active WebSocket
        if (ws.current === wsInstance && state.isRecording) {
          console.log('WebSocket close triggering cleanup while recording is active');
          cleanup();
          dispatch({ type: ACTIONS.SET_RECORDING, payload: false });
        }
      };
    } catch (error) {
      console.error('Error starting recording:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      onError?.(error.message);
      
      // Clean up audio subscription if there's an error
      if (audioSubscriptionRef.current) {
        audioSubscriptionRef.current.remove();
        audioSubscriptionRef.current = null;
      }
      
      cleanup();
    } finally {
      isStartingRecording.current = false;
    }
  }, [
    cleanupWebSocket, 
    cleanup
  ]);

  // Stop recording function
  const stopRecording = useCallback(() => {
    console.log(`STOP_RECORDING: Called with isRecording=${state.isRecording}`);
    
    // Always clean up WebSocket resources
    console.log('STOP_RECORDING: Calling cleanup()');
    cleanup();
    
    // Update recording state
    console.log('STOP_RECORDING: Setting isRecording=false');
    dispatch({ type: ACTIONS.SET_RECORDING, payload: false });
    console.log('STOP_RECORDING: Complete');
    
  }, [cleanup, state.isRecording]);

  // Cancel recording function - simplified
  const cancelRecording = useCallback(() => {
    console.log('cancelRecording called');
    
    // Use isCleaningUp ref to track if cleanup/cancellation is in progress
    if (isCleaningUp.current) {
      console.log('Cleanup/cancellation already in progress, skipping');
      return;
    }
    
    // Just call cleanup directly - it already has the isCleaningUp guard
    cleanup();
    
    console.log('Recording canceled');
  }, [cleanup]);

  // Reset function
  const reset = useCallback(() => {
    dispatch({ type: ACTIONS.RESET });
    cleanup();
  }, [cleanup]);

  // Memoize the context value to prevent unnecessary renders
  const contextValue = useMemo(() => ({
    state: {
      volume: state.volume,
      partialResults: state.partialResults,
      isRecording: state.isRecording,
      error: state.error
    },
    startRecording,
    stopRecording,
    cancelRecording,
    reset
  }), [
    state.volume,
    state.partialResults,
    state.isConnecting,
    state.isRecording,
    state.error,
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
