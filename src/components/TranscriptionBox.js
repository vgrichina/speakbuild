import React from 'react';
import { View, Text } from 'react-native';
import { Radio } from 'lucide-react-native';

const styles = {
    transcriptionBox: {
        backgroundColor: '#F3F4F6',
        padding: 16,
        borderRadius: 8,
        marginVertical: 8,
    }
};

export const TranscriptionBox = ({ 
    isListening,
    partialResults,
    transcribedText,
    requestHistory
}) => {
    return (
        <>
            {/* Live Transcription */}
            {isListening && partialResults && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <Radio size={16} color="#EF4444" />
                    <Text style={{ marginLeft: 8, fontStyle: 'italic', color: '#666' }}>
                        {partialResults}
                    </Text>
                </View>
            )}

            {/* Final Transcription */}
            {(transcribedText || requestHistory.length > 0) && (
                <View style={styles.transcriptionBox}>
                    {requestHistory.map((request, index) => (
                        <Text key={index} style={{ 
                            color: '#999',
                            fontSize: 14,
                            marginBottom: 4
                        }}>
                            {request}
                        </Text>
                    ))}
                    {transcribedText && (
                        <Text style={{ 
                            color: '#333',
                            fontSize: 14
                        }}>
                            {transcribedText}
                        </Text>
                    )}
                </View>
            )}
        </>
    );
};
