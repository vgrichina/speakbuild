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
        setHistory(prev => [...prev.slice(0, currentIndex + 1), entry]);
        setCurrentIndex(prev => prev + 1);
    }, [currentIndex]);

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
