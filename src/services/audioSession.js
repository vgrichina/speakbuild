/**
 * AudioSession.js
 * 
 * A singleton service that manages audio recording and WebSocket connections for voice input.
 * Provides direct callback interface for all events instead of React state management.
 */
import AudioRecord from 'react-native-audio-record';
import { PERMISSIONS, request, check, RESULTS } from 'react-native-permissions';
import { Platform } from 'react-native';
import { parse, STR, OBJ } from 'partial-json';

// Audio recording options
const options = {
  sampleRate: 16000,
  channels: 1,
  bitsPerSample: 16,
  audioSource: 6,
  wavFile: 'audio.wav'
};

// Helper function to clean JSON text
const cleanJsonText = (text) => {
  return text.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
};

// Constants
const FINAL_RESPONSE_TIMEOUT_MS = 5000; // 5 seconds to wait for final response after stopping

class AudioSessionSingleton {
  constructor() {
    // State tracking
    this.active = false;
    this.mode = 'ptt'; // 'ptt' or 'call'
    
    // Mutable state
    this.ws = null;
    this.audioBuffer = [];
    this.isCleaningUp = false;
    this.isStartingRecording = false;
    this.audioSubscription = null;
    this.accumulatedJson = '';
    this.stopping = false;
    this.stopTimeoutId = null;
    this.serverListening = false; // Flag to track server "listening" state
    this.transcript = null; // Track if we've received a transcript
    
    // Throttling timestamps
    this.lastVolumeUpdateTime = 0;
    this.lastPartialResultsUpdateTime = 0;
    this.VOLUME_UPDATE_INTERVAL = 100; // 100ms
    this.PARTIAL_RESULTS_UPDATE_INTERVAL = 300; // 300ms
    
    // Callbacks
    this.callbacks = {
      volumeChange: null,
      partialTranscript: null,
      finalTranscript: null,
      error: null
    };

    // Initialize audio
    this.initAudio();
  }

  /**
   * Initialize audio recording capabilities
   */
  async initAudio() {
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      console.error('Microphone permission not granted');
      return;
    }
    
    try {
      AudioRecord.init(options);
      console.log('AudioRecord initialized successfully');
    } catch (error) {
      console.error('AudioRecord initialization failed:', error);
    }
  }

  /**
   * Check microphone permission
   */
  async checkPermission() {
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
  }

  /**
   * Handle audio data from the microphone
   */
  handleAudioData = (data) => {
    if (!this.active) return;
    
    // Track when voice data is received
    const startTime = Date.now();
    
    // Decode base64 once
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Calculate volume from PCM data
    const pcmData = new Int16Array(bytes.buffer);
    let sum = 0;
    for (let i = 0; i < pcmData.length; i++) {
      sum += Math.abs(pcmData[i]);
    }
    const average = sum / pcmData.length;
    const normalizedVolume = Math.min(average / 32768, 1);
    
    // If WebSocket is open AND server is in listening state, send immediately, otherwise buffer
    let wsStatus;
    
    if (this.ws?.readyState === WebSocket.OPEN && this.serverListening) {
      this.ws.send(bytes.buffer);
      wsStatus = 'sent';
    } else {
      const wsState = this.ws ? `ws:${this.ws.readyState}` : 'ws:null';
      const listeningState = this.serverListening ? 'listening:yes' : 'listening:no';
      this.audioBuffer.push(bytes.buffer);
      wsStatus = `buffered:${this.audioBuffer.length} ${wsState} ${listeningState}`;
    }
    
    // Direct throttling for volume updates based on time
    const now = Date.now();
    let volumeUpdated = false;
    if (now - this.lastVolumeUpdateTime >= this.VOLUME_UPDATE_INTERVAL) {
      if (this.callbacks.volumeChange) {
        this.callbacks.volumeChange(normalizedVolume);
        volumeUpdated = true;
      }
      this.lastVolumeUpdateTime = now;
    }
    
    // Consolidated log message with all relevant info
    const processingTime = Date.now() - startTime;
    if (volumeUpdated) {
      console.log(`[VOICE_DATA] Audio chunk: length=${data.length}, ${wsStatus}, vol=${normalizedVolume.toFixed(3)}, time=${processingTime}ms`);
    } else {
      console.log(`[VOICE_DATA] Audio chunk: length=${data.length}, ${wsStatus}, time=${processingTime}ms`);
    }
  }

  /**
   * Define a no-op audio listener for when we want to disable audio processing
   */
  noopAudioListener = () => {
    // Do nothing, just a placeholder
    console.log('No-op audio listener called - ignoring data');
  }

  /**
   * Clean up WebSocket connection
   */
  cleanupWebSocket() {
    console.log('Cleaning up WebSocket...');
  
    // Get the current WebSocket and immediately set the ref to null
    // This acts as a lock to prevent multiple cleanup attempts on the same instance
    const currentWs = this.ws;
    this.ws = null;
  
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
  }

  /**
   * Main cleanup function
   * @param {Object} options - Cleanup options
   * @param {Function} options.onCleanupComplete - Optional callback when cleanup is complete
   */
  cleanup(options = {}) {
    console.log('CLEANUP: Function called, isCleaningUp =', this.isCleaningUp);
    
    if (this.isCleaningUp) {
      console.log('CLEANUP: Already in progress, skipping');
      return;
    }
    
    this.isCleaningUp = true;
    const { onCleanupComplete } = options;
    
    try {
      // Clear any pending stop timeout
      if (this.stopTimeoutId) {
        console.log('CLEANUP: Clearing pending stop timeout');
        clearTimeout(this.stopTimeoutId);
        this.stopTimeoutId = null;
      }
      
      console.log('CLEANUP: Starting full cleanup of audio session...');
      this.cleanupWebSocket();
      console.log('CLEANUP: WebSocket cleaned up, now stopping AudioRecord');
      AudioRecord.stop();
      console.log('CLEANUP: AudioRecord.stop() called successfully');
      
      // Replace the active listener with our no-op listener
      if (this.audioSubscription) {
        console.log('CLEANUP: Replacing audio data listener with no-op');
        AudioRecord.on('data', this.noopAudioListener);
        this.audioSubscription = null;
        console.log('CLEANUP: Audio listener replaced and ref cleared');
      } else {
        console.log('CLEANUP: No audio subscription to clean up');
      }
      
      console.log('CLEANUP: Reset state');
      this.active = false;
      this.stopping = false;
      this.audioBuffer = [];
      this.accumulatedJson = '';
      this.serverListening = false; // Reset server listening state
      this.transcript = null; // Reset transcript tracking
      if (this.callbacks.volumeChange) {
        this.callbacks.volumeChange(0);
      }
      
      // Volume was already reset above
      
      console.log('CLEANUP: Cleanup complete');
      
      // Execute completion callback if provided
      if (typeof onCleanupComplete === 'function') {
        onCleanupComplete();
      }
    } catch (error) {
      console.error('CLEANUP ERROR:', error);
    } finally {
      this.isCleaningUp = false;
      console.log('CLEANUP: Reset isCleaningUp flag to false');
    }
  }

  /**
   * Start audio session with mode and callbacks
   * @param {Object} options - Configuration options
   * @param {string} options.mode - 'ptt' or 'call'
   * @param {Function} options.onVolumeChange - Callback for volume updates
   * @param {Function} options.onPartialTranscript - Callback for partial transcript updates
   * @param {Function} options.onFinalTranscript - Callback for final transcript
   * @param {Function} options.onError - Callback for errors
   * @param {string} options.selectedLanguage - Language code
   * @param {Object} options.apiKeys - API keys object
   * @param {string} options.apiKeys.ultravox - Ultravox API key
   * @param {string} options.apiKeys.openrouter - OpenRouter API key
   * @param {Object[]} options.analysisPrompt - Analysis prompt messages
   */
  async start(options) {
    console.log('[AUDIO_SESSION] Start called with mode:', options.mode);
    const { 
      mode = 'ptt',
      onVolumeChange = null,
      onPartialTranscript = null,
      onFinalTranscript = null,
      onError = null,
      selectedLanguage = 'en',
      apiKeys = {},
      analysisPrompt = []
    } = options;
    
    // Extract required API keys
    const ultravoxKey = apiKeys?.ultravox;
    const openrouterKey = apiKeys?.openrouter;
    
    // Validate API keys
    if (!ultravoxKey || !openrouterKey) {
      const error = new Error('Please set your Ultravox and OpenRouter API keys in settings');
      if (onError) onError(error);
      return null;
    }
    
    if (this.isStartingRecording || this.active) {
      console.log('Already recording or starting');
      return null;
    }
    
    this.isStartingRecording = true;
    
    try {
      // Set up callback references
      this.callbacks = {
        volumeChange: onVolumeChange,
        partialTranscript: onPartialTranscript,
        finalTranscript: onFinalTranscript,
        error: onError
      };
      
      // Set session state
      this.mode = mode;
      this.active = true;
      
      // Start audio recording
      AudioRecord.start();
      console.log('AudioRecord.start() called');
      
      // Set up the audio data listener
      console.log('Adding audio data listener');
      this.audioSubscription = AudioRecord.on('data', this.handleAudioData);
      
      // Initialize session state
      if (onVolumeChange) onVolumeChange(0);
      if (onPartialTranscript) onPartialTranscript('');
      
      // Create Ultravox call
      const MAX_CALL_DURATION_SECONDS = 60; // 1 minute
      const response = await fetch('https://api.ultravox.ai/api/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': ultravoxKey
        },
        body: JSON.stringify({
          model: 'fixie-ai/ultravox',
          languageHint: selectedLanguage,
          initialMessages: analysisPrompt.length > 0 ? [
            {
              role: 'MESSAGE_ROLE_AGENT',
              text: analysisPrompt[0].content
            },
            {
              role: 'MESSAGE_ROLE_USER',
              text: analysisPrompt[1].content
            }
          ] : [],
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
      console.log(`Creating WebSocket with URL: ${joinUrl}`);
      
      // Clean up any existing WebSocket
      this.cleanupWebSocket();
      
      // Create new WebSocket
      const wsInstance = new WebSocket(joinUrl);
      this.ws = wsInstance;
      
      // Flag to track if we've received the "listening" state from server
      this.serverListening = false;
      
      wsInstance.onopen = () => {
        const wsId = wsInstance.url.split('/').pop();
        console.log(`[AUDIO_SESSION] WebSocket opened with ID: ${wsId}`);
        
        // Only proceed if this is still the active WebSocket
        if (this.ws === wsInstance) {
          // Log that we're waiting for "listening" state before sending buffered audio
          const bufferSize = this.audioBuffer.length;
          if (bufferSize > 0) {
            console.log(`[AUDIO_SESSION] Holding ${bufferSize} buffered chunks until server sends "listening" state`);
          }
          
          // We'll send the buffer when we receive the "listening" state message
          // See the onmessage handler for this logic
        }
      };
      
      wsInstance.onmessage = (event) => {
        // Log raw message info immediately upon receipt, before any processing
        const wsId = wsInstance.url.split('/').pop();
        const dataLength = event.data?.length || 0;
        const preview = typeof event.data === 'string' 
          ? event.data.substring(0, 50).replace(/\n/g, '\\n') 
          : '[binary data]';
        console.log(`[WS_MESSAGE] Received msg: size=${dataLength}B, wsId=${wsId}, state=${wsInstance.readyState}, preview="${preview}${dataLength > 50 ? '...' : ''}"`);
        
        // Only process messages if this is still the active WebSocket
        if (this.ws !== wsInstance) {
          console.log('[WS_MESSAGE] Skipping - WebSocket no longer active');
          return;
        }
        
        // Allow messages in CLOSING state when in stopping mode
        if (wsInstance.readyState !== WebSocket.OPEN && 
            !(this.stopping && wsInstance.readyState === WebSocket.CLOSING)) {
          console.log(`[WS_MESSAGE] Skipping - WebSocket not open (state: ${wsInstance.readyState}, stopping: ${this.stopping})`);
          return;
        }
        
        let msg;
        try {
          msg = JSON.parse(event.data);
          console.log(`[WS_MESSAGE] Parsed type="${msg.type}" role="${msg.role || 'none'}" final=${!!msg.final}`);
          
          // Check for "listening" state message
          if (msg.type === "state" && msg.state === "listening" && !this.serverListening) {
            this.serverListening = true;
            console.log(`[AUDIO_SESSION] Server is now listening, can send buffered audio`);
            
            // Send buffered audio now that server is ready
            const bufferSize = this.audioBuffer.length;
            if (bufferSize > 0) {
              console.log(`[AUDIO_SESSION] Now sending ${bufferSize} buffered chunks to WebSocket ${wsId}`);
              
              let sentCount = 0;
              const startTime = Date.now();
              
              while (this.audioBuffer.length > 0) {
                const buffer = this.audioBuffer.shift();
                if (wsInstance.readyState === WebSocket.OPEN) {
                  wsInstance.send(buffer);
                  sentCount++;
                }
              }
              
              const elapsed = Date.now() - startTime;
              console.log(`[AUDIO_SESSION] Sent ${sentCount}/${bufferSize} buffered chunks in ${elapsed}ms to WebSocket ${wsId}`);
            }
          }
        } catch (error) {
          console.error('[WS_MESSAGE] Failed to parse:', error);
          return;
        }
        
        // Handle agent transcripts
        if (msg.type === "transcript" && msg.role === "agent") {
          // Process transcription data
          // Accumulate JSON text
          if (msg.text) {
            // Full replacement
            this.accumulatedJson = msg.text;
            console.log(`[TRANSCRIPTION] Chunk  >> ${msg.role}: "${msg.text.substring(0, 20)}${msg.text.length > 20 ? '...' : ''}"`);
          } else if (msg.delta) {
            // Format the chunk to escape special characters for better log readability
            const chunkDisplay = msg.delta.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
            
            // Add the delta to accumulated JSON
            this.accumulatedJson += msg.delta;
            
            console.log(`[TRANSCRIPTION] Chunk  >> ${msg.role}: "${chunkDisplay}"`);
          }
          
          // Only try parsing if we have some JSON structure
          if (this.accumulatedJson.includes('"transcription"')) {
            try {
              // Clean the JSON text before parsing
              const cleanedJson = cleanJsonText(this.accumulatedJson);
              
              // Try to parse partial JSON
              const startParse = Date.now();
              const partialResult = parse(cleanedJson, STR | OBJ);
              const parseTime = Date.now() - startParse;
              
              if (partialResult?.transcription) {
                // Only update partial results if it's changed AND enough time has passed
                const now = Date.now();
                const contentChanged = partialResult.transcription !== this.lastPartialText;
                const timeElapsed = now - this.lastPartialResultsUpdateTime >= this.PARTIAL_RESULTS_UPDATE_INTERVAL;
                
                if (contentChanged && timeElapsed) {
                  // Only log when actually updating
                  console.log('[TRANSCRIPTION] Setting partial results:', partialResult.transcription);
                  if (this.callbacks.partialTranscript) {
                    this.callbacks.partialTranscript(partialResult.transcription);
                    this.lastPartialText = partialResult.transcription;
                  }
                  this.lastPartialResultsUpdateTime = now;
                }
              }
            } catch (error) {
              // Ignore parsing errors for partial JSON but log them
              console.debug('[TRANSCRIPTION] Partial JSON parse error:', error);
            }
          }
          
          // Handle final message
          if (msg.final && this.accumulatedJson) {
            console.log(`[FINAL_TRANSCRIPT] Processing final message, JSON length=${this.accumulatedJson.length}`);
            const finalProcessingStart = Date.now();
            
            try {
              // Clean the JSON text before parsing
              const jsonToProcess = cleanJsonText(this.accumulatedJson);
              
              // Use partial JSON parser instead of manual fixing
              const parseStart = Date.now();
              const analysis = parse(jsonToProcess, STR | OBJ);
              const parseTime = Date.now() - parseStart;
              
              // Validate required fields
              if (!analysis.transcription) {
                throw new Error('Missing transcription field in response');
              }
              
              // Create a detailed log of the analysis
              const transcriptText = analysis.transcription;
              const intent = analysis.intent || 'none';
              const paramsCount = Object.keys(analysis.params || {}).length;
              
              // Format parameters as a compact JSON string
              const paramsStr = JSON.stringify(analysis.params || {});
              const widgetUrl = analysis.widgetUrl || "none";
              
              // Create a single comprehensive log line with all details
              console.log(`[FINAL_TRANSCRIPT] intent="${intent}" widgetUrl="${widgetUrl}" params=${paramsStr} text="${transcriptText}"`);
              
              
              // Only process if this WebSocket is still active or in stopping state
              if (this.ws === wsInstance) {
                console.log('[FINAL_TRANSCRIPT] Received final analysis, calling onFinalTranscript FIRST');
                
                // IMPORTANT: Call the transcription callback BEFORE cleanup
                // This ensures the component generation process starts before WebSocket is closed
                if (this.callbacks.finalTranscript) {
                  console.log(`[FINAL_TRANSCRIPT] Invoking finalTranscript callback with analysis (${Date.now() - finalProcessingStart}ms since start)`);
                  // Set our transcript flag to indicate we received valid transcript
                  this.transcript = analysis.transcription;
                  this.callbacks.finalTranscript(analysis);
                }
                
                // After transcription is processed, then clean up
                console.log('Transcription processed, now performing cleanup');
                
                // Clear any pending timeout since we got our final response
                if (this.stopTimeoutId) {
                  console.log('Clearing stop timeout as final response received');
                  clearTimeout(this.stopTimeoutId);
                  this.stopTimeoutId = null;
                }
                
                // If we were in stopping state, complete the WebSocket closure now
                if (this.stopping && this.ws) {
                  console.log('Final response received while in stopping state, closing WebSocket');
                  try {
                    this.ws.close(1000, "Final response received");
                  } catch (err) {
                    console.error('Error closing WebSocket after final response:', err);
                  }
                } else {
                  // Normal flow, just stop
                  this.stop();
                }
              }
            } catch (error) {
              console.error('Error parsing final transcript:', error);
              console.error('Raw JSON:', this.accumulatedJson);
              if (this.ws === wsInstance) {
                if (this.callbacks.error) {
                  this.callbacks.error(new Error('Failed to parse transcript'));
                }
                
                // Still need to stop even on error
                if (this.stopping) {
                  // Close immediately if we were waiting for this
                  if (this.ws) {
                    try {
                      this.ws.close(1000, "Error in final response");
                    } catch (err) {
                      console.error('Error closing WebSocket after parsing error:', err);
                    }
                  }
                } else {
                  this.stop();
                }
              }
            }
            // Reset accumulated JSON
            this.accumulatedJson = '';
          }
        }
      };
      
      wsInstance.onerror = (error) => {
        const wsId = wsInstance.url.split('/').pop();
        console.error(`[WS_ERROR] WebSocket error for wsId=${wsId}, state=${wsInstance.readyState}, stopping=${this.stopping}, cleaning=${this.isCleaningUp}`, {
          error,
          errorStack: error.stack || new Error().stack
        });
        
        // Only handle error if this is still the active WebSocket
        if (this.ws === wsInstance) {
          // Only treat as an error if not already in stopping/cleanup state
          if (!this.stopping && !this.isCleaningUp) {
            console.log(`[WS_ERROR] Error during active connection, wsId=${wsId} - triggering error state`);
            if (this.callbacks.error) {
              this.callbacks.error(new Error('Connection error'));
            }
          } else {
            console.log(`[WS_ERROR] Error during normal cleanup, wsId=${wsId} - ignoring`);
          }
          this.stop();
        }
      };
      
      wsInstance.onclose = (event) => {
        const wsId = wsInstance.url.split('/').pop();
        console.log(`[WS_CLOSE] WebSocket closed: wsId=${wsId}, code=${event.code}, reason="${event.reason}", active=${this.active}, stopping=${this.stopping}`);
  
        // Only handle close if this is still the active WebSocket
        if (this.ws === wsInstance) {
          if (this.active) {
            console.log(`[WS_CLOSE] Closed while recording active (wsId=${wsId}) - cleaning up session`);
            this.cleanup();
          } else {
            console.log(`[WS_CLOSE] Closed while not active (wsId=${wsId}) - no additional cleanup needed`);
          }
          
          // Always clear the WebSocket reference on close
          // Only do this if we haven't already done it in cleanup()
          if (this.ws === wsInstance) {
            console.log(`[WS_CLOSE] Clearing WebSocket reference in onclose for wsId=${wsId}`);
            this.ws = null;
          }
        }
      };
      
      // Return controller object
      return {
        stop: () => this.stop(),
        isActive: () => this.active,
        getMode: () => this.mode
      };
    } catch (error) {
      console.error('Error starting audio session:', error);
      if (this.callbacks.error) {
        this.callbacks.error(error);
      }
      this.cleanup();
      return null;
    } finally {
      this.isStartingRecording = false;
    }
  }

  /**
   * Stop audio recording and WebSocket connection
   * @param {boolean} forceImmediateCleanup - If true, don't wait for final response
   */
  stop(forceImmediateCleanup = false) {
    console.log(`[AUDIO_SESSION] Stop called with isActive=${this.active}, forceImmediate=${forceImmediateCleanup}`);
    
    if (!this.active) {
      console.log('[AUDIO_SESSION] Already stopped');
      return;
    }
    
    if (forceImmediateCleanup) {
      console.log('[AUDIO_SESSION] Force immediate cleanup requested');
      this.cleanup();
      return;
    }
    
    if (this.ws) {
      console.log('[AUDIO_SESSION] Active WebSocket found, waiting for final response');
      
      // Set a state flag to indicate we're in stopping state
      // but don't close the WebSocket immediately
      this.stopping = true;
      
      // Stop recording audio but keep WebSocket open
      if (this.audioSubscription) {
        console.log('[AUDIO_SESSION] Stopping audio recording but keeping WebSocket open');
        AudioRecord.stop();
        
        // Replace the active listener with our no-op listener
        AudioRecord.on('data', this.noopAudioListener);
        this.audioSubscription = null;
      }
      
      // Clear any existing timeout
      if (this.stopTimeoutId) {
        clearTimeout(this.stopTimeoutId);
      }
      
      // Set a timeout to force close after a delay if no final result arrives
      this.stopTimeoutId = setTimeout(() => {
        console.log(`[AUDIO_SESSION] Timeout of ${FINAL_RESPONSE_TIMEOUT_MS}ms reached, checking transcript status`);
        
        // First check if we already have a transcript - if so, don't trigger an error
        if (this.transcript) {
          console.log('[AUDIO_SESSION] Transcript was already received, ignoring timeout');
          // Just perform cleanup without triggering error
          if (this.stopping && this.ws) {
            try {
              // Only close if the WebSocket is still open
              if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close(1000, "Timeout after stopping - transcript already received");
                console.log('[AUDIO_SESSION] WebSocket close initiated after timeout (already had transcript)');
              } else {
                console.log('[AUDIO_SESSION] WebSocket already closed/closing, no action needed');
              }
            } catch (err) {
              console.error('[AUDIO_SESSION] Error closing WebSocket:', err);
              this.cleanup();
            }
          }
        } else if (this.stopping && this.ws) {
          // No transcript received, trigger error
          if (this.callbacks.error) {
            const timeoutError = new Error("No transcript received within timeout period");
            timeoutError.code = "TIMEOUT";
            console.log('[AUDIO_SESSION] Triggering error for timeout - no transcript received');
            this.callbacks.error(timeoutError);
          }
          
          try {
            // Only close if the WebSocket is still open
            if (this.ws.readyState === WebSocket.OPEN) {
              this.ws.close(1000, "Timeout after stopping");
              console.log('[AUDIO_SESSION] WebSocket close initiated after timeout');
            } else {
              console.log('[AUDIO_SESSION] WebSocket already closed/closing, no action needed');
            }
          } catch (err) {
            console.error('[AUDIO_SESSION] Error closing WebSocket:', err);
            this.cleanup();
          }
        }
      }, FINAL_RESPONSE_TIMEOUT_MS);
    } else {
      // No active WebSocket, clean up immediately
      console.log('[AUDIO_SESSION] No active WebSocket, calling cleanup() directly');
      this.cleanup();
    }
    
    console.log('[AUDIO_SESSION] Audio recording stopped, waiting for final response');
  }

  /**
   * Check if audio session is active
   */
  isActive() {
    return this.active;
  }

  /**
   * Get current mode (ptt or call)
   */
  getCurrentMode() {
    return this.mode;
  }
  
  /**
   * Set the audio session mode
   * @param {string} newMode - 'ptt' or 'call'
   */
  setMode(newMode) {
    if (this.mode === newMode) {
      console.log(`[AUDIO_SESSION] Already in ${newMode} mode, no action needed`);
      return;
    }
    
    if (!this.active) {
      console.log('[AUDIO_SESSION] No active session to set mode for');
      return;
    }
    
    console.log(`[AUDIO_SESSION] Setting audio session mode from ${this.mode} to ${newMode}`);
    this.mode = newMode;
    
    // For now, this is just a state change
    // In the future, we might need to send a mode change event to the server
  }
}

// Export singleton instance
export const audioSession = new AudioSessionSingleton();