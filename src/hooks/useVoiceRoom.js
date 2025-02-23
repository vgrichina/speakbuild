import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analysisPrompt } from '../services/analysis';
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
    const [isRecording, setIsRecording] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const ws = useRef(null);
    const [volume, setVolume] = useState(0);
    const audioBuffer = useRef([]);
    const isConnected = useRef(false);

    const cleanupWebSocket = useCallback(() => {
        console.log('Cleaning up WebSocket...');
        if (ws.current) {
            if (ws.current.readyState === WebSocket.OPEN) {
                ws.current.close();
            }
            ws.current = null;
        }
        isConnected.current = false;
    }, []);

    const cleanup = useCallback(() => {
        console.log('Full cleanup of voice room...');
        cleanupWebSocket();
        AudioRecord.stop();
        setIsRecording(false);
        setIsConnecting(false);
        setVolume(0);
        audioBuffer.current = [];
    }, [cleanupWebSocket]);

    useEffect(() => {
        return cleanup;
    }, [cleanup]);

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
        if (isConnecting || isRecording) {
            console.log('Already connecting or recording');
            return;
        }

        console.log('Starting recording flow...');

        try {
            // Check API keys BEFORE starting any recording
            const { ultravoxKey } = await checkApiKeys();
            if (!ultravoxKey) {
                throw new Error('Please set your Ultravox and OpenRouter API keys in settings');
            }

            // Only start recording if API keys are valid
            setIsRecording(true);
            console.log('Set isRecording to true');
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
                    languageHint: selectedLanguage,
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

            ws.current.onmessage = (event) => {
                // Store current WebSocket reference to check if it's still the active one
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
                    console.log('Received message:', msg);
                }

                // Handle agent transcripts
                if (msg.type === "transcript" && msg.role === "agent" && msg.final && msg.text) {
                    try {
                        // Parse the JSON response from the agent
                        const analysis = JSON.parse(msg.text);
                        // Stop recording first since we have the complete analysis
                        if (currentWs === ws.current) { // Only if this is still the active WebSocket
                            stopRecording();
                            // Then trigger component generation
                            onTranscription?.(analysis);
                        }
                    } catch (error) {
                        console.error('Error parsing transcript:', error);
                        if (currentWs === ws.current) {
                            onError?.('Failed to parse transcript');
                            stopRecording();
                        }
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
                    if (isRecording) {
                        onError?.('Connection error');
                        stopRecording();
                    }
                }
            };

            ws.current.onclose = () => {
                // Only handle close if this is still the active WebSocket
                if (ws.current) {
                    console.log('WebSocket connection closed normally');
                    // Don't trigger cleanup if we're already in a cleanup state
                    if (isRecording) {
                        cleanup();
                    }
                }
            };

        } catch (error) {
            console.error('Error starting recording:', error);
            onError?.(error.message);
            cleanup();
        }
    }, [componentHistory, currentHistoryIndex, selectedLanguage, onTranscription, cleanup]);

    const stopRecording = useCallback(() => {
        cleanup();
    }, [cleanup]);

    const cancelRecording = useCallback(() => {
        cleanup();
    }, [cleanup]);

    return {
        isRecording,
        volume,
        startRecording,
        stopRecording,
        cancelRecording
    };
}
