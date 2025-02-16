import React from 'react';
import { widgetStorage } from '../services/widgetStorage';

export function useComponentHistory() {
    const [history, setHistory] = React.useState([]);
    const [currentIndex, setCurrentIndex] = React.useState(-1);

    const current = React.useMemo(() => {
        if (currentIndex >= 0 && currentIndex < history.length) {
            return history[currentIndex];
        }
        return null;
    }, [history, currentIndex]);

    const addToHistory = React.useCallback((entry) => {
        console.log('Adding to history:', {
            currentHistoryLength: history.length,
            currentIndex,
            newEntry: entry,
            transcription: entry.request
        });
        setHistory(prev => [...prev.slice(0, currentIndex + 1), entry]);
        setCurrentIndex(prev => prev + 1);
        console.log('After adding:', {
            newHistoryLength: history.length + 1,
            newIndex: currentIndex + 1
        });
    }, [currentIndex, history]);

    const clearHistory = React.useCallback(async () => {
        await widgetStorage.clear();
        setHistory([]);
        setCurrentIndex(-1);
    }, []);

    return {
        history,
        currentIndex,
        current,
        addToHistory,
        setCurrentIndex,
        clearHistory,
    };
}
