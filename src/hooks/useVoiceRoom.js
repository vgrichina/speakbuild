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

            console.log('Creating Ultravox call...', {
                model: 'fixie-ai/ultravox',
                languageHint: selectedLanguage,
                initialMessages: messages.map(m => m.content)
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
                    error: errorText
                });
                throw new Error(`Failed to create call: ${response.status} ${response.statusText}\n${errorText}`);
            }

            const responseData = await response.json();
            console.log('Ultravox response:', responseData);
            
            const { joinUrl, token } = responseData;
            console.log('Setting room connection with:', { url: joinUrl, token });
            setRoomConnection({ url: joinUrl, token });
        } catch (error) {
            console.error('Error starting call:', error);
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
