import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { Square, Mic, Phone, Keyboard } from 'lucide-react-native';
import { ASSISTANT_STATUS, ASSISTANT_MODE } from '../services/assistantService';

/**
 * Component for visualizing audio volume
 */
const VolumeVisualization = React.memo(({ volume = 0, isActive = false }) => {
  // Animation value
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  
  // Animate when volume changes
  useEffect(() => {
    if (isActive) {
      Animated.spring(pulseAnimation, {
        toValue: 1 + (volume * 2.5),
        friction: 3,
        tension: 40,
        useNativeDriver: true
      }).start();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [isActive, volume, pulseAnimation]);
  
  // Don't render if not active
  if (!isActive) return null;
  
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#EF4444',
        opacity: 0.3,
        transform: [{ scale: pulseAnimation }],
      }}
    />
  );
});

/**
 * Format duration in milliseconds to mm:ss format
 */
const formatDuration = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Voice button component supporting PTT and Call modes
 * @param {Object} props - Component props
 * @param {string} props.status - Current status ('idle', 'listening', 'processing', 'error')
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {number} props.volume - Current audio volume (0-1)
 * @param {boolean} props.callActive - Whether call mode is active
 * @param {number} props.callStartTime - When the call started (for duration display)
 * @param {Function} props.onPressIn - Callback when button is pressed (PTT start)
 * @param {Function} props.onPressOut - Callback when button is released (PTT end)
 * @param {Function} props.onToggleCall - Callback to toggle call mode
 * @param {Function} props.onToggleKeyboard - Callback to toggle keyboard mode
 * @param {boolean} props.keyboardActive - Whether keyboard mode is active
 */
export const VoiceButton = React.memo(({
  status = ASSISTANT_STATUS.IDLE,
  disabled = false,
  volume = 0,
  callActive = false,
  callStartTime = null,
  onPressIn,
  onPressOut,
  onToggleCall,
  onToggleKeyboard,
  keyboardActive = false
}) => {
  // Local UI state
  const [pressed, setPressed] = useState(false);
  const [durationDisplay, setDurationDisplay] = useState('00:00');
  const pressTimeoutRef = useRef(null);
  
  // Handle call duration updates
  useEffect(() => {
    let timer;
    if (callActive && callStartTime) {
      // Initial update
      setDurationDisplay(formatDuration(Date.now() - callStartTime));
      
      // Update every second
      timer = setInterval(() => {
        setDurationDisplay(formatDuration(Date.now() - callStartTime));
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callActive, callStartTime]);
  
  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (pressTimeoutRef.current) {
        clearTimeout(pressTimeoutRef.current);
      }
    };
  }, []);
  
  // Handle press in
  const handlePressIn = useCallback(() => {
    if (disabled || keyboardActive) return;
    
    setPressed(true);
    
    // Clear any existing timeout
    if (pressTimeoutRef.current) {
      clearTimeout(pressTimeoutRef.current);
    }
    
    // Set a timeout to detect long presses
    pressTimeoutRef.current = setTimeout(() => {
      // Long press detected - in this case we just maintain the pressed state
      pressTimeoutRef.current = null;
    }, 300);
    
    // If not in call mode, start PTT
    if (!callActive && onPressIn) {
      onPressIn();
    }
  }, [callActive, disabled, keyboardActive, onPressIn]);
  
  // Handle press out
  const handlePressOut = useCallback(() => {
    if (disabled || keyboardActive) return;
    
    setPressed(false);
    
    // If press timeout is still active, it was a short press (tap)
    const wasShortPress = pressTimeoutRef.current !== null;
    
    // Clear timeout
    if (pressTimeoutRef.current) {
      clearTimeout(pressTimeoutRef.current);
      pressTimeoutRef.current = null;
    }
    
    if (wasShortPress) {
      // Short press detected - toggle call mode
      if (onToggleCall) {
        onToggleCall();
      }
    } else if (!callActive && onPressOut) {
      // Long press release - stop PTT
      onPressOut();
    }
  }, [callActive, disabled, keyboardActive, onPressOut, onToggleCall]);
  
  // Determine if we're in an active listening state
  const isListening = status === ASSISTANT_STATUS.LISTENING || pressed;
  
  // Determine button content based on state
  const getButtonContent = () => {
    if (callActive) {
      // Call mode active
      return (
        <>
          <Phone size={28} color="white" />
          <Text style={styles.callDuration}>{durationDisplay}</Text>
        </>
      );
    } else if (keyboardActive) {
      // Keyboard mode active
      return <Keyboard size={28} color="white" />;
    } else if (isListening) {
      // Showing volume visualization
      return <Square size={28} color="white" />;
    } else if (status === ASSISTANT_STATUS.PROCESSING) {
      // Processing
      return <Mic size={28} color="#FFF" />;
    } else {
      // Default state
      return <Mic size={32} color="white" />;
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Main voice button */}
      <View style={styles.buttonWrapper}>
        <VolumeVisualization isActive={isListening} volume={volume} />
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.button,
            pressed && styles.buttonPressed,
            callActive && styles.callActiveButton,
            status === ASSISTANT_STATUS.LISTENING && styles.listeningButton,
            status === ASSISTANT_STATUS.PROCESSING && styles.processingButton,
            status === ASSISTANT_STATUS.ERROR && styles.errorButton,
            disabled && styles.disabledButton
          ]}
          disabled={disabled}
        >
          {getButtonContent()}
        </Pressable>
      </View>
      
      {/* Label under button */}
      <Text style={styles.buttonLabel}>
        {callActive ? 'Tap to end call' : 
          (status === ASSISTANT_STATUS.LISTENING ? 'Listening...' : 
           status === ASSISTANT_STATUS.PROCESSING ? 'Processing...' : 
           'Hold to speak')}
      </Text>
      
      {/* Keyboard toggle button */}
      <Pressable
        onPress={onToggleKeyboard}
        style={[
          styles.keyboardToggle,
          keyboardActive && styles.keyboardActive
        ]}
        disabled={disabled}
      >
        <Keyboard size={20} color={keyboardActive ? "white" : "#666"} />
      </Pressable>
    </View>
  );
}, (prevProps, nextProps) => {
  // Optimize re-renders by only updating when necessary
  const shouldUpdate = 
    prevProps.status !== nextProps.status ||
    prevProps.disabled !== nextProps.disabled ||
    prevProps.callActive !== nextProps.callActive ||
    prevProps.keyboardActive !== nextProps.keyboardActive ||
    (prevProps.status === ASSISTANT_STATUS.LISTENING && prevProps.volume !== nextProps.volume) ||
    (prevProps.callActive && prevProps.callStartTime !== nextProps.callStartTime);
  
  return !shouldUpdate; // Return true to skip update, false to update
});

// Styles for the voice button components
const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingBottom: 20,
  },
  buttonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6', // Default blue
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  buttonPressed: {
    backgroundColor: '#EF4444', // Red for pressed
  },
  listeningButton: {
    backgroundColor: '#EF4444', // Red for listening
  },
  processingButton: {
    backgroundColor: '#F59E0B', // Amber for processing
  },
  errorButton: {
    backgroundColor: '#DC2626', // Bright red for error
  },
  callActiveButton: {
    backgroundColor: '#10B981', // Green for call mode
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonLabel: {
    marginTop: 8,
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  keyboardToggle: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  keyboardActive: {
    backgroundColor: '#3B82F6',
  },
  callDuration: {
    marginTop: 4,
    color: 'white',
    fontSize: 12,
  }
});