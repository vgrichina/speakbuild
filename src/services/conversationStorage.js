import { storage } from './storage';

// Constants
const CONVERSATIONS_META_KEY = 'conversation:meta';
const CONVERSATION_PREFIX = 'conversation:';
const ACTIVE_CONVERSATION_KEY = 'conversation:active';

export const conversationStorage = {
  // Get all conversations metadata
  getAll() {
    const data = storage.getString(CONVERSATIONS_META_KEY);
    if (!data) return [];
    return JSON.parse(data).conversations;
  },

  // Create a new conversation
  create(title = 'New Conversation') {
    const conversations = this.getAll();
    
    // Generate ID based on timestamp and random number
    const id = `conv_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    
    const newConversation = {
      id,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      previewText: ''
    };
    
    // Add to metadata
    storage.set(
      CONVERSATIONS_META_KEY, 
      JSON.stringify({ conversations: [newConversation, ...conversations] })
    );
    
    // Initialize empty conversation data
    storage.set(CONVERSATION_PREFIX + id, JSON.stringify([]));
    
    // Set as active conversation
    this.setActive(id);
    
    return newConversation;
  },

  // Get active conversation ID
  getActiveId() {
    return storage.getString(ACTIVE_CONVERSATION_KEY);
  },

  // Set active conversation
  setActive(id) {
    storage.set(ACTIVE_CONVERSATION_KEY, id);
  },

  // Get conversation history
  getHistory(conversationId) {
    const data = storage.getString(CONVERSATION_PREFIX + conversationId);
    if (!data) return [];
    return JSON.parse(data);
  },

  // Save conversation history
  saveHistory(conversationId, history) {
    storage.set(CONVERSATION_PREFIX + conversationId, JSON.stringify(history));
    
    // Update metadata
    this.updateMetadata(conversationId, history);
  },
  
  // Update conversation metadata
  updateMetadata(conversationId, history) {
    const conversations = this.getAll();
    const updatedConversations = conversations.map(conv => {
      if (conv.id === conversationId) {
        const lastEntry = history.length > 0 ? history[history.length - 1] : null;
        return {
          ...conv,
          updatedAt: Date.now(),
          previewText: lastEntry?.transcript?.slice(0, 100) || conv.previewText
        };
      }
      return conv;
    });
    
    storage.set(
      CONVERSATIONS_META_KEY, 
      JSON.stringify({ conversations: updatedConversations })
    );
  },
  
  // Delete conversation
  delete(conversationId) {
    // Remove from metadata
    const conversations = this.getAll();
    const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
    storage.set(
      CONVERSATIONS_META_KEY, 
      JSON.stringify({ conversations: updatedConversations })
    );
    
    // Delete conversation data
    storage.delete(CONVERSATION_PREFIX + conversationId);
    
    // Update active conversation if needed
    if (this.getActiveId() === conversationId) {
      const newActiveId = updatedConversations.length > 0 ? updatedConversations[0].id : null;
      if (newActiveId) {
        this.setActive(newActiveId);
      } else {
        storage.delete(ACTIVE_CONVERSATION_KEY);
      }
    }
  },
  
  // Rename conversation
  rename(conversationId, newTitle) {
    const conversations = this.getAll();
    const updatedConversations = conversations.map(conv => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          title: newTitle,
          updatedAt: Date.now()
        };
      }
      return conv;
    });
    
    storage.set(
      CONVERSATIONS_META_KEY, 
      JSON.stringify({ conversations: updatedConversations })
    );
  }
};
