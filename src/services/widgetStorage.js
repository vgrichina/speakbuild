import AsyncStorage from '@react-native-async-storage/async-storage';

const WIDGET_STORAGE_KEY = 'cached_widgets';

export const widgetStorage = {
    async store(widgetUrl, component, code) {
        try {
            // Get existing widgets
            const existingData = await AsyncStorage.getItem(WIDGET_STORAGE_KEY);
            const widgets = existingData ? JSON.parse(existingData) : {};
            
            // Store widget under its full URL (including params definition)
            if (!widgets[widgetUrl]) {
                widgets[widgetUrl] = [];
            }
            
            widgets[widgetUrl].push({
                code,
                timestamp: Date.now()
            });
            console.log('Stored widget:', widgetUrl);
            
            // Store back to AsyncStorage
            await AsyncStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(widgets));
            return true;
        } catch (error) {
            console.error('Widget storage error:', error);
            return false;
        }
    },

    async find(widgetUrl) {
        try {
            const data = await AsyncStorage.getItem(WIDGET_STORAGE_KEY);
            if (!data) return null;
            
            const widgets = JSON.parse(data);
            const matches = widgets[widgetUrl];
            
            if (!matches || matches.length === 0) {
                console.log('No cached widget found for:', widgetUrl);
                return null;
            }
            console.log('Found cached widget:', widgetUrl);
            
            // Return the most recent widget for this URL
            return matches[matches.length - 1];
        } catch (error) {
            console.error('Widget retrieval error:', error);
            return null;
        }
    },

    async clear() {
        try {
            await AsyncStorage.removeItem(WIDGET_STORAGE_KEY);
            return true;
        } catch (error) {
            console.error('Widget storage clear error:', error);
            return false;
        }
    }
};
