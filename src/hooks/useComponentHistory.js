/**
 * useComponentHistory.js
 * 
 * React hook that connects to the componentHistoryService.
 * Provides a thin layer between the service and React components.
 */
import { useState, useEffect, useCallback } from 'react';
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
  
  // Create memoized action methods
  const addToHistory = useCallback((entry) => {
    componentHistoryService.addToHistory(entry);
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
  
  // Return hook interface - matches the old context API for easy migration
  return {
    // State
    history: state.history,
    currentIndex: state.currentIndex,
    activeConversationId: state.activeConversationId,
    current,
    
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