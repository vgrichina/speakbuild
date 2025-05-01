/**
 * componentHistoryService.js
 * 
 * Service for managing unified component history and conversations
 * Uses a single unified history model where each entry contains both
 * transcription and component data in a conversation flow
 */
import { conversationStorage } from './conversationStorage';
import { widgetStorage } from './widgetStorage';

// Constants for event types
const STATE_CHANGE = 'stateChange';
const CURRENT_CHANGE = 'currentChange';
const INDEX_CHANGE = 'indexChange';
const HISTORY_CHANGE = 'historyChange';

// State management with unified history model
let state = {
  // Unified history array with transcription->component pairs
  history: [],
  // Current position in history
  currentIndex: -1,
  // Active conversation ID
  activeConversationId: null
};

// Listeners for state changes by event type
const listeners = {
  [STATE_CHANGE]: new Set(),
  [CURRENT_CHANGE]: new Set(),
  [INDEX_CHANGE]: new Set(),
  [HISTORY_CHANGE]: new Set()
};

export const componentHistoryService = {
  // Get current state
  getState() {
    return { ...state };
  },
  
  // Get current history entry
  getCurrent() {
    if (state.currentIndex >= 0 && state.currentIndex < state.history.length) {
      return state.history[state.currentIndex];
    }
    return null;
  },
  
  // Initialize service
  initialize() {
    // Get active conversation ID
    let activeId = conversationStorage.getActiveId();
    
    // If no active conversation, create one
    if (!activeId) {
      const newConversation = conversationStorage.create();
      activeId = newConversation.id;
    }
    
    // Load conversation history
    const conversationHistory = conversationStorage.getHistory(activeId);
    
    // Update state
    this.setState({
      history: conversationHistory,
      currentIndex: conversationHistory.length - 1,
      activeConversationId: activeId
    });
  },
  
  // Update state and notify listeners
  setState(newState) {
    const oldCurrent = this.getCurrent();
    state = { ...state, ...newState };
    
    // Notify all state change listeners
    this.notifyListeners(STATE_CHANGE, state);
    
    // Notify current change listeners if current changed
    const newCurrent = this.getCurrent();
    if (oldCurrent !== newCurrent) {
      this.notifyListeners(CURRENT_CHANGE, newCurrent);
    }
    
    // Save to persistent storage if needed
    if (state.activeConversationId && state.history.length > 0) {
      conversationStorage.saveHistory(state.activeConversationId, state.history);
    }
  },
  
  /**
   * Add a component to history with its analysis data
   * Creates a unified history entry with both transcription and component
   * 
   * @param {Object} component - Generated component result
   * @param {Object} analysis - Analysis with transcript and intent
   * @returns {Object} Unified history entry
   */
  addToHistory(component, analysis) {
    if (!component) return null;
    
    console.log('Adding to history:', { 
      component: component ? 'Present' : 'Missing',
      analysis: analysis ? 'Present' : 'Missing',
      transcription: analysis?.transcription || 'Missing',
      request: analysis?.request || 'Missing'
    });
    
    // Create a unified history item with ID
    const historyItem = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      // Component data
      component: {
        code: component.code,
        widgetUrl: analysis?.widgetUrl || component.widgetUrl,
        params: analysis?.params || component.params || {}
      },
      // Analysis data
      transcript: analysis?.transcription || analysis?.request || '',
      intent: analysis?.intent || 'new',
      // Metadata
      timestamp: Date.now()
    };
    
    console.log('Created history item with transcript:', historyItem.transcript);
    
    // Store in widgetStorage if we have a widgetUrl
    if (historyItem.component.widgetUrl) {
      widgetStorage.store(historyItem.component.widgetUrl, historyItem.component.code);
    }
    
    // Add to history array at current position (removing any forward history)
    const newHistory = [
      ...state.history.slice(0, state.currentIndex + 1),
      historyItem
    ];
    
    // Keep only the latest 50 items
    if (newHistory.length > 50) {
      newHistory.splice(0, newHistory.length - 50);
    }
    
    // Update state with new history and current index
    this.setState({
      history: newHistory,
      currentIndex: newHistory.length - 1
    });
    
    // Notify listeners
    this.notifyListeners(HISTORY_CHANGE, newHistory);
    this.notifyListeners(INDEX_CHANGE, newHistory.length - 1);
    
    return historyItem;
  },
  
  /**
   * Set the current index directly
   * @param {number} index - New index
   * @returns {boolean} Whether the operation was successful
   */
  setCurrentIndex(index) {
    if (index < 0 || index >= state.history.length) return false;
    
    this.setState({ currentIndex: index });
    this.notifyListeners(INDEX_CHANGE, index);
    return true;
  },
  
  /**
   * Navigate backward in history (to older items)
   * @returns {boolean} Whether navigation was successful
   */
  goBack() {
    if (state.currentIndex <= 0) return false;
    return this.setCurrentIndex(state.currentIndex - 1);
  },
  
  /**
   * Navigate forward in history (to newer items)
   * @returns {boolean} Whether navigation was successful
   */
  goForward() {
    if (state.currentIndex >= state.history.length - 1) return false;
    return this.setCurrentIndex(state.currentIndex + 1);
  },
  
  /**
   * Clear history
   */
  clearHistory() {
    widgetStorage.clear();
    
    // Create new conversation
    const newConversation = conversationStorage.create();
    
    this.setState({
      history: [],
      currentIndex: -1,
      activeConversationId: newConversation.id
    });
    
    this.notifyListeners(HISTORY_CHANGE, []);
    this.notifyListeners(INDEX_CHANGE, -1);
  },
  
  /**
   * Switch to a different conversation
   * @param {string} conversationId - ID of conversation to switch to
   */
  switchConversation(conversationId) {
    // Skip if already on this conversation
    if (state.activeConversationId === conversationId) {
      return;
    }
    
    // Save current history first
    if (state.activeConversationId) {
      conversationStorage.saveHistory(state.activeConversationId, state.history);
    }
    
    // Load new conversation
    const conversationHistory = conversationStorage.getHistory(conversationId);
    
    // Update state
    this.setState({
      history: conversationHistory,
      currentIndex: conversationHistory.length - 1,
      activeConversationId: conversationId
    });
    
    // Set as active in storage
    conversationStorage.setActive(conversationId);
    
    // Notify listeners
    this.notifyListeners(HISTORY_CHANGE, conversationHistory);
    this.notifyListeners(INDEX_CHANGE, conversationHistory.length - 1);
  },
  
  /**
   * Create a new conversation
   * @returns {string} ID of new conversation
   */
  createNewConversation() {
    const newConversation = conversationStorage.create();
    
    this.setState({
      history: [],
      currentIndex: -1,
      activeConversationId: newConversation.id
    });
    
    this.notifyListeners(HISTORY_CHANGE, []);
    this.notifyListeners(INDEX_CHANGE, -1);
    
    return newConversation.id;
  },
  
  /**
   * Subscribe to state changes
   * @param {string} eventType - Event type to listen for
   * @param {Function} listener - Function to call when event occurs
   * @returns {Function} Function to remove the listener
   */
  on(eventType, listener) {
    if (!listeners[eventType]) {
      listeners[eventType] = new Set();
    }
    
    listeners[eventType].add(listener);
    
    // Return unsubscribe function
    return () => listeners[eventType].delete(listener);
  },
  
  /**
   * Notify listeners of a specific event type
   * @param {string} eventType - Event type to notify
   * @param {any} data - Data to pass to listeners
   */
  notifyListeners(eventType, data) {
    if (listeners[eventType]) {
      listeners[eventType].forEach(listener => listener(data));
    }
  },
  
  /**
   * Get all conversations
   * @returns {Array} All conversations
   */
  getAllConversations() {
    return conversationStorage.getAll();
  },
  
  /**
   * Delete a conversation
   * @param {string} conversationId - ID of conversation to delete
   */
  deleteConversation(conversationId) {
    conversationStorage.delete(conversationId);
    
    // If the deleted conversation was active, state will update automatically
    // as conversationStorage.delete handles this case
    if (state.activeConversationId === conversationId) {
      // Reload the new active conversation
      const activeId = conversationStorage.getActiveId();
      if (activeId) {
        this.switchConversation(activeId);
      } else {
        // If no conversations left, create a new one
        this.createNewConversation();
      }
    }
  },
  
  /**
   * Rename a conversation
   * @param {string} conversationId - ID of conversation to rename
   * @param {string} newTitle - New title for conversation
   */
  renameConversation(conversationId, newTitle) {
    conversationStorage.rename(conversationId, newTitle);
  },

  /**
   * Add a listener for component index changes
   * @param {Function} callback - Function to call when index changes
   * @returns {Function} Function to remove the listener
   */
  onIndexChange(callback) {
    return this.on(INDEX_CHANGE, callback);
  }
};
