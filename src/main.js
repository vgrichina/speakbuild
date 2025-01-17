import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, Pressable, Modal, Linking } from 'react-native';
import { Mic, MicOff, Radio, Loader2, Settings, Key } from 'lucide-react-native';

const styles = StyleSheet.create({
  container: {
    padding: 16,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    shadowColor: '#000',
    shadowOffset: {
        width: 0,
        height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  linkText: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  linkText: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  errorText: {
    color: '#EF4444',
  }
});

// Settings modal component
const SettingsModal = ({ isOpen, onClose, apiKey, onSave }) => {
    const [key, setKey] = useState(apiKey);

    return (
        <Modal
            visible={isOpen}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Settings</Text>
                    <Pressable onPress={onClose}>
                        <Text style={{ fontSize: 24 }}>×</Text>
                    </Pressable>
                </View>
                
                <View style={{ gap: 16 }}>
                    <View style={{ gap: 8 }}>
                        <Text style={{ fontWeight: 'bold' }}>OpenRouter API Key</Text>
                        <TextInput
                            secureTextEntry
                            value={key}
                            onChangeText={setKey}
                            style={styles.input}
                            placeholder="sk-or-..."
                        />
                        <Pressable 
                            onPress={() => Linking.openURL('https://openrouter.ai/keys')}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                            <Key size={12} color="#3B82F6" />
                            <Text style={{ color: '#3B82F6' }}>Get your API key</Text>
                        </Pressable>
                    </View>
                    
                    <Text style={{ color: '#666' }}>
                        Using Claude as the default model for optimal results.
                    </Text>

                    <Pressable
                        style={[styles.button, !key && styles.buttonDisabled]}
                        onPress={() => {
                            if (key) {
                                onSave(key);
                                onClose();
                            }
                        }}
                        disabled={!key}
                    >
                        <Text style={styles.buttonText}>Save Settings</Text>
                    </Pressable>
                </View>
                </View>
            </View>
        </Modal>
    );
};

// Language options - common ones, can be expanded
const LANGUAGES = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'fr-FR', name: 'French' },
    { code: 'de-DE', name: 'German' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'ko-KR', name: 'Korean' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'ru-RU', name: 'Russian' }
];

const Alert = ({ children, variant }) => (
    <div className={`p-4 rounded-lg ${
        variant === 'destructive' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
    }`}>
        {children}
    </div>
);

const AlertDescription = ({ children }) => (
    <p className="text-sm">{children}</p>
);

const VoiceButton = ({ isListening, onClick, disabled }) => (
    <div className="relative">
        {isListening && (
            <>
                <div className="ripple ripple-1 w-16 h-16 text-red-500 opacity-50"></div>
                <div className="ripple ripple-2 w-16 h-16 text-red-500 opacity-50"></div>
                <div className="ripple ripple-3 w-16 h-16 text-red-500 opacity-50"></div>
            </>
        )}
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all relative z-10 ${
                isListening 
                    ? 'bg-red-500 hover:bg-red-600 pulsate' 
                    : 'bg-blue-500 hover:bg-blue-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {isListening ? 
                <MicOff size={32} color="white" /> : 
                <Mic size={32} color="white" />
            }
        </button>
    </div>
);

export const VoiceAssistant = () => {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const currentApiKey = localStorage.getItem('openrouter_api_key');
        if (!currentApiKey) {
            setIsSettingsOpen(true);
        }
    }, []);
    const [partialResults, setPartialResults] = useState('');
    const [transcribedText, setTranscribedText] = useState('');
    const [responseStream, setResponseStream] = useState('');
    const [error, setError] = useState('');
    const [recognition, setRecognition] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState('en-US');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [apiKey, setApiKey] = useState(localStorage.getItem('openrouter_api_key') || '');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [hasSpeechPermission, setHasSpeechPermission] = useState(true);
    const [currentComponent, setCurrentComponent] = useState(null);
    const [currentComponentCode, setCurrentComponentCode] = useState('');
    const [showSourceCode, setShowSourceCode] = useState(false);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();
            
            recognitionInstance.continuous = false;
            recognitionInstance.interimResults = true;
            recognitionInstance.lang = selectedLanguage;
            
            recognitionInstance.onstart = () => {
                setIsListening(true);
                setError('');
            };

            recognitionInstance.onend = () => {
                setIsListening(false);
            };

            recognitionInstance.onresult = (event) => {
                const last = event.results.length - 1;
                const transcript = event.results[last][0].transcript;
                
                if (event.results[last].isFinal) {
                    setTranscribedText(transcript);
                    processWithClaudeStream(transcript);
                } else {
                    setPartialResults(transcript);
                }
            };

            recognitionInstance.onerror = (event) => {
                setError(`Speech recognition error: ${event.error}`);
                setIsListening(false);
                if (event.error === 'not-allowed') {
                    setHasSpeechPermission(false);
                }
            };

            setRecognition(recognitionInstance);
        } else {
            setError('Speech recognition is not supported in this browser.');
            setHasSpeechPermission(false);
        }
    }, [selectedLanguage]); // Recreate recognition instance when language changes

    const processWithClaudeStream = async (text) => {
        const currentApiKey = localStorage.getItem('openrouter_api_key');
        if (!currentApiKey) {
            setError(<>Please set your OpenRouter API key in <button onClick={() => setIsSettingsOpen(true)} className="text-blue-500 hover:text-blue-600 underline">settings</button></>);
            return;
        }

        setIsProcessing(true);
        setResponseStream('');
        
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentApiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'Voice Assistant Web App',
                },
                body: JSON.stringify({
                    model: 'anthropic/claude-3.5-sonnet',
                    messages: [
                        ...(currentComponentCode ? [{
                            role: 'system',
                            content: `Previous component code for reference:\n\`\`\`jsx\n${currentComponentCode}\n\`\`\`\nUse this as reference if the new request is similar or builds upon it.`
                        }] : []),
                        {
                            role: 'user',
                            content: `Generate a React component based on this request: "${text}".
                                     Return ONLY the component code using React.createElement (no JSX).
                                     Define the component as 'function Component() {' (no export statement).
                                     Use only inline styles (no Tailwind/CSS).
                                     Use React.useState for any state management.
                                     Do not include any explanation or markdown - just the pure JavaScript code.
                                     The code should start directly with 'function Component() {'.
                                     Start your response with \`\`\` and end with \`\`\`.
                                     
                                     Example format:
                                     \`\`\`
                                     function Component() {
                                       const [state, setState] = React.useState(null);
                                       return React.createElement('View', {
                                         style: { padding: 10 }
                                       }, 'Hello');
                                     }
                                     \`\`\``
                        }
                    ],
                    stream: true
                }),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let fullResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    
                    if (line === 'data: [DONE]') break;
                    
                    try {
                        const data = JSON.parse(line.slice(6));
                        const content = data.choices?.[0]?.delta?.content;
                        if (content) {
                            fullResponse += content;
                            setResponseStream(fullResponse);
                        }
                    } catch (e) {
                        console.error('Error parsing stream:', e);
                    }
                }
            }

            // After receiving complete response, try to create component
            try {
                console.log('Full response:', fullResponse);
                
                // Extract code from markdown code block
                const codeMatch = fullResponse.match(/```(?:jsx|javascript)?\n([\s\S]*?)```/);
                if (!codeMatch) {
                    throw new Error('No code block found in response');
                }
                const code = codeMatch[1].trim();
                console.log('Extracted code:', code);
                
                // Create component function with proper scope access
                const componentCode = `
                    const React = arguments[0];  // Pass React as first argument
                    ${code}
                    return Component;  // Return the component function
                `;
                
                // Create and execute the function with React in scope
                const createComponent = new Function(componentCode);
                const GeneratedComponent = createComponent(React);

                // Store the current component and its source code
                setCurrentComponent(() => GeneratedComponent);
                setCurrentComponentCode(code);

            } catch (error) {
                console.error('Error creating component:', error);
                setError(`Failed to create component: ${error.message}`);
            } finally {
                setIsProcessing(false);
            }
        } catch (error) {
            setError(`Error: ${error.message}`);
        }
    };

    const toggleListening = useCallback(() => {
        if (!recognition) return;
        
        try {
            if (isListening) {
                recognition.stop();
            } else {
                setPartialResults('');
                setTranscribedText('');
                setResponseStream('');
                recognition.start();
            }
        } catch (error) {
            setError(`Toggle error: ${error.message}`);
        }
    }, [recognition, isListening]);

    const handleTextSubmit = (e) => {
        e.preventDefault();
        if (!textInput.trim()) return;
        
        setTranscribedText(textInput);
        processWithClaudeStream(textInput);
        setTextInput('');
    };

    return (
        <View style={styles.container}>
            {/* Header with Settings and Language Controls */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => setIsSettingsOpen(true)}
                    style={styles.button}
                >
                    <Settings size={20} color="white" />
                    <Text style={styles.buttonText}>Settings</Text>
                </Pressable>
                
                {/* TODO: Replace select with a proper RN picker */}
                <TextInput
                    style={styles.input}
                    value={selectedLanguage}
                    onChangeText={setSelectedLanguage}
                />
            </View>

            {/* Voice Button */}
            {hasSpeechPermission && (
                <View style={{ alignItems: 'center' }}>
                    <Pressable
                        style={[
                            styles.voiceButton,
                            isListening && styles.voiceButtonListening
                        ]}
                        onPress={toggleListening}
                        disabled={!recognition}
                    >
                        {isListening ? 
                            <MicOff size={32} color="white" /> : 
                            <Mic size={32} color="white" />
                        }
                    </Pressable>
                </View>
            )}

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
            {isListening && partialResults && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <Radio size={16} color="#EF4444" />
                    <Text style={{ marginLeft: 8, fontStyle: 'italic', color: '#666' }}>
                        {partialResults}
                    </Text>
                </View>
            )}

            {/* Final Transcription */}
            {transcribedText && (
                <View style={styles.transcriptionBox}>
                    <Text style={styles.heading}>Transcribed:</Text>
                    <Text>{transcribedText}</Text>
                </View>
            )}

            {/* Response Stream */}
            {(responseStream || isProcessing) && (!currentComponent || isProcessing) && (
                <View style={[styles.transcriptionBox, { backgroundColor: '#EBF8FF' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={styles.heading}>Response:</Text>
                        {isProcessing && <Loader2 size={16} color="currentColor" />}
                    </View>
                    <ScrollView style={{ maxHeight: 300 }}>
                        <Text>{responseStream}</Text>
                    </ScrollView>
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
                onSave={(newKey) => {
                    setApiKey(newKey);
                    localStorage.setItem('openrouter_api_key', newKey);
                    setError(''); // Clear any previous API key errors
                }}
            />

            {/* Current Generated Component */}
            {currentComponent && !isProcessing && (
                <View style={{ marginTop: 16 }}>
                    <View style={[styles.transcriptionBox, { backgroundColor: 'white' }]}>
                        {React.createElement(currentComponent)}
                    </View>
                    <Pressable
                        onPress={() => setShowSourceCode(!showSourceCode)}
                        style={{ alignItems: 'center', marginTop: 8 }}
                    >
                        <Text style={{ color: '#3B82F6', textDecorationLine: 'underline' }}>
                            {showSourceCode ? 'Hide source' : 'View source'}
                        </Text>
                    </Pressable>
                    {showSourceCode && (
                        <View style={[styles.transcriptionBox, { backgroundColor: '#F9FAFB' }]}>
                            <ScrollView horizontal>
                                <Text style={{ fontFamily: 'monospace' }}>{currentComponentCode}</Text>
                            </ScrollView>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

