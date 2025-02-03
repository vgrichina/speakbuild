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

export const componentGenerator = {
    async generateComponent(analysis, currentComponentCode, React, RN, ExpoModules) {
        const currentApiKey = await AsyncStorage.getItem('openrouter_api_key');
        if (!currentApiKey) {
            throw new Error('API key not found');
        }

        // Check cache for matching widget
        const cachedWidget = await widgetStorage.find(analysis.widgetUrl);
        if (cachedWidget) {
            console.log('Found cached widget:', analysis.widgetUrl);
            try {
                const createComponent = new Function(cachedWidget.code);
                const GeneratedComponent = createComponent(React, RN, ExpoModules);
                return {
                    component: GeneratedComponent,
                    code: cachedWidget.code,
                    fromCache: true
                };
            } catch (error) {
                console.error('Error creating component from cache:', error);
                // Continue with API call if cache processing fails
            }
        }

        const messages = componentPrompt({ 
            isModifying: analysis.intent === 'modify', 
            currentComponentCode,
            widgetUrl: analysis.widgetUrl
        });

        const response = await api.completion(currentApiKey, messages, {
            max_tokens: 1500,
            model: 'anthropic/claude-3.5-sonnet'
        });

        // Extract code from markdown code block
        const codeMatch = response.match(/```(?:jsx|javascript|)?\s*([\s\S]*?)```/);
        if (!codeMatch) {
            throw new Error('No code block found in response');
        }

        const code = codeMatch[1].trim();
        if (!code.includes('function Component(props)')) {
            throw new Error('Invalid component code format - must use function Component(props)');
        }

        // Create component function with proper scope access
        const componentCode = `
            const React = arguments[0];
            const RN = arguments[1];
            const Expo = arguments[2];
            const { useState } = React;
            console.log('Maps module:', Object.keys(Expo.Maps));
            ${code}
            return Component;
        `;

        // Create and execute the function with React and RN components in scope
        const createComponent = new Function(componentCode);
        const GeneratedComponent = createComponent(React, RN, ExpoModules);

        // Cache the new widget
        await widgetStorage.store(analysis.widgetUrl, GeneratedComponent, code);

        return {
            component: GeneratedComponent,
            code: code,
            fromCache: false
        };
    },

    async *streamComponent(analysis, currentComponentCode, selectedModel, abortController) {
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
};
