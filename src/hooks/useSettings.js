import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export function useApiKeyCheck() {
    const [isChecking, setIsChecking] = useState(false);
    const router = useRouter();

    const checkApiKeys = useCallback(() => {
        if (isChecking) return { ultravoxKey: null, openrouterKey: null };
        setIsChecking(true);
        
        try {
            const settingsJson = storage.getString(SETTINGS_KEY);
            const settings = settingsJson ? JSON.parse(settingsJson) : DEFAULT_SETTINGS;
            const { ultravoxApiKey, openrouterApiKey } = settings;

            const missingKeys = [];
            if (!ultravoxKey) missingKeys.push('Ultravox');
            if (!openrouterKey) missingKeys.push('OpenRouter');

            if (missingKeys.length > 0) {
                router.push('settings');
                throw new Error(`Please set your ${missingKeys.join(' and ')} API key${missingKeys.length > 1 ? 's' : ''} in settings`);
            }

            return { ultravoxKey, openrouterKey };
        } finally {
            setIsChecking(false);
        }
    }, [router, isChecking]);

    return { checkApiKeys, isChecking };
}

export function useSettings() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [ultravoxApiKey, setUltravoxApiKey] = useState(null);
    const [openrouterApiKey, setOpenrouterApiKey] = useState(null);
    const [selectedModel, setSelectedModel] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        try {
            const settingsJson = storage.getString(SETTINGS_KEY);
            if (settingsJson) {
                const settings = JSON.parse(settingsJson);
                
                // Set API keys
                setUltravoxApiKey(savedUltravoxKey || '');
                setOpenrouterApiKey(savedOpenrouterKey || '');
                setSelectedLanguage(savedLanguage || 'en');
                
                // Set model with default
                console.log('Loading settings - saved model:', savedModel);
                const modelToUse = savedModel || 'anthropic/claude-3.5-sonnet';
                console.log('Using model:', modelToUse);
                setSelectedModel(modelToUse);
                console.log('Model set in state:', modelToUse);
                
                // Mark settings as loaded
                setIsSettingsLoaded(true);

                // Show settings modal if no API keys
                if (!savedUltravoxKey || !savedOpenrouterKey) {
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

    const saveSettings = (ultravoxKey, openrouterKey, newModel, newLanguage) => {
        const settings = {
            ultravoxApiKey: ultravoxKey,
            openrouterApiKey: openrouterKey,
            selectedModel: newModel,
            selectedLanguage: newLanguage
        };
        
        storage.set(SETTINGS_KEY, JSON.stringify(settings));
        
        setUltravoxApiKey(ultravoxKey);
        setOpenrouterApiKey(openrouterKey);
        setSelectedModel(newModel);
        setSelectedLanguage(newLanguage);
        setIsSettingsOpen(false);
        setSelectedLanguage(newLanguage);
        setError(''); // Clear any previous errors
    };

    return {
        isSettingsOpen,
        setIsSettingsOpen,
        ultravoxApiKey,
        openrouterApiKey,
        selectedModel,
        selectedLanguage,
        isSettingsLoaded,
        error,
        saveSettings
    };
}
