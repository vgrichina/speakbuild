import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useSettings() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [ultravoxApiKey, setUltravoxApiKey] = useState(null);
    const [selectedModel, setSelectedModel] = useState(null);
    const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const [savedUltravoxKey, savedModel] = await Promise.all([
                    AsyncStorage.getItem('ultravox_api_key'),
                    AsyncStorage.getItem('selected_model')
                ]);

                // Set API key
                setUltravoxApiKey(savedUltravoxKey || '');
                
                // Set model with default
                const modelToUse = savedModel || 'anthropic/claude-3.5-sonnet';
                await AsyncStorage.setItem('selected_model', modelToUse);
                setSelectedModel(modelToUse);
                
                // Mark settings as loaded
                setIsSettingsLoaded(true);

                // Show settings modal if no API key
                if (!savedKey) {
                    setIsSettingsOpen(true);
                }
            } catch (error) {
                console.error('Error loading settings:', error);
                setError('Failed to load settings');
                setIsSettingsLoaded(true); // Still mark as loaded even on error
            }
        };
        loadSettings();
    }, []);

    const saveSettings = async (newKey, newLanguage, newModel) => {
        await AsyncStorage.setItem('openrouter_api_key', newKey);
        setApiKey(newKey);
        setSelectedLanguage(newLanguage);
        setSelectedModel(newModel);
        setError(''); // Clear any previous errors
    };

    return {
        isSettingsOpen,
        setIsSettingsOpen,
        apiKey,
        selectedLanguage,
        selectedModel,
        isSettingsLoaded,
        error,
        saveSettings
    };
}
