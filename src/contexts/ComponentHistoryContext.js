import React, { createContext, useContext } from 'react';
import { widgetStorage } from '../services/widgetStorage';

const ComponentHistoryContext = createContext(null);

export function ComponentHistoryProvider({ children }) {
    const [state, setState] = React.useState({
        history: [],
        currentIndex: -1
    });

    const current = React.useMemo(() => {
        if (state.currentIndex >= 0 && state.currentIndex < state.history.length) {
            return state.history[state.currentIndex];
        }
        return null;
    }, [state.history, state.currentIndex]);

    const addToHistory = React.useCallback((entry) => {
        setState(prevState => ({
            history: [...prevState.history.slice(0, prevState.currentIndex + 1), entry],
            currentIndex: prevState.currentIndex + 1
        }));

        console.log('History updated:', state.currentIndex + 1);
    }, []);

    const setCurrentIndex = React.useCallback((newIndex) => {
        setState(prevState => ({
            ...prevState,
            currentIndex: newIndex
        }));
    }, []);

    const clearHistory = React.useCallback(async () => {
        await widgetStorage.clear();
        setState({
            history: [],
            currentIndex: -1
        });
    }, []);

    const value = {
        history: state.history,
        currentIndex: state.currentIndex,
        current,
        addToHistory,
        setCurrentIndex,
        clearHistory,
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
