import { api } from './api';
import { widgetStorage } from './widgetStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SYSTEM_PROMPT = {
    role: 'system',
    content: `You are a React Native component generator. Available APIs:

React Hooks:
- Direct via React namespace (React.useState, React.useEffect)

React Native (RN namespace):
- Core components: View, Text, Image, ScrollView, TextInput, Pressable, 
  TouchableOpacity, Alert, Vibration, Share, Platform, 
  Dimensions, Animated, Appearance

Expo Modules (Expo namespace):
Available as Expo.ModuleName with these imports:
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as AV from 'expo-av';
import * as Maps from 'react-native-maps';
import * as Reanimated from 'react-native-reanimated';
import * as Gesture from 'react-native-gesture-handler';
import * as Linking from 'react-native/Libraries/Linking/Linking';
import * as Sensors from 'expo-sensors';

Key requirements:
- Use React.createElement (no JSX)
- Handle cleanup in useEffect
- Use .then() for promises (no async/await)
- Use only React Native compatible styles
- Return pure JavaScript code without explanations
- Start with 'function Component(props) {'
- Use ONLY the exact parameter names from the URL's params

Example component pattern:
\`\`\`
function Component(props) {
  const [state, setState] = React.useState(null);
  
  React.useEffect(() => {
    return () => {
      // Cleanup pattern
    };
  }, []);

  const styles = {
    container: {
      flex: 1,
      justifyContent: 'center'
    }
  };

  return React.createElement(
    RN.View,
    { style: styles.container },
    React.createElement(RN.Text, null, props.text)
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
