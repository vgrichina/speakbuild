import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { storage, SETTINGS_KEY } from '../services/storage';
import { BUILD_TIME_CONSTANTS } from '../config/buildTimeConstants';

// Test keys from build-time constants
const TEST_KEYS = {
  ultravox: BUILD_TIME_CONSTANTS.TEST_ULTRAVOX_KEY,
  openrouter: BUILD_TIME_CONSTANTS.TEST_OPENROUTER_KEY
};

// Default settings
const DEFAULT_SETTINGS = {
    ultravoxApiKey: '',
    openrouterApiKey: '',
    selectedModel: 'anthropic/claude-3.7-sonnet',
    selectedLanguage: 'en'
};

export function useApiKeyCheck() {
    const [isChecking, setIsChecking] = useState(false);
    const router = useRouter();

    const checkApiKeys = useCallback(() => {
        if (isChecking) return { ultravoxKey: null, openrouterKey: null };
        setIsChecking(true);
        
        try {
            const settingsJson = storage.getString(SETTINGS_KEY);
            const settings = settingsJson ? JSON.parse(settingsJson) : DEFAULT_SETTINGS;
            let { ultravoxApiKey, openrouterApiKey } = settings;
            
            // Use test keys if user hasn't provided their own and test keys are available
            if (!ultravoxApiKey && TEST_KEYS.ultravox) {
                console.log('Using test Ultravox API key');
                ultravoxApiKey = TEST_KEYS.ultravox;
            }
            
            if (!openrouterApiKey && TEST_KEYS.openrouter) {
                console.log('Using test OpenRouter API key');
                openrouterApiKey = TEST_KEYS.openrouter;
            }
            
            const missingKeys = [];
            if (!ultravoxApiKey) missingKeys.push('Ultravox');
            if (!openrouterApiKey) missingKeys.push('OpenRouter');

            if (missingKeys.length > 0) {
                router.push('settings');
                throw new Error(`Please set your ${missingKeys.join(' and ')} API key${missingKeys.length > 1 ? 's' : ''} in settings`);
            }

            return { ultravoxKey: ultravoxApiKey, openrouterKey: openrouterApiKey };
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
    const [selectedModel, setSelectedModel] = useState('anthropic/claude-3.7-sonnet');
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        try {
            const settingsJson = storage.getString(SETTINGS_KEY);
            let settings = {};
            
            if (settingsJson) {
                settings = JSON.parse(settingsJson);
            }
            
            // Apply test keys if user has not provided their own
            let ultravoxKeyToUse = settings.ultravoxApiKey || '';
            let openrouterKeyToUse = settings.openrouterApiKey || '';
            
            // Use test keys if available and user hasn't provided their own
            if (!ultravoxKeyToUse && TEST_KEYS.ultravox) {
                console.log('Using test Ultravox API key');
                ultravoxKeyToUse = TEST_KEYS.ultravox;
            }
            
            if (!openrouterKeyToUse && TEST_KEYS.openrouter) {
                console.log('Using test OpenRouter API key');
                openrouterKeyToUse = TEST_KEYS.openrouter;
            }
            
            // Set API keys in state
            setUltravoxApiKey(ultravoxKeyToUse);
            setOpenrouterApiKey(openrouterKeyToUse);
            setSelectedLanguage(settings.selectedLanguage || 'en');
            
            // Set model with default
            console.log('Loading settings - saved model:', settings.selectedModel);
            const modelToUse = settings.selectedModel || 'anthropic/claude-3.7-sonnet';
            console.log('Using model:', modelToUse);
            setSelectedModel(modelToUse);
            console.log('Model set in state:', modelToUse);
            
            // Mark settings as loaded
            setIsSettingsLoaded(true);

            // Show settings modal if no API keys (and no test keys)
            if ((!ultravoxKeyToUse || !openrouterKeyToUse) && 
                (!TEST_KEYS.ultravox || !TEST_KEYS.openrouter)) {
                setIsSettingsOpen(true);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            setError('Failed to load settings');
            setIsSettingsLoaded(true); // Still mark as loaded even on error
        }
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
