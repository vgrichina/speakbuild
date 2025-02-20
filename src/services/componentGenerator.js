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

Example component patterns:

1. List Component with Error Handling:
\`\`\`
function Component({ title, items, size }) {
  const throwError = useErrorBoundary();
  
  const styles = {
    container: {
      flex: 1,
      padding: RN.Platform.OS === 'ios' ? 20 : 16
    },
    title: {
      fontSize: size || 24,
      fontWeight: 'bold',
      marginBottom: 16
    },
    list: {
      flex: 1
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderColor: '#e5e5e5'
    },
    itemText: {
      flex: 1,
      fontSize: 16
    },
    checkbox: {
      width: 24,
      height: 24,
      borderWidth: 2,
      borderColor: '#4B5563',
      borderRadius: 4,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center'
    },
    checked: {
      backgroundColor: '#4B5563'
    },
    time: {
      fontSize: 14,
      color: '#666'
    },
    errorButton: {
      backgroundColor: '#EF4444',
      padding: 8,
      borderRadius: 4,
      marginTop: 8
    },
    buttonText: {
      color: 'white',
      textAlign: 'center'
    }
  };

  return React.createElement(RN.View, { style: styles.container },
    React.createElement(RN.Text, { style: styles.title }, title),
    React.createElement(RN.ScrollView, { style: styles.list },
      items.map((item, index) => 
        React.createElement(RN.View, { 
          key: index,
          style: styles.item 
        },
          React.createElement(RN.TouchableOpacity, {
            style: [styles.checkbox, item.done && styles.checked],
            onPress: () => {
              item.done = !item.done;
              // Trigger re-render
              React.useState({})[1]({});
            }
          }),
          React.createElement(RN.Text, { 
            style: styles.itemText 
          }, item.text),
          item.time && React.createElement(RN.Text, { 
            style: styles.time 
          }, item.time)
        )
      )
    ),
    React.createElement(RN.TouchableOpacity, {
      style: styles.errorButton,
      onPress: () => throwError(new Error('Button error triggered'))
    },
      React.createElement(RN.Text, { style: styles.buttonText }, 
        'Trigger Error'
      )
    )
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
    console.log('streamComponent called with model:', selectedModel);
    
    if (!selectedModel) {
        throw new Error('No model specified for component generation');
    }
    const currentApiKey = process.env.OPENROUTER_API_KEY || await AsyncStorage.getItem('openrouter_api_key');
    if (!currentApiKey) {
        throw new Error('API key not found in environment or AsyncStorage');
    }

    const messages = componentPrompt({ 
        isModifying: analysis.intent === 'modify', 
        currentComponentCode,
        widgetUrl: analysis.widgetUrl
    });

    let fullResponse = '';

    for await (const chunk of api.streamCompletion(currentApiKey, messages, {
        abortController,
        model: selectedModel
    })) {
        if (chunk.content) {
            fullResponse += chunk.content;
            yield { content: chunk.content };
        }
        
        if (chunk.done) {
            // Extract and validate code
            const codeMatch = fullResponse.match(/```(?:jsx|javascript|)?\s*([\s\S]*?)```/);
            if (!codeMatch) {
                throw new Error('No code block found in response');
            }
            const rawCode = codeMatch[1].trim();
            
            // Validate component format
            if (!rawCode.match(/function Component\((props|\{[^}]*\})\)/)) {
                throw new Error('Invalid component code format - must use function Component(props) or function Component({prop1, prop2})');
            }

            // Create component code
            const componentCode = `
                const React = arguments[0];
                const RN = arguments[1];
                const Expo = arguments[2];
                const { useState } = React;
                const useErrorBoundary = arguments[3];
                ${rawCode}
                return Component;
            `;

            yield { 
                content: '', 
                done: true,
                code: rawCode,
                componentCode
            };
        }
    }
}
