import React, { useCallback, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAssistantState } from '../hooks/useAssistantState';
import { VoiceButton } from './VoiceButton';
import { KeyboardInput } from './KeyboardInput';
import { ResponseStream } from './ResponseStream';
import { TranscriptionBox } from './TranscriptionBox';

export const ConversationView = () => {
  const {
    status,
    volume,
    transcript,
    responseStream,
    callActive,
    callStartTime,
    startPTT,
    stopPTT,
    toggleCallMode,
    abortGeneration
  } = useAssistantState();
  
  // Check status values from the new service-based implementation
  const { STATUS } = useAssistantState();
  
  // When user is speaking, show the transcription box
  const showTranscription = status === STATUS.LISTENING || transcript;
  
  // When AI is thinking or generating, show the response stream
  const showResponse = status === STATUS.THINKING || status === STATUS.PROCESSING || responseStream;
  
  return (
    <View style={styles.container}>
      {/* Transcription display */}
      {showTranscription && (
        <TranscriptionBox text={transcript} isListening={status === STATUS.LISTENING} />
      )}
      
      {/* AI Response display */}
      {showResponse && (
        <ResponseStream 
          responseStream={responseStream} 
          status={status}
          onCancel={abortGeneration}
        />
      )}
      
      {/* Input controls (voice button) */}
      <View style={styles.inputContainer}>
        <VoiceButton
          status={status}
          volume={volume}
          onStart={toggleCallMode}
          onStop={abortGeneration}
          onPressIn={startPTT}
          onPressOut={stopPTT}
          callActive={callActive}
          callStartTime={callStartTime}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  inputContainer: {
    position: 'relative',
    marginTop: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  }
});