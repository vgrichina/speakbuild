import React from 'react';
import { widgetStorage } from '../services/widgetStorage';

export function useComponentHistory() {
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
        console.log('Adding to history:', {
            currentHistoryLength: state.history.length,
            currentIndex: state.currentIndex,
            newEntry: entry,
            transcription: entry.request
        });
        
        setState(prevState => ({
            history: [...prevState.history.slice(0, prevState.currentIndex + 1), entry],
            currentIndex: prevState.currentIndex + 1
        }));

        console.log('After adding:', {
            newHistoryLength: state.history.length + 1,
            newIndex: state.currentIndex + 1
        });
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

    return {
        history: state.history,
        currentIndex: state.currentIndex,
        current,
        addToHistory,
        setCurrentIndex,
        clearHistory,
    };
}
