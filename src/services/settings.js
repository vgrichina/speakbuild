import { storage, SETTINGS_KEY } from './storage';

// Default settings
const DEFAULT_SETTINGS = {
  ultravoxApiKey: '',
  openrouterApiKey: '',
  selectedModel: 'anthropic/claude-3.7-sonnet',
  selectedLanguage: 'en'
};

/**
 * Gets all settings from storage
 * @returns {Object} The current settings
 */
export function getSettings() {
  const settingsJson = storage.getString(SETTINGS_KEY);
  return settingsJson ? JSON.parse(settingsJson) : DEFAULT_SETTINGS;
}

/**
 * Gets API keys (using test keys as fallback if available)
 * @returns {Object} Object with ultravox and openrouter keys
 */
export function getApiKeys() {
  const settings = getSettings();
  
  // Use test keys if user hasn't provided their own
  const ultravoxKey = settings.ultravoxApiKey || process.env.EXPO_PUBLIC_TEST_ULTRAVOX_KEY || null;
  const openrouterKey = settings.openrouterApiKey || process.env.EXPO_PUBLIC_TEST_OPENROUTER_KEY || null;
  
  return { 
    ultravox: ultravoxKey, 
    openrouter: openrouterKey 
  };
}

/**
 * Saves settings to storage
 * @param {Object} newSettings - Settings to save
 */
export function saveSettings(newSettings) {
  const currentSettings = getSettings();
  const updatedSettings = { ...currentSettings, ...newSettings };
  storage.set(SETTINGS_KEY, JSON.stringify(updatedSettings));
}

/**
 * Checks if API keys are available 
 * @returns {boolean} True if both keys are set
 */
export function hasApiKeys() {
  const keys = getApiKeys();
  return Boolean(keys.ultravox && keys.openrouter);
}
