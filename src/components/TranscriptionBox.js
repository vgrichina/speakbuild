import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

/**
 * Displays transcription and conversation history
 * @param {Object} props - Component props
 * @param {string} props.finalTranscript - Current final transcript text
 * @param {string} props.partialTranscript - Current partial transcript text
 * @param {boolean} props.isListening - Whether the system is currently listening
 * @param {Array} props.requestHistory - History of previous requests (optional)
 */
export const TranscriptionBox = React.memo(({ 
  finalTranscript = '',
  partialTranscript = '',
  isListening = false,
  requestHistory = []
}) => {
  const scrollViewRef = useRef(null);
  
  // Auto-scroll when content changes
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [finalTranscript, partialTranscript, requestHistory]);
  
  // Determine whether to show the box
  const shouldShow = useMemo(() => {
    return (
      finalTranscript || 
      partialTranscript || 
      (requestHistory && requestHistory.length > 0)
    );
  }, [finalTranscript, partialTranscript, requestHistory]);
  
  if (!shouldShow) return null;
  
  return (
    <View style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Previous requests */}
        {requestHistory && requestHistory.length > 0 && (
          <View style={styles.historyContainer}>
            {requestHistory.map((request, index) => (
              <Text key={index} style={styles.historyText}>
                {request}
              </Text>
            ))}
          </View>
        )}
        
        {/* Final transcript */}
        {finalTranscript && (
          <Text style={styles.finalTranscript}>
            {finalTranscript}
          </Text>
        )}
        
        {/* Partial transcript */}
        {partialTranscript && (
          <Text style={styles.partialTranscript}>
            {partialTranscript}{isListening && <Text style={styles.ellipsis}>...</Text>}
          </Text>
        )}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginVertical: 8,
    maxHeight: 200,
    width: '100%'
  },
  scrollView: {
    maxHeight: 200
  },
  contentContainer: {
    padding: 16,
  },
  historyContainer: {
    marginBottom: 8
  },
  historyText: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 4
  },
  finalTranscript: {
    color: '#111827',
    fontSize: 16
  },
  partialTranscript: {
    color: '#4B5563',
    fontSize: 16,
    fontStyle: 'italic'
  },
  ellipsis: {
    color: '#9CA3AF'
  }
});