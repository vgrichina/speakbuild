import React, { useState, useEffect, useCallback } from 'react';
import { UltravoxClient } from '../services/ultravox';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTrackVolume } from '@livekit/react-native';
import { SYSTEM_PROMPT } from '../services/analysis';

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

                await client?.createAndJoinCall(ultravoxKey, {
                    systemPrompt: SYSTEM_PROMPT.content,
                    model: selectedModel,
                    languageHint: selectedLanguage
                });
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
