import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { processWithClaudeStream } from '../services/processStream';

/**
 * @typedef {'IDLE'|'GENERATING'|'ERROR'} GenerationStatus
 * 
 * @typedef {Object} GenerationState
 * @property {GenerationStatus} status - Current state of the generation process
 * @property {string} [error] - Error message if status is ERROR
 * @property {string} transcribedText - Text transcribed from voice
 * @property {string} responseStream - Streaming response during generation
 * @property {AbortController} [abortController] - Controller to abort ongoing operations
 * @property {string} [modificationIntent] - Intent of the modification ('modify' or 'new')
 */

/**
 * @typedef {Object} GenerationAction
 * @property {string} type - Action type
 */

// Initial state for the generation reducer
const initialState = {
  status: 'IDLE',
  error: undefined,
  transcribedText: '',
  responseStream: '',
  abortController: null,
  modificationIntent: null
};

/**
 * Reducer for generation state machine
 * @param {GenerationState} state - Current state
 * @param {GenerationAction} action - Dispatched action
 * @returns {GenerationState} New state
 */
function generationReducer(state, action) {
  let newState;
  
  switch (action.type) {
    case 'START_RECORDING':
      // Only allow starting recording from IDLE or ERROR state
      if (state.status !== 'IDLE' && state.status !== 'ERROR') return state;
      newState = { 
        ...state, 
        status: 'IDLE', // We no longer track RECORDING state here
        error: undefined,
        transcribedText: '',
        responseStream: ''
      };
      console.log(`[GenerationReducer] START_RECORDING: status=${newState.status}`);
      return newState;
      
    case 'STOP_RECORDING':
      // Set transcribed text but don't change state
      newState = { 
        ...state, 
        transcribedText: action.transcribedText 
      };
      console.log(`GenerationContext: Set transcribed text: ${action.transcribedText}`);
      return newState;
      
    case 'START_GENERATION':
      // Can start generation from IDLE or after RECORDING
      if (state.status !== 'IDLE' && state.status !== 'RECORDING') return state;
      newState = { 
        ...state, 
        status: 'GENERATING', 
        abortController: action.abortController,
        responseStream: '' 
      };
      console.log(`[GenerationReducer] START_GENERATION: status=${newState.status}`);
      return newState;
      
    case 'GENERATION_PROGRESS':
      if (state.status !== 'GENERATING') return state;
      return {
        ...state,
        responseStream: action.responseStream || state.responseStream + (action.responseChunk || '')
      };
      
    case 'GENERATION_COMPLETE':
      if (state.status !== 'GENERATING') {
        console.log(`Ignoring GENERATION_COMPLETE - current status is ${state.status}`);
        return state;
      }
      newState = { 
        ...state, 
        status: 'IDLE', 
        abortController: null 
      };
      console.log(`GenerationContext: Status changed from ${state.status} to ${newState.status}`);
      return newState;
      
    case 'ABORT':
      // Abort any active controller
      if (state.abortController) {
        state.abortController.abort();
      }
      newState = { 
        ...state, 
        status: 'IDLE', 
        abortController: null 
      };
      console.log(`GenerationContext: Status changed from ${state.status} to ${newState.status} (ABORT)`);
      return newState;
      
    case 'ERROR':
      newState = { 
        ...state, 
        status: 'ERROR', 
        error: action.error 
      };
      console.log(`GenerationContext: Status changed from ${state.status} to ${newState.status}, error: ${action.error}`);
      return newState;
      
    case 'SET_TRANSCRIBED_TEXT':
      return {
        ...state,
        transcribedText: action.text
      };
      
    case 'SET_MODIFICATION_INTENT':
      return {
        ...state,
        modificationIntent: action.intent
      };
      
    case 'RESET':
      newState = initialState;
      console.log(`GenerationContext: Status reset from ${state.status} to ${newState.status}`);
      return newState;
      
    default:
      return state;
  }
}

// Create context
const GenerationContext = createContext(undefined);

/**
 * Provider component for generation state
 */
export function GenerationProvider({ children }) {
  const [state, dispatch] = useReducer(generationReducer, initialState);
  
  // Memoize the context value to prevent unnecessary renders
  const contextValue = useMemo(() => ({ state, dispatch }), [state]);
  
  return (
    <GenerationContext.Provider value={contextValue}>
      {children}
    </GenerationContext.Provider>
  );
}

/**
 * Hook to use the generation state machine
 * @returns {Object} Generation state and actions
 */
export function useGeneration() {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error('useGeneration must be used within a GenerationProvider');
  }
  
  const { state, dispatch } = context;
  
  const startRecording = useCallback(() => {
    dispatch({ type: 'START_RECORDING' });
  }, [dispatch]);
  
  const stopRecording = useCallback((transcribedText = '') => {
    dispatch({ type: 'STOP_RECORDING', transcribedText });
  }, [dispatch]);
  
  const createAbortController = useCallback(() => {
    const controller = new AbortController();
    return controller;
  }, []);
  
  const startGeneration = useCallback((abortController = null) => {
    console.log('GenerationContext: Setting state to GENERATING');
    
    // If no controller provided, create one
    if (!abortController) {
      abortController = createAbortController();
    }
    
    // Just update state to indicate generation has started
    dispatch({ type: 'START_GENERATION', abortController });
  }, [dispatch, createAbortController]);
  
  const updateGenerationProgress = useCallback((responseChunk) => {
    dispatch({ type: 'GENERATION_PROGRESS', responseChunk });
  }, [dispatch]);
  
  const setResponseStream = useCallback((responseStream) => {
    dispatch({ type: 'GENERATION_PROGRESS', responseStream });
  }, [dispatch]);
  
  const setTranscribedText = useCallback((text) => {
    dispatch({ type: 'SET_TRANSCRIBED_TEXT', text });
  }, [dispatch]);
  
  const setModificationIntent = useCallback((intent) => {
    dispatch({ type: 'SET_MODIFICATION_INTENT', intent });
  }, [dispatch]);
  
  const completeGeneration = useCallback(() => {
    console.log('completeGeneration called - transitioning to IDLE');
    dispatch({ type: 'GENERATION_COMPLETE' });
  }, [dispatch]);
  
  const abortGeneration = useCallback(() => {
    console.log('Explicitly aborting generation and resetting to IDLE state');
    dispatch({ type: 'ABORT' });
  }, [dispatch]);
  
  const handleError = useCallback((error) => {
    dispatch({ type: 'ERROR', error });
  }, [dispatch]);
  
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, [dispatch]);
  
  return {
    state,
    startRecording,
    stopRecording,
    createAbortController,
    startGeneration,
    updateGenerationProgress,
    setResponseStream,
    setTranscribedText,
    setModificationIntent,
    completeGeneration,
    abortGeneration,
    handleError,
    reset
  };
}
