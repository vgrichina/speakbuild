import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analysisPrompt } from '../services/analysis';
import AudioRecord from 'react-native-audio-record';
import { PermissionsAndroid, Platform } from 'react-native';

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
    selectedModel, 
    selectedLanguage,
    componentHistory,
    currentHistoryIndex 
}) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const ws = useRef(null);
    const [volume, setVolume] = useState(0);

    useEffect(() => {
        const init = async () => {
            if (Platform.OS === 'android') {
                try {
                    const granted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                        {
                            title: 'Microphone Permission',
                            message: 'App needs access to your microphone',
                            buttonNeutral: 'Ask Me Later',
                            buttonNegative: 'Cancel',
                            buttonPositive: 'OK',
                        },
                    );
                    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                        onError('Microphone permission denied');
                    }
                } catch (err) {
                    console.error('Failed to request permission:', err);
                    onError('Failed to request microphone permission');
                }
            }
            
            AudioRecord.init(options);
            
            AudioRecord.on('data', data => {
                if (ws.current?.readyState === WebSocket.OPEN) {
                    ws.current.send(data);
                }
                
                // Calculate volume from PCM data
                const pcmData = new Int16Array(data);
                let sum = 0;
                for (let i = 0; i < pcmData.length; i++) {
                    sum += Math.abs(pcmData[i]);
                }
                const average = sum / pcmData.length;
                const normalizedVolume = Math.min(average / 32768, 1);
                setVolume(normalizedVolume);
            });
        };

        init();
        return () => AudioRecord.stop();
    }, []);

    const startRecording = useCallback(async () => {
        try {
            const ultravoxKey = await AsyncStorage.getItem('ultravox_api_key');
            if (!ultravoxKey) {
                throw new Error('Ultravox API key not found');
            }

            const messages = analysisPrompt({
                requestHistory: componentHistory?.map(entry => entry.request) || [],
                currentParams: currentHistoryIndex >= 0 ? componentHistory[currentHistoryIndex]?.params : null
            });

            const response = await fetch('https://api.ultravox.ai/api/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': ultravoxKey
                },
                body: JSON.stringify({
                    model: 'fixie-ai/ultravox',
                    languageHint: selectedLanguage,
                    initialMessages: messages,
                    audioConfig: {
                        sampleRate: options.sampleRate,
                        channels: options.channels,
                        bitsPerSample: options.bitsPerSample
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to start stream: ${response.status}`);
            }

            const { streamUrl } = await response.json();
            ws.current = new WebSocket(streamUrl);
            
            ws.current.onopen = () => {
                setIsRecording(true);
                AudioRecord.start();
            };

            ws.current.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.transcription) {
                    onTranscription?.(msg.transcription);
                }
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                onError?.('Connection error');
                stopRecording();
            };

            ws.current.onclose = () => {
                console.log('WebSocket connection closed');
                stopRecording();
            };

        } catch (error) {
            console.error('Error starting recording:', error);
            onError?.(error.message);
            stopRecording();
        }
    }, [componentHistory, currentHistoryIndex, selectedLanguage]);

    const stopRecording = useCallback(() => {
        AudioRecord.stop();
        setIsRecording(false);
        setVolume(0);
        
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.close();
        }
        ws.current = null;
    }, []);

    return {
        isRecording,
        isProcessing,
        volume,
        startRecording,
        stopRecording
    };
}
