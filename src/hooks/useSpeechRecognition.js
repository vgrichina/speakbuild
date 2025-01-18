import { useState, useEffect, useCallback } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

export const useSpeechRecognition = (language = 'en-US') => {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState('');
    const [partialResults, setPartialResults] = useState('');
    const [finalResult, setFinalResult] = useState('');
    const [isAvailable, setIsAvailable] = useState(false);
    const [volume, setVolume] = useState(0);

    // Initial setup and permissions
    useEffect(() => {
        const checkAvailability = async () => {
            try {
                const available = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
                setIsAvailable(available);
                
                if (available) {
                    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
                    if (!result.granted) {
                        setError('Microphone permission not granted');
                    }
                }
            } catch (e) {
                setError(`Availability check failed: ${e.message}`);
                setIsAvailable(false);
            }
        };
        
        checkAvailability();
    }, []);

    // Event listeners setup and cleanup
    useEffect(() => {
        const handlers = {
            start: () => setIsListening(true),
            end: () => {
                setIsListening(false);
                setVolume(0);
            },
            result: (event) => {
                if (event.results?.[0]) {
                    if (event.isFinal) {
                        setFinalResult(event.results[0].transcript);
                        setVolume(0);
                    } else {
                        setPartialResults(event.results[0].transcript);
                    }
                }
            },
            volumechange: (event) => {
                console.log("Raw volume event:", event);
                if (typeof event.value === 'number') {
                    const normalizedVolume = Math.max(0, Math.min(1, (event.value + 2) / 12));
                    console.log("Normalized volume:", normalizedVolume);
                    setVolume(normalizedVolume);
                }
            },
            error: (event) => {
                setError(`Recognition error: ${event.error}`);
                setIsListening(false);
            }
        };

        // Register all event listeners
        const unsubscribers = Object.entries(handlers).map(([event, handler]) => 
            useSpeechRecognitionEvent(event, handler)
        );

        // Cleanup function to remove all listeners
        return () => {
            unsubscribers.forEach(unsubscribe => unsubscribe?.());
        };
    }, []); // Empty dependency array since handlers only use setState functions

    const startListening = useCallback(async () => {
        try {
            setPartialResults('');
            setFinalResult('');
            setError('');

            console.log("Starting speech recognition with volume monitoring...");
            await ExpoSpeechRecognitionModule.start({
                lang: language,
                interimResults: true,
                maxAlternatives: 1,
                volumeChangeEventOptions: {
                    enabled: true,
                    intervalMillis: 300
                }
            });
            console.log("Speech recognition started successfully");
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
