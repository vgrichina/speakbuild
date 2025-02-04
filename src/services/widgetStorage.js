import AsyncStorage from '@react-native-async-storage/async-storage';

const WIDGET_STORAGE_KEY = 'cached_widgets';

export const widgetStorage = {
    async store(widgetUrl, code) {
        const existingData = await AsyncStorage.getItem(WIDGET_STORAGE_KEY);
        const widgets = existingData ? JSON.parse(existingData) : {};
        
        if (!widgets[widgetUrl]) {
            widgets[widgetUrl] = [];
        }
        
        widgets[widgetUrl].push({
            code,
            timestamp: Date.now()
        });
        console.log('Storing widget:', widgetUrl);
        
        await AsyncStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(widgets));
    },

    async find(widgetUrl) {
        const data = await AsyncStorage.getItem(WIDGET_STORAGE_KEY);
        if (!data) return null;
        
        const widgets = JSON.parse(data);
        const matches = widgets[widgetUrl];
        
        if (!matches?.length) {
            console.log('No cached widget found:', widgetUrl);
            return null;
        }
        
        console.log('Found cached widget:', widgetUrl);
        return matches[matches.length - 1];
    },

    async clear() {
        await AsyncStorage.removeItem(WIDGET_STORAGE_KEY);
    }
};
