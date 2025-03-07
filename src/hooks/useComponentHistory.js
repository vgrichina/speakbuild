/**
 * useComponentHistory.js
 * 
 * React hook that connects to the componentHistoryService.
 * Provides a thin layer between the service and React components.
 * This hook maintains compatibility with the old interface while
 * using the new unified history model internally.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { componentHistoryService } from '../services/componentHistoryService';

// Constants from service
const STATE_CHANGE = 'stateChange';
const CURRENT_CHANGE = 'currentChange';

export function useComponentHistory() {
  // Initialize state from the service
  const [state, setState] = useState(componentHistoryService.getState());
  const [current, setCurrent] = useState(componentHistoryService.getCurrent());
  
  // Subscribe to state changes
  useEffect(() => {
    // Set up subscriptions
    const stateUnsub = componentHistoryService.on(STATE_CHANGE, setState);
    const currentUnsub = componentHistoryService.on(CURRENT_CHANGE, setCurrent);
    
    // Cleanup subscriptions
    return () => {
      stateUnsub();
      currentUnsub();
    };
  }, []);
  
  // Create derived data for components using current model
  const currentComponent = useMemo(() => {
    if (!current) return null;
    
    return {
      id: current.id,
      code: current.component?.code || '',
      transcription: current.transcript || '',
      intent: current.intent || '',
      params: current.component?.params || {},
      timestamp: current.timestamp
    };
  }, [current]);
  
  // Create memoized action methods
  const addToHistory = useCallback((entry, analysis) => {
    // For backward compatibility, we might receive either a complete
    // component+analysis pair or just a component object
    if (analysis) {
      return componentHistoryService.addToHistory(entry, analysis);
    } else {
      // Legacy format with component data embedded
      return componentHistoryService.addToHistory(
        { code: entry.code, widgetUrl: entry.widgetUrl, params: entry.params },
        { transcription: entry.transcription, intent: entry.intent }
      );
    }
  }, []);
  
  const setCurrentIndex = useCallback((index) => {
    componentHistoryService.setCurrentIndex(index);
  }, []);
  
  const clearHistory = useCallback(() => {
    componentHistoryService.clearHistory();
  }, []);
  
  const switchConversation = useCallback((conversationId) => {
    componentHistoryService.switchConversation(conversationId);
  }, []);
  
  const createNewConversation = useCallback(() => {
    return componentHistoryService.createNewConversation();
  }, []);
  
  const goBack = useCallback(() => {
    componentHistoryService.goBack();
  }, []);
  
  const goForward = useCallback(() => {
    componentHistoryService.goForward();
  }, []);
  
  const getAllConversations = useCallback(() => {
    return componentHistoryService.getAllConversations();
  }, []);
  
  const deleteConversation = useCallback((conversationId) => {
    componentHistoryService.deleteConversation(conversationId);
  }, []);
  
  // Return hook interface - maintains compatibility with the old context API
  return {
    // State - using the full unified history
    history: state.history,
    currentIndex: state.currentIndex,
    activeConversationId: state.activeConversationId,
    // For compatibility, current now returns the full unified entry
    current,
    // For components that expect the old format
    currentComponent,
    
    // Actions
    addToHistory,
    setCurrentIndex,
    clearHistory,
    switchConversation,
    createNewConversation,
    goBack,
    goForward,
    getAllConversations,
    deleteConversation
  };
}