import { api } from './api';
import { widgetStorage } from './widgetStorage';
import { formatExamples } from './componentExamples';
import { storage, SETTINGS_KEY } from './storage';

const componentPrompt = async ({ isModifying, currentComponentCode, widgetUrl }) => {
    // Get examples dynamically
    const examplesText = await formatExamples();
    
    const systemPrompt = {
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

SVG Components (RN.SVG namespace):
- RN.SVG.Svg - Root SVG component
- RN.SVG.Circle - Circle element
- RN.SVG.Rect - Rectangle element
- RN.SVG.Path - Path element
- RN.SVG.Line - Line element
- RN.SVG.G - Group element
- RN.SVG.Text - Text element
- RN.SVG.Defs - Definitions element for gradients and patterns
- RN.SVG.LinearGradient - Linear gradient with multiple stops
- RN.SVG.RadialGradient - Radial gradient with multiple stops
- RN.SVG.Stop - Gradient stop with offset, color and opacity
- RN.SVG.ClipPath - For clipping other elements
- RN.SVG.Mask - For masking elements

SVG Best Practices:
- Use gradients for visual appeal
- Add accessibility attributes (accessible, accessibilityLabel)
- Make interactive elements with onPress handlers
- Use stroke-dasharray for dashed lines (e.g., "5,5")
- Implement proper error handling for SVG components

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

Example Components:
${examplesText}`
    };

    const messages = [systemPrompt];

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

export async function* streamComponent(analysis, currentComponentCode, selectedModel, abortController, apiKey) {
    console.log('streamComponent - selectedModel:', selectedModel);
    if (!selectedModel) {
        throw new Error('No model specified for component generation');
    }
    
    // Use the provided API key parameter
    if (!apiKey) {
        throw new Error('API key not provided. Please add your OpenRouter API key in the settings.');
    }

    const messages = await componentPrompt({ 
        isModifying: analysis.intent === 'modify', 
        currentComponentCode,
        widgetUrl: analysis.widgetUrl
    });

    let fullResponse = '';

    for await (const chunk of api.streamCompletion(apiKey, messages, {
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
