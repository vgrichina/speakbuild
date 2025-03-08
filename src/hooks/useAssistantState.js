/**
 * useAssistantState.js
 * 
 * Unified React hook that connects to the AssistantService and componentHistoryService.
 * Acts as a thin adapter layer between services and React components.
 * Uses a single service state object instead of individual state values.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { AssistantService, ASSISTANT_STATUS, ASSISTANT_MODE } from '../services/assistantService';
import { componentHistoryService } from '../services/componentHistoryService';
import { audioSession } from '../services/audioSession';

export function useAssistantState() {
  // Use a single state object for AssistantService state
  const [assistantState, setAssistantState] = useState({
    status: AssistantService.getStatus(),
    mode: AssistantService.getMode(),
    volume: AssistantService.getVolume(),
    transcript: AssistantService.getTranscript(),
    partialTranscript: AssistantService.getPartialTranscript(),
    error: AssistantService.getError(),
    callStartTime: AssistantService.getCallStartTime(),
    responseStream: AssistantService.getResponseStream(),
    callActive: AssistantService.isCallActive()
  });

  // Use a single state object for ComponentHistoryService state
  const [historyState, setHistoryState] = useState({
    currentIndex: componentHistoryService.getState().currentIndex,
    current: componentHistoryService.getCurrent(),
    history: componentHistoryService.getState().history,
    activeConversationId: componentHistoryService.getState().activeConversationId
  });
  
  // Subscribe to AssistantService stateChange events
  useEffect(() => {
    // Subscribe to state changes from AssistantService
    const stateChangeUnsub = AssistantService.on('stateChange', (state) => {
      setAssistantState(prevState => ({
        ...prevState,
        status: state.status,
        mode: state.mode,
        volume: state.volume,
        transcript: state.transcript,
        partialTranscript: state.partialTranscript,
        error: state.error,
        callStartTime: state.callStartTime,
        responseStream: state.responseStream,
        callActive: state.mode === ASSISTANT_MODE.CALL && audioSession.isActive()
      }));
    });
    
    // Handle historyChange events
    const historyChangeUnsub = AssistantService.on('historyChange', (history) => {
      setHistoryState(prevState => ({
        ...prevState,
        history
      }));
    });
    
    // Create an interval to keep callActive in sync
    const interval = setInterval(() => {
      setAssistantState(prevState => ({
        ...prevState,
        callActive: AssistantService.isCallActive()
      }));
    }, 1000);
    
    // Cleanup subscriptions
    return () => {
      stateChangeUnsub();
      historyChangeUnsub();
      clearInterval(interval);
    };
  }, []);
  
  // Listen for history index changes
  useEffect(() => {
    // Update history state when the current index changes
    const handleIndexChange = (index) => {
      const historyServiceState = componentHistoryService.getState();
      setHistoryState({
        currentIndex: index,
        current: componentHistoryService.getCurrent(),
        history: historyServiceState.history,
        activeConversationId: historyServiceState.activeConversationId
      });
    };
    
    const unsubscribe = componentHistoryService.onIndexChange(handleIndexChange);
    return unsubscribe;
  }, []);

  // Memoized current component for convenience
  const currentComponent = useMemo(() => {
    const current = historyState.current;
    if (!current) return null;
    
    return {
      id: current.id,
      code: current.component?.code || '',
      transcription: current.transcript || '',
      intent: current.intent || '',
      params: current.component?.params || {},
      timestamp: current.timestamp
    };
  }, [historyState.current]);
  
  // Create memoized action methods
  // Assistant actions
  const startRecording = useCallback(() => AssistantService.startRecording(), []);
  const stopRecording = useCallback((options) => AssistantService.stopRecording(options), []);
  const setMode = useCallback((mode) => AssistantService.setMode(mode), []);
  const endCall = useCallback(() => AssistantService.endCall(), []);
  const abortGeneration = useCallback(() => AssistantService.abortGeneration(), []);
  const retry = useCallback(() => AssistantService.retry(), []);
  
  // History navigation methods
  const navigateBack = useCallback(() => AssistantService.navigateBack(), []);
  const navigateForward = useCallback(() => AssistantService.navigateForward(), []);
  const setHistoryIndex = useCallback((index) => AssistantService.setHistoryIndex(index), []);
  
  // Conversation management methods (directly from componentHistoryService)
  const switchConversation = useCallback((conversationId) => {
    componentHistoryService.switchConversation(conversationId);
  }, []);
  
  const createNewConversation = useCallback(() => {
    return componentHistoryService.createNewConversation();
  }, []);
  
  const clearHistory = useCallback(() => {
    componentHistoryService.clearHistory();
  }, []);
  
  const getAllConversations = useCallback(() => {
    return componentHistoryService.getAllConversations();
  }, []);
  
  const deleteConversation = useCallback((conversationId) => {
    componentHistoryService.deleteConversation(conversationId);
  }, []);
  
  const renameConversation = useCallback((conversationId, newTitle) => {
    componentHistoryService.renameConversation(conversationId, newTitle);
  }, []);
  
  // Add processAnalysis method
  const processAnalysis = useCallback((analysis) => {
    // Create a function to process text input similar to voice input
    console.log('Processing analysis from keyboard:', analysis);
    
    // Call the appropriate AssistantService method
    if (typeof AssistantService.processAnalysis === 'function') {
      AssistantService.processAnalysis(analysis);
    } else {
      // Fallback implementation if the method doesn't exist
      AssistantService.setTranscript(analysis.transcript);
      AssistantService._startComponentGeneration(analysis);
    }
  }, []);

  // Memoize the complete state object to avoid unnecessary re-renders
  // This ensures components only re-render when values they actually use change
  const hookState = useMemo(() => ({
    // Assistant state (destructured for component convenience)
    status: assistantState.status,
    volume: assistantState.volume,
    transcript: assistantState.transcript,
    partialTranscript: assistantState.partialTranscript,
    error: assistantState.error,
    callActive: assistantState.callActive,
    callStartTime: assistantState.callStartTime,
    responseStream: assistantState.responseStream,
    
    // History state
    currentHistoryIndex: historyState.currentIndex,
    currentComponent,
    current: historyState.current,
    history: historyState.history,
    activeConversationId: historyState.activeConversationId,
    
    // Assistant actions
    startRecording,
    stopRecording,
    setMode,
    endCall,
    abortGeneration,
    retry,
    processAnalysis,
    
    // History navigation 
    navigateBack,
    navigateForward,
    setHistoryIndex,
    goBack: navigateBack,       // Aliases for compatibility
    goForward: navigateForward,
    
    // Conversation management
    switchConversation,
    createNewConversation,
    clearHistory,
    getAllConversations,
    deleteConversation,
    renameConversation,
    
    // Constants
    STATUS: ASSISTANT_STATUS,
    MODE: ASSISTANT_MODE
  }), [
    // Dependency array with all values that should trigger a re-render
    assistantState.status,
    assistantState.volume,
    assistantState.transcript,
    assistantState.partialTranscript,
    assistantState.error,
    assistantState.callActive,
    assistantState.callStartTime,
    assistantState.responseStream,
    historyState.currentIndex,
    historyState.current,
    historyState.history,
    historyState.activeConversationId,
    currentComponent
    // Note: No need to include action functions in dependency array
    // since they're already memoized with useCallback
  ]);
  
  return hookState;
}
