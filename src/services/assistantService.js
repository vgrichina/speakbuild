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
  getComponentHistory() { return componentHistoryService.getComponents(); }
  getCurrentComponent() { return componentHistoryService.getCurrentComponent(); }
  getCurrentHistoryIndex() { return componentHistoryService.getCurrentIndex(); }
  isCallActive() { return this._state.mode === ASSISTANT_MODE.CALL && audioSession.isActive(); }
  
  // State update methods
  _setState(updates) {
    const oldState = { ...this._state };
    this._state = { ...this._state, ...updates };
    
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
  
  _handleFinalTranscript = (analysis) => {
    console.log('Final transcript received:', analysis);
    
    // Update state with transcript - first set to THINKING
    this._setState({
      transcript: analysis.transcription,
      partialTranscript: '',
      status: ASSISTANT_STATUS.THINKING,
      responseStream: ''
    });
    
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
        this._state.responseStream += content;
        this.emit('responseStream', this._state.responseStream);
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
  
  _handleAudioError = (err) => {
    console.error('Audio session error:', err);
    this._setState({
      error: err,
      status: ASSISTANT_STATUS.ERROR
    });
  }
  
  // Public API
  async startPTT() {
    // Prevent starting if already active
    if (this._state.status === ASSISTANT_STATUS.LISTENING || 
        this._state.status === ASSISTANT_STATUS.PROCESSING) {
      console.log('Already listening or processing');
      return;
    }
    
    // Get API keys
    const apiKeys = getApiKeys();
    if (!apiKeys.ultravox || !apiKeys.openrouter) {
      this._setState({
        error: new Error('API keys are required'),
        status: ASSISTANT_STATUS.ERROR
      });
      return;
    }
    
    console.log('Starting PTT recording');
    this._setState({
      status: ASSISTANT_STATUS.LISTENING,
      error: null,
      partialTranscript: ''
    });
    
    // Get analysis prompt
    const messages = analysisPrompt({ 
      text: '', 
      requestHistory: this.getComponentHistory()?.map(entry => entry.transcription || entry.transcript).slice(0, 5) || []
    });
    
    // Start audio session
    const session = await audioSession.start({
      mode: ASSISTANT_MODE.PTT,
      onVolumeChange: this._handleVolumeChange,
      onPartialTranscript: this._handlePartialTranscript,
      onFinalTranscript: this._handleFinalTranscript,
      onError: this._handleAudioError,
      selectedLanguage: getSettings().selectedLanguage,
      apiKeys,
      analysisPrompt: messages
    });
    
    if (!session) {
      console.error('Failed to start audio session');
      this._setState({ status: ASSISTANT_STATUS.IDLE });
    }
  }
  
  stopPTT() {
    if (this._state.status === ASSISTANT_STATUS.LISTENING && audioSession.isActive()) {
      console.log('Stopping PTT recording');
      audioSession.stop();
    }
  }
  
  async toggleCallMode() {
    // If call is active, stop it
    if (this._state.mode === ASSISTANT_MODE.CALL && audioSession.isActive()) {
      console.log('Stopping call mode');
      audioSession.stop();
      this._setState({
        callStartTime: null,
        mode: ASSISTANT_MODE.PTT,
        status: ASSISTANT_STATUS.IDLE
      });
      return;
    }
    
    // Start call mode
    console.log('Starting call mode');
    this._setState({
      mode: ASSISTANT_MODE.CALL,
      status: ASSISTANT_STATUS.LISTENING,
      error: null,
      partialTranscript: ''
    });
    
    // Get API keys
    const apiKeys = getApiKeys();
    if (!apiKeys.ultravox || !apiKeys.openrouter) {
      this._setState({
        error: new Error('API keys are required'),
        status: ASSISTANT_STATUS.ERROR
      });
      return;
    }
    
    // Get analysis prompt
    const messages = analysisPrompt({ 
      text: '', 
      requestHistory: this.getComponentHistory()?.map(entry => entry.transcription || entry.transcript).slice(0, 5) || []
    });
    
    // Start audio session
    const session = await audioSession.start({
      mode: ASSISTANT_MODE.CALL,
      onVolumeChange: this._handleVolumeChange,
      onPartialTranscript: this._handlePartialTranscript,
      onFinalTranscript: this._handleFinalTranscript,
      onError: this._handleAudioError,
      selectedLanguage: getSettings().selectedLanguage,
      apiKeys,
      analysisPrompt: messages
    });
    
    if (!session) {
      console.error('Failed to start call mode');
      this._setState({
        status: ASSISTANT_STATUS.IDLE,
        mode: ASSISTANT_MODE.PTT
      });
    } else {
      this._setState({ callStartTime: Date.now() });
    }
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
    const success = componentHistoryService.back();
    if (success) {
      this.emit('historyChange', componentHistoryService.getComponents());
    }
    return success;
  }
  
  navigateForward() {
    const success = componentHistoryService.forward();
    if (success) {
      this.emit('historyChange', componentHistoryService.getComponents());
    }
    return success;
  }
  
  setHistoryIndex(index) {
    const success = componentHistoryService.setComponentIndex(index);
    if (success) {
      this.emit('historyChange', componentHistoryService.getComponents());
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
      audioSession.stop();
    }
  }
}

// Export as singleton
export const AssistantService = new AssistantServiceClass();