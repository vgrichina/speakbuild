import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LoadingSpinner } from './LoadingSpinner';
import { ASSISTANT_STATUS } from '../services/assistantService';

/**
 * Displays streaming response during generation
 * @param {Object} props - Component props
 * @param {string} props.responseStream - Current response stream text
 * @param {string} props.status - Current generation status ('idle', 'processing', 'error')
 * @param {string} props.intent - Intent of the generation ('new', 'modify')
 * @param {Function} props.onRetry - Function to call when retry is pressed
 * @param {Function} props.onCancel - Function to call when cancel is pressed
 */
export const ResponseStream = React.memo(({
  responseStream,
  status,
  intent,
  onRetry,
  onCancel
}) => {
  const scrollViewRef = useRef(null);
  const renderCount = useRef(0);
  
  // Add debug logging to track render performance
  useEffect(() => {
    renderCount.current += 1;
    console.log(`[ResponseStream] Rendered ${renderCount.current} times`);
  });

  // Scroll to bottom when content changes
  const handleContentSizeChange = useCallback(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: false });
    }
  }, []);

  // Only show when we have response content or we're in thinking/processing/error state
  if (!responseStream && 
      status !== ASSISTANT_STATUS.PROCESSING && 
      status !== ASSISTANT_STATUS.THINKING &&
      status !== ASSISTANT_STATUS.ERROR) return null;

  return (
    <View style={[
      styles.container, 
      { backgroundColor: '#EBF8FF' }
    ]}>
      <View style={styles.headerContainer}>
        <Text style={styles.heading}>
          {intent === 'modify' ? 'Modifying Component:' : 
           intent === 'new' ? 'Creating Component:' : 
           status === ASSISTANT_STATUS.THINKING ? 'Processing Transcript...' :
           'Response:'}
        </Text>
        {(status === ASSISTANT_STATUS.PROCESSING || status === ASSISTANT_STATUS.THINKING) && <LoadingSpinner />}
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        ref={scrollViewRef}
        onContentSizeChange={handleContentSizeChange}
      >
        {status === ASSISTANT_STATUS.THINKING && !responseStream ? (
          <Text style={styles.placeholderText}>Analyzing transcript...</Text>
        ) : (
          <Text style={styles.responseText}>{responseStream || ''}</Text>
        )}
      </ScrollView>
      
      {status === ASSISTANT_STATUS.ERROR && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            An error occurred during generation
          </Text>
          {onRetry && (
            <Text 
              style={styles.retryButton}
              onPress={onRetry}
            >
              Retry
            </Text>
          )}
        </View>
      )}
      
      {(status === ASSISTANT_STATUS.THINKING || 
         status === ASSISTANT_STATUS.PROCESSING || 
         (status === ASSISTANT_STATUS.ERROR && responseStream)) && 
         onCancel && (
        <View style={styles.cancelContainer}>
          <Text 
            style={styles.cancelButton}
            onPress={onCancel}
          >
            Cancel
          </Text>
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Skip updates in these cases:
  // 1. Status hasn't changed
  // 2. Intent hasn't changed
  // 3. Text is exactly the same
  return (
    prevProps.status === nextProps.status &&
    prevProps.intent === nextProps.intent &&
    prevProps.responseStream === nextProps.responseStream
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    marginVertical: 8,
    padding: 16,
    flex: 1,
    maxHeight: 400
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  heading: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8
  },
  scrollView: {
    flex: 1,
    minHeight: 100
  },
  responseText: {
    color: '#000'
  },
  placeholderText: {
    color: '#666',
    fontStyle: 'italic'
  },
  errorContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    alignItems: 'center'
  },
  errorText: {
    color: '#B91C1C',
    marginBottom: 4
  },
  retryButton: {
    color: '#2563EB',
    fontWeight: 'bold',
    padding: 8
  },
  cancelContainer: {
    marginTop: 8,
    alignItems: 'center'
  },
  cancelButton: {
    color: '#DC2626',
    fontWeight: 'bold',
    padding: 10,
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 4
  }
});