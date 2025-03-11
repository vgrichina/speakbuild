import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, TextInput, Pressable, StyleSheet, Animated, Keyboard, Platform, SafeAreaView, KeyboardAvoidingView } from 'react-native';
import { Feather } from '@expo/vector-icons';

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
  const slideAnim = useRef(new Animated.Value(active ? 0 : 300)).current;
  const inputRef = useRef(null);
  
  // Handle animation when active state changes
  useEffect(() => {
    if (active) {
      // Slide up animation
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Focus the input after animation completes
        if (inputRef.current) {
          inputRef.current.focus();
        }
      });
    } else {
      // Slide down animation
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Dismiss keyboard
      Keyboard.dismiss();
    }
  }, [active, slideAnim]);
  
  const handleSubmit = useCallback(() => {
    if (text.trim()) {
      onSubmit?.(text);
      setText('');
    }
  }, [text, onSubmit]);
  
  // Add scale animation for toggle button
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handleTogglePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onToggle();
  };
  
  // If keyboard is not active, still render but with transform
  if (!active) {
    return null;
  }
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'position' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={styles.keyboardAvoidingView}
    >
      <Animated.View 
        style={[
          styles.container,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        <SafeAreaView style={styles.safeAreaContainer}>
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={
                callActive 
                  ? "Send message during call..." 
                  : "Type your message..."
              }
              placeholderTextColor="#6B7280" // Darker gray for better contrast
              multiline
              autoFocus
              onSubmitEditing={handleSubmit}
              accessibilityLabel="Message input"
              accessibilityHint={callActive ? "Type a message to send during the call" : "Type your message to interact with the assistant"}
            />
            <View style={styles.controls}>
              <Pressable 
                onPress={handleTogglePress} 
                style={styles.toggleButton}
                accessibilityLabel="Switch to voice input"
              >
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  <Feather name="mic" size={24} color="#4F46E5" /> {/* Indigo color for prominence */}
                </Animated.View>
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
                <Feather name="send" size={20} color={text.trim() ? "#FFFFFF" : "#D1D5DB"} />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 1000,
  },
  container: {
    width: '100%',
    zIndex: 1000,
  },
  safeAreaContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24, // More breathing room
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    width: '100%', // Ensure full width
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB', // Light gray border for subtle emphasis
    borderRadius: 20,
    marginLeft: 16,
    marginRight: 16,
    paddingHorizontal: 16,
    paddingVertical: 16, // More vertical padding for breathing room
    paddingRight: 80, // More space for controls
    fontSize: 18, // Larger font for better readability
    maxHeight: 100,
    color: '#1F2937',
    flex: 1, // Take up all available space
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 12 : 8,
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20, // Larger button for better tap area
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  }
});
