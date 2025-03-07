/**
 * useAssistantState.js
 * 
 * Unified React hook that connects to the AssistantService and componentHistoryService.
 * Provides a single source of truth for all assistant and history state.
 * This combines functionality previously split between useAssistantState and useComponentHistory.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { AssistantService, ASSISTANT_STATUS, ASSISTANT_MODE } from '../services/assistantService';
import { componentHistoryService } from '../services/componentHistoryService';

export function useAssistantState() {
  // Initialize state from the service
  const [status, setStatus] = useState(AssistantService.getStatus());
  const [volume, setVolume] = useState(AssistantService.getVolume());
  const [transcript, setTranscript] = useState(AssistantService.getTranscript());
  const [partialTranscript, setPartialTranscript] = useState(AssistantService.getPartialTranscript());
  const [error, setError] = useState(AssistantService.getError());
  const [callActive, setCallActive] = useState(AssistantService.isCallActive());
  const [callStartTime, setCallStartTime] = useState(AssistantService.getCallStartTime());
  const [responseStream, setResponseStream] = useState(AssistantService.getResponseStream());
  const [componentHistory, setComponentHistory] = useState(AssistantService.getComponentHistory());
  
  // Set up subscriptions to state changes
  useEffect(() => {
    // Subscribe to individual state properties
    const statusUnsub = AssistantService.on('status', setStatus);
    const volumeUnsub = AssistantService.on('volume', setVolume);
    const transcriptUnsub = AssistantService.on('transcript', setTranscript);
    const partialTranscriptUnsub = AssistantService.on('partialTranscript', setPartialTranscript);
    const errorUnsub = AssistantService.on('error', setError);
    const callStartTimeUnsub = AssistantService.on('callStartTime', setCallStartTime);
    const responseStreamUnsub = AssistantService.on('responseStream', setResponseStream);
    
    // Subscribe to component history changes
    const historyUnsub = AssistantService.on('historyChange', setComponentHistory);
    
    // Subscribe to mode changes for callActive
    const modeUnsub = AssistantService.on('mode', () => {
      setCallActive(AssistantService.isCallActive());
    });
    
    // Create an interval to keep callActive in sync
    const interval = setInterval(() => {
      setCallActive(AssistantService.isCallActive());
    }, 1000);
    
    // Cleanup subscriptions
    return () => {
      statusUnsub();
      volumeUnsub();
      transcriptUnsub();
      partialTranscriptUnsub();
      errorUnsub();
      callStartTimeUnsub();
      responseStreamUnsub();
      historyUnsub();
      modeUnsub();
      clearInterval(interval);
    };
  }, []);
  
  // Create memoized action methods
  const startPTT = useCallback(() => AssistantService.startPTT(), []);
  const stopPTT = useCallback(() => AssistantService.stopPTT(), []);
  const toggleCallMode = useCallback(() => AssistantService.toggleCallMode(), []);
  const abortGeneration = useCallback(() => AssistantService.abortGeneration(), []);
  const retry = useCallback(() => AssistantService.retry(), []);
  
  // History navigation methods
  const navigateBack = useCallback(() => AssistantService.navigateBack(), []);
  const navigateForward = useCallback(() => AssistantService.navigateForward(), []);
  const setHistoryIndex = useCallback((index) => AssistantService.setHistoryIndex(index), []);
  
  // Use a single state object for current history data
  // This reduces the number of React state updates and potential race conditions
  const [historyState, setHistoryState] = useState({
    currentIndex: componentHistoryService.getState().currentIndex,
    current: componentHistoryService.getCurrent()
  });

  // Memoize the component data from the current history entry
  const currentComponent = useMemo(() => {
    const current = componentHistoryService.getCurrent();
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

  // Listen for history index changes
  useEffect(() => {
    // Use a single handler to update all history-related state at once
    const handleHistoryChange = (index) => {
      setHistoryState({
        currentIndex: index,
        current: componentHistoryService.getCurrent()
      });
    };
    
    const unsubscribe = componentHistoryService.onIndexChange(handleHistoryChange);
    return unsubscribe;
  }, []);

  // Additional component history methods from componentHistoryService
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

  // Get current conversation
  const current = useMemo(() => componentHistoryService.getCurrent(), [historyState.current]);
  
  // Return unified hook interface
  return {
    // Assistant state
    status,
    volume,
    transcript,
    partialTranscript,
    error,
    callActive,
    callStartTime,
    responseStream,
    componentHistory,
    
    // History state
    currentHistoryIndex: historyState.currentIndex,
    currentComponent,
    current,
    activeConversationId: componentHistoryService.getState().activeConversationId,
    history: componentHistoryService.getState().history,
    
    // Assistant actions
    startPTT,
    stopPTT,
    toggleCallMode,
    abortGeneration,
    retry,
    
    // History navigation 
    navigateBack,
    navigateForward,
    setHistoryIndex,
    goBack: navigateBack,       // Aliases for compatibility with useComponentHistory
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
  };
}