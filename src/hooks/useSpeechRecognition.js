import React, { useState, useEffect, useCallback } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

export function useSpeechRecognition({ onTranscription, selectedLanguage, onError }) {
    const [isListening, setIsListening] = useState(false);
    const [volume, setVolume] = useState(0);
    const [partialResults, setPartialResults] = useState('');
    const [hasSpeechPermission, setHasSpeechPermission] = useState(false);

    useEffect(() => {
        const checkPermissions = async () => {
            const result = await ExpoSpeechRecognitionModule.getPermissionsAsync();
            if (result.granted) {
                setHasSpeechPermission(true);
            } else if (result.canAskAgain) {
                const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
                setHasSpeechPermission(granted);
            }
        };
        checkPermissions();
    }, []);

    useSpeechRecognitionEvent("start", () => setIsListening(true));
    useSpeechRecognitionEvent("end", () => {
        setIsListening(false);
        setVolume(0);
    });

    useSpeechRecognitionEvent("result", (event) => {
        if (event.results?.[0]) {
            if (event.isFinal) {
                onTranscription(event.results[0].transcript);
                setVolume(0);
            } else {
                setPartialResults(event.results[0].transcript);
            }
        }
    });

    useSpeechRecognitionEvent("volumechange", (event) => {
        if (typeof event.value === 'number') {
            const normalizedVolume = Math.max(0, Math.min(1, (event.value + 2) / 12));
            setVolume(normalizedVolume);
        }
    });

    useSpeechRecognitionEvent("error", (event) => {
        onError?.(`Recognition error: ${event.error}`);
        setIsListening(false);
    });

    const toggleListening = useCallback(async () => {
        try {
            if (isListening) {
                await ExpoSpeechRecognitionModule.stop();
            } else {
                setPartialResults('');
                await ExpoSpeechRecognitionModule.start({
                    lang: selectedLanguage,
                    interimResults: true,
                    maxAlternatives: 1,
                    volumeChangeEventOptions: {
                        enabled: true,
                        intervalMillis: 300
                    }
                });
            }
        } catch (error) {
            onError?.(`Toggle error: ${error.message}`);
        }
    }, [isListening, selectedLanguage]);

    return {
        isListening,
        volume,
        partialResults,
        hasSpeechPermission,
        toggleListening
    };
}
