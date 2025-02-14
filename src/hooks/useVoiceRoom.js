import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analysisPrompt } from '../services/analysis';

export function useVoiceRoom({ 
    onTranscription, 
    onError,
    selectedModel, 
    selectedLanguage,
    componentHistory,
    currentHistoryIndex 
}) {
    const [isConnecting, setIsConnecting] = useState(false);
    const [roomConnection, setRoomConnection] = useState(null);

    const startCall = useCallback(async () => {
        try {
            setIsConnecting(true);
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
                    medium: { webRtc: {} },
                    firstSpeaker: 'FIRST_SPEAKER_USER',
                    transcriptOptional: false,
                    recordingEnabled: false
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to create call: ${response.statusText}`);
            }

            const { joinUrl, token } = await response.json();
            setRoomConnection({ url: joinUrl, token });
        } catch (error) {
            onError?.(error.message);
        } finally {
            setIsConnecting(false);
        }
    }, [componentHistory, currentHistoryIndex, selectedLanguage]);

    const endCall = useCallback(() => {
        setRoomConnection(null);
    }, []);

    return {
        isConnecting,
        roomConnection,
        startCall,
        endCall
    };
}
