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
 * @param {string} props.text - Current transcript text
 * @param {boolean} props.isListening - Whether the system is currently listening
 * @param {Array} props.requestHistory - History of previous requests (optional)
 */
export const TranscriptionBox = ({ 
    text,
    isListening,
    requestHistory = []
}) => {
    return (
        <>
            {/* Transcription Box with History and Current Transcription */}
            {(requestHistory.length > 0 || text) && (
                <View style={styles.transcriptionBox}>
                    {/* Previous requests */}
                    {requestHistory && requestHistory.length > 0 && requestHistory.map((request, index) => (
                        <Text key={index} style={{ 
                            color: '#999',
                            fontSize: 14,
                            marginBottom: 4
                        }}>
                            {request}
                        </Text>
                    ))}
                    
                    {/* Current transcript */}
                    {text && (
                        <Text style={{ 
                            color: '#333',
                            fontSize: 14
                        }}>
                            {text}
                            {isListening && <Text style={{color: '#999'}}>...</Text>}
                        </Text>
                    )}
                </View>
            )}
        </>
    );
};
