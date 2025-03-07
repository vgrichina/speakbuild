import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { getSettings, getApiKeys, saveSettings as saveSettingsService, hasApiKeys } from '../services/settings';

/**
 * Hook for checking API keys and redirecting to settings if needed
 * Uses the settings service as the single source of truth
 */
export function useApiKeyCheck() {
    const [isChecking, setIsChecking] = useState(false);
    const router = useRouter();

    const checkApiKeys = useCallback(() => {
        if (isChecking) return { ultravoxKey: null, openrouterKey: null };
        setIsChecking(true);
        
        try {
            // Get API keys from the settings service
            const keys = getApiKeys();
            
            // Check if keys are missing
            if (!keys.ultravox || !keys.openrouter) {
                router.push('settings');
                const missingKeys = [];
                if (!keys.ultravox) missingKeys.push('Ultravox');
                if (!keys.openrouter) missingKeys.push('OpenRouter');
                
                throw new Error(`Please set your ${missingKeys.join(' and ')} API key${missingKeys.length > 1 ? 's' : ''} in settings`);
            }

            return { ultravoxKey: keys.ultravox, openrouterKey: keys.openrouter };
        } finally {
            setIsChecking(false);
        }
    }, [router, isChecking]);

    return { checkApiKeys, isChecking };
}

/**
 * Hook for managing settings in React components
 * Uses the settings service as the single source of truth
 */
export function useSettings() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [ultravoxApiKey, setUltravoxApiKey] = useState(null);
    const [openrouterApiKey, setOpenrouterApiKey] = useState(null);
    const [selectedModel, setSelectedModel] = useState('anthropic/claude-3.7-sonnet');
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
    const [error, setError] = useState('');

    // Load settings from service on component mount
    useEffect(() => {
        try {
            // Get settings from service
            const settings = getSettings();
            const keys = getApiKeys();
            
            console.log('Loading API keys:', {
                ultravox: keys.ultravox ? `Set (length: ${keys.ultravox.length})` : 'Not set',
                openrouter: keys.openrouter ? `Set (length: ${keys.openrouter.length})` : 'Not set'
            });
            
            // Set API keys in state
            setUltravoxApiKey(keys.ultravox || '');
            setOpenrouterApiKey(keys.openrouter || '');
            setSelectedLanguage(settings.selectedLanguage);
            
            // Set model with default
            console.log('Loading settings - saved model:', settings.selectedModel);
            console.log('Using model:', settings.selectedModel);
            setSelectedModel(settings.selectedModel);
            
            // Mark settings as loaded
            setIsSettingsLoaded(true);

            // Show settings modal if API keys are not set
            if (!hasApiKeys()) {
                setIsSettingsOpen(true);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            setError('Failed to load settings');
            setIsSettingsLoaded(true); // Still mark as loaded even on error
        }
    }, []);

    // Save settings through the service
    const saveSettings = (ultravoxKey, openrouterKey, newModel, newLanguage) => {
        saveSettingsService({
            ultravoxApiKey: ultravoxKey,
            openrouterApiKey: openrouterKey,
            selectedModel: newModel,
            selectedLanguage: newLanguage
        });
        
        // Update local state
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
