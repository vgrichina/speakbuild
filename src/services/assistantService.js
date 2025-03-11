/**
 * AssistantService.js
 * 
 * Core service for voice assistant functionality.
 * Manages state and coordinates between AudioSession and ComponentGeneration.
 * Uses EventEmitter pattern for UI updates instead of React state.
 */
import { audioSession } from './audioSession';
import { createComponentGeneration } from './componentGeneration';
import { analysisPrompt, analyzeRequest } from './analysis';
import { getApiKeys, getSettings } from './settings';
import { EventEmitter } from './eventEmitter';
import { componentHistoryService } from './componentHistoryService';

// Status and mode constants
export const ASSISTANT_STATUS = {
  IDLE: 'idle',
  LISTENING: 'listening',
  THINKING: 'thinking',     // Intermediate state waiting for final transcript
  PROCESSING: 'processing', // Component generation in progress
  ERROR: 'error'
};

export const ASSISTANT_MODE = {
  PTT: 'ptt',
  CALL: 'call'
};

class AssistantServiceClass extends EventEmitter {
  constructor() {
    super();
    
    // State
    this._state = {
      status: ASSISTANT_STATUS.IDLE,
      mode: ASSISTANT_MODE.PTT,
      volume: 0,
      transcript: '',
      partialTranscript: '',
      error: null,
      callStartTime: null,
      responseStream: ''
    };
    
    // Private properties
    this._currentGeneration = null;
  }
  
  // Getters
  getStatus() { return this._state.status; }
  getMode() { return this._state.mode; }
  getVolume() { return this._state.volume; }
  getTranscript() { return this._state.transcript; }
  getPartialTranscript() { return this._state.partialTranscript; }
  getError() { return this._state.error; }
  getCallStartTime() { return this._state.callStartTime; }
  getResponseStream() { return this._state.responseStream; }
  getComponentHistory() { return componentHistoryService.getState().history; }
  getCurrentComponent() { return componentHistoryService.getCurrent(); }
  getCurrentHistoryIndex() { return componentHistoryService.getState().currentIndex; }
  isCallActive() { return this._state.mode === ASSISTANT_MODE.CALL && audioSession.isActive(); }
  
  // State update methods
  _setState(updates) {
    const oldState = { ...this._state };
    this._state = { ...this._state, ...updates };
    
    // Single consolidated state log with all details
    const stateDetails = [];
    
    // Add current status (not transition)
    stateDetails.push(`status:'${updates.status || oldState.status}'`);
    
    // Add property-specific details
    if (updates.transcript && oldState.transcript !== updates.transcript) {
      stateDetails.push(`transcript:${updates.transcript.length}B`);
    }
    
    if (updates.partialTranscript && oldState.partialTranscript !== updates.partialTranscript) {
      stateDetails.push(`partial:${updates.partialTranscript.length}B`);
    }
    
    if (updates.responseStream && oldState.responseStream !== updates.responseStream) {
      const addedLength = updates.responseStream.length - oldState.responseStream.length;
      stateDetails.push(`stream:+${addedLength}/${updates.responseStream.length}B`);
    }
    
    // Include full changed properties list
    stateDetails.push(`props:[${Object.keys(updates).join(',')}]`);
    
    // Log single line with all details
    console.log(`[ASSISTANT_STATE] Update  ${stateDetails.join(', ')}`);
    
    // Keep status change log for better visibility of state transitions
    if (updates.status && oldState.status !== updates.status) {
      console.log(`[ASSISTANT_STATE] Status  ${oldState.status} → ${updates.status}`);
    }
    
    // Emit events for each changed property
    Object.keys(updates).forEach(key => {
      if (oldState[key] !== this._state[key]) {
        this.emit(key, this._state[key]);
      }
    });
    
    // Always emit a general state change event
    this.emit('stateChange', this._state);
  }
  
  // Removed configure method - using getSettings() directly
  
  // Audio handlers
  _handleVolumeChange = (volume) => {
    this._setState({ volume });
  }
  
  _handlePartialTranscript = (text) => {
    this._setState({ partialTranscript: text });
  }
  
  /**
   * Start component generation with the given analysis
   * Extracted to a separate method for reuse
   */
  _startComponentGeneration(analysis) {
    console.log('Starting component generation with analysis:', analysis);
    
    // Get API keys
    const apiKeys = getApiKeys();
    if (!apiKeys.openrouter) {
      this._setState({
        error: new Error('OpenRouter API key is required'),
        status: ASSISTANT_STATUS.ERROR
      });
      return;
    }
    
    // If we're in the middle of history navigation, log this for debugging
    const historyState = componentHistoryService.getState();
    if (historyState.currentIndex < historyState.history.length - 1) {
      console.log(`[ASSISTANT] Generating new component while at history index ${historyState.currentIndex} of ${historyState.history.length - 1}`);
    }
    
    // Start component generation
    const generation = createComponentGeneration(analysis, {
      onStart: () => {
        // Transition from THINKING to PROCESSING when generation actually starts
        this._setState({ status: ASSISTANT_STATUS.PROCESSING });
      },
      onProgress: (content) => {
        // Use _setState to ensure proper state update and UI notification
        this._setState({ 
          responseStream: this._state.responseStream + content 
        });
      },
      onComplete: (result) => {
        console.log('Component generation complete:', result);
        
        // Add to history with both component and analysis data
        componentHistoryService.addToHistory(result, analysis);
        
        // Update state
        this._setState({
          status: ASSISTANT_STATUS.IDLE,
        });
        
        this.emit('historyChange', this.getComponentHistory());
        
        // Continue listening in call mode
        if (this._state.mode === ASSISTANT_MODE.CALL && audioSession.isActive()) {
          this._setState({ status: ASSISTANT_STATUS.LISTENING });
        }
      },
      onError: (err) => {
        console.error('Component generation error:', err);
        this._setState({
          error: err,
          status: ASSISTANT_STATUS.ERROR
        });
      },
      selectedModel: getSettings().selectedModel,
      apiKey: apiKeys.openrouter
    });
    
    // Store current generation
    this._currentGeneration = generation;
    
    // Start generation
    generation.start().catch(err => {
      console.error('Error starting generation:', err);
    });
  }
  
  _handleFinalTranscript = (analysis) => {
    console.log('Final transcript received:', analysis);
    
    // Make sure we're in THINKING state regardless of how we got here
    // This handles cases where we might be in IDLE due to call ending
    if (this._state.status !== ASSISTANT_STATUS.THINKING) {
      console.log('[ASSISTANT] Transitioning to THINKING state for transcript processing');
      this._setState({
        status: ASSISTANT_STATUS.THINKING
      });
    }
    
    // Update state with transcript
    this._setState({
      transcript: analysis.transcription,
      partialTranscript: '',
      responseStream: ''
    });
    
    // Start component generation
    this._startComponentGeneration(analysis);
  }
  
  /**
   * Handle session status events from the audio session
   * Uses a more granular event-based communication pattern
   */
  _handleSessionStatus = (statusEvent) => {
    console.log(`[ASSISTANT] Received session status event: ${statusEvent.type}, detail: ${statusEvent.detail}`);
    
    switch (statusEvent.type) {
      case 'timeout':
        // Handle different timeout situations
        if (statusEvent.detail === 'with_transcript') {
          console.log('[ASSISTANT] Timeout with transcript received - checking current state');
          
          // If we're already processing, stay in that state - WebSocket is already closed
          if (this._state.status === ASSISTANT_STATUS.PROCESSING) {
            console.log('[ASSISTANT] Component generation in progress, maintaining PROCESSING state');
            // No state change needed - just log
          } else if (this._state.status === ASSISTANT_STATUS.THINKING) {
            console.log('[ASSISTANT] In THINKING state, maintaining for transcript processing');
            // No state change needed - processing will continue
          } else {
            // In other states, go to IDLE since we have a transcript but aren't processing
            console.log('[ASSISTANT] Timeout with transcript, but not processing - transitioning to IDLE');
            this._setState({
              status: ASSISTANT_STATUS.IDLE,
              volume: 0
            });
          }
        } else {
          // No transcript received - actual timeout error case
          console.log('[ASSISTANT] Timeout with no transcript - transitioning to IDLE state');
          this._setState({
            status: ASSISTANT_STATUS.IDLE,
            error: null,
            volume: 0
          });
        }
        break;
        
      case 'activity':
        // Just log activity events - they don't affect state
        console.log(`[ASSISTANT] Audio session activity: ${statusEvent.detail}`);
        break;
        
      case 'extended_timeout_reached':
        // Handle reaching an extended timeout - depends on presence of transcript
        if (statusEvent.detail === 'with_transcript') {
          console.log('[ASSISTANT] Extended timeout with transcript - continuing normally');
          // No state change needed if we have a transcript
        } else {
          console.log('[ASSISTANT] Extended timeout with no transcript - transitioning to IDLE');
          this._setState({
            status: ASSISTANT_STATUS.IDLE,
            error: null,
            volume: 0
          });
        }
        break;
        
      default:
        console.log(`[ASSISTANT] Unknown session status event type: ${statusEvent.type}`);
    }
  }
  
  /**
   * Legacy error handler for backward compatibility
   * New code should use session status events instead
   */
  _handleAudioError = (err) => {
    console.error('[ASSISTANT] Audio session error:', err);
    
    if (err.code === "TIMEOUT") {
      console.log('[ASSISTANT] Handling timeout error - returning to IDLE state');
      // For timeout errors, go back to IDLE state
      this._setState({
        status: ASSISTANT_STATUS.IDLE,
        error: null,
        volume: 0
      });
    } else {
      // For other errors, show the error state
      this._setState({
        error: err,
        status: ASSISTANT_STATUS.ERROR
      });
    }
  }
  
  
  /**
   * Process text input from keyboard
   * @param {string} text - The text input from the user
   * @returns {Promise<boolean>} - Whether the processing started successfully
   */
  async processTextInput(text) {
    if (!text.trim()) return false;
    
    console.log('[ASSISTANT] Processing text input:', text);
    
    // Get API keys
    const apiKeys = getApiKeys();
    if (!apiKeys.openrouter) {
      this._setState({
        error: new Error('OpenRouter API key is required for text analysis'),
        status: ASSISTANT_STATUS.ERROR
      });
      return false;
    }
    
    // Set state to thinking while we analyze
    // Show the text as a partial transcript during analysis
    this._setState({
      status: ASSISTANT_STATUS.THINKING,
      transcript: '',
      partialTranscript: text,
      responseStream: ''
    });
    
    try {
      // Get request history for context
      const history = componentHistoryService.getState().history;
      const currentIndex = componentHistoryService.getState().currentIndex;
      const currentParams = componentHistoryService.getCurrent()?.component?.params;
      
      // Create abort controller for the request
      const controller = new AbortController();
      
      // Analyze the text input using the existing analyzeRequest function
      const analysis = await analyzeRequest(
        text,
        controller,
        history,
        currentIndex,
        currentParams,
        apiKeys.openrouter
      );
      
      // Add source property to indicate this came from keyboard
      analysis.source = 'keyboard';
      analysis.confidence = 1.0;
      
      console.log('[ASSISTANT] Text analysis complete:', analysis);
      
      // Update transcript with the analyzed text
      this._setState({
        transcript: analysis.transcription || text,
        partialTranscript: ''
      });
      
      // Start component generation with the analysis
      this._startComponentGeneration(analysis);
      return true;
    } catch (error) {
      console.error('[ASSISTANT] Error processing text input:', error);
      this._setState({
        error,
        status: ASSISTANT_STATUS.ERROR
      });
      return false;
    }
  }
  
  // Public API
  /**
   * Start recording audio without committing to a specific mode
   * @returns {Object} Session metadata including timestamp
   */
  async startRecording() {
    // Prevent starting if already active
    if (this._state.status === ASSISTANT_STATUS.LISTENING || 
        this._state.status === ASSISTANT_STATUS.PROCESSING) {
      console.log('[ASSISTANT] Already listening or processing');
      return { success: false };
    }
    
    // Get API keys
    const apiKeys = getApiKeys();
    if (!apiKeys.ultravox || !apiKeys.openrouter) {
      this._setState({
        error: new Error('API keys are required'),
        status: ASSISTANT_STATUS.ERROR
      });
      return { success: false };
    }
    
    console.log('[ASSISTANT] Starting recording session');
    this._setState({
      status: ASSISTANT_STATUS.LISTENING,
      mode: ASSISTANT_MODE.PTT, // Default to PTT initially
      error: null,
      partialTranscript: ''
    });
    
    // Get analysis prompt
    const messages = analysisPrompt({ 
      text: '', 
      requestHistory: this.getComponentHistory()?.map(entry => entry.transcript || '').slice(0, 5) || []
    });
    
    // Start audio session
    const session = await audioSession.start({
      mode: ASSISTANT_MODE.PTT, // Default to PTT initially
      onVolumeChange: this._handleVolumeChange,
      onPartialTranscript: this._handlePartialTranscript,
      onFinalTranscript: this._handleFinalTranscript,
      onError: this._handleAudioError,
      onSessionStatus: this._handleSessionStatus, // New event-based communication
      selectedLanguage: getSettings().selectedLanguage,
      apiKeys,
      analysisPrompt: messages
    });
    
    if (!session) {
      console.error('[ASSISTANT] Failed to start audio session');
      this._setState({ status: ASSISTANT_STATUS.IDLE });
      return { success: false };
    }
    
    return {
      success: true,
      timestamp: Date.now()
    };
  }
  
  /**
   * Set recording mode (PTT or call)
   * @param {string} mode - The mode to set (ASSISTANT_MODE.PTT or ASSISTANT_MODE.CALL)
   */
  setMode(mode) {
    if (!audioSession.isActive()) {
      console.log('[ASSISTANT] No active session to set mode for');
      return false;
    }
    
    if (mode === ASSISTANT_MODE.CALL) {
      console.log('[ASSISTANT] Setting mode to call');
      audioSession.setMode(ASSISTANT_MODE.CALL);
      this._setState({
        mode: ASSISTANT_MODE.CALL,
        callStartTime: Date.now()
      });
    } else if (mode === ASSISTANT_MODE.PTT) {
      console.log('[ASSISTANT] Setting mode to PTT');
      audioSession.setMode(ASSISTANT_MODE.PTT);
      this._setState({
        mode: ASSISTANT_MODE.PTT,
        callStartTime: null
      });
    } else {
      console.error('[ASSISTANT] Invalid mode:', mode);
      return false;
    }
    
    return true;
  }
  
  
  /**
   * Stop recording audio and transition to THINKING state
   */
  stopRecording() {
    if (this._state.status === ASSISTANT_STATUS.LISTENING && audioSession.isActive()) {
      console.log('[ASSISTANT] Stopping recording, transitioning to THINKING state');
      
      // Transition directly to THINKING state - shows user we're waiting for server response
      this._setState({
        status: ASSISTANT_STATUS.THINKING,
        partialTranscript: '',
        volume: 0
      });
      
      // Standard flow - wait for final transcript callback
      audioSession.stop();
    }
  }
  
  /**
   * End call mode if active
   */
  endCall() {
    if (this._state.mode === ASSISTANT_MODE.CALL && audioSession.isActive()) {
      console.log('[ASSISTANT] Ending call');
      
      // Check current state to determine next state after ending call
      if (this._state.status === ASSISTANT_STATUS.PROCESSING) {
        // If we're already in PROCESSING state, preserve it but update other properties
        console.log('[ASSISTANT] Call ended during active component generation - preserving PROCESSING state');
        
        this._setState({
          callStartTime: null,
          mode: ASSISTANT_MODE.PTT,
          volume: 0
          // Maintain PROCESSING status to keep the ResponseStream visible
        });
      } else if (this._state.status === ASSISTANT_STATUS.THINKING) {
        // If we're in THINKING state, preserve it to allow the analysis to complete
        console.log('[ASSISTANT] Call ended during THINKING state - preserving state for analysis completion');
        
        this._setState({
          callStartTime: null,
          mode: ASSISTANT_MODE.PTT,
          volume: 0
          // Maintain THINKING status to allow analysis to complete
        });
      } else if (this._state.partialTranscript || this._state.transcript) {
        // If we have transcript data but not yet processing, transition to THINKING
        console.log('[ASSISTANT] Call ended with active transcript - transitioning to THINKING state');
        
        this._setState({
          callStartTime: null,
          mode: ASSISTANT_MODE.PTT,
          status: ASSISTANT_STATUS.THINKING,
          volume: 0
        });
      } else {
        // No transcript or processing in progress, go to IDLE
        console.log('[ASSISTANT] Call ended with no active processing - transitioning to IDLE state');
        
        this._setState({
          callStartTime: null,
          mode: ASSISTANT_MODE.PTT,
          status: ASSISTANT_STATUS.IDLE,
          volume: 0
        });
      }
      
      // Stop recording and wait for final response
      audioSession.stop();
      return true;
    }
    return false;
  }
  
  abortGeneration() {
    // Allow abortion in both THINKING and PROCESSING states
    if ((this._state.status === ASSISTANT_STATUS.THINKING || 
         this._state.status === ASSISTANT_STATUS.PROCESSING) && 
        this._currentGeneration) {
      console.log('Aborting generation');
      this._currentGeneration.abort();
      this._setState({ status: ASSISTANT_STATUS.IDLE });
      return true;
    }
    return false;
  }
  
  retry() {
    this._setState({
      error: null,
      status: ASSISTANT_STATUS.IDLE
    });
  }
  
  // History navigation methods
  navigateBack() {
    const success = componentHistoryService.goBack();
    if (success) {
      this.emit('historyChange', componentHistoryService.getState().history);
    }
    return success;
  }
  
  navigateForward() {
    const success = componentHistoryService.goForward();
    if (success) {
      this.emit('historyChange', componentHistoryService.getState().history);
    }
    return success;
  }
  
  setHistoryIndex(index) {
    const success = componentHistoryService.setCurrentIndex(index);
    if (success) {
      this.emit('historyChange', componentHistoryService.getState().history);
    }
    return success;
  }
  
  // Cleanup
  cleanup() {
    if (this._currentGeneration) {
      this._currentGeneration.abort();
      this._currentGeneration = null;
    }
    
    if (audioSession.isActive()) {
      if (this._state.status === ASSISTANT_STATUS.LISTENING) {
        // If we're cleaning up while still listening, transition to IDLE
        this._setState({
          status: ASSISTANT_STATUS.IDLE,
          volume: 0
        });
      }
      audioSession.stop();
    }
  }
}

// Export as singleton
export const AssistantService = new AssistantServiceClass();
