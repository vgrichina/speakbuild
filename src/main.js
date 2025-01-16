const { useState, useEffect, useCallback } = React;
const { icons: { Mic, MicOff, Radio, Loader2, Settings, Key } } = lucide;

// Settings modal component
const SettingsModal = ({ isOpen, onClose, apiKey, onSave }) => {
    const [key, setKey] = useState(apiKey);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Settings</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
                </div>
                
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            OpenRouter API Key
                        </label>
                        <input
                            type="password"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="sk-or-..."
                        />
                        <a 
                            href="https://openrouter.ai/keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                        >
                            <svg width="12" height="12" className="text-current">
                                {Key.path}
                            </svg>
                            Get your API key
                        </a>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                        Using Claude as the default model for optimal results.
                    </div>

                    <button
                        onClick={() => {
                            onSave(key);
                            onClose();
                        }}
                        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
                    >
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
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
            <svg width="32" height="32" className="text-white">
                {isListening ? MicOff.path : Mic.path}
            </svg>
        </button>
    </div>
);

const VoiceAssistant = () => {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
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
            setError('Please set your OpenRouter API key in settings');
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
                                     Return ONLY a single JSX code block with an exported component.
                                     The component must be exported with 'export default function Component() {}'.
                                     Do not include any explanation, markdown, or other text - just the code block.
                                     The component should be self-contained and styled with Tailwind CSS.
                                     Start your response with \`\`\`jsx and end with \`\`\`.`
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
                
                // Transform the extracted JSX code
                const transformedCode = Babel.transform(code, {
                    presets: ['react']
                }).code;
                console.log('Transformed code:', transformedCode);
                // Create a data URI containing the transformed code
                const codeUri = `data:text/javascript;charset=utf-8,${encodeURIComponent(transformedCode)}`;

                // Dynamically import the code
                const module = await import(codeUri);
                console.log('Module:', module);
                const GeneratedComponent = module.default;

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
        <div className="p-4 max-w-2xl mx-auto space-y-4">
            {/* Header with Settings and Language Controls */}
            <div className="flex justify-between items-center gap-4 mb-4">
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2"
                    title="Settings"
                >
                    <svg width="20" height="20" className="text-current">
                        {Settings.path}
                    </svg>
                    <span className="text-sm">Settings</span>
                </button>
                <select 
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="block w-48 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                    {LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>
                            {lang.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Show voice button only if speech is permitted */}
            {hasSpeechPermission && (
                <div className="flex justify-center">
                    <VoiceButton
                        isListening={isListening}
                        onClick={toggleListening}
                        disabled={!recognition}
                    />
                </div>
            )}

            {/* Show text input only if speech is not permitted */}
            {!hasSpeechPermission && (
                <form onSubmit={handleTextSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Type your message here..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={!textInput.trim() || isProcessing}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Send
                    </button>
                </form>
            )}

            {/* Live Transcription */}
            {isListening && partialResults && (
                <div className="flex items-center space-x-2 text-gray-600">
                    <svg width="16" height="16" className="animate-pulse text-red-500">
                        {Radio.path}
                    </svg>
                    <p className="italic">{partialResults}</p>
                </div>
            )}

            {/* Final Transcription */}
            {transcribedText && (
                <div className="bg-gray-100 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Transcribed:</h3>
                    <p>{transcribedText}</p>
                </div>
            )}

            {/* Streaming Response - show while processing, hide when component is ready but not processing */}
            {(responseStream || isProcessing) && (!currentComponent || isProcessing) && (
                <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold">Response:</h3>
                        {isProcessing && (
                            <svg width="16" height="16" className="animate-spin">
                                {Loader2.path}
                            </svg>
                        )}
                    </div>
                    <div 
                        className="max-h-[300px] overflow-y-auto whitespace-pre-wrap" 
                        ref={el => {
                            if (el) {
                                el.scrollTop = el.scrollHeight;
                            }
                        }}
                    >
                        {responseStream}
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
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

            {/* Current Generated Component - hide while processing */}
            {currentComponent && !isProcessing && (
                <div className="space-y-2">
                    <div className="border rounded-lg p-4 shadow-sm">
                        {React.createElement(currentComponent)}
                    </div>
                    <div className="text-center">
                        <button 
                            onClick={() => setShowSourceCode(!showSourceCode)}
                            className="text-sm text-blue-500 hover:text-blue-600 underline"
                        >
                            {showSourceCode ? 'Hide source' : 'View source'}
                        </button>
                    </div>
                    {showSourceCode && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <pre className="text-sm overflow-x-auto">
                                <code>{currentComponentCode}</code>
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<VoiceAssistant />);
