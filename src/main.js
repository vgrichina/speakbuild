import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import { widgetStorage } from './services/widgetStorage';

const analyzeRequest = async (text, controller, history, historyIndex) => {
    const currentApiKey = await AsyncStorage.getItem('openrouter_api_key');
    if (!currentApiKey) return null;

    try {
        const requestHistory = getRequestHistory(history, historyIndex);
        const response = await api.completion(
            currentApiKey,
            analysisPrompt({ text, requestHistory }),
            { 
                max_tokens: 200,
                model: 'anthropic/claude-3.5-haiku',
                abortController: controller
            }
        );

        // Extract just the JSON part from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON object found in response');
        }
        const parsedJson = JSON.parse(jsonMatch[0]);
        console.log(`Analysis << ${JSON.stringify(parsedJson)}`);
        return parsedJson;
    } catch (error) {
        console.error('Request analysis error:', error);
        throw error;
    }
};

const analysisPrompt = ({ text, requestHistory }) => {
    return [
        {
            role: 'system',
            content: `You are a JSON-only responder. Analyze the request and output a single JSON object with this exact structure:
{
    "intent": "modify" | "new",
    "widgetUrl": "string",
    "params": {}
}

Widget URL format:
category/type/variant?params=param1,param2,param3

The URL must include:
1. Base path: category/type/variant (identifies the widget type)
2. Query param 'params': comma-separated list of parameter names this widget accepts

Examples with explanations:
- display/text/single-line?params=text,color,font_size
  Text display widget that accepts text content, color, and font size parameters
- input/numeric/counter?params=initial_value,min,max,step
  Counter input that takes initial value, range limits, and increment step
- display/timer/countdown?params=duration,format,on_complete
  Countdown timer configurable with duration, time format, and completion action
- chart/bar/vertical?params=data,labels,colors
  Vertical bar chart that takes data points, axis labels, and custom colors

Rules:
- "intent" must be exactly "modify" or "new"
- "widgetUrl" must include both base path and params query parameter
- "params" object must only include values for parameters listed in URL
- Parameter names should be snake_case

Context - Previous requests:
                ${requestHistory.map(req => `- "${req}"`).join('\n')}

                DO NOT include any explanation or additional text.
                ONLY return the JSON object.`
        },
        {
            role: 'user',
            content: text
        }
    ];
};

const componentPrompt = ({ text, isModifying, currentComponentCode }) => {
    const messages = [];
    
    if (currentComponentCode) {
        messages.push({
            role: 'system',
            content: `Previous component code for reference:\n\`\`\`jsx\n${currentComponentCode}\n\`\`\`\nUse this as reference if the new request is similar or builds upon it.`
        });
    }

    messages.push({
        role: 'user',
        content: `${isModifying ? 
`Modify the existing component based on this request: "${text}". Use the existing code as context.` :
`Generate a React Native component based on this request: "${text}".`}
Return ONLY the component code using React.createElement.
Start with 'function Component(props) {'.

The component will receive the exact parameters specified in the URL as props.
For example, if URL is "display/text/single-line?params=text,color,font_size",
you must use:
- props.text - the text content
- props.color - the text color
- props.font_size - the font size

Do not use different parameter names than those specified in the URL.

Available APIs:
React Hooks:
Use hooks directly via React namespace (e.g., React.useState, React.useEffect)

React Native (RN namespace):
- Core UI: RN.View, RN.Text, RN.Image, RN.ScrollView, RN.TextInput
- Interaction: RN.Pressable, RN.TouchableOpacity, RN.Alert
- Device Features: RN.Vibration, RN.Share, RN.Platform
- Layout: RN.Dimensions.get('window') for screen size
- Animation: RN.Animated for smooth animations
- Appearance: RN.Appearance for dark/light mode

Expo Modules (Expo namespace):
- Expo.Haptics - vibration patterns and haptic feedback
- Expo.Clipboard - copy/paste functionality
- Expo.ImagePicker - select images from device
- Expo.MediaLibrary - access device media
- Expo.FileSystem - file operations
- Expo.Sharing - share content
- Expo.Location - geolocation services
- Expo.AV - audio/video playback
- Expo.Maps - map components and location services
- Expo.Reanimated - advanced animations
- Expo.Gesture - gesture handling
- Expo.Linking - deep linking and URL handling
- Expo.Sensors - device sensors:
  • Accelerometer - device motion data
Example patterns:
- Expo.Sensors.Accelerometer.isAvailableAsync().then(available => { ... })
- const subscription = Expo.Sensors.Accelerometer.addListener(data => { ... })
- Expo.Sensors.Accelerometer.setUpdateInterval(1000)
- subscription.remove()  // cleanup in useEffect
- RN.Share.share({ message: "Hello!" }).then(result => { ... })
- Expo.Clipboard.setString("text").then(() => { ... })

Avoid async/await - use .then() for promises.
Use React.useEffect for cleanup and subscriptions.

Example usage:
- RN.Vibration.vibrate() for haptic feedback
- RN.Share.share({ message: "Hello!" })
- RN.Alert.alert("Title", "Message")
- const { width, height } = RN.Dimensions.get('window')

Use React.useState for state management.
Use only React Native compatible styles (no web-specific CSS).
Do not include any explanation or markdown - just the pure JavaScript code.
The code should start directly with 'function Component() {'.
Start your response with \`\`\` and end with \`\`\`.

Example format:
\`\`\`
function Component(props) {
  const [count, setCount] = React.useState(props.initialValue || 0);

  const styles = {
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    button: {
      backgroundColor: props.color || '#3B82F6',
      padding: 16,
      borderRadius: 8
    },
    buttonText: {
      color: 'white'
    }
  };

  return React.createElement(
    RN.View,
    { style: styles.container },
    React.createElement(
      RN.TouchableOpacity,
      { style: styles.button, onPress: () => setCount(c => c + 1) },
      React.createElement(
        RN.Text,
        { style: styles.buttonText },
        props.title ? \`\${props.title}: \${count}\` : \`Count: \${count}\`
      )
    )
  );
}
\`\`\``
    });

    return messages;
};

import EventSource from 'react-native-sse';
import * as RN from 'react-native';
import { StyleSheet, View, Text, TextInput, ScrollView, Pressable, Animated, TouchableOpacity } from 'react-native';
import { ViewCode } from './components/ViewCode';
import { SettingsModal } from './components/SettingsModal';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Mic, MicOff, Radio, Loader2, Settings, Square, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { ExpoModules } from './expo-modules';
import AsyncStorage from '@react-native-async-storage/async-storage';


const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  navButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 2,
  },
  buttonPressed: {
    backgroundColor: '#e5e5e5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  voiceButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButtonListening: {
    backgroundColor: '#EF4444',
  },
  transcriptionBox: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  heading: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 56,
   overflow: 'visible',
  },
  debugMenu: {
    position: 'absolute',
    right: 8,
    top: 48,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 150,
    zIndex: 1002,
  },
  menuItem: {
    padding: 12,
    borderRadius: 4,
  },
  menuItemText: {
    color: '#666',
    fontSize: 14,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 24,
    left: '50%',
    transform: [{ translateX: -24 }],
    zIndex: 1000,
  }
});



const Alert = ({ children, variant }) => (
    <View style={{
        padding: 16,
        borderRadius: 8,
        backgroundColor: variant === 'destructive' ? '#FEE2E2' : '#DBEAFE',
    }}>
        {children}
    </View>
);

const AlertDescription = ({ children }) => (
    <Text style={{ fontSize: 14 }}>{children}</Text>
);

const PulsatingCircle = ({ isActive, volume }) => {
    const animation = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        if (isActive) {
            // Scale based on volume (1.0 to 1.5)
            const targetScale = 1 + (volume * 0.5);
            Animated.spring(animation, {
                toValue: targetScale,
                friction: 3,
                tension: 40,
                useNativeDriver: true,
            }).start();
        } else {
            animation.setValue(1);
        }
    }, [isActive, volume]);

    if (!isActive) return null;

    return (
        <Animated.View
            style={{
                position: 'absolute',
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: '#EF4444',
                opacity: 0.3,
                transform: [{ scale: animation }],
            }}
        />
    );
};

const VoiceButton = ({ isListening, onClick, disabled, volume, isGenerating, onStopGeneration }) => {
    const [isPressed, setIsPressed] = useState(false);

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            {!isGenerating && <PulsatingCircle isActive={isListening} volume={volume} />}
            <Pressable
                onPress={isGenerating ? onStopGeneration : onClick}
                onPressIn={() => setIsPressed(true)}
                onPressOut={() => setIsPressed(false)}
                disabled={disabled}
                style={[
                    {
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isGenerating ? '#EF4444' : (isListening ? '#EF4444' : '#3B82F6'),
                        transform: [{ scale: isPressed ? 0.95 : 1 }],
                    },
                    disabled && { opacity: 0.5 }
                ]}
            >
                {isGenerating ? 
                    <Square size={24} color="white" /> :
                    (isListening ? 
                        <MicOff size={32} color="white" /> : 
                        <Mic size={32} color="white" />
                    )
                }
            </Pressable>
            <Text style={{ 
                marginTop: 8,
                color: (isGenerating || isListening) ? '#EF4444' : '#666',
                fontSize: 12 
            }}>
                {isGenerating ? 'Stop generating' : (isListening ? 'Tap to stop' : 'Tap to speak')}
            </Text>
        </View>
    );
};

export const VoiceAssistant = () => {
    const scrollViewRef = React.useRef(null);
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [modificationIntent, setModificationIntent] = useState(null); // 'modify' or 'new'
    const abortControllerRef = React.useRef(null);

    useEffect(() => {
        // Cleanup function to abort any ongoing streams when component unmounts
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const loadSettings = async () => {
            const [currentApiKey, savedLanguage, savedModel] = await Promise.all([
                AsyncStorage.getItem('openrouter_api_key'),
                AsyncStorage.getItem('recognition_language'),
                AsyncStorage.getItem('selected_model')
            ]);
            
            // Load saved preferences even if no API key
            if (savedLanguage) {
                setSelectedLanguage(savedLanguage);
            }
            if (savedModel) {
                setSelectedModel(savedModel);
            }
            
            // Show settings modal if no API key
            if (!currentApiKey) {
                setIsSettingsOpen(true);
            }
        };
        loadSettings();
    }, []);
    const [partialResults, setPartialResults] = useState('');
    const [transcribedText, setTranscribedText] = useState('');
    const [responseStream, setResponseStream] = useState('');
    const [error, setError] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('en-US');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [selectedModel, setSelectedModel] = useState('anthropic/claude-3.5-sonnet');

    // Load API key from AsyncStorage on mount
    useEffect(() => {
        const loadApiKey = async () => {
            const savedKey = await AsyncStorage.getItem('openrouter_api_key');
            if (savedKey) {
                setApiKey(savedKey);
            }
        };
        loadApiKey();
    }, []);
    const [textInput, setTextInput] = useState('');
    const [currentComponent, setCurrentComponent] = useState(null);
    const [currentComponentCode, setCurrentComponentCode] = useState('');
    const [showSourceCode, setShowSourceCode] = useState(false);
    const [showDebugMenu, setShowDebugMenu] = useState(false);
    const [componentHistory, setComponentHistory] = useState([]);
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
    const spinValue = React.useRef(new RN.Animated.Value(0)).current;

    React.useEffect(() => {
        if (isProcessing) {
            Animated.loop(
                Animated.timing(spinValue, {
                    toValue: 1,
                    duration: 1000,
                    easing: RN.Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            spinValue.setValue(0);
        }
    }, [isProcessing]);

    const [isSpeechListening, setIsSpeechListening] = useState(false);
    const [speechVolume, setSpeechVolume] = useState(0);
    const [speechPartialResults, setSpeechPartialResults] = useState('');
    const [hasSpeechPermission, setHasSpeechPermission] = useState(false);

    useEffect(() => {
        const checkPermissions = async () => {
            const result = await ExpoSpeechRecognitionModule.getPermissionsAsync();
            if (result.granted) {
                setHasSpeechPermission(true);
            } else if (result.canAskAgain) {
                const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
                setHasSpeechPermission(granted);
            }
        };
        checkPermissions();
    }, []);

    // Speech recognition event handlers
    useSpeechRecognitionEvent("start", () => setIsSpeechListening(true));
    useSpeechRecognitionEvent("end", () => {
        setIsSpeechListening(false);
        setSpeechVolume(0);
    });

    useSpeechRecognitionEvent("result", (event) => {
        if (event.results?.[0]) {
            if (event.isFinal) {
                setTranscribedText(event.results[0].transcript);
                processWithClaudeStream(event.results[0].transcript);
                setSpeechVolume(0);
            } else {
                setSpeechPartialResults(event.results[0].transcript);
            }
        }
    });

    useSpeechRecognitionEvent("volumechange", (event) => {
        if (typeof event.value === 'number') {
            const normalizedVolume = Math.max(0, Math.min(1, (event.value + 2) / 12));
            setSpeechVolume(normalizedVolume);
        }
    });

    useSpeechRecognitionEvent("error", (event) => {
        setError(`Recognition error: ${event.error}`);
        setIsSpeechListening(false);
    });




    const stopGeneration = () => {
        const controller = abortControllerRef.current;
        if (controller) {
            controller.abort();
            abortControllerRef.current = null;
            setIsProcessing(false);
        }
    };

    const processWithClaudeStream = async (text) => {
        // Abort any existing stream
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        // Create new AbortController for this stream
        const currentController = new AbortController();
        abortControllerRef.current = currentController;
        
        const currentApiKey = await AsyncStorage.getItem('openrouter_api_key');
        if (!currentApiKey) {
            setError('Please set your OpenRouter API key in settings');
            setIsSettingsOpen(true);
            return;
        }

        setIsProcessing(true);
        setResponseStream('');

        try {
            // Analyze the request
            const analysis = await analyzeRequest(text, currentController, componentHistory, currentHistoryIndex);
            if (!analysis) {
                throw new Error('Failed to analyze request');
            }

            // Check cache for matching widget
            const cachedWidget = await widgetStorage.find(analysis.widgetUrl);
            if (cachedWidget) {
                console.log('Found cached widget:', analysis.widgetUrl);
                try {
                    // Create and execute the function with React and RN components in scope
                    const createComponent = new Function(cachedWidget.code);
                    const GeneratedComponent = createComponent(React, RN, ExpoModules);

                    // Update history and current state
                    const newHistory = componentHistory.slice(0, currentHistoryIndex + 1);
                    const newHistoryEntry = {
                        component: GeneratedComponent,
                        code: cachedWidget.code,
                        request: text,
                        params: analysis.params || {}
                    };
                    
                    console.log('Updating history for cached widget:', {
                        previousLength: newHistory.length,
                        newLength: newHistory.length + 1,
                        truncatedAt: currentHistoryIndex + 1,
                        params: newHistoryEntry.params
                    });
                    setComponentHistory([...newHistory, newHistoryEntry]);
                    setCurrentHistoryIndex(currentHistoryIndex + 1);
                    setCurrentComponent(() => GeneratedComponent);
                    setCurrentComponentCode(cachedWidget.code);
                    setError('');
                    setTranscribedText('');
                    setIsProcessing(false);
                    setModificationIntent(null);
                    return;
                } catch (error) {
                    console.error('Error creating component from cache:', error);
                    // Continue with API call if cache processing fails
                }
            }

            setModificationIntent(analysis.intent);
            console.log('Making OpenRouter API request...');
            
            const processCompleteResponse = (response) => {
                try {
                    console.log('Full response:', response);

                    // Extract code from markdown code block with more flexible pattern
                    const codeMatch = response.match(/```(?:jsx|javascript|)?\s*([\s\S]*?)```/);
                    if (!codeMatch) {
                        console.error('Response content:', response);
                        throw new Error('No code block found in response');
                    }
                    const code = codeMatch[1].trim();
                    console.log(`Component << ${code}`);

                    if (!code.includes('function Component(props)')) {
                        throw new Error('Invalid component code format - must use function Component(props)');
                    }

                    // Create component function with proper scope access
                    const componentCode = `
                        const React = arguments[0];
                        const RN = arguments[1];
                        const Expo = arguments[2];
                        const { useState } = React;
                        ${code}
                        return Component;
                    `;

                    // Create and execute the function with React and RN components in scope
                    const createComponent = new Function(componentCode);
                    const GeneratedComponent = createComponent(React, RN, ExpoModules);

                    // If we're not at the latest point in history, clear alternative future
                    const newHistory = componentHistory.slice(0, currentHistoryIndex + 1);
                    const newHistoryEntry = {
                        component: GeneratedComponent,
                        code: code,
                        request: text,
                        params: analysis.params || {}
                    };
                    
                    // Cache the new widget with processed component code
                    widgetStorage.store(analysis.widgetUrl, GeneratedComponent, componentCode)
                        .then(() => {
                            // Update history and current state
                            console.log('Updating history for new component:', {
                                previousLength: newHistory.length,
                                newLength: newHistory.length + 1,
                                truncatedAt: currentHistoryIndex + 1,
                                params: newHistoryEntry.params
                            });
                            setComponentHistory([...newHistory, newHistoryEntry]);
                            setCurrentHistoryIndex(currentHistoryIndex + 1);
                            setCurrentComponent(() => GeneratedComponent);
                            setCurrentComponentCode(code);
                        })
                        .catch(error => {
                            console.error('Widget storage error:', error);
                        });
                    
                    // Clear other states
                    setError('');
                    setTranscribedText('');

                } catch (error) {
                    console.error('Error creating component:', error);
                    setError(`Failed to create component: ${error.message}`);
                } finally {
                    setIsProcessing(false);
                    setModificationIntent(null);
                }
            };

            const messages = componentPrompt({ text, isModifying: analysis.intent === 'modify', currentComponentCode });
            
            try {
                for await (const { content, fullResponse, done } of api.streamCompletion(currentApiKey, messages, {
                    abortController: currentController,
                    model: selectedModel
                })) {
                    // Early exit if aborted
                    if (currentController?.signal.aborted) break;

                    if (content) {
                        setResponseStream(prev => prev + content);
                    }
                    if (done) {
                        processCompleteResponse(fullResponse);
                    }
                }
            } catch (error) {
                console.error('Stream error:', error);
                if (error.message === 'Stream aborted') {
                    // Clear response stream when aborted
                    setResponseStream('');
                } else {
                    setError(`Stream error: ${error.message}`);
                }
                setIsProcessing(false);
            }
        } catch (error) {
            console.error('API call error:', error);
            if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
                setError('Network error: Please check your internet connection');
            } else {
                setError(`Error: ${error.message}`);
            }
            setIsProcessing(false);
        }
    };

    const toggleListening = useCallback(async () => {
        try {
            if (isSpeechListening) {
                await ExpoSpeechRecognitionModule.stop();
            } else {
                setSpeechPartialResults('');
                setTranscribedText('');
                setResponseStream('');
                await ExpoSpeechRecognitionModule.start({
                    lang: selectedLanguage,
                    interimResults: true,
                    maxAlternatives: 1,
                    volumeChangeEventOptions: {
                        enabled: true,
                        intervalMillis: 300
                    }
                });
            }
        } catch (error) {
            setError(`Toggle error: ${error.message}`);
        }
    }, [isSpeechListening, selectedLanguage]);

    const handleTextSubmit = (e) => {
        e.preventDefault();
        if (!textInput.trim()) return;

        setTranscribedText(textInput);
        processWithClaudeStream(textInput);
        setTextInput('');
    };

    return (
        <View style={styles.container}>
            {/* Header with Navigation, Settings and Debug Menu */}
            <View style={styles.compactHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Pressable
                        onPress={() => setIsSettingsOpen(true)}
                        style={{
                            padding: 12,
                            marginLeft: -8,
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}
                    >
                        <Settings size={24} color="#666" />
                    </Pressable>

                    {currentComponent && (
                        <View style={{ flexDirection: 'row', marginLeft: 8 }}>
                            <Pressable
                                onPress={() => {
                                    if (currentHistoryIndex > 0) {
                                        const newIndex = currentHistoryIndex - 1;
                                        const previousEntry = componentHistory[newIndex];
                                        console.log('Moving back in history:', {
                                            fromIndex: currentHistoryIndex,
                                            toIndex: newIndex,
                                            params: previousEntry.params
                                        });
                                        setCurrentHistoryIndex(newIndex);
                                        setCurrentComponent(() => previousEntry.component);
                                        setCurrentComponentCode(previousEntry.code);
                                        setTranscribedText('');
                                        setResponseStream('');
                                        stopGeneration();
                                    }
                                }}
                                disabled={currentHistoryIndex <= 0}
                                style={({ pressed }) => [
                                    styles.navButton,
                                    currentHistoryIndex <= 0 && styles.buttonDisabled,
                                    pressed && styles.buttonPressed
                                ]}
                            >
                                <ArrowLeft size={20} color={currentHistoryIndex <= 0 ? '#999' : '#666'} />
                            </Pressable>
                            
                            <Pressable
                                onPress={() => {
                                    if (currentHistoryIndex < componentHistory.length - 1) {
                                        const newIndex = currentHistoryIndex + 1;
                                        const nextEntry = componentHistory[newIndex];
                                        console.log('Moving forward in history:', {
                                            fromIndex: currentHistoryIndex,
                                            toIndex: newIndex,
                                            params: nextEntry.params
                                        });
                                        setCurrentHistoryIndex(newIndex);
                                        setCurrentComponent(() => nextEntry.component);
                                        setCurrentComponentCode(nextEntry.code);
                                        setTranscribedText('');
                                        setResponseStream('');
                                        stopGeneration();
                                    }
                                }}
                                disabled={currentHistoryIndex >= componentHistory.length - 1}
                                style={({ pressed }) => [
                                    styles.navButton,
                                    currentHistoryIndex >= componentHistory.length - 1 && styles.buttonDisabled,
                                    pressed && styles.buttonPressed
                                ]}
                            >
                                <ArrowRight size={20} color={currentHistoryIndex >= componentHistory.length - 1 ? '#999' : '#666'} />
                            </Pressable>
                        </View>
                    )}
                </View>

                {currentComponent && (
                    <View style={{ overflow: 'visible' }}>
                        <Pressable
                            onPress={() => setShowDebugMenu(!showDebugMenu)}
                            style={{
                                padding: 12,
                                marginRight: -8,
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#666', fontSize: 24, lineHeight: 24, height: 32, textAlignVertical: 'center' }}>⋮</Text>
                        </Pressable>
                        {showDebugMenu && (
                            <View style={styles.debugMenu}>
                                <Pressable
                                    style={styles.menuItem}
                                    onPress={() => {
                                        setShowSourceCode(!showSourceCode);
                                        setShowDebugMenu(false);
                                    }}
                                >
                                    <Text style={styles.menuItemText}>
                                        {showSourceCode ? 'Hide source' : 'View source'}
                                    </Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: '#eee' }]}
                                    onPress={async () => {
                                        await AsyncStorage.clear();
                                        setComponentHistory([]);
                                        setCurrentHistoryIndex(-1);
                                        setCurrentComponent(null);
                                        setCurrentComponentCode('');
                                        setShowDebugMenu(false);
                                        RN.Alert.alert('Storage cleared', 'All cached data has been removed');
                                    }}
                                >
                                    <Text style={[styles.menuItemText, { color: '#EF4444' }]}>
                                        Clear storage
                                    </Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                )}
            </View>

            {/* Floating Voice/Stop Button */}
            <View style={styles.floatingButtonContainer}>
                <VoiceButton
                    isListening={isSpeechListening}
                    onClick={toggleListening}
                    disabled={!hasSpeechPermission && !isProcessing}
                    volume={speechVolume}
                    isGenerating={isProcessing}
                    onStopGeneration={stopGeneration}
                />
            </View>

            {/* Text Input */}
            {!hasSpeechPermission && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={textInput}
                        onChangeText={setTextInput}
                        placeholder="Type your message here..."
                    />
                    <Pressable
                        style={styles.button}
                        onPress={handleTextSubmit}
                        disabled={!textInput.trim() || isProcessing}
                    >
                        <Text style={styles.buttonText}>Send</Text>
                    </Pressable>
                </View>
            )}

            {/* Live Transcription */}
            {isSpeechListening && speechPartialResults && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <Radio size={16} color="#EF4444" />
                    <Text style={{ marginLeft: 8, fontStyle: 'italic', color: '#666' }}>
                        {speechPartialResults}
                    </Text>
                </View>
            )}

            {/* Final Transcription */}
            {(() => {
                const requestHistory = getRequestHistory(componentHistory, currentHistoryIndex);
                return (transcribedText || requestHistory.length > 0) && (
                <View style={styles.transcriptionBox}>
                    {requestHistory.map((request, index) => (
                        <Text key={index} style={{ 
                            color: '#999',
                            fontSize: 14,
                            marginBottom: 4
                        }}>
                            {request}
                        </Text>
                    ))}
                    {transcribedText && (
                        <Text style={{ 
                            color: '#333',
                            fontSize: 14
                        }}>
                            {transcribedText}
                        </Text>
                    )}
                </View>
                );
            })()}

            {/* Response Stream */}
            {(responseStream || isProcessing) && (!currentComponent || isProcessing) && (
                <View style={[
                    styles.transcriptionBox, 
                    { 
                        backgroundColor: '#EBF8FF',
                        flex: 1,
                        marginBottom: 16
                    }
                ]}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={styles.heading}>
                                {modificationIntent === 'modify' ? 'Modifying Component:' : 
                                 modificationIntent === 'new' ? 'Creating New Component:' : 
                                 'Response:'}
                            </Text>
                            {isProcessing && (
                                <Animated.View
                                    style={{
                                        marginLeft: 8,
                                        transform: [{
                                            rotate: spinValue.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0deg', '360deg']
                                            })
                                        }]
                                    }}
                                >
                                    <Loader2 
                                        size={16} 
                                        color={modificationIntent === 'modify' ? '#EF4444' : 
                                              modificationIntent === 'new' ? '#3B82F6' : 
                                              '#666'} 
                                    />
                                </Animated.View>
                            )}
                        </View>
                        <ScrollView 
                            style={{ flex: 1 }}
                            ref={scrollViewRef => {
                                if (scrollViewRef) {
                                    scrollViewRef.scrollToEnd({ animated: true });
                                }
                            }}
                            onContentSizeChange={() => {
                                if (scrollViewRef.current) {
                                    scrollViewRef.current.scrollToEnd({ animated: true });
                                }
                            }}
                        >
                            <Text>{responseStream}</Text>
                        </ScrollView>
                    </View>
                </View>
            )}

            {/* Error Display */}
            {error && (
                <View style={[styles.transcriptionBox, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={{ color: '#DC2626' }}>{error}</Text>
                </View>
            )}

            {/* Settings Modal */}
            <SettingsModal 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                apiKey={apiKey}
                selectedLanguage={selectedLanguage}
                selectedModel={selectedModel}
                onSave={async (newKey, newLanguage, newModel) => {
                    await AsyncStorage.setItem('openrouter_api_key', newKey);
                    setApiKey(newKey);
                    setSelectedLanguage(newLanguage);
                    setSelectedModel(newModel);
                    setError(''); // Clear any previous API key errors
                }}
            />


            {/* Current Generated Component */}
            {currentComponent && !isProcessing && (
                <View style={{ flex: 1, minHeight: 200, width: '100%' }}>
                    <View style={{ 
                        backgroundColor: 'white',
                        flex: 1
                    }}>
                        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                            {(() => {
                                const params = (currentHistoryIndex >= 0 && componentHistory[currentHistoryIndex]?.params) || {};
                                console.log('Rendering component with params:', params);
                                return React.createElement(currentComponent, params);
                            })()}
                        </ScrollView>
                    </View>
                    <ViewCode 
                        isVisible={showSourceCode}
                        onClose={() => setShowSourceCode(false)}
                        code={currentComponentCode}
                    />
                </View>
            )}
        </View>
    );
};
    // Stateless helper function to compute request history
    const getRequestHistory = (history, currentIndex) => {
        if (!Array.isArray(history) || typeof currentIndex !== 'number' || currentIndex < 0) {
            return [];
        }
        return history
            .slice(0, currentIndex + 1)
            .filter(entry => entry && entry.request)
            .map(entry => entry.request);
    };
