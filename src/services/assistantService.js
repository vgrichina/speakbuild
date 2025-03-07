/**
 * AssistantService.js
 * 
 * Core service for voice assistant functionality.
 * Manages state and coordinates between AudioSession and ComponentGeneration.
 * Uses EventEmitter pattern for UI updates instead of React state.
 */
import { audioSession } from './audioSession';
import { createComponentGeneration } from './componentGeneration';
import { analysisPrompt } from './analysis';
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
    
    // Log state changes
    console.log('[ASSISTANT_STATE] State update:', {
      oldStatus: oldState.status,
      newStatus: updates.status || oldState.status,
      changed: Object.keys(updates).join(', '),
      timestamp: new Date().toISOString()
    });
    
    // Detailed logging for specific state changes
    if (updates.status && oldState.status !== updates.status) {
      console.log(`[ASSISTANT_STATE] Status change: ${oldState.status} -> ${updates.status}`);
    }
    
    if (updates.transcript && oldState.transcript !== updates.transcript) {
      console.log(`[ASSISTANT_STATE] Transcript updated: length=${updates.transcript.length}`);
    }
    
    if (updates.partialTranscript && oldState.partialTranscript !== updates.partialTranscript) {
      console.log(`[ASSISTANT_STATE] Partial transcript updated: length=${updates.partialTranscript.length}`);
    }
    
    if (updates.responseStream && oldState.responseStream !== updates.responseStream) {
      const addedLength = updates.responseStream.length - oldState.responseStream.length;
      console.log(`[ASSISTANT_STATE] Response stream updated: added=${addedLength}, total=${updates.responseStream.length}`);
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
    
    // Update state with transcript - we're already in THINKING state,
    // just need to update the transcript and clear any response stream
    this._setState({
      transcript: analysis.transcription,
      partialTranscript: '',
      responseStream: ''
    });
    
    // Start component generation
    this._startComponentGeneration(analysis);
  }
  
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
      
      // Immediately transition to idle state
      this._setState({
        callStartTime: null,
        mode: ASSISTANT_MODE.PTT,
        status: ASSISTANT_STATUS.IDLE,
        volume: 0
      });
      
      // Stop recording - we go straight to IDLE for calls since there's
      // usually no final response expected when ending a call
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