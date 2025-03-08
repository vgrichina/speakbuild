import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

/**
 * Displays transcription and conversation history
 * @param {Object} props - Component props
 * @param {Array} props.transcripts - List of transcripts to display (already filtered)
 * @param {boolean} props.isListening - Whether the system is currently listening
 */
export const TranscriptionBox = React.memo(({ 
  transcripts = [],
  isListening = false
}) => {
  const scrollViewRef = useRef(null);
  
  // Auto-scroll when content changes
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [transcripts]);
  
  // Determine whether to show the box
  const shouldShow = useMemo(() => {
    return transcripts.length > 0;
  }, [transcripts]);
  
  if (!shouldShow) return null;
  
  // Reverse the order of transcripts so newest is at the bottom
  const reversedTranscripts = [...transcripts].reverse();
  
  return (
    <View style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.transcriptsContainer}>
          {/* Oldest messages at the top (will fade out as they scroll) */}
          {reversedTranscripts.slice(1).map((transcript, index) => (
            <Text 
              key={`history-${index}`} 
              style={[
                styles.historyText,
                // Add fade effect for older messages
                { opacity: Math.max(0.5, 1 - (index * 0.2)) }
              ]}
            >
              {transcript}
            </Text>
          ))}
          
          {/* Latest transcript at the bottom */}
          {reversedTranscripts.length > 0 && (
            <Text style={styles.currentTranscript}>
              {reversedTranscripts[0]}
              {isListening && <Text style={styles.ellipsis}>...</Text>}
            </Text>
          )}
        </View>
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
    paddingBottom: 60, // Space for the floating button without extra View
  },
  transcriptsContainer: {
    width: '100%'
  },
  historyText: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 4
  },
  currentTranscript: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 4
  },
  ellipsis: {
    color: '#9CA3AF'
  }
});
