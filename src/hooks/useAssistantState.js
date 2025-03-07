/**
 * useAssistantState.js
 * 
 * React hook that connects to the AssistantService.
 * Provides a thin layer between the service and React components.
 */
import { useState, useEffect, useCallback } from 'react';
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
  
  // Get current history index
  const [currentHistoryIndex, setCurrentHistoryIndexState] = useState(componentHistoryService.getCurrentIndex());
  const [currentComponent, setCurrentComponent] = useState(componentHistoryService.getCurrentComponent());

  // Listen for history index changes
  useEffect(() => {
    const unsubscribe = componentHistoryService.onIndexChange((index) => {
      setCurrentHistoryIndexState(index);
      setCurrentComponent(componentHistoryService.getCurrentComponent());
    });
    return unsubscribe;
  }, []);

  // Return hook interface
  return {
    // State
    status,
    volume,
    transcript,
    partialTranscript,
    error,
    callActive,
    callStartTime,
    responseStream,
    componentHistory,
    currentHistoryIndex,
    currentComponent,
    
    // Actions
    startPTT,
    stopPTT,
    toggleCallMode,
    abortGeneration,
    retry,
    
    // History navigation
    navigateBack,
    navigateForward,
    setHistoryIndex,
    
    // Constants
    STATUS: ASSISTANT_STATUS,
    MODE: ASSISTANT_MODE
  };
}