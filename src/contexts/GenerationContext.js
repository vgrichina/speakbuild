import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';

/**
 * @typedef {'IDLE'|'RECORDING'|'GENERATING'|'ERROR'} GenerationStatus
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
  switch (action.type) {
    case 'START_RECORDING':
      // Only allow starting recording from IDLE or ERROR state
      if (state.status !== 'IDLE' && state.status !== 'ERROR') return state;
      return { 
        ...state, 
        status: 'RECORDING', 
        error: undefined,
        transcribedText: '',
        responseStream: ''
      };
      
    case 'STOP_RECORDING':
      // Only allow stopping recording from RECORDING state
      if (state.status !== 'RECORDING') return state;
      return { 
        ...state, 
        status: 'GENERATING', 
        transcribedText: action.transcribedText 
      };
      
    case 'START_GENERATION':
      // Can start generation from IDLE or after RECORDING
      if (state.status !== 'IDLE' && state.status !== 'RECORDING') return state;
      return { 
        ...state, 
        status: 'GENERATING', 
        abortController: action.abortController,
        responseStream: '' 
      };
      
    case 'GENERATION_PROGRESS':
      if (state.status !== 'GENERATING') return state;
      return {
        ...state,
        responseStream: action.responseStream || state.responseStream + (action.responseChunk || '')
      };
      
    case 'GENERATION_COMPLETE':
      if (state.status !== 'GENERATING') return state;
      return { 
        ...state, 
        status: 'IDLE', 
        abortController: null 
      };
      
    case 'ABORT':
      // Abort any active controller
      if (state.abortController) {
        state.abortController.abort();
      }
      return { 
        ...state, 
        status: 'IDLE', 
        abortController: null 
      };
      
    case 'ERROR':
      return { 
        ...state, 
        status: 'ERROR', 
        error: action.error 
      };
      
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
      return initialState;
      
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
    // Additional logic for recording will be implemented in the hook consumer
  }, [dispatch]);
  
  const stopRecording = useCallback((transcribedText = '') => {
    dispatch({ type: 'STOP_RECORDING', transcribedText });
  }, [dispatch]);
  
  const createAbortController = useCallback(() => {
    const controller = new AbortController();
    return controller;
  }, []);
  
  const startGeneration = useCallback((abortController) => {
    dispatch({ type: 'START_GENERATION', abortController });
  }, [dispatch]);
  
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
    dispatch({ type: 'GENERATION_COMPLETE' });
  }, [dispatch]);
  
  const abortGeneration = useCallback(() => {
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
