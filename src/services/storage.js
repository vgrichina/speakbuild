import { MMKV } from 'react-native-mmkv';

// Create and export a single storage instance
export const storage = new MMKV();

// Define and export storage keys
export const SETTINGS_KEY = 'app_settings';
export const WIDGET_PREFIX = 'widget:';
