import { useCallback } from 'react';
import { useVoiceRoom as useVoiceRoomContext } from '../contexts/VoiceRoomContext';

/**
 * Adapter hook to maintain backward compatibility with the old useVoiceRoom API
 * @param {Object} options - Options for voice recording
 * @returns {Object} - Voice room state and methods
 */
export function useVoiceRoom(options) {
    const {
        state: { volume, partialResults },
        startRecording: startRecordingContext,
        stopRecording,
        cancelRecording
    } = useVoiceRoomContext();
    
    // Create a wrapper for startRecording that uses the provided options
    const startRecording = useCallback(() => {
        if (options) {
            startRecordingContext(options);
        }
    }, [startRecordingContext, options]);
    
    // Return the same interface as the old hook
    return {
        volume,
        startRecording,
        stopRecording,
        cancelRecording,
        partialResults
    };
}
