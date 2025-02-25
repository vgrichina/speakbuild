import { storage, WIDGET_PREFIX } from './storage';

export const widgetStorage = {
    store(widgetUrl, code) {
        const key = WIDGET_PREFIX + widgetUrl;
        
        // Get existing widgets for this URL or create new array
        const existingData = storage.getString(key);
        const widgets = existingData ? JSON.parse(existingData) : [];
        
        // Add new widget version
        widgets.push({
            code,
            timestamp: Date.now()
        });
        
        console.log('Storing widget:', widgetUrl);
        
        // Store updated array
        storage.set(key, JSON.stringify(widgets));
    },

    find(widgetUrl) {
        const key = WIDGET_PREFIX + widgetUrl;
        const data = storage.getString(key);
        
        if (!data) {
            console.log('No cached widget found:', widgetUrl);
            return null;
        }
        
        const widgets = JSON.parse(data);
        
        if (!widgets.length) {
            console.log('No cached widget versions found:', widgetUrl);
            return null;
        }
        
        console.log('Found cached widget:', widgetUrl);
        return widgets[widgets.length - 1];
    },

    clear() {
        // Get all keys
        const allKeys = storage.getAllKeys();
        
        // Delete all widget keys
        allKeys.forEach(key => {
            if (key.startsWith(WIDGET_PREFIX)) {
                storage.delete(key);
            }
        });
    }
};
