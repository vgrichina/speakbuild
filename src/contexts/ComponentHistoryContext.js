import React, { createContext, useContext, useState, useEffect } from 'react';
import { widgetStorage } from '../services/widgetStorage';
import { conversationStorage } from '../services/conversationStorage';

const ComponentHistoryContext = createContext(null);

export function ComponentHistoryProvider({ children }) {
    const [state, setState] = useState({
        history: [],
        currentIndex: -1,
        activeConversationId: null
    });

    // Initialize or load active conversation
    useEffect(() => {
        const initConversation = async () => {
            // Get active conversation ID
            let activeId = conversationStorage.getActiveId();
            
            // If no active conversation, create one
            if (!activeId) {
                const newConversation = conversationStorage.create();
                activeId = newConversation.id;
            }
            
            // Load conversation history
            const conversationHistory = conversationStorage.getHistory(activeId);
            
            setState({
                history: conversationHistory,
                currentIndex: conversationHistory.length - 1,
                activeConversationId: activeId
            });
        };
        
        initConversation();
    }, []);
    
    // Save history when it changes
    useEffect(() => {
        if (state.activeConversationId && state.history.length > 0) {
            conversationStorage.saveHistory(state.activeConversationId, state.history);
        }
    }, [state.history, state.activeConversationId]);

    const current = React.useMemo(() => {
        if (state.currentIndex >= 0 && state.currentIndex < state.history.length) {
            return state.history[state.currentIndex];
        }
        return null;
    }, [state.history, state.currentIndex]);

    const addToHistory = React.useCallback((entry) => {
        setState(prevState => ({
            ...prevState,
            history: [...prevState.history.slice(0, prevState.currentIndex + 1), entry],
            currentIndex: prevState.currentIndex + 1
        }));
    }, []);

    const setCurrentIndex = React.useCallback((newIndex) => {
        setState(prevState => ({
            ...prevState,
            currentIndex: newIndex
        }));
    }, []);

    const clearHistory = React.useCallback(() => {
        widgetStorage.clear();
        
        // Create new conversation
        const newConversation = conversationStorage.create();
        
        setState({
            history: [],
            currentIndex: -1,
            activeConversationId: newConversation.id
        });
    }, []);
    
    const switchConversation = React.useCallback((conversationId) => {
        // Save current history first
        if (state.activeConversationId) {
            conversationStorage.saveHistory(state.activeConversationId, state.history);
        }
        
        // Load new conversation
        const conversationHistory = conversationStorage.getHistory(conversationId);
        
        // Update state
        setState({
            history: conversationHistory,
            currentIndex: conversationHistory.length - 1,
            activeConversationId: conversationId
        });
        
        // Set as active in storage
        conversationStorage.setActive(conversationId);
    }, [state.activeConversationId, state.history]);
    
    const createNewConversation = React.useCallback(() => {
        const newConversation = conversationStorage.create();
        
        // Update state
        setState({
            history: [],
            currentIndex: -1,
            activeConversationId: newConversation.id
        });
        
        return newConversation.id;
    }, []);

    const value = {
        history: state.history,
        currentIndex: state.currentIndex,
        activeConversationId: state.activeConversationId,
        current,
        addToHistory,
        setCurrentIndex,
        clearHistory,
        switchConversation,
        createNewConversation
    };

    return (
        <ComponentHistoryContext.Provider value={value}>
            {children}
        </ComponentHistoryContext.Provider>
    );
}

export function useComponentHistory() {
    const context = useContext(ComponentHistoryContext);
    if (context === null) {
        throw new Error('useComponentHistory must be used within a ComponentHistoryProvider');
    }
    return context;
}
