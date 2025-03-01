import React from 'react';
import { View, Text } from 'react-native';

const styles = {
    transcriptionBox: {
        backgroundColor: '#F3F4F6',
        padding: 16,
        borderRadius: 8,
        marginVertical: 8,
    }
};

/**
 * Displays transcription and conversation history
 * @param {Object} props - Component props
 * @param {string} props.status - Current generation status
 * @param {string} props.transcript - Current transcript (either partial or complete)
 * @param {Array} props.requestHistory - History of previous requests
 */
export const TranscriptionBox = ({ 
    status,
    transcript,
    requestHistory
}) => {
    return (
        <>
            {/* Transcription Box with History and Current Transcription */}
            {(requestHistory.length > 0 || (transcript && (status === 'THINKING' || status === 'LISTENING'))) && (
                <View style={styles.transcriptionBox}>
                    {/* Previous requests */}
                    {requestHistory.map((request, index) => (
                        <Text key={index} style={{ 
                            color: '#999',
                            fontSize: 14,
                            marginBottom: 4
                        }}>
                            {request}
                        </Text>
                    ))}
                    
                    {/* Current transcript */}
                    {transcript && (status === 'THINKING' || status === 'LISTENING') && (
                        <Text style={{ 
                            color: '#333',
                            fontSize: 14
                        }}>
                            {transcript}
                        </Text>
                    )}
                </View>
            )}
        </>
    );
};
