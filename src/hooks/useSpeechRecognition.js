import { useState, useEffect, useCallback } from 'react';
import * as SpeechRecognition from 'expo-speech-recognition';

export const useSpeechRecognition = (language = 'en-US') => {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState('');
    const [partialResults, setPartialResults] = useState('');
    const [finalResult, setFinalResult] = useState('');
    const [isAvailable, setIsAvailable] = useState(false);

    useEffect(() => {
        const checkAvailability = async () => {
            try {
                const available = await SpeechRecognition.isAvailableAsync();
                setIsAvailable(available);
                
                if (available) {
                    const { granted } = await SpeechRecognition.requestPermissionsAsync();
                    if (!granted) {
                        setError('Microphone permission not granted');
                    }
                }
            } catch (e) {
                setError(`Speech recognition error: ${e.message}`);
            }
        };
        
        checkAvailability();
    }, []);

    const startListening = useCallback(async () => {
        try {
            setPartialResults('');
            setFinalResult('');
            setError('');

            await SpeechRecognition.startListeningAsync(
                {
                    language,
                    partialResults: true,
                    onPartialResults: ({ value }) => {
                        if (value && value[0]) {
                            setPartialResults(value[0]);
                        }
                    },
                    onResults: ({ value }) => {
                        if (value && value[0]) {
                            setFinalResult(value[0]);
                        }
                        setIsListening(false);
                    },
                    onError: (error) => {
                        setError(`Recognition error: ${error}`);
                        setIsListening(false);
                    }
                }
            );
            setIsListening(true);
        } catch (e) {
            setError(`Failed to start listening: ${e.message}`);
        }
    }, [language]);

    const stopListening = useCallback(async () => {
        try {
            await SpeechRecognition.stopListeningAsync();
            setIsListening(false);
        } catch (e) {
            setError(`Failed to stop listening: ${e.message}`);
        }
    }, []);

    return {
        isListening,
        startListening,
        stopListening,
        partialResults,
        finalResult,
        error,
        isAvailable
    };
};
