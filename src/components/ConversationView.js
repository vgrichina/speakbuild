import React, { useCallback, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAssistant } from '../contexts/AssistantContext';
import { VoiceButton } from './VoiceButton';
import { KeyboardInput } from './KeyboardInput';
import { ResponseStream } from './ResponseStream';
import { TranscriptionBox } from './TranscriptionBox';

export const ConversationView = () => {
  const assistant = useAssistant();
  const { 
    state: { 
      status, 
      volume, 
      transcript, 
      response, 
      callActive, 
      keyboardActive,
      callStartTime
    }, 
    handlePressIn, 
    handlePressOut, 
    handlePress, 
    toggleKeyboard,
    submitText,
    stop
  } = assistant;
  
  // When user is speaking, show the transcription box
  const showTranscription = status === 'LISTENING' || transcript;
  
  // When AI is generating, show the response stream
  const showResponse = status === 'THINKING' || response;
  
  return (
    <View style={styles.container}>
      {/* Transcription display */}
      {showTranscription && (
        <TranscriptionBox text={transcript} isListening={status === 'LISTENING'} />
      )}
      
      {/* AI Response display */}
      {showResponse && (
        <ResponseStream 
          text={response} 
          isGenerating={status === 'THINKING'} 
          onCancel={stop}
        />
      )}
      
      {/* Input controls (voice button or keyboard) */}
      <View style={styles.inputContainer}>
        {/* Keyboard input (only shown when active) */}
        <KeyboardInput 
          active={keyboardActive}
          onSubmit={submitText}
          onToggle={toggleKeyboard}
          callActive={callActive}
        />
        
        {/* Voice button (hidden when keyboard is active) */}
        {!keyboardActive && (
          <VoiceButton
            status={status}
            volume={volume}
            onStart={handlePress}
            onStop={stop}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onToggleKeyboard={toggleKeyboard}
            callActive={callActive}
            keyboardActive={keyboardActive}
            callStartTime={callStartTime}
          />
        )}
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