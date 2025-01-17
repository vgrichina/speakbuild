import { useState, useEffect, useCallback } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

export const useSpeechRecognition = (language = 'en-US') => {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState('');
    const [partialResults, setPartialResults] = useState('');
    const [finalResult, setFinalResult] = useState('');
    const [isAvailable, setIsAvailable] = useState(false);
    const [volume, setVolume] = useState(0);

    useEffect(() => {
        const checkAvailability = async () => {
            const available = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
            setIsAvailable(available);
            
            if (available) {
                const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
                if (!result.granted) {
                    setError('Microphone permission not granted');
                }
            }
        };
        
        checkAvailability();
    }, []);

    useSpeechRecognitionEvent("start", () => setIsListening(true));
    useSpeechRecognitionEvent("end", () => setIsListening(false));
    
    useSpeechRecognitionEvent("result", (event) => {
        if (event.results && event.results[0]) {
            if (event.isFinal) {
                setFinalResult(event.results[0].transcript);
                setVolume(0);
            } else {
                setPartialResults(event.results[0].transcript);
            }
        }
    });

    useSpeechRecognitionEvent("volumechange", (event) => {
        // Convert from -2...10 range to 0...1 range
        const normalizedVolume = Math.max(0, Math.min(1, (event.value + 2) / 12));
        setVolume(normalizedVolume);
    });

    useSpeechRecognitionEvent("error", (event) => {
        setError(`Recognition error: ${event.error}`);
        setIsListening(false);
    });

    const startListening = useCallback(async () => {
        try {
            setPartialResults('');
            setFinalResult('');
            setError('');

            await ExpoSpeechRecognitionModule.start({
                lang: language,
                interimResults: true,
                maxAlternatives: 1,
                volumeChangeEventOptions: {
                    enabled: true,
                    intervalMillis: 100
                }
            });
        } catch (e) {
            setError(`Failed to start listening: ${e.message}`);
        }
    }, [language]);

    const stopListening = useCallback(async () => {
        try {
            await ExpoSpeechRecognitionModule.stop();
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
        isAvailable,
        volume
    };
};
