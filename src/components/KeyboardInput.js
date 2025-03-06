import React, { useState, useCallback } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Send, Mic } from 'lucide-react-native';

/**
 * Keyboard input component that provides text input
 * @param {Object} props - Component props
 * @param {boolean} props.active - Whether the keyboard is active
 * @param {Function} props.onSubmit - Function to call when text is submitted
 * @param {Function} props.onToggle - Function to call when keyboard is toggled
 * @param {boolean} props.callActive - Whether call mode is active
 */
export const KeyboardInput = ({ 
  active, 
  onSubmit,
  onToggle,
  callActive = false
}) => {
  const [text, setText] = useState('');
  
  const handleSubmit = useCallback(() => {
    if (text.trim()) {
      onSubmit?.(text);
      setText('');
    }
  }, [text, onSubmit]);
  
  // If keyboard is not active, don't render anything
  if (!active) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={
          callActive 
            ? "Send message during call..." 
            : "Type your message..."
        }
        placeholderTextColor="#9CA3AF"
        multiline
        autoFocus
        onSubmitEditing={handleSubmit}
      />
      <View style={styles.controls}>
        <Pressable 
          onPress={onToggle} 
          style={styles.toggleButton}
          accessibilityLabel="Switch to voice input"
        >
          <Mic size={20} color="#6B7280" />
        </Pressable>
        <Pressable 
          onPress={handleSubmit}
          style={[
            styles.sendButton,
            !text.trim() && styles.sendButtonDisabled
          ]}
          disabled={!text.trim()}
          accessibilityLabel="Send message"
        >
          <Send size={20} color={text.trim() ? "#3B82F6" : "#D1D5DB"} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 28, // Extra padding for iOS home indicator
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 50, // Space for controls
    fontSize: 16,
    maxHeight: 100,
    color: '#1F2937'
  },
  controls: {
    position: 'absolute',
    right: 24,
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  }
});