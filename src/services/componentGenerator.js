import { api } from './api';
import { widgetStorage } from './widgetStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SYSTEM_PROMPT = {
    role: 'system',
    content: `You are an AI assistant for a React Native voice assistant app.
Your role is to help users by creating relevant UI components that match their requests.
Based on the widget URL specification, you generate a React Native component.

Available APIs:

React Hooks:
- Direct via React namespace (React.useState, React.useEffect)

React Native (RN namespace):
- Core components: View, Text, Image, ScrollView, TextInput, Pressable, TouchableOpacity
- Utilities: Alert, Vibration, Share, Dimensions, Animated, Appearance, Platform (use as RN.Platform)

Expo Modules:
Available as third argument (Expo) from these packages:
- Expo.Haptics (expo-haptics) - vibration and haptic feedback
- Expo.Clipboard (expo-clipboard) - copy/paste functionality
- Expo.ImagePicker (expo-image-picker) - image selection
- Expo.MediaLibrary (expo-media-library) - media access
- Expo.FileSystem (expo-file-system) - file operations
- Expo.Sharing (expo-sharing) - native share dialog
- Expo.Location (expo-location) - geolocation
- Expo.Notifications (expo-notifications) - local notifications
- Expo.AV (expo-av) - audio/video playback
- Expo.Reanimated (react-native-reanimated) - advanced animations
- Expo.Gesture (react-native-gesture-handler) - touch gestures
- Expo.Linking (expo-linking) - deep linking
  Example: Opening location in Google Maps:
  Expo.Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address));
  Or with coordinates:
  Expo.Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng);
- Expo.Sensors (expo-sensors) - device sensors

Key requirements:
- Use React.createElement (no JSX)
- Handle cleanup in useEffect
- Use .then() for promises (no async/await)
- Use only React Native compatible styles
- Return pure JavaScript code without explanations
- Start with either 'function Component(props) {' or 'function Component({prop1, prop2}) {'
- Use ONLY the exact parameter names from the URL's params

Example component pattern:
\`\`\`
function Component(props) {
  const styles = {
    container: {
      flex: 1,
      padding: RN.Platform.OS === 'ios' ? 20 : 16
    },
    image: {
      width: '100%',
      height: 200,
      borderRadius: 8
    },
    text: {
      marginTop: 8,
      fontFamily: RN.Platform.OS === 'ios' ? 'Helvetica' : 'Roboto',
      fontSize: props.size || 16
    }
  };

  return React.createElement(
    RN.View,
    { style: styles.container },
    React.createElement(RN.Image, {
      style: styles.image,
      source: { uri: props.imageUrl },
      resizeMode: 'cover'
    }),
    React.createElement(RN.Text, {
      style: styles.text
    }, props.text)
  );
}
\`\`\``
};

const componentPrompt = ({ isModifying, currentComponentCode, widgetUrl }) => {
    const messages = [SYSTEM_PROMPT];

    const userMessage = `${isModifying ? 
        'Modify the component to match this widget specification.' :
        'Generate a React Native component for this widget specification:'}\n\n` +
        `Widget URL: ${widgetUrl}\n\n` +
        (currentComponentCode ? 
            `Current component code:\n\`\`\`jsx\n${currentComponentCode}\n\`\`\`\n\n` : 
            '') +
        'Return ONLY the component code wrapped in a code block:\n\n```jsx\nfunction Component(props) {\n  // your code here\n}\n```';

    messages.push({
        role: 'user',
        content: userMessage
    });

    return messages;
};

export async function* streamComponent(analysis, currentComponentCode, selectedModel, abortController) {
    const currentApiKey = await AsyncStorage.getItem('openrouter_api_key');
    if (!currentApiKey) {
        throw new Error('API key not found');
    }

    const messages = componentPrompt({ 
        isModifying: analysis.intent === 'modify', 
        currentComponentCode,
        widgetUrl: analysis.widgetUrl
    });

    for await (const chunk of api.streamCompletion(currentApiKey, messages, {
        abortController,
        model: selectedModel
    })) {
        yield chunk;
    }
}
