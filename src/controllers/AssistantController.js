/**
 * AssistantController.js
 *
 * Controller for coordinating between AudioSession and ComponentGeneration.
 * Provides state management and direct actions for UI components.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { audioSession } from '../services/audioSession';
import { createComponentGeneration, ComponentHistory } from '../services/componentGeneration';
import { analysisPrompt } from '../services/analysis';
import { getApiKeys, getSettings } from '../services/settings';

/**
 * Status states for the assistant
 */
const STATUS = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  ERROR: 'error'
};

/**
 * Modes for voice input
 */
const MODE = {
  PTT: 'ptt',
  CALL: 'call'
};

/**
 * Hook for controlling the voice assistant
 * @param {Object} options - Configuration options
 * @param {string} options.selectedModel - Model to use for generation
 * @param {string} options.selectedLanguage - Language for audio processing
 * @returns {Object} - Interface for controlling the assistant
 */
export function useAssistantController({
  selectedModel,
  selectedLanguage = 'en'
}) {
  // State
  const [status, setStatus] = useState(STATUS.IDLE);
  const [mode, setMode] = useState(MODE.PTT);
  const [volume, setVolume] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [error, setError] = useState(null);
  const [callStartTime, setCallStartTime] = useState(null);
  const [componentHistory, setComponentHistory] = useState([]);
  
  // Refs for mutable state
  const currentGeneration = useRef(null);
  const responseStream = useRef('');
  
  // Initialize component history
  useEffect(() => {
    // Set initial state from ComponentHistory
    setComponentHistory(ComponentHistory.getComponents());
  }, []);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Abort any active generation
      if (currentGeneration.current) {
        currentGeneration.current.abort();
      }
      
      // Stop any active audio session
      if (audioSession.isActive()) {
        audioSession.stop();
      }
    };
  }, []);
  
  /**
   * Handle volume change from audio session
   */
  const handleVolumeChange = useCallback((volume) => {
    setVolume(volume);
  }, []);
  
  /**
   * Handle partial transcript from audio session
   */
  const handlePartialTranscript = useCallback((text) => {
    setPartialTranscript(text);
  }, []);
  
  /**
   * Handle final transcript from audio session
   */
  const handleFinalTranscript = useCallback((analysis) => {
    console.log('Final transcript received:', analysis);
    
    // Update state with transcript
    setTranscript(analysis.transcription);
    setPartialTranscript('');
    setStatus(STATUS.PROCESSING);
    
    // Reset response stream
    responseStream.current = '';
    
    // Get API keys directly from settings service
    const apiKeys = getApiKeys();
    if (!apiKeys.openrouter) {
      setError(new Error('OpenRouter API key is required'));
      setStatus(STATUS.ERROR);
      return;
    }
    
    // Start component generation
    const generation = createComponentGeneration(analysis, {
      onProgress: (content) => {
        responseStream.current += content;
      },
      onComplete: (result) => {
        console.log('Component generation complete:', result);
        
        // Add to history with both component and analysis data
        const historyItem = ComponentHistory.addToHistory(result, analysis);
        
        // Update component history state
        setComponentHistory(ComponentHistory.getComponents());
        
        // Update state
        setStatus(STATUS.IDLE);
        
        // Continue listening in call mode
        if (mode === MODE.CALL && audioSession.isActive()) {
          setStatus(STATUS.LISTENING);
        }
      },
      onError: (err) => {
        console.error('Component generation error:', err);
        setError(err);
        setStatus(STATUS.ERROR);
      },
      selectedModel,
      apiKey: apiKeys.openrouter
    });
    
    // Store current generation
    currentGeneration.current = generation;
    
    // Start generation
    generation.start().catch(err => {
      console.error('Error starting generation:', err);
    });
  }, [mode, selectedModel]);
  
  /**
   * Handle audio session errors
   */
  const handleAudioError = useCallback((err) => {
    console.error('Audio session error:', err);
    setError(err);
    setStatus(STATUS.ERROR);
  }, []);
  
  /**
   * Start Push-to-Talk recording
   */
  const startPTT = useCallback(async () => {
    // Prevent starting if already active
    if (status === STATUS.LISTENING || status === STATUS.PROCESSING) {
      console.log('Already listening or processing');
      return;
    }
    
    // Get API keys directly from settings service
    const apiKeys = getApiKeys();
    if (!apiKeys.ultravox || !apiKeys.openrouter) {
      setError(new Error('API keys are required'));
      setStatus(STATUS.ERROR);
      return;
    }
    
    console.log('Starting PTT recording');
    setStatus(STATUS.LISTENING);
    setError(null);
    setPartialTranscript('');
    
    // Get analysis prompt
    const messages = analysisPrompt({ 
      text: '', 
      requestHistory: componentHistory?.map(entry => entry.transcription).slice(0, 5) || []
    });
    
    // Start audio session
    const session = await audioSession.start({
      mode: MODE.PTT,
      onVolumeChange: handleVolumeChange,
      onPartialTranscript: handlePartialTranscript,
      onFinalTranscript: handleFinalTranscript,
      onError: handleAudioError,
      selectedLanguage,
      apiKeys,
      analysisPrompt: messages
    });
    
    if (!session) {
      console.error('Failed to start audio session');
      setStatus(STATUS.IDLE);
    }
  }, [
    status,
    handleVolumeChange,
    handlePartialTranscript,
    handleFinalTranscript,
    handleAudioError,
    selectedLanguage,
    componentHistory
  ]);
  
  /**
   * Stop Push-to-Talk recording
   */
  const stopPTT = useCallback(() => {
    if (status === STATUS.LISTENING && audioSession.isActive()) {
      console.log('Stopping PTT recording');
      audioSession.stop();
    }
  }, [status]);
  
  /**
   * Toggle call mode (start or stop)
   */
  const toggleCallMode = useCallback(async () => {
    // If call is active, stop it
    if (mode === MODE.CALL && audioSession.isActive()) {
      console.log('Stopping call mode');
      audioSession.stop();
      setCallStartTime(null);
      setMode(MODE.PTT);
      setStatus(STATUS.IDLE);
      return;
    }
    
    // Start call mode
    console.log('Starting call mode');
    setMode(MODE.CALL);
    setStatus(STATUS.LISTENING);
    setError(null);
    setPartialTranscript('');
    
    // Get API keys directly from settings service
    const apiKeys = getApiKeys();
    if (!apiKeys.ultravox || !apiKeys.openrouter) {
      setError(new Error('API keys are required'));
      setStatus(STATUS.ERROR);
      return;
    }
    
    // Get analysis prompt
    const messages = analysisPrompt({ 
      text: '', 
      requestHistory: componentHistory?.map(entry => entry.transcription).slice(0, 5) || []
    });
    
    // Start audio session
    const session = await audioSession.start({
      mode: MODE.CALL,
      onVolumeChange: handleVolumeChange,
      onPartialTranscript: handlePartialTranscript,
      onFinalTranscript: handleFinalTranscript,
      onError: handleAudioError,
      selectedLanguage,
      apiKeys,
      analysisPrompt: messages
    });
    
    if (!session) {
      console.error('Failed to start call mode');
      setStatus(STATUS.IDLE);
      setMode(MODE.PTT);
    } else {
      setCallStartTime(Date.now());
    }
  }, [
    mode,
    getApiKeys,
    handleVolumeChange,
    handlePartialTranscript,
    handleFinalTranscript,
    handleAudioError,
    selectedLanguage,
    componentHistory
  ]);
  
  /**
   * Abort current generation
   */
  const abortGeneration = useCallback(() => {
    if (status === STATUS.PROCESSING && currentGeneration.current) {
      console.log('Aborting generation');
      currentGeneration.current.abort();
      setStatus(STATUS.IDLE);
      return true;
    }
    return false;
  }, [status]);
  
  /**
   * Retry after error
   */
  const retry = useCallback(() => {
    setError(null);
    setStatus(STATUS.IDLE);
  }, []);
  
  /**
   * Get current response stream text
   */
  const getResponseStream = useCallback(() => {
    return responseStream.current;
  }, []);
  
  // Return controller interface
  return {
    // State
    status,
    mode,
    volume,
    transcript,
    partialTranscript,
    error,
    callActive: mode === MODE.CALL && audioSession.isActive(),
    callStartTime,
    componentHistory,
    responseStream: getResponseStream(),
    
    // Actions
    startPTT,
    stopPTT,
    toggleCallMode,
    abortGeneration,
    retry,
    
    // Constants
    STATUS,
    MODE
  };
}