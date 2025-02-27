import { useState, useCallback, useRef, useEffect } from 'react';
import { storage, SETTINGS_KEY } from '../services/storage';
import { analysisPrompt } from '../services/analysis';
import { parse, STR, OBJ } from 'partial-json';
import { useGeneration } from '../contexts/GenerationContext';

const cleanJsonText = (text) => {
    return text.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
};
import { PERMISSIONS, request, check, RESULTS } from 'react-native-permissions';
import AudioRecord from 'react-native-audio-record';
import { Platform } from 'react-native';

const options = {
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    audioSource: 6,
    wavFile: 'audio.wav'
};

export function useVoiceRoom({ 
    onTranscription, 
    onError,
    selectedLanguage,
    componentHistory,
    currentHistoryIndex,
    checkApiKeys
}) {
    // Use the generation context directly
    const { 
        state: generationState, 
        startRecording: startGenerationRecording,
        stopRecording: stopGenerationRecording,
        handleError: handleGenerationError,
        setTranscribedText
    } = useGeneration();
    
    // Local refs and state that don't conflict with generation context
    const [isConnecting, setIsConnecting] = useState(false);
    const [partialResults, setPartialResults] = useState('');
    const ws = useRef(null);
    const [volume, setVolume] = useState(0);
    const audioBuffer = useRef([]);
    const isConnected = useRef(false);
    
    const cleanupWebSocket = useCallback(() => {
        console.log('Cleaning up WebSocket...', new Error().stack);
        if (ws.current) {
            if (ws.current.readyState === WebSocket.OPEN) {
                ws.current.close();
            }
            ws.current = null;
        }
        isConnected.current = false;
    }, []);

    const cleanup = useCallback(() => {
        console.log('Full cleanup of voice room...', new Error().stack);
        cleanupWebSocket();
        AudioRecord.stop();
        setIsConnecting(false);
        setVolume(0);
        audioBuffer.current = [];
    }, [cleanupWebSocket]);

    // Clean up when component unmounts
    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    // Clean up when recording state changes in generation context
    useEffect(() => {
        if (generationState.status !== 'RECORDING' && ws.current) {
            console.log('Cleaning up because generation state changed to:', generationState.status);
            cleanup();
        }
    }, [generationState.status, cleanup]);

    const checkPermission = async () => {
        try {
            const permission = Platform.select({
                ios: PERMISSIONS.IOS.MICROPHONE,
                android: PERMISSIONS.ANDROID.RECORD_AUDIO,
                default: null,
            });

            if (!permission) {
                throw new Error('Platform not supported');
            }

            const status = await check(permission);
            
            if (status === RESULTS.GRANTED) {
                return true;
            }

            // Request permission if not granted
            const result = await request(permission, {
                title: 'Microphone Permission',
                message: 'Voice Assistant needs access to your microphone to process voice commands.',
                buttonPositive: 'Grant Permission',
                buttonNegative: 'Cancel',
            });

            return result === RESULTS.GRANTED;
        } catch (err) {
            console.error('Permission check failed:', err);
            onError('Failed to check microphone permission');
            return false;
        }
    };

    useEffect(() => {
        const initAudio = async () => {
            const hasPermission = await checkPermission();
            if (!hasPermission) {
                onError('Microphone permission is required');
                return;
            }
            console.log('Initializing AudioRecord with options:', options);
            try {
                AudioRecord.init(options);
                console.log('AudioRecord initialized successfully');
            } catch (error) {
                console.error('AudioRecord initialization failed:', error);
                throw error;
            }
            
            AudioRecord.on('data', data => {
                // Decode base64 once
                const binaryString = atob(data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                // If connected, send immediately, otherwise buffer
                if (isConnected.current && ws.current?.readyState === WebSocket.OPEN) {
                    ws.current.send(bytes.buffer);
                } else {
                    audioBuffer.current.push(bytes.buffer);
                }
                
                // Calculate volume from PCM data
                const pcmData = new Int16Array(bytes.buffer);
                let sum = 0;
                for (let i = 0; i < pcmData.length; i++) {
                    sum += Math.abs(pcmData[i]);
                }
                const average = sum / pcmData.length;
                const normalizedVolume = Math.min(average / 32768, 1);
                
                setVolume(normalizedVolume);
            });
        };

        initAudio();
        return () => AudioRecord.stop();
    }, []);

    const startRecording = useCallback(async () => {
        if (isConnecting || generationState.status === 'RECORDING') {
            console.log('Already connecting or recording');
            return;
        }

        console.log('Starting recording flow...');

        try {
            // Check API keys BEFORE starting any recording
            const { ultravoxKey } = checkApiKeys();
            if (!ultravoxKey) {
                throw new Error('Please set your Ultravox and OpenRouter API keys in settings');
            }

            // Update the generation context state first
            startGenerationRecording();
            
            // Only start recording if API keys are valid
            console.log('Set recording state to true via generation context');
            AudioRecord.start();
            console.log('AudioRecord.start() called');

            // Create a new AbortController for this recording session
            const controller = new AbortController();

            setIsConnecting(true);

            const messages = analysisPrompt({ 
                text: '', // Empty since we're starting voice recording
                requestHistory: componentHistory?.map(entry => entry.request) || [],
                currentParams: currentHistoryIndex >= 0 ? componentHistory[currentHistoryIndex]?.params : null
            });

            const response = await fetch('https://api.ultravox.ai/api/calls', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': ultravoxKey
                },
                body: JSON.stringify({
                    model: 'fixie-ai/ultravox',
                    languageHint: selectedLanguage || 'en',
                    initialMessages: [
                        {
                            role: 'MESSAGE_ROLE_AGENT',
                            text: messages[0].content
                        },
                        {
                            role: 'MESSAGE_ROLE_USER',
                            text: messages[1].content
                        }
                    ],
                    initialOutputMedium: 'MESSAGE_MEDIUM_TEXT',
                    medium: { 
                        serverWebSocket: {
                            inputSampleRate: 16000,
                            outputSampleRate: 16000
                        }
                    },
                    firstSpeaker: 'FIRST_SPEAKER_USER',
                    transcriptOptional: false,
                    recordingEnabled: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ultravox API error:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                throw new Error(`Failed to create call: ${response.status} ${response.statusText}\n${errorText}`);
            }

            const { joinUrl } = await response.json();
            cleanupWebSocket(); // Only cleanup WebSocket before creating a new one
            ws.current = new WebSocket(joinUrl);
            
            ws.current.onopen = () => {
                console.log('WebSocket opened');
                setIsConnecting(false);
                isConnected.current = true;
                
                // Send buffered audio
                while (audioBuffer.current.length > 0) {
                    const buffer = audioBuffer.current.shift();
                    if (ws.current?.readyState === WebSocket.OPEN) {
                        ws.current.send(buffer);
                    }
                }
            };

            let accumulatedJson = '';
            
            ws.current.onmessage = (event) => {
                const currentWs = ws.current;
                
                if (!currentWs || currentWs.readyState !== WebSocket.OPEN) {
                    console.log('Skipping message - WebSocket not open');
                    return;
                }

                let msg;
                try {
                    msg = JSON.parse(event.data);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                    return;
                }
                
                // Only log non-audio messages
                if (msg.type !== 'audio') {
                    if (msg.final) {
                        console.log(`<< FINAL ${msg.role}: ${msg.text}`);
                    } else if (msg.delta) {
                        console.log(`<< ${msg.role}: ${msg.delta}`);
                    }
                }

                // Handle agent transcripts
                if (msg.type === "transcript" && msg.role === "agent") {
                    // Accumulate JSON text
                    if (msg.text) {
                        accumulatedJson = msg.text;
                    } else if (msg.delta) {
                        accumulatedJson += msg.delta;
                    }

                    // Only try parsing if we have some JSON structure
                    if (accumulatedJson.includes('"transcription"')) {
                        try {
                            // Clean the JSON text before parsing
                            const cleanedJson = cleanJsonText(accumulatedJson);
                            
                            // Try to parse partial JSON
                            const partialResult = parse(cleanedJson, STR | OBJ);
                            if (partialResult?.transcription) {
                                console.log('Setting partial results:', partialResult.transcription);
                                setPartialResults(partialResult.transcription);
                            }
                        } catch (error) {
                            // Ignore parsing errors for partial JSON
                            console.debug('Partial JSON parse error:', error);
                        }
                    }

                    // Handle final message
                    if (msg.final && accumulatedJson) {
                        try {
                            // Clean the JSON text before parsing
                            let jsonToProcess = cleanJsonText(accumulatedJson);
                            
                            // Try to fix common JSON issues
                            if (!jsonToProcess.endsWith('}')) {
                                jsonToProcess += '}';
                            }
                            
                            const analysis = JSON.parse(jsonToProcess);
                            
                            // Validate required fields
                            if (!analysis.transcription) {
                                throw new Error('Missing transcription field in response');
                            }
                            
                            if (currentWs === ws.current) {
                                stopRecording();
                                // Set transcribed text directly in the context
                                setTranscribedText(analysis.transcription);
                                onTranscription?.(analysis);
                            }
                        } catch (error) {
                            console.error('Error parsing final transcript:', error);
                            console.error('Raw JSON:', accumulatedJson);
                            if (currentWs === ws.current) {
                                onError?.('Failed to parse transcript');
                                stopRecording();
                            }
                        }
                        // Reset accumulated JSON
                        accumulatedJson = '';
                    }
                }
            };

            ws.current.onerror = (error) => {
                // Only handle error if this is still the active WebSocket
                if (ws.current) {
                    console.error('WebSocket error:', {
                        error,
                        errorStack: error.stack || new Error().stack,
                        wsState: ws.current?.readyState,
                        wsUrl: ws.current?.url
                    });
                    
                    // Don't call cleanup/stopRecording if we're already in a cleanup state
                    if (generationState.status === 'RECORDING') {
                        console.log('WebSocket error triggering stopRecording');
                        onError?.('Connection error');
                        stopRecording();
                    }
                }
            };

            ws.current.onclose = () => {
                // Only handle close if this is still the active WebSocket
                if (ws.current) {
                    console.log('WebSocket connection closed normally', new Error().stack);
                    // Don't trigger cleanup if we're already in a cleanup state
                    if (generationState.status === 'RECORDING') {
                        console.log('WebSocket close triggering cleanup while recording is active');
                        cleanup();
                        stopGenerationRecording(); // Update generation context
                    }
                }
            };

        } catch (error) {
            console.error('Error starting recording:', error);
            onError?.(error.message);
            handleGenerationError(error.message);
            cleanup();
        }
    }, [componentHistory, currentHistoryIndex, selectedLanguage, onTranscription, cleanup, startGenerationRecording, handleGenerationError]);

    const stopRecording = useCallback((transcribedText = '') => {
        console.log('stopRecording called', new Error().stack);
        cleanup();
        stopGenerationRecording(transcribedText);
    }, [cleanup, stopGenerationRecording]);

    const cancelRecording = useCallback(() => {
        console.log('cancelRecording called', new Error().stack);
        cleanup();
        stopGenerationRecording();
    }, [cleanup, stopGenerationRecording]);

    return {
        volume,
        startRecording,
        stopRecording,
        cancelRecording,
        partialResults
    };
}
