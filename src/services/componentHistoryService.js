/**
 * componentHistoryService.js
 * 
 * Service for managing component history and conversations
 * Replaces both ComponentHistoryContext and ComponentHistory with a unified service-based approach
 */
import { conversationStorage } from './conversationStorage';
import { widgetStorage } from './widgetStorage';

// Constants for event types
const STATE_CHANGE = 'stateChange';
const CURRENT_CHANGE = 'currentChange';
const INDEX_CHANGE = 'indexChange';
const HISTORY_CHANGE = 'historyChange';

// State management
let state = {
  history: [],
  currentIndex: -1,
  activeConversationId: null,
  // In-memory component array (mirrors ComponentHistory._components)
  components: [],
  // In-memory current index (mirrors ComponentHistory._currentIndex)
  componentIndex: 0
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
  
  // Get current conversation entry
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
  
  // Add entry to history
  addToHistory(entry) {
    const newHistory = [
      ...state.history.slice(0, state.currentIndex + 1), 
      entry
    ];
    
    this.setState({
      history: newHistory,
      currentIndex: newHistory.length - 1
    });
  },
  
  // Set current index
  setCurrentIndex(newIndex) {
    if (newIndex >= -1 && newIndex < state.history.length) {
      this.setState({ currentIndex: newIndex });
    }
  },
  
  // Navigate backward in history
  goBack() {
    if (state.currentIndex > 0) {
      this.setCurrentIndex(state.currentIndex - 1);
    }
  },
  
  // Navigate forward in history
  goForward() {
    if (state.currentIndex < state.history.length - 1) {
      this.setCurrentIndex(state.currentIndex + 1);
    }
  },
  
  // Clear history
  clearHistory() {
    widgetStorage.clear();
    
    // Create new conversation
    const newConversation = conversationStorage.create();
    
    this.setState({
      history: [],
      currentIndex: -1,
      activeConversationId: newConversation.id
    });
  },
  
  // Switch conversation
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
  },
  
  // Create new conversation
  createNewConversation() {
    const newConversation = conversationStorage.create();
    
    this.setState({
      history: [],
      currentIndex: -1,
      activeConversationId: newConversation.id
    });
    
    return newConversation.id;
  },
  
  // Subscribe to state changes
  on(eventType, listener) {
    if (!listeners[eventType]) {
      listeners[eventType] = new Set();
    }
    
    listeners[eventType].add(listener);
    
    // Return unsubscribe function
    return () => listeners[eventType].delete(listener);
  },
  
  // Notify listeners of a specific event type
  notifyListeners(eventType, data) {
    if (listeners[eventType]) {
      listeners[eventType].forEach(listener => listener(data));
    }
  },
  
  // Get all conversations
  getAllConversations() {
    return conversationStorage.getAll();
  },
  
  // Delete a conversation
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
  
  // Rename a conversation
  renameConversation(conversationId, newTitle) {
    conversationStorage.rename(conversationId, newTitle);
  },

  /************************************
   * ComponentHistory compatibility API
   ************************************/
  
  /**
   * Add a component to history
   * @param {Object} component - Generated component result
   * @param {Object} analysis - Analysis with transcript and intent
   * @returns {Object} Component with ID
   */
  addToHistory(component, analysis) {
    if (!component) return null;
    
    // Create a complete history item with ID
    const historyItem = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      // Component data
      code: component.code,
      // Analysis data
      transcription: analysis?.transcription || '',
      intent: analysis?.intent || 'new',
      widgetUrl: analysis?.widgetUrl || component.widgetUrl,
      params: analysis?.params || component.params || {},
      // Metadata
      timestamp: Date.now()
    };
    
    // Store in widgetStorage if we have a widgetUrl
    if (historyItem.widgetUrl) {
      widgetStorage.store(historyItem.widgetUrl, historyItem.code);
    }
    
    // Add to in-memory components array
    const newComponents = [historyItem, ...state.components];
    
    // Keep only the latest 50 components
    if (newComponents.length > 50) {
      newComponents.length = 50;
    }
    
    // Update state
    state = {
      ...state,
      components: newComponents,
      componentIndex: 0
    };
    
    // Notify listeners
    this.notifyListeners(HISTORY_CHANGE, newComponents);
    this.notifyListeners(INDEX_CHANGE, 0);
    
    // Also add to conversation history if we have an active conversation
    if (state.activeConversationId) {
      this.addToConversationHistory(historyItem);
    }
    
    return historyItem;
  },
  
  /**
   * Add component to conversation history
   * This helps bridge the gap between in-memory components and persistent conversation history
   */
  addToConversationHistory(component) {
    if (!state.activeConversationId) return;
    
    // Add to the persistent conversation history
    const conversationHistory = conversationStorage.getHistory(state.activeConversationId);
    const newHistory = [...conversationHistory, component];
    conversationStorage.saveHistory(state.activeConversationId, newHistory);
    
    // Update local state
    this.setState({
      history: newHistory,
      currentIndex: newHistory.length - 1
    });
  },
  
  /**
   * Get all components
   * @returns {Array} All components
   */
  getComponents() {
    return state.components;
  },
  
  /**
   * Get the current component (based on current index)
   * @returns {Object|null} Current component or null if history is empty
   */
  getCurrentComponent() {
    if (state.components.length === 0) return null;
    return state.components[state.componentIndex];
  },
  
  /**
   * Get the current component index
   * @returns {number} Current index
   */
  getCurrentIndex() {
    return state.componentIndex;
  },
  
  /**
   * Navigate backward in history (to older items)
   * @returns {boolean} Whether navigation was successful
   */
  back() {
    if (state.componentIndex >= state.components.length - 1) return false;
    
    const newIndex = state.componentIndex + 1;
    state = {
      ...state,
      componentIndex: newIndex
    };
    
    this.notifyListeners(INDEX_CHANGE, newIndex);
    return true;
  },
  
  /**
   * Navigate forward in history (to newer items)
   * @returns {boolean} Whether navigation was successful
   */
  forward() {
    if (state.componentIndex <= 0) return false;
    
    const newIndex = state.componentIndex - 1;
    state = {
      ...state,
      componentIndex: newIndex
    };
    
    this.notifyListeners(INDEX_CHANGE, newIndex);
    return true;
  },
  
  /**
   * Set the current component index directly
   * @param {number} index - New index
   * @returns {boolean} Whether the operation was successful
   */
  setComponentIndex(index) {
    if (index < 0 || index >= state.components.length) return false;
    
    state = {
      ...state,
      componentIndex: index
    };
    
    this.notifyListeners(INDEX_CHANGE, index);
    return true;
  },
  
  /**
   * Clear all components
   */
  clearComponents() {
    state = {
      ...state,
      components: [],
      componentIndex: 0
    };
    
    this.notifyListeners(HISTORY_CHANGE, []);
    this.notifyListeners(INDEX_CHANGE, 0);
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