import React, { useState, useEffect, useCallback } from 'react';
import { UltravoxClient } from '../services/ultravox';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTrackVolume } from '@livekit/react-native';
import { analysisPrompt } from '../services/analysis';

export function useSpeechRecognition({ 
    onTranscription, 
    onAnalysis, 
    onError, 
    selectedModel, 
    selectedLanguage,
    componentHistory,
    currentHistoryIndex 
}) {
    const [client, setClient] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [partialResults, setPartialResults] = useState('');
    const [localTrack, setLocalTrack] = useState(null);

    // Use LiveKit's volume hook
    const volume = useTrackVolume(localTrack);

    useEffect(() => {
        const ultravoxClient = new UltravoxClient();
        
        ultravoxClient.onTranscript((transcript) => {
            if (transcript.isFinal) {
                onTranscription?.(transcript.text);
            } else {
                setPartialResults(transcript.text);
            }
        });

        ultravoxClient.onStatusChange((status) => {
            setIsListening(status === 'listening');
        });

        ultravoxClient.onTrackCreated((track) => {
            setLocalTrack(track);
        });

        setClient(ultravoxClient);

        return () => {
            ultravoxClient.disconnect();
        };
    }, []);

    const toggleListening = useCallback(async () => {
        try {
            if (isListening) {
                await client?.disconnect();
                setIsListening(false);
                setLocalTrack(null);
            } else {
                const ultravoxKey = await AsyncStorage.getItem('ultravox_api_key');
                if (!ultravoxKey) {
                    throw new Error('Ultravox API key not found');
                }

                const messages = analysisPrompt({
                    requestHistory: componentHistory?.map(entry => entry.request) || [],
                    currentParams: currentHistoryIndex >= 0 ? componentHistory[currentHistoryIndex]?.params : null
                });

                console.log('Creating Ultravox call...');
                const response = await fetch('https://api.ultravox.ai/api/calls', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': ultravoxKey
                    },
                    body: JSON.stringify({
                        model: 'fixie-ai/ultravox',  // Use Ultravox's default model
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
                        medium: { webRtc: {} },
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
                        headers: Object.fromEntries([...response.headers.entries()]),
                        error: errorText
                    });
                    throw new Error(`Ultravox API error: ${response.status} ${response.statusText}\n${errorText}`);
                }

                const responseData = await response.json();
                console.log('Ultravox response:', responseData);
                const { joinUrl } = responseData;
                await client?.joinCall(joinUrl);
                setIsListening(true);
            }
        } catch (error) {
            onError?.(error.message);
            setIsListening(false);
        }
    }, [isListening, client, selectedModel]);

    return {
        isListening,
        volume,
        partialResults,
        hasSpeechPermission: true, // Always true since we handle permissions in LiveKit
        toggleListening
    };
}
