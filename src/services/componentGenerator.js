import { api } from './api';
import { widgetStorage } from './widgetStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const componentPrompt = ({ isModifying, currentComponentCode, widgetUrl }) => {
    const messages = [];
    
    if (currentComponentCode) {
        messages.push({
            role: 'system',
            content: `Previous component code for reference:\n\`\`\`jsx\n${currentComponentCode}\n\`\`\`\nUse this as reference if modifying.`
        });
    }

    messages.push({
        role: 'user',
        content: `${isModifying ? 
`Modify the existing component to match this widget specification.` :
`Generate a React Native component for this widget specification:`}

Widget URL: ${widgetUrl}

Return ONLY the component code using React.createElement.
Start with 'function Component(props) {'.
Use ONLY the exact parameter names from the URL's params.

Available APIs:

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
\`\`\`

Key requirements:
- Use React.createElement (no JSX)
- Handle cleanup in useEffect
- Use .then() for promises (no async/await)
- Use only React Native compatible styles
- Return pure JavaScript code without explanations

Start your response with \`\`\` and end with \`\`\`.`
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
